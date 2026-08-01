#!/usr/bin/env bash
# sync-vercel-agents.sh — Fetch latest agents.json from Vercel's detect-agent repo
# and update our vendored copy. Run manually or via CI.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET_DIR="$REPO_ROOT/references/vercel"

UPSTREAM_JSON="https://raw.githubusercontent.com/vercel/detect-agent/main/agents.json"
UPSTREAM_SCHEMA="https://raw.githubusercontent.com/vercel/detect-agent/refs/heads/main/agents.schema.json"
UPSTREAM_COMMIT_API="https://api.github.com/repos/vercel/detect-agent/commits/main"

mkdir -p "$TARGET_DIR"

echo "Fetching latest agents.json..."
curl -sL "$UPSTREAM_JSON" -o "$TARGET_DIR/agents.json"

echo "Fetching latest agents.schema.json..."
curl -sL "$UPSTREAM_SCHEMA" -o "$TARGET_DIR/agents.schema.json"

echo "Recording commit SHA..."
COMMIT=$(curl -sL "$UPSTREAM_COMMIT_API" | python3 -c "import sys,json; print(json.load(sys.stdin)['sha'])")
echo "$COMMIT" > "$TARGET_DIR/COMMIT"

echo "Updated to vercel/detect-agent@$COMMIT"
echo "Done."
