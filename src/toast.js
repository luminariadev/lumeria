/**
 * Toast Notification System
 * Retro pill badge popping into view with bounce animation.
 */
import { gsap } from "gsap";

let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    toastContainer.setAttribute("role", "status");
    toastContainer.setAttribute("aria-live", "polite");
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(message, icon = "🍪") {
  const container = getToastContainer();

  const toast = document.createElement("div");
  toast.className = "toast-badge";
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-text">${message}</span>
  `;

  container.appendChild(toast);

  const tl = gsap.timeline({
    onComplete: () => {
      toast.remove();
    },
  });

  tl.fromTo(
    toast,
    { y: 40, opacity: 0, scale: 0.6, rotate: -6 },
    { y: 0, opacity: 1, scale: 1, rotate: 0, duration: 0.5, ease: "back.out(2)" }
  )
    .to(toast, {
      y: -20,
      opacity: 0,
      scale: 0.8,
      duration: 0.4,
      ease: "power2.in",
      delay: 2.2,
    });
}
