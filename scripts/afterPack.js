const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function listRceditFiles(root) {
  if (!root || !fs.existsSync(root)) return [];

  const found = [];
  const pending = [root];

  while (pending.length) {
    const current = pending.pop();
    let entries = [];

    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        pending.push(fullPath);
      } else if (entry.isFile() && entry.name.toLowerCase() === 'rcedit-x64.exe') {
        found.push(fullPath);
      }
    }
  }

  return found.sort((left, right) => {
    const leftTime = fs.statSync(left).mtimeMs;
    const rightTime = fs.statSync(right).mtimeMs;
    return rightTime - leftTime;
  });
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const iconPath = path.join(context.packager.projectDir, 'assets', 'icon.ico');
  const cacheRoot = path.join(process.env.LOCALAPPDATA || '', 'electron-builder', 'Cache', 'winCodeSign');
  const rceditPath = listRceditFiles(cacheRoot)[0];

  if (!fs.existsSync(exePath) || !fs.existsSync(iconPath) || !rceditPath) {
    console.warn('[afterPack] skipped Windows icon patch', { exePath, iconPath, rceditPath });
    return;
  }

  const result = spawnSync(rceditPath, [
    exePath,
    '--set-icon', iconPath,
    '--set-version-string', 'FileDescription', 'Xilonimeh',
    '--set-version-string', 'ProductName', 'Xilonimeh',
    '--set-version-string', 'CompanyName', 'Xilo Studio',
    '--set-version-string', 'InternalName', 'Xilonimeh',
    '--set-version-string', 'OriginalFilename', 'Xilonimeh.exe',
    '--set-file-version', '0.2.0.0',
    '--set-product-version', '0.2.0.0'
  ], {
    encoding: 'utf8',
    stdio: 'pipe'
  });

  if (result.status !== 0) {
    throw new Error(`[afterPack] rcedit failed: ${result.stderr || result.stdout || result.error}`);
  }

  console.log(`[afterPack] patched Windows icon with ${rceditPath}`);
};
