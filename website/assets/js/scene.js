// The WebGL backdrop: a small glowing orb in two orbit rings, a ring of anime cards and drifting sparks.
// `state` is a plain object the scroll timeline animates; the render loop reads it.
import * as THREE from '../../vendor/three.module.js';

export function createScene(canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    return null; // No WebGL: the CSS gradient behind the canvas stays as the background.
  }

  const small = () => window.innerWidth < 760;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small() ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07070a, 0.045);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 9);

  // Animated by the scroll timeline.
  const state = {
    coreX: 1.6, coreY: 0, coreScale: 1, coreSpin: 0, coreTilt: 0,
    shell: 0.35, glow: 1, ringRadius: 3.1, ringTilt: 0.42, ringSpin: 0, ringOpacity: 1,
    camZ: 9, camY: 0, sparkSpeed: 1, hue: 0
  };

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.PointLight(0xff6a00, 60, 30, 1.6);
  key.position.set(4, 3, 5);
  const rim = new THREE.PointLight(0xff2e88, 40, 30, 1.6);
  rim.position.set(-5, -2, 2);
  const fill = new THREE.DirectionalLight(0xffd2a6, 1.2);
  fill.position.set(-2, 5, 6);
  scene.add(key, rim, fill);

  // The centerpiece: a small glossy orb inside two thin orbit rings, like a gyroscope.
  const core = new THREE.Group();
  scene.add(core);
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 48, 48),
    new THREE.MeshPhysicalMaterial({
      color: 0xffa25a, emissive: 0xff4a00, emissiveIntensity: 0.35,
      roughness: 0.22, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08,
      sheen: 1, sheenColor: new THREE.Color(0xff2e88), sheenRoughness: 0.4
    })
  );
  const ringMaterial = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const gyro = new THREE.Group();
  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.012, 12, 160), ringMaterial(0xffb070, 0.85));
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.01, 12, 140), ringMaterial(0xff2e88, 0.75));
  // A bead travels along each ring.
  const bead = (radius, color) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), new THREE.MeshBasicMaterial({ color }));
    mesh.position.x = radius;
    return mesh;
  };
  outerRing.add(bead(0.95, 0xffe2c4));
  innerRing.add(bead(0.68, 0xffc2dd));
  gyro.add(outerRing, innerRing);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture('rgba(255,130,40,0.85)', 'rgba(255,60,0,0)'),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
  }));
  halo.scale.set(2.6, 2.6, 1);
  core.add(halo, orb, gyro);

  // A tilted ring of cards orbiting the orb, like a watch list in orbit.
  const ring = new THREE.Group();
  core.add(ring);
  const cardCount = 9;
  const cards = [];
  const cardGeometry = roundedCardGeometry(0.9, 1.26, 0.09);
  for (let i = 0; i < cardCount; i++) {
    const material = new THREE.MeshBasicMaterial({
      map: animeCardTexture(i), transparent: true, side: THREE.DoubleSide, depthWrite: false
    });
    const card = new THREE.Mesh(cardGeometry, material);
    card.userData.angle = (i / cardCount) * Math.PI * 2;
    card.userData.bob = Math.random() * Math.PI * 2;
    cards.push(card);
    ring.add(card);
  }
  loadPopularCovers(cards.map((card) => card.material.map));

  // Sparks drifting upward through the whole page.
  const sparkCount = small() ? 700 : 1600;
  const positions = new Float32Array(sparkCount * 3);
  const speeds = new Float32Array(sparkCount);
  for (let i = 0; i < sparkCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 30;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 18 - 2;
    speeds[i] = 0.2 + Math.random() * 0.8;
  }
  const sparkGeometry = new THREE.BufferGeometry();
  sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const sparks = new THREE.Points(sparkGeometry, new THREE.PointsMaterial({
    size: 0.06, color: 0xffa060, transparent: true, opacity: 0.85,
    map: radialTexture('rgba(255,200,150,1)', 'rgba(255,120,40,0)'),
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  }));
  scene.add(sparks);

  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (event) => {
    pointer.tx = (event.clientX / window.innerWidth - 0.5) * 2;
    pointer.ty = (event.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Narrow screens: pull back so the ring still fits.
    camera.fov = width < 760 ? 58 : 42;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock();
  let running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { clock.getDelta(); requestAnimationFrame(frame); }
  });

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const motion = reduced ? 0.15 : 1;

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    const mobile = small();
    // Right-to-left pages put the copy on the right, so the scene mirrors to the left.
    const side = document.documentElement.dir === 'rtl' ? -1 : 1;
    core.position.set(mobile ? 0 : state.coreX * side, state.coreY + (mobile ? 2.1 : 0), 0);
    core.scale.setScalar(state.coreScale * (mobile ? 0.6 : 1));
    orb.rotation.y += dt * 0.3 * motion;
    outerRing.rotation.set(1.1 + Math.sin(t * 0.3) * 0.2 * motion + state.coreTilt, t * 0.5 * motion + state.coreSpin, 0);
    innerRing.rotation.set(t * -0.7 * motion, 0.6, t * 0.4 * motion);
    gyro.scale.setScalar(1 + state.shell * 0.35);
    outerRing.material.opacity = 0.55 + Math.min(state.shell, 1) * 0.35;
    const pulse = 1 + Math.sin(t * 2.2) * 0.05 * motion;
    orb.scale.setScalar((0.85 + state.glow * 0.15) * pulse);
    orb.material.emissiveIntensity = 0.25 + state.glow * 0.2;
    halo.material.opacity = 0.3 + state.glow * 0.3;

    ring.rotation.x = state.ringTilt;
    ring.rotation.y = t * 0.12 * motion + state.ringSpin;
    cards.forEach((card) => {
      const angle = card.userData.angle;
      card.position.set(Math.cos(angle) * state.ringRadius, Math.sin(t * 0.9 + card.userData.bob) * 0.15 * motion, Math.sin(angle) * state.ringRadius);
      card.lookAt(0, card.position.y, 0);
      card.rotateY(Math.PI);
      card.material.opacity = state.ringOpacity;
    });

    const array = sparkGeometry.attributes.position.array;
    for (let i = 0; i < sparkCount; i++) {
      array[i * 3 + 1] += speeds[i] * dt * 0.5 * state.sparkSpeed * motion;
      if (array[i * 3 + 1] > 10) array[i * 3 + 1] = -10;
    }
    sparkGeometry.attributes.position.needsUpdate = true;
    sparks.rotation.y = pointer.x * 0.08;

    key.color.setHSL((0.07 + state.hue) % 1, 1, 0.5);
    camera.position.x = pointer.x * 0.6;
    camera.position.y = state.camY - pointer.y * 0.4;
    camera.position.z = state.camZ;
    camera.lookAt(0, state.camY * 0.6, 0);

    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return { state };
}

const CARD_THEMES = [
  ['#ff6a00', '#3a0c2a', 'Watching', 0.58],
  ['#ff2e88', '#1b0b33', 'Completed', 1],
  ['#ffb347', '#2b1206', 'Plan to watch', 0],
  ['#7a5cff', '#0d0b26', 'Watching', 0.6],
  ['#00c2a8', '#04201e', 'On hold', 0.25],
  ['#ff4d4d', '#2a0606', 'Completed', 1],
  ['#ffd166', '#2a1a02', 'Watching', 0.31],
  ['#4cc9f0', '#04182a', 'Rated 9/10', 1],
  ['#f72585', '#250416', 'Watching', 0.18]
];

/** A poster-style "anime card": cover art, status pill and a progress bar. */
function animeCardTexture(index) {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 448;
  drawAnimeCard(canvas, index);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.userData = { canvas, index, anime: null };
  // The web fonts may still be loading on first paint; redraw once they are in.
  document.fonts?.ready.then(() => redrawCard(texture));
  return texture;
}

function redrawCard(texture) {
  const { canvas, index, anime } = texture.userData;
  drawAnimeCard(canvas, index, anime);
  texture.needsUpdate = true;
}

const POPULAR_QUERY = `query {
  Page(perPage: 9) {
    media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
      title { english romaji }
      episodes
      coverImage { extraLarge large }
    }
  }
}`;

/** Puts the covers of the most popular anime on AniList onto the cards. */
async function loadPopularCovers(textures) {
  let media;
  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: POPULAR_QUERY })
    });
    media = (await response.json())?.data?.Page?.media || [];
  } catch {
    return; // Offline or blocked: the drawn placeholder covers stay.
  }
  media.slice(0, textures.length).forEach((item, i) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      textures[i].userData.anime = { image, title: item.title?.english || item.title?.romaji || '', episodes: item.episodes };
      redrawCard(textures[i]);
    };
    const src = item.coverImage?.extraLarge || item.coverImage?.large;
    if (!src) return;
    // Own cache key: a copy cached by a plain <img> (no CORS headers) would taint the canvas.
    image.src = src + (src.includes('?') ? '&' : '?') + 'xilo3d';
  });
}

function drawAnimeCard(canvas, index, anime = null) {
  const [accent, deep, status, progress] = CARD_THEMES[index % CARD_THEMES.length];
  const { width, height } = canvas;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  roundRect(ctx, 0, 0, width, height, 28);
  ctx.clip();

  if (anime?.image) {
    // Cover, scaled to fill the card.
    const { image } = anime;
    const scale = Math.max(width / image.width, height / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
  } else {
    const background = ctx.createLinearGradient(0, 0, width * 0.4, height);
    background.addColorStop(0, accent);
    background.addColorStop(0.55, deep);
    background.addColorStop(1, '#07070a');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#fff3e4';
    ctx.beginPath();
    ctx.arc(width * (0.3 + (index % 3) * 0.2), height * 0.32, 42 + (index % 4) * 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? accent : '#07070a';
      ctx.fillRect(0, height * 0.42 + i * 11, width, 5 + i);
    }
    ctx.globalAlpha = 1;
  }

  // Bottom panel with the list details.
  const panel = ctx.createLinearGradient(0, height * 0.5, 0, height);
  panel.addColorStop(0, 'rgba(7,7,10,0)');
  panel.addColorStop(0.4, 'rgba(7,7,10,0.82)');
  panel.addColorStop(1, 'rgba(7,7,10,0.97)');
  ctx.fillStyle = panel;
  ctx.fillRect(0, height * 0.5, width, height * 0.5);

  const pad = 20;
  ctx.font = '700 17px "Space Grotesk", system-ui, sans-serif';
  const pillWidth = ctx.measureText(status).width + 24;
  ctx.fillStyle = accent;
  roundRect(ctx, pad, height - 150, pillWidth, 30, 15);
  ctx.fill();
  ctx.fillStyle = '#0b0b0e';
  ctx.fillText(status, pad + 12, height - 129);

  if (anime?.title) {
    ctx.fillStyle = '#f6efe6';
    ctx.font = '700 22px "Space Grotesk", system-ui, sans-serif';
    ctx.fillText(fitText(ctx, anime.title, width - pad * 2), pad, height - 88);
  }

  const total = anime?.episodes || [12, 24, 13, 25, 12, 12, 64, 26, 11][index % 9];
  const watched = Math.round(total * progress);
  ctx.fillStyle = anime?.title ? 'rgba(246,239,230,0.7)' : '#f6efe6';
  ctx.font = anime?.title ? '600 16px "Space Grotesk", system-ui, sans-serif' : '800 28px "Unbounded", system-ui, sans-serif';
  ctx.fillText(`EP ${watched} / ${total}`, pad, height - (anime?.title ? 58 : 66));

  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  roundRect(ctx, pad, height - 38, width - pad * 2, 9, 4.5);
  ctx.fill();
  ctx.fillStyle = accent;
  roundRect(ctx, pad, height - 38, Math.max(9, (width - pad * 2) * progress), 9, 4.5);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 3;
  roundRect(ctx, 1.5, 1.5, width - 3, height - 3, 27);
  ctx.stroke();
}

function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && ctx.measureText(cut + '…').width > maxWidth) cut = cut.slice(0, -1);
  return cut.trimEnd() + '…';
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function radialTexture(inner, outer) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function roundedCardGeometry(width, height, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  const geometry = new THREE.ShapeGeometry(shape, 6);
  // ShapeGeometry UVs are in shape units; map them to 0..1 for the texture.
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (uv.getX(i) - x) / width, (uv.getY(i) - y) / height);
  }
  return geometry;
}
