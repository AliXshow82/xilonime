// Home page motion: smooth scrolling, the 3D scene's scroll path and section reveals.
import { createScene } from './scene.js?v=0.36.0';

const { gsap, ScrollTrigger, Lenis } = window;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sceneApi = createScene(document.getElementById('scene'));

if (!gsap || !ScrollTrigger) {
  document.body.classList.add('no-motion');
} else {
  gsap.registerPlugin(ScrollTrigger);

  // Smooth, weighted scrolling that ScrollTrigger follows.
  if (Lenis && !reduced) {
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 0.9 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"], a[href^="index.html#"]').forEach((link) => {
      link.addEventListener('click', (event) => {
        const hash = link.getAttribute('href').replace('index.html', '');
        const target = hash.length > 1 && document.querySelector(hash);
        if (!target) return;
        event.preventDefault();
        lenis.scrollTo(target, { offset: hash === '#top' ? 0 : -40 });
      });
    });
    window.XILO_LENIS = lenis;
  }

  // Splits a heading into word spans so they can rise in one by one.
  function splitWords(node) {
    const words = node.textContent.trim().split(/\s+/);
    node.innerHTML = words.map((word) => `<span class="word"><span>${word}</span></span>`).join(' ');
    return node.querySelectorAll('.word > span');
  }

  function playIntro() {
    const words = [...document.querySelectorAll('.hero .split')].flatMap((node) => [...splitWords(node)]);
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from(words, { yPercent: 110, rotate: 6, duration: 1.3, stagger: 0.07 })
      .from('.hero .eyebrow', { y: 20, opacity: 0, duration: 0.9 }, 0.2)
      .from('.hero-text', { y: 24, opacity: 0, duration: 1 }, 0.45)
      .from('.hero-actions .btn', { y: 24, opacity: 0, duration: 0.9, stagger: 0.08 }, 0.55)
      .from('.scroll-hint', { opacity: 0, duration: 1 }, 0.9);
  }

  // Headings change text when the language changes, so they are split again.
  document.addEventListener('xilo:language', () => {
    document.querySelectorAll('.hero .split').forEach((node) => splitWords(node));
    ScrollTrigger.refresh();
  });

  const mm = gsap.matchMedia();
  mm.add({ desktop: '(min-width: 900px)', mobile: '(max-width: 899px)', reduced: '(prefers-reduced-motion: reduce)' }, (ctx) => {
    const { desktop, reduced: lowMotion } = ctx.conditions;

    // Hero copy lifts away as the page starts to scroll.
    gsap.to('.hero-inner', {
      yPercent: -18, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
    });

    // Marquee drifts with the scroll and leans into fast flicks.
    const marquee = gsap.to('.marquee-track', {
      xPercent: -50, ease: 'none',
      scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: 0.6 }
    });
    let skew = 0;
    ScrollTrigger.create({
      trigger: '.marquee', start: 'top bottom', end: 'bottom top',
      onUpdate: (self) => {
        const next = gsap.utils.clamp(-12, 12, self.getVelocity() / -300);
        if (Math.abs(next) > Math.abs(skew)) {
          skew = next;
          gsap.to('.marquee-track', { skewX: skew, duration: 0.4, ease: 'power3', overwrite: true, onComplete: () => { skew = 0; } });
        }
      }
    });

    // App window swings up from a tilted 3D pose into place, then the tags pop out.
    const appTl = gsap.timeline({
      scrollTrigger: { trigger: '.reveal-app', start: 'top top', end: desktop ? '+=140%' : '+=90%', scrub: 1, pin: '.reveal-pin' }
    });
    appTl
      .fromTo('.device-frame', { rotateX: 38, rotateY: -14, scale: 0.72, y: 80 }, { rotateX: 0, rotateY: 0, scale: 1, y: 0, ease: 'power2.out' })
      .from('.reveal-copy', { opacity: 0, y: 40 }, 0)
      .from('.device-tag', { opacity: 0, scale: 0.6, y: 30, stagger: 0.12, ease: 'back.out(2)' }, 0.55);

    // Features: a pinned row that scrolls sideways on wide screens.
    if (desktop && !lowMotion) {
      const track = document.querySelector('.features-track');
      const rtl = () => document.documentElement.dir === 'rtl';
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 120);
      gsap.to(track, {
        x: () => (rtl() ? distance() : -distance()), ease: 'none',
        scrollTrigger: { trigger: '.features', start: 'top top', end: () => '+=' + distance(), scrub: 1, pin: '.features-pin', invalidateOnRefresh: true }
      });
    } else {
      gsap.utils.toArray('.feature-card').forEach((card) => {
        gsap.from(card, { y: 60, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: card, start: 'top 88%' } });
      });
    }

    // Stats count up once.
    document.querySelectorAll('[data-count]').forEach((node) => {
      const target = Number(node.dataset.count);
      const suffix = node.dataset.suffix || '';
      const counter = { value: 0 };
      gsap.to(counter, {
        value: target, duration: 1.6, ease: 'power2.out',
        scrollTrigger: { trigger: node, start: 'top 85%', once: true },
        onUpdate: () => { node.textContent = Math.round(counter.value) + suffix; }
      });
    });
    gsap.from('.stat', { y: 50, opacity: 0, stagger: 0.1, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.stats', start: 'top 80%' } });

    // The closing title grows in as it reaches the middle of the screen.
    gsap.fromTo('.download-title', { scale: 0.7, opacity: 0.2 }, {
      scale: 1, opacity: 1, ease: 'none',
      scrollTrigger: { trigger: '.download', start: 'top bottom', end: 'center center', scrub: true }
    });

    // The 3D scene's path through the page.
    if (sceneApi) {
      const s = sceneApi.state;
      const sceneTl = gsap.timeline({ scrollTrigger: { trigger: 'main', start: 'top top', end: 'bottom bottom', scrub: 1.2 } });
      sceneTl
        .to(s, { coreX: 0, coreY: -0.4, coreScale: 1.25, camZ: 7.4, ringRadius: 3.8, ringTilt: 1.05, ringSpin: 1.6, shell: 0.6, duration: 1 })
        .to(s, { coreX: desktop ? -2.6 : 0, coreY: 0.2, coreScale: 0.75, ringRadius: 5.4, ringTilt: 0.2, ringSpin: 3.4, ringOpacity: 0.55, camZ: 9.5, hue: 0.92, duration: 1.4 })
        .to(s, { coreX: 0, coreY: 0.1, coreScale: 1.6, shell: 1.4, glow: 1.6, ringRadius: 7, ringOpacity: 0.15, sparkSpeed: 3, hue: 0.98, duration: 1 })
        .to(s, { coreScale: 1.05, shell: 0.4, glow: 2.1, ringRadius: 3.2, ringTilt: 0.5, ringSpin: 6.2, ringOpacity: 1, sparkSpeed: 1.4, camZ: 8.2, hue: 1, duration: 1 });
    }
  });

  // Buttons lean toward the cursor.
  if (!reduced && window.matchMedia('(pointer: fine)').matches) {
    document.querySelectorAll('.magnetic').forEach((button) => {
      button.addEventListener('pointermove', (event) => {
        const rect = button.getBoundingClientRect();
        gsap.to(button, { x: (event.clientX - rect.left - rect.width / 2) * 0.25, y: (event.clientY - rect.top - rect.height / 2) * 0.35, duration: 0.4, ease: 'power3.out' });
      });
      button.addEventListener('pointerleave', () => gsap.to(button, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' }));
    });
  }

  // site.js fills the header and texts asynchronously; start once they are in.
  const start = () => { playIntro(); ScrollTrigger.refresh(); };
  if (document.body.classList.contains('ready')) start();
  else new MutationObserver((_, observer) => {
    if (document.body.classList.contains('ready')) { observer.disconnect(); start(); }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
}
