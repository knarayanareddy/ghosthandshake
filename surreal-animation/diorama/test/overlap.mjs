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
const ownerOf = (o)=>{ while(o){ if(o.userData&&o.userData.char) return o.userData.char.name; o=o.parent;} return 'world'; };
const box = new THREE.Box3();
const probe = new THREE.Vector3(0.1, 0.75, 0.1);   // notebook center above pages
const probe2 = new THREE.Vector3(0.1, 1.4, 0.0);   // a bit higher
root.traverse(o => {
  if (!o.isMesh || !o.visible) return;
  box.setFromObject(o);
  if (box.containsPoint(probe) || box.containsPoint(probe2)) {
    const p2 = box.containsPoint(probe2) ? ' [also @1.4h]' : '';
    console.log('OVERLAP:', ownerOf(o).padEnd(9), o.geometry.type.padEnd(22),
      'side=' + o.material.side, (o.material.transparent ? 'transparent' : 'opaque'),
      'box=[' + box.min.toArray().map(v=>v.toFixed(2)).join(',') + ' .. ' + box.max.toArray().map(v=>v.toFixed(2)).join(',') + ']' + p2);
  }
});
// also: world positions of each character group at this frame
for (const c of world.chars) {
  const p = c.group.position;
  console.log('pos', c.name.padEnd(9), p.x.toFixed(2), p.y.toFixed(2), p.z.toFixed(2));
}
