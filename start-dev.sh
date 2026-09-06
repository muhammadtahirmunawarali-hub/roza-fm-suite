#!/usr/bin/env bash
# Persistent dev server launcher — survives parent shell exit.
cd /home/z/my-project
pkill -9 -f "next-server" 2>/dev/null
pkill -9 -f "next dev" 2>/dev/null
sleep 1
# Use exec to replace this shell with next dev (single process, no pipeline)
exec bunx next dev -p 3000
