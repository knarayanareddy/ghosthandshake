// headless smoke test: exercise buildEnsemble + updates + reactions without WebGL
const noop = () => {};
const grad = { addColorStop: noop };
const ctx = new Proxy({}, {
  get: (t, p) => {
    if (p === 'createLinearGradient') return () => grad;
    if (p === 'canvas') return {};
    return typeof t[p] !== 'undefined' ? t[p] : noop;
  },
  set: (t, p, v) => { t[p] = v; return true; },
});
const fakeCanvas = () => ({ width: 0, height: 0, getContext: () => ctx, style: {} });
globalThis.document = { createElement: (tag) => (tag === 'canvas' ? fakeCanvas() : {}) };

const { buildEnsemble } = await import('../src/characters.js');
const w = buildEnsemble();
console.log('characters:', w.chars.map(c => c.name).join(', '));
console.log('shadows:', w.shadows.length);

// react everything, then simulate 10s @60fps
for (const c of w.chars) { const r = c.react && c.react(); if (r) console.log(c.name, 'react ->', r); }
let t = 0, err = 0;
for (let i = 0; i < 600; i++) {
  t += 1 / 60;
  try { for (const c of w.chars) c.update(t, 1 / 60); }
  catch (e) { err++; console.error('update failed at', t.toFixed(2), c.name, e.message); break; }
}
// positions sane?
for (const c of w.chars) {
  const p = c.group.position;
  if (!isFinite(p.x + p.y + p.z)) { console.error('NON-FINITE position on', c.name); err++; }
}
console.log(err ? 'SMOKE FAIL' : 'SMOKE OK', 't=' + t.toFixed(1) + 's');
