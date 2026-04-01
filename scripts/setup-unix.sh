#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

LINK_GLOBAL=false
SKIP_INSTALL=false

for arg in "$@"; do
  case "$arg" in
    --link-global) LINK_GLOBAL=true ;;
    --skip-install) SKIP_INSTALL=true ;;
    *) echo "Unknown argument: $arg" >&2; exit 1 ;;
  esac
done

echo '==> xccodex Unix setup'

command -v node >/dev/null 2>&1 || { echo 'Node.js 18+ is required.' >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo 'npm is required.' >&2; exit 1; }

node --version
npm --version

if [ "$SKIP_INSTALL" != true ]; then
  echo '==> Installing dependencies'
  npm install
fi

echo '==> Building project'
npm run build

if [ "$LINK_GLOBAL" = true ]; then
  echo '==> Linking xccodex globally with npm link'
  npm link
fi

echo
echo 'Setup complete.'
echo 'Recommended next steps:'
echo '  1. Run: node ./dist/xccodex.js'
if [ "$LINK_GLOBAL" = true ]; then
  echo '  2. Or run globally: xccodex'
fi
echo '  3. To reconfigure provider settings: node ./dist/xccodex.js --reconfigure'
