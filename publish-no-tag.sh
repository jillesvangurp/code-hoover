#!/usr/bin/env bash

set -e

die () {
    echo >&2 "$@"
    exit 1
}

#[[ -z $(git status -s) ]] || die "git status is not clean"

export TAG=$1

gradle jsBrowserDistribution
npm run build

if [ -f "$HOME/.cloudflare" ]; then
  source "$HOME/.cloudflare"
else
  die "Missing $HOME/.cloudflare with CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN"
fi

docker run --rm -it \
  -v "$(pwd)":/workspace \
  -w /workspace \
  -e CLOUDFLARE_ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID} \
  -e CLOUDFLARE_API_TOKEN=${CLOUDFLARE_API_TOKEN} \
  node:22 \
  npx --yes wrangler pages deploy dist --project-name=codehoover --branch=main