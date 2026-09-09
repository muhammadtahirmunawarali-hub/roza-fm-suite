#!/usr/bin/env bash
# Keep-alive wrapper: restarts the server if it dies
cd /home/z/my-project
export NODE_OPTIONS="--max-old-space-size=1024"

while true; do
  echo "[$(date)] Starting server..."
  node .next/standalone/server.js 2>&1 | grep -v "^prisma:query"
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE. Restarting in 3s..."
  sleep 3
done
