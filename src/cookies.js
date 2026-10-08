/**
 * Procedural 3D kue kering — no external model files.
 * Every cookie is generated from primitive geometry + noise displacement + vertex colours,
 * so the whole "asset pack" weighs a few KB and loads instantly.
 */
import * as THREE from "three";
import { mergeVertices, mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/* ---------------- noise ---------------- */
function hash(x, y, z) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c000 = hash(xi, yi, zi), c100 = hash(xi + 1, yi, zi);
  const c010 = hash(xi, yi + 1, zi), c110 = hash(xi + 1, yi + 1, zi);
  const c001 = hash(xi, yi, zi + 1), c101 = hash(xi + 1, yi, zi + 1);
  const c011 = hash(xi, yi + 1, zi + 1), c111 = hash(xi + 1, yi + 1, zi + 1);
  return l(l(l(c000, c100, u), l(c010, c110, u), v), l(l(c001, c101, u), l(c011, c111, u), v), w);
}
function fbm(x, y, z) {
  return vnoise(x, y, z) * 0.55 + vnoise(x * 2.07, y * 2.07, z * 2.07) * 0.3 + vnoise(x * 4.3, y * 4.3, z * 4.3) * 0.15;
}
const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const C = (hex) => new THREE.Color(hex);
const tmpC = new THREE.Color();

function prepSphere(segW, segH) {
  let g = new THREE.SphereGeometry(1, segW, segH);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  return mergeVertices(g);
}

/** Run fn(v, i) over every vertex; fn mutates v and returns a THREE.Color (or nothing). */
function sculpt(geo, fn) {
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  let hasColor = false;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const col = fn(v, i);
    pos.setXYZ(i, v.x, v.y, v.z);
    if (col) {
      hasColor = true;
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
  }
  if (hasColor) geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

/* =========================================================
   NASTAR
   ========================================================= */
let nastarCache;
export function nastarParts() {
  if (nastarCache) return nastarCache;
  const pale = C("#F5C468"), glaze = C("#E28216"), deep = C("#BA5308");
  const geo = sculpt(prepSphere(72, 54), (v) => {
    let y = v.y;
    if (y < -0.5) y = -0.5 + (y + 0.5) * 0.18;
    v.y = y * 0.78;
    const rXZ = Math.hypot(v.x, v.z);
    if (v.y > 0.45 && rXZ < 0.32) {
      const indent = 1 - rXZ / 0.32;
      v.y -= indent * indent * 0.08;
    }
    const n = fbm(v.x * 3 + 3, v.y * 3, v.z * 3);
    const ridge = 1 - Math.abs(vnoise(v.x * 4.5 + 9, v.y * 4.5, v.z * 4.5) * 2 - 1);
    const crack = Math.pow(ridge, 14) * smooth(-0.05, 0.5, v.y);
    const len = v.length();
    v.multiplyScalar((len + (n - 0.5) * 0.06 - crack * 0.02) / len);
    const t = smooth(-0.35, 0.65, v.y) * (0.75 + n * 0.35);
    tmpC.lerpColors(pale, glaze, Math.min(1, t));
    if (t > 0.82) tmpC.lerp(deep, (t - 0.82) * 1.6);
    tmpC.lerp(pale, crack * 0.7);
    return tmpC;
  });
  const mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.3 });

  // clove (cengkeh) merged into one geometry, sitting naturally in the crown dimple
  const stem = new THREE.CylinderGeometry(0.03, 0.048, 0.22, 8).translate(0, 0.11, 0);
  const bud = new THREE.SphereGeometry(0.08, 12, 10).translate(0, 0.25, 0);
  const parts = [stem, bud];
  for (let k = 0; k < 4; k++) {
    const s = new THREE.ConeGeometry(0.038, 0.15, 6);
    s.translate(0, 0.07, 0);
    s.rotateZ(1.18);
    s.rotateY((k * Math.PI) / 2 + 0.4);
    s.translate(0, 0.21, 0);
    parts.push(s);
  }
  const cloveGeo = mergeGeometries(parts.map((p) => (p.deleteAttribute("uv"), p)));
  cloveGeo.translate(0, 0.66, 0);
  const cloveMat = new THREE.MeshStandardMaterial({ color: "#2A1207", roughness: 0.85 });
  nastarCache = { geo, mat, cloveGeo, cloveMat };
  return nastarCache;
}
export function makeNastar() {
  const p = nastarParts();
  const g = new THREE.Group();
  g.add(new THREE.Mesh(p.geo, p.mat));
  g.add(new THREE.Mesh(p.cloveGeo, p.cloveMat));
  return g;
}

/* =========================================================
   KASTENGEL — rounded cheese stick with grated edam
   ========================================================= */
export function makeKastengel() {
  const w = 2.2, h = 0.5, d = 0.62, r = 0.14;
  let g = new THREE.BoxGeometry(w, h, d, 44, 10, 12);
  g.deleteAttribute("normal");
  g.deleteAttribute("uv");
  g = mergeVertices(g);
  const inner = new THREE.Vector3(w / 2 - r, h / 2 - r, d / 2 - r);
  const c = new THREE.Vector3(), dir = new THREE.Vector3();
  const side = C("#ECC37E"), top = C("#D48A2F"), bottom = C("#C68D47");
  sculpt(g, (v) => {
    c.set(
      THREE.MathUtils.clamp(v.x, -inner.x, inner.x),
      THREE.MathUtils.clamp(v.y, -inner.y, inner.y),
      THREE.MathUtils.clamp(v.z, -inner.z, inner.z)
    );
    dir.subVectors(v, c);
    if (dir.lengthSq() < 1e-8) dir.set(0, 1, 0);
    dir.normalize();
    const n = fbm(v.x * 4, v.y * 4 + 7, v.z * 4);
    v.copy(c).addScaledVector(dir, r + (n - 0.5) * 0.06);
    v.y += Math.sin((v.x / w) * Math.PI) * 0.04; // tiny bake curve
    tmpC.copy(side).lerp(top, smooth(0.15, 0.85, dir.y) * (0.75 + n * 0.4));
    if (dir.y < -0.4) tmpC.lerp(bottom, 0.7);
    return tmpC;
  });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.6, clearcoat: 0.35, clearcoatRoughness: 0.4 })));

  const shreds = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.24, 0.035, 0.045),
    new THREE.MeshStandardMaterial({ color: "#F6C85F", roughness: 0.45 }),
    34
  );
  const o = new THREE.Object3D();
  for (let i = 0; i < 34; i++) {
    o.position.set((Math.random() - 0.5) * 1.9, h / 2 + 0.03 + Math.random() * 0.02, (Math.random() - 0.5) * 0.4);
    o.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * Math.PI, (Math.random() - 0.5) * 0.4);
    o.updateMatrix();
    shreds.setMatrixAt(i, o.matrix);
  }
  group.add(shreds);
  return group;
}

/* =========================================================
   PUTRI SALJU — tapered crescent dusted in sugar
   ========================================================= */
export function makePutriSalju() {
  const N = 72, M = 28, R = 0.72, arc = Math.PI * 1.15;
  const pos = [], idx = [];
  const ring = (t) => {
    const th = -arc / 2 + t * arc;
    const r = 0.34 * Math.pow(Math.sin(Math.PI * t), 0.55);
    const cx = Math.cos(th) * R, cz = Math.sin(th) * R;
    for (let j = 0; j < M; j++) {
      const ph = (j / M) * Math.PI * 2;
      pos.push(cx + Math.cos(th) * Math.cos(ph) * r, Math.sin(ph) * r * 0.85, cz + Math.sin(th) * Math.cos(ph) * r);
    }
  };
  const t0 = 0.025, t1 = 0.975;
  for (let i = 0; i <= N; i++) ring(t0 + (i / N) * (t1 - t0));
  for (let i = 0; i < N; i++)
    for (let j = 0; j < M; j++) {
      const a = i * M + j, b = i * M + ((j + 1) % M), c = (i + 1) * M + j, d = (i + 1) * M + ((j + 1) % M);
      idx.push(a, c, b, b, c, d);
    }
  // end caps
  const capA = pos.length / 3;
  const thA = -arc / 2 + t0 * arc, thB = -arc / 2 + t1 * arc;
  pos.push(Math.cos(thA - 0.03) * R, 0, Math.sin(thA - 0.03) * R);
  const capB = capA + 1;
  pos.push(Math.cos(thB + 0.03) * R, 0, Math.sin(thB + 0.03) * R);
  for (let j = 0; j < M; j++) {
    idx.push(capA, j, (j + 1) % M);
    const base = N * M;
    idx.push(capB, base + ((j + 1) % M), base + j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  const sugar = C("#FBF8F2"), crumb = C("#E6CC9A");
  sculpt(g, (v) => {
    if (v.y < -0.16) v.y = -0.16 + (v.y + 0.16) * 0.3;
    const n = fbm(v.x * 5, v.y * 5, v.z * 5);
    const fine = vnoise(v.x * 22, v.y * 22, v.z * 22);
    const nx = v.x, nz = v.z;
    const k = 1 + (n - 0.5) * 0.06;
    v.x = nx * (1 + (k - 1) * 0.5);
    v.z = nz * (1 + (k - 1) * 0.5);
    v.y += (n - 0.5) * 0.05;
    tmpC.copy(sugar).lerp(crumb, Math.max(smooth(-0.02, -0.16, v.y) * 0.8, fine > 0.82 ? 0.35 : 0));
    return tmpC;
  });
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
}

/* =========================================================
   SAGU KEJU — piped flower with twisted ridges
   ========================================================= */
export function makeSaguKeju() {
  const cream = C("#F4E3C1"), toast = C("#D59C57");
  const g = sculpt(prepSphere(110, 48), (v) => {
    const h = v.y;
    const th = Math.atan2(v.z, v.x) + h * 0.55;
    const edge = 1 - Math.abs(h);
    const petal = 1 + 0.17 * Math.cos(8 * th) + 0.035 * Math.cos(24 * th) * edge;
    v.x *= petal;
    v.z *= petal;
    let y = h;
    if (y < -0.3) y = -0.3 + (y + 0.3) * 0.2;
    v.y = y * 0.62 + 0.14 * Math.exp(-(v.x * v.x + v.z * v.z) * 7) * (h > 0 ? 1 : 0);
    const n = fbm(v.x * 6, v.y * 6, v.z * 6);
    const valley = 0.5 - 0.5 * Math.cos(8 * th);
    tmpC.copy(cream).lerp(toast, Math.min(1, smooth(-0.02, -0.2, v.y) * 0.9 + (1 - valley) * 0.12 + (n - 0.5) * 0.25));
    return tmpC;
  });
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
}

/* =========================================================
   KUE KACANG — crumbly peanut dome with sesame
   ========================================================= */
export function makeKueKacang() {
  const body = C("#C99459"), dark = C("#9E6634"), nut = C("#E7C68E"), glaze = C("#B4601C");
  const g = sculpt(prepSphere(72, 54), (v) => {
    let y = v.y;
    if (y < -0.45) y = -0.45 + (y + 0.45) * 0.2;
    v.y = y * 0.74;
    const n = fbm(v.x * 3.5 + 1, v.y * 3.5, v.z * 3.5);
    const f = vnoise(v.x * 11, v.y * 11, v.z * 11);
    const len = v.length();
    v.multiplyScalar((len + (n - 0.5) * 0.15 + (f - 0.5) * 0.05) / len);
    tmpC.copy(body);
    if (f > 0.72) tmpC.lerp(nut, 0.6);
    else if (f < 0.25) tmpC.lerp(dark, 0.45);
    tmpC.lerp(glaze, smooth(0.25, 0.7, v.y) * 0.85);
    return tmpC;
  });
  const group = new THREE.Group();
  group.add(new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.7, clearcoat: 0.4, clearcoatRoughness: 0.4 })));
  const seeds = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshStandardMaterial({ color: "#F3E6C6", roughness: 0.5 }), 11);
  const o = new THREE.Object3D();
  for (let i = 0; i < 11; i++) {
    const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 0.32;
    const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    o.position.set(x, Math.sqrt(Math.max(0, 1 - x * x - z * z)) * 0.74 + 0.02, z);
    o.rotation.set(0, Math.random() * Math.PI, 0);
    o.scale.set(0.035, 0.016, 0.065);
    o.updateMatrix();
    seeds.setMatrixAt(i, o.matrix);
  }
  group.add(seeds);
  return group;
}

/* =========================================================
   KUPING GAJAH — thin disc with cocoa/vanilla spiral
   ========================================================= */
function spiralTexture() {
  const s = 512, cv = document.createElement("canvas");
  cv.width = cv.height = s;
  const ctx = cv.getContext("2d");
  ctx.fillStyle = "#EED7A6";
  ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = "#5A2E19";
  ctx.lineWidth = 30;
  ctx.lineCap = "round";
  ctx.beginPath();
  const turns = 4.6, max = s / 2 - 8, a = max / (turns * Math.PI * 2);
  for (let t = 0; t < turns * Math.PI * 2; t += 0.02) {
    const r = a * t, x = s / 2 + Math.cos(t) * r, y = s / 2 + Math.sin(t) * r;
    t === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2 - 6, 0, Math.PI * 2);
  ctx.stroke();
  // crumb speckle
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? "255,240,210" : "60,25,10"},${Math.random() * 0.18})`;
    ctx.fillRect(Math.random() * s, Math.random() * s, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
let spiralTex;
export function makeKupingGajah() {
  spiralTex ||= spiralTexture();
  const g = new THREE.CylinderGeometry(1, 1, 0.13, 128, 1);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
    const th = Math.atan2(z, x);
    const k = 1 + (vnoise(Math.cos(th) * 2.4 + 5, Math.sin(th) * 2.4, 0) - 0.5) * 0.1;
    const r2 = x * x + z * z;
    pos.setXYZ(i, x * k, y + (y > 0 ? 0.03 * (1 - r2) : 0), z * k);
  }
  g.computeVertexNormals();
  const sideMat = new THREE.MeshStandardMaterial({ color: "#8E5A33", roughness: 0.85 });
  const topMat = new THREE.MeshStandardMaterial({ map: spiralTex, roughness: 0.75 });
  const botMat = new THREE.MeshStandardMaterial({ map: spiralTex, color: "#d6b48a", roughness: 0.85 });
  return new THREE.Mesh(g, [sideMat, topMat, botMat]);
}

export const makers = {
  nastar: makeNastar,
  kastengel: makeKastengel,
  putri: makePutriSalju,
  sagu: makeSaguKeju,
  kacang: makeKueKacang,
  kuping: makeKupingGajah,
};

export { vnoise };
