#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building client..."
cd client && npm install --omit=dev && npm run build
cd "$SCRIPT_DIR"

echo "Starting server..."
cd server && npm install --omit=dev
NODE_ENV=production node src/index.js
