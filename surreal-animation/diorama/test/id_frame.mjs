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
cam.lookAt(0, 0.68, 0); cam.updateMatrixWorld(true);
const vp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse);
const color = new Float32Array(W*H*3).fill(0.95), depth = new Float32Array(W*H).fill(Infinity);
const va=new THREE.Vector3(), vb=new THREE.Vector3(), vc=new THREE.Vector3();
const tri=[]; let seed=13;
const ownerOf = (o)=>{ while(o){ if(o.userData&&o.userData.char) return o.userData.char.name; o=o.parent;} return 'world'; };
const drawn = new Map();
root.traverse(o=>{
  if (!o.isMesh || !o.visible || !o.geometry?.attributes.position) return;
  if (o.material.transparent) return;
  seed = (seed*16807) % 2147483647;
  const col = [0.3+(seed%700)/700*0.65, 0.3+((seed>>3)%700)/700*0.65, 0.3+((seed>>6)%700)/700*0.65];
  const who = ownerOf(o) + ' ' + o.geometry.type + (o.material.side===THREE.BackSide ? ' HULL' : '');
  const pos=o.geometry.attributes.position, mw=o.matrixWorld;
  for (let f=0; f<pos.count; f+=3){
    va.fromBufferAttribute(pos,f).applyMatrix4(mw);
    vb.fromBufferAttribute(pos,f+1).applyMatrix4(mw);
    vc.fromBufferAttribute(pos,f+2).applyMatrix4(mw);
    tri.length=0; let ok=true;
    for (const v of [va,vb,vc]) { const p=new THREE.Vector4(v.x,v.y,v.z,1).applyMatrix4(mw).applyMatrix4(vp);
      if (p.w<0.06){ok=false;break;} tri.push([(p.x/p.w*0.5+0.5)*W,(1-(p.y/p.w*0.5+0.5))*H,p.w*(o.material.side===THREE.BackSide?0.9955:1)]); }
    if(!ok) continue;
    const x0=Math.max(0,Math.floor(Math.min(tri[0][0],tri[1][0],tri[2][0]))), x1=Math.min(W-1,Math.ceil(Math.max(tri[0][0],tri[1][0],tri[2][0])));
    const y0=Math.max(0,Math.floor(Math.min(tri[0][1],tri[1][1],tri[2][1]))), y1=Math.min(H-1,Math.ceil(Math.max(tri[0][1],tri[1][1],tri[2][1])));
    if(x1<x0||y1<y0) continue;
    const [ax,ay,aw]=tri[0],[bx,by,bw]=tri[1],[cx,cy,cw]=tri[2];
    const det=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy); if(Math.abs(det)<1e-9) continue;
    let n=0;
    for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++){
      const px=x+0.5,py=y+0.5;
      const l0=((by-cy)*(px-cx)+(cx-bx)*(py-cy))/det, l1=((cy-ay)*(px-cx)+(ax-cx)*(py-cy))/det, l2=1-l0-l1;
      if(l0<0||l1<0||l2<0) continue;
      const z=l0*aw+l1*bw+l2*cw, idx=y*W+x;
      if(z>=depth[idx]) continue;
      depth[idx]=z; color[idx*3]=col[0]; color[idx*3+1]=col[1]; color[idx*3+2]=col[2]; n++;
    }
    if (n>50) drawn.set(who, (drawn.get(who)||0)+n);
  }
});
const buf=Buffer.alloc(W*H*3);
for(let i=0;i<W*H*3;i++) buf[i]=Math.round(color[i]*255);
writeFileSync('preview/id_frame82.ppm', Buffer.concat([Buffer.from(`P6\n${W} ${H}\n255\n`), buf]));
// center-of-blob pixel -> which object?
const cx=380, cy=300, idx=cy*W+cx;
const pick = new THREE.Raycaster(); pick.setFromCamera(new THREE.Vector2(0, -(300/H-0.5)*2), cam);
const hits = pick.intersectObjects(root.children, true).slice(0,6).map(h=>ownerOf(h.object)+' '+h.object.geometry?.type+' d='+h.distance.toFixed(2));
console.log('objects under blob pixel:', JSON.stringify(hits, null, 1));
console.log('top drawn meshes:', [...drawn.entries()].sort((a,b)=>b[1]-a[1]).slice(0,12));
