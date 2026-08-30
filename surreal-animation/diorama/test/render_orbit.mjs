// Software-render animated preview of the diorama (no WebGL in sandbox).
// v2: hull depth-bias (clean ink rims), line-ink pass with alpha blending,
// texture-dependent transparent quads skipped. Renders an orbiting camera
// turntable with character reactions -> preview/frames/*.ppm
import * as THREE from 'three';
import { writeFileSync, mkdirSync } from 'fs';

/* ---- document stub for canvas-texture generation ---- */
const noop = () => {};
const grad = { addColorStop: noop };
const ctxStub = new Proxy({}, {
  get: (t, p) => (p === 'createLinearGradient') ? (() => grad) : (typeof t[p] !== 'undefined' ? t[p] : noop),
  set: (t, p, v) => { t[p] = v; return true; },
});
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctxStub, style: {} }) };

const { buildEnsemble } = await import('../src/characters.js');
const world = buildEnsemble();
const root = new THREE.Group();
root.add(world.table);
for (const c of world.chars) root.add(c.group);

const W = 760, H = 428, FRAMES = 168, FPS = 24;
const LIGHT = new THREE.Vector3(0.55, 0.9, 0.42).normalize();
mkdirSync('preview/frames', { recursive: true });

const cam = new THREE.PerspectiveCamera(45, W / H, 0.05, 80);

function renderFrame(buf, vp) {
  const color = new Float32Array(W * H * 3).fill(0.955);
  const depth = new Float32Array(W * H).fill(Infinity);
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), n = new THREE.Vector3(), cen = new THREE.Vector3();
  const tri = [];

  // ---- triangle pass ----
  root.traverse((o) => {
    if (!o.isMesh || !o.visible || !o.geometry || !o.geometry.attributes.position) return;
    const mat = o.material;
    if (mat.transparent && !(mat.isMeshBasicMaterial && mat.depthWrite !== false)) return; // decals, sprites, fur shells: need real alpha blending
    const flatPaper = mat.transparent && mat.isMeshBasicMaterial;   // pages: flat paper tone
    const isHull = mat.side === THREE.BackSide;
    let shade, tint = { r: 1, g: 1, b: 1 }, amb = 0.4, key = 0.6, flat = 0;
    if (isHull) shade = [0.17, 0.16, 0.14];
    else if (flatPaper) shade = [0.955, 0.945, 0.925];
    else if (mat.isMeshBasicMaterial) {
      const c = mat.color;
      shade = [c.r * 0.52 + 0.40, c.g * 0.52 + 0.40, c.b * 0.52 + 0.40];
    } else {
      const u = mat.uniforms;
      amb = u.uAmbient ? u.uAmbient.value : amb;
      key = u.uKey ? u.uKey.value : key;
      flat = u.uFlat ? u.uFlat.value : 0;
      if (u.uTint) tint = u.uTint.value;
      shade = null;                                  // per-face below
    }
    const pos = o.geometry.attributes.position;
    const mw = o.matrixWorld;
    for (let f = 0; f < pos.count; f += 3) {
      va.fromBufferAttribute(pos, f).applyMatrix4(mw);
      vb.fromBufferAttribute(pos, f + 1).applyMatrix4(mw);
      vc.fromBufferAttribute(pos, f + 2).applyMatrix4(mw);
      e1.subVectors(vb, va); e2.subVectors(vc, va);
      n.crossVectors(e1, e2);
      const len = n.length();
      if (len < 1e-12) continue;
      n.multiplyScalar(1 / len);
      cen.copy(va).add(vb).add(vc).multiplyScalar(1 / 3);
      cen.sub(cam.position);
      const front = n.dot(cen) < 0;
      if (isHull ? !front : false) continue;         // hulls render back faces only; solids render both
      let s = shade;
      if (!s) {
        const nl = Math.abs(n.dot(LIGHT));
        const light = flat > 0.5 ? 0.94 : Math.min(1, amb + key * nl);
        const v = Math.max(0.40, 0.97 - (1 - light) * 0.60);
        s = [Math.min(1, v * (0.55 + tint.r * 0.45)), Math.min(1, v * (0.55 + tint.g * 0.45)), Math.min(1, v * (0.55 + tint.b * 0.45))];
      }
      tri.length = 0; let ok = true;
      for (const v of [va, vb, vc]) {
        const p = new THREE.Vector4(v.x, v.y, v.z, 1).applyMatrix4(vp);
        if (p.w < 0.06) { ok = false; break; }
        tri.push([(p.x / p.w * 0.5 + 0.5) * W, (1 - (p.y / p.w * 0.5 + 0.5)) * H, p.w * (isHull ? 1.006 : 1)]);
      }
      if (!ok) continue;
      const x0 = Math.max(0, Math.floor(Math.min(tri[0][0], tri[1][0], tri[2][0])));
      const x1 = Math.min(W - 1, Math.ceil(Math.max(tri[0][0], tri[1][0], tri[2][0])));
      const y0 = Math.max(0, Math.floor(Math.min(tri[0][1], tri[1][1], tri[2][1])));
      const y1 = Math.min(H - 1, Math.ceil(Math.max(tri[0][1], tri[1][1], tri[2][1])));
      if (x1 < x0 || y1 < y0) continue;
      const [ax, ay, aw] = tri[0], [bx, by, bw] = tri[1], [cx, cy, cw] = tri[2];
      const det = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
      if (Math.abs(det) < 1e-9) continue;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5;
          const l0 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / det;
          const l1 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / det;
          const l2 = 1 - l0 - l1;
          if (l0 < 0 || l1 < 0 || l2 < 0) continue;
          const z = l0 * aw + l1 * bw + l2 * cw;
          const idx = y * W + x;
          if (z >= depth[idx]) continue;
          depth[idx] = z;
          color[idx * 3] = s[0]; color[idx * 3 + 1] = s[1]; color[idx * 3 + 2] = s[2];
        }
      }
    }
  });

  // ---- line-ink pass (blended, depth-tested with tolerance) ----
  const plot = (x, y, r, g, b, a) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const idx = y * W + x;
    if (depth[idx] === Infinity) return;
    color[idx * 3] = color[idx * 3] * (1 - a) + r * a;
    color[idx * 3 + 1] = color[idx * 3 + 1] * (1 - a) + g * a;
    color[idx * 3 + 2] = color[idx * 3 + 2] * (1 - a) + b * a;
  };
  root.traverse((o) => {
    if (!o.isLineSegments || !o.visible || !o.geometry || !o.geometry.attributes.position) return;
    const mat = o.material;
    if (mat.vertexColors) return;                   // plane trail: needs blending
    const lc = mat.color ? [mat.color.r * 0.45, mat.color.g * 0.42, mat.color.b * 0.38] : [0.2, 0.19, 0.17];
    const la = mat.opacity !== undefined ? Math.min(1, mat.opacity * 1.15) : 0.8;
    const pos = o.geometry.attributes.position;
    const mw = o.matrixWorld;
    const hasVC = !!o.geometry.attributes.color;
    const proj = (i) => {
      const p = new THREE.Vector4(pos.getX(i), pos.getY(i), pos.getZ(i), 1).applyMatrix4(mw).applyMatrix4(vp);
      if (p.w < 0.06) return null;
      return [(p.x / p.w * 0.5 + 0.5) * W, (1 - (p.y / p.w * 0.5 + 0.5)) * H, p.w * 1.002];
    };
    for (let i = 0; i < pos.count - 1; i += 2) {
      const A = proj(i), B = proj(i + 1);
      if (!A || !B) continue;
      let [x0, y0, z0] = A, [x1, y1, z1] = B;
      const steps = Math.min(500, Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))));
      for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t);
        const z = z0 + (z1 - z0) * t;
        const idx = y * W + x;
        if (idx < 0 || idx >= W * H) continue;
        if (z > depth[idx] * 1.004) continue;
        let r = lc[0], g = lc[1], b = lc[2];
        if (hasVC) {
          r = pos.getAttribute ? o.geometry.attributes.color.getX(i) * 0.5 : r;
        }
        plot(x, y, r, g, b, la);
      }
    }
  });

  // paper grain
  for (let i = 0; i < W * H; i += 2) {
    const g = ((i * 2654435761) % 89) / 89;
    color[i * 3] -= 0.018 * g; color[i * 3 + 1] -= 0.016 * g; color[i * 3 + 2] -= 0.012 * g;
  }
  for (let i = 0; i < W * H * 3; i++) buf[i] = Math.max(0, Math.min(255, Math.round(color[i] * 255)));
}

const header = Buffer.from(`P6\n${W} ${H}\n255\n`);
const buf = Buffer.alloc(W * H * 3);
const triggers = {
  14: ['plane'], 34: ['monster'], 56: ['fish'], 78: ['cup'], 98: ['umbrella'], 118: ['bird'], 138: 'party',
};
let T = 2.0;
for (let f = 0; f < FRAMES; f++) {
  const k = f / FRAMES;
  const az = (-55 + 110 * k) * Math.PI / 180;          // gentle sweep around +z
  const R = 6.4 - Math.sin(k * Math.PI) * 0.9;         // dolly in mid-sweep
  cam.position.set(Math.sin(az) * R, 3.25 - Math.sin(k * Math.PI) * 0.6, Math.cos(az) * R);
  cam.lookAt(0, 0.55, 0);
  cam.updateMatrixWorld(true);
  const vp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);

  T += 1 / FPS;
  for (const c of world.chars) c.update(T, 1 / FPS);
  root.updateMatrixWorld(true);          // CRITICAL: software path has no renderer to do this
  const trg = triggers[f];
  if (trg === 'party') for (const c of world.chars) if (c.react) c.react();
  else if (trg) for (const nm of trg) { const c = world.chars.find(k => k.name === nm); if (c && c.react) c.react(); }

  renderFrame(buf, vp);
  writeFileSync(`preview/frames/f${String(f).padStart(4, '0')}.ppm`, Buffer.concat([header, buf]));
  if (f % 24 === 0) console.log('frame', f);
}
console.log('ORBIT RENDER DONE');
