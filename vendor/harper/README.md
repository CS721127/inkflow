# Harper browser runtime

This directory is populated by `npm install` (or `npm run setup:harper`).

Expected runtime assets from `harper.js@2.4.0`:

- `index.js`
- `binaryInlined.js`
- any other worker/binary assets distributed by the package

The application imports only local project paths; it never loads grammar code from a CDN.
The npm package is Apache-2.0; see the original license in `node_modules/harper.js`.

IMPORTANT: An actual copy of the npm package was **not available** to the packaging environment.
To enable Grammar Check, run `npm install` once with network access.
Then this folder can be carried with the project and used offline.
