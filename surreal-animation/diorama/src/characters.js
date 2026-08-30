// The ensemble: six pencil-sketch characters + notebook + pencil prop.
// Every builder returns { name, group, update(t,dt), react(), focus }.
import * as THREE from 'three';
import {
  hatchMaterial, addOutline, shadowMesh,
  cupFaceTexture, whirlTexture, noteTexture, bubbleTexture, pageTexture, addLineOutline,
} from './hatch.js';

const DARK = 0x2f2b25;

/* ---------- tiny helpers ---------- */

function sketched(geo, { outline = 0.012, boil, tint, ambient, key, flat } = {}) {
  const m = new THREE.Mesh(geo, hatchMaterial({ tint, ambient, key, flat, boil }));
  if (outline > 0) addOutline(m, { thickness: outline });
  return m;
}

function basicMat(color, opts = {}) {
  return new THREE.MeshBasicMaterial({ color, ...opts });
}

function googly(r = 0.085, outline = 0.012) {
  const g = new THREE.Group();
  const white = sketched(new THREE.SphereGeometry(r, 20, 14), { outline, flat: 0.85, ambient: 0.5, key: 0.5 });
  g.add(white);
  const pupil = new THREE.Mesh(new THREE.SphereGeometry(r * 0.42, 12, 10), basicMat(DARK));
  pupil.position.set(0, 0, r * 0.82);
  g.add(pupil);
  const glint = new THREE.Mesh(new THREE.SphereGeometry(r * 0.14, 8, 6), basicMat(0xffffff));
  glint.position.set(r * 0.18, r * 0.2, r * 0.95);
  g.add(glint);
  return g;
}

function placed(parent, obj, x, y, z) { obj.position.set(x, y, z); parent.add(obj); return obj; }

/* ================= MONSTER ================= */

function buildMonster() {
  const g = new THREE.Group();
  const S = { roar: 0, blink: 0, nextBlink: 2.4 };

  // fuzzy displaced body
  const bodyGeo = new THREE.IcosahedronGeometry(0.52, 3);
  const pos = bodyGeo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const rnd = Math.abs(Math.sin(v.x * 12.9 + v.y * 7.7 + v.z * 17.3) * 43758.5453 % 1);
    const spike = 1 + 0.38 * Math.pow(rnd, 3) + 0.06 * rnd;
    v.normalize().multiplyScalar(0.52 * spike);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  bodyGeo.computeVertexNormals();
  const body = sketched(bodyGeo, { outline: 0.013, boil: 0.012 });
  placed(g, body, 0, 0.62, 0);
  // extra fur shells (transparent inverted hulls)
  addOutline(body, { thickness: 0.028, opacity: 0.28, boil: 0.03 });
  addOutline(body, { thickness: 0.055, opacity: 0.13, boil: 0.045 });

  // face
  const face = new THREE.Group();
  placed(g, face, 0, 0.78, 0.42);
  const eyeL = placed(face, googly(0.105, 0.014), -0.21, 0.16, 0.34);
  const eyeR = placed(face, googly(0.105, 0.014), 0.21, 0.16, 0.34);
  const mouth = new THREE.Group();
  placed(face, mouth, 0, -0.24, 0.38);
  const cave = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), basicMat(0x241f1a));
  cave.scale.set(1.15, 0.9, 0.55);
  mouth.add(cave);
  const toothGeo = new THREE.ConeGeometry(0.055, 0.13, 8);
  for (const [tx, ty, rz] of [[-0.22, 0.15, 0.3], [-0.07, 0.2, 0.05], [0.09, 0.2, -0.05], [0.23, 0.14, -0.3]]) {
    const tooth = new THREE.Mesh(toothGeo, basicMat(0xf3efe2));
    tooth.position.set(tx, ty, 0.14);
    tooth.rotation.z = rz;
    mouth.add(tooth);
  }

  // limbs
  const limbMat = hatchMaterial({ boil: 0.008 });
  const armGeo = new THREE.CapsuleGeometry(0.055, 0.34, 6, 12);
  const armL = placed(g, new THREE.Mesh(armGeo, limbMat), -0.52, 0.72, 0.12);
  const armR = placed(g, new THREE.Mesh(armGeo, limbMat), 0.52, 0.72, 0.12);
  armL.rotation.z = 0.9; armR.rotation.z = -0.9;
  addLineOutline(armL, { opacity: 0.7 }); addLineOutline(armR, { opacity: 0.7 });
  const legGeo = new THREE.CapsuleGeometry(0.07, 0.16, 6, 12);
  const legL = placed(g, new THREE.Mesh(legGeo, limbMat), -0.2, 0.14, 0.05);
  const legR = placed(g, new THREE.Mesh(legGeo, limbMat), 0.2, 0.14, 0.05);
  addLineOutline(legL, { opacity: 0.7 }); addLineOutline(legR, { opacity: 0.7 });

  g.userData.shadow = { sx: 1.15, sz: 0.85 };

  return {
    name: 'monster', group: g, restY: 0,
    focus: { cam: [-2.95, 1.25, 2.1], tgt: [-1.55, 0.7, 0.3] },
    update(t, dt) {
      S.nextBlink -= dt;
      if (S.nextBlink < 0) { S.blink = 0.18; S.nextBlink = 2.2 + Math.random() * 2.4; }
      if (S.blink > 0) {
        S.blink -= dt;
        const sq = Math.max(0.08, Math.abs(Math.sin((0.18 - S.blink) / 0.18 * Math.PI)));
        eyeL.scale.y = eyeR.scale.y = sq;
      } else eyeL.scale.y = eyeR.scale.y = 1;
      const br = 1 + Math.sin(t * 2.1) * 0.03;
      const inv = 1 / Math.sqrt(br);
      body.scale.set(inv, br, inv);
      if (S.roar <= 0) {
        armL.rotation.z = 0.9 + Math.sin(t * 2.6) * 0.16;
        armR.rotation.z = -0.9 - Math.sin(t * 2.6 + 1) * 0.16;
        mouth.scale.setScalar(1);
        g.position.y = 0;
      } else {
        S.roar = Math.max(0, S.roar - dt / 1.1);
        const r = Math.sin(Math.min(1, 1 - S.roar) * Math.PI);
        mouth.scale.setScalar(1 + r * 0.55);
        face.position.y = 0.78 + r * 0.06;
        g.position.y = r * 0.22;
        armL.rotation.z = 0.9 + r * 0.9;
        armR.rotation.z = -0.9 - r * 0.9;
      }
    },
    react() { S.roar = 1; },
  };
}

/* ================= FISH ================= */

function buildFish() {
  const g = new THREE.Group();
  const S = { jump: -1, splash: -1 };
  const HOME = { x: 1.5, y: 0.62, z: 0.9 };

  const pts = [];
  const prof = [[0.02, -0.36], [0.10, -0.26], [0.17, -0.10], [0.20, 0.06], [0.17, 0.20], [0.10, 0.30], [0.02, 0.36]];
  for (const [r, y] of prof) pts.push(new THREE.Vector2(r, y));
  const bodyGeo = new THREE.LatheGeometry(pts, 22);
  const body = sketched(bodyGeo, { outline: 0.012, boil: 0.005 });
  body.rotation.z = Math.PI / 2;           // lie along x, nose at -x
  const holder = new THREE.Group();        // yaw pivot
  holder.add(body);
  g.add(holder);

  const tail = new THREE.Group();
  placed(holder, tail, 0.36, 0, 0);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.22, 10), hatchMaterial({ boil: 0.006 }));
  fin.scale.set(1, 1, 0.22);
  fin.rotation.z = -Math.PI / 2;
  fin.position.set(0.1, 0, 0);
  tail.add(fin);
  addLineOutline(fin, { angle: 40, opacity: 0.8 });
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 8), hatchMaterial({ boil: 0.006 }));
  dorsal.scale.set(0.25, 1, 1);
  dorsal.position.set(-0.02, 0.24, 0);
  holder.add(dorsal);
  addLineOutline(dorsal, { angle: 40, opacity: 0.8 });

  const eyeL = placed(holder, googly(0.07, 0.010), -0.16, 0.07, 0.14);
  const eyeR = placed(holder, googly(0.07, 0.010), -0.16, 0.07, -0.14);
  eyeL.rotation.y = 0.5; eyeR.rotation.y = -0.5;

  const bubTex = bubbleTexture();
  const bubbles = [];
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: bubTex, transparent: true, opacity: 0.7, depthWrite: false }));
    b.scale.setScalar(0.07 + i * 0.02);
    b.userData.off = i * 1.1;
    g.add(b); bubbles.push(b);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.014, 8, 32), basicMat(DARK, { transparent: true, opacity: 0 }));
  ring.rotation.x = Math.PI / 2;
  g.add(ring);

  g.userData.shadow = { sx: 0.55, sz: 0.45 };

  return {
    name: 'fish', group: g, restY: 0.62,
    focus: { cam: [2.75, 1.15, 2.35], tgt: [1.5, 0.6, 0.9] },
    update(t, dt) {
      holder.rotation.y = Math.sin(t * 0.7) * 0.5 - 0.4;
      tail.rotation.y = Math.sin(t * (S.jump >= 0 ? 16 : 6)) * (S.jump >= 0 ? 0.7 : 0.42);
      let y = HOME.y + Math.sin(t * 2.2) * 0.05;
      if (S.jump >= 0) {
        S.jump += dt / 0.9;
        if (S.jump >= 1) S.jump = -1;
        else y += Math.sin(Math.min(1, S.jump) * Math.PI) * 0.85;
      }
      g.position.set(HOME.x, y, HOME.z);
      for (const b of bubbles) {
        const bt = (t * 0.5 + b.userData.off) % 1.6;
        b.position.set(Math.sin((t + b.userData.off) * 2.4) * 0.08, 0.15 + bt * 0.5, 0);
        b.material.opacity = 0.65 * (1 - bt / 1.6);
      }
      if (S.splash >= 0) {
        S.splash += dt / 0.8;
        if (S.splash >= 1) { S.splash = -1; ring.material.opacity = 0; }
        else {
          ring.position.y = -g.position.y + 0.05;
          ring.scale.setScalar(0.5 + S.splash * 1.6);
          ring.material.opacity = 0.7 * (1 - S.splash);
        }
      }
    },
    react() { S.jump = 0; S.splash = 0; },
  };
}

/* ================= COFFEE CUP ================= */

function buildCup() {
  const g = new THREE.Group();
  const S = { surprise: 0, whirlBoost: 0, drops: [] };

  const prof = [
    [0.02, 0], [0.28, 0.015], [0.38, 0.10], [0.42, 0.34],
    [0.44, 0.56], [0.44, 0.64], [0.385, 0.66], [0.345, 0.62],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const cup = sketched(new THREE.LatheGeometry(prof, 30), { outline: 0.008, boil: 0.004 });
  placed(g, cup, 0, 0.01, 0);

  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.042, 10, 22, Math.PI * 1.2), hatchMaterial({ boil: 0.004 }));
  handle.position.set(0.47, 0.38, 0);
  handle.rotation.z = -Math.PI / 2 - (Math.PI * 1.2 - Math.PI) / 2;
  g.add(handle);
  addLineOutline(handle, { angle: 50, opacity: 0.85 });

  const calmTex = cupFaceTexture(false), surTex = cupFaceTexture(true);
  const faceMat = new THREE.MeshBasicMaterial({ map: calmTex, transparent: true, depthWrite: false });
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.452, 24, 16, Math.PI - 0.62, 1.24, 0.9, 1.15), faceMat);
  face.position.y = 0.02;
  g.add(face);

  const whirlGrp = new THREE.Group();
  whirlGrp.rotation.x = -Math.PI / 2;
  placed(g, whirlGrp, 0, 0.615, 0);
  const whirl = new THREE.Mesh(
    new THREE.CircleGeometry(0.36, 28),
    new THREE.MeshBasicMaterial({ map: whirlTexture(), transparent: true, opacity: 0.9, depthWrite: false }));
  whirlGrp.add(whirl);

  const dropGeo = new THREE.SphereGeometry(0.03, 8, 6);
  for (let i = 0; i < 5; i++) {
    const d = new THREE.Mesh(dropGeo, basicMat(0x3a352c));
    d.visible = false;
    g.add(d);
    S.drops.push({ m: d, v: null });
  }

  g.userData.shadow = { sx: 0.85, sz: 0.8 };

  return {
    name: 'cup', group: g, restY: 0,
    focus: { cam: [3.05, 1.05, 0.75], tgt: [1.7, 0.45, -0.6] },
    update(t, dt) {
      whirl.rotation.z -= dt * (1.6 + S.whirlBoost * 9);
      S.whirlBoost = Math.max(0, S.whirlBoost - dt * 0.8);
      g.rotation.z = Math.sin(t * 1.4) * 0.02;
      if (S.surprise > 0) {
        S.surprise = Math.max(0, S.surprise - dt / 1.6);
        const b = Math.sin(Math.min(1, 1 - S.surprise) * Math.PI) * 0.12;
        g.position.y = b;
        g.rotation.z += Math.sin(t * 22) * 0.02 * S.surprise;
      } else g.position.y = 0;
      faceMat.map = S.surprise > 0.35 ? surTex : calmTex;
      for (const d of S.drops) {
        if (!d.v) continue;
        d.v.y -= 4.2 * dt;
        d.m.position.addScaledVector(d.v, dt);
        if (d.m.position.y < 0) { d.m.visible = false; d.v = null; }
      }
    },
    react() {
      S.surprise = 1; S.whirlBoost = 1;
      for (const d of S.drops) {
        d.m.visible = true;
        d.m.position.set((Math.random() - 0.5) * 0.3, 0.7, (Math.random() - 0.5) * 0.3);
        d.v = new THREE.Vector3((Math.random() - 0.5) * 1.4, 1.2 + Math.random() * 0.8, (Math.random() - 0.5) * 1.4);
      }
    },
  };
}

/* ================= BIRD ================= */

function buildBird() {
  const g = new THREE.Group();
  const S = { loop: -1 };
  const HOME = { x: 0.15, y: 1.5, z: -1.15 };

  const body = sketched(new THREE.SphereGeometry(0.17, 20, 14), { outline: 0.011, boil: 0.005 });
  body.scale.set(1, 0.95, 1.25);
  g.add(body);
  const head = sketched(new THREE.SphereGeometry(0.115, 18, 12), { outline: 0.011, boil: 0.005 });
  placed(g, head, 0, 0.13, 0.14);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 8), basicMat(0x8a8272));
  beak.rotation.x = Math.PI / 2;
  placed(head, beak, 0, -0.01, 0.15);
  placed(head, googly(0.052, 0.009), -0.06, 0.05, 0.08);
  placed(head, googly(0.052, 0.009), 0.06, 0.05, 0.08);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.2, 8), hatchMaterial({ boil: 0.006 }));
  tail.scale.set(1, 0.3, 1);
  tail.rotation.x = -Math.PI / 2 - 0.5;
  placed(g, tail, 0, 0.06, -0.24);
  addLineOutline(tail, { angle: 40, opacity: 0.8 });

  const wingGeo = new THREE.SphereGeometry(0.16, 14, 10);
  const wingL = new THREE.Group(), wingR = new THREE.Group();
  placed(g, wingL, -0.13, 0.03, 0);
  placed(g, wingR, 0.13, 0.03, 0);
  const wl = new THREE.Mesh(wingGeo, hatchMaterial({ boil: 0.006 }));
  wl.scale.set(0.75, 0.16, 0.5); wl.position.x = -0.16;
  wingL.add(wl); addLineOutline(wl, { angle: 40, opacity: 0.7 });
  const wr = new THREE.Mesh(wingGeo, hatchMaterial({ boil: 0.006 }));
  wr.scale.set(0.75, 0.16, 0.5); wr.position.x = 0.16;
  wingR.add(wr); addLineOutline(wr, { angle: 40, opacity: 0.7 });

  g.userData.shadow = { sx: 0.4, sz: 0.35 };

  return {
    name: 'bird', group: g, restY: HOME.y,
    focus: { cam: [0.7, 2.15, 0.5], tgt: [0.15, 1.5, -1.15] },
    update(t, dt) {
      let x = HOME.x + Math.sin(t * 0.9) * 0.25;
      let y = HOME.y + Math.sin(t * 2.4) * 0.09;
      let z = HOME.z + Math.cos(t * 0.7) * 0.2;
      if (S.loop >= 0) {
        S.loop += dt / 0.9;
        if (S.loop >= 1) { S.loop = -1; g.rotation.x = 0; }
        else {
          const a = S.loop * Math.PI * 2;
          y += Math.sin(a) * 0.42 - 0.1;
          z += (1 - Math.cos(a)) * 0.2;
          g.rotation.x = -a;
        }
      } else g.rotation.x = Math.sin(t * 2.4) * 0.05;
      g.position.set(x, y, z);
      const flap = S.loop >= 0 ? 18 : 9;
      wingL.rotation.z = 0.45 + Math.sin(t * flap) * 0.55;
      wingR.rotation.z = -0.45 - Math.sin(t * flap) * 0.55;
    },
    react() { S.loop = 0; },
  };
}

/* ================= PAPER PLANE ================= */

function buildPlane() {
  const g = new THREE.Group();
  const S = { roll: -1, boost: 0, ang: 0 };

  const nose = [0, 0, 0.62];
  const tailC = [0, 0.05, -0.5];
  const tipL = [-0.62, 0.20, -0.42];
  const tipR = [0.62, 0.20, -0.42];
  const keel = [0, -0.14, -0.38];
  const verts = new Float32Array([
    ...nose, ...tailC, ...tipL,     // left wing
    ...nose, ...tipR, ...tailC,     // right wing
    ...nose, ...keel, ...tailC,     // keel
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  geo.computeVertexNormals();
  const mat = hatchMaterial({ flat: 0.25, ambient: 0.5, key: 0.5, boil: 0.004, scale: 1 / 220 });
  mat.side = THREE.DoubleSide;
  g.add(new THREE.Mesh(geo, mat));
  g.add(new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, 1),
    new THREE.LineBasicMaterial({ color: DARK, transparent: true, opacity: 0.75 })));

  // sketchy fading trail
  const N = 42;
  const trailPos = new Float32Array(N * 3);
  const trailCol = new Float32Array(N * 3);
  const cPaper = new THREE.Color(0xf6f2e7), cInk = new THREE.Color(DARK);
  for (let i = 0; i < N; i++) {
    const c = cPaper.clone().lerp(cInk, Math.pow(i / (N - 1), 1.6) * 0.8);
    trailCol[i * 3] = c.r; trailCol[i * 3 + 1] = c.g; trailCol[i * 3 + 2] = c.b;
  }
  const trailGeo = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.8 }));
  trail.frustumCulled = false;
  g.add(trail);
  const hist = [];

  const C = new THREE.Vector3(0, 1.95, -0.35), R = 2.05;
  const p = new THREE.Vector3(), p2 = new THREE.Vector3();

  return {
    name: 'plane', group: g, restY: C.y,
    focus: { cam: [1.5, 3.0, 2.8], tgt: [0, 1.9, -0.35] },
    update(t, dt) {
      S.boost = Math.max(0, S.boost - dt * 0.7);
      S.ang += dt * (0.45 + S.boost * 0.9);
      const a = S.ang;
      p.set(C.x + Math.cos(a) * R, C.y + Math.sin(t * 1.3) * 0.14, C.z + Math.sin(a) * R * 0.62);
      const a2 = a + 0.06;
      p2.set(C.x + Math.cos(a2) * R, p.y, C.z + Math.sin(a2) * R * 0.62);
      g.position.copy(p);
      g.lookAt(p2);
      let bankZ = -0.42;
      if (S.roll >= 0) {
        S.roll += dt / 0.85;
        if (S.roll >= 1) S.roll = -1;
        else bankZ += S.roll * Math.PI * 2;
      }
      g.rotateZ(bankZ);
      hist.push(p.x, p.y - 0.05, p.z);
      while (hist.length > N * 3) hist.splice(0, 3);
      for (let i = 0; i < N; i++) {
        const src = Math.max(0, hist.length - (N - i) * 3);
        trailPos[i * 3] = hist[src];
        trailPos[i * 3 + 1] = hist[src + 1];
        trailPos[i * 3 + 2] = hist[src + 2];
      }
      trailGeo.attributes.position.needsUpdate = true;
    },
    react() { S.roll = 0; S.boost = 1; },
  };
}

/* ================= UMBRELLA (+ music notes) ================= */

function buildUmbrella() {
  const g = new THREE.Group();
  const S = { spin: -1 };
  const noteTex = noteTexture();
  const notes = [];
  for (let i = 0; i < 7; i++) {
    const n = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex, transparent: true, opacity: 0, depthWrite: false }));
    n.scale.setScalar(0.16);
    g.add(n);
    notes.push({ s: n, life: -1, sx: 0, sy: 0, sz: 0, ph: 0 });
  }

  const tilt = new THREE.Group();
  tilt.rotation.z = 0.14;
  g.add(tilt);

  const canopy = sketched(
    new THREE.SphereGeometry(0.95, 28, 10, 0, Math.PI * 2, 0, Math.PI * 0.42),
    { outline: 0.010, boil: 0.004, ambient: 0.30, key: 0.62, tint: 0xf4f0e4 });
  canopy.scale.y = 0.72;
  placed(tilt, canopy, 0, 1.32, 0);
  const seamPts = [];
  for (let k = 0; k < 9; k++) {
    const az = k / 8 * Math.PI * 2;
    seamPts.push(new THREE.Vector3(0, 1.32 + 0.95 * 0.72, 0),
      new THREE.Vector3(Math.cos(az) * 0.94, 1.32 + Math.cos(Math.PI * 0.42) * 0.95 * 0.72, Math.sin(az) * 0.94));
  }
  tilt.add(new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(seamPts),
    new THREE.LineBasicMaterial({ color: DARK, transparent: true, opacity: 0.5 })));

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 1.45, 10), hatchMaterial({ boil: 0.004 }));
  placed(tilt, pole, 0, 0.68, 0);
  addLineOutline(pole, { angle: 50, opacity: 0.85 });
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.028, 8, 18, Math.PI), hatchMaterial({ boil: 0.004 }));
  handle.position.set(0, 0.05, 0);
  handle.rotation.z = Math.PI;
  tilt.add(handle);
  placed(tilt, new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 8), hatchMaterial({ boil: 0.004 })), 0, 1.99, 0);

  g.userData.shadow = { sx: 1.35, sz: 1.2 };

  return {
    name: 'umbrella', group: g, restY: 0,
    focus: { cam: [-3.1, 1.5, 0.55], tgt: [-1.7, 1.05, -0.85] },
    update(t, dt) {
      if (S.spin >= 0) {
        S.spin += dt / 1.1;
        if (S.spin >= 1) { S.spin = -1; tilt.rotation.y = 0; }
        else tilt.rotation.y = (1 - Math.cos(Math.min(1, S.spin) * Math.PI)) / 2 * Math.PI * 4;
      }
      for (const n of notes) {
        if (n.life < 0) continue;
        n.life += dt / 2.1;
        if (n.life >= 1) { n.life = -1; n.s.material.opacity = 0; continue; }
        n.s.position.x = n.sx + Math.sin(n.life * 7 + n.ph) * 0.12;
        n.s.position.y = n.sy + n.life * 0.85;
        n.s.position.z = n.sz + Math.cos(n.life * 5 + n.ph) * 0.1;
        n.s.material.opacity = 0.85 * (1 - n.life);
      }
    },
    react() {
      S.spin = 0;
      let spawned = 0;
      for (const n of notes) {
        if (n.life >= 0 || spawned >= 5) continue;
        n.life = 0; spawned++;
        const az = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * 0.5;
        n.sx = Math.cos(az) * r; n.sy = 1.15; n.sz = Math.sin(az) * r;
        n.ph = Math.random() * 6.28;
      }
    },
  };
}

/* ================= NOTEBOOK + PENCIL (stage props) ================= */

function buildNotebook() {
  const g = new THREE.Group();
  const cover = sketched(new THREE.BoxGeometry(2.62, 0.07, 1.86), { outline: 0, tint: 0x9d968a, boil: 0.002 });
  addLineOutline(cover, { angle: 20, opacity: 0.8 });
  cover.position.y = 0.035;
  g.add(cover);
  const stack = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.05, 1.7), basicMat(0xefe9db));
  stack.position.y = 0.093;
  g.add(stack);

  const pageGeo = (sideSign) => {
    const geo = new THREE.PlaneGeometry(1.22, 1.62, 26, 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const u = sideSign < 0 ? (0.61 - x) / 1.22 : (x + 0.61) / 1.22; // 0 at spine
      p.setZ(i, 0.085 * u * u);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const pageL = new THREE.Mesh(pageGeo(-1), new THREE.MeshBasicMaterial({ map: pageTexture(-1) }));
  pageL.rotation.x = -Math.PI / 2;
  pageL.position.set(-0.615, 0.125, 0);
  g.add(pageL);
  const pageR = new THREE.Mesh(pageGeo(1), new THREE.MeshBasicMaterial({ map: pageTexture(1) }));
  pageR.rotation.x = -Math.PI / 2;
  pageR.position.set(0.615, 0.125, 0);
  g.add(pageR);

  const ringGeo = new THREE.TorusGeometry(0.052, 0.011, 6, 14, Math.PI * 1.25);
  const ringMat = basicMat(0x4c463c);
  for (let i = 0; i < 13; i++) {
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 0.115, -0.75 + i * 0.125);
    ring.rotation.x = Math.PI / 2 - 0.35;
    ring.rotation.y = Math.PI / 2;
    g.add(ring);
  }

  // giant pencil resting (hovering) across the spread
  const pencil = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 1.15, 6), hatchMaterial({ tint: 0xf2e3b6, boil: 0.003 }));
  shaft.rotation.z = Math.PI / 2;
  pencil.add(shaft);
  addLineOutline(shaft, { angle: 40, opacity: 0.7 });
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.16, 6), hatchMaterial({ tint: 0xe8d9c2, boil: 0.003 }));
  tip.rotation.z = -Math.PI / 2;
  tip.position.x = 0.655;
  pencil.add(tip);
  addLineOutline(tip, { angle: 40, opacity: 0.7 });
  const lead = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 6), basicMat(DARK));
  lead.rotation.z = -Math.PI / 2;
  lead.position.x = 0.76;
  pencil.add(lead);
  const eraser = new THREE.Mesh(new THREE.CylinderGeometry(0.057, 0.057, 0.09, 6), hatchMaterial({ tint: 0xe3c9c4, boil: 0.003 }));
  eraser.rotation.z = Math.PI / 2;
  eraser.position.x = -0.62;
  pencil.add(eraser);
  addLineOutline(eraser, { angle: 40, opacity: 0.7 });
  pencil.position.set(0.18, 0.21, 0.32);
  pencil.rotation.y = 0.5;
  g.add(pencil);

  g.userData.shadow = { sx: 1.5, sz: 1.0 };

  return {
    name: 'notebook', group: g, restY: 0,
    focus: { cam: [0.9, 2.2, 2.7], tgt: [0.1, 0.15, 0.1] },
    update(t) {
      pencil.position.y = 0.21 + Math.sin(t * 1.8) * 0.008;
      pencil.rotation.z = Math.sin(t * 1.3) * 0.012;
    },
    react() { return 'party'; },   // main.js turns this into an ensemble-wide hop
  };
}

/* ================= world (table + backdrop) ================= */

function buildTable() {
  const g = new THREE.Group();
  const woodOpts = { tint: 0xe8e2d4, ambient: 0.34, key: 0.66, scale: 1 / 430, boil: 0.002 };
  const top = sketched(new THREE.BoxGeometry(7.2, 0.34, 4.9), { ...woodOpts, outline: 0 });
  addLineOutline(top, { angle: 20, opacity: 0.7 });
  top.position.y = -0.17;
  g.add(top);
  const legGeo = new THREE.BoxGeometry(0.26, 0.95, 0.26);
  for (const [lx, lz] of [[-3.1, -2.0], [3.1, -2.0], [-3.1, 2.0], [3.1, 2.0]]) {
    const leg = sketched(legGeo, { ...woodOpts, outline: 0 });
    addLineOutline(leg, { angle: 20, opacity: 0.7 });
    leg.position.set(lx, -0.82, lz);
    g.add(leg);
  }
  const grainMat = new THREE.LineBasicMaterial({ color: 0x55503f, transparent: true, opacity: 0.4 });
  for (let k = 0; k < 6; k++) {
    const pts = [];
    const z0 = -2.1 + k * 0.8 + Math.random() * 0.2;
    for (let x = -3.55; x <= 3.55; x += 0.25) {
      pts.push(new THREE.Vector3(x, 0.003, z0 + Math.sin(x * 1.7 + k * 2.4) * 0.07));
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), grainMat));
  }
  return g;
}

function buildBackdrop() {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(30, 24, 16),
    hatchMaterial({ flat: 1, tint: 0xfefdf8, scale: 1 / 520, boil: 0 }));
  sky.material.side = THREE.BackSide;
  return sky;
}

/* ================= registry ================= */

export function buildEnsemble() {
  const chars = [];
  const add = (c) => { c.group.userData.char = c; chars.push(c); return c; };

  add(buildMonster()).group.position.set(-1.6, 0, 0.35);
  add(buildFish()).group.position.set(1.5, 0.62, 0.9);
  add(buildCup()).group.position.set(1.7, 0, -0.6);
  add(buildBird()).group.position.set(0.15, 1.5, -1.15);
  add(buildPlane());
  add(buildUmbrella()).group.position.set(-1.7, 0, -0.85);
  const notebook = add(buildNotebook());
  notebook.group.position.set(0.1, 0, 0.1);
  notebook.group.rotation.y = -0.18;

  const table = buildTable();
  const backdrop = buildBackdrop();

  // hatched blob shadows live on the floor, not on the characters,
  // so jumps and hovers don't drag them along
  const shadowRoot = new THREE.Group();
  const shadows = [];
  for (const c of chars) {
    const sh = c.group.userData.shadow;
    if (!sh) continue;
    const baseO = c.name === 'bird' ? 0.4 : 0.8;
    const mesh = shadowMesh(sh.sx, sh.sz, baseO);
    mesh.position.y = 0.004 + shadows.length * 0.0012;
    shadowRoot.add(mesh);
    shadows.push({ mesh, char: c, baseO, sx: sh.sx, sz: sh.sz, restY: c.restY });
  }

  return { chars, notebook, table, backdrop, shadowRoot, shadows };
}
