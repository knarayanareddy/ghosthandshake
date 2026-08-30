// Procedural pencil-hatch rendering for the sketch diorama.
// Tone-mapped screen-space hatching (4 pencil-density tiles in an atlas),
// boiling vertex jitter (hand-redrawn feel), inverted-hull ink outlines,
// hatched blob shadows, and all canvas-drawn textures.
import * as THREE from 'three';

export const PAPER = '#f6f2e7';
const PAPER_RGB = [0.965, 0.949, 0.906];
const GRAPHITE = 'rgba(56,52,45,';

// every generated material registers here so the main loop can update time & light
export const REG = { mats: [] };

/* ---------------- seamless pencil-stroke tiles ---------------- */

function strokeTile(density) {
  const s = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, s, s);
  // paper tooth
  for (let i = 0; i < 2400; i++) {
    ctx.fillStyle = GRAPHITE + (Math.random() * 0.05) + ')';
    ctx.fillRect(Math.random() * s, Math.random() * s, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const wrapped = (fn) => {
    for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) {
      ctx.save(); ctx.translate(ox, oy); fn(); ctx.restore();
    }
  };
  const layers = [
    { ang: 34, per: 34, w: 1.8, a: 0.15 },
    { ang: -41, per: 27, w: 1.5, a: 0.14 },
    { ang: 68, per: 16, w: 1.2, a: 0.11 },
  ];
  const count = density <= 0 ? 0 : Math.min(3, Math.ceil(density));
  for (let li = 0; li < count; li++) {
    const L = layers[li];
    const n = Math.round(L.per * [1, 2.1, 3.4][li]);
    for (let i = 0; i < n; i++) {
      wrapped(() => {
        const x0 = Math.random() * s, y0 = Math.random() * s;
        const len = s * (0.5 + Math.random() * 0.9);
        const dx = Math.cos(L.ang * Math.PI / 180) * len;
        const dy = Math.sin(L.ang * Math.PI / 180) * len;
        ctx.strokeStyle = GRAPHITE + (L.a * (0.6 + Math.random() * 0.8)) + ')';
        ctx.lineWidth = L.w * (0.7 + Math.random() * 0.6);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo(
          x0 + dx * 0.5 + (Math.random() - 0.5) * 16,
          y0 + dy * 0.5 + (Math.random() - 0.5) * 16,
          x0 + dx, y0 + dy);
        ctx.stroke();
      });
    }
  }
  return cv;
}

let _atlas = null;
export function atlasTexture() {
  if (_atlas) return _atlas;
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 512;
  const ctx = c.getContext('2d');
  [0, 1, 2.1, 3.4].forEach((d, i) => ctx.drawImage(strokeTile(d), i * 512, 0));
  _atlas = new THREE.CanvasTexture(c);
  _atlas.wrapS = _atlas.wrapT = THREE.ClampToEdgeWrapping;
  _atlas.minFilter = THREE.LinearFilter;
  _atlas.generateMipmaps = false;
  return _atlas;
}

/* ---------------- shaders ---------------- */

const NOISE_GLSL = `
float hash12(vec2 p){ p = fract(p*vec2(123.34, 345.45)); p += dot(p, p+34.345); return fract(p.x*p.y); }
float hash13(vec3 p){ p = fract(p*vec3(123.34, 345.45, 567.67)); p += dot(p, p+34.345); return fract(p.x*p.y*p.z); }
`;

const HATCH_VERT = `
uniform float uTime8;
uniform float uBoil;
varying vec3 vN;
${NOISE_GLSL}
void main(){
  vec3 p = position;
  if (uBoil > 0.0) {
    p += (vec3(
      hash13(position*3.1 + uTime8),
      hash13(position*3.7 + uTime8 + 11.0),
      hash13(position*4.3 + uTime8 + 23.0)) - 0.5) * uBoil;
  }
  vN = normalMatrix * normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const HATCH_FRAG = `
uniform sampler2D uAtlas;
uniform float uScale;
uniform vec3  uLightDir;   // view space
uniform float uAmbient;
uniform float uKey;
uniform vec3  uTint;
uniform float uFlat;
varying vec3 vN;
${NOISE_GLSL}
void main(){
  vec3 N = normalize(vN);
  float nl = max(dot(N, normalize(uLightDir)), 0.0);
  float light = mix(uAmbient + uKey * nl, 0.94, uFlat);
  float tone = clamp(1.0 - light, 0.0, 1.0);
  tone += (hash12(gl_FragCoord.xy) - 0.5) * 0.10;     // dither, hides banding
  tone = clamp(tone, 0.015, 0.985);
  float f = tone * 3.0;
  float tile = min(floor(f), 2.0);
  float fx = smoothstep(0.0, 1.0, fract(f));
  vec2 tuv = fract(gl_FragCoord.xy * uScale);
  vec3 c0 = texture2D(uAtlas, vec2((tile       + tuv.x) * 0.25, tuv.y)).rgb;
  vec3 c1 = texture2D(uAtlas, vec2((tile + 1.0 + tuv.x) * 0.25, tuv.y)).rgb;
  gl_FragColor = vec4(mix(c0, c1, fx) * uTint, 1.0);
}`;

const OUTLINE_VERT = `
uniform float uTime8;
uniform float uBoil;
uniform float uThick;
varying vec3 vN;
${NOISE_GLSL}
void main(){
  vec3 p = position + normal * uThick;
  if (uBoil > 0.0) {
    p += (vec3(
      hash13(position*3.1 + uTime8),
      hash13(position*3.7 + uTime8 + 11.0),
      hash13(position*4.3 + uTime8 + 23.0)) - 0.5) * uBoil;
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const OUTLINE_FRAG = `
uniform vec3 uColor;
uniform float uOpacity;
void main(){ gl_FragColor = vec4(uColor, uOpacity); }`;

/* ---------------- material factories ---------------- */

export function hatchMaterial({ tint = 0xffffff, ambient = 0.38, key = 0.62, scale = 1 / 300, flat = 0, boil = 0.006 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uAtlas: { value: atlasTexture() },
      uScale: { value: scale },
      uLightDir: { value: new THREE.Vector3(0.5, 0.8, 0.5) },
      uAmbient: { value: ambient },
      uKey: { value: key },
      uTint: { value: new THREE.Color(tint) },
      uFlat: { value: flat },
      uTime8: { value: 0 },
      uBoil: { value: boil },
    },
    vertexShader: HATCH_VERT,
    fragmentShader: HATCH_FRAG,
  });
  REG.mats.push(m);
  return m;
}

export function outlineMaterial({ thickness = 0.014, color = 0x35312a, opacity = 1, boil = 0.0035 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTime8: { value: 0 },
      uBoil: { value: boil },
      uThick: { value: thickness },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    },
    vertexShader: OUTLINE_VERT,
    fragmentShader: OUTLINE_FRAG,
    side: THREE.BackSide,
    transparent: opacity < 1,
  });
  REG.mats.push(m);
  return m;
}

// inverted-hull ink outline as a child of `mesh`
export function addOutline(mesh, opts = {}) {
  const o = new THREE.Mesh(mesh.geometry, outlineMaterial(opts));
  mesh.add(o);
  return o;
}

const _v = new THREE.Vector3();
export function updateShared(camera, t8, dirWorld) {
  _v.copy(dirWorld).transformDirection(camera.matrixWorldInverse);
  for (const m of REG.mats) {
    m.uniforms.uTime8.value = t8;
    if (m.uniforms.uLightDir) m.uniforms.uLightDir.value.copy(_v);
  }
}

/* ---------------- hatched blob shadow ---------------- */

let _shadowTex = null;
function shadowTexture() {
  if (_shadowTex) return _shadowTex;
  const s = 256;
  const cv = document.createElement('canvas');
  cv.width = cv.height = s;
  const ctx = cv.getContext('2d');
  ctx.translate(s / 2, s / 2);
  ctx.strokeStyle = GRAPHITE + '0.16)';
  ctx.lineCap = 'round';
  for (let k = 0; k < 9; k++) {
    const rx = 16 + k * 13, ry = rx * 0.60;
    ctx.lineWidth = 2.2 - k * 0.12;
    ctx.strokeStyle = GRAPHITE + Math.max(0.03, 0.17 - k * 0.016) + ')';
    for (let rep = 0; rep < 3; rep++) {
      ctx.beginPath();
      ctx.ellipse((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, rx, ry, (Math.random() - 0.5) * 0.2, Math.random() * 6.28, Math.random() * 6.28 + 2.2 + Math.random() * 2.5);
      ctx.stroke();
    }
  }
  _shadowTex = new THREE.CanvasTexture(cv);
  return _shadowTex;
}

export function shadowMesh(sx, sz, opacity = 0.85) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: shadowTexture(), transparent: true,
      opacity, depthWrite: false,
    }));
  m.rotation.x = -Math.PI / 2;
  m.scale.set(sx, sz, 1);
  m.renderOrder = 1;
  return m;
}

/* ---------------- drawn props: cup faces, whirlpool, notes, pages ---------------- */

function sketchCtx(w, h) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  ctx.strokeStyle = GRAPHITE + '0.85)';
  ctx.fillStyle = GRAPHITE + '0.85)';
  ctx.lineCap = 'round';
  return [cv, ctx];
}

function jitterLine(ctx, x0, y0, x1, y1, wob = 3) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  const mx = (x0 + x1) / 2 + (Math.random() - 0.5) * wob * 2;
  const my = (y0 + y1) / 2 + (Math.random() - 0.5) * wob * 2;
  ctx.quadraticCurveTo(mx, my, x1 + (Math.random() - 0.5) * 2, y1 + (Math.random() - 0.5) * 2);
  ctx.stroke();
}

export function cupFaceTexture(surprised) {
  const [cv, ctx] = sketchCtx(256, 256);
  const eye = (x, y) => {
    if (surprised) {
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(x, y, 34, 0, 6.29); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 4, y + 6, 11, 0, 6.29); ctx.fill();
    } else {
      ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.29); ctx.fill();
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 22, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    }
  };
  eye(88, 96); eye(168, 96);
  // brows
  ctx.lineWidth = 5;
  if (surprised) {
    jitterLine(ctx, 58, 42, 108, 30); jitterLine(ctx, 148, 30, 198, 42);
    // O mouth
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(128, 186, 30, 0, 6.29); ctx.stroke();
    ctx.fillStyle = GRAPHITE + '0.25)';
    ctx.beginPath(); ctx.arc(128, 186, 26, 0, 6.29); ctx.fill();
  } else {
    jitterLine(ctx, 62, 52, 106, 44); jitterLine(ctx, 150, 44, 194, 52);
    // small smile
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(128, 168, 26, 0.35, Math.PI - 0.35); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  return t;
}

export function whirlTexture() {
  const [cv, ctx] = sketchCtx(256, 256);
  ctx.translate(128, 128);
  for (let arm = 0; arm < 4; arm++) {
    const a0 = arm * Math.PI / 2;
    for (let pass = 0; pass < 3; pass++) {
      ctx.strokeStyle = GRAPHITE + (0.5 - pass * 0.13) + ')';
      ctx.lineWidth = 3.4 - pass;
      ctx.beginPath();
      for (let a = 0; a < 5.2; a += 0.12) {
        const r = 6 + a * (13 + pass * 5);
        const x = Math.cos(a0 + a) * r, y = Math.sin(a0 + a) * r;
        a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x + (Math.random() - 0.5) * 3, y + (Math.random() - 0.5) * 3);
      }
      ctx.stroke();
    }
  }
  ctx.fillStyle = GRAPHITE + '0.2)';
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, 6.29); ctx.fill();
  return new THREE.CanvasTexture(cv);
}

export function noteTexture() {
  const [cv, ctx] = sketchCtx(128, 128);
  ctx.lineWidth = 6;
  jitterLine(ctx, 62, 24, 62, 88, 2);                 // stem
  ctx.fillStyle = GRAPHITE + '0.8)';
  ctx.beginPath(); ctx.ellipse(50, 92, 15, 11, -0.4, 0, 6.29); ctx.fill(); // head
  ctx.beginPath(); ctx.moveTo(62, 24);                 // flag
  ctx.quadraticCurveTo(92, 34, 84, 60);
  ctx.lineWidth = 5;
  ctx.stroke();
  return new THREE.CanvasTexture(cv);
}

export function bubbleTexture() {
  const [cv, ctx] = sketchCtx(64, 64);
  ctx.lineWidth = 4;
  ctx.strokeStyle = GRAPHITE + '0.7)';
  ctx.beginPath(); ctx.arc(32, 32, 20, 0, 6.29); ctx.stroke();
  ctx.beginPath(); ctx.arc(25, 25, 6, 0, 6.29); ctx.stroke();
  return new THREE.CanvasTexture(cv);
}

// one notebook page with faint doodles (side: -1 left, +1 right)
export function pageTexture(side) {
  const [cv, ctx] = sketchCtx(1024, 768);
  ctx.fillStyle = '#fbf8f0';
  ctx.fillRect(0, 0, 1024, 768);
  // paper grain
  for (let i = 0; i < 5200; i++) {
    ctx.fillStyle = GRAPHITE + (Math.random() * 0.035) + ')';
    ctx.fillRect(Math.random() * 1024, Math.random() * 768, 1.5, 1.5);
  }
  // faint "previous" doodles
  ctx.lineWidth = 5;
  const cx = side < 0 ? 380 : 640;
  if (side < 0) {
    // little monster
    for (let a = 0; a < 6.28; a += 0.28) {
      const r = 150 + (Math.random() - 0.5) * 26;
      jitterLine(ctx, cx + Math.cos(a) * r * 0.9, 430 + Math.sin(a) * r * 0.78,
        cx + Math.cos(a + 0.3) * r * 0.9, 430 + Math.sin(a + 0.3) * r * 0.78, 4);
    }
    ctx.beginPath(); ctx.arc(cx - 42, 396, 14, 0, 6.29); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 40, 396, 14, 0, 6.29); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - 40, 398, 5, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 42, 398, 5, 0, 6.29); ctx.fill();
    // the long living squiggle
    ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(120, 640);
    for (let x = 120; x <= 880; x += 24) {
      ctx.quadraticCurveTo(x + 12, 640 + ((x / 24) % 2 ? 46 : -46), x + 24, 640);
    }
    ctx.stroke();
    // little fish
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(660, 170, 90, 52, 0, 0, 6.29); ctx.stroke();
    jitterLine(ctx, 748, 170, 806, 132, 3); jitterLine(ctx, 748, 170, 806, 208, 3);
    ctx.beginPath(); ctx.arc(618, 158, 7, 0, 6.29); ctx.fill();
  } else {
    // cup doodle
    ctx.lineWidth = 6;
    jitterLine(ctx, 470, 300, 500, 470, 3); jitterLine(ctx, 810, 300, 780, 470, 3);
    jitterLine(ctx, 470, 300, 810, 300, 3); jitterLine(ctx, 500, 470, 780, 470, 3);
    ctx.beginPath(); ctx.arc(832, 380, 42, -1.2, 1.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(590, 366, 8, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(690, 366, 8, 0, 6.29); ctx.fill();
    ctx.beginPath(); ctx.arc(640, 424, 17, 0, 6.29); ctx.stroke();
    // umbrella doodle
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(250, 560, 120, Math.PI, 2 * Math.PI); ctx.stroke();
    jitterLine(ctx, 250, 560, 250, 690, 3);
    for (const rx of [130, 250, 370]) jitterLine(ctx, 250, 440, rx, 560, 4);
    // paper plane doodle
    jitterLine(ctx, 620, 120, 850, 190, 4); jitterLine(ctx, 620, 120, 700, 240, 4);
    jitterLine(ctx, 700, 240, 850, 190, 4); jitterLine(ctx, 620, 120, 660, 210, 4);
  }
  // spine shading
  const g = ctx.createLinearGradient(side < 0 ? 1024 : 0, 0, side < 0 ? 940 : 84, 0);
  g.addColorStop(0, GRAPHITE + '0.14)');
  g.addColorStop(1, GRAPHITE + '0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 768);
  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 4;
  return t;
}
