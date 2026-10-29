#!/usr/bin/env bash
set -euo pipefail

SITE_ROOT="/var/www/Xilonime"
API_ROOT="$SITE_ROOT/api"
DOMAIN="xilonime.ir"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo bash deploy-server.sh"
  exit 1
fi

if [ ! -d "$SOURCE_DIR/website" ] || [ ! -d "$SOURCE_DIR/server" ]; then
  echo "Deploy archive must contain website/ and server/ folders."
  exit 1
fi

mkdir -p "$SITE_ROOT" "$API_ROOT"

find "$SITE_ROOT" -mindepth 1 -maxdepth 1 ! -name "api" -exec rm -rf {} +
cp -a "$SOURCE_DIR/website/." "$SITE_ROOT/"
chmod -R u=rwX,go=rX "$SITE_ROOT"

mkdir -p "$API_ROOT/src" "$API_ROOT/systemd" "$API_ROOT/data"
cp -a "$SOURCE_DIR/server/package.json" "$API_ROOT/package.json"
if [ -f "$SOURCE_DIR/server/package-lock.json" ]; then
  cp -a "$SOURCE_DIR/server/package-lock.json" "$API_ROOT/package-lock.json"
fi
cp -a "$SOURCE_DIR/server/schema.sql" "$API_ROOT/schema.sql"
cp -a "$SOURCE_DIR/server/src/." "$API_ROOT/src/"
cp -a "$SOURCE_DIR/server/systemd/." "$API_ROOT/systemd/"

if [ ! -f "$API_ROOT/.env" ]; then
  cp -a "$SOURCE_DIR/server/.env.example" "$API_ROOT/.env"
fi

if [ ! -f "$API_ROOT/data/xilonime-db.json" ]; then
  cp -a "$SOURCE_DIR/server/data/xilonime-db.json" "$API_ROOT/data/xilonime-db.json"
fi

cd "$API_ROOT"
if command -v npm >/dev/null 2>&1; then
  npm install --omit=dev
  npm run sync:anime || true
else
  echo "Node.js/npm is missing. Install Node.js 20+ before enabling the API service."
fi

cp "$API_ROOT/systemd/xilonime-api.service" /etc/systemd/system/xilonime-api.service
cp "$API_ROOT/systemd/xilonime-anime-sync.service" /etc/systemd/system/xilonime-anime-sync.service
cp "$API_ROOT/systemd/xilonime-anime-sync.timer" /etc/systemd/system/xilonime-anime-sync.timer

if [ -e /etc/nginx/sites-enabled/xilonime ]; then
  echo "Keeping existing /etc/nginx/sites-enabled/xilonime SSL config."
else
  cp "$SOURCE_DIR/nginx-xilonime.conf" /etc/nginx/sites-available/xilonime.conf
  ln -sfn /etc/nginx/sites-available/xilonime.conf /etc/nginx/sites-enabled/xilonime.conf
fi

systemctl daemon-reload
systemctl enable --now xilonime-api.service
systemctl enable --now xilonime-anime-sync.timer

nginx -t
systemctl reload nginx

echo "Deployed https://$DOMAIN to $SITE_ROOT"
echo "API health: curl http://127.0.0.1:8787/health"
