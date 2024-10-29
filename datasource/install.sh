#!/bin/sh
# execute with sudo
cd plugin
MSYS_NO_PATHCONV=1 docker run --rm -v ${PWD}:/app -w /app node:22 npm install
cd ..
