// Copies the app's web files into web-dist/, the folder Tauri embeds in the build.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'web-dist');

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(out, 'index.html'));
fs.cpSync(path.join(root, 'assets'), path.join(out, 'assets'), { recursive: true });

console.log('Web files copied to web-dist/');
