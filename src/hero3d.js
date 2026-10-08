import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { gsap } from "gsap";
import { makers } from "./cookies.js";

/** Floating cookie constellation behind/around the hero title. */
export function initHero(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 12);

  const key = new THREE.DirectionalLight("#fff0d6", 2.4);
  key.position.set(4, 6, 7);
  const rim = new THREE.DirectionalLight("#ffae6b", 1.6);
  rim.position.set(-6, 2, -5);
  scene.add(key, rim, new THREE.HemisphereLight("#fff6e6", "#9b5a33", 0.7));

  // [maker, x, y, z, scale, tilt]
  const layout = [
    ["nastar", 0, -0.55, 1.2, 1.55, [0.25, 0, 0.08], true],
    ["kastengel", -3.9, 1.55, -0.8, 0.95, [0.5, 0.6, 0.5]],
    ["putri", 3.7, 1.75, -0.4, 1.15, [1.1, 0.4, 0.2]],
    ["sagu", -3.4, -1.75, 0.6, 0.85, [0.7, 0, 0.3]],
    ["kacang", 3.6, -1.65, 0.9, 0.75, [0.4, 0, -0.3]],
    ["kuping", -0.9, 2.45, -2.6, 0.85, [1.15, 0, 0.3]],
    ["nastar", 2.05, 0.35, 2.6, 0.5, [0.3, 0, -0.2]],
    ["putri", -2.1, 0.15, 2.8, 0.5, [1.2, 1.2, 0]],
    ["sagu", 5.8, 0.1, -2.2, 0.7, [0.9, 0, 0.4]],
    ["kastengel", -6, -0.1, -2.4, 0.75, [0.2, 1.4, 0.8]],
    ["kuping", 1.6, -2.7, -1.2, 0.6, [1.25, 0, -0.4]],
  ];

  const items = layout.map(([type, x, y, z, s, tilt, hero], i) => {
    const wrap = new THREE.Group();
    const float = new THREE.Group();
    const model = makers[type]();
    model.rotation.set(...tilt);
    float.add(model);
    wrap.add(float);
    scene.add(wrap);
    const out = new THREE.Vector3(x, y, 0).normalize();
    if (hero) out.set(0, 0, 0);
    return {
      wrap, float, model, hero: !!hero,
      base: new THREE.Vector3(x, y, z),
      scale: s,
      out,
      spin: (Math.random() * 0.25 + 0.1) * (i % 2 ? 1 : -1),
      phase: Math.random() * Math.PI * 2,
      fly: 0.5 + Math.random() * 0.6,
      intro: 0,
    };
  });

  const state = { progress: 0, mx: 0, my: 0, cx: 0, cy: 0, spread: 1, visible: true };

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    state.spread = THREE.MathUtils.clamp(camera.aspect / 1.75, 0.38, 1);
    state.sizeK = THREE.MathUtils.clamp(0.55 + camera.aspect * 0.28, 0.7, 1);
  }
  resize();
  window.addEventListener("resize", resize);

  window.addEventListener("pointermove", (e) => {
    state.mx = (e.clientX / window.innerWidth) * 2 - 1;
    state.my = (e.clientY / window.innerHeight) * 2 - 1;
  });

  let animId = null;
  new IntersectionObserver(
    ([e]) => {
      state.visible = e.isIntersecting;
      if (state.visible) {
        if (!animId) tick();
      } else {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      }
    },
    { rootMargin: "120px" }
  ).observe(canvas);

  const clock = new THREE.Clock();
  function tick() {
    if (!state.visible) {
      animId = null;
      return;
    }
    animId = requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    state.cx += (state.mx - state.cx) * 0.04;
    state.cy += (state.my - state.cy) * 0.04;
    camera.position.x = state.cx * 0.7;
    camera.position.y = -state.cy * 0.45;
    camera.lookAt(0, 0, 0);

    const p = state.progress;
    for (const it of items) {
      const s = it.scale * state.sizeK * it.intro;
      it.wrap.scale.setScalar(it.hero ? s * (1 + p * 0.5) : s);
      const fly = p * p * 9 * it.fly;
      it.wrap.position.set(
        it.base.x * state.spread + it.out.x * fly,
        it.base.y + it.out.y * fly + (it.hero ? p * 1.4 : 0),
        it.base.z + p * (it.hero ? 2 : 5) * it.fly
      );
      it.float.position.y = Math.sin(t * 0.9 + it.phase) * 0.12;
      it.float.rotation.z = Math.sin(t * 0.6 + it.phase) * 0.08;
      it.model.rotation.y += it.spin * dt + (it.hero ? dt * 0.25 : 0);
      it.wrap.rotation.x = p * (it.hero ? 0.8 : 2.4) * it.fly;
    }
    renderer.render(scene, camera);
  }

  return {
    state,
    intro(delay = 0) {
      items.forEach((it, i) => {
        gsap.to(it, { intro: 1, duration: 1.4, delay: delay + (it.hero ? 0 : 0.15 + i * 0.06), ease: "elastic.out(1, 0.55)" });
        gsap.from(it.model.rotation, { y: it.model.rotation.y - Math.PI * 1.5, duration: 2, delay: delay + i * 0.05, ease: "power3.out" });
      });
    },
  };
}
