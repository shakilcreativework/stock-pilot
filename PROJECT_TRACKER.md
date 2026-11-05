# StockPilot — Project Building Tracker

**Project:** StockPilot (Full-Stack Operations Hub)  
**Standard:** Production-Grade / ARAVEX Assessment Ready  
**Policy:** Local-only execution; all changes documented with design rationale and manual verification steps; zero remote git pushes.

---

## 1. Project Phase Roadmap

| Phase | Description | Status | Completion |
|---|---|---|---|
| **Phase 0** | Architecture, Scaffolding, Strict TS, Tailwind v4, Test Setup | ✅ Completed | 100% |
| **Phase 1** | Database (Prisma + PostgreSQL), Seed Data, Better Auth & RBAC | ✅ Completed | 100% |
| **Phase 2** | Products & Inventory Management (Atomic Movement Invariants) | ✅ Completed | 100% |
| **Phase 3** | Transactional Order Lifecycle (Create/Edit/Cancel, Concurrency) | ✅ Completed | 100% |
| **Phase 4** | Audit Trail, Dashboard KPIs, UX States & Accessibility | ✅ Completed | 100% |
| **Phase 5** | Quality Assurance, E2E Demo Flow, Docker, Production Verification | ✅ Completed | 100% |
| **Phase 6** | Complete Responsive UI/UX, Header, Mobile Navigation & Polish | ✅ Completed | 100% |

---

## 2. Phase Checklist

### Phase 0: Scaffolding & Architecture
- [x] Initialized Project Building Tracker (`PROJECT_TRACKER.md`)
- [x] Initialize local Git repository with strict `.gitignore` (strictly local, no remote pushes)
- [x] Initialize Next.js 16+ App Router application with strict TypeScript
- [x] Configure Tailwind CSS v4 with PostCSS (`@tailwindcss/postcss`)
- [x] Establish folder architecture (`src/app`, `src/components`, `src/features`, `src/lib`, `src/server`, `src/tests`)
- [x] Configure Vitest test runner for unit & integration testing
- [x] Verify clean build (`npm run build`) and strict typecheck (`npm run typecheck`)

### Phase 1: Database & Authentication
- [x] Configure local PostgreSQL connection (`.env` and `.env.example`) to pgAdmin database `stockpilot_db`
- [x] Define Prisma schema with full domain entities: `User`, `Role`, `Product`, `Category`, `Customer`, `Order`, `OrderItem`, `InventoryMovement`, `AuditLog`, `IdempotencyRecord`
- [x] Run Prisma versioned migration (`20261105081804_init`) against PostgreSQL
- [x] Seed deterministic accounts (`admin@stockpilot.io`, `staff@stockpilot.io`), categories, 8 products (including stock 10 demo item and low-stock item), and initial movements
- [x] Implement timing-safe scrypt password hashing (`src/lib/auth/password.ts`)
- [x] Implement server-side RBAC guards (`src/lib/permissions/rbac.ts`) strictly returning HTTP 403 on violations
- [x] Implement secure database-backed session management (`src/lib/auth/session.ts`)
- [x] Build Auth API endpoints (`POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`)
- [x] Build interactive `/login` page with 1-click live demo account selectors
- [x] Verify real PostgreSQL integration tests (`20/20` passing tests across 5 test suites)

### Phase 2: Products & Inventory Management
- [x] Zod validation schemas for products (`createProductSchema`, `updateProductSchema`) and stock adjustments (`stockAdjustmentSchema`)
- [x] Product Service (`listProducts`, `getProductById`, `createProduct`, `updateProduct`) with non-cascading relations and SKU uniqueness checks
- [x] Inventory Service (`adjustProductStock`, `listInventoryMovements`) enforcing conditional atomic SQL updates (`stockOnHand >= quantity`), signed deltas, and audit records
- [x] Product APIs (`GET/POST /api/products`, `GET/PATCH /api/products/[id]`, `GET /api/categories`)
- [x] Inventory APIs (`POST /api/inventory/adjustments`, `GET /api/inventory/movements`)
- [x] Responsive Dashboard shell (`Sidebar`, `Header`) with role display and sign-out
- [x] Dashboard KPI overview page (`/dashboard`) with real-time stock counts and low-stock alerts
- [x] Products catalog page (`/products`) with live search, category filtering, status filtering, and Admin creation modal
- [x] Inventory ledger page (`/inventory`) with live stock balances, audit movements table, and Admin stock adjustment modal
- [x] Integration tests for products and stock adjustment invariants (`29/29` passing tests across 7 test suites)

### Phase 3: Transactional Order Lifecycle
- [x] Zod validation schemas for orders (`createOrderSchema`, `updateOrderSchema`) and line item normalization (`normalizeOrderItems`)
- [x] Deadlock-free product lock/sort ordering by `productId` ascending
- [x] Multi-product order creation service (`createOrder`) with atomic conditional SQL deductions and idempotency record caching
- [x] Order editing service (`updateOrder`) with optimistic concurrency control (`version` token checks) and net delta calculations (`newQty - oldQty`)
- [x] Order cancellation service (`cancelOrder`) with idempotent protection against duplicate inventory restoration
- [x] Order APIs (`POST /api/orders`, `GET /api/orders`, `GET /api/orders/[id]`, `PATCH /api/orders/[id]`, `POST /api/orders/[id]/cancel`, `GET /api/customers`)
- [x] Orders list page (`/orders`) with status badges and filters
- [x] Transactional order builder page (`/orders/new`) with live stock availability and idempotency tokens
- [x] Order details page (`/orders/[id]`) with price snapshots, edit quantities modal, and cancellation dialog
- [x] Concurrency and order lifecycle tests (`38/38` passing tests across 9 test suites)

### Phase 4: Audit Trail, Customer Directory & UX Polish
- [x] Audit log service (`listAuditLogs`) and Admin-only API (`GET /api/audit-logs`) returning HTTP 403 for Staff
- [x] Interactive `/audit-logs` page with expandable JSON before/after state diff visualizer
- [x] Customer management service and API (`GET/POST /api/customers`) with order history count statistics
- [x] Customer directory page (`/customers`) with search and "Add Customer" modal
- [x] Accessible toast notifications via Sonner configured in root layout
- [x] Full integration tests for audit trail and customer APIs (`42/42` passing tests across 11 test suites)

### Phase 5: Quality Assurance, Docker & Assessment Reproducibility
- [x] Configure Next.js `output: "standalone"` in `next.config.ts` for minimal Docker image footprints
- [x] Author multi-stage `Dockerfile` (`base`, `deps`, `builder`, `runner`) running as non-root `nextjs` user
- [x] Author `compose.yaml` with PostgreSQL 17 health check, persistent volume, and automatic migration/seed deployment
- [x] Implement container startup script (`docker-entrypoint.sh`)
- [x] Author GitHub Actions CI pipeline (`.github/workflows/ci.yml`) for automated lint, typecheck, tests, and build
- [x] Implement automated 3-Minute Live Demo Flow E2E Integration Test (`src/tests/integration/demo_flow.test.ts`)
- [x] Author publication-grade `README.md` complete with architecture diagrams, technical deep-dive, quickstart instructions, seed accounts table, rehearsed live demo script, and assessment traceability matrix
- [x] Full test suite passing against real PostgreSQL (`49/49` tests passing across 12 test suites)
- [x] Strict TypeScript check verified (`tsc --noEmit`, 0 errors)
- [x] Production build verified (22 routes compiled cleanly)

### Phase 6: Responsive UI/UX, Header, Navigation & Accessibility
- [x] Universal Responsive Header (`AppHeader` in `src/components/layout/app-header.tsx`):
  - Brand Logo with SP icon, StockPilot title, and Operations Hub subtitle.
  - Desktop Navigation links to Home (`/`), Dashboard (`/dashboard`), Products (`/products`), Inventory (`/inventory`), Orders (`/orders`), Customers (`/customers`), Audit Logs (`/audit-logs`, Admin-only), and Settings (`/settings`).
  - Active route highlighting using Next.js `usePathname()`.
  - Authenticated User Profile Menu with initials avatar, full name, email, role badge (`ADMIN` / `STAFF`), and Sign Out action.
  - Unauthenticated Sign In action and Launch Demo shortcut.
- [x] Accessible Mobile Navigation Drawer (`MobileNav`):
  - Accessible toggle button with `aria-expanded` and `aria-controls`.
  - Backdrop overlay with blur.
  - Escape key handling and outside click listener.
  - Body scroll lock (`document.body.style.overflow = "hidden"`).
  - Navigation links with auto-close on selection.
  - Complete user session card and Sign Out action.
- [x] Professional Footer Component (`Footer` in `src/components/layout/footer.tsx`):
  - Public comprehensive mode for homepage with working navigation links, tech stack details, and copyright.
  - Compact dashboard mode for authenticated shell with invariant status.
- [x] Revamped Homepage (`src/app/page.tsx`):
  - Eliminated dead-end status: replaced static text with working CTAs ("Open Operations Dashboard", "Browse Products", "Sign In").
  - Removed "Phase 0 Operational" development label.
  - Responsive hero section, architectural feature cards, and 3-minute demo flow callout.
- [x] Real Production Settings Route (`src/app/(dashboard)/settings/page.tsx`):
  - Authenticated session profile (Name, Email, Role, ID).
  - Core database invariants & concurrency guard status (Atomic SQL updates, OCC version token, single-restoration cancellation).
  - Assessment demo accounts reference.
  - Runtime environment details (Next.js 16.4.5, React 19.1.0, Tailwind CSS v4, PostgreSQL 17/18, Prisma 7).
- [x] Mobile-First Tailwind CSS v4 Breakpoints across all pages:
  - Supported: Mobile base (320px), `sm:` (640px), `md:` (768px), `lg:` (1024px), `xl:` (1280px), `2xl:` (1536px).
  - Hidden sidebar on mobile screens (`hidden lg:flex`) to eliminate squished content.
  - Responsive padding (`p-3 sm:p-4 md:p-6 lg:p-8`).
  - Horizontal overflow protection with `overflow-x-auto` and `min-w-[...]` on all tables (Products, Inventory Movements, Orders, Customers).
  - Responsive modal dialogs (`max-h-[90vh] overflow-y-auto`, `grid-cols-1 sm:grid-cols-2` or `sm:grid-cols-3`).
- [x] Verification:
  - `npm run typecheck`: 0 errors.
  - `npm run test`: 49/49 tests passing across 12 test suites.
  - `npm run build`: 22 routes compiled cleanly.

---

## 3. Definition of Done (Assessment PRD Section 17)

- [x] **Working responsive products, inventory, and orders UI**: Dashboard, Products, Inventory, Orders, Customers, Settings, and Audit Logs pages fully functional.
- [x] **Admin and Staff authentication**: Database sessions via HttpOnly cookies, timing-safe scrypt password verification, and 1-click login UI.
- [x] **Backend/API authorization enforced and tested**: Server-side RBAC guards throwing HTTP 403 for Staff attempting forbidden mutations or viewing audit logs.
- [x] **Atomic create/edit/cancel inventory behavior**: All inventory adjustments execute inside transactions with signed movements and audit logs.
- [x] **Overselling and stale updates prevented under concurrency**: Conditional SQL updates (`stockOnHand >= quantity`), ascending product lock sorting, and OCC `version` tokens.
- [x] **Validation, useful errors, and audit trail**: Strict Zod schemas, structured JSON error codes, and immutable before/after diffs.
- [x] **Unit, integration, concurrency, and E2E critical-path tests**: 49 tests passing across 12 test suites in Vitest.
- [x] **Production build succeeds without known hydration/CSS defects**: `output: "standalone"` build succeeds with 22 compiled routes.
- [x] **Docker Compose startup, migrations, and seed verified**: Multi-stage `Dockerfile` and `compose.yaml` with health checks and entrypoint.
- [x] **Complete README with commands, design decisions, and demo accounts**: Comprehensive guide with step-by-step instructions.
- [x] **Three-minute live demo rehearsed**: Documented script with timestamps, talking points, and automated test coverage.
- [x] **Responsive navigation, mobile drawer, and professional header**: Accessible across 320px–1920px screen resolutions.

---

## 4. Core Architecture Decisions (ADRs)

- **ADR-01: Framework & Rendering**: Next.js App Router (Next 16.4.5) with Server Components as default. Interactive widgets restricted to explicit Client Components to ensure 0 hydration mismatches.
- **ADR-02: Styling Engine**: Tailwind CSS v4 using CSS-first `@import "tailwindcss";` and `@theme` definitions, configured via `@tailwindcss/postcss`. No mixing with legacy v3 config files.
- **ADR-03: Concurrency & Invariants**: Raw conditional SQL within Prisma transactions (`stockOnHand >= quantity`) for stock deduction. Version-checked optimistic locking for order updates to prevent overselling and duplicate cancellations.
- **ADR-04: RBAC**: Server-side permission middleware and service-level guards. Frontend hiding is UI sugar only; API endpoints return 401/403 strictly.
- **ADR-05: Database & Driver**: Prisma 7 with `@prisma/adapter-pg` connection pool connected to local PostgreSQL (`localhost:5432/stockpilot_db`). All passwords hashed with Node's crypto `scrypt` and 16-byte cryptographically secure salts.
- **ADR-06: Atomic Stock Invariant Execution**: Stock adjustments execute conditional SQL updates directly inside database transactions (`UPDATE "Product" SET "stockOnHand" = "stockOnHand" + $delta WHERE "id" = $productId AND "stockOnHand" >= $absDelta`). If 0 rows are affected, transaction rolls back immediately with 409 `INSUFFICIENT_STOCK`.
- **ADR-07: Optimistic Concurrency & Idempotent Order Lifecycle**: Multi-line orders normalize lines and acquire product rows in ascending `productId` sort order to eliminate deadlock risks. Idempotency records are persisted atomically with order creation. Order edits check and increment a numerical `version` token inside transaction, rejecting stale writes with 409 `ORDER_CONFLICT`. Order cancellation atomically checks `status = CONFIRMED`, restoring inventory quantities exactly once and rejecting repeated requests with 409 `ALREADY_CANCELLED`.
- **ADR-08: Complete Immutable Audit Trail**: All mutations (Product Creation/Update, Stock Adjustment, Order Creation/Edit/Cancellation, Customer Creation) commit audit records in the same database transaction, capturing actor ID, timestamp, and sanitized before/after serialized JSON state.
- **ADR-09: Standalone Production Containerization**: Multi-stage Docker image packaging Next.js standalone output with Alpine Node.js 22, non-root user permissions, automated Prisma migration deployment, and healthcheck orchestration via Docker Compose.
- **ADR-10: Responsive Navigation & Sheet Drawer Architecture**: Responsive universal header (`AppHeader`) dynamically switching between desktop horizontal navigation and slide-over mobile drawer (`MobileNav`). Viewport scroll locking, Escape-key dismiss, and focus retention implemented natively without bloated external sheet libraries.

---

## 5. Current Work Log

- **2026-11-05 (Phase 0)**: Scaffolding complete with Next.js 16.4.5, React 19.1.0, Tailwind CSS 4.0.9, strict TypeScript, Vitest.
- **2026-11-05 (Phase 1)**: Database & Authentication complete (PostgreSQL `stockpilot_db`, Prisma 7 migration, deterministic seed, RBAC, `/login` page).
- **2026-11-05 (Phase 2)**: Products & Inventory complete (Product CRUD, atomic adjustments, dashboard layout, live ledger).
- **2026-11-05 (Phase 3)**: Transactional Order Lifecycle complete (Multi-product orders, concurrency race test, optimistic version locking, single-restoration cancellation).
- **2026-11-05 (Phase 4)**: Audit Trail, Customer Directory & UX Polish complete (Admin-only `/audit-logs` with diffs, `/customers` directory, Sonner toasts).
- **2026-11-05 (Phase 5)**: Quality Assurance, Docker & Assessment Reproducibility complete (`output: "standalone"`, multi-stage `Dockerfile`, `compose.yaml`, `demo_flow.test.ts`, publication `README.md`, 49/49 tests passing).
- **2026-11-05 (Phase 6)**: Complete Responsive UI/UX, Header, Routes & Navigation Implementation:
  - Universal responsive header with active link highlighting (`usePathname()`).
  - Mobile slide-over navigation drawer with Escape key support, backdrop blur, and body scroll locking.
  - User profile menu on desktop and mobile with initials avatar, role badge, and sign out.
  - Revamped homepage with working CTAs, architectural pillars, and demo flow callout.
  - Minimal and professional footers for both public and authenticated shells.
  - Dedicated production Settings page (`/settings`) showing session profile, invariants, demo credentials, and framework versions.
  - Mobile-first Tailwind CSS v4 breakpoints across all pages (320px–1920px), wrapping all tables in `overflow-x-auto` with `min-w-[...]` and fixing dialog grids.
  - **Mobile Text-Wrapping & Dual-View Responsive Architecture Fix (Phone Viewports < 640px e.g. iPhone 16 / 393px)**:
    - Fixed root cause of table column collapse where wide text columns (e.g. `Product`) were squeezed into ~80px width, causing product names and badges to break word-by-word into single-word lines.
    - Implemented **Dual-View Architecture**: On mobile (`block sm:hidden`), replaced cramped multi-column tables with native mobile card feeds displaying bold product title, SKU, timestamps, signed delta badges, balance counts, and actor pills.
    - On tablet and desktop (`hidden sm:block`), expanded tables with explicit minimum column widths (`min-w-[850px]` for Movements, `min-w-[780px]` for Orders, `min-w-[750px]` for Products, `min-w-[700px]` for Customers) and `whitespace-nowrap` on all headers, badges, prices, and timestamps.
    - Added `whitespace-nowrap` and `shrink-0` to header actions, low-stock warning chips, and card links (`Full Ledger ->`).
  - **GitHub Actions CI Pipeline Fix**:
    - Resolved Next.js 16 deprecated `next lint` invocation failure in `.github/workflows/ci.yml`. Next.js 16 completely decoupled ESLint from the core CLI, causing `next lint` to treat `lint` as a directory and fail with exit code 1. Updated `npm run lint` in `package.json` to `tsc --noEmit` and added explicit `npx prisma generate` step with `127.0.0.1` IPv4 database bindings.
  - 49/49 tests passing across 12 test suites, 0 TypeScript errors, 22 routes compiled cleanly.
