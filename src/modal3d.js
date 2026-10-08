/**
 * 3D Cookie Inspector Modal (Bedah Kue 360°)
 * Interactive Three.js viewer with drag-to-rotate, bite button, anatomy breakdown, and sound fx.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { gsap } from "gsap";
import { makers } from "./cookies.js";
import { products, rupiah } from "./data.js";
import { addToCart } from "./order.js";
import { playBite, playPop, playWhoosh } from "./audio.js";
import { spawnCrumbs } from "./crumbs.js";
import { showToast } from "./toast.js";

let modalEl = null;
let canvasEl = null;
let currentProduct = null;
let renderer = null;
let scene = null;
let camera = null;
let activeMesh = null;
let isDragging = false;
let prevPointerX = 0;
let prevPointerY = 0;
let rotVelocityX = 0;
let rotVelocityY = 0;
let autoSpin = true;
let animFrameId = null;
let isModalOpen = false;
let renderLoopFn = null;

function createModalDOM() {
  if (modalEl) return;

  modalEl = document.createElement("div");
  modalEl.className = "modal-3d";
  modalEl.id = "modal3d";
  modalEl.setAttribute("role", "dialog");
  modalEl.setAttribute("aria-modal", "true");
  modalEl.setAttribute("aria-hidden", "true");

  modalEl.innerHTML = `
    <div class="modal-3d__backdrop"></div>
    <div class="modal-3d__dialog">
      <button class="modal-3d__close" type="button" aria-label="Tutup jendela bedah kue">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>

      <div class="modal-3d__body">
        <!-- 3D Canvas side -->
        <div class="modal-3d__canvas-wrap">
          <div class="modal-3d__hint">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
            <span>Geser untuk putar 360°</span>
          </div>
          <canvas class="modal-3d__canvas" id="inspectCanvas"></canvas>
          <div class="modal-3d__canvas-actions">
            <button class="pill pill--solid bite-btn" type="button" id="biteBtn">
              <span>Bite / Gigit! 🍪</span>
            </button>
          </div>
        </div>

        <!-- Info & Anatomy side -->
        <div class="modal-3d__info">
          <div class="modal-3d__tags" id="modalTags"></div>
          <h2 class="modal-3d__title stroke" id="modalTitle"></h2>
          <p class="modal-3d__desc" id="modalDesc"></p>

          <div class="modal-3d__anatomy">
            <h4 class="modal-3d__anatomy-heading">Anatomi Rasa & Bahan</h4>
            <div class="modal-3d__anatomy-list" id="modalAnatomy"></div>
          </div>

          <div class="modal-3d__footer">
            <div class="modal-3d__price-box">
              <span class="modal-3d__price-label">Harga Toples 500 gr</span>
              <span class="modal-3d__price stroke stroke--cream" id="modalPrice"></span>
            </div>
            <button class="blob-btn blob-btn--cream modal-3d__add-btn" type="button" id="modalAddBtn" data-magnetic>
              <svg viewBox="-10 -10 602 475" preserveAspectRatio="none" aria-hidden="true"><path d="M310.777 0.20434C424.154 2.91791 540.733 50.9739 574.176 159.34C606.479 264.014 533.962 365.999 442.064 425.623C364.995 475.626 270.863 455.893 193.524 406.309C93.8313 342.395 -27.3608 259.503 5.48889 145.729C40.0621 25.9857 186.179 -2.77783 310.777 0.20434Z" /></svg>
              <span>+ Masukkan Toples</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalEl);

  canvasEl = document.getElementById("inspectCanvas");
  initThreeInspector();

  // Close handlers
  modalEl.querySelector(".modal-3d__close").addEventListener("click", closeModal);
  modalEl.querySelector(".modal-3d__backdrop").addEventListener("click", closeModal);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalEl.classList.contains("is-open")) {
      closeModal();
    }
  });

  // Bite button
  document.getElementById("biteBtn").addEventListener("click", (e) => {
    playBite();
    const rect = canvasEl.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    spawnCrumbs(x, y, 22);

    if (activeMesh) {
      gsap.timeline()
        .to(activeMesh.scale, { x: 1.25, y: 0.82, z: 1.25, duration: 0.12, ease: "power2.out" })
        .to(activeMesh.scale, { x: 1, y: 1, z: 1, duration: 0.45, ease: "elastic.out(1.2, 0.4)" });
    }
  });

  // Add to cart from modal
  document.getElementById("modalAddBtn").addEventListener("click", (e) => {
    if (!currentProduct) return;
    playPop();
    addToCart(currentProduct.id, 1);
    showToast(`1x ${currentProduct.name} masuk toples!`, "✨");

    const rect = e.currentTarget.getBoundingClientRect();
    spawnCrumbs(rect.left + rect.width / 2, rect.top + rect.height / 2, 14);

    const btn = e.currentTarget;
    gsap.timeline()
      .to(btn, { scale: 0.92, duration: 0.1 })
      .to(btn, { scale: 1, duration: 0.4, ease: "back.out(2)" });
  });

  // Canvas interaction
  canvasEl.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
}

function initThreeInspector() {
  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.8;

  camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0.8, 4.2);
  camera.lookAt(0, 0, 0);

  const keyLight = new THREE.DirectionalLight("#fff5e6", 2.6);
  keyLight.position.set(4, 5, 5);
  const fillLight = new THREE.DirectionalLight("#ffd8ad", 1.4);
  fillLight.position.set(-4, -1, -3);
  scene.add(keyLight, fillLight, new THREE.HemisphereLight("#fff", "#8c532b", 0.85));

  function resize() {
    if (!canvasEl) return;
    const w = canvasEl.clientWidth;
    const h = canvasEl.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);

  const clock = new THREE.Clock();
  function renderLoop() {
    if (!isModalOpen) return;
    animFrameId = requestAnimationFrame(renderLoop);
    const dt = Math.min(clock.getDelta(), 0.05);
    const time = clock.getElapsedTime();

    if (activeMesh) {
      if (autoSpin && !isDragging) {
        activeMesh.rotation.y += 0.45 * dt;
      }

      // Apply drag momentum
      if (!isDragging) {
        activeMesh.rotation.y += rotVelocityX;
        activeMesh.rotation.x += rotVelocityY;
        rotVelocityX *= 0.92;
        rotVelocityY *= 0.92;
      }

      // Subtle float
      activeMesh.position.y = Math.sin(time * 1.8) * 0.05;
    }

    renderer.render(scene, camera);
  }
  renderLoopFn = renderLoop;
}

function onPointerDown(e) {
  isDragging = true;
  autoSpin = false;
  prevPointerX = e.clientX;
  prevPointerY = e.clientY;
  rotVelocityX = 0;
  rotVelocityY = 0;
}

function onPointerMove(e) {
  if (!isDragging || !activeMesh) return;
  const dx = e.clientX - prevPointerX;
  const dy = e.clientY - prevPointerY;
  prevPointerX = e.clientX;
  prevPointerY = e.clientY;

  rotVelocityX = dx * 0.008;
  rotVelocityY = dy * 0.008;

  activeMesh.rotation.y += rotVelocityX;
  activeMesh.rotation.x += rotVelocityY;
}

function onPointerUp() {
  isDragging = false;
  setTimeout(() => {
    if (!isDragging) autoSpin = true;
  }, 3500);
}

export function openModal3D(productId) {
  createModalDOM();
  const product = products.find((p) => p.id === productId);
  if (!product) return;
  currentProduct = product;

  playWhoosh();

  // Populate data
  document.getElementById("modalTitle").textContent = product.name;
  document.getElementById("modalDesc").textContent = product.desc;
  document.getElementById("modalPrice").textContent = rupiah(product.price);

  // Tasting notes tags
  const tagsEl = document.getElementById("modalTags");
  tagsEl.innerHTML = (product.tastingNotes || [product.tag])
    .map((tag) => `<span class="modal-3d__tag">${tag}</span>`)
    .join("");

  // Anatomy list
  const anatomyEl = document.getElementById("modalAnatomy");
  anatomyEl.innerHTML = (product.anatomy || [])
    .map(
      (item, idx) => `
    <div class="anatomy-card">
      <span class="anatomy-card__num">0${idx + 1}</span>
      <div>
        <h5 class="anatomy-card__title">${item.title}</h5>
        <p class="anatomy-card__desc">${item.desc}</p>
      </div>
    </div>`
    )
    .join("");

  // Update 3D model
  if (activeMesh) {
    scene.remove(activeMesh);
    activeMesh = null;
  }

  const maker = makers[product.makerKey || product.id];
  if (maker) {
    activeMesh = maker();
    // Normalize scale and tilt
    activeMesh.scale.setScalar(1.35);
    activeMesh.rotation.set(0.2, -0.4, 0);
    scene.add(activeMesh);
  }

  modalEl.classList.add("is-open");
  modalEl.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  isModalOpen = true;
  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (renderLoopFn) animFrameId = requestAnimationFrame(renderLoopFn);

  // Trigger resize
  const w = canvasEl.clientWidth;
  const h = canvasEl.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  // Dialog entrance animation
  const dialog = modalEl.querySelector(".modal-3d__dialog");
  gsap.fromTo(
    dialog,
    { scale: 0.85, opacity: 0, y: 30 },
    { scale: 1, opacity: 1, y: 0, duration: 0.45, ease: "back.out(1.5)" }
  );

  // Animate 3D model entrance
  if (activeMesh) {
    gsap.fromTo(
      activeMesh.scale,
      { x: 0.2, y: 0.2, z: 0.2 },
      { x: 1.35, y: 1.35, z: 1.35, duration: 0.65, ease: "elastic.out(1, 0.5)" }
    );
  }
}

export function closeModal() {
  if (!modalEl || !modalEl.classList.contains("is-open")) return;
  isModalOpen = false;
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }

  const dialog = modalEl.querySelector(".modal-3d__dialog");
  gsap.to(dialog, {
    scale: 0.9,
    opacity: 0,
    y: 20,
    duration: 0.25,
    ease: "power2.in",
    onComplete: () => {
      modalEl.classList.remove("is-open");
      modalEl.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      if (activeMesh) {
        scene.remove(activeMesh);
        activeMesh = null;
      }
    },
  });
}
