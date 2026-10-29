# Xilonime API Alpha 0.32.5

This folder is the shared backend plan for both clients:

```text
Xilonimeh Desktop App
Xilonimeh Web App
        ↓
Xilonime API on Ubuntu
        ↓
One central database
        ↓ every 2 days
AniList / Jikan sync
```

The current local server uses a JSON data file so it can run without downloading packages. On the Ubuntu server, move the same API shape to PostgreSQL using `schema.sql`.

## Local test

```bash
cd server
cp .env.example .env
npm run sync:anime
npm start
```

Then test:

```bash
curl "http://127.0.0.1:8787/health"
curl "http://127.0.0.1:8787/api/anime/search?q=naruto"
curl -X POST "http://127.0.0.1:8787/api/auth/demo-login"
curl -H "Authorization: Bearer demo-token" "http://127.0.0.1:8787/api/library"
```

## Ubuntu deploy idea

Copy `server/` to:

```text
/var/www/Xilonime/api
```

Install the systemd files:

```bash
cp /var/www/Xilonime/api/systemd/xilonime-api.service /etc/systemd/system/
cp /var/www/Xilonime/api/systemd/xilonime-anime-sync.service /etc/systemd/system/
cp /var/www/Xilonime/api/systemd/xilonime-anime-sync.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now xilonime-api.service
systemctl enable --now xilonime-anime-sync.timer
```

Nginx should proxy `/api/` to `http://127.0.0.1:8787/`.
