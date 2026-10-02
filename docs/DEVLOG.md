# Development Log

Status terbaru: PostgreSQL sudah pulih dan seluruh 161 tes lulus. Penerimaan Gemini masih terhalang HTTP 503/429; lihat [Gemini + PostgreSQL Live Acceptance](#gemini--postgresql-live-acceptance) yang ditambahkan di akhir dokumen. Catatan datasource hilang di bawah merupakan hasil sesi sebelumnya.

## Gemini Live Acceptance Test

Tanggal: **2026-10-02**. Status: **partial; penerimaan lengkap terblokir `DATABASE_URL` yang tidak tersedia**.

### Goal

Menguji provider Gemini live pada agen yang sudah ada, mempertahankan SDK, tool, Zod, services, UI action, database, dan seluruh tes sebelumnya. Provider: Google Gemini; model: `gemini-3.8-flash`; base URL: `https://generativelanguage.googleapis.com/v1beta/openai/`; interface: SDK OpenAI `chat.completions.create`, non-streaming function calling. Nilai API key tidak diperiksa atau dicatat; `.env` tidak dibuka, ditampilkan, atau diubah.

### Inspection / Compatibility Changes

Inspeksi provider/runtime/registry/schema/prompt/error handling mengonfirmasi interface sudah kompatibel OpenAI. Uji pertama memakai implementasi tanpa perubahan. Completion minimal live tanpa tool berhasil (`OK`, HTTP 200), sementara beberapa panggilan tool mendapat HTTP 503 yang tidak konsisten. Probe request-only untuk schema/default/tool_choice tidak menghasilkan bukti bug schema; tidak ada schema atau tool_choice yang diubah.

Bug kompatibilitas nyata ditemukan pada kelanjutan tool: Gemini mengembalikan `tool_calls[].extra_content.google.thought_signature`, parser lama membuangnya, kemudian continuation mendapat HTTP 400. Allowlist sempit ditambahkan ke Zod parser provider untuk metadata opak tersebut. Uji setelah perbaikan menghasilkan HTTP 200 untuk tool call dan continuation. Runtime sudah meneruskan objek call, sehingga tidak perlu diubah. Tanda tangan tidak didekode, dilog, ditampilkan, atau dipersist. Extension reasoning lain tetap dibuang. Rujukan: [Google OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai), [required thought-signature round trip](https://ai.google.dev/gemini-api/docs/generate-content/thought-signatures#signatures-for-openai-compatibility).

### Safe Live Traces / Tested Scenarios

| Skenario | Tool / hasil aman | Jawaban terlihat / status |
| --- | --- | --- |
| Minimal provider availability | Tanpa tool, HTTP 200 | `OK`; PASS konektivitas |
| 1. Sapaan bantuan | Gemini memilih `searchKnowledge`; continuation HTTP 200 setelah perbaikan; data tool gagal | “Maaf, saya belum bisa memastikan informasi itu dari sistem. Coba lagi sebentar, ya.”; FAIL fungsional karena database |
| 2. Menu di bawah 20 ribu | PostgreSQL belum dapat diakses | BLOCKED; harga tidak dibuat sebagai pengganti |
| 3. Bahasa santai “yg dingin dan murah ada ga?” | Belum dievaluasi terhadap data | BLOCKED |
| 4. Detail produk dan harga aktual | Probe terisolasi Gemini memilih `getProductDetail`; bukan retrieval berhasil | BLOCKED |
| 5. Multi-turn “yang tadi satu” | Persistensi memerlukan datasource | BLOCKED |
| 6. Tool database | Gemini memilih `getActivePromotions`; parameter `limit` number lolos Zod, service mengembalikan `SERVICE_UNAVAILABLE`; `searchKnowledge` juga terpilih | PARTIAL, selection live diamati; retrieval belum lulus |
| 7. ADD_TO_CART | Kontrak deterministik tetap diuji | BLOCKED untuk harga/produk live |
| 8. Outlet dan jam | Tidak mengganti data dengan informasi buatan | BLOCKED |
| 9. Matcha Strawberry | Database saat ini tidak bisa diperiksa | BLOCKED, tidak mengklaim lolos halusinasi |
| 10. Prompt injection Rp1 | Deterministic tool validation tetap lulus | BLOCKED untuk pembandingan data dan aksi live |
| 11. Conversation persistence | 15 tes integrasi database dilewati | BLOCKED |
| 12. Invalid tool arguments | Suite Zod menolak malformed JSON, nilai invalid, dan kolom harga buatan | PASS deterministik; tidak dinyatakan sebagai malformed output Gemini yang diamati |
| 13. Provider errors | Credential sintetis invalid pada endpoint Gemini menghasilkan HTTP 400; aplikasi memberi `LLM_UNAVAILABLE` aman. HTTP 503 live juga disanitasi | PASS untuk error yang diamati; 401/403/429/503 tambahan diuji sintetis |

Tidak menyimpan raw provider response, auth header, key, signature value, atau chain-of-thought. Metadata diagnostic hanya status HTTP, kategori allowlist, boolean keberadaan signature, nama tool, tipe argumen, hasil validasi/status, dan jawaban terlihat. Detail lengkap seluruh skenario ada pada bagian dengan judul yang sama di [AI Architecture](AI-ARCHITECTURE.md#gemini-live-acceptance-test).

### Database / Environment

Prisma connectivity check mengembalikan **P1012**: `DATABASE_URL` tidak tersedia di environment aplikasi. Beberapa layanan PostgreSQL Windows berjalan, tetapi itu tidak menggantikan konfigurasi datasource. Pengguna diminta mengaturnya kembali secara privat; tidak meminta kredensial dalam chat, menebak password, memakai database lain, atau membuat datasource palsu. Tidak ada schema, migration, seed, atau perubahan data bisnis. Harness penerimaan lengkap disiapkan dengan percakapan terisolasi dan cleanup ID sendiri, tetapi tidak dijalankan tanpa datasource.

### Files Changed

- `src/agents/provider.ts`: allowlist metadata continuation Gemini; tidak mengganti SDK/interface.
- `src/agents/provider.test.ts`: lima tes baru untuk opaque metadata dan fault-injected HTTP 401/403/429/503 sanitization.
- `src/agents/runtime.test.ts`: satu tes baru untuk signature round-trip tanpa masuk hasil publik/event.
- `docs/AI-ARCHITECTURE.md`, `docs/DEVLOG.md`.
- Diagnostic harness sementara di ignored `.qa/gemini-smoke.ts`, `gemini-schema-probe.ts`, `gemini-db-check.ts`, `gemini-auth-error.ts`, `gemini-acceptance.ts`; tidak dimuat oleh aplikasi normal dan bukan fallback.

### Commands Run / Verification

- Live `npx.cmd tsx .qa/gemini-smoke.ts` (sebelum/sesudah perubahan) dan `--health`; probe schema terisolasi; database connectivity dengan output kode saja; uji error autentikasi sintetis pada endpoint nyata.
- `npm.cmd test -- src/agents/provider.test.ts`: focused error suite lulus sebelum tes signature ditambahkan.
- Final `npm.cmd test`: **146 passed, 15 skipped, 0 failed**, 161 total. Semua tes non-database lama tetap lulus; enam tes baru lulus. **Tidak mengklaim 15 integrasi database lulus pada environment yang kehilangan datasource.**
- `npm.cmd run build` dengan `TEHYAN_DIST_DIR=.next-ai`: **PASS** penuh, termasuk Prisma generate dan Next build. Akses di luar sandbox dipakai untuk toolchain/font sesuai proyek.
- `npx.cmd prisma validate`: **FAIL P1012**, `DATABASE_URL` missing; penyebab konfigurasi environment, bukan perubahan schema.
- `npx.cmd tsc --noEmit --incremental false`: **PASS** setelah fixture error HTTP diperbaiki memakai dictionary header yang diharapkan SDK OpenAI. Pemeriksaan pertama menemukan TS2345 pada fixture `Headers`; tidak ada perubahan perilaku produksi untuk koreksi ini.

### Security / Known Limitations

Hanya metadata protokol opak yang ditambahkan; validasi argumen/model price/quantity, server authority, loop caps, timeout, ownership, dan UI confirmation tetap sama. Kredensial sintetis digunakan dalam proses terpisah tanpa membaca atau menyimpan key asli. HTTP 429 tidak sengaja dipicu dengan menghabiskan kuota; pengaman diuji secara deterministik. HTTP 503 tidak konsisten tetap menjadi batas provider yang diamati; tidak ada retry tersembunyi atau penggantian model. Uji model nyata belum membuktikan akurasi harga, kemampuan konteks, halusinasi, atau prompt injection saat datasource hilang.

### Remaining Work

Pulihkan `DATABASE_URL` secara privat lalu lanjutkan 13 skenario terhadap PostgreSQL asli dan ulangi tes integrasi serta Prisma validation. Jangan menandai penerimaan Gemini lengkap sebelum langkah ini lulus. Tidak ada fitur lain dimulai.

## 2026-10-02 - Customer Service Agent, Secure Conversations, and Cart Confirmation

### Goal

Complete Tanya Tehyan as a customer-facing LLM agent using real application services and PostgreSQL while preserving the existing website, outlet experience, photography, and Zustand cart. Implementation and deterministic QA are complete; live-model acceptance remains unverified because the local `LLM_API_KEY` is absent.

### Existing AI Architecture

The application already had OpenAI-compatible tool calling, a four-round loop, eight basic tools, database conversation records, and a chat panel that sent only the current message and conversation ID. It did not send browser-provided history. Weaknesses included anonymous ownership based on `null === null`, eager provider initialization, incomplete filters/outlet discovery, uncapped tool payloads/calls, raw error logging, unchecked browser actions, no reload recovery, and an order tool requiring nonexistent login.

### Final AI Architecture

`ChatPanel/useChat -> GET/POST /api/chat -> chat service -> provider/runtime -> explicit tool registry -> shared domain services -> Prisma/PostgreSQL`. The normal application has no mock fallback. Tests replace the provider explicitly; a temporary local OpenAI-compatible QA fixture exercised the full HTTP/tool/database/browser path on a separate server. See [AI Architecture](AI-ARCHITECTURE.md) for the diagram and protocol.

### NLP / LLM Role

The configured Transformer-based LLM performs Indonesian intent/entity extraction, contextual references, tool selection, and natural-language explanations. No separate NLP classifier, vector store, RAG infrastructure, or recommendation model was added. Business filtering and action permissions remain deterministic. The provider must support Chat Completions function calling and `tool_choice` required/none. Live slang, ambiguous-reference, and provider-compatibility behavior still require acceptance testing with a configured key.

### Implemented / Agent Orchestration

- Lazy server-only provider construction; explicit missing-configuration, timeout, invalid-response, and provider-failure states; no provider bodies/credentials in errors.
- At most 18 history messages / 18,000 characters, four tool rounds plus one final-only completion, three tool calls per round / 12 total, 12,000 characters per tool result, and 6,000 characters per final reply. Oversized structured results fail as a whole.
- 12-second provider timeout, 45-second overall agent deadline, and no automatic SDK retries. HTTP provider requests are aborted; already-running Prisma reads cannot be cancelled by the deadline.
- Required first tool retrieval; no-tool/all-failed retrievals fail closed. Retrieval cannot guarantee every later natural-language statement is correct. Deterministic cart wording never claims the browser already changed.
- Safe optional execution events contain request/tool/action event names, tool names, outcomes, and durations. No chain-of-thought, system prompts, tool arguments, order codes, or raw provider fields are exposed. `CHAT_DEMO_MODE` defaults off and is rechecked on response replay.

### Tool Registry

| Tool | Authoritative behavior |
| --- | --- |
| `searchProducts` | Query/category/exclusion, inclusive budget or strict price ceiling, availability, sweetness and bestseller filters; bounded results. |
| `getProductDetail` | Exactly one product ID or slug; actual description/price/availability. |
| `recommendProducts` | Available products only, at most five, using stored attributes; no invented temperature field. |
| `getActivePromotions` | Active flag and expiry compared on server; original terms and `eligibility: UNVERIFIED`. |
| `listOutlets` | Active outlets by city/name/address with bounded results. |
| `getOutletDetail` | Active outlet by ID or slug, real contact/facilities/hours; no proximity calculation. |
| `addToCart` | Re-resolves product and availability, rejects price/options supplied by model, returns a validated confirmation proposal. |
| `checkOrderStatus` | Only supplied order code and status; no PII, item details, totals, history notes, or database IDs. |
| `searchKnowledge` | Bounded FAQ lookup through a service; no Prisma access inside the registry. |

Every tool has a strict Zod schema, explicit JSON Schema, narrow handler, structured result, and distinct invalid-input/service-unavailable errors. Registry uses a Map, so prototype-property tool names cannot execute.

### Backend Services

Extended existing catalog/outlet services without changing default public-page behavior. Added bounded FAQ reads and public-safe status projection to the existing order service. No order-creation service or checkout exists in this repository, so none was invented. Corrected existing WIB opening calculation for previous-day overnight schedules; missing/invalid hours stay unknown. Seed promo weekday restrictions remain prose: campaigns are listed with unverified eligibility, never guaranteed applicable today or applied as discounts. Stored demo business content was not rewritten.

### Conversation Persistence / Security Decisions

- A random 256-bit `HttpOnly`, `SameSite=Strict` cookie (Secure in production, 30-day browser lifetime) is the anonymous capability. The conversation ID is a domain-separated SHA-256 digest of that token. The public ID cannot reconstruct the token. No new authentication system or ownership column is needed.
- GET derives identity exclusively from the cookie; query IDs are ignored. POST rejects mismatching body IDs. Legacy CUID anonymous conversations remain in the database and cannot be adopted by knowing their ID. Customer-account conversations are not exposed through the anonymous service.
- Browser sends a UUID request ID and current message only; strict validation rejects extra history/role/user fields. A persisted user-message ID binds the UUID to its text; retries of completed requests return the saved response and do not call the LLM again.
- Existing ConversationMessage storage holds a versioned assistant-response envelope and a temporary `lock` record. A unique lease serializes turns across workers without a transaction spanning the provider call. Expired leases can be recovered after 120 seconds. Conditional UPDATE inside the final transaction locks/rechecks lease ownership before publishing. Old workers cannot delete replacement leases.
- User messages persist before provider invocation. Failed turns remain retryable; conflicting turns are rejected. Explicit timestamps preserve user/assistant order even within the same millisecond. Locks never enter history/context. History GET returns at most 40 display messages.
- Request body capped at 8 KiB while streaming with a five-second read deadline; message maximum 1,000 characters. Cross-site/foreign-origin calls are rejected. Prototype counters cap POST at 12/minute/session and 60/minute/process, bootstrap at 240/minute/process, with bounded expiring counter storage. Forwarded client-IP headers are not trusted.
- Log fields are sanitized request IDs and allowlisted error categories. No secret values were printed or changed.

### UI Action Protocol

Shared browser-safe Zod contracts validate responses and `ADD_TO_CART` proposals containing server-resolved product ID/slug/name/price/image and quantity. Unknown actions are ignored. The customer clicks **Tambahkan ke keranjang**; the existing Zustand store updates items and records the action ID together. Repeated confirmations/retries on that stored cart do not add twice. Existing product name/price refresh and actual quantities added respect the 20-per-item cap. Clearing/removing items preserves action receipts.

GET restoration never applies old actions. Historical proposals display an honest message to request a fresh proposal or check the cart. Network/provider failures retry the same UUID; session/conflict failures offer authoritative history reload. Input focus, Escape/focus return, named input/send controls, log/status/error regions, wrapping, safe-area spacing, and reduced-motion-compatible immediate scrolling preserve the Tehyan interface.

### Database Changes

Schema: none. Migration: none; neither applied migration was rewritten. Seed: none; business/demo rows were preserved. Existing primary keys and conversation index support capability identity, UUID message lookup, and lease acquisition. No index was added for this prototype; larger conversation retention would justify a composite conversation/timestamp index. Integration/browser fixtures were created with unique identifiers and removed by their exact recorded identifiers only.

### Files Changed

- `.env.example`, `.gitignore`, `README.md`
- `src/agents/runtime.ts`, `src/agents/provider.ts`, `src/agents/prompt.ts`, `src/agents/tools.ts`
- `src/agents/tools/shared.ts`, `src/agents/tools/products.ts`, `src/agents/tools/outlets.ts`, `src/agents/tools/support.ts`
- `src/agents/runtime.test.ts`, `src/agents/provider.test.ts`, `src/agents/tools.test.ts`
- `src/server/chat-security.ts`, `src/server/chat-security.test.ts`
- `src/server/services/chat.ts`, `src/server/services/catalog.ts`, `src/server/services/outlets.ts`, `src/server/services/orders.ts`, `src/server/services/store.ts`, `src/server/services/knowledge.ts`
- `src/server/services/chat.integration.test.ts`, `src/server/services/agent.integration.test.ts`, `src/server/services/store.test.ts`
- `src/app/api/chat/route.ts`, `src/app/api/chat/route.test.ts`
- `src/lib/chat-contract.ts`, `src/lib/chat-contract.test.ts`
- `src/features/chat/ChatPanel.tsx`, `src/features/chat/useChat.ts`, `src/features/chat/CartAction.tsx`, `src/features/chat/CartAction.test.tsx`
- `src/features/cart/store.ts`, `src/features/cart/store.test.ts`
- `docs/AI-ARCHITECTURE.md`, `docs/DEVLOG.md`
- `tsconfig.json`, `next-env.d.ts`: Next.js-generated isolated build type references.

No application dependency or lockfile changed. Local baseline snapshots, explicit mock provider, browser scripts, fixture manifests, and screenshots are in ignored `.qa/`; build artifacts are ignored `.next-ai/` and `.next-ai-qa/`. Git metadata is absent, so source/baseline inspection replaced `git diff`.

### Commands Run

- `npx.cmd prisma validate` and `npx.cmd prisma migrate status` (both existing migrations applied)
- `npx.cmd tsc --noEmit` and final `npx.cmd tsc --noEmit --incremental false`
- Focused `npx.cmd vitest run ...`, then `npm.cmd test`
- `$env:TEHYAN_DIST_DIR='.next-ai'; npm.cmd run build`
- `npm.cmd exec --yes --package=playwright -- node .qa/verify-chat.cjs`
- `npm.cmd exec --yes --package=playwright -- node .qa/verify-chat-no-key.cjs`
- `npm.cmd audit --omit=dev --json` (read-only, no automatic fixes)
- Temporary QA provider on port 4010, development app on port 3004, and production missing-key verification app on port 3005; only task-owned processes stopped.
- `node .qa/cleanup-chat-fixtures.cjs` removes exact test-created conversation IDs from the saved manifest.

### Tests / Verification

Final `npm.cmd test`: **155 tests passed across 18 files**, including 15 real PostgreSQL integration cases. New tests cover filter boundaries, malformed/prototype tool names, unavailable products, promo expiry, active outlets, unknown schedules/overnight hours, order privacy, provider errors/timeouts, hidden-field stripping, bounded loops/context/results, action validation/confirmation/replay, cookie/origin/body protections, ownership, persistence, UUID conflicts, concurrent/replaced leases, and honest historical proposal display. Tests do not assert exact LLM wording. Prisma validation and TypeScript passed. No separate lint script is configured.

Vitest initially failed before tests because sandboxed esbuild could not access its parent configuration path; the outside-sandbox rerun passed. Browser QA first hit development compilation timeout and two test-locator conflicts (desktop header button and Next.js route announcer); corrected test selectors/timeouts passed. A temporary fixture-cleanup script had a syntax typo, corrected before its successful scoped cleanup. These were tooling/test harness failures, not hidden application passes.

### Build Results

The final **full `npm.cmd run build` passed**, including Prisma Client generation, production compilation, lint/type checks, page generation and traces. Initial sandbox build failed to fetch the existing Google Fonts. An outside-sandbox retry encountered the Windows Prisma engine DLL lock held during QA; stopping this task's servers released it and the full build succeeded. No user-owned process was stopped. Output: home 172 kB first-load JS, menu 170 kB, product detail 128 kB, cart 123 kB, shared 103 kB. Shared response/action validation adds client code; no new package was added. No deployed performance claim is made.

### Manual Demo Scenarios / Responsive QA

Chrome on the isolated explicit provider fixture exercised real HTTP, real registry/service calls, and real PostgreSQL data: budget strictly below Rp20,000; contextual lemon request; server-resolved proposal; no cart mutation before confirmation; actual cart addition; outlet demo hours; nonexistent product; low-sweetness recommendations; conditional promo terms; missing order; persisted history without action replay; retry preserving UUID; malformed/spoofed-history/foreign-owner/cross-origin rejection. `/`, `/menu`, `/outlet`, and `/keranjang` returned 200 and remained usable.

Chat reviewed at 375, 768, 1024, and 1440 px with no horizontal overflow or broken images, reachable 44px input/send controls, long wrapped results, visible errors, keyboard focus/Escape return, and reduced motion. Mobile/desktop screenshots were inspected. Browser fixture output proves the deterministic integration, not natural-language reasoning quality. The actual configured app has no LLM key; live-provider success is not claimed.

The final production server was also exercised without a provider fixture: all four public routes returned 200, cookie bootstrap succeeded, and a normal chat request returned HTTP 503 with `LLM_NOT_CONFIGURED`. The mobile UI displayed the configuration message and usable retry control without overflow. Its screenshot was inspected. Temporary QA conversations were removed by recorded IDs; all task-owned QA servers were stopped after verification.

### Security Audit / Data Integrity

- **HIGH, fixed:** knowing an anonymous conversation ID previously satisfied `null === null` ownership. Capability-derived identity and mismatch checks now prevent that access.
- **MEDIUM, fixed:** unchecked actions/raw errors/unbounded model-selected work could cause invalid client actions, leakage, or excess cost. Strict contracts, explicit confirmation, sanitized errors, bounded retrieval/loops/time and prototype limits address these paths.
- **MEDIUM, controlled limitation:** prose-only promo eligibility cannot be determined reliably. Returned terms are preserved and eligibility is explicitly unverified; no discount calculation was added.
- **LOW, fixed:** overnight outlet hours, stale lease publication, and historical proposals pointing to missing buttons now have deterministic behavior and regression tests.
- **HIGH/MODERATE, existing dependencies:** read-only production audit reported 5 affected package entries (4 high, 1 moderate): `deepmerge-ts`, `@prisma/config`, `prisma`, `postcss`, `next`. Advisories involve recursive-object merge exhaustion and CSS/source-map processing; exposure through this chat path was not demonstrated. Untrusted build/plugin inputs could matter. Review patched compatible resolutions separately; do not infer a reachable chat exploit or apply the suggested Next.js major upgrade automatically. Advisory references: [DeepmergeTS](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [PostCSS](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp).
- **INFO:** status-by-code intentionally exposes only minimal public status, not authentication-protected order details. A verification token is required before richer tracking. Seed outlets/policies remain development examples.

### Known Limitations / Production Considerations

No live LLM acceptance run without a key. Retrieval/prompt controls cannot make all generated prose infallible. No checkout/payment/authentication/admin system added; client cart totals are not an authoritative checkout quote. Promotions lack structured day/stock/minimum-purchase eligibility. Anonymous continuity depends on the cookie; old anonymous histories have no recoverable ownership proof. Unconfirmed proposals require a fresh request after reload. Cart receipt retention is local and currently unbounded; cross-tab/device exactly-once semantics are not promised. Chat history retention is unbounded in PostgreSQL despite bounded retrieval. Rate limits are per process and can throttle all visitors; production needs shared limits, ingress protection, retention/deletion policy, and monitoring. Provider deadline does not cancel already-running database reads. Capability cookie security depends on HTTPS and XSS prevention. Dependency advisories need a separate compatible remediation review.

### Remaining Work / Recommended Next Step

Configure `LLM_API_KEY` securely in the server environment and run the documented live-provider acceptance scenarios, including casual Indonesian, ambiguous follow-ups, unavailable services and prompt-injection attempts. No secrets should be pasted into chat. This acceptance step is intentionally not represented by the deterministic fixture results. Review existing dependency advisories before public deployment. No follow-up implementation was started.

## 2026-10-02 - Product Photography and Scroll-Driven Menu

### Goal

Continue the existing Kedai Tehyan application with database-backed product photography, a restrained homepage photo sequence, a desktop featured-product menu narrative, and usable mobile/detail photography. Preserve cart, search, categories, outlet routes, Brand Story, and Tanya Tehyan.

### Product Photography

- Added eight distinct, locally stored development photographs for the eight available seeded products. Final assets total 460,030 bytes; individual files range from 13,258 to 142,434 bytes.
- Sources are Pexels, Unsplash, and the CC0 WordPress Photo Directory. These are illustrative stock photographs, not official Tehyan photos. A visible photo qualifier and honest alternative text distinguish development imagery.
- Reused `Product.imageUrl`; no richer ingredients, serving promises, or tasting notes were invented. Approved business images are not overwritten by the image backfill.
- Shared `ProductPhoto` validates source URLs, reserves geometry through its container, uses responsive `next/image` for local media, and replaces missing/failed media with an understandable fallback.
- Credential-free HTTPS business images are delivered directly by the browser with `unoptimized`; no arbitrary remote image proxy or broad remote host allowlist was introduced.

### Scroll-Driven Menu Architecture

Chose **sticky image / narrative scrollytelling**, not expanding-height cards. A stable 7/5 desktop composition pairs one large image with numbered product narratives and small thumbnails. The current product gains title/rule emphasis and its photo crossfades into the featured stage. Real descriptions, category, bestseller status, price, and cart controls remain available for every product, including inactive narratives.

One IntersectionObserver observes product rows and an unobtrusive end marker. The end marker fixes last-product selection without extra scroll space. Visible keyboard-focused product controls take precedence over scroll selection; focus is never moved. List identity resets the client selection when filter results change. Empty and single-product lists are handled independently.

At widths below 1024px or heights below 640px, sticky behavior is removed. Mobile uses photo/content sequences; tablet uses straightforward image/content pairs. Neither has viewport-height traps or intercepted scrolling. Reserved row/image geometry avoids animated layout shifts. The thumbnail `sizes` query uses the same width/height conditions, so short desktop windows receive appropriately sized full-row images rather than thumbnail derivatives.

### Hero Photography

Static hero typography and both menu CTAs now render on the server. `HeroVisual` receives up to three photographed, available beverage bestsellers from the existing catalog service. The current sequence is Lemon Madu, Teh Manis, and Teh Tarik. Existing headline/body copy is preserved.

The image holds for 5.5 seconds and changes with an 800ms opacity transition. A small counter and accessible pause/play control replace carousel arrows/dots. Autoplay stops for reduced motion, hidden documents, and offscreen imagery. Image files are reused rather than duplicated into a separate hero folder.

### Motion Architecture

- `PhotoTransition` retains the displayed photograph until the requested photo loads or resolves to a fallback. Only then does it crossfade, preventing a blank intermediate frame.
- Image animation is isolated from prices, descriptions, and actionable controls. There are no scale transforms, bounce, scrolljacking, pinned full-screen panels, or high-frequency scroll handlers.
- Reduced motion disables hero autoplay and makes image changes immediate after loading. All information and cart actions remain usable.
- A shared `useSyncExternalStore` preference hook keeps SSR/initial hydration consistent and responds to live preference changes. The installed Motion hook reads its value only at mount; the new photo components and Reveal use the live subscription instead. Reduced-motion CSS also keeps Reveal content visible before hydration.
- Loaded image layers remain present through rapid retargeting and are pruned as soon as an opaque layer covers them. Cart-button geometry is fixed across idle/added/unavailable labels.
- Homepage featured imagery responds to both pointer hover and keyboard focus; important information is never hover-only. Existing Reveal remains limited to the featured section heading.

### Server / Client Boundary

Home composition, Hero, FeaturedMenu, MenuList, menu routes, catalog queries, and product descriptions/prices stay on the server. React's request-scoped `cache` shares bestseller reads between Hero/FeaturedMenu and the slug lookup between detail/metadata, following the existing outlet service; no persistent cache delays availability or image updates. Client boundaries own only image failure state, crossfades, hero timer/pause, featured selection, and menu intersection selection. The menu passes only product ID, name, and image URL to its visual controller; server-rendered narrative children contain the remaining content. Existing Zustand AddToCartButton/CartHydrator remain the sole cart architecture.

### Files Changed

- `prisma/seed.ts`
- `src/lib/product-photography.ts` and `src/lib/product-photography.test.ts`
- `src/components/menu/ProductPhoto.tsx`, `PhotoTransition.tsx`, `MenuExperience.tsx`, `MenuList.tsx`, and `MenuList.test.tsx`
- `src/components/home/Hero.tsx`, `HeroVisual.tsx`, `FeaturedMenu.tsx`, and `FeaturedSelection.tsx`
- `src/app/menu/page.tsx`, `src/app/menu/page.test.tsx`, and `src/app/menu/[slug]/page.tsx`
- `src/app/globals.css`
- `src/components/ui/Reveal.tsx`, `useReducedMotionPreference.ts`, and `useReducedMotionPreference.test.tsx`
- `src/server/services/catalog.ts`: request-scoped memoization for shared bestseller and detail/metadata lookups, following the existing outlet-service pattern
- Eight `public/images/products/<slug>.webp` assets, individually mapped in `docs/IMAGE-SOURCES.md`
- `.gitignore`, `package.json`, and `package-lock.json`
- `tsconfig.json` and `next-env.d.ts`: Next.js-generated isolated-build/development type references
- `docs/IMAGE-SOURCES.md` and `docs/DEVLOG.md`

Local browser scripts, downloaded candidates, data fingerprints, screenshots, and crop contact sheets are under ignored `.qa/`. Isolated QA artifacts use ignored `.next-photos/` and `.next-photos-dev/`. Added React DOM development declarations for typed server-rendering tests and tree-shaken Lucide Play/Pause icons for the hero control. Existing frameworks and other dependencies were not upgraded.

### Database Changes

Only the existing nullable `Product.imageUrl` values were backfilled. A fingerprint audit verified that other product fields, complete outlet/hour records, categories, and user/order/conversation counts stayed unchanged. All eight available products have existing local assets. Existing business photos remain untouched.

### Migration

None. Prisma validation passed and `prisma migrate status` reported both existing migrations applied and the schema up to date. No migration was rewritten, reset, or deleted.

### Seed Changes

New seeded products receive their mapped development image URL. Existing products receive it only where `imageUrl` is null, through a conditional update. Two seed runs preserved non-image data and resolved all eight image paths. The existing outlet seed behavior was left intact. An intentionally empty/non-null image value is not silently replaced.

### Image Sources

See [Image Sources](IMAGE-SOURCES.md) for source pages, photographer credits, licenses, dimensions, byte sizes, usage boundaries, and actual photography still required. Sweet-tea and coffee candidates were replaced after visual review for calmer composition and clearer product/crop suitability. Only the final selected assets are public.

### Commands Run

- `npx.cmd prisma validate` and `npx.cmd prisma migrate status`
- `npm.cmd run db:seed` twice, with pre/post non-image fingerprint audits
- `npm.cmd test`
- `npx.cmd tsc --noEmit`
- `npm.cmd run build`, including an outside-sandbox retry
- Set `TEHYAN_DIST_DIR=.next-photos`, then `npx.cmd next build`
- `npm.cmd install --save-dev @types/react-dom@^19.0.0 --ignore-scripts`
- `npm.cmd install lucide-react --ignore-scripts`
- `npm.cmd exec --yes --package=playwright -- node .qa/verify-photography.cjs`
- Hidden isolated production/development QA servers on ports 3002/3003; original servers and Prisma Studio were left alone
- `git status --short`: unavailable because this workspace has no Git metadata

### Verification

`npm.cmd test` passed all 52 tests in seven files, including four existing real-PostgreSQL integration cases. `npx.cmd tsc --noEmit` and Prisma validation passed. Both existing migrations are applied. Production compilation caught and prompted fixes for DOM iteration and optional dataset values; adding React DOM declarations resolved server-rendering test types.

The required `npm.cmd run build` fails during Prisma Client generation with `EPERM: operation not permitted, rename` for `node_modules/.prisma/client/query_engine-windows.dll.node.tmp...` to `query_engine-windows.dll.node`; an outside-sandbox retry confirmed the same Windows lock. Existing Prisma Studio/development processes were preserved. The unchanged schema matches the generated client. The final isolated `TEHYAN_DIST_DIR=.next-photos npx.cmd next build` passed compilation, type validation, page generation, and tracing. This is not a pass for the full build script. No standalone lint command is configured.

### Responsive QA

Final Chrome/Playwright QA passed for homepage, menu, every product during scrolling, and Lemon Madu detail at 375, 768, 1024, and 1440px. All eight detail photos were additionally checked at 375 and 1440px. There was no horizontal overflow or broken image on these pages. Desktop stages stayed within the menu section and selected the last product correctly; mobile/tablet hid the sticky stage. A 1440 x 600 check also passed: no sticky stage and an optimized derivative at least as wide as the rendered full-row photo. Screenshot/contact-sheet review verified final crops, hero/caption alignment, settled featured images, and end-of-menu framing. Mobile featured-section spacing is tighter and its heading uses an 8px entrance, leaving a visible next-section cue below the hero on the tested 375 x 812 viewport.

Browser regressions passed: category filtering, search, zero/one/multiple results, empty-state reset, persistent cart after reload, desktop/mobile add-to-cart, unchanged CTA width during feedback, mobile cart navigation, chat open/close, outlet directory/detail, retained Brand Story/Outlet Preview, and missing-product HTTP 404. Checkout and live LLM response behavior were not added or exercised. No captured JavaScript or hydration errors occurred. Production helper servers were stopped after QA; the refreshed development preview remains at `http://localhost:3003`, with original servers/Prisma Studio untouched.

### Accessibility QA

Meaningful illustrative alt text, semantic headings/lists/links, visible keyboard focus, server-visible descriptions, retained DOM order, available/disabled cart states, and a named pause button are implemented. Sticky-stage copies are hidden from screen readers because each narrative has its own accessible product photo. Browser checks passed for menu focus selection, equivalent featured hover/focus selection, hero pause/resume, reduced motion before navigation and changed live without reloading, image-failure fallback, and cart usage during reduced motion. The reduced-motion preference disables autoplay and its play control; normal motion resumes only when allowed. Server-rendering tests cover missing/unavailable products and SSR-safe motion preference. This is focused QA, not a full WCAG certification or assistive-technology audit.

### Performance Audit

Local WebP originals total 460,030 bytes. Above-fold priority is limited to the first hero photo and the product-detail photo; other images are lazy. Stable image containers and reserved narrative heights avoid animation-driven layout shifts. One desktop menu observer replaces pixel-by-pixel scroll state; the hero has one visibility observer and one interval. The final 180-frame rapid-scroll test recorded seven active-product changes, at most four transitional layers, p95 frame spacing of 18.3ms, and a maximum of 26.1ms. The image tree returned to one layer and the final displayed image matched the active product. No sticky escape or visible blank intermediate state was found.

Across the final production browser runs, CLS was 0 except a 0.0000624 initial mobile-home font adjustment; observed local LCP ranged roughly 0.06-1.46 seconds. These are unthrottled local QA observations, not deployed Core Web Vitals or field-performance guarantees. Final Next.js first-load JavaScript was 158kB for home, 157kB for menu, 114kB for detail, and 103kB shared. Lucide adds only the two imported control icons to the homepage boundary. Production-device/network profiling remains a release-stage check.

### Security / Self Audit

Photo sources reject executable URLs, credential-bearing URLs, protocol-relative URLs, and local traversal/backslash paths. Database text remains React-escaped. No secrets, schema resets, unrelated business features, or extra cart state were added. Manual source review is used because Git diff is unavailable.

Asked explicitly: "Does this look like an AI generated F&B website?" The composition uses existing typography/tokens, unframed photography, numbered narratives, restrained rules, and differently composed homepage/menu surfaces. There are no repeated rounded product boxes, gradients, decorative blobs, 3D gimmicks, or invented tasting copy.

### Known Issues

- Development stock photography is not evidence of Tehyan's actual serving presentation or ingredients; approved business photography is required before launch.
- The full build script remains blocked by the Windows Prisma engine DLL lock until processes holding it release it. No user-owned process was stopped.
- No standalone lint script is configured. Type checks, tests, and Next.js build checks are used instead.
- The dependency install's npm audit reported 10 vulnerabilities (4 moderate, 5 high, 1 critical). No automatic audit fixes or forced dependency upgrades were run; a separate dependency-security review is needed before release.
- In-app browser bootstrap failed with `codex/sandbox-state-meta: missing field sandboxPolicy`; system Chrome through temporary Playwright provided the completed browser QA instead. Playwright was not added to application dependencies.

### Remaining Photography Needs

Approved actual photographs of all eight drinks/snacks, including correct vessels, garnishes, portions, and consistent lighting. Do not promote the stock milk-tea photographs as proof of palm sugar or pulling technique. Verified outlet photography/content remains the existing outlet-phase follow-up, not part of this implementation.

### Recommended Next Step

Review the reported dependency vulnerabilities before release, without automatic forced upgrades. Approved Kedai Tehyan photography is also a launch prerequisite; replacement should update each persisted image URL and its source record. Richer metadata can be scoped separately when verified business content exists. Checkout, authentication, administration, Promo, Journal, and Membership remain out of scope. No follow-up task was started.

## 2026-10-01 - Outlet System and Homepage Preview

### Goal

Continue the existing Store domain with database-backed outlet discovery, outlet details, and a homepage preview while preserving the current application and local data.

### Implemented

- Added `/outlet` and `/outlet/[slug]` as Server Component routes with public metadata, facilities, weekly WIB hours, optional phone/map/photo information, and a custom not-found view.
- Added shared public outlet queries for active, featured, primary, and slug-based lookups. The existing chat store service now uses the same public selection and excludes inactive stores.
- Added a two-outlet homepage preview using the existing Reveal component and design tokens.
- Included directory loading, empty states, route error recovery, missing-data messages, and graceful handling of failed optional photos.
- Confined Suspense loading to the directory: an inherited loading boundary initially caused missing detail pages to stream HTTP 200; the final detail route returns HTTP 404.
- Added unit, server-rendering, and real PostgreSQL integration tests.
- Allowed an optional `TEHYAN_DIST_DIR` so local QA builds can coexist with an existing development server. Set the tracing root to this repository to avoid selecting a parent-directory lockfile.
- Corrected the existing header's background and border classes: Tailwind did not emit opacity variants for these hex-valued CSS-variable tokens. Using the existing opaque tokens keeps navigation readable over the dark homepage story section.

### Files Changed

- `.gitignore`
- `next.config.mjs`
- `prisma/seed.ts`
- `src/app/page.tsx`
- `src/app/outlet/page.tsx`
- `src/app/outlet/[slug]/page.tsx`
- `src/app/outlet/error.tsx`
- `src/app/outlet/not-found.tsx`
- `src/app/outlet/page.test.tsx`
- `src/components/home/OutletPreview.tsx`
- `src/components/site/Header.tsx`
- `src/components/outlets/OutletDirectory.tsx`
- `src/components/outlets/OutletList.tsx`
- `src/components/outlets/OutletImage.tsx`
- `src/lib/outlets.ts`
- `src/lib/outlets.test.ts`
- `src/server/services/outlets.ts`
- `src/server/services/outlets.integration.test.ts`
- `src/server/services/store.ts`
- `vitest.config.ts`
- `docs/DEVLOG.md`
- `tsconfig.json` and `next-env.d.ts`: Next.js-generated type references for the isolated build directory.

Local browser scripts, screenshots, and QA logs are in ignored `.qa/`; isolated build artifacts are in ignored `.next-outlet/`. Package manifests and dependency lockfiles were not changed.

### Database Changes

Schema:
- No changes. The existing Store model already has all required outlet fields, a nullable unique slug, and StoreHour relations.

Migration:
- No migration created or rewritten. `20261001115020_init` and `20261001122415_expand_outlet_model` were already applied; migration status reported the database up to date.

Seed:
- Adopted only the exact original placeholder store, retaining its ID and existing hours. Recognition checks its original name, address, phone, empty facilities, flags, and absent descriptive/media fields.
- Added clearly labeled Margonda, Beji, and Sawangan development/demo locations. No official addresses, callable phone numbers, maps, or photos were fabricated.
- Existing demo slugs are skipped on subsequent runs, preserving edited descriptions, flags, and hours, including deliberately closed weekdays.
- Hour inserts use the existing compound unique key inside a transaction.
- Verified a second seed run did not change the outlet-data fingerprint: 3 stores, 20 hour rows, 8 products, and 5 categories. No records were reset or removed.

### Architecture Decisions

- Prisma stays in the service layer. Related hours are selected with each outlet query rather than fetched once per row.
- Explicit public-field selection prevents internal timestamps and flags from becoming public response data.
- React `cache` shares the detail lookup between metadata and page rendering within a request; no cross-request cache hides outlet deactivation.
- Legacy active stores without slugs remain visible in the directory but do not receive broken detail links.
- Missing weekday rows represent closed days; an entirely absent schedule is shown as unavailable. Overnight schedules are labeled as ending the following day. No new open-now or distance claims were added.
- Optional images use browser-side delivery with fixed intrinsic dimensions; this does not introduce a server-side arbitrary-URL image fetcher.

### Commands Run

- `git status --short`: unavailable because this workspace has no Git repository metadata.
- `npx.cmd prisma migrate status`
- `npx.cmd prisma validate`
- `npx.cmd tsc --noEmit`
- `npm.cmd run db:seed` (twice)
- `npm.cmd test`
- `npm.cmd run build`
- PowerShell: set `TEHYAN_DIST_DIR=.next-outlet`, then run `npx.cmd next build`.
- `npm.cmd exec --yes --package=playwright -- node .qa/verify-outlets.cjs`
- `npm.cmd exec --yes --package=playwright -- node .qa/verify-outlet-failure.cjs`
- Started an isolated Next.js development server on port 3001 with `TEHYAN_DIST_DIR=.next-outlet` after production QA; the existing port-3000 server remains available.

### Verification

- Prisma: schema validation passed; applied migrations match the current schema.
- Build: final isolated Next.js production build passed compilation, type validation, page generation, and tracing. Both outlet routes are dynamic.
- Build-script limitation: `npm.cmd run build` failed at Prisma Client generation with Windows `EPERM` while renaming the query-engine DLL. Existing Prisma Studio processes were observed and left running. The already-generated client matches the unchanged schema, so Next.js was built separately.
- Sandbox restrictions initially blocked config reads/font downloads. Relevant checks were rerun outside the sandbox; no environment secrets were printed or edited.
- An intermediate build caught a disallowed custom export in the route module; it was moved to a dedicated server component, and the final build passed.
- Tests: 31 passed, including 4 integration tests against local PostgreSQL. Integration fixtures use unique IDs and clean up only their own rows.
- Browser: Chrome/Playwright passed directory checks at 375, 768, 1024, and 1440 pixels; mobile detail layout; long unbroken names/addresses; keyboard focus; mobile navigation; weekday/weekend and closed-day hours; HTTP 404; featured preview; and reduced motion. No horizontal overflow, broken images, or page JavaScript errors were detected.
- The development stress checker initially modified streamed DOM before React hydration and caused a test-only mismatch. It now measures and restores the original nodes synchronously; the final development browser run passed without errors.
- Final header correction was visually checked over the dark story section and included in the successful final production build.
- Local development preview: `http://localhost:3001/outlet` returned HTTP 200 with the database-backed directory. The helper runs in the background, outside the sandbox for font access, using isolated artifacts. The existing port-3000 server was also checked and remained available.
- Error QA: a separate server with an unreachable synthetic datasource displayed the outlet error boundary, usable retry control, and no internal diagnostics. The actual database configuration was untouched.
- Visual review: inspected mobile/desktop directory, detail, preview, and unavailable-state screenshots. The built-in browser connection failed before bootstrap, so a temporary Playwright package and installed Chrome were used instead.
- Lint: no standalone lint script is configured; the Next.js build's built-in checks completed.

### Security / Data Integrity

- All public outlet queries require `active: true`, including the legacy chat-facing primary-store lookup.
- Detail slugs are bounded and canonical before querying Prisma; inactive and nonexistent slugs return the same not-found response.
- Map links accept credential-free HTTPS URLs; phone links reject arbitrary tel parameters; unsafe and protocol-relative media URLs are rejected.
- Database text uses React escaping. External map links use `noopener noreferrer`.
- Existing nullable slugs, relations, indexes, migrations, and business data were preserved. No raw SQL, dependency upgrades, database resets, or secret changes were introduced.

### Known Issues

- All seeded locations are development examples. Verified business addresses, phone numbers, maps, photographs, and hours are still required before a public release.
- Close Prisma Studio and development processes using Prisma Client before retrying `npm.cmd run build` if its query-engine DLL remains locked on Windows.
- The existing chat open-status function still assumes same-day operating intervals; overnight hours are supported as display information in the new outlet pages, but the legacy chat calculation needs separate extension before real overnight schedules are introduced.
- Git diff/status review was unavailable in this workspace; changed source files were reviewed directly.

### Remaining Work

- Supply verified outlet content before launch. No remaining implementation work in the assigned outlet phase.
- Promo, Journal, checkout, authentication, membership, and administration remain outside this task.

### Recommended Next Task

- Implement the Promo System using the existing Promotion domain and the same service-first, database-backed approach.

## Gemini + PostgreSQL Live Acceptance

Tanggal: **2026-10-02**. Status: **PostgreSQL pulih; penerimaan Gemini live belum lulus karena provider 503/429**.

### Goal

Melanjutkan skenario penerimaan yang sebelumnya terblokir datasource, mempertahankan arsitektur, SDK OpenAI, kontrak tool, schema database, tes, dan perbaikan signature Gemini. Provider Google Gemini; model `gemini-3.8-flash`; interface OpenAI-compatible `chat.completions.create`; base URL `https://generativelanguage.googleapis.com/v1beta/openai/`.

### Implemented / Evidence

- Verifikasi aman `prisma validate` dan `prisma migrate status`: lulus, dua migration sudah diterapkan. Tidak membaca/menampilkan `.env` atau nilai kredensial; output status difilter.
- PostgreSQL aktual dapat dibaca: delapan produk, tiga outlet aktif Demo, satu promo aktif. Perbandingan harga sebelum/sesudah tidak berubah.
- Batch awal sembilan request Gemini: tiga HTTP 503, enam HTTP 429; tidak ada tool dipilih atau jawaban bisnis yang berhasil. Dua retry eksplisit setelah 503 memakai request ID yang sama; tidak retry request 429. Harness diperketat agar berhenti lintas skenario pada 429 pertama. Setelah jeda lebih dari sepuluh menit, satu request pemeriksaan pemulihan budget kembali 429 tanpa retry. **Total sepuluh request: tiga 503, tujuh 429; nol tool call Gemini.**
- Product search, NLP santai, detail, daftar outlet, promo, halusinasi, dan injection mendapat error provider. Multi-turn/follow-up, action Gemini, serta mutasi cart browser tetap terblokir. Tidak menyebut hasil ini PASS.
- Verifikasi terpisah registry tool + PostgreSQL lulus: `searchProducts`, `recommendProducts`, `getProductDetail`, `addToCart`, `listOutlets`, `getOutletDetail`, `getActivePromotions`. Ini bukan tool selection Gemini pada sesi ini.
- Grounding: lima minuman di bawah Rp20.000 cocok dengan DB; detail Lemon Madu Rp18.000; proposal ADD_TO_CART Tarik satu item Rp16.000. Jadwal Margonda (Demo) 10.00–21.00 WIB setiap hari; seluruh outlet hasil aktif.
- Promo “Beli 2 Teh Susu, gratis 1 Pisang Goreng” berasal dari flag/expiry DB. Syarat Senin–Kamis/selama persediaan dipertahankan, eligibility tetap `UNVERIFIED`.
- Pencarian langsung Matcha Strawberry kosong. Ini memverifikasi absence/retrieval, bukan jawaban model. Injection Rp1 tidak mengubah harga; harga buatan ditolak Zod, tetapi action Gemini live tidak tersedia untuk dinilai.
- HTTP + PostgreSQL ownership fixture PASS: owner GET 200; foreign-cookie POST 404; tanpa cookie POST 401; query ID GET tidak mengubah ownership. Fixture baru sendiri dibersihkan. Tidak mengklaim model berhasil melanjutkan percakapan.
- Invalid arguments diuji sebagai boundary injection: JSON rusak, quantity 0, dan kolom `price` ditolak sebelum query produk (nol query). Error Gemini 503/429 nyata dipetakan ke `LLM_UNAVAILABLE`; raw error/reasoning/credential tidak dicatat.
- Browser bawaan tidak dapat bootstrap; fallback Playwright cache tidak tersedia (`ENOTCACHED`). Tidak ada request Gemini browser atau mock action. Konfirmasi UI dan perubahan Zustand dari Gemini belum terverifikasi.

Matrix 12 skenario, argumen aman, hasil tool, respons/error, dan batas bukti terdapat di [AI Architecture — Gemini + PostgreSQL Live Acceptance](AI-ARCHITECTURE.md#gemini--postgresql-live-acceptance).

### Files Changed

- `docs/DEVLOG.md`
- `docs/AI-ARCHITECTURE.md`
- Harness/trace sementara di ignored `.qa/gemini-postgres.ts`, `.qa/gemini-postgres-tools.ts`, `.qa/gemini-browser-live.cjs`, `.qa/gemini-ownership-live.cjs`, `.qa/gemini-postgres-results.json`, `.qa/gemini-recovery-results.json`, `.qa/gemini-postgres-tools-results.json`, `.qa/gemini-browser-results.json`. Build tambahan di ignored `.qa/gemini-build`.
- Tidak ada perubahan source aplikasi atau tes. `src/agents/provider.ts` dan signature fix dipertahankan.

### Database Changes

Schema/migration/seed: tidak ada. Harness live membuat dan membersihkan tujuh percakapan batch awal serta satu percakapan pemeriksaan pemulihannya; ownership memakai fixture sendiri yang juga dibersihkan. Integrasi database memakai fixture terisolasi milik tes. Tidak mengubah data bisnis atau percakapan pengguna.

### Architecture Decisions

- Mempertahankan OpenAI SDK, tool schemas, Zod, services, provider error boundary, timeout dan retry policy produksi. Kegagalan provider bukan bukti incompatibility baru.
- Memisahkan penerimaan Gemini dari tool + PostgreSQL langsung, fixture HTTP, dan tes deterministik agar tingkat bukti dapat diaudit.
- Menghentikan request tambahan setelah batch 429; tidak beralih model/provider atau menghabiskan kuota untuk memaksa keberhasilan.

### Commands Run / Verification

- `npx.cmd prisma validate`: PASS awal dan akhir.
- `npx.cmd prisma migrate status`: PASS, dua migration, schema up to date.
- `npx.cmd tsx .qa/gemini-postgres.ts`: harness selesai dan cleanup berhasil; skenario LLM gagal HTTP 503/429.
- `npx.cmd tsx .qa/gemini-postgres.ts --recovery-only`: setelah jeda lebih dari sepuluh menit, satu request kembali HTTP 429; cleanup berhasil, tidak retry.
- `npx.cmd tsx .qa/gemini-postgres-tools.ts`: seluruh delapan pemanggilan tool aktual PASS tanpa request Gemini.
- HTTP aplikasi lokal port 3006: ownership fixture PASS, server uji dihentikan.
- `npm.cmd test`: **161 passed, 0 skipped, 0 failed**, 18 files. Sebelumnya **146 passed, 15 skipped, 0 failed**; semua 15 integrasi database kini lulus.
- `npx.cmd tsc --noEmit --incremental false`: PASS.
- `npm.cmd run build` dengan `TEHYAN_DIST_DIR=.next-ai`: **FAIL / environment blocked**, EPERM rename Prisma DLL. PID 18920, server pengguna port 3000, memegang DLL. Bukan server QA port 3006; pengguna dimintai persetujuan sebelum menghentikannya. Proses pengguna dibiarkan berjalan; server QA sudah berhenti.
- `npx.cmd next build` dengan `TEHYAN_DIST_DIR=.qa/gemini-build`: **PASS** kompilasi, type checks, page generation, traces memakai generated client yang ada. Tidak menyatakan perintah lengkap `npm run build` lulus. Penambahan/referensi types otomatis pada `tsconfig.json` dan `next-env.d.ts` dikembalikan setelah verifikasi terisolasi.

### Security / Data Integrity

Tidak ada nilai `DATABASE_URL`, API key, password, cookie, data pelanggan privat, raw provider error, signature value, atau chain-of-thought dalam trace/laporan. Output hanya data katalog/outlet/promo publik, status, argumen tool yang diizinkan, serta fixture uji. Kepemilikan cookie dan server-authoritative pricing tidak diubah.

### Known Issues / Remaining Work

Provider menerima request tetapi menjawab 503/429, termasuk 429 setelah jeda lebih dari sepuluh menit; penyebab rinci tidak dipastikan dari status saja. Harga/produk/jam/promo dari PostgreSQL sudah dapat diverifikasi, sedangkan NLP Gemini, jawaban anti-halusinasi, prompt injection, referensi multi-turn, dan action browser belum lulus penerimaan live. Browser tooling juga belum tersedia pada sesi ini. Perintah build lengkap perlu diulang setelah proses pengguna melepas DLL Prisma. Tidak ada fitur baru dimulai.

### Recommended Next Task

Setelah provider tersedia dan browser dapat dijalankan, ulangi hanya skenario penerimaan yang gagal/terblokir, tanpa mengganti arsitektur atau melemahkan pemeriksaan.
