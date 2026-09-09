#!/usr/bin/env bash
cd /home/z/my-project
while true; do
  node .next/standalone/server.js
  echo "[$(date)] Server crashed, restarting in 3s..."
  sleep 3
done
