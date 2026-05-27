const { contextBridge, ipcRenderer } = require('electron');

const APP_TITLE = '\u0698\u0627\u06cc\u0644\u0648\u0646\u06cc\u0645\u0647';

contextBridge.exposeInMainWorld('xiloAPI', {
  discordSetActivity: (payload) => ipcRenderer.invoke('discord:set-activity', payload),
  discordClearActivity: () => ipcRenderer.invoke('discord:clear-activity'),
  openInVlc: (url) => ipcRenderer.invoke('player:open-vlc', url)
});

window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: "Vazir";
      src: url("assets/fonts/Vazir.ttf") format("truetype");
      font-weight: 100 600;
      font-style: normal;
      font-display: swap;
    }

    @font-face {
      font-family: "Vazir";
      src: url("assets/fonts/Vazir-Bold.ttf") format("truetype");
      font-weight: 700 950;
      font-style: normal;
      font-display: swap;
    }

    :root {
      --xilo-font: "Vazir", sans-serif;
    }

    html,
    body,
    button,
    input,
    select,
    textarea {
      font-family: var(--xilo-font) !important;
      letter-spacing: 0 !important;
      text-rendering: geometricPrecision;
      -webkit-font-smoothing: antialiased;
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
      -webkit-app-region: drag;
      user-select: none;
    }

    .xilo-title {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-left: 14px;
      color: rgba(248, 242, 232, 0.9);
      font: 800 13px/1.3 var(--xilo-font);
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
    }

    .xilo-title small {
      color: rgba(255, 190, 126, 0.78);
      font-size: 12px;
      font-weight: 800;
    }

    .xilo-window-controls {
      height: 100%;
      display: flex;
      align-items: center;
      gap: 9px;
      padding-right: 13px;
      -webkit-app-region: no-drag;
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

    header {
      top: 48px !important;
    }

    .logo-text {
      font-family: var(--xilo-font) !important;
      font-weight: 900 !important;
      letter-spacing: 0 !important;
    }
  `;
  document.head.appendChild(style);

  const titlebar = document.createElement('div');
  titlebar.className = 'xilo-titlebar';
  titlebar.innerHTML = `
    <div class="xilo-title">
      <img src="assets/logo.png" alt="">
      <span>${APP_TITLE}</span>
      <small>Alpha 0.30</small>
    </div>
    <div class="xilo-window-controls">
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

    if (button.dataset.action === 'minimize') ipcRenderer.send('window:minimize');
    if (button.dataset.action === 'maximize') ipcRenderer.send('window:toggle-maximize');
    if (button.dataset.action === 'close') ipcRenderer.send('window:close');
  });

  document.body.prepend(titlebar);
});
