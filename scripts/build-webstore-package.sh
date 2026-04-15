#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
PKG_DIR="$DIST_DIR/webstore-package"
ZIP_PATH="$DIST_DIR/ai-sidebar-chrome-webstore.zip"

rm -rf "$PKG_DIR"
mkdir -p "$PKG_DIR"
mkdir -p "$DIST_DIR"

copy_path() {
  local path="$1"
  if [[ -e "$ROOT_DIR/$path" ]]; then
    rsync -a "$ROOT_DIR/$path" "$PKG_DIR/"
  fi
}

copy_path "manifest.json"
copy_path "index.html"
copy_path "LICENSE"
copy_path "css"
copy_path "js"
copy_path "content-scripts"
copy_path "images"
copy_path "rules"
copy_path "history"

find "$PKG_DIR" -name '.DS_Store' -delete

rm -f "$ZIP_PATH"
python3 - "$PKG_DIR" "$ZIP_PATH" <<'PY'
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import sys

pkg_dir = Path(sys.argv[1])
zip_path = Path(sys.argv[2])

with ZipFile(zip_path, "w", compression=ZIP_DEFLATED) as zf:
    for path in sorted(pkg_dir.rglob("*")):
        if path.is_dir():
            continue
        zf.write(path, path.relative_to(pkg_dir))
PY

echo "Created package: $ZIP_PATH"
