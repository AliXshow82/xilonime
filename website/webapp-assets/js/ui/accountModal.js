window.XILONIME_UI = window.XILONIME_UI || {};
window.XILONIME_UI.accountModal = `
<!-- Account Modal -->
<div id="accountModal" class="modal-overlay" style="display:none;" onclick="handleOverlayClick(event)">
  <div class="modal small-modal account-auth-modal" onclick="event.stopPropagation()">
    <div class="modal-header">
      <div class="modal-title" id="accountModalTitle">Xilonimeh <span>account</span></div>
      <button class="modal-close account-close" id="accountCloseBtn" onclick="closeAccountModal()">x</button>
    </div>

    <div class="account-auth-hero">
      <img src="assets/logo.png" alt="Xilonimeh">
      <div>
        <div class="empty-title" id="accountModalHeadline">Login required</div>
        <div class="empty-sub" id="accountModalSub">Login or sign up before using Xilonimeh.</div>
      </div>
    </div>

    <div class="auth-gate-note" id="accountGateNote">Your list, settings and player unlock after login.</div>

    <div class="social-login-box">
      <div class="social-title" id="accountLoginWithTitle">Login with</div>
      <div class="social-grid">
        <button class="social-auth-btn google-login-btn" id="accountGoogleBtn" type="button" onclick="loginWithGoogle()">
          <span class="google-g">G</span><span>Google</span>
        </button>
        <button class="social-auth-btn discord-login-btn" id="accountDiscordBtn" type="button" onclick="loginWithDiscord()">
          <span>Discord</span>
        </button>
      </div>
      <div class="auth-separator"><span></span><b id="accountOrText">Or</b><span></span></div>
    </div>

    <div class="account-tabs" role="tablist">
      <button type="button" class="account-tab active" id="accountLoginTab" onclick="setAccountMode('login')">Login</button>
      <button type="button" class="account-tab" id="accountSignupTab" onclick="setAccountMode('signup')">Sign up</button>
    </div>

    <form class="account-form" id="accountLoginForm" onsubmit="submitLogin(event)">
      <label id="accountEmailLabel" for="accountEmail">Username</label>
      <input id="accountEmail" type="text" autocomplete="username" placeholder="xilo_user" required>
      <label id="accountPasswordLabel" for="accountPassword">Password</label>
      <input id="accountPassword" type="password" autocomplete="current-password" placeholder="••••••••" required minlength="3">
      <button class="btn btn-primary account-submit" id="accountLoginSubmit" type="submit">Login</button>
      <button class="btn btn-ghost account-submit" id="accountGuestSubmit" type="button" onclick="loginAsGuest()">Continue as guest</button>
    </form>

    <form class="account-form" id="accountSignupForm" onsubmit="submitSignup(event)" hidden>
      <label id="accountNameLabel" for="accountName">Username</label>
      <input id="accountName" type="text" autocomplete="username" placeholder="xilo_user" required maxlength="40">
      <label id="accountSignupEmailLabel" for="accountSignupEmail">Email</label>
      <input id="accountSignupEmail" type="email" autocomplete="email" placeholder="you@example.com" required>
      <label id="accountSignupPasswordLabel" for="accountSignupPassword">Password</label>
      <input id="accountSignupPassword" type="password" autocomplete="new-password" placeholder="••••••••" required minlength="3">
      <button class="btn btn-primary account-submit" id="accountSignupSubmit" type="submit">Create account</button>
    </form>

    <div class="account-profile" id="accountProfile" hidden>
      <div>
        <b id="accountProfileTitle">Signed in</b>
        <small id="accountProfileEmail"></small>
      </div>
      <button class="btn btn-ghost" id="accountLogoutBtn" onclick="logoutAccount()">Logout</button>
    </div>
  </div>
</div>`;
