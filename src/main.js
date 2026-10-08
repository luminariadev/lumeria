/* =========================================================
   LUMERIA — main orchestrator
   GSAP (ScrollTrigger + SplitText-like) · Lenis · Three.js
   Web Audio API · 3D Inspector Modal · Crumbs FX · Toasts
   ========================================================= */
import "./style.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { products, rupiah, faqList } from "./data.js";
import { initHero } from "./hero3d.js";
import { initJar } from "./jar3d.js";
import { initOrder, addToCart, cartCount, onCartChange } from "./order.js";
import { isSoundEnabled, toggleSound, playPop, playBite, playChime, playWhoosh } from "./audio.js";
import { openModal3D } from "./modal3d.js";
import { spawnCrumbs } from "./crumbs.js";
import { showToast } from "./toast.js";

gsap.registerPlugin(ScrollTrigger);

/* =========================================================
   0. UTILS
   ========================================================= */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const mm = gsap.matchMedia();

/** Lightweight word splitter: wraps each word in `<span class="w">` */
function splitWords(el) {
  const text = el.textContent.trim();
  el.innerHTML = text
    .split(/\s+/)
    .map((w) => `<span class="w">${w}</span>`)
    .join(" ");
  return $$(".w", el);
}

/** Lightweight char splitter */
function splitChars(el) {
  const text = el.textContent.trim();
  el.innerHTML = text
    .split("")
    .map((c) => (c === " " ? " " : `<span class="ch">${c}</span>`))
    .join("");
  return $$(".ch", el);
}

/* =========================================================
   1. LENIS smooth scroll
   ========================================================= */
const lenis = new Lenis({
  lerp: 0.1,
  smoothWheel: true,
  wheelMultiplier: 0.9,
});
window.lenis = lenis;

lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((t) => lenis.raf(t * 1000));
gsap.ticker.lagSmoothing(500, 33);

ScrollTrigger.addEventListener("refresh", () => {
  lenis.resize();
  if (jar3d) jar3d.resize();
});

// Anchor links with Lenis (handles pinned sections safely)
$$('a[href^="#"]').forEach((a) =>
  a.addEventListener("click", (e) => {
    const href = a.getAttribute("href");
    if (!href || href === "#") return;
    e.preventDefault();
    const target = $(href);
    if (target) {
      const st = ScrollTrigger.getAll().find((s) => s.trigger === target);
      if (st) {
        lenis.scrollTo(st.start, { offset: 0 });
      } else {
        lenis.scrollTo(target, { offset: 0 });
      }
      closeMenu();
    }
  })
);

/* =========================================================
   2. CUSTOM CURSOR (desktop only)
   ========================================================= */
const cursor = $(".cursor");
let cursorX = 0, cursorY = 0, cx = 0, cy = 0;
function cursorTick() {
  cx += (cursorX - cx) * 0.15;
  cy += (cursorY - cy) * 0.15;
  cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`;
  requestAnimationFrame(cursorTick);
}
if (matchMedia("(hover: hover)").matches) {
  document.addEventListener("pointermove", (e) => {
    cursorX = e.clientX;
    cursorY = e.clientY;
  });
  cursorTick();
}

/* =========================================================
   3. SOUND TOGGLE BUTTON
   ========================================================= */
const soundToggle = $("#soundToggle");
const soundIcon = $("#soundIcon");

function updateSoundButtonUI(active) {
  if (!soundToggle) return;
  soundToggle.classList.toggle("is-muted", !active);
  if (soundIcon) soundIcon.textContent = active ? "🔊" : "🔇";
  const label = soundToggle.querySelector(".sound-text");
  if (label) label.textContent = active ? "Suara: ON" : "Suara: OFF";
}

if (soundToggle) {
  updateSoundButtonUI(isSoundEnabled());
  soundToggle.addEventListener("click", () => {
    const active = toggleSound();
    updateSoundButtonUI(active);
    showToast(active ? "Efek suara diaktifkan 🔊" : "Efek suara dimatikan 🔇", active ? "🔊" : "🔇");
  });
}

/* =========================================================
   4. NAV + MENU
   ========================================================= */
const nav = $("#nav");
const menuBtn = $("#menuBtn");
const menuPanel = $("#menuPanel");
const menuCloseBtn = $("#menuCloseBtn");
let menuOpen = false;

function closeMenu() {
  menuOpen = false;
  if (menuBtn) menuBtn.setAttribute("aria-expanded", "false");
  if (menuPanel) {
    gsap.to(menuPanel, {
      opacity: 0,
      scale: 0.4,
      duration: 0.25,
      ease: "power2.in",
      onComplete: () => menuPanel.classList.remove("open"),
    });
  }
}

function openMenu() {
  menuOpen = true;
  if (menuBtn) menuBtn.setAttribute("aria-expanded", "true");
  playWhoosh();
  if (menuPanel) {
    menuPanel.classList.add("open");
    gsap.fromTo(
      menuPanel,
      { opacity: 0, scale: 0.4 },
      { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2)" }
    );
  }
}

if (menuBtn) {
  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });
}

if (menuCloseBtn) {
  menuCloseBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeMenu();
  });
}

// Auto-close when clicking outside
document.addEventListener("pointerdown", (e) => {
  if (menuOpen && menuPanel && !menuPanel.contains(e.target) && !menuBtn.contains(e.target)) {
    closeMenu();
  }
});

// Dark/light nav based on section
$$("[data-nav-dark]").forEach((sec) => {
  ScrollTrigger.create({
    trigger: sec,
    start: "top 40px",
    end: "bottom 40px",
    onToggle: ({ isActive }) => nav.classList.toggle("is-dark", isActive),
  });
});

/* =========================================================
   5. MAGNETIC BUTTONS
   ========================================================= */
$$("[data-magnetic]").forEach((el) => {
  el.addEventListener("pointermove", (e) => {
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    gsap.to(el, { x: dx * 0.35, y: dy * 0.35, duration: 0.4, ease: "power3.out" });
  });
  el.addEventListener("pointerleave", () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.4)" });
  });
});

/* =========================================================
   6. POP TEXT — elastic word entrance on scroll
   ========================================================= */
$$("[data-pop]").forEach((el) => {
  const words = splitWords(el);
  gsap.set(words, { opacity: 0, scale: 0.2, rotate: -12 });
  ScrollTrigger.create({
    trigger: el,
    start: "top 88%",
    once: true,
    onEnter: () => {
      gsap.to(words, {
        opacity: 1,
        scale: 1,
        rotate: 0,
        duration: 0.9,
        ease: "elastic.out(1, 0.5)",
        stagger: { each: 0.06, from: "start" },
      });
    },
  });
});

/* =========================================================
   7. WORD-FADE — [data-words] paragraphs
   ========================================================= */
$$("[data-words]").forEach((el) => {
  const words = splitWords(el);
  gsap.to(words, {
    opacity: 1,
    stagger: 0.04,
    scrollTrigger: {
      trigger: el,
      start: "top 78%",
      end: "bottom 40%",
      scrub: 0.5,
    },
  });
});

/* =========================================================
   8. [data-fade] paragraphs
   ========================================================= */
$$("[data-fade]").forEach((el) => {
  gsap.from(el, {
    y: 30,
    opacity: 0,
    duration: 0.9,
    ease: "power3.out",
    scrollTrigger: { trigger: el, start: "top 90%", once: true },
  });
});

/* =========================================================
   9. MARQUEE BANDS
   ========================================================= */
const marqueeItems = [
  "NASTAR", "✦", "KASTENGEL", "✦", "SAGU KEJU", "✦",
  "PUTRI SALJU", "✦", "KUE KACANG", "✦", "KUPING GAJAH", "✦",
  "NASTAR", "✦", "KASTENGEL", "✦", "SAGU KEJU", "✦",
  "PUTRI SALJU", "✦", "KUE KACANG", "✦", "KUPING GAJAH", "✦",
];
const starSVG = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0l3.1 8.9L24 12l-8.9 3.1L12 24l-3.1-8.9L0 12l8.9-3.1z"/></svg>`;

$$("[data-marquee]").forEach((track) => {
  const dir = +track.dataset.marquee;
  const html = marqueeItems.map((t) => `<span>${t === "✦" ? starSVG : t}</span>`).join("");
  track.innerHTML = html + html; // double for seamless loop
  const w = track.scrollWidth / 2;

  gsap.set(track, { x: dir > 0 ? 0 : -w });
  gsap.to(track, {
    x: dir > 0 ? -w : 0,
    duration: 32,
    ease: "none",
    repeat: -1,
  });

  // scroll-velocity skew
  ScrollTrigger.create({
    trigger: track.parentElement,
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => {
      gsap.to(track, { skewX: (self.getVelocity() / 600) * dir, duration: 0.5, ease: "power3.out" });
    },
  });
});

/* =========================================================
   10. ABOUT PHOTOS — tilt on scroll
   ========================================================= */
$$(".photo").forEach((el, i) => {
  gsap.from(el, {
    y: 80 + i * 20,
    rotate: i % 2 ? 14 : -14,
    opacity: 0,
    duration: 1.2,
    ease: "power3.out",
    scrollTrigger: { trigger: el, start: "top 95%", once: true },
  });
  // parallax
  gsap.to(el.querySelector("img"), {
    y: -40,
    scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 },
  });
});

/* =========================================================
   11. JELLY PATH on menu section transition
   ========================================================= */
const jelly = $("#jellyPath");
if (jelly) {
  ScrollTrigger.create({
    trigger: "#menu",
    start: "top 85%",
    end: "top 25%",
    scrub: 0.8,
    onUpdate: (self) => {
      const p = self.progress;
      const y1 = 110, amp = 68 * Math.sin(p * Math.PI);
      jelly.setAttribute(
        "d",
        `M1536,0 H0 V${y1} C384,${y1 + amp} 1152,${y1 - amp} 1536,${y1} V0 Z`
      );
    },
  });
}

/* =========================================================
   12. MENU CARDS — dynamic render + 3D Inspect + horizontal scroll
   ========================================================= */
const track = $("#menuTrack");

track.innerHTML =
  products
    .map(
      (p) => `
  <article class="card" style="--bg:${p.bg}" data-id="${p.id}">
    <div class="card__top"><span class="card__tag">${p.tag}</span></div>
    <div class="card__img" title="Klik untuk bedah 3D 360°" style="cursor: pointer;">
      <img src="${p.img}" alt="${p.name}" loading="lazy" draggable="false" />
    </div>
    <div>
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
    </div>
    <div class="card__foot">
      <span class="card__price">${rupiah(p.price)}</span>
      <div style="display: flex; gap: 0.45rem; align-items: center;">
        <button class="card__inspect-btn" type="button" data-inspect="${p.id}" aria-label="Bedah 3D ${p.name}">
          <span>🔍 3D</span>
        </button>
        <button class="card__add" type="button" aria-label="Tambah ${p.name}">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 2v12M2 8h12"/></svg>
          Toples
        </button>
      </div>
    </div>
  </article>`
    )
    .join("") +
  `<div class="card card--end">
    <h3>Sudah pilih?</h3>
    <p>Yuk isi pesanan kamu</p>
    <a href="#pesan" class="pill pill--solid">Pesan sekarang</a>
  </div>`;

// Click delegation on track
track.addEventListener("click", (e) => {
  // Add-to-cart button
  const addBtn = e.target.closest(".card__add");
  if (addBtn) {
    const card = addBtn.closest(".card");
    const id = card.dataset.id;
    const prod = products.find((p) => p.id === id);

    addToCart(id);
    playPop();

    // Spawn crumbs
    const rect = addBtn.getBoundingClientRect();
    spawnCrumbs(rect.left + rect.width / 2, rect.top + rect.height / 2, 16);

    // Toast
    if (prod) showToast(`1x ${prod.name} dimasukkan ke toples!`, "✨");

    // Button animation
    addBtn.classList.add("added");
    gsap.to(addBtn, {
      scale: 1.25,
      duration: 0.2,
      yoyo: true,
      repeat: 1,
      ease: "power2.inOut",
      onComplete: () => setTimeout(() => addBtn.classList.remove("added"), 800),
    });
    return;
  }

  // Inspect 3D button or Card Image click
  const inspectBtn = e.target.closest(".card__inspect-btn");
  const imgWrap = e.target.closest(".card__img");
  if (inspectBtn || imgWrap) {
    const card = (inspectBtn || imgWrap).closest(".card");
    const id = card.dataset.id;
    openModal3D(id);
  }
});

// Custom cursor on cards
track.addEventListener(
  "pointerenter",
  (e) => {
    if (e.target.closest(".card") && !e.target.closest(".card--end")) cursor.classList.add("is-add");
  },
  true
);
track.addEventListener(
  "pointerleave",
  (e) => {
    if (e.target.closest(".card")) cursor.classList.remove("is-add");
  },
  true
);

// Pinned animations managed cleanly in GSAP matchMedia
const menuSec = $(".menu-sec");
const menuProgress = $("#menuProgress");

function initMatchMediaPinned() {
  mm.add(
    {
      isDesktop: "(min-width: 761px)",
      isMobile: "(max-width: 760px)",
    },
    (context) => {
      const { isDesktop } = context.conditions;

      // 1. Horizontal menu scroll (desktop only)
      if (isDesktop) {
        const totalScroll = () => Math.max(100, track.scrollWidth - menuSec.offsetWidth + 80);
        gsap.to(track, {
          x: () => -totalScroll(),
          ease: "none",
          scrollTrigger: {
            trigger: menuSec,
            start: "top top",
            end: () => `+=${totalScroll()}`,
            scrub: 0.5,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              gsap.set(menuProgress, { scaleX: self.progress });
            },
          },
        });
      } else {
        gsap.set(track, { clearProps: "all" });
        gsap.set(menuProgress, { scaleX: 0 });
      }

      // 2. 3D Jar fill animation
      if (jar3d) {
        ScrollTrigger.create({
          trigger: ".jar",
          start: "top top",
          end: isDesktop ? "+=1250" : "+=900",
          pin: true,
          pinSpacing: true,
          scrub: 0.1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            jar3d.state.progress = self.progress;
          },
        });
      }
    }
  );
}

/* =========================================================
   13. STEPS — Dapur entrance with sticky-safe transforms
   ========================================================= */
$$(".step").forEach((el, i) => {
  el.style.setProperty("--step-idx", i);

  gsap.from(el.children, {
    y: 25,
    opacity: 0,
    duration: 0.6,
    stagger: 0.08,
    ease: "power2.out",
    clearProps: "all",
    scrollTrigger: { trigger: el, start: "top 88%", once: true },
  });
});

/* =========================================================
   14. HERO 3D — Three.js constellation
   ========================================================= */
const heroCanvas = $("#heroCanvas");
let hero3d;
function bootHero() {
  hero3d = initHero(heroCanvas);

  // Scroll-driven scatter
  ScrollTrigger.create({
    trigger: ".hero",
    start: "top top",
    end: "bottom top",
    scrub: 0.4,
    onUpdate: (self) => {
      hero3d.state.progress = self.progress;
    },
  });
}

/* =========================================================
   15. JAR 3D — scroll-driven nastar fill
   ========================================================= */
const jarCanvas = $("#jarCanvas");
const jarCountEl = $("#jarCount");
let jar3d;
function bootJar() {
  jar3d = initJar(jarCanvas, jarCountEl);
  initMatchMediaPinned();
}

/* =========================================================
   16. STATS — count-up on scroll
   ========================================================= */
$$("[data-count]").forEach((el) => {
  const target = parseFloat(el.dataset.count);
  const suffix = el.dataset.suffix || "";
  const decimals = parseInt(el.dataset.decimals) || 0;
  const obj = { val: 0 };

  ScrollTrigger.create({
    trigger: el,
    start: "top 85%",
    once: true,
    onEnter: () => {
      gsap.to(obj, {
        val: target,
        duration: 1.6,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent =
            (decimals ? obj.val.toFixed(decimals) : Math.round(obj.val).toLocaleString("id-ID")) + suffix;
        },
      });
    },
  });
});

/* =========================================================
   17. HAMPERS — reveal & interactive picker
   ========================================================= */
const hampMedia = $(".hampers__media");
if (hampMedia) {
  gsap.from(hampMedia, {
    y: 80,
    rotate: 6,
    opacity: 0,
    duration: 1.2,
    ease: "power3.out",
    scrollTrigger: { trigger: hampMedia, start: "top 85%", once: true },
  });
  gsap.to(hampMedia.querySelector("img"), {
    y: -50,
    scrollTrigger: { trigger: hampMedia, start: "top bottom", end: "bottom top", scrub: 0.6 },
  });
}
$$(".packs li").forEach((el, i) => {
  gsap.from(el, {
    x: -40,
    opacity: 0,
    duration: 0.7,
    delay: i * 0.12,
    ease: "power3.out",
    scrollTrigger: { trigger: el, start: "top 88%", once: true },
  });
});

// Hampers Picker Interaction
$$(".hamper-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$(".hamper-btn").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    playPop();

    const pack = btn.dataset.pack;
    const qty = parseInt(btn.dataset.qty) || 4;
    showToast(`Paket Hampers ${pack} (${qty} toples) dipilih! 🎁`, "🎁");

    const form = $("#orderForm");
    if (form && form.catatan) {
      form.catatan.value = `Pesan Paket Hampers ${pack} (${qty} toples)`;
    }
  });
});

/* =========================================================
   18. TESTIMONIALS — horizontal drift on scroll
   ========================================================= */
$$("[data-drift]").forEach((row) => {
  const dir = +row.dataset.drift;
  gsap.to(row, {
    x: () => dir * (row.scrollWidth - window.innerWidth) * 0.4,
    ease: "none",
    scrollTrigger: {
      trigger: row,
      start: "top bottom",
      end: "bottom top",
      scrub: 0.8,
    },
  });
});

$$(".testi blockquote").forEach((el, i) => {
  gsap.from(el, {
    y: 50 + i * 10,
    rotate: parseFloat(getComputedStyle(el).getPropertyValue("--r")) * 2,
    opacity: 0,
    duration: 0.9,
    ease: "back.out(1.5)",
    scrollTrigger: { trigger: el, start: "top 95%", once: true },
  });
});

/* =========================================================
   19. FAQ ACCORDION
   ========================================================= */
const faqContainer = $("#faqList");
if (faqContainer) {
  faqContainer.innerHTML = faqList
    .map(
      (item, idx) => `
    <div class="faq__item" data-idx="${idx}">
      <button class="faq__btn" type="button" aria-expanded="false">
        <span>${item.q}</span>
        <span class="faq__icon" aria-hidden="true">+</span>
      </button>
      <div class="faq__answer">
        <div class="faq__answer-inner">
          <p>${item.a}</p>
        </div>
      </div>
    </div>`
    )
    .join("");

  faqContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".faq__btn");
    if (!btn) return;

    const item = btn.closest(".faq__item");
    const isOpen = item.classList.contains("is-active");

    // Close all other items
    $$(".faq__item", faqContainer).forEach((other) => {
      if (other !== item) {
        other.classList.remove("is-active");
        other.querySelector(".faq__btn").setAttribute("aria-expanded", "false");
        other.querySelector(".faq__answer").style.maxHeight = null;
      }
    });

    if (isOpen) {
      item.classList.remove("is-active");
      btn.setAttribute("aria-expanded", "false");
      item.querySelector(".faq__answer").style.maxHeight = null;
      playWhoosh();
    } else {
      item.classList.add("is-active");
      btn.setAttribute("aria-expanded", "true");
      const ans = item.querySelector(".faq__answer");
      ans.style.maxHeight = ans.scrollHeight + "px";
      playPop();
    }
  });
}

/* =========================================================
   20. FLOATING QUICK CART BAR
   ========================================================= */
const floatBar = $("#floatingCart");
const floatCount = $("#floatCount");
const floatTotal = $("#floatTotal");

onCartChange((cart) => {
  let count = 0;
  let total = 0;
  products.forEach((p) => {
    const q = cart.get(p.id) || 0;
    count += q;
    total += q * p.price;
  });

  if (floatBar) {
    floatBar.classList.toggle("is-visible", count > 0);
  }
  if (floatCount) {
    floatCount.textContent = `${count} toples`;
  }
  if (floatTotal) {
    floatTotal.textContent = rupiah(total);
  }
});

/* =========================================================
   21. FOOTER — big text char stagger
   ========================================================= */
const footerBig = $(".footer__big");
if (footerBig) {
  const chars = splitChars(footerBig);
  gsap.from(chars, {
    y: 80,
    opacity: 0,
    rotate: 12,
    stagger: 0.04,
    duration: 0.8,
    ease: "back.out(1.6)",
    scrollTrigger: { trigger: footerBig, start: "top 90%", once: true },
  });
}

/* =========================================================
   22. ORDER FORM init
   ========================================================= */
initOrder();

/* =========================================================
   23. LOADER SEQUENCE
   ========================================================= */
const loader = $("#loader");
const loaderBar = $(".loader__bar span");
const loaderStatus = $(".loader__status");
const curtains = $$(".loader__curtains svg path");
const jarBalls = $$(".lj-balls circle");
const jarLid = $$(".lj-lid");

const statusTexts = [
  "Menimbang mentega…",
  "Mengayak tepung…",
  "Memasak selai nanas…",
  "Membentuk adonan…",
  "Memanggang kue…",
  "Menaburkan gula…",
  "Mengisi toples…",
  "Siap disajikan!",
];

function runLoader() {
  document.body.classList.add("is-loading");
  lenis.stop();

  const tl = gsap.timeline({
    onComplete: () => {
      document.body.classList.remove("is-loading");
      lenis.start();
      hero3d && hero3d.intro(0);
      playChime();
    },
  });

  // Animate balls dropping in
  jarBalls.forEach((ball, i) => {
    const orig = { cx: +ball.getAttribute("cx"), cy: +ball.getAttribute("cy") };
    gsap.set(ball, { attr: { cy: -40 }, scale: 0.3, transformOrigin: "center" });
    tl.to(
      ball,
      {
        attr: { cy: orig.cy },
        scale: 1,
        duration: 0.5,
        ease: "bounce.out",
      },
      0.12 + i * 0.08
    );
  });

  // Lid bounce
  gsap.set(jarLid, { y: -60 });
  tl.to(jarLid, { y: 0, duration: 0.5, ease: "bounce.out" }, 0.05);

  // Loader bar
  tl.to(loaderBar, { width: "100%", duration: 2.6, ease: "power1.inOut" }, 0);

  // Status texts
  const interval = 2.6 / statusTexts.length;
  statusTexts.forEach((txt, i) => {
    tl.call(
      () => {
        loaderStatus.textContent = txt;
      },
      null,
      i * interval
    );
  });

  // Exit: curtains peel away with a curve
  tl.to(
    curtains[2],
    {
      attr: { d: "M0 0 L100 0 L100 100 Q50 -20 0 100 Z" },
      duration: 0.5,
      ease: "power3.in",
    },
    "+=0.15"
  )
    .to(curtains[2], { attr: { d: "M0 -120 L100 -120 L100 -20 Q50 -120 0 -20 Z" }, duration: 0.45, ease: "power3.in" })
    .to(
      curtains[1],
      {
        attr: { d: "M0 0 L100 0 L100 100 Q50 -30 0 100 Z" },
        duration: 0.5,
        ease: "power3.in",
      },
      "<-0.3"
    )
    .to(curtains[1], { attr: { d: "M0 -120 L100 -120 L100 -20 Q50 -120 0 -20 Z" }, duration: 0.45, ease: "power3.in" })
    .to(
      curtains[0],
      {
        attr: { d: "M0 0 L100 0 L100 100 Q50 -40 0 100 Z" },
        duration: 0.5,
        ease: "power3.in",
      },
      "<-0.3"
    )
    .to(curtains[0], { attr: { d: "M0 -120 L100 -120 L100 -20 Q50 -120 0 -20 Z" }, duration: 0.45, ease: "power3.in" })
    .set(loader, { display: "none" });
}

/* =========================================================
   24. BOOT
   ========================================================= */
function boot() {
  bootHero();
  bootJar();
  runLoader();
  ScrollTrigger.refresh();
}

// Wait for fonts + images before first paint
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    requestAnimationFrame(boot);
  });
} else {
  window.addEventListener("load", boot);
}
