import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { playChime, playPop } from "./audio.js";

const easeOutBounce = (x) => {
  const n1 = 7.5625, d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
};

/**
 * Builds authentic, appetizing Indonesian Nastar mesh:
 * - Plump, squat baked pastry bun with flat bottom
 * - Rich buttery golden pastry & egg-wash amber glaze (clean, no halo spots)
 * - Gentle artisan dimple where clove is tucked in
 * - Authentic 4-pointed star dried clove spice (bunga cengkeh: bud + 4 flared sepals + stem)
 * Single unified geometry with vertex colors = 1 clean, high-performance draw call.
 */
function createDedicatedJarNastarGeo() {
  // 1. Pastry Bun Geometry
  const sphereGeo = new THREE.SphereGeometry(1, 32, 22);
  const pos = sphereGeo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  // Warm bakery palette: rich golden butter base and glowing egg-wash glaze
  const baseCrust = new THREE.Color("#F5C368");
  const eggGlaze = new THREE.Color("#E28216");
  const bakedGlow = new THREE.Color("#BA5308");
  const cloveCol = new THREE.Color("#2A1207");
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Flatten bottom where it rests on baking tray
    if (y < -0.42) {
      y = -0.42 + (y + 0.42) * 0.16;
    }

    // Squat pastry bun ratio (nastar is plump and squat, not a tall dome)
    y *= 0.76;

    // Plump waist around the middle
    const rXZ = Math.hypot(x, z);
    const plump = 1.0 + 0.08 * Math.cos(Math.max(-1, Math.min(1, y / 0.76)) * Math.PI * 0.5);
    x *= plump;
    z *= plump;

    // Subtle artisan dimple in the center of the crown where the clove is pressed
    if (y > 0.45 && rXZ < 0.32) {
      const indent = 1 - rXZ / 0.32;
      y -= indent * indent * 0.1;
    }

    pos.setXYZ(i, x, y, z);

    // Smooth baked egg-wash gradient across the bun (pure pastry, NO circular dark halo)
    const t = Math.max(0, Math.min(1, (y + 0.38) / 1.0));
    tmp.copy(baseCrust).lerp(eggGlaze, t);
    if (t > 0.72) {
      tmp.lerp(bakedGlow, (t - 0.72) * 1.8);
    }

    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  sphereGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  sphereGeo.computeVertexNormals();

  // 2. Botanical 4-pointed Star Dried Clove Spice (Bunga Cengkeh)
  // Components: stem, central spherical bud, and 4 flared triangular sepals forming a star
  const cloveParts = [];

  // Central round spice bud
  const bud = new THREE.SphereGeometry(0.085, 10, 8);
  bud.translate(0, 0.74, 0);
  cloveParts.push(bud);

  // Clove stem tucked into the dimple
  const stem = new THREE.CylinderGeometry(0.032, 0.048, 0.22, 7);
  stem.translate(0, 0.63, 0);
  cloveParts.push(stem);

  // 4 flared calyx sepals (bunga cengkeh star pattern: ★)
  for (let k = 0; k < 4; k++) {
    const sepal = new THREE.ConeGeometry(0.04, 0.16, 5);
    sepal.translate(0, 0.07, 0);
    // Flare outward horizontally over the pastry surface
    sepal.rotateZ(1.22); // ~70 degrees from vertical, spreading flat
    sepal.rotateY((k * Math.PI) / 2 + 0.35); // cardinal star cross
    sepal.translate(0, 0.70, 0);
    cloveParts.push(sepal);
  }

  // Merge clove parts and apply clove vertex colors
  const cloveGeo = mergeGeometries(
    cloveParts.map((p) => {
      p.deleteAttribute("uv");
      return p;
    })
  );

  const cloveColors = new Float32Array(cloveGeo.attributes.position.count * 3);
  for (let i = 0; i < cloveGeo.attributes.position.count; i++) {
    cloveColors[i * 3] = cloveCol.r;
    cloveColors[i * 3 + 1] = cloveCol.g;
    cloveColors[i * 3 + 2] = cloveCol.b;
  }
  cloveGeo.setAttribute("color", new THREE.BufferAttribute(cloveColors, 3));
  cloveGeo.computeVertexNormals();

  sphereGeo.deleteAttribute("uv");

  return mergeGeometries([sphereGeo, cloveGeo]);
}

/** Scroll-driven: nastar balls drop one by one into a glass toples, then the red lid closes. */
export function initJar(canvas, counterEl) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.65;

  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.9, 8.5);
  camera.lookAt(0, -0.1, 0);

  const key = new THREE.DirectionalLight("#fff5e6", 2.2);
  key.position.set(4, 7, 6);
  const fill = new THREE.DirectionalLight("#ffc885", 1.2);
  fill.position.set(-4, -1, -3);
  scene.add(key, fill, new THREE.HemisphereLight("#fff8ed", "#874b28", 0.7));

  const root = new THREE.Group();
  scene.add(root);

  // Soft interior light to make nastar balls glow appetizingly inside the jar
  const innerLight = new THREE.PointLight("#ffe0b2", 1.8, 5);
  innerLight.position.set(0, 0.2, 0);
  root.add(innerLight);

  /* ---------- nastar packing calculation ---------- */
  const H0 = -1.6;
  const R = 0.27, step = 0.54, innerR = 1.33 - 0.08 - R;
  const targets = [];
  for (let layer = 0, y = H0 + R * 0.86; y < 1.05; layer++, y += R * 1.45) {
    const off = layer % 2 ? step / 2 : 0;
    const layerPts = [];
    for (let gx = -4; gx <= 4; gx++) {
      for (let gz = -4; gz <= 4; gz++) {
        const x = gx * step + (gz % 2 ? step / 2 : 0) + off * 0.5;
        const z = gz * step * 0.866 + off * 0.4;
        if (Math.hypot(x, z) <= innerR) {
          layerPts.push(
            new THREE.Vector3(
              x + (Math.random() - 0.5) * 0.03,
              y + (Math.random() - 0.5) * 0.03,
              z + (Math.random() - 0.5) * 0.03
            )
          );
        }
      }
    }
    // Randomize fill sequence within each layer so it fills up organically
    layerPts.sort(() => Math.random() - 0.5);
    targets.push(...layerPts);
  }
  const N = targets.length;

  const balls = targets.map((tgt) => ({
    tgt,
    // Start above the mouth of the jar, falling in from camera top
    start: new THREE.Vector3(
      (Math.random() - 0.5) * 0.4,
      2.8 + Math.random() * 0.4,
      (Math.random() - 0.5) * 0.4
    ),
    rot: new THREE.Euler(
      (Math.random() - 0.5) * 0.4,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.4
    ),
    spin: new THREE.Vector3(
      Math.random() * 8 - 4,
      Math.random() * 8 - 4,
      Math.random() * 8 - 4
    ),
  }));

  /* ---------- dedicated Nastar InstancedMesh ---------- */
  const nastarGeo = createDedicatedJarNastarGeo();
  const nastarMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.38,
    metalness: 0.04,
  });
  const cookiesIM = new THREE.InstancedMesh(nastarGeo, nastarMat, N);
  cookiesIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cookiesIM.frustumCulled = false;
  cookiesIM.renderOrder = 1; // Render before glass
  root.add(cookiesIM);

  /* ---------- crystal-clear glass jar ---------- */
  const profile = [
    [0, H0],
    [1.12, H0],
    [1.28, H0 + 0.12],
    [1.33, H0 + 0.4],
    [1.33, 1.05],
    [1.27, 1.28],
    [1.1, 1.4],
    [1.08, 1.62],
    [1.06, 1.62],
  ].map(([x, y]) => new THREE.Vector2(x, y));

  // FrontSide only transparent glass — crystal clear, zero milky blowout
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: "#e8f4f8",
    roughness: 0.06,
    metalness: 0.02,
    transparent: true,
    opacity: 0.22,
    side: THREE.FrontSide,
    depthWrite: false,
    clearcoat: 0.9,
    clearcoatRoughness: 0.1,
    envMapIntensity: 1.1,
  });
  const glass = new THREE.Mesh(new THREE.LatheGeometry(profile, 64), glassMat);
  glass.renderOrder = 5;
  root.add(glass);

  // Subtle white highlight rim on the neck
  const rimGeo = new THREE.TorusGeometry(1.08, 0.035, 12, 64);
  rimGeo.rotateX(Math.PI / 2);
  rimGeo.translate(0, 1.55, 0);
  const rimMat = new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.45 });
  root.add(new THREE.Mesh(rimGeo, rimMat));

  /* ---------- red toples lid ---------- */
  const lid = new THREE.Group();
  const lidMat = new THREE.MeshPhysicalMaterial({
    color: "#C8372D",
    roughness: 0.3,
    clearcoat: 0.65,
    clearcoatRoughness: 0.2,
  });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.16, 0.42, 64), lidMat);
  lid.add(cap);

  const knurl = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.36, 0.05), lidMat, 56);
  const o = new THREE.Object3D();
  for (let i = 0; i < 56; i++) {
    const a = (i / 56) * Math.PI * 2;
    o.position.set(Math.cos(a) * 1.17, 0, Math.sin(a) * 1.17);
    o.rotation.set(0, -a, 0);
    o.updateMatrix();
    knurl.setMatrixAt(i, o.matrix);
  }
  lid.add(knurl);
  root.add(lid);
  const LID_CLOSED = 1.62 + 0.18;

  /* ---------- contact shadow ---------- */
  const sc = document.createElement("canvas");
  sc.width = sc.height = 128;
  const sx = sc.getContext("2d");
  const grd = sx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, "rgba(58,26,14,.55)");
  grd.addColorStop(1, "rgba(58,26,14,0)");
  sx.fillStyle = grd;
  sx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 4.4),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = H0 - 0.01;
  scene.add(shadow);

  const state = { progress: 0 };
  const q = new THREE.Quaternion(), e = new THREE.Euler(), m = new THREE.Matrix4(), pos = new THREE.Vector3(), scl = new THREE.Vector3();
  let lastCount = -1;
  let playedChime = false;

  function layout() {
    const p = state.progress;
    // Complete cookie fill by 72% of scroll distance
    const fillEnd = 0.72;
    let landed = 0;

    balls.forEach((b, i) => {
      const t0 = (i / N) * (fillEnd - 0.06);
      const local = THREE.MathUtils.clamp((p - t0) / 0.06, 0, 1);

      if (local <= 0) {
        // Offscreen and tiny before falling
        scl.setScalar(0.0001);
        pos.set(0, 999, 0);
      } else {
        scl.setScalar(R);
        if (local >= 1) landed++;

        const yk = easeOutBounce(local);
        pos.set(
          THREE.MathUtils.lerp(b.start.x, b.tgt.x, Math.min(1, local * 1.4)),
          THREE.MathUtils.lerp(b.start.y, b.tgt.y, yk),
          THREE.MathUtils.lerp(b.start.z, b.tgt.z, Math.min(1, local * 1.4))
        );
      }

      const rem = 1 - local;
      e.set(
        b.rot.x + b.spin.x * rem,
        b.rot.y + b.spin.y * rem,
        b.rot.z + b.spin.z * rem
      );
      q.setFromEuler(e);
      m.compose(pos, q, scl);
      cookiesIM.setMatrixAt(i, m);
    });

    cookiesIM.instanceMatrix.needsUpdate = true;

    // Lid closes smoothly between 0.74 and 0.88, leaving 0.88-1.00 as a resting showcase
    const lk = THREE.MathUtils.clamp((p - 0.74) / 0.14, 0, 1);
    const le = 1 - Math.pow(1 - lk, 3);
    lid.position.set(
      THREE.MathUtils.lerp(1.8, 0, le),
      THREE.MathUtils.lerp(3.6, LID_CLOSED, le),
      THREE.MathUtils.lerp(-0.4, 0, le)
    );
    lid.rotation.set(0, 0, THREE.MathUtils.lerp(-0.55, 0, le));

    if (landed !== lastCount && counterEl) {
      if (landed > lastCount && lastCount >= 0 && landed % 16 === 0) {
        playPop(true);
      }
      counterEl.textContent = landed;
      lastCount = landed;
    }

    if (lk >= 0.98 && !playedChime) {
      playedChime = true;
      playChime();
    } else if (lk < 0.4) {
      playedChime = false;
    }
  }

  function resize() {
    // Obtain true bounds from parent container (.jar__pin) to prevent canvas intrinsic feedback loops
    const parent = canvas.parentElement;
    const parentH = parent ? parent.clientHeight : 0;
    const parentW = parent ? parent.clientWidth : 0;

    let w = canvas.clientWidth;
    let h = canvas.clientHeight;

    // Prevent canvas intrinsic aspect ratio from blowing up height beyond parent container
    if (parentH && (h > parentH || !h)) {
      h = parentH;
    }
    if (!w && parentW) {
      w = parentW > 860 ? Math.round(parentW * 0.53) : parentW;
    }
    if (!h) h = window.innerHeight;

    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    const isMobileAspect = camera.aspect < 0.9;
    const isShort = h < 600;

    if (isMobileAspect) {
      // Mobile framing: tall vertical viewport
      camera.position.set(0, 0.45, 10.5);
      camera.lookAt(0, 0.15, 0);
    } else if (isShort) {
      // Short desktop viewport (e.g. 1024x398 or DevTools docked)
      // Pull camera back to give generous clearance above bottom border and prevent clipping
      camera.position.set(0, 0.38, 10.6);
      camera.lookAt(0, 0.18, 0);
    } else {
      // Standard desktop viewport (e.g. 1440x900, 1920x1080)
      camera.position.set(0, 0.45, 9.4);
      camera.lookAt(0, 0.20, 0);
    }
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener("resize", resize);

  if (canvas.parentElement && typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => resize()).observe(canvas.parentElement);
  }

  // Initial layout pass
  layout();

  let isVisible = false;
  let animId = null;

  const observer = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) {
        if (!animId) tick();
      } else {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      }
    },
    { rootMargin: "120px" }
  );
  observer.observe(canvas);

  const clock = new THREE.Clock();
  function tick() {
    if (!isVisible) {
      animId = null;
      return;
    }
    animId = requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    root.rotation.y = t * 0.12 + state.progress * 1.5;
    layout();
    renderer.render(scene, camera);
  }

  return { state, total: N, resize };
}
