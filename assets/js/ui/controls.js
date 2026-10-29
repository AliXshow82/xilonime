window.XILONIME_UI = window.XILONIME_UI || {};
// Library heading with search, sort and view switch. The status filters live in the sidebar.
window.XILONIME_UI.controls = `
<section class="library-head">
  <div class="section-head">
    <h2 class="section-title" id="libraryTitle">My library</h2>
    <span class="section-count" id="libraryCount"></span>
  </div>
  <div class="controls">
    <div class="search-wrap">
      <span class="search-icon i-search"></span>
      <input type="search" class="search-input" id="searchInput" name="xilonime_anime_search" autocomplete="off" autocapitalize="none" spellcheck="false" inputmode="search" placeholder="Search anime..." oninput="scheduleRender()">
    </div>
    <select class="sort-select" id="sortSelect" onchange="renderList()">
      <option value="date_desc">Newest</option>
      <option value="date_asc">Oldest</option>
      <option value="name">Name</option>
      <option value="rating">Top rated</option>
      <option value="progress">Progress</option>
    </select>
    <div class="view-toggle">
      <button class="view-btn active" id="gridViewBtn" onclick="setView('grid')" data-tip="Grid view" aria-label="Grid view"><span class="i-grid"></span></button>
      <button class="view-btn" id="listViewBtn" onclick="setView('list')" data-tip="List view" aria-label="List view"><span class="i-list"></span></button>
    </div>
  </div>
</section>`;
