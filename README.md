# Xilonimeh 🎌

<p align="center">
  <img src="https://raw.githubusercontent.com/simple-icons/simple-icons/develop/icons/github.svg" width="70" alt="Xilonimeh Logo">
</p>

<p align="center">
  A modern desktop application for building and managing your personal anime library.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-under%20construction-orange?style=for-the-badge">
  <img src="https://img.shields.io/badge/version-Alpha%200.33.0-blue?style=for-the-badge">
  <img src="https://img.shields.io/badge/platform-Windows-black?style=for-the-badge">
</p>

---

## 🌐 Links

> ⚠️ All websites are currently under construction.

- 🌍 Website: https://xilostudio.ir 
- 👨‍💻 Developer: https://alixshow.ir *(Under Construction)*
- ⬇️ Download: https://github.com/AliXshow82/xilonime/releases/latest
- 🛠️ GitHub Repository: https://github.com/AliXshow82/xilonime
- Temporary and buggy: https://xilonime.pages.dev/ 
- 

---

## ✨ Features

- Native Windows app built with [Tauri](https://tauri.app) (~3 MB installer)
- Automatic, signed updates from GitHub Releases
- Personal anime list with statuses, episodes and ratings
- Optional account to sync the list with the web app
- English, Persian, Russian, Chinese and Japanese (English on first launch)
- Discord Rich Presence and "open in VLC" from the player
- Custom frameless window

---

## 🚧 Project Status

Xilonimeh is currently in active alpha development.

Some features, UI elements, and internal structures may change in future versions.

---

## 🖥️ Development Setup

Requirements: Node.js 20+, Rust (stable, MSVC) and the WebView2 runtime (built into Windows 10/11).

```bash
npm install
npm run dev
```

The app's UI lives in `index.html` and `assets/`; the native side is in `src-tauri/`.
After changing `assets/`, run `node scripts/sync-webapp.js` so the web app (`website/my-list.html`) gets the same UI.

---

## 📦 Build and Release

The updater only accepts installers signed with the project key, which is kept outside the repo at
`%USERPROFILE%\.tauri\xilonime-updater.key`. Keep a backup of it: without it, installed copies can never update again.

1. Bump `version` in `package.json` and `APP_VERSION` in `assets/js/app.js`.
2. Optionally write the release notes in `RELEASE_NOTES.md` (shown in the update button tooltip).
3. Build the signed installer and `latest.json`:

```bash
npm run release
```

4. Or build and publish the GitHub release in one step (needs the `gh` CLI):

```bash
npm run release:publish
```

Installed apps check `releases/latest/download/latest.json` on start and offer the update in the title bar.
Publish releases as normal releases, not pre-releases, or the updater will not see them.

---

## 🌐 Website

`website/` is the static site for xilonime.ir (3D scene with three.js, scroll motion with GSAP and Lenis, all served locally from `website/vendor/`).
Preview it with any static server, for example:

```bash
python -m http.server 5174 --directory website
```

---

## 📜 License

The source code of this project is publicly viewable, but it is **not open for unrestricted copying or redistribution**.

Usage, modification, or redistribution of derivative versions is only allowed under the conditions defined in the [LICENSE](LICENSE) file.

The names, branding, logos, and identities of:

- Xilonimeh
- Xilo Studio

may not be used without written permission.
