// Builds the signed installer and writes latest.json for the auto-updater.
//   node scripts/release.js            build only
//   node scripts/release.js --publish  build, then upload a GitHub release
//
// Needs the updater signing key at %USERPROFILE%\.tauri\xilonime-updater.key
// (or TAURI_SIGNING_PRIVATE_KEY). Losing that key means existing installs can
// never update again, so keep a backup of it outside this PC.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = 'AliXshow82/xilonime';
const root = path.join(__dirname, '..');
const version = require('../package.json').version;
const publish = process.argv.includes('--publish');

const appJs = fs.readFileSync(path.join(root, 'assets/js/app.js'), 'utf8');
if (!appJs.includes(`const APP_VERSION = '${version}';`)) {
  console.error(`APP_VERSION in assets/js/app.js does not match package.json (${version}).`);
  process.exit(1);
}

const env = { ...process.env };
if (!env.TAURI_SIGNING_PRIVATE_KEY) {
  const keyFile = path.join(os.homedir(), '.tauri', 'xilonime-updater.key');
  if (!fs.existsSync(keyFile)) {
    console.error(`Signing key not found: ${keyFile}`);
    process.exit(1);
  }
  env.TAURI_SIGNING_PRIVATE_KEY = keyFile;
}
env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD || '';

// npx is a .cmd on Windows and needs a shell; gh is a real .exe and must not get one,
// or arguments with spaces and line breaks (the release notes) get split apart.
const run = (cmd, args, { shell = false } = {}) => execFileSync(cmd, args, { cwd: root, env, stdio: 'inherit', shell });
run('npx', ['tauri', 'build'], { shell: process.platform === 'win32' });

const bundleDir = path.join(root, 'src-tauri/target/release/bundle/nsis');
const installer = `Xilonimeh_${version}_x64-setup.exe`;
const installerPath = path.join(bundleDir, installer);
const signature = fs.readFileSync(`${installerPath}.sig`, 'utf8').trim();
const tag = `v${version}`;

const notesFile = path.join(root, 'RELEASE_NOTES.md');
const notes = fs.existsSync(notesFile) ? fs.readFileSync(notesFile, 'utf8').trim() : `Xilonimeh ${version}`;

const latest = {
  version,
  notes,
  pub_date: new Date().toISOString(),
  platforms: {
    'windows-x86_64': {
      signature,
      url: `https://github.com/${REPO}/releases/download/${tag}/${installer}`
    }
  }
};
const latestPath = path.join(bundleDir, 'latest.json');
fs.writeFileSync(latestPath, JSON.stringify(latest, null, 2));
console.log(`\nInstaller: ${installerPath}\nUpdate manifest: ${latestPath}`);

if (publish) {
  // A normal (not pre-) release, because releases/latest/download skips prereleases.
  const notesPath = path.join(bundleDir, 'release-notes.md');
  fs.writeFileSync(notesPath, notes);
  run('gh', ['release', 'create', tag, installerPath, `${installerPath}.sig`, latestPath,
    '--repo', REPO, '--title', `Xilonimeh ${version}`, '--notes-file', notesPath, '--latest']);
  console.log(`Published ${tag}`);
}
