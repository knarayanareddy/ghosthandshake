// Which object owns the black blob pixels? Instrumented single-frame render.
import * as THREE from 'three';
const noop = () => {}; const grad = { addColorStop: noop };
const ctxStub = new Proxy({}, { get: (t,p) => p==='createLinearGradient' ? (()=>grad) : (typeof t[p]!=='undefined'?t[p]:noop), set: (t,p,v)=>{t[p]=v;return true;} });
globalThis.document = { createElement: () => ({ width:0, height:0, getContext:()=>ctxStub, style:{} }) };
const { buildEnsemble } = await import('../src/characters.js');
const world = buildEnsemble();
const root = new THREE.Group(); root.add(world.table); for (const c of world.chars) root.add(c.group);
let T = 2.0; const F = 82, FPS = 24;
for (let i = 0; i < F; i++) { T += 1/FPS; for (const c of world.chars) c.update(T, 1/FPS);
  if (i === 14) world.chars.find(k=>k.name==='plane')?.react();
  if (i === 34) world.chars.find(k=>k.name==='monster')?.react();
  if (i === 56) world.chars.find(k=>k.name==='fish')?.react();
  if (i === 78) world.chars.find(k=>k.name==='cup')?.react(); }
root.updateMatrixWorld(true);
const W = 760, H = 428, k = F/168;
const az = (-55 + 110*k) * Math.PI/180, R = 6.4 - Math.sin(k*Math.PI)*0.9;
const cam = new THREE.PerspectiveCamera(45, W/H, 0.05, 80);
cam.position.set(Math.sin(az)*R, 3.25 - Math.sin(k*Math.PI)*0.6, Math.cos(az)*R);
cam.lookAt(0, 0.55, 0); cam.updateMatrixWorld(true);
const vp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
const LIGHT = new THREE.Vector3(0.55, 0.9, 0.42).normalize();
const depth = new Float32Array(W*H).fill(Infinity);
const label = new Int16Array(W*H).fill(-1);
const shadeV = new Float32Array(W*H);
const names = []; const index = new Map();
const va=new THREE.Vector3(), vb=new THREE.Vector3(), vc=new THREE.Vector3();
const e1=new THREE.Vector3(), e2=new THREE.Vector3(), n=new THREE.Vector3(), cen=new THREE.Vector3();
const tri=[];
root.traverse(o=>{
  if (!o.isMesh || !o.visible || !o.geometry?.attributes.position) return;
  if (o.material.transparent) return;
  const mat = o.material;
  const isHull = mat.side === THREE.BackSide;
  let tint={r:1,g:1,b:1}, amb=0.4, key=0.6, flat=0, basic=false, bc;
  if (mat.isMeshBasicMaterial) { basic=true; bc=mat.color; }
  else { const u=mat.uniforms; amb=u.uAmbient?u.uAmbient.value:amb; key=u.uKey?u.uKey.value:key; flat=u.uFlat?u.uFlat.value:0; if(u.uTint) tint=u.uTint.value; }
  const key0 = names.length; names.push(o.geometry.type + '/' + (isHull?'HULL':basic?'basic':'hatch') + (basic ? '#' + bc.getHexString() : ''));
  const pos=o.geometry.attributes.position, mw=o.matrixWorld;
  for (let f=0; f<pos.count; f+=3){
    va.fromBufferAttribute(pos,f).applyMatrix4(mw);
    vb.fromBufferAttribute(pos,f+1).applyMatrix4(mw);
    vc.fromBufferAttribute(pos,f+2).applyMatrix4(mw);
    e1.subVectors(vb,va); e2.subVectors(vc,va);
    n.crossVectors(e1,e2).normalize();
    cen.copy(va).add(vb).add(vc).multiplyScalar(1/3).sub(cam.position);
    const front = n.dot(cen) < 0;
    if (isHull ? !front : false) continue;
    let v;
    if (basic) v = [bc.r*0.30+0.16, bc.g*0.30+0.16, bc.b*0.30+0.16];
    else { const nl=Math.abs(n.dot(LIGHT)); const light = flat>0.5 ? 0.94 : Math.min(1, amb+key*nl); const val=0.97-(1-light)*0.72; v=[val*tint.r,val*tint.g,val*tint.b]; }
    tri.length=0; let ok=true;
    for (const vv of [va,vb,vc]) { const p=new THREE.Vector4(vv.x,vv.y,vv.z,1).applyMatrix4(mw).applyMatrix4(vp);
      if (p.w<0.06){ok=false;break;} tri.push([(p.x/p.w*0.5+0.5)*W,(1-(p.y/p.w*0.5+0.5))*H,p.w*(isHull?0.9955:1)]); }
    if(!ok) continue;
    const x0=Math.max(0,Math.floor(Math.min(tri[0][0],tri[1][0],tri[2][0]))), x1=Math.min(W-1,Math.ceil(Math.max(tri[0][0],tri[1][0],tri[2][0])));
    const y0=Math.max(0,Math.floor(Math.min(tri[0][1],tri[1][1],tri[2][1]))), y1=Math.min(H-1,Math.ceil(Math.max(tri[0][1],tri[1][1],tri[2][1])));
    if(x1<x0||y1<y0) continue;
    const [ax,ay,aw]=tri[0],[bx,by,bw]=tri[1],[cx,cy,cw]=tri[2];
    const det=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy); if(Math.abs(det)<1e-9) continue;
    for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
      const px=x+0.5,py=y+0.5;
      const l0=((by-cy)*(px-cx)+(cx-bx)*(py-cy))/det, l1=((cy-ay)*(px-cx)+(ax-cx)*(py-cy))/det, l2=1-l0-l1;
      if(l0<0||l1<0||l2<0) continue;
      const z=l0*aw+l1*bw+l2*cw, idx=y*W+x;
      if(z>=depth[idx]) continue;
      depth[idx]=z; label[idx]=key0; shadeV[idx]=(v[0]+v[1]+v[2])/3;
    }
  }
});
// sample the blob region
const counts = {};
for (let y=225; y<=320; y++) for (let x=320; x<=440; x++) {
  const l = label[y*W+x];
  if (l < 0) continue;
  counts[l] = (counts[l]||0)+1;
}
console.log('blob region object histogram:');
const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,8);
for (const [l,c] of sorted) console.log('  ', names[+l], 'x', c);
// what is the darkest object covering >500 px there?
let darkest=null;
for (const [l,c] of sorted) {
  let s=0,n=0;
  for (let y=225;y<=320;y++) for (let x=320;x<=440;x++) if (label[y*W+x]===+l){s+=shadeV[y*W+x];n++;}
  const avg=s/n;
  console.log('  avg shade', names[+l], '=', avg.toFixed(3));
  if (avg<0.35 && c>500) darkest=names[+l];
}
console.log('darkest culprit:', darkest);
