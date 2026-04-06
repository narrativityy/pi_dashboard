#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

git fetch origin

if git diff --quiet HEAD origin/main; then
  echo "Already up to date."
  exit 0
fi

echo "New changes found, updating..."
git pull origin main
./start.sh
sudo systemctl restart pi-dashboard
echo "Update complete."
