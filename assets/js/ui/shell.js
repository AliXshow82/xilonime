window.XILONIME_UI = window.XILONIME_UI || {};
{
  const ui = window.XILONIME_UI;
  ui.shell = [
    ui.background,
    '<div class="app">',
    ui.header,
    '<main class="main">',
    ui.stats,
    ui.newsTeaser,
    ui.controls,
    ui.animeList,
    '</main>',
    '</div>',
    ui.welcomeModal,
    ui.formModal,
    ui.confirmModal,
    ui.settingsModal,
    ui.accountModal,
    ui.announcementModal,
    ui.changelogModal,
    ui.playerModal,
    ui.floatingAdd,
    ui.notification
  ].join('\n');
}
