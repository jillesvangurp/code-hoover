#!/usr/bin/env bash

set -euo pipefail

die () {
    echo >&2 "$@"
    exit 1
}

[ "$#" -eq 1 ] || die "1 argument required, $# provided"
printf '%s\n' "$1" | grep -E -q '^[0-9]+\.[0-9]+(\.[0-9]+)?.*?$' || die "Semantic Version argument required, $1 provided"

[[ -z $(git status -s) ]] || die "git status is not clean"

TAG=$1

npm ci
npm run check

echo "tagging"
git tag "$TAG"

echo "publishing $TAG"

git push --tags

#rsync -azpv --delete-after  dist/* jillesvangurpcom@ftp.jillesvangurp.com:/srv/home/jillesvangurpcom/domains/jillesvangurp.com/htdocs/codehoover

if [ -f "$HOME/.cloudflare" ]; then
  set -a
  source "$HOME/.cloudflare"
  set +a
else
  die "Missing $HOME/.cloudflare with CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN"
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
