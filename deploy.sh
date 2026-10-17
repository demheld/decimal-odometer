#!/usr/bin/env sh
# Pulls the latest code, rebuilds the image and (re)starts the container.
set -eu

cd "$(dirname "$0")"

BRANCH="${DEPLOY_BRANCH:-main}"

echo "==> Aktualisiere Code (Branch $BRANCH)"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> Baue Image"
docker compose build --pull

echo "==> Starte Container"
docker compose up -d --remove-orphans

docker compose ps
echo "==> Fertig"
