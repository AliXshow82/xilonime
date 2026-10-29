// Desktop-only glue for the Tauri build: titlebar, native features and updates.
// The website loads the same app files, so everything here waits for Tauri.
(function () {
  const tauri = window.__TAURI__;
  if (!tauri) return;

  const APP_TITLE_FA = 'ژایلونیمه';
  const invoke = tauri.core.invoke;
  const appWindow = tauri.window.getCurrentWindow();

  window.xiloAPI = {
    discordSetActivity: (payload = {}) => invoke('discord_set_activity', { details: payload.details, state: payload.state }),
    discordClearActivity: () => invoke('discord_clear_activity'),
    openInVlc: (url) => invoke('open_in_vlc', { url: String(url || '') })
  };

  // The API only allows the website's origin, so its requests go through Rust,
  // which is not bound by CORS. Everything else uses the browser's fetch.
  const nativeFetch = window.fetch.bind(window);
  const API_ORIGINS = ['https://xilonime.ir', 'https://www.xilonime.ir'];
  window.fetch = function (input, init) {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    let origin = '';
    try { origin = new URL(url, location.href).origin; } catch {}
    return API_ORIGINS.includes(origin) ? tauri.http.fetch(input, init) : nativeFetch(input, init);
  };

  function openExternal(url) {
    return tauri.opener.openUrl(String(url)).catch(() => {});
  }

  // Links and window.open calls go to the user's browser, not a new app window.
  window.open = function (url) {
    if (url) openExternal(new URL(url, location.href).href);
    return null;
  };
  document.addEventListener('click', (event) => {
    const link = event.target.closest && event.target.closest('a[href]');
    if (!link) return;
    const url = new URL(link.getAttribute('href'), location.href);
    if (url.origin === location.origin || !/^https?:$/.test(url.protocol)) return;
    event.preventDefault();
    openExternal(url.href);
  }, true);

  const style = document.createElement('style');
  style.textContent = `
    /* app.css loads the fonts; the layout only needs to know the titlebar height. */
    :root {
      --titlebar: 48px;
      --xilo-font: var(--app-font);
    }

    body {
      padding-top: 48px !important;
    }

    .xilo-titlebar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10000;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      direction: ltr;
      background:
        radial-gradient(circle at 94% 10%, rgba(255, 106, 0, 0.2), transparent 28%),
        linear-gradient(90deg, rgba(8, 8, 12, 0.98), rgba(15, 11, 14, 0.96));
      border-bottom: 1px solid rgba(255, 106, 0, 0.2);
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.42);
      user-select: none;
    }

    .xilo-title {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-left: 14px;
      color: rgba(248, 242, 232, 0.9);
      font-family: var(--display-font) !important;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.3;
      letter-spacing: 0;
      white-space: nowrap;
    }

    .xilo-title img {
      width: 27px;
      height: 27px;
      border-radius: 9px;
      object-fit: cover;
      border: 1px solid rgba(255, 147, 52, 0.5);
      box-shadow: 0 0 18px rgba(255, 106, 0, 0.24);
      pointer-events: none;
    }

    .xilo-title small {
      color: rgba(255, 190, 126, 0.78);
      font-size: 12px;
      font-weight: 800;
    }

    .xilo-titlebar-drag {
      flex: 1;
      align-self: stretch;
    }

    .xilo-update {
      display: none;
      height: 31px;
      margin-right: 6px;
      padding: 0 14px;
      border: 1px solid rgba(255, 137, 36, 0.72);
      border-radius: 11px;
      cursor: pointer;
      color: #09090d;
      background: linear-gradient(135deg, #ff6a00, #ffb347);
      font: 800 12px/1 var(--xilo-font);
      box-shadow: 0 0 22px rgba(255, 106, 0, 0.34);
    }

    .xilo-update.visible {
      display: block;
    }

    .xilo-update:disabled {
      cursor: default;
      opacity: 0.75;
    }

    .xilo-window-controls {
      height: 100%;
      display: flex;
      align-items: center;
      gap: 9px;
      padding-right: 13px;
    }

    .xilo-window-button {
      position: relative;
      width: 31px;
      height: 31px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 11px;
      padding: 0;
      display: grid;
      place-items: center;
      cursor: pointer;
      color: rgba(255, 214, 170, 0.78);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.075), rgba(255, 255, 255, 0.03)),
        rgba(255, 106, 0, 0.035);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 8px 20px rgba(0, 0, 0, 0.22);
      transition: transform 150ms ease, background 150ms ease, border-color 150ms ease, box-shadow 150ms ease;
    }

    .xilo-window-button::before,
    .xilo-window-button::after {
      content: "";
      position: absolute;
      left: 50%;
      top: 50%;
      width: 12px;
      height: 2px;
      border-radius: 999px;
      background: currentColor;
      transform: translate(-50%, -50%);
      transition: transform 150ms ease, background 150ms ease;
    }

    .xilo-window-button.maximize::before {
      width: 11px;
      height: 11px;
      border: 2px solid currentColor;
      background: transparent;
      border-radius: 4px;
    }

    .xilo-window-button.maximize::after {
      display: none;
    }

    .xilo-window-button.close::before {
      transform: translate(-50%, -50%) rotate(45deg);
    }

    .xilo-window-button.close::after {
      transform: translate(-50%, -50%) rotate(-45deg);
    }

    .xilo-window-button:hover {
      transform: translateY(-1px);
      border-color: rgba(255, 137, 36, 0.72);
      background: linear-gradient(135deg, #ff6a00, #ffb347);
      color: #09090d;
      box-shadow: 0 0 22px rgba(255, 106, 0, 0.34);
    }

    .xilo-window-button.close:hover {
      border-color: rgba(255, 68, 68, 0.76);
      background: linear-gradient(135deg, #ff4545, #ff8a5c);
      box-shadow: 0 0 22px rgba(255, 68, 68, 0.34);
    }
  `;
  document.head.appendChild(style);

  function buildTitlebar() {
    const titlebar = document.createElement('div');
    titlebar.className = 'xilo-titlebar';
    titlebar.innerHTML = `
      <div class="xilo-title" data-tauri-drag-region>
        <img src="assets/logo.png" alt="">
        <span data-tauri-drag-region class="xilo-app-name"></span>
        <small data-tauri-drag-region class="xilo-version"></small>
      </div>
      <div class="xilo-titlebar-drag" data-tauri-drag-region></div>
      <div class="xilo-window-controls">
        <button class="xilo-update" type="button"></button>
        <button class="xilo-window-button minimize" type="button" data-action="minimize" title="Minimize" aria-label="Minimize"></button>
        <button class="xilo-window-button maximize" type="button" data-action="maximize" title="Maximize" aria-label="Maximize"></button>
        <button class="xilo-window-button close" type="button" data-action="close" title="Close" aria-label="Close"></button>
      </div>
    `;

    titlebar.querySelector('.xilo-window-controls').addEventListener('click', (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();

      if (button.dataset.action === 'minimize') appWindow.minimize();
      if (button.dataset.action === 'maximize') appWindow.toggleMaximize();
      if (button.dataset.action === 'close') appWindow.close();
    });

    const name = titlebar.querySelector('.xilo-app-name');
    const setName = () => {
      name.textContent = document.documentElement.lang === 'fa' ? APP_TITLE_FA : 'Xilonimeh';
    };
    setName();
    // app.js sets <html lang> whenever the language changes.
    new MutationObserver(setName).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

    tauri.app.getVersion().then((version) => {
      const label = version.replace(/^(\d+\.\d+\.\d+)-alpha(\.\d+)?$/, 'Alpha $1');
      titlebar.querySelector('.xilo-version').textContent = label;
    });

    document.body.prepend(titlebar);
    return titlebar;
  }

  const UPDATE_TEXT = {
    en: { ready: 'Update {v} - Install', downloading: 'Downloading', installing: 'Installing...', failed: 'Update failed - retry' },
    fa: { ready: 'نسخه {v} آماده است - نصب', downloading: 'در حال دانلود', installing: 'در حال نصب...', failed: 'خطا در به‌روزرسانی - دوباره امتحان کن' },
    ru: { ready: 'Обновление {v} - Установить', downloading: 'Загрузка', installing: 'Установка...', failed: 'Ошибка обновления - повторить' },
    zh: { ready: '更新 {v} - 安装', downloading: '正在下载', installing: '正在安装...', failed: '更新失败 - 重试' },
    ja: { ready: 'アップデート {v} - インストール', downloading: 'ダウンロード中', installing: 'インストール中...', failed: '更新に失敗 - 再試行' }
  };

  function updateText() {
    const lang = localStorage.getItem('xiloAnimeVault.language.alpha02') || 'en';
    return UPDATE_TEXT[lang] || UPDATE_TEXT.en;
  }

  async function checkForUpdate(titlebar) {
    const button = titlebar.querySelector('.xilo-update');
    let update;
    try {
      update = await tauri.updater.check();
    } catch {
      return; // Offline or no release yet: try again next start.
    }
    if (!update) return;

    button.textContent = updateText().ready.replace('{v}', update.version.replace(/-alpha(\.\d+)?$/, ''));
    button.title = update.body || '';
    button.classList.add('visible');
    button.addEventListener('click', async () => {
      const text = updateText();
      button.disabled = true;
      let total = 0;
      let received = 0;
      try {
        await update.downloadAndInstall((event) => {
          if (event.event === 'Started') total = event.data.contentLength || 0;
          if (event.event === 'Progress') {
            received += event.data.chunkLength;
            button.textContent = text.downloading + (total ? ' ' + Math.round((received / total) * 100) + '%' : '...');
          }
          if (event.event === 'Finished') button.textContent = text.installing;
        });
        await tauri.process.relaunch();
      } catch {
        button.disabled = false;
        button.textContent = text.failed;
      }
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    const titlebar = buildTitlebar();
    if (localStorage.getItem('xiloDesktop.legacyImported')) invoke('legacy_import_done').catch(() => {});
    setTimeout(() => checkForUpdate(titlebar), 3000);
  });
})();
