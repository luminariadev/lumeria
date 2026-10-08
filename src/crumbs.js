/**
 * Crumbs Particle Burst
 * Creates delicious buttery pastry crumbs scattering on click / interaction.
 */
import { gsap } from "gsap";

const CRUMB_COLORS = [
  "#E9A03B", // golden crust
  "#F3D79C", // pale butter crumb
  "#C97A1C", // toasted bake
  "#3A1A0E", // cocoa / clove
  "#F6C85F", // edam cheese flake
];

let container = null;

function getContainer() {
  if (!container) {
    container = document.createElement("div");
    container.className = "crumbs-layer";
    container.setAttribute("aria-hidden", "true");
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Spawns a burst of cookie crumbs at screen coordinate (x, y).
 */
export function spawnCrumbs(x, y, count = 16) {
  const layer = getContainer();

  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.className = "crumb-particle";

    const size = Math.random() * 8 + 4; // 4px to 12px
    const color = CRUMB_COLORS[Math.floor(Math.random() * CRUMB_COLORS.length)];
    const isRound = Math.random() > 0.4;

    el.style.width = `${size}px`;
    el.style.height = `${isRound ? size : size * 0.55}px`;
    el.style.borderRadius = isRound ? "50%" : "2px";
    el.style.backgroundColor = color;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;

    layer.appendChild(el);

    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 90 + 35;
    const destX = Math.cos(angle) * distance;
    const destY = Math.sin(angle) * distance - 25; // slight upward bounce
    const gravity = Math.random() * 70 + 60;
    const rotate = (Math.random() - 0.5) * 540;

    gsap.timeline({
      onComplete: () => {
        el.remove();
      },
    })
      .to(el, {
        x: destX,
        y: destY,
        rotation: rotate,
        duration: 0.35 + Math.random() * 0.15,
        ease: "power2.out",
      })
      .to(
        el,
        {
          y: `+=${gravity}`,
          opacity: 0,
          scale: 0.4,
          duration: 0.45 + Math.random() * 0.25,
          ease: "power2.in",
        },
        "-=0.1"
      );
  }
}
