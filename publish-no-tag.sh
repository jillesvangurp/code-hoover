#!/usr/bin/env bash

set -euo pipefail

die () {
    echo >&2 "$@"
    exit 1
}

npm ci
npm run check

if [ -f "$HOME/.cloudflare.jillesvangurp-com" ]; then
  set -a
  source "$HOME/.cloudflare.jillesvangurp-com"
  set +a
else
  die "Missing $HOME/.cloudflare.jillesvangurp-com with CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN"
fi

: "${CLOUDFLARE_ACCOUNT_ID:?Missing CLOUDFLARE_ACCOUNT_ID}"
: "${CLOUDFLARE_API_TOKEN:?Missing CLOUDFLARE_API_TOKEN}"

docker run --rm \
  -v "$(pwd)":/workspace \
  -w /workspace \
  -e CLOUDFLARE_ACCOUNT_ID \
  -e CLOUDFLARE_API_TOKEN \
  node:22 \
  npx --yes wrangler@latest pages deploy dist --project-name=codehoover --branch=main
