# Kedai Tehyan — Development Status

Updated: 2026-10-01

## Product target

Kedai Tehyan is intended as a production-oriented full-stack F&B web app, not only a landing page. The target customer flow includes menu discovery, product detail, cart, checkout, order tracking, account, promotions, and store information. The target back office includes product/category/order/customer/promotion/store/FAQ/agent management. “Tanya Tehyan” is an agent that must use server-side tools and real business data instead of inventing menu, price, store, promotion, or order information.

The visual direction is warm, local, editorial, and distinctly Indonesian: tea brown, ivory, botanical green, and terracotta; restrained radii/shadows; no generic SaaS dashboard look or purple/blue AI gradients.

## Current implementation

### Working foundation
- Next.js App Router + TypeScript + Tailwind.
- Prisma/PostgreSQL domain models for users, products, categories, orders, promotions, store hours, FAQ, and conversations.
- Seed data for menu, store, promotions, and FAQ.
- Server service layer between routes/components and Prisma.
- Homepage and searchable/filterable menu.
- Product detail route `/menu/[slug]`.
- Persistent client cart (`localStorage`) with quantity controls and `/keranjang`.
- Cart count in the site header.
- Agent endpoint `/api/chat` with structured tools and Zod validation.
- Agent `addToCart` actions now update the real client cart.
- Chat history is reconstructed from the database instead of trusting assistant/user history supplied by the browser.

### Still missing
- Checkout and server-authoritative order creation.
- Delivery fee calculation and promotion engine.
- Authentication/session handling and customer account.
- Customer order tracking flow.
- Admin dashboard and CRUD workflows.
- Product option model/UI (sugar, ice, size, topping) with server-side pricing rules.
- Rich agent response cards/recommendation UI.
- Production rate limiting (Redis/Upstash or equivalent).
- Tests (unit/integration/E2E), CI, observability, and deployment configuration.
- SEO extras such as sitemap and JSON-LD.
- Final photography/assets and complete content pages.

## Important technical notes

1. `prisma/seed.ts` still contains placeholder store address and phone data. Replace them with real business data before release.
2. The current in-memory chat rate limiter is only suitable for local/single-instance development.
3. Anonymous conversation IDs are high-entropy IDs, but true ownership must be enforced after authentication is added.
4. Client cart prices are display state only. Checkout must always re-fetch product prices and availability from PostgreSQL before creating an order.
5. No dependency lockfile was present in the uploaded archive, so dependency resolution is not reproducible yet. Generate and commit one once dependencies can be installed.

## Recommended implementation order

1. **Checkout + order service** — validate cart server-side, calculate subtotal/fees/promos, create order + initial history atomically, show confirmation.
2. **Order tracking** — guest-safe lookup first, then bind orders to authenticated users.
3. **Auth.js** — credentials/session, customer account, role guards, admin access.
4. **Admin** — orders first, then product/category/promo/store/FAQ management.
5. **Agent v2** — authenticated order tools, structured recommendation cards, cart/order context.
6. **Quality/release** — Vitest, Playwright, security checks, SEO, analytics/monitoring, deployment.

## Verification note

A full `npm install`/`next build` could not be completed in the current sandbox because the npm registry lookup returned `EAI_AGAIN`. A TypeScript parse/type pass using the globally available compiler showed only expected missing-dependency/type-definition errors and no additional syntax diagnostics from the newly added source files.
