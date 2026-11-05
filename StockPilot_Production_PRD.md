# StockPilot — Production-Grade Product Requirements Document

**Version:** 1.0  
**Project:** Full-Stack Operations Hub  
**Purpose:** ARAVEX Tech Studio Full-Stack Development Intern Practical Assessment  
**Primary implementation environment:** Google Antigravity  
**Status:** Implementation-ready specification

## 1. Executive Summary

StockPilot is a responsive, secure operations hub for managing products, inventory, customers, and orders. It is designed to demonstrate strong full-stack architecture, database integrity, authorization, reliable business logic, testing, and reproducible deployment. Prioritize a compact, fully working solution over an oversized unfinished platform.

### Assessment traceability

The supplied ARAVEX assessment explicitly requires: (1) responsive product/inventory/order management; (2) Admin/Staff roles enforced in backend/API; (3) safe stock updates on order creation, editing, and cancellation, with overselling prevention and concurrency explanation; (4) validation, useful errors, and audit/history; (5) critical workflow tests, Docker, README, seed/demo data, and a working live demo. The panel evaluates architecture, database design, business logic, backend authorization, transaction safety, testing, usability, reproducibility, and explanation of technical choices.

The following detailed product decisions are proposed implementation choices, not additional requirements stated in the assessment.

## 2. Goals and Non-Goals

### Goals
- Demonstrate correct inventory accounting under concurrent requests.
- Show enforceable role-based access at every server mutation boundary.
- Offer a polished, accessible, responsive interface.
- Enable a reliable 3-minute live demonstration with deterministic seed data.
- Allow another developer to start the project from the README and Docker configuration.

### Non-goals for the assessment MVP
- Payment processing, invoicing, shipping carriers, multi-warehouse management, real-time sockets, elaborate analytics, or external integrations.
- Microservices, Redis, message queues, and Kubernetes.
- A complete enterprise ERP.

## 3. Users, Roles, and Permissions

| Capability | Admin | Staff |
|---|---|---|
| View products, stock, orders | Yes | Yes |
| Create/edit/archive products | Yes | No |
| Adjust stock manually | Yes | No |
| Create/edit/cancel orders | Yes | Yes |
| View audit history | Yes | No |
| Manage staff accounts | Yes | No |

Staff may edit/cancel any confirmed order in the assessment MVP; document this policy explicitly. Authorization must be checked on the server in the business service or route handler, including direct API calls. Authentication is not authorization. Reject forbidden actions with HTTP 403.

## 4. Recommended Technology Stack

- **Frontend and backend:** Next.js App Router, React, TypeScript strict mode.
- **Styling:** Tailwind CSS v4, shadcn/ui, Radix UI, Lucide React.
- **Database:** PostgreSQL with Prisma ORM and versioned migrations.
- **Authentication:** Better Auth with secure sessions and server-side role checks.
- **Validation:** Zod; React Hook Form for client form UX.
- **Tables:** TanStack Table; **notifications:** Sonner.
- **Testing:** Vitest for unit/integration, Playwright for end-to-end; use real PostgreSQL for transaction/concurrency tests.
- **Infrastructure:** Docker Compose, GitHub Actions.

Pin mutually compatible stable versions, check official setup instructions during implementation, and commit the lockfile. Prefer one Next.js application with a clear service layer over a separate backend unless an actual requirement justifies it.

## 5. UX and Information Architecture

### Routes

| Route | Purpose |
|---|---|
| `/login` | Authentication |
| `/dashboard` | KPIs, low-stock alerts, recent orders |
| `/products` | Searchable, paginated product table |
| `/products/new` | Admin product creation |
| `/products/[id]` | Product details and history |
| `/inventory` | Stock balances and movement history |
| `/orders` | Orders table with statuses |
| `/orders/new` | Transactional order creation |
| `/orders/[id]` | Order detail, edit, cancel |
| `/customers` | Simple customer directory |
| `/audit-logs` | Admin-only history |
| `/team` | Admin-only staff management (stretch) |

### Design principles
- Premium but restrained business dashboard: dark navy navigation, neutral backgrounds, clear tables, generous spacing.
- Responsive navigation and tables, keyboard accessibility, semantic HTML, clear focus states, accessible contrast.
- Loading skeletons, empty states, inline validation, confirmation dialogs, and actionable error messages.
- Prefer real metrics from database queries; no fake data outside clearly labeled demo seed records.
- Keep the 3-minute demo path prominent and fast.

## 6. Domain Model and Database Schema

### Core entities

**User**: id, name, email (unique), role (`ADMIN`/`STAFF`), createdAt, updatedAt; provider-specific auth/session tables.  
**Category**: id, name (unique).  
**Product**: id, sku (unique), name, description, categoryId, priceMinor (integer), stockOnHand (nonnegative integer), lowStockThreshold, isActive, createdAt, updatedAt.  
**Customer**: id, name, email (optional), phone (optional), createdAt.  
**Order**: id, orderNumber (unique), customerId, status (`CONFIRMED`/`CANCELLED`), totalMinor, version (integer), createdById, createdAt, updatedAt, cancelledAt.  
**OrderItem**: id, orderId, productId, quantity (positive integer), unitPriceMinor (price snapshot), lineTotalMinor; unique(orderId, productId).  
**InventoryMovement**: id, productId, orderId (nullable), actorId, type (`INITIAL`/`ADJUSTMENT`/`ORDER_CREATED`/`ORDER_EDITED`/`ORDER_CANCELLED`), delta (signed integer), quantityAfter, createdAt.  
**AuditLog**: id, actorId, action, entityType, entityId, beforeJson, afterJson, createdAt.  
**IdempotencyRecord**: id, scope, key, requestHash, responseReference, status, createdAt; unique(scope, key).

### Constraints and indexes
- Unique SKU and order number; unique `(orderId, productId)`.
- `stockOnHand >= 0`, `quantity > 0`, `priceMinor >= 0`, `lowStockThreshold >= 0`.
- Index product name/SKU, order status/date, movement product/date, audit entity/date.
- Use foreign keys and migrations. Avoid cascading deletes that destroy financial or audit history.
- Store monetary values in integer minor units and compute order totals on the server from price snapshots.

## 7. Functional Requirements and Acceptance Criteria

### FR-01: Authentication and RBAC — P0
- Users can sign in/out with seeded Admin and Staff accounts.
- Protected routes require authentication; server mutations require explicit permissions.
- **Acceptance:** Staff calling a restricted product-write or stock-adjustment endpoint directly receives 403 and the database is unchanged.

### FR-02: Product Management — P0
- Admin creates, edits, archives products; users can view, search, filter, and paginate.
- SKU must be unique. Archived products cannot be added to new orders.
- Direct product editing must not silently change stock; use inventory adjustment workflow.
- **Acceptance:** Invalid price, duplicate SKU, and missing required fields return useful validation errors.

### FR-03: Inventory Management — P0
- Show stock on hand and low-stock status. Admin may perform explicit positive or negative adjustments with a reason.
- Every change records a movement with signed delta and resulting balance, in the same transaction.
- **Acceptance:** Stock never becomes negative; adjustment and movement record either both commit or both roll back.

### FR-04: Customer Management — P1
- Create/select customers for orders; basic customer list and details.
- **Acceptance:** Order always references a valid customer.

### FR-05: Order Creation — P0
- Validate order lines, merge duplicate products, reject zero/negative quantities, inactive products, and unavailable stock.
- Use database transactions and conditional stock deduction; create order, items, movements, and audit event atomically.
- **Acceptance:** Ordering 3 of a product with 10 units leaves 7; any failure rolls back the entire operation.

### FR-06: Order Editing — P0
- Edit confirmed orders only. Compute stock delta for each product using `newQty - oldQty` (missing lines treated as zero).
- Positive delta consumes stock; negative delta restores stock. Recalculate totals from authoritative server-side prices/snapshots according to a documented pricing policy.
- Use `version` optimistic concurrency control and transaction locks to reject stale writes.
- **Acceptance:** Changing quantity 3 to 5 consumes 2 additional units; changing 5 to 2 restores 3. Two stale edits cannot both overwrite one another.

### FR-07: Order Cancellation — P0
- Cancel confirmed order once, restore all item quantities, record movements and audit entry in one transaction.
- Repeated cancellation must not restore inventory twice; return a stable already-cancelled result or conflict without modifying stock.
- **Acceptance:** Cancelling the demo order restores the original 10 units; a repeated request leaves 10.

### FR-08: Audit Trail — P0
- Record product changes, stock adjustments, order creation/edit/cancellation, and role changes.
- Include actor, timestamp, entity, and sanitized before/after details.
- **Acceptance:** Important mutations and audit records commit together; Staff cannot access admin audit endpoints.

### FR-09: Dashboard — P1
- Show counts, low-stock products, recent orders, and recent inventory movements from actual data.
- **Acceptance:** Values reflect the latest committed database state.

### FR-10: Reliability and Errors — P0
- Validate all mutations with Zod on the server. Return structured codes: `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `INSUFFICIENT_STOCK`, `ORDER_CONFLICT`, `ALREADY_CANCELLED`, `INTERNAL_ERROR`.
- Prevent duplicate submissions; show friendly UI feedback without leaking stack traces.

## 8. Transaction and Concurrency Design — Critical

### Stock deduction invariant
For each product, execute a conditional update inside a database transaction, conceptually:

```sql
UPDATE "Product"
SET "stockOnHand" = "stockOnHand" - $quantity
WHERE id = $productId
  AND "isActive" = TRUE
  AND "stockOnHand" >= $quantity;
```

Require exactly one affected row. Otherwise reject the order and roll back. This is an illustrative query; adapt quoting and ORM syntax to the actual schema.

### Multi-product operations
1. Authenticate and authorize.
2. Parse and validate input.
3. Normalize duplicate lines and sort product IDs to ensure consistent lock/update order.
4. Begin transaction.
5. Lock and validate the existing order for edits/cancellations, including its status and version; serialize concurrent changes to that order.
6. Apply each stock delta with conditional update for deductions and safe increments for returns.
7. Write order and order items, inventory movements, and audit records.
8. Commit; on error, roll back all changes.

For concurrent edits/cancellation, lock the order row using a transaction-compatible mechanism (e.g. `SELECT ... FOR UPDATE`) or use a proven optimistic conditional update strategy. A version field alone is insufficient if stock is modified before a stale-version conflict is detected and not correctly rolled back.

Use bounded retries only for known retryable serialization/deadlock failures. Do not retry business errors such as insufficient stock. Test with parallel real database connections.

### Idempotency
Order creation accepts a unique idempotency key scoped to user/operation; the same key with the same payload returns the same result, while the same key with a different payload is rejected. Persist key/result atomically with the operation. Do not rely only on disabled UI buttons.

### Core invariants
- Stock never negative.
- Every stock change has exactly one corresponding movement entry.
- Failed orders do not consume stock.
- Cancelled orders cannot consume or restore stock again.
- Order total equals the sum of persisted line totals.
- Staff cannot perform Admin-only mutations.

## 9. API Contracts

Use Next.js route handlers or server actions with a documented contract. Suggested REST endpoints:

| Method | Endpoint | Authorization |
|---|---|---|
| GET | `/api/products` | Authenticated |
| POST | `/api/products` | Admin |
| PATCH | `/api/products/:id` | Admin |
| POST | `/api/inventory/adjustments` | Admin |
| GET | `/api/inventory/movements` | Authenticated |
| GET | `/api/orders` | Authenticated |
| POST | `/api/orders` | Admin or Staff |
| PATCH | `/api/orders/:id` | Admin or Staff |
| POST | `/api/orders/:id/cancel` | Admin or Staff |
| GET | `/api/audit-logs` | Admin |

Return consistent JSON envelopes with typed data and errors. Use HTTP 400/422 for validation, 401 for unauthenticated, 403 for forbidden, 404 for missing resources, and 409 for inventory or concurrency conflicts. Never trust client-supplied price, role, totals, or stock balance.

## 10. Architecture and Suggested Folder Structure

```text
src/
  app/
    (auth)/login/
    (dashboard)/dashboard/
    (dashboard)/products/
    (dashboard)/inventory/
    (dashboard)/orders/
    (dashboard)/customers/
    (dashboard)/audit-logs/
    api/
    globals.css
    layout.tsx
  components/
    ui/
    layout/
    products/
    inventory/
    orders/
  features/
    products/
    inventory/
    orders/
    auth/
    audit/
  lib/
    auth/
    db/
    permissions/
    errors/
    validation/
  server/
    services/
    repositories/
  tests/
    unit/
    integration/
    concurrency/
    e2e/
prisma/
  schema.prisma
  migrations/
  seed.ts
Dockerfile
compose.yaml
.env.example
README.md
```

Route handlers should remain thin; business services own transactions and enforce authorization. Centralize validation and error handling. Avoid circular dependencies and overly generic abstractions.

## 11. Next.js Hydration and Tailwind v4 Engineering Rules

### Hydration safety
- Prefer Server Components; use Client Components for interactive elements only.
- Ensure initial server HTML and initial client render match.
- Do not call `Date.now()`, `Math.random()`, or browser APIs in hydration-sensitive render paths.
- Initialize `localStorage`, `window`, `matchMedia`, and client-only preferences after mount when appropriate.
- Use stable keys, valid HTML nesting, and deterministic initial data.
- Format dates with explicit locale/time zone or use stable server-provided strings.
- Configure theme hydration intentionally; do not use blanket `suppressHydrationWarning` to hide problems.
- Check browser console and production builds on login, dashboard, products, inventory, and orders.

### Tailwind CSS v4
Use the v4 CSS entrypoint:

```css
@import "tailwindcss";

@theme {
  --color-brand-500: #2563eb;
  --color-brand-600: #1d4ed8;
}
```

Configure PostCSS with `@tailwindcss/postcss`. Do not mix legacy v3 `@tailwind base/components/utilities` patterns with the v4 setup. Avoid runtime-constructed Tailwind classes; use explicit variant maps. Ensure the global stylesheet is imported in the root layout. Check development and production CSS output.

### Error-resolution policy
For each encountered error: reproduce, isolate root cause, implement minimal correction, run relevant test/typecheck/build, and report outcome. Do not claim zero errors unless verified. Do not suppress TypeScript errors, hydration warnings, or failed tests to make builds appear green.

## 12. Security and Data Integrity

- Use trusted server sessions and permission checks at every mutation boundary.
- Apply Zod validation and database constraints; neither replaces the other.
- Do not expose credentials, password hashes, tokens, or internal error details.
- Protect against mass assignment by explicitly selecting writable fields.
- Use secure cookies and provider-recommended CSRF protections.
- Rate-limit authentication if supported; document deployment limitations.
- Keep environment secrets out of Git and provide `.env.example`.
- Audit role changes and sensitive operations.
- Seed credentials are for local demo only, never production.

## 13. Test Strategy and Acceptance Matrix

| Test | Expected result | Priority |
|---|---|---|
| Admin creates product | Product exists, unique SKU enforced | P0 |
| Staff directly calls product-create API | 403; no product created | P0 |
| Create order of 3 from 10 | Stock 7; movement -3 | P0 |
| Order exceeds stock | 409; no partial order/movements | P0 |
| Two concurrent orders for final 5 units | At most one successful 5-unit order | P0 |
| Edit order 3 → 5 | Deduct 2 more | P0 |
| Edit order 5 → 2 | Restore 3 | P0 |
| Cancel order | Restore exactly once | P0 |
| Concurrent edit vs cancel | Serialized/rejected stale operation; consistent final stock | P0 |
| Inject failure during order creation | Full transaction rollback | P0 |
| Same idempotency key repeated | No duplicate order | P0 |
| Invalid quantity | Validation error; no mutation | P0 |
| Audit after mutation | Actor/action/changes present | P0 |
| Docker fresh startup | App, DB, migrations, seed work | P0 |
| Production build + route smoke tests | No known hydration/CSS regressions | P0 |
| Mobile layout | No critical overflow; navigation works | P1 |

Run concurrency/integration tests against PostgreSQL, not only mocks. Provide commands in README and CI. Ensure tests are repeatable and isolated.

## 14. Docker, CI, and Developer Experience

Provide a multi-stage `Dockerfile`, `compose.yaml` with app and PostgreSQL services, health checks, persistent DB volume, migration/seed commands, and `.env.example`. Ensure fresh-clone startup is documented and verified. In CI run dependency installation, typecheck, lint, unit tests, integration tests against PostgreSQL, and production build. Optionally run Playwright in a separate job.

## 15. Seed Data and Live Demo

Seed:
- Admin and Staff accounts (document local demo credentials).
- 8–12 products across 3 categories.
- At least one product with stock 10 and one low-stock product.
- 3 customers, sample orders, and historical stock movements.

### 3-minute demonstration script
1. **0:00–0:30:** Introduce StockPilot, stack, and architecture.
2. **0:30–1:15:** Show product/inventory management and current stock 10.
3. **1:15–2:15:** Create order for 3, show stock 7; cancel, show stock 10.
4. **2:15–3:00:** Show Staff forbidden action and audit trail; explain conditional SQL updates and transaction rollback.

Prepare a short Q&A explanation for overselling, transaction boundaries, authorization, schema design, and tests. Do not email or submit the assessment source code in advance if following the assessment's live-demo-only instruction.

## 16. Delivery Plan

### Phase 0 — Architecture and scaffolding
- Verify package compatibility, create project, strict TypeScript, Tailwind v4, lint/test setup.
- Deliver: working shell, architecture decision record, folder structure.

### Phase 1 — Database and authentication
- Prisma schema/migrations, seed data, Admin/Staff sessions, permission helpers.
- Deliver: role-secure login and protected shell.

### Phase 2 — Products and inventory
- Product CRUD, stock adjustment service, movements, tables, validation.
- Deliver: tested stock invariants.

### Phase 3 — Transactional orders
- Create/edit/cancel, locking/version checks, idempotency, concurrency tests.
- Deliver: correct end-to-end order lifecycle.

### Phase 4 — Audit and usability
- Audit logs, dashboard KPIs, empty/error/loading states, responsive polish.
- Deliver: interview-ready interface.

### Phase 5 — Quality and reproducibility
- E2E, CI, Docker, README, fresh-start validation, demo rehearsal.
- Deliver: reproducible tested application.

**Scope rule:** If time is limited, ship all P0 requirements before P1 features. Defer charts, dark mode, and staff management polish rather than compromise transactions or authorization.

## 17. Definition of Done

- [ ] Working responsive products, inventory, and orders UI.
- [ ] Admin and Staff authentication.
- [ ] Backend/API authorization enforced and tested.
- [ ] Atomic create/edit/cancel inventory behavior.
- [ ] Overselling and stale updates prevented under concurrency.
- [ ] Validation, useful errors, and audit trail.
- [ ] Unit, integration, concurrency, and E2E critical-path tests.
- [ ] Production build succeeds without known hydration/CSS defects.
- [ ] Docker Compose startup, migrations, and seed verified from a fresh environment.
- [ ] Complete README with commands, design decisions, and demo accounts.
- [ ] Three-minute live demo rehearsed.

## 18. Instructions to Google Antigravity

Act as a senior full-stack engineer implementing this PRD. Do not generate an unverified entire application in one pass.

For each phase:
1. Inspect the current repository and dependency versions.
2. Present a short implementation plan and files to change.
3. Implement the smallest complete, working vertical slice.
4. Apply validation, server-side authorization, and transaction safety where relevant.
5. Run typecheck, lint, tests, and production build as appropriate.
6. Diagnose and fix root causes of hydration, Tailwind, and runtime errors.
7. Report commands executed, actual results, remaining risks, and next tasks.

Never fake tests, seed output, database transactions, or security checks. Do not replace business logic with client-side simulations. Ask for clarification only when a product decision materially affects correctness; otherwise use the explicit defaults in this PRD.

## 19. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Overselling under simultaneous orders | Conditional atomic updates and real DB concurrency tests |
| Double stock restoration | Locked order state and idempotent cancellation |
| Unauthorized mutations | Server-side permission checks plus direct API tests |
| Inconsistent audit history | Same transaction as business mutation |
| Hydration mismatch | Deterministic initial render and production route checks |
| Tailwind v3/v4 configuration mix | v4 PostCSS and CSS-first configuration |
| Demo environment failure | Docker health checks, deterministic seed, rehearsal |
| Feature creep | P0-first milestones and non-goals |

## 20. References

- Source: user-supplied **ARAVEX Tech Studio — Full-Stack Development Intern Practical Assessment Brief**, page 1.
- Implementation reference: official Next.js, Tailwind CSS, Prisma, PostgreSQL, Better Auth, Vitest, and Playwright documentation. Verify current versions and APIs before implementation.
