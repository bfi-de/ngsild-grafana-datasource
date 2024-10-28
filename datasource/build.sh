#!/bin/sh
# execute with sudo
# might replace 'yarn dev' by 'yarn build', 'yarn prod', or something similar...
cd plugin
# var. as workaround for git bash bug: https://stackoverflow.com/questions/7250130/how-to-stop-mingw-and-msys-from-mangling-path-names-given-at-the-command-line#34386471
mkdir -p dist
MSYS_NO_PATHCONV=1 docker run --rm -v ${PWD}:/app -w /app node:22 yarn dev
cd ..
