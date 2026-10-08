import { products, rupiah, WA_NUMBER } from "./data.js";

const cart = new Map(products.map((p) => [p.id, 0]));
const listeners = new Set();

export const onCartChange = (fn) => listeners.add(fn);
const emit = () => listeners.forEach((fn) => fn(cart));

export function addToCart(id, n = 1) {
  cart.set(id, Math.max(0, (cart.get(id) || 0) + n));
  emit();
}

export function cartCount() {
  let c = 0;
  cart.forEach((q) => (c += q));
  return c;
}

export function initOrder() {
  const wrap = document.getElementById("orderItems");
  const totalEl = document.getElementById("orderTotal");
  const navCount = document.getElementById("navCount");
  const form = document.getElementById("orderForm");
  const msg = document.getElementById("orderMsg");

  wrap.innerHTML = products
    .map(
      (p) => `
    <div class="oi" data-id="${p.id}">
      <img src="${p.img}" alt="" loading="lazy" />
      <div><h3>${p.name}</h3><small>${rupiah(p.price)} / toples 500 gr</small></div>
      <div class="qty">
        <button type="button" data-d="-1" aria-label="Kurangi ${p.name}">−</button>
        <output aria-live="polite">0</output>
        <button type="button" data-d="1" aria-label="Tambah ${p.name}">+</button>
      </div>
    </div>`
    )
    .join("");

  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-d]");
    if (!btn) return;
    addToCart(btn.closest(".oi").dataset.id, +btn.dataset.d);
  });

  let prevCount = 0;
  onCartChange(() => {
    let total = 0;
    products.forEach((p) => {
      const q = cart.get(p.id);
      total += q * p.price;
      const row = wrap.querySelector(`[data-id="${p.id}"]`);
      row.querySelector("output").textContent = q;
      row.classList.toggle("has-qty", q > 0);
    });
    totalEl.textContent = rupiah(total);
    const c = cartCount();
    navCount.textContent = c;
    if (c > prevCount) {
      navCount.classList.remove("bump");
      void navCount.offsetWidth;
      navCount.classList.add("bump");
    }
    prevCount = c;
  });

  // earliest delivery: H+3 (pre-order)
  const d = new Date();
  d.setDate(d.getDate() + 3);
  form.tanggal.min = d.toISOString().slice(0, 10);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    let ok = true;
    ["nama", "kota", "tanggal"].forEach((n) => {
      const bad = !form[n].value.trim();
      form[n].classList.toggle("invalid", bad);
      if (bad) ok = false;
    });
    if (!cartCount()) {
      msg.textContent = "Toplesnya masih kosong — pilih minimal satu kue dulu, ya.";
      return;
    }
    if (!ok) {
      msg.textContent = "Nama, kota, dan tanggal kirim wajib diisi.";
      return;
    }
    const lines = [];
    let total = 0;
    products.forEach((p) => {
      const q = cart.get(p.id);
      if (q) {
        lines.push(`• ${p.name} × ${q} = ${rupiah(q * p.price)}`);
        total += q * p.price;
      }
    });
    const tgl = new Date(form.tanggal.value).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const text =
      `Halo Lumeria! Saya mau pesan:\n\n${lines.join("\n")}\n\nSubtotal: ${rupiah(total)}\n\n` +
      `Nama: ${form.nama.value.trim()}\nKota: ${form.kota.value.trim()}\nKirim: ${tgl}` +
      (form.catatan.value.trim() ? `\nCatatan: ${form.catatan.value.trim()}` : "");
    msg.textContent = "Membuka WhatsApp…";
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  });

  emit();
}
