#!/usr/bin/env bash
cd /home/z/my-project
pkill -9 -f "server.js" 2>/dev/null
sleep 1
exec node .next/standalone/server.js
