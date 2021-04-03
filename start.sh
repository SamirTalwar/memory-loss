#!/usr/bin/env bash

set -e
set -u
set -o pipefail

cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null

START_URL="$(jq -r '@uri "about:devtools-toolbox?type=extension&id=\(.browser_specific_settings.gecko.id)"' manifest.json)"

SRC="$(find src)"
entr -d snowpack build <<< "$SRC" & ENTR_PID=$!
trap 'kill "$ENTR_PID"' EXIT

web-ext run \
  --verbose \
  --watch-file=build/main.js \
  --start-url="$START_URL"
