// Software-render QC preview: loads the REAL ensemble code, updates it,
// and rasterizes frames with the same lighting uniforms to PNGs.
// (The sandbox has no WebGL; this approximates the hatch shader's tone math.)
import * as THREE from 'three';

/* ---- document stub for canvas-texture generation ---- */
const noop = () => {};
const grad = { addColorStop: noop };
const ctxStub = new Proxy({}, {
  get: (t, p) => (p === 'createLinearGradient') ? (() => grad) : (typeof t[p] !== 'undefined' ? t[p] : noop),
  set: (t, p, v) => { t[p] = v; return true; },
});
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctxStub, style: {} }) };

const { buildEnsemble } = await import('../src/characters.js');

/* ---- build + animate the real ensemble ---- */
const world = buildEnsemble();
const root = new THREE.Group();
root.add(world.table);
for (const c of world.chars) root.add(c.group);
let T = 3.2;
for (let i = 0; i < 200; i++) { T += 1 / 60; for (const c of world.chars) c.update(T, 1 / 60); }
root.updateMatrixWorld(true);

const W = 960, H = 640;
const LIGHT = new THREE.Vector3(0.55, 0.9, 0.42).normalize();
const VIEWS = [
  { name: 'view1_stage',   cam: [0, 2.7, 5.6],      tgt: [0, 0.75, 0] },
  { name: 'view2_monster', cam: [-2.95, 1.25, 2.1], tgt: [-1.55, 0.7, 0.3] },
  { name: 'view3_fish',    cam: [2.75, 1.15, 2.35], tgt: [1.5, 0.6, 0.9] },
  { name: 'view4_cup',     cam: [3.05, 1.05, 0.75], tgt: [1.7, 0.45, -0.6] },
  { name: 'view5_plane',   cam: [1.5, 3.0, 2.8],    tgt: [0, 1.9, -0.35] },
  { name: 'view6_umbrella',cam: [-3.1, 1.5, 0.55],  tgt: [-1.7, 1.05, -0.85] },
];

/* ---- tiny z-buffer rasterizer ---- */
function render(view) {
  const cam = new THREE.PerspectiveCamera(45, W / H, 0.05, 80);
  cam.position.set(...view.cam);
  cam.lookAt(...view.tgt);
  cam.updateMatrixWorld(true);
  const vp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);

  const color = new Float32Array(W * H * 3).fill(0.93);   // paper bg
  const colorSet = new Uint8Array(W * H);
  const depth = new Float32Array(W * H).fill(Infinity);

  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  const n = new THREE.Vector3(), cen = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
  const tri = [];

  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.attributes.position) return;
    const mat = o.material;
    const isHull = mat.side === THREE.BackSide;
    let base = [0.24, 0.22, 0.19], toneMode = 'hatch';
    if (isHull) toneMode = 'ink';
    if (mat.isMeshBasicMaterial) {
      toneMode = 'flat';
      const c = mat.color;
      base = [c.r * 0.35 + 0.18, c.g * 0.35 + 0.18, c.b * 0.35 + 0.18];
    }
    const u = mat.uniforms;
    const amb = u && u.uAmbient ? u.uAmbient.value : 0.4;
    const key = u && u.uKey ? u.uKey.value : 0.6;
    const flat = u && u.uFlat ? u.uFlat.value : 0;
    const tint = u && u.uTint ? u.uTint.value : { r: 1, g: 1, b: 1 };

    const pos = o.geometry.attributes.position;
    const mw = o.matrixWorld;
    for (let f = 0; f < pos.count; f += 3) {
      va.fromBufferAttribute(pos, f).applyMatrix4(mw);
      vb.fromBufferAttribute(pos, f + 1).applyMatrix4(mw);
      vc.fromBufferAttribute(pos, f + 2).applyMatrix4(mw);
      // face normal (world)
      e1.subVectors(vb, va); e2.subVectors(vc, va);
      n.crossVectors(e1, e2).normalize();
      cen.copy(va).add(vb).add(vc).multiplyScalar(1 / 3);
      const facing = n.dot(e1.clone().cross(e2)) >= 0 ? 1 : -1;
      const toCam = cen.sub(cam.position);
      const front = (n.dot(toCam) * facing) < 0;           // toward camera
      if (isHull ? front : !front) continue;               // hulls show backs only
      // shade
      let shade;
      if (toneMode === 'ink') shade = [0.16, 0.15, 0.13];
      else if (toneMode === 'flat') shade = base;
      else {
        const nl = Math.max(0, n.dot(LIGHT) * facing);
        const light = flat > 0.5 ? 0.94 : Math.min(1, amb + key * nl);
        const s = 0.97 - (1 - light) * 0.72;               // tone -> value
        shade = [s * tint.r, s * tint.g, s * tint.b];
      }
      // project
      tri.length = 0;
      let ok = true;
      for (const v of [va, vb, vc]) {
        const p = new THREE.Vector4(v.x, v.y, v.z, 1).applyMatrix4(vp);
        if (p.w < 0.06) { ok = false; break; }
        tri.push([(p.x / p.w * 0.5 + 0.5) * W, (1 - (p.y / p.w * 0.5 + 0.5)) * H, p.w]);
      }
      if (!ok) continue;
      // rasterize (bbox + barycentric, 1/w as depth)
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
          const l0 = ((by - cy) * (x + 0.5 - cx) + (cx - bx) * (y + 0.5 - cy)) / det;
          const l1 = ((cy - ay) * (x + 0.5 - cx) + (ax - cx) * (y + 0.5 - cy)) / det;
          const l2 = 1 - l0 - l1;
          if (l0 < 0 || l1 < 0 || l2 < 0) continue;
          const z = l0 * aw + l1 * bw + l2 * cw;
          const idx = y * W + x;
          if (z >= depth[idx]) continue;
          depth[idx] = z;
          color[idx * 3] = shade[0]; color[idx * 3 + 1] = shade[1]; color[idx * 3 + 2] = shade[2];
          colorSet[idx] = 1;
        }
      }
    }
  });

  // hatched paper where empty + grain-ish dither
  for (let i = 0; i < W * H; i++) {
    if (!colorSet[i]) {
      const g = 0.93 + ((i * 2654435761 % 97) / 97 - 0.5) * 0.05;
      color[i * 3] = color[i * 3 + 1] = color[i * 3 + 2] = g;
    }
  }
  // ppm out
  const buf = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H * 3; i++) buf[i] = Math.max(0, Math.min(255, Math.round(color[i] * 255)));
  return `P6\n${W} ${H}\n255\n` + buf.toString('binary');
}

import { writeFileSync } from 'fs';
for (const v of VIEWS) {
  writeFileSync(`preview/${v.name}.ppm`, Buffer.from(render(v), 'binary'));
  console.log('rendered', v.name);
}
console.log('DONE');
