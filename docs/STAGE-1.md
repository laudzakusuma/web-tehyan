# Kedai Tehyan — Stage 1: Brand, Tokens, Architecture

## Design plan (reviewed against the brief)

**Concept.** A neighborhood tea stall's printed menu board, made digital. The memorable element is the *menu itself*: price lists set like a warung's handwritten board (name, dotted leader, price) rather than a grid of ecommerce cards. Everything else stays quiet.

**Color (tokens.css).** Seduh `#3A2417` · Gading `#F7F1E5` · Kertas `#FFFAF0` · Pasir `#E3D6BD` · Daun `#4A5D36` · Genteng `#A9482A`.
Terracotta is used for exactly one job: the action color (order, add, focus). Green means available/success. No gradients.

**Type.** Fraunces (display, with soft optical axis, used large and light, never bold) + Instrument Sans (UI/body). Sentence case throughout; no all-caps eyebrows, no numbered markers except the real order-status sequence.

**Layout.** Left-aligned, asymmetric 12-col grid. Hero: headline set left at display size, real product photography cropped tight on the right, order CTA anchored under the headline. Menu: two-column "board" on desktop, single list with a sticky category rail on mobile.

```
HERO
+---------------------------------------+
| Teh yang sederhana,        [  photo  ]|
| dibuat dengan rasa         [  glass  ]|
| yang serius.               [  crop   ]|
| [Pesan Sekarang] Lihat menu           |
+---------------------------------------+
MENU BOARD ROW
Teh Tarik Tehyan .............. Rp 14.000  [+]
Teh Lemon Madu ................ Rp 18.000  [+]
```

**What I changed after review.** First draft used a card grid for signature drinks. That is the generic ecommerce default, so it became the leader-dot menu board. Chat entry changed from a floating circle to a labeled bar "Tanya Tehyan" docked bottom-right (bottom sheet on mobile).

## Information architecture

Nav: Beranda · Menu · Tentang Kami · Promo · Lokasi. Primary action: Pesan Sekarang. Utilities: search, cart, account, Tanya Tehyan.
Mobile: top bar (logo, cart) + bottom bar (Beranda, Menu, Pesanan, Akun), sticky cart CTA on menu/product pages.

Routes: `/`, `/menu`, `/menu/[slug]`, `/tentang`, `/promo`, `/lokasi`, `/keranjang`, `/checkout`, `/pesanan/[id]`, `/akun`, `/akun/pesanan`, `/masuk`, `/daftar`, `/admin/*` (dashboard, produk, kategori, pesanan, pelanggan, promo, toko, agen).

## Architecture

```
src/
  app/            routes, layouts, route handlers (thin)
  components/ui/  Button, Input, Select, Modal, Drawer, Badge, Tabs, Toast, Table, EmptyState...
  features/       menu, cart, checkout, orders, admin, chat (UI + hooks per domain)
  server/
    services/     product, cart, order, promotion, store, customer (business logic)
    db/           prisma client, repositories
    auth/         Auth.js config, role guards (enforced in every service call)
    validation/   Zod schemas shared by client and server
  agents/
    tools/        scoped tool definitions (Zod-validated params)
    knowledge/    FAQ/policy retrieval (pgvector or keyword fallback)
    runtime.ts    LLM loop, rate limit, logging
  config/         site, seed data (single file, replaceable)
  styles/tokens.css
prisma/           schema.prisma, migrations, seed.ts
tests/            vitest (services, tools) + playwright (order flow)
```

Rules: components never touch Prisma; services never import React; agent tools call services with the authenticated user id from the session, never from model output; the LLM never writes SQL or calls arbitrary URLs.

## Stack decisions to confirm
Next.js (App Router) + TypeScript + Tailwind, Prisma + PostgreSQL, Auth.js, Zod, Zustand (cart UI only), Vitest + Playwright. LLM via an OpenAI-compatible endpoint (key server-side only).

## Next: Stage 2
Prisma schema + seed, then Navbar, Footer, Homepage, Menu, Product detail.
