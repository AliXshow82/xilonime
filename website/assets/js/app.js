async function loadPartial(selector, url) {
      const target = document.querySelector(selector);
      const response = await fetch(url);
      if (!target || !response.ok) throw new Error('Partial not found: ' + url);
      target.innerHTML = await response.text();
    }

    await Promise.all([
      loadPartial('#site-header', 'partials/header.html'),
      loadPartial('#site-footer', 'partials/footer.html')
    ]);

const translations = {};
    const textTargets = [
      ['.brand strong', 'brand'],
      ['#languageTriggerText', 'languageMenu'],
      ['.account-guest[href="login.html"]', 'accountLogin'],
      ['.account-guest[href="signup.html"]', 'accountSignup'],
      ['.account-authed[href="my-list.html"]', 'accountMyList'],
      ['#siteLogoutBtn', 'accountLogout'],
      ['.nav-links a[href="index.html#features"]', 'navFeatures'],
      ['.nav-links a[href="blog.html"]', 'navBlog'],
      ['.nav-links a[href="index.html#about"]', 'navAbout'],
      ['.nav-links a[href="index.html#download"]', 'navDownload'],
      ['.eyebrow', 'eyebrow'],
      ['.gradient-text', 'heroTitle'],
      ['.hero-copy p', 'heroText'],
      ['.hero-actions .btn-primary', 'heroDownload'],
      ['.hero-actions .btn-ghost:nth-child(2)', 'github'],
      ['.hero-actions .btn-ghost:nth-child(3)', 'discord'],
      ['.mini-stats .stat:nth-child(1) span', 'statVersion'],
      ['.mini-stats .stat:nth-child(2) span', 'statLocal'],
      ['.mini-stats .stat:nth-child(3) span', 'statLanguage'],
      ['.chip-one b', 'chipOneTitle'],
      ['.chip-one span', 'chipOneText'],
      ['.chip-two b', 'chipTwoTitle'],
      ['.chip-two span', 'chipTwoText'],
      ['.section-head h2', 'featuresTitle'],
      ['.section-head p', 'featuresText'],
      ['.feature:nth-child(1) h3', 'feature1Title'],
      ['.feature:nth-child(1) p', 'feature1Text'],
      ['.feature:nth-child(2) h3', 'feature2Title'],
      ['.feature:nth-child(2) p', 'feature2Text'],
      ['.feature:nth-child(3) h3', 'feature3Title'],
      ['.feature:nth-child(3) p', 'feature3Text'],
      ['.feature:nth-child(4) h3', 'feature4Title'],
      ['.feature:nth-child(4) p', 'feature4Text'],
      ['.download-copy h2', 'downloadTitle'],
      ['.download-copy p', 'downloadText'],
      ['.download-actions .btn-primary', 'downloadButton'],
      ['.download-actions .btn-ghost:nth-child(2)', 'releaseButton'],
      ['.blog-page-title', 'blogTitle'],
      ['.blog-page-text', 'blogText'],
      ['.about-text h2', 'aboutTitle'],
      ['.about-text p', 'aboutText'],
      ['.about-list div:nth-child(1)', 'aboutItem1'],
      ['.about-list div:nth-child(2)', 'aboutItem2'],
      ['.about-list div:nth-child(3)', 'aboutItem3'],
      ['.about-list div:nth-child(4)', 'aboutItem4'],
      ['footer div:nth-child(1)', 'footerLeft'],
      ['footer div:nth-child(2)', 'footerRight']
    ];

    async function loadLanguage(lang) {
      if (translations[lang]) return translations[lang];
      const response = await fetch(`lang/${lang}.json`);
      if (!response.ok) throw new Error(`Language file not found: ${lang}`);
      translations[lang] = await response.json();
      return translations[lang];
    }

    async function applyLanguage(lang) {
      const data = await loadLanguage(lang).catch(() => loadLanguage('fa'));
      document.documentElement.lang = data.lang;
      document.documentElement.dir = data.dir;
      document.title = data.title;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', data.description);

      textTargets.forEach(([selector, key]) => {
        const element = document.querySelector(selector);
        if (element) element.textContent = data[key];
      });

      document.querySelectorAll('.lang-btn').forEach((button) => {
        button.classList.toggle('active', button.dataset.lang === lang);
      });

      localStorage.setItem('xilonime.site.language', lang);
      window.XILONIME_SITE_LANGUAGE_DATA = data;
      window.XILONIME_SITE_LANGUAGE = lang;
      window.XILONIME_APPLY_ACCOUNT_LANGUAGE?.(data);
    }

    document.querySelectorAll('.lang-btn').forEach((button) => {
      button.addEventListener('click', () => {
        applyLanguage(button.dataset.lang);
        document.querySelector('.language-menu')?.classList.remove('open');
        closeMenu();
      });
    });

    const languageMenu = document.querySelector('.language-menu');
    const languageTrigger = document.querySelector('.language-trigger');
    languageTrigger?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      languageMenu?.classList.toggle('open');
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest?.('.language-menu')) languageMenu?.classList.remove('open');
    });

    applyLanguage(localStorage.getItem('xilonime.site.language') || 'fa');

    await import('./auth.js?v=0.32.5-sync2');

    const menuToggle = document.querySelector('.menu-toggle');
    const navLinks = document.querySelectorAll('.nav-links a, .brand');

    function closeMenu() {
      document.body.classList.remove('menu-open');
      if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');
    }

    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        const isOpen = document.body.classList.toggle('menu-open');
        menuToggle.setAttribute('aria-expanded', String(isOpen));
      });
    }

    navLinks.forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    const canvas = document.getElementById('fx');
    const ctx = canvas.getContext('2d');
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let particles = [];
    let pointer = { x: 0.5, y: 0.5 };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(innerWidth * dpr);
      canvas.height = Math.floor(innerHeight * dpr);
      canvas.style.width = `${innerWidth}px`;
      canvas.style.height = `${innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: Math.min(120, Math.floor(innerWidth / 9)) }, () => ({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        z: Math.random(),
        vx: (Math.random() - 0.5) * 0.25,
        vy: 0.12 + Math.random() * 0.42
      }));
    }

    function draw() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      const glowX = pointer.x * innerWidth;
      const glowY = pointer.y * innerHeight;
      const grad = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, Math.min(innerWidth, 680));
      grad.addColorStop(0, 'rgba(255,106,0,0.18)');
      grad.addColorStop(0.44, 'rgba(255,106,0,0.05)');
      grad.addColorStop(1, 'rgba(255,106,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, innerWidth, innerHeight);

      ctx.globalCompositeOperation = 'lighter';
      particles.forEach((p) => {
        const size = 1 + p.z * 2.6;
        ctx.fillStyle = `rgba(255, ${120 + p.z * 80}, 45, ${0.18 + p.z * 0.45})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();

        if (!prefersReduced) {
          p.x += p.vx + (pointer.x - 0.5) * p.z * 0.42;
          p.y += p.vy;
          if (p.y > innerHeight + 12) p.y = -12;
          if (p.x < -12) p.x = innerWidth + 12;
          if (p.x > innerWidth + 12) p.x = -12;
        }
      });
      ctx.globalCompositeOperation = 'source-over';
      requestAnimationFrame(draw);
    }

    function setPointer(event) {
      pointer = {
        x: event.clientX / innerWidth,
        y: event.clientY / innerHeight
      };
      document.querySelectorAll('[data-depth]').forEach((node) => {
        if (node.closest('.hero-copy')) return;
        const depth = Number(node.dataset.depth || 0);
        const rx = (pointer.y - 0.5) * depth * 7;
        const ry = (0.5 - pointer.x) * depth * 9;
        node.style.setProperty('--rx', `${rx}deg`);
        node.style.setProperty('--ry', `${ry}deg`);
        node.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    }, { threshold: 0.2 });

    document.querySelectorAll('.reveal, .feature').forEach((node, index) => {
      node.style.transitionDelay = `${Math.min(index * 70, 320)}ms`;
      observer.observe(node);
    });

    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', setPointer, { passive: true });
    resize();
    draw();
