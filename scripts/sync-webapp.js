// Copies the desktop app's UI into website/webapp-assets/, which my-list.html runs.
// Run after changing anything under assets/ so the web app stays the same as the desktop app.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const target = path.join(root, 'website', 'webapp-assets');
const DESKTOP_ONLY = new Set(['desktop.js']);

fs.rmSync(target, { recursive: true, force: true });
for (const dir of ['css', 'js', 'lang', 'fonts']) {
  fs.cpSync(path.join(root, 'assets', dir), path.join(target, dir), {
    recursive: true,
    filter: (file) => !DESKTOP_ONLY.has(path.basename(file))
  });
}

// Bust browser and Cloudflare caches with the current version.
const version = require('../package.json').version.replace(/-alpha.*$/, '');
const page = path.join(root, 'website', 'my-list.html');
fs.writeFileSync(page, fs.readFileSync(page, 'utf8').replace(/\?v=[\w.-]+/g, `?v=${version}`));

console.log(`web app synced (v${version})`);
