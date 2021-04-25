#!/usr/bin/env bash

set -e
set -u
set -o pipefail

cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null

START_URL="$(jq -r '@uri "about:devtools-toolbox?type=extension&id=\(.browser_specific_settings.gecko.id)"' manifest.json)"

SRC="$(find src)"
entr -d make build/development <<< "$SRC" & ENTR_PID=$!
trap 'kill "$ENTR_PID"' EXIT
sleep 1

web-ext run \
  --verbose \
  --source-dir=build/development \
  --watch-file=build/development/main.js \
  --start-url="$START_URL"
