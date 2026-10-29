// Inner pages: the same 3D scene, parked off to the side and slowly turning.
import { createScene } from './scene.js?v=0.36.0';

const api = createScene(document.getElementById('scene'));
if (api) {
  Object.assign(api.state, { coreX: 2.8, coreY: -0.6, coreScale: 0.95, ringRadius: 3.6, ringTilt: 0.7, camZ: 9.5, glow: 1.2 });
}
