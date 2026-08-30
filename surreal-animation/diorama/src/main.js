// The Sketchbook Comes Alive — 3D diorama PoC (pure-sketch rendering)
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { updateShared } from './hatch.js';
import { buildEnsemble } from './characters.js';

const LIGHT_DIR = new THREE.Vector3(0.55, 0.9, 0.42).normalize();
const STAGE = { cam: [0, 2.7, 5.6], tgt: [0, 0.75, 0] };

/* ---------- renderer / scene / camera ---------- */

const canvas = document.getElementById('c');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
} catch (e) {
  document.getElementById('err').textContent = 'WebGL unavailable in this browser.';
  throw e;
}
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;   // raw pipeline, matches custom shaders
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.05, 80);
camera.position.set(0, 4.6, 9.2); // intro start; tweens to STAGE

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 1.2;
controls.maxDistance = 12;
controls.maxPolarAngle = Math.PI * 0.52;
controls.target.set(0, 0.75, 0);

/* ---------- world ---------- */

const world = buildEnsemble();
scene.add(world.backdrop);
scene.add(world.table);
scene.add(world.shadowRoot);
for (const c of world.chars) scene.add(c.group);

/* ---------- camera tween ---------- */

const tween = {
  active: false, t: 0, dur: 1.15,
  fromP: new THREE.Vector3(), toP: new THREE.Vector3(),
  fromT: new THREE.Vector3(), toT: new THREE.Vector3(),
};
let introDone = false, userTouched = false;

function flyTo(camArr, tgtArr, isIntro = false) {
  tween.fromP.copy(camera.position);
  tween.fromT.copy(controls.target);
  tween.toP.set(...camArr);
  tween.toT.set(...tgtArr);
  tween.t = 0;
  tween.active = true;
  if (!isIntro) userTouched = true;
}
flyTo(STAGE.cam, STAGE.tgt, true);   // intro dolly-in

/* ---------- pointer: click vs drag, hover cursor ---------- */

const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let downPos = null;

function pick(e) {
  ptr.x = (e.clientX / innerWidth) * 2 - 1;
  ptr.y = -(e.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(scene.children, true);
  for (const h of hits) {
    let o = h.object;
    while (o) {
      if (o.userData && o.userData.char) return o.userData.char;
      o = o.parent;
    }
  }
  return null;
}

canvas.addEventListener('pointerdown', (e) => {
  downPos = [e.clientX, e.clientY];
  userTouched = true;
});
canvas.addEventListener('wheel', () => { userTouched = true; }, { passive: true });
canvas.addEventListener('pointerup', (e) => {
  if (!downPos) return;
  const dx = e.clientX - downPos[0], dy = e.clientY - downPos[1];
  downPos = null;
  if (dx * dx + dy * dy > 36) return;            // it was a drag
  const c = pick(e);
  if (!c || !c.react) return;
  if (c.react() === 'party') {
    for (const other of world.chars) if (other !== c && other.react) other.react();
  }
  flyTo(c.focus.cam, c.focus.tgt);
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  canvas.style.cursor = pick(e) ? 'pointer' : 'grab';
});

/* ---------- HUD buttons ---------- */

document.querySelectorAll('[data-char]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const name = btn.dataset.char;
    if (name === 'stage') return flyTo(STAGE.cam, STAGE.tgt);
    const c = world.chars.find((k) => k.name === name);
    if (!c) return;
    if (c.react && c.react() === 'party') {
      for (const other of world.chars) if (other !== c && other.react) other.react();
    }
    flyTo(c.focus.cam, c.focus.tgt);
  });
});

/* ---------- resize / error surface ---------- */

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
addEventListener('error', (e) => {
  const el = document.getElementById('err');
  if (el) el.textContent = 'Error: ' + (e.message || 'unknown');
});

/* ---------- main loop ---------- */

const clock = new THREE.Clock();
const tmpV = new THREE.Vector3();

function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  if (tween.active) {
    tween.t += dt / tween.dur;
    const k = tween.t >= 1 ? 1 : tween.t * tween.t * (3 - 2 * tween.t);
    camera.position.lerpVectors(tween.fromP, tween.toP, k);
    controls.target.lerpVectors(tween.fromT, tween.toT, k);
    if (tween.t >= 1) {
      tween.active = false;
      introDone = true;
    }
  }
  controls.autoRotate = introDone && !userTouched && !tween.active;
  controls.autoRotateSpeed = 0.55;

  for (const c of world.chars) c.update(t, dt);

  // shadows track their characters but stay flat on the table
  for (const s of world.shadows) {
    s.char.group.getWorldPosition(tmpV);
    s.mesh.position.x = tmpV.x;
    s.mesh.position.z = tmpV.z;
    const lift = Math.max(0, tmpV.y - s.restY);
    const k = Math.max(0.4, 1 - lift * 0.5);
    s.mesh.material.opacity = s.baseO * k;
    const shrink = 1 - (1 - k) * 0.45;
    s.mesh.scale.set(s.sx * shrink, s.sz * shrink, 1);
  }

  controls.update();
  camera.updateMatrixWorld();
  updateShared(camera, Math.floor((t * 8) % 997), LIGHT_DIR);
  renderer.render(scene, camera);
}
frame();
