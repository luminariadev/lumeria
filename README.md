# 🍪 Lumeria — Website Kue Kering Rumahan

Landing page interaktif premium untuk usaha kue kering rumahan (**Nastar, Kastengel, Sagu Keju, Putri Salju, Kue Kacang, Kuping Gajah**), dengan animasi scroll dinamis (**GSAP ScrollTrigger + Lenis**), 3D procedural modeling (**Three.js**), dan desain retro-artisan khas bakery yang hangat, anti-*AI-slop*, terinspirasi dari standar desain [cravburgers.shop](https://www.cravburgers.shop/).

---

## ✨ Fitur Utama

1. **Procedural 3D Cookies Engine (Three.js)**:
   - Dibuat secara prosedural (tanpa perlu file `.glb`/`.gltf` berat eksternal, aset berukuran kilobyte dan load seketika).
   - Varian 3D:
     - **Nastar Klasik**: Kubah keemasan dengan retakan butter, olesan kuning telur mengkilap, dan mahkota cengkeh 3D asli.
     - **Kastengel Edam**: Balok renyah dengan parutan keju Edam Belanda di atasnya.
     - **Putri Salju**: Bulan sabit berselimut butiran gula halus.
     - **Sagu Keju**: Bentuk kelopak bunga spuit 8 kelopak dengan lekukan spiral khas santan pandan.
     - **Kue Kacang**: Kubah kacang renyah dengan butiran wijen sangrai di atasnya.
     - **Kuping Gajah**: Kepingan tipis bertekstur renyah dengan spiral motif cokelat-vanila.

2. **3D Interactive Features**:
   - **Hero 3D Constellation**: Taburan kue 3D melayang dengan interaksi mouse parallax & efek menyebar saat halaman di-scroll.
   - **Scroll-Driven 3D Toples**: Toples kaca dengan nastar 3D yang jatuh membal (*bounce physics*) satu per satu seiring scroll, counter butir terisi dinamis, dan tutup merah bersegel terpasang di akhir.
   - **3D Cookie Inspector Modal (Bedah Kue 360°)**: Klik kartu kue mana saja untuk memutar kue 360° secara interaktif, tombol interaktif "Bite / Gigit!" bersuara renyah, dan detail anatomi rasa & bahan baku.

3. **Audio Synthesizer Prosedural (Web Audio API)**:
   - Tanpa file MP3 eksternal (100% offline & instan tanpa buffering).
   - Suara gigitan kue renyah (*pastry crunch*), letupan kartun saat tambah toples (*juicy pop*), denting toples (*glass chime*), dan desau transisi (*whoosh*).
   - Tombol toggle suara `🔊 Suara: ON/OFF` di navbar dengan memori `localStorage`.

4. **Kaya Animasi & Micro-interactions (GSAP + Lenis)**:
   - Smooth scrolling dengan **Lenis**.
   - Elastic word pop entrance (`data-pop`).
   - Marquee dua arah miring (*skew on scroll velocity*).
   - Menu horizontal scroll dengan indikator progres bar.
   - SVG Jelly wave morphing pada transisi section.
   - Partikel remah kue keemasan (*crumb burst*) saat tombol ditekan.
   - Toast notification melayang saat toples ditambah.

5. **Sistem Pemesanan Langsung ke WhatsApp**:
   - Hitung subtotal dinamis secara real-time.
   - Pilihan tanggal pengiriman otomatis terkunci minimal H+3 (khas pre-order kue fresh dari oven).
   - Generate template pesan WhatsApp terstruktur rapi ke nomor penjual.
   - Floating quick cart bar di bagian bawah layar.

6. **Katalog Hampers & Tanya Jawab (FAQ)**:
   - Pilihan paket Hampers siap bungkus (Paket 3, 4, atau 6 toples).
   - Accordion FAQ seputar masa simpan kue, keamanan kirim luar kota, bahan mentega Wijsman, dan pesanan kantor.

---

## 🚀 Cara Menjalankan

### Kebutuhan:
- **Node.js** v18+ (disarankan v20+)
- **npm**

### Instalasi:
```bash
# Clone atau buka direktori proyek
cd lumeria

# Install dependencies
npm install

# Jalankan server lokal Vite (Port 3000)
npm run dev
```

Buka peramban di: `http://localhost:3000`

### Build untuk Produksi:
```bash
npm run build
```
File hasil build akan berada di direktori `dist/` dan siap di-deploy ke Vercel, Netlify, Cloudflare Pages, atau hosting statis lainnya.

---

## 🛠️ Pengaturan & Kustomisasi

Seluruh data produk, harga, deskripsi, dan nomor WhatsApp dapat diubah di satu file:

📁 **`src/data.js`**:
```javascript
export const WA_NUMBER = "6281200000000"; // Ganti dengan nomor WhatsApp pemilik usaha

export const products = [
  {
    id: "nastar",
    name: "Nastar Klasik",
    price: 135000,
    // ...
  },
  // Tambah atau ubah produk lainnya
];
```

---

## 📂 Struktur Proyek

```
lumeria/
├── index.html            # Struktur HTML landing page lengkap
├── package.json          # Vite, GSAP, Lenis, Three.js
├── vite.config.js        # Konfigurasi bundler Vite
├── public/
│   └── img/              # Foto editorial & bahan baku kue
└── src/
    ├── style.css         # Design tokens, tipografi retro, layout responsive
    ├── data.js           # Katalog kue, harga, anatomi rasa, FAQ, nomor WhatsApp
    ├── cookies.js        # Geometri prosedural 3D (Nastar, Kastengel, Putri Salju, dll)
    ├── hero3d.js         # Scene 3D Three.js pada Hero section
    ├── jar3d.js          # Scene 3D Three.js toples nastar scroll-driven
    ├── modal3d.js        # Modal 3D Inspector 360° interaktif
    ├── audio.js          # Synthesizer efek suara Web Audio API
    ├── crumbs.js         # Partikel remah kue berhamburan saat klik
    ├── toast.js          # Pop-up badge notifikasi toples
    ├── order.js          # State keranjang & komposer format pesan WhatsApp
    └── main.js           # Orkestrator utama GSAP, Lenis, dan Three.js
```
