const { app, BrowserWindow, Menu, dialog, net, protocol, session, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { APP_URL, assetPath, isExternalURL } = require('./security.cjs');

app.setName('InkFlow');
if (process.env.INKFLOW_SMOKE_USER_DATA && !app.isPackaged) app.setPath('userData', process.env.INKFLOW_SMOKE_USER_DATA);
protocol.registerSchemesAsPrivileged([{
  scheme: 'inkflow', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true },
}]);

const contentSecurityPolicy = "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https: http:; font-src 'self' data:; connect-src 'self' data: blob:; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-src 'none'; form-action 'none'";

async function openExternal(url) {
  if (isExternalURL(url)) {
    try { await shell.openExternal(url); }
    catch { dialog.showErrorBox('Could not open link', 'Open this link in your browser instead.'); }
  }
}

function click(id) {
  const win = BrowserWindow.getFocusedWindow();
  if (win) void win.webContents.executeJavaScript(`document.getElementById(${JSON.stringify(id)})?.click()`, true);
}

function installMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'InkFlow', submenu: [
      { role: 'about' }, { type: 'separator' },
      { label: 'Settings…', accelerator: 'CmdOrCtrl+,', click: () => click('settingsButton') },
      { type: 'separator' }, { role: 'services' }, { type: 'separator' },
      { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' },
    ] },
    { label: 'File', submenu: [
      { label: 'New Document', accelerator: 'CmdOrCtrl+N', click: () => click('newFileButton') },
      { label: 'Open Files…', accelerator: 'CmdOrCtrl+O', click: () => click('importButton') },
      { label: 'Save Workspace', accelerator: 'CmdOrCtrl+S', click: () => click('saveButton') },
      { type: 'separator' },
      { label: 'Export Source…', accelerator: 'CmdOrCtrl+Shift+S', click: () => click('downloadButton') },
      { label: 'Export PDF…', accelerator: 'CmdOrCtrl+P', click: () => click('exportPdfChoice') },
      { label: 'Export Workspace…', click: () => click('downloadWorkspaceButton') },
      { label: 'Import Workspace…', click: () => click('openWorkspaceButton') },
      { type: 'separator' }, { role: 'close' },
    ] },
    { role: 'editMenu' },
    { label: 'View', submenu: [
      { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
      { type: 'separator' }, { role: 'togglefullscreen' },
      ...(!app.isPackaged ? [{ role: 'toggleDevTools' }] : []),
    ] },
    { role: 'windowMenu' },
    { role: 'help', submenu: [
      { label: 'InkFlow on GitHub', click: () => openExternal('https://github.com/CS721127/inkflow') },
    ] },
  ]));
}

function createWindow() {
  const win = new BrowserWindow({
    title: 'InkFlow', width: 1400, height: 900, minWidth: 800, minHeight: 600,
    backgroundColor: '#f8fafc', show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true },
  });
  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    void openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== APP_URL && url !== APP_URL + 'index.html') {
      event.preventDefault();
      void openExternal(url);
    }
  });
  win.webContents.on('will-attach-webview', event => event.preventDefault());
  win.webContents.on('will-prevent-unload', event => {
    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning', buttons: ['Keep Writing', 'Discard Changes'], defaultId: 0, cancelId: 0,
      title: 'Unsaved workspace', message: 'Keep your unsaved writing?',
      detail: 'Choose Keep Writing, then Save or Export workspace before closing InkFlow.',
    });
    if (choice === 1) event.preventDefault();
  });
  void win.loadURL(APP_URL).catch(() => {
    dialog.showErrorBox('InkFlow could not start', 'The bundled editor could not be loaded. Reinstall InkFlow and try again.');
    app.quit();
  });
  return win;
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
  });
  app.whenReady().then(async () => {
    const root = path.join(app.getAppPath(), 'dist');
    protocol.handle('inkflow', async request => {
      const file = assetPath(request.url, root);
      if (!file || !['GET', 'HEAD'].includes(request.method)) return new Response('Forbidden', { status: 403 });
      try {
        const response = await net.fetch(pathToFileURL(file).href);
        const headers = new Headers(response.headers);
        headers.set('Content-Security-Policy', contentSecurityPolicy);
        headers.set('X-Content-Type-Options', 'nosniff');
        return new Response(response.body, { status: response.status, headers });
      } catch { return new Response('Not Found', { status: 404 }); }
    });
    session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => {
      callback(permission === 'clipboard-sanitized-write');
    });
    session.defaultSession.setPermissionCheckHandler((_contents, permission) => permission === 'clipboard-sanitized-write');
    session.defaultSession.on('will-download', (_event, item, contents) => {
      if (!contents || !contents.getURL().startsWith(APP_URL)) { item.cancel(); return; }
      item.setSaveDialogOptions({ title: 'Export from InkFlow', defaultPath: item.getFilename() });
    });
    installMenu();
    const win = createWindow();
    if (process.env.INKFLOW_SMOKE_TEST === '1' && !app.isPackaged) {
      win.webContents.once('did-finish-load', () => {
        require('./smoke.cjs').run(win).then(() => app.exit(0)).catch(error => {
          console.error(error); app.exit(1);
        });
      });
    }
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  }).catch(error => { console.error(error); app.exit(1); });
}
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
