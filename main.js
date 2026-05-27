const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const DiscordRPC = require('discord-rpc');

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=64');
app.commandLine.appendSwitch('disable-background-networking');
app.commandLine.appendSwitch('disable-component-update');
app.commandLine.appendSwitch('disable-domain-reliability');
app.commandLine.appendSwitch('disable-extensions');
app.commandLine.appendSwitch('disable-sync');
app.commandLine.appendSwitch(
  'disable-features',
  'AutofillServerCommunication,MediaRouter,OptimizationHints,InterestFeedContentSuggestions,CalculateNativeWinOcclusion'
);

let mainWindow;
let discordClient = null;
let discordConnecting = null;
const DISCORD_CLIENT_ID = process.env.XILONIME_DISCORD_CLIENT_ID || '1363259189207630124';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#0a0a0f',
    frame: false,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    title: 'ژایلونیمه',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
      backgroundThrottling: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  if (process.env.SMOKE_SCREENSHOT) {
    mainWindow.webContents.once('did-finish-load', async () => {
      setTimeout(async () => {
        const image = await mainWindow.capturePage();
        require('fs').writeFileSync(process.env.SMOKE_SCREENSHOT, image.toPNG());
        app.quit();
      }, 1000);
    });
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

ipcMain.on('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});

ipcMain.on('window:toggle-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;
  win.isMaximized() ? win.unmaximize() : win.maximize();
});

ipcMain.on('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

async function getDiscordClient() {
  if (!DISCORD_CLIENT_ID) {
    throw new Error('Discord Client ID تنظیم نشده');
  }
  if (discordClient) return discordClient;
  if (!discordConnecting) {
    DiscordRPC.register(DISCORD_CLIENT_ID);
    discordClient = new DiscordRPC.Client({ transport: 'ipc' });
    discordConnecting = discordClient.login({ clientId: DISCORD_CLIENT_ID });
  }
  await discordConnecting;
  return discordClient;
}

ipcMain.handle('discord:set-activity', async (_event, payload = {}) => {
  try {
    const client = await getDiscordClient();
    await client.setActivity({
      details: String(payload.details || 'Watching anime').slice(0, 120),
      state: String(payload.state || 'Xilonimeh').slice(0, 120),
      startTimestamp: Date.now(),
      largeImageKey: 'xilonimeh',
      largeImageText: 'Xilonimeh',
      instance: false
    });
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || 'Discord وصل نشد' };
  }
});


function findVlcExecutable() {
  const candidates = [
    process.env.VLC_PATH,
    'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
    'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe'
  ].filter(Boolean);
  return candidates.find(file => { try { return fs.existsSync(file); } catch { return false; } });
}

ipcMain.handle('player:open-vlc', async (_event, rawUrl) => {
  try {
    const url = String(rawUrl || '').trim();
    if (!/^https?:\/\//i.test(url)) return { ok: false, error: 'Invalid video URL' };
    const vlc = findVlcExecutable();
    if (!vlc) return { ok: false, error: 'VLC was not found on this PC' };
    const child = spawn(vlc, [url], { detached: true, stdio: 'ignore' });
    child.unref();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || 'Could not open VLC' };
  }
});

ipcMain.handle('discord:clear-activity', async () => {
  try {
    if (discordClient) await discordClient.clearActivity();
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message || 'Discord clear failed' };
  }
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
