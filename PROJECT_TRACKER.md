# StockPilot — Project Building Tracker

**Project:** StockPilot (Full-Stack Operations Hub)  
**Standard:** Production-Grade / ARAVEX Assessment Ready  
**Policy:** Local-only execution; all changes documented with design rationale and manual verification steps; zero remote git pushes.

---

## 1. Project Phase Roadmap

| Phase | Description | Status | Completion |
|---|---|---|---|
| **Phase 0** | Architecture, Scaffolding, Strict TS, Tailwind v4, Test Setup | ✅ Completed | 100% |
| **Phase 1** | Database (Prisma + PostgreSQL), Seed Data, Better Auth & RBAC | 🔄 Ready to Start | 0% |
| **Phase 2** | Products & Inventory Management (Atomic Movement Invariants) | ⏳ Pending | 0% |
| **Phase 3** | Transactional Order Lifecycle (Create/Edit/Cancel, Concurrency) | ⏳ Pending | 0% |
| **Phase 4** | Audit Trail, Dashboard KPIs, UX States & Accessibility | ⏳ Pending | 0% |
| **Phase 5** | Quality Assurance, E2E, Docker, Production Verification | ⏳ Pending | 0% |

---

## 2. Phase 0: Scaffolding & Architecture Checklist

- [x] Initialized Project Building Tracker (`PROJECT_TRACKER.md`)
- [x] Initialize local Git repository with strict `.gitignore` (strictly local, no remote pushes)
- [x] Initialize Next.js 16+ App Router application with strict TypeScript
- [x] Configure Tailwind CSS v4 with PostCSS (`@tailwindcss/postcss`)
- [x] Establish folder architecture (`src/app`, `src/components`, `src/features`, `src/lib`, `src/server`, `src/tests`)
- [x] Configure Vitest test runner for unit & integration testing
- [x] Verify clean build (`npm run build`) and strict typecheck (`npm run typecheck`)
- [x] Document manual inspection steps for verification

---

## 3. Core Architecture Decisions (ADRs)

- **ADR-01: Framework & Rendering**: Next.js App Router (Next 16.4.5) with Server Components as default. Interactive widgets restricted to explicit Client Components to ensure 0 hydration mismatches.
- **ADR-02: Styling Engine**: Tailwind CSS v4 using CSS-first `@import "tailwindcss";` and `@theme` definitions, configured via `@tailwindcss/postcss`. No mixing with legacy v3 config files.
- **ADR-03: Concurrency & Invariants**: Raw conditional SQL within Prisma transactions (`stockOnHand >= quantity`) for stock deduction. Version-checked optimistic locking for order updates to prevent overselling and duplicate cancellations.
- **ADR-04: RBAC**: Server-side permission middleware and service-level guards. Frontend hiding is UI sugar only; API endpoints return 401/403 strictly.

---

## 4. Current Work Log

- **2026-11-05**: Completed Phase 0:
  - Scaffolding configured with latest Next.js 16.4.5, React 19.1.0, Tailwind CSS 4.0.9, Vitest 3.2.7.
  - Strict TypeScript configuration verified (`npm run typecheck` passed with 0 errors).
  - Vitest test suite verified (`npm run test` passed 4/4 tests).
  - Next.js production build verified (`npm run build` passed with 0 errors).
  - Strictly local git repository initialized with complete `.gitignore`. Zero remote pushes.
  - Resolved browser extension attribute mismatch on `<body>` (`cz-shortcut-listen` injected by ColorZilla) via targeted `suppressHydrationWarning` on root layout elements.


