// Debug: render the cup close-up coloring each object uniquely to ID the black cluster
import * as THREE from 'three';
import { writeFileSync } from 'fs';
const noop = () => {};
const grad = { addColorStop: noop };
const ctxStub = new Proxy({}, { get: (t,p) => p==='createLinearGradient' ? (()=>grad) : (typeof t[p]!=='undefined'?t[p]:noop), set: (t,p,v)=>{t[p]=v;return true;} });
globalThis.document = { createElement: () => ({ width:0, height:0, getContext:()=>ctxStub, style:{} }) };
const { buildEnsemble } = await import('../src/characters.js');
const w = buildEnsemble();
const root = new THREE.Group(); root.add(w.table); for (const c of w.chars) root.add(c.group);
let T = 3.2; for (let i = 0; i < 200; i++) { T += 1/60; for (const c of w.chars) c.update(T, 1/60); }
root.updateMatrixWorld(true);

// give every mesh a unique pastel-ish color keyed by its owner char
const idColors = []; let seed = 7;
const charOf = (o) => { while (o) { if (o.userData && o.userData.char) return o.userData.char.name; o = o.parent; } return 'world'; };
root.traverse(o => {
  if (!o.isMesh) return;
  seed = (seed * 16807) % 2147483647;
  const r = 0.35 + (seed % 1000) / 1000 * 0.6;
  const g = 0.35 + ((seed >> 3) % 1000) / 1000 * 0.6;
  const b = 0.35 + ((seed >> 6) % 1000) / 1000 * 0.6;
  idColors.push({ obj: o, col: [r, g, b], who: charOf(o), hull: o.material.side === THREE.BackSide });
});

const W = 800, H = 560;
const cam = new THREE.PerspectiveCamera(45, W/H, 0.05, 80);
cam.position.set(3.05, 1.05, 0.75); cam.lookAt(1.7, 0.45, -0.6); cam.updateMatrixWorld(true);
const vp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
const color = new Float32Array(W*H*3).fill(0.95), depth = new Float32Array(W*H).fill(Infinity);
const va=new THREE.Vector3(), vb=new THREE.Vector3(), vc=new THREE.Vector3();
const tri = []; const legend = new Map();
for (const { obj, col, who, hull } of idColors) {
  if (!obj.visible) continue;
  if (obj.material.transparent && obj.material.opacity < 0.5) continue;
  const pos = obj.geometry.attributes.position; if (!pos) continue;
  const c = hull ? [col[0]*0.35, col[1]*0.35, col[2]*0.35] : col;  // hulls darkened
  for (let f = 0; f < pos.count; f += 3) {
    va.fromBufferAttribute(pos,f).applyMatrix4(obj.matrixWorld);
    vb.fromBufferAttribute(pos,f+1).applyMatrix4(obj.matrixWorld);
    vc.fromBufferAttribute(pos,f+2).applyMatrix4(obj.matrixWorld);
    tri.length = 0; let ok = true;
    for (const v of [va, vb, vc]) {
      const p = new THREE.Vector4(v.x, v.y, v.z, 1).applyMatrix4(vp);
      if (p.w < 0.06) { ok = false; break; }
      tri.push([(p.x/p.w*0.5+0.5)*W, (1-(p.y/p.w*0.5+0.5))*H, p.w]);
    }
    if (!ok) continue;
    const x0=Math.max(0,Math.floor(Math.min(tri[0][0],tri[1][0],tri[2][0]))), x1=Math.min(W-1,Math.ceil(Math.max(tri[0][0],tri[1][0],tri[2][0])));
    const y0=Math.max(0,Math.floor(Math.min(tri[0][1],tri[1][1],tri[2][1]))), y1=Math.min(H-1,Math.ceil(Math.max(tri[0][1],tri[1][1],tri[2][1])));
    if (x1<x0||y1<y0) continue;
    const [ax,ay,aw]=tri[0],[bx,by,bw]=tri[1],[cx,cy,cw]=tri[2];
    const det=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy); if (Math.abs(det)<1e-9) continue;
    for (let y=y0;y<=y1;y++) for (let x=x0;x<=x1;x++) {
      const l0=((by-cy)*(x+0.5-cx)+(cx-bx)*(y+0.5-cy))/det, l1=((cy-ay)*(x+0.5-cx)+(ax-cx)*(y+0.5-cy))/det, l2=1-l0-l1;
      if (l0<0||l1<0||l2<0) continue;
      const z=l0*aw+l1*bw+l2*cw, idx=y*W+x;
      if (z>=depth[idx]) continue;
      depth[idx]=z; color[idx*3]=c[0]; color[idx*3+1]=c[1]; color[idx*3+2]=c[2];
    }
  }
  // bbox of drawn pixels ≈ rough; legend by color
  const key = col.map(v=>v.toFixed(2)).join(',');
  if (!legend.has(key)) legend.set(key, who + (hull ? ' (HULL)' : '') + ' ' + obj.geometry.type);
}
const buf = Buffer.alloc(W*H*3);
for (let i=0;i<W*H*3;i++) buf[i]=Math.max(0,Math.min(255,Math.round(color[i]*255)));
writeFileSync('preview/id_cup.ppm', Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), buf]));
console.log('legend:');
for (const [k, v] of legend) console.log('  color', k, '->', v);
