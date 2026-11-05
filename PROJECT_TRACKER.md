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
| **Phase 2** | Products & Inventory Management (Atomic Movement Invariants) | 🔄 Ready to Start | 0% |
| **Phase 3** | Transactional Order Lifecycle (Create/Edit/Cancel, Concurrency) | ⏳ Pending | 0% |
| **Phase 4** | Audit Trail, Dashboard KPIs, UX States & Accessibility | ⏳ Pending | 0% |
| **Phase 5** | Quality Assurance, E2E, Docker, Production Verification | ⏳ Pending | 0% |

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

---

## 3. Core Architecture Decisions (ADRs)

- **ADR-01: Framework & Rendering**: Next.js App Router (Next 16.4.5) with Server Components as default. Interactive widgets restricted to explicit Client Components to ensure 0 hydration mismatches.
- **ADR-02: Styling Engine**: Tailwind CSS v4 using CSS-first `@import "tailwindcss";` and `@theme` definitions, configured via `@tailwindcss/postcss`. No mixing with legacy v3 config files.
- **ADR-03: Concurrency & Invariants**: Raw conditional SQL within Prisma transactions (`stockOnHand >= quantity`) for stock deduction. Version-checked optimistic locking for order updates to prevent overselling and duplicate cancellations.
- **ADR-04: RBAC**: Server-side permission middleware and service-level guards. Frontend hiding is UI sugar only; API endpoints return 401/403 strictly.
- **ADR-05: Database & Driver**: Prisma 7 with `@prisma/adapter-pg` connection pool connected to local PostgreSQL (`localhost:5432/stockpilot_db`). All passwords hashed with Node's crypto `scrypt` and 16-byte cryptographically secure salts.

---

## 4. Current Work Log

- **2026-11-05 (Phase 0)**: Scaffolding complete with Next.js 16.4.5, React 19.1.0, Tailwind CSS 4.0.9, strict TypeScript, Vitest. Resolved browser extension body attribute hydration mismatch via `suppressHydrationWarning`.
- **2026-11-05 (Phase 1)**: Database & Authentication complete:
  - Local PostgreSQL `stockpilot_db` connected via `.env`.
  - Prisma schema with strict relational integrity, check constraints, and non-cascading delete protections for audit trail.
  - Applied migration `20261105081804_init`.
  - Executed deterministic seed: Admin (`admin@stockpilot.io` / `Admin123!`), Staff (`staff@stockpilot.io` / `Staff123!`), 8 products, 3 customers, initial inventory movements.
  - Implemented server RBAC, session cookie engine, Auth APIs, and `/login` page.
  - All 20/20 tests passing in Vitest, production build verified. Zero remote git pushes.


