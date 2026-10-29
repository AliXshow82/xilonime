window.XILONIME_UI = window.XILONIME_UI || {};
window.XILONIME_UI.settingsModal = `
<!-- Settings Modal -->
<div id="settingsModal" class="modal-overlay" style="display:none;" onclick="handleOverlayClick(event)">
  <div class="modal settings-modal" onclick="event.stopPropagation()">
    <div class="modal-header">
      <div class="modal-title" id="settingsTitle">Settings <span>App</span></div>
      <button class="modal-close" onclick="closeModal('settingsModal')">✕</button>
    </div>
    <div class="settings-stack">
      <div class="settings-row">
        <div><b id="settingsLanguageTitle">Language</b><small id="settingsLanguageSub">Interface language</small></div>
        <select class="lang-select" id="settingsLanguage" onchange="setLanguage(this.value)">
          <option value="en">English</option>
          <option value="fa">فارسی</option>
          <option value="ru">Русский</option>
          <option value="zh">中文</option>
          <option value="ja">日本語</option>
        </select>
      </div>
      <div class="settings-row">
        <div><b id="settingsScaleTitle">Scale</b><small id="settingsScaleSub">Resize the whole UI</small></div>
        <input type="range" min="85" max="115" step="5" id="uiScale" oninput="setUiScale(this.value)">
        <span class="settings-value" id="uiScaleValue">100%</span>
      </div>
      <div class="settings-row">
        <div><b id="settingsDensityTitle">Card size</b><small id="settingsDensitySub">Compact or more spacious layout</small></div>
        <select class="sort-select" id="densitySelect" onchange="setDensity(this.value)">
          <option value="compact" id="densityCompact">Compact</option>
          <option value="normal" id="densityNormal">Normal</option>
          <option value="large" id="densityLarge">Large</option>
        </select>
      </div>
      <div class="settings-row">
        <div><b id="settingsDataTitle">Data</b><small id="settingsDataSub">Import and export your anime list</small></div>
        <div class="settings-actions">
          <button class="btn btn-ghost" id="exportBtn" onclick="exportAnimeList()">Export</button>
          <button class="btn btn-ghost" id="importBtn" onclick="document.getElementById('importFile').click()">Import</button>
          <input id="importFile" type="file" accept="application/json,.json" style="display:none" onchange="importAnimeList(event)">
        </div>
      </div>
      <div class="settings-row">
        <div><b id="settingsPlayerTitle">Online player</b><small id="settingsPlayerSub">Play a direct video link like VLC</small></div>
        <button class="btn btn-ghost" id="openPlayerBtn" onclick="openPlayerModal()">Open player</button>
      </div>
      <div class="settings-row">
        <div><b id="settingsAccountTitle">Account</b><small id="settingsAccountSub">Sync desktop and web data through one database.</small></div>
        <button class="btn btn-ghost" id="accountBtn" onclick="openAccountModal()">Account</button>
      </div>
      <div class="account-settings-card">
        <div class="settings-section-head">
          <b id="accountSettingsTitle">Account settings</b>
          <small id="accountSettingsSub">Change your profile under My anime lists.</small>
        </div>
        <div class="account-settings-grid">
          <label><span id="accountSettingsNameLabel">Name</span><input id="accountSettingsName" type="text" autocomplete="name"></label>
          <label><span id="accountSettingsEmailLabel">Email</span><input id="accountSettingsEmail" type="email" autocomplete="email"></label>
          <label><span id="accountSettingsPhoneLabel">Phone</span><input id="accountSettingsPhone" type="tel" autocomplete="tel"></label>
          <label><span id="accountSettingsCurrentPasswordLabel">Current password</span><input id="accountSettingsCurrentPassword" type="password" autocomplete="current-password"></label>
          <label><span id="accountSettingsPasswordLabel">New password</span><input id="accountSettingsPassword" type="password" autocomplete="new-password"></label>
        </div>
        <div class="linked-auth-row">
          <button class="btn btn-ghost" id="linkGoogleBtn" onclick="linkGoogleAccount()">Link Google</button>
          <button class="btn btn-ghost" id="linkDiscordBtn" onclick="linkDiscordAccount()">Link Discord</button>
        </div>
        <button class="btn btn-primary account-settings-save" id="accountSettingsSaveBtn" onclick="saveAccountSettings()">Save account</button>
      </div>
      <div class="settings-row">
        <div><b id="settingsDiscordTitle">Discord Activity</b><small id="settingsDiscordSub">Show watch status on Discord</small></div>
        <button class="btn btn-ghost" id="discordTestBtn" onclick="testDiscordActivity()">Test connection</button>
      </div>
    </div>
    <div class="modal-footer"><button class="btn btn-primary" id="settingsDoneBtn" onclick="closeModal('settingsModal')">Done</button></div>
  </div>
</div>`;
