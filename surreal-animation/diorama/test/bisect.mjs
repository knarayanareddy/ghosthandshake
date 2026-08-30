// One-frame A/B: which renderer subsystem paints the blob?
import * as THREE from 'three';
import { writeFileSync } from 'fs';
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

function render(buf, { lines = true, hulls = true, monster = true } = {}) {
  const color = new Float32Array(W*H*3).fill(0.955);
  const depth = new Float32Array(W*H).fill(Infinity);
  const va=new THREE.Vector3(), vb=new THREE.Vector3(), vc=new THREE.Vector3();
  const e1=new THREE.Vector3(), e2=new THREE.Vector3(), n=new THREE.Vector3(), cen=new THREE.Vector3();
  const tri=[];
  root.traverse(o=>{
    if (!o.isMesh || !o.visible || !o.geometry?.attributes.position) return;
    const mat = o.material;
    if (mat.transparent && !(mat.isMeshBasicMaterial && mat.depthWrite !== false)) return;
    const isHull = mat.side === THREE.BackSide;
    if (isHull && !hulls) return;
    const owner = (()=>{ let p=o; while(p){ if(p.userData&&p.userData.char) return p.userData.char.name; p=p.parent;} return 'world'; })();
    if (owner === 'monster' && !monster) return;
    const flatPaper = mat.transparent && mat.isMeshBasicMaterial;
    let shade, tint={r:1,g:1,b:1}, amb=0.4, key=0.6, flat=0;
    if (isHull) shade=[0.17,0.16,0.14];
    else if (flatPaper) shade=[0.955,0.945,0.925];
    else if (mat.isMeshBasicMaterial) { const c=mat.color; shade=[c.r*0.52+0.40, c.g*0.52+0.40, c.b*0.52+0.40]; }
    else { const u=mat.uniforms; amb=u.uAmbient?u.uAmbient.value:amb; key=u.uKey?u.uKey.value:key; flat=u.uFlat?u.uFlat.value:0; if(u.uTint) tint=u.uTint.value; shade=null; }
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
      let s = shade;
      if (!s) { const nl=Math.abs(n.dot(LIGHT)); const light = flat>0.5?0.94:Math.min(1, amb+key*nl);
        const v=Math.max(0.40, 0.97-(1-light)*0.60);
        s=[Math.min(1,v*(0.55+tint.r*0.45)), Math.min(1,v*(0.55+tint.g*0.45)), Math.min(1,v*(0.55+tint.b*0.45))]; }
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
        depth[idx]=z; color[idx*3]=s[0]; color[idx*3+1]=s[1]; color[idx*3+2]=s[2];
      }
    }
  });
  if (lines) {
    const plot=(x,y,r,g,b,a)=>{ if(x<0||y<0||x>=W||y>=H) return; const idx=y*W+x; if(depth[idx]===Infinity) return;
      color[idx*3]=color[idx*3]*(1-a)+r*a; color[idx*3+1]=color[idx*3+1]*(1-a)+g*a; color[idx*3+2]=color[idx*3+2]*(1-a)+b*a; };
    root.traverse(o=>{
      if (!o.isLineSegments || !o.visible || !o.geometry?.attributes.position) return;
      const mat=o.material;
      if (mat.vertexColors) return;
      const lc = mat.color ? [mat.color.r*0.45, mat.color.g*0.42, mat.color.b*0.38] : [0.2,0.19,0.17];
      const la = mat.opacity !== undefined ? Math.min(1, mat.opacity*1.15) : 0.8;
      const pos=o.geometry.attributes.position, mw=o.matrixWorld;
      const proj=(i)=>{ const p=new THREE.Vector4(pos.getX(i),pos.getY(i),pos.getZ(i),1).applyMatrix4(mw).applyMatrix4(vp);
        if (p.w<0.06) return null; return [(p.x/p.w*0.5+0.5)*W,(1-(p.y/p.w*0.5+0.5))*H,p.w*0.995]; };
      for (let i=0;i<pos.count-1;i+=2){
        const A=proj(i), B=proj(i+1); if(!A||!B) continue;
        let [x0,y0,z0]=A,[x1,y1,z1]=B;
        const steps=Math.min(500,Math.max(1,Math.ceil(Math.hypot(x1-x0,y1-y0))));
        for(let kk=0;kk<=steps;kk++){ const t=kk/steps; const x=Math.round(x0+(x1-x0)*t), y=Math.round(y0+(y1-y0)*t);
          const z=z0+(z1-z0)*t, idx=y*W+x; if(idx<0||idx>=W*H) continue; if(z>depth[idx]*1.004) continue;
          plot(x,y,lc[0],lc[1],lc[2],la); }
      }
    });
  }
  for (let i=0;i<W*H*3;i++) buf[i]=Math.max(0,Math.min(255,Math.round(color[i]*255)));
}

const header = Buffer.from(`P6\n${W} ${H}\n255\n`);
const buf = Buffer.alloc(W*H*3);
render(buf, {}); writeFileSync('preview/bisect_all.ppm', Buffer.concat([header, buf]));
render(buf, { lines: false }); writeFileSync('preview/bisect_nolines.ppm', Buffer.concat([header, buf]));
render(buf, { hulls: false }); writeFileSync('preview/bisect_nohulls.ppm', Buffer.concat([header, buf]));
render(buf, { monster: false }); writeFileSync('preview/bisect_nomonster.ppm', Buffer.concat([header, buf]));
console.log('bisect frames written');
