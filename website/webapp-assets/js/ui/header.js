window.XILONIME_UI = window.XILONIME_UI || {};
// Sidebar: brand, add button, status filters with counts, tools and the account.
// On narrow screens the same markup becomes a top bar with scrolling filter chips (see app.css).
window.XILONIME_UI.header = `
<aside class="sidebar">
  <div class="sidebar-brand">
    <div class="logo">
      <img class="logo-mark" src="assets/logo.png" alt="">
      <div class="logo-text">
        Xilonimeh
        <span>Alpha 0.36.0 · My personal anime list</span>
      </div>
    </div>
    <div class="sidebar-quick">
      <button class="icon-btn" id="announcementBtn" onclick="openAnnouncementModal()" title="Announcements" aria-label="Announcements"><span class="i-bell"></span></button>
      <button class="icon-btn" id="settingsBtn" onclick="openSettingsModal()" title="Settings" aria-label="Settings"><span class="i-gear"></span></button>
    </div>
  </div>

  <button class="btn btn-primary sidebar-add" type="button" onclick="openAddModal()">
    <span class="i-plus"></span><span id="sidebarAddText">Add anime</span>
  </button>

  <nav class="sidebar-nav" aria-label="Library">
    <div class="nav-title" id="navLibraryTitle">Library</div>
    <div class="filter-tabs" id="filterTabs">
      <button class="filter-tab active" data-filter="all" onclick="setFilter('all',this)"><i class="dot dot-all"></i><span class="filter-label">All</span><span class="filter-count" id="count-all">0</span></button>
      <button class="filter-tab" data-filter="watching" onclick="setFilter('watching',this)"><i class="dot dot-watching"></i><span class="filter-label">Watching</span><span class="filter-count" id="count-watching">0</span></button>
      <button class="filter-tab" data-filter="completed" onclick="setFilter('completed',this)"><i class="dot dot-completed"></i><span class="filter-label">Completed</span><span class="filter-count" id="count-completed">0</span></button>
      <button class="filter-tab" data-filter="planned" onclick="setFilter('planned',this)"><i class="dot dot-planned"></i><span class="filter-label">Planned</span><span class="filter-count" id="count-planned">0</span></button>
      <button class="filter-tab" data-filter="paused" onclick="setFilter('paused',this)"><i class="dot dot-paused"></i><span class="filter-label">Paused</span><span class="filter-count" id="count-paused">0</span></button>
      <button class="filter-tab" data-filter="dropped" onclick="setFilter('dropped',this)"><i class="dot dot-dropped"></i><span class="filter-label">Dropped</span><span class="filter-count" id="count-dropped">0</span></button>
    </div>
  </nav>

  <nav class="sidebar-nav sidebar-tools" aria-label="Tools">
    <div class="nav-title" id="navToolsTitle">Tools</div>
    <button class="nav-item" id="headerPlayerBtn" onclick="openPlayerModal()" title="Online player"><span class="i-play"></span><span id="headerPlayerText">Online player</span></button>
    <button class="nav-item" type="button" onclick="openBlogUrl()"><span class="i-book"></span><span id="navBlogText">Blog</span></button>
  </nav>

  <button class="account-chip" id="headerAccountBtn" onclick="openAccountModal()" title="Account">
    <span class="avatar"><span class="i-user"></span></span>
    <span class="account-chip-copy"><b id="headerAccountText">Sign in</b><small id="totalEpisodesBadge"></small></span>
  </button>
</aside>`;
