#!/bin/bash
# Run from backend/: bash build_exe.sh
# Produces dist/kospi-server (Mac/Linux) or dist/kospi-server.exe (Windows)
set -e

pip install pyinstaller

pyinstaller \
  --name kospi-server \
  --onefile \
  --hidden-import pykrx \
  --hidden-import pykrx.stock \
  --hidden-import yfinance \
  --hidden-import uvicorn.logging \
  --hidden-import uvicorn.loops.auto \
  --hidden-import uvicorn.protocols.http.auto \
  --hidden-import uvicorn.protocols.http.h11_impl \
  --hidden-import uvicorn.protocols.websockets.auto \
  --hidden-import uvicorn.lifespan.on \
  --add-data "cache:cache" \
  main.py

echo "Build complete: dist/kospi-server"
