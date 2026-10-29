# Xilonime Ubuntu 24 Deploy

Domain:

```text
xilonime.ir
www.xilonime.ir
```

Server paths:

```text
/var/www/Xilonime
/var/www/Xilonime/api
```

Upload `xilonime-full-0.32.5.zip` to `/tmp`, then run:

```bash
cd /tmp
rm -rf /tmp/xilonime-deploy
mkdir -p /tmp/xilonime-deploy
unzip -o /tmp/xilonime-full-0.32.5.zip -d /tmp/xilonime-deploy
bash /tmp/xilonime-deploy/deploy-server.sh
```

Check:

```bash
systemctl status xilonime-api --no-pager
systemctl status xilonime-anime-sync.timer --no-pager
curl http://127.0.0.1:8787/health
curl "https://xilonime.ir/api/anime/search?q=naruto"
```

For HTTPS:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d xilonime.ir -d www.xilonime.ir
```
