#!/usr/bin/env bash

set -e

die () {
    echo >&2 "$@"
    exit 1
}

[[ -z $(git status -s) ]] || die "git status is not clean"

export TAG=$1

gradle jsBrowserDistribution
npm run build

rsync -azpv --delete-after  dist/* jillesvangurpcom@ftp.jillesvangurp.com:/srv/home/jillesvangurpcom/domains/jillesvangurp.com/htdocs/codehoover