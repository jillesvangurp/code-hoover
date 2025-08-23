#!/usr/bin/env bash

set -e

die () {
    echo >&2 "$@"
    exit 1
}

[ "$#" -eq 1 ] || die "1 argument required, $# provided"
echo $1 | grep -E -q '^[0-9]+\.[0-9]+(\.[0-9]+)?.*?$' || die "Semantic Version argument required, $1 provided"

[[ -z $(git status -s) ]] || die "git status is not clean"

export TAG=$1

gradle jsBrowserDistribution
npm run build

echo "tagging"
git tag "$TAG"

echo "publishing $TAG"

git push --tags

#rsync -azpv --delete-after  dist/* jillesvangurpcom@ftp.jillesvangurp.com:/srv/home/jillesvangurpcom/domains/jillesvangurp.com/htdocs/codehoover

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