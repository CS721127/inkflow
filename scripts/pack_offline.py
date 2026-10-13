#!/usr/bin/env python3
"""Create a redistributable offline ZIP *after* npm install populated Harper."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
ROOT=Path(__file__).resolve().parents[1]
VENDOR=ROOT/'vendor/harper'
for name in ('index.js','binaryInlined.js'):
    if not (VENDOR/name).is_file():
        raise SystemExit(f'Cannot package offline yet: {name} missing. Run npm install first.')
out=ROOT.parent/'Interactive_Writer_Pro_Offline_Ready.zip'
include=['index.html','css','js','assets','vendor','scripts/serve.mjs','README.md','THIRD_PARTY.md','package.json']
with ZipFile(out,'w',compression=ZIP_DEFLATED,compresslevel=9) as z:
    for entry in include:
        src=ROOT/entry
        for file in (src.rglob('*') if src.is_dir() else [src]):
            if file.is_file(): z.write(file,arcname=f'{ROOT.name}/{file.relative_to(ROOT).as_posix()}')
print(f'Offline package ready: {out} ({out.stat().st_size} bytes)')
