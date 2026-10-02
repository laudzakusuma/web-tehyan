# Kedai Tehyan

Next.js 15 (App Router) · TypeScript · Tailwind 3 · Prisma + PostgreSQL · agen AI dengan tool calling.

## Setup
```bash
npm install
cp .env.example .env        # isi DATABASE_URL, LLM_API_KEY, LLM_BASE_URL, LLM_MODEL
npx prisma migrate deploy   # terapkan migrasi yang sudah ada; jangan reset database
npm run db:seed
npm run dev                 # http://localhost:3000
```

## Sudah ada
- Skema database lengkap (user, produk, pesanan + riwayat status, promo, toko, FAQ, percakapan)
- Seed data terpusat di `prisma/seed.ts`
- Halaman Beranda, Menu (pencarian, kategori), detail produk, dan keranjang persisten
- Agen "Tanya Tehyan": sembilan tool tervalidasi, percakapan anonim dengan cookie kepemilikan, retry aman, dan konfirmasi tambah ke keranjang
- Design tokens di `src/styles/tokens.css`

## Belum ada (Stage berikutnya)
Autentikasi pelanggan, checkout/pembayaran, dashboard admin, SEO lanjutan, dan deploy.
Pelacakan melalui agen hanya menampilkan kode/status pesanan yang sudah ada; belum ada alur pembuatan pesanan.

## Tanya Tehyan

LLM memahami bahasa Indonesia dan rujukan percakapan, lalu meminta tool server. Tool memakai layanan aplikasi yang sama dengan halaman web dan mengambil fakta dari PostgreSQL. Model tidak menerima akses Prisma bebas dan tidak dapat mengubah harga, promo, status pesanan, atau izin.

Tool: `searchProducts`, `getProductDetail`, `recommendProducts`, `getActivePromotions`, `listOutlets`, `getOutletDetail`, `addToCart`, `checkOrderStatus`, dan `searchKnowledge`. Rekomendasi memakai budget, kategori, tingkat manis, bestseller, dan ketersediaan yang tersimpan. Suhu tidak memiliki atribut terstruktur. Syarat promo dalam teks belum dapat diverifikasi otomatis.

Konfigurasi server di `.env`: `DATABASE_URL`, `LLM_API_KEY`, `LLM_BASE_URL`, dan `LLM_MODEL`. Endpoint harus mendukung OpenAI-compatible Chat Completions dengan function calling serta `tool_choice`. Jangan menaruh kunci di variabel `NEXT_PUBLIC_*`. Tanpa kunci, chat menampilkan layanan belum dikonfigurasi; aplikasi tidak menggantinya dengan chatbot palsu.

`GET /api/chat` memulihkan riwayat memakai cookie `HttpOnly`. `POST /api/chat` menerima hanya `{ conversationId, requestId, message }`. Server memiliki riwayat dan membatasi konteks serta putaran tool. ID percakapan saja tidak memberi akses. Setelah usulan menu muncul, klik **Tambahkan ke keranjang** untuk menerapkannya ke Zustand. Riwayat yang dimuat ulang tidak menjalankan aksi lama.

Opsional: `CHAT_DEMO_MODE="true"` menampilkan nama tool, hasil berhasil/gagal, dan kejadian aksi dalam panel lipat. Ini jejak eksekusi, tanpa chain-of-thought, prompt, parameter pesanan, atau data privat. Kembalikan ke `false` untuk antarmuka normal; mulai ulang server setelah mengubah konfigurasi.

## Verifikasi AI

```bash
npx prisma validate
npm test
npm run build
```

Pada PowerShell yang memblokir skrip `.ps1`, gunakan `npx.cmd` dan `npm.cmd`. Tidak ada script lint terpisah. Tes tool/runtime memakai mock provider sehingga tidak memerlukan kunci LLM. Tes integrasi memakai `DATABASE_URL`, membuat fixture unik dan membersihkan hanya fixture tersebut; gunakan database pengembangan khusus tes. Jika database tidak dikonfigurasi, tes integrasi dilewati secara eksplisit.

Demo dengan provider nyata: “Minuman di bawah 20 ribu” → “Yang lemon satu” → konfirmasi keranjang → “Outlet Margonda buka jam berapa?” → “Ada Matcha Strawberry?”. Muat ulang untuk memeriksa persistensi. Outlet seed berlabel **Demo**, bukan lokasi bisnis terverifikasi. Retrieval mengurangi halusinasi tetapi bukan jaminan setiap kalimat LLM benar.

Penjelasan arsitektur, batas keamanan, skenario audit, dan pertimbangan produksi: [AI Architecture](docs/AI-ARCHITECTURE.md). Hasil verifikasi pekerjaan: [DEVLOG](docs/DEVLOG.md).
