import * as THREE from 'three';
const noop = () => {};
const grad = { addColorStop: noop };
const ctxStub = new Proxy({}, { get: (t,p) => p==='createLinearGradient' ? (()=>grad) : (typeof t[p]!=='undefined'?t[p]:noop), set: (t,p,v)=>{t[p]=v;return true;} });
globalThis.document = { createElement: () => ({ width:0, height:0, getContext:()=>ctxStub, style:{} }) };
const { buildEnsemble } = await import('../src/characters.js');
const w = buildEnsemble();
const root = new THREE.Group(); root.add(w.table); for (const c of w.chars) root.add(c.group);
root.updateMatrixWorld(true);
const box = new THREE.Box3(), cen = new THREE.Vector3();
root.traverse(o => {
  if (!o.isMesh || !o.geometry) return;
  box.setFromObject(o); box.getCenter(cen);
  if (Math.hypot(cen.x-1.7, cen.z+0.6) < 0.95 && cen.y < 1.2) {
    const m = o.material;
    console.log(o.type.padEnd(12), 'cen', cen.x.toFixed(2), cen.y.toFixed(2), cen.z.toFixed(2),
      '| basic:', !!m.isMeshBasicMaterial, '| transparent:', !!m.transparent, 'op:', m.opacity ?? '',
      '| color:', m.color ? m.color.getHexString() : '-', '| side:', m.side, '| visible:', o.visible,
      m.side === THREE.BackSide ? '<< HULL' : '');
  }
});
