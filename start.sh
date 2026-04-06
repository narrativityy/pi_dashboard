#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

mkdir -p "$SCRIPT_DIR/data"

echo "Building client..."
cd client && npm install && npm run build
cd "$SCRIPT_DIR"

echo "Starting server..."
cd server && npm install --omit=dev
NODE_ENV=production node src/index.js
