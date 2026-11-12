#!/usr/bin/env python3
"""Stamp every script/stylesheet reference with a version, so browsers never mix old and new files.

Run before publishing:  python3 tools/stamp-version.py
It rewrites  './x.js' -> './x.js?v=VERSION'  in js/*.js, and  js/x.js / css/app.css  links in *.html.
VERSION is the current date and time, so each publish gets new file addresses.
"""
import pathlib
import re
import time

root = pathlib.Path(__file__).resolve().parent.parent
version = time.strftime("%Y%m%d%H%M")

js_import = re.compile(r"""(from\s+['"]\./[\w-]+\.js)(\?v=\w+)?(['"])""")
html_ref = re.compile(r"""((?:src|href)=["'](?:js/[\w-]+\.js|css/[\w-]+\.css))(\?v=\w+)?(["'])""")

changed = 0
for f in sorted((root / "js").glob("*.js")):
    s = f.read_text()
    t = js_import.sub(lambda m: f"{m.group(1)}?v={version}{m.group(3)}", s)
    if t != s:
        f.write_text(t)
        changed += 1
for f in sorted(root.glob("*.html")):
    s = f.read_text()
    t = html_ref.sub(lambda m: f"{m.group(1)}?v={version}{m.group(3)}", s)
    if t != s:
        f.write_text(t)
        changed += 1
print(f"version {version}: updated {changed} files")
