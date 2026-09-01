#!/usr/bin/env bash
# Build youtube-mcp from source and register it with Claude Code.
#
# For people who would rather not wait for the npm release, or who want to run
# a local checkout. Everything it does is one of the commands in README §14.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

command -v node >/dev/null || { echo "node 20+ is required"; exit 1; }
major="$(node -p 'process.versions.node.split(".")[0]')"
[ "$major" -ge 20 ] || { echo "node 20+ is required, found $(node -v)"; exit 1; }

echo "==> installing dependencies"
( cd "$here" && npm ci --silent )

echo "==> building"
( cd "$here" && npm run build --silent )

echo "==> running tests"
( cd "$here" && npm test --silent )

if ! command -v claude >/dev/null; then
  echo
  echo "Built. Point your MCP client at:"
  echo "  node $here/dist/index.js"
  exit 0
fi

: "${YOUTUBE_IDENTIFIER:=}"
: "${YOUTUBE_APP_PASSWORD:=}"

if [ -z "$YOUTUBE_IDENTIFIER" ] || [ -z "$YOUTUBE_APP_PASSWORD" ]; then
  echo
  echo "Set YOUTUBE_IDENTIFIER and YOUTUBE_APP_PASSWORD, then re-run to register"
  echo "with Claude Code automatically. Get an app password at:"
  echo "  https://bsky.app/settings/app-passwords"
  echo
  echo "Or register it yourself:"
  echo "  claude mcp add bluesky -- node $here/dist/index.js"
  exit 0
fi

echo "==> registering with Claude Code"
claude mcp remove bluesky 2>/dev/null || true
claude mcp add bluesky \
  -e "YOUTUBE_IDENTIFIER=$YOUTUBE_IDENTIFIER" \
  -e "YOUTUBE_APP_PASSWORD=$YOUTUBE_APP_PASSWORD" \
  -- node "$here/dist/index.js"

echo
echo "==> checking the setup"
YOUTUBE_IDENTIFIER="$YOUTUBE_IDENTIFIER" YOUTUBE_APP_PASSWORD="$YOUTUBE_APP_PASSWORD" \
  node "$here/dist/index.js" doctor
