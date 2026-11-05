# StockPilot — Production Operations Hub

[![TypeScript Strict](https://img.shields.io/badge/TypeScript-Strict_Mode-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.5_App_Router-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.1.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0.9-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-v7.10.1-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17%2F18-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Vitest](https://img.shields.io/badge/Vitest-49_Tests_Passing-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![Docker](https://img.shields.io/badge/Docker_Compose-Multi--Stage-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

**StockPilot** is a resilient, enterprise-grade operations hub engineered for managing inventory balances, multi-product order lifecycles, customer directories, and auditable stock movements under high concurrency. 

Built specifically for the **ARAVEX Tech Studio Full-Stack Development Intern Practical Assessment**, it demonstrates rigorous database transaction boundaries, conditional SQL stock deduction invariants, optimistic concurrency control (OCC), server-enforced role-based access control (RBAC), and 100% reproducible deployment via Docker Compose.

---

## 1. System Architecture & Technical Decisions

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Next.js App Router Shell                        │
│   (Server Components by default · Zero Hydration Mismatches · Shadcn)   │
└───────────────────▲────────────────────────────────▲───────────────────┘
                    │                                │
          HTTP JSON │ (Typed Zod Schemas)   Server Actions
                    │                                │
┌───────────────────▼────────────────────────────────▼───────────────────┐
│                    Server Service & Security Boundary                  │
│  - Session Manager (HttpOnly Cookies · Node Crypto Scrypt)            │
│  - Server RBAC Guard (Throws HTTP 403 on Unauthorized Mutations)       │
│  - Idempotency Interceptor (SHA-256 Request Hash Cache)                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Prisma Interactive Transactions
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL Database Engine                      │
│  - Sorted Ascending Lock Acquisition (Deadlock Prevention)             │
│  - Conditional Stock Invariant: UPDATE ... WHERE stockOnHand >= delta │
│  - Optimistic Version Verification: UPDATE ... WHERE version = expected│
│  - Atomic Immutable Audit Logs: beforeJson / afterJson Diffs           │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Architecture Highlights

1. **Atomic Stock Deduction Invariants (ADR-03 / ADR-06)**:
   - Rather than naive read-then-write loops (vulnerable to race conditions and overselling), deductions execute conditional SQL directly inside transactions:
     ```sql
     UPDATE "Product"
     SET "stockOnHand" = "stockOnHand" - $quantity
     WHERE "id" = $productId
       AND "isActive" = TRUE
       AND "stockOnHand" >= $quantity;
     ```
   - If affected row count is 0, the transaction aborts immediately and raises `409 INSUFFICIENT_STOCK`. The database never allows `stockOnHand < 0`.

2. **Deadlock Elimination in Multi-Product Orders (ADR-07)**:
   - When orders contain multiple items, concurrent transactions updating the same products in differing orders could deadlock. StockPilot normalizes line items and sorts product IDs in strict ascending order before row operations.

3. **Optimistic Concurrency Control (OCC) for Edits**:
   - Order records maintain a numeric `version` token. Updates supply the current known version. The update verifies `version = expected` and increments it. Stale parallel edits fail with `409 ORDER_CONFLICT`. Net stock deltas (`newQty - oldQty`) adjust inventory precisely.

4. **Single-Restoration Cancellation**:
   - Order cancellation checks status atomically (`status = CONFIRMED`). Once set to `CANCELLED`, all item quantities are credited back to inventory in the same transaction. Repeated cancellation requests return `409 ALREADY_CANCELLED` and never restore inventory twice.

5. **Server-Enforced RBAC (ADR-04)**:
   - Permissions (`products:write`, `inventory:adjust`, `audit:read`) are validated strictly on the server in service layers and route handlers. Frontend button visibility is purely cosmetic; direct API calls from Staff return `403 FORBIDDEN`.

6. **Immutable Audit Trail (ADR-08)**:
   - Every mutation (product creation, inventory adjustment, order creation/edit/cancellation) commits an audit record in the same database transaction, capturing the actor, entity ID, action, timestamp, and before/after serialized JSON state.

---

## 2. Seed Credentials & Demo Accounts

The database comes pre-seeded with deterministic accounts, 8 products (including demo item `PROD-SCAN-10`), 3 categories, and customer records:

| Role | Email | Password | Permissions Summary |
|---|---|---|---|
| **Admin** | `admin@stockpilot.io` | `Admin123!` | Full Access: Products CRUD, Manual Stock Adjustments, Order Lifecycles, Audit Trail Inspection |
| **Staff** | `staff@stockpilot.io` | `Staff123!` | Operational Access: View Catalog & Inventory, Create / Edit / Cancel Orders. (Blocked from stock adjustments & audit logs) |

*The `/login` screen also provides 1-click quick-fill buttons for immediate evaluation.*

---

## 3. Quickstart Options

### Option A: Docker Compose (Recommended — Zero Host Dependencies)

Ensure Docker Desktop is running, then execute:

```bash
docker compose up --build
```

- Boots PostgreSQL 17 on port `5432`.
- Automatically executes Prisma migrations (`prisma migrate deploy`).
- Seeds deterministic demo accounts and product catalogs (`prisma db seed`).
- Launches Next.js standalone production server at **[http://localhost:3000](http://localhost:3000)**.

To stop the containers:
```bash
docker compose down
```

---

### Option B: Local Development (Node.js & Local PostgreSQL / pgAdmin)

#### Prerequisites
- Node.js 20+ or 22+
- PostgreSQL running locally (e.g. pgAdmin 4 on `localhost:5432`)

#### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd stock-pilot
npm install
```

#### 2. Configure Environment Variables
Copy `.env.example` to `.env` and verify your PostgreSQL credentials:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stockpilot_db?schema=public"
BETTER_AUTH_SECRET="stockpilot-super-secure-assessment-session-secret-2026"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

#### 3. Run Migrations & Seed Database
```bash
# Push schema migrations to PostgreSQL
npx prisma migrate dev

# Seed deterministic demo data (Admin, Staff, 8 Products, Customers)
npm run db:seed
```

#### 4. Start Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 4. Quality Assurance & Test Verification

StockPilot includes a full Vitest test suite executing against real PostgreSQL:

```bash
# Run all unit, integration, concurrency, and E2E demo tests
npm run test

# Run strict TypeScript compiler verification (0 errors)
npm run typecheck

# Run Next.js production build verification (standalone output)
npm run build
```

### Test Suite Summary (49 Tests Across 12 Suites)
- **Concurrency**: Simultaneous burst orders competing for the final units (`concurrent_orders.test.ts`).
- **Live Demo Flow**: Automated end-to-end rehearsal of the 3-minute assessment script (`demo_flow.test.ts`).
- **Order Lifecycle**: Multi-product creation, delta editing, optimistic conflict, single cancellation (`order_lifecycle.test.ts`).
- **Stock Invariants**: Conditional deduction, negative stock rejection, signed movements (`inventory_adjustment.test.ts`).
- **RBAC Security**: Server rejection of Staff stock adjustments and audit access with HTTP 403 (`rbac.test.ts`, `audit_api.test.ts`).
- **Database Seed Integrity**: Password hashes, initial stock balances, and unique SKU enforcement (`db_seed.test.ts`).

---

## 5. Rehearsed 3-Minute Live Assessment Demonstration Script

| Timestamp | Phase | Demonstrator Action | Key Talking Points & Explanations |
|---|---|---|---|
| **0:00 – 0:30** | **Intro & Stack** | Sign in as `admin@stockpilot.io`. Show Dashboard overview. | *"StockPilot is built with Next.js 16 App Router, React 19, Tailwind CSS v4, and Prisma 7 with PostgreSQL. The architecture strictly isolates business services, guarantees atomic database transactions, and enforces server-side RBAC."* |
| **0:30 – 1:15** | **Product & Stock 10** | Navigate to `/products` and `/inventory`. Highlight `PROD-SCAN-10`. | *"Notice product `PROD-SCAN-10` currently has exactly 10 units on hand. Stock cannot be silently modified via product metadata updates; all adjustments require signed, audited ledger movements."* |
| **1:15 – 2:15** | **Order Lifecycle (3 &rarr; 5 &rarr; Cancel)** | 1. Go to `/orders/new`, create order for 3 units of `PROD-SCAN-10`.<br>2. Check inventory (stock drops to 7).<br>3. Open order detail, edit quantity from 3 to 5 (stock drops to 5).<br>4. Cancel order (stock restores to 10). | *"Order creation executes conditional SQL (`stockOnHand >= quantity`) in an atomic transaction. Editing computes net delta (`5 - 3 = 2 additional units`). Cancellation restores the full 5 units exactly once; repeated clicks return 409 `ALREADY_CANCELLED` and prevent double restoration."* |
| **2:15 – 3:00** | **RBAC & Audit Trail** | 1. Switch to Staff account.<br>2. Attempt to make a manual stock adjustment (blocked).<br>3. Switch to Admin and open `/audit-logs`. Show before/after JSON diffs. | *"Staff accounts cannot perform stock adjustments or view audit logs—enforced on the server with HTTP 403. Every operation commits an immutable audit record with full JSON before/after state diffs."* |

---

## 6. Assessment Requirements Traceability Matrix

| ARAVEX Assessment Requirement | Implementation Detail | Source File Reference |
|---|---|---|
| **Responsive Operations Hub** | Next.js App Router, Tailwind CSS v4, Lucide React, mobile-responsive layout | `src/components/layout/sidebar.tsx`, `src/app/globals.css` |
| **Admin & Staff RBAC** | Server-side role assertions; HTTP 403 rejection on unauthorized mutations | `src/lib/permissions/rbac.ts`, `src/lib/auth/session.ts` |
| **Safe Stock Deductions** | Conditional SQL: `UPDATE "Product" SET "stockOnHand" = ... WHERE "stockOnHand" >= delta` | `src/server/services/inventory.service.ts`, `src/server/services/order.service.ts` |
| **Overselling Prevention** | Row count verification (`affectedRows === 1`), rollback on zero rows | `src/tests/concurrency/concurrent_orders.test.ts` |
| **Order Edit Concurrency** | Optimistic Locking via `version` token check and net delta stock adjustments | `src/server/services/order.service.ts` (`updateOrder`) |
| **Order Cancellation** | Atomic state check (`status = CONFIRMED`), idempotent duplicate protection | `src/server/services/order.service.ts` (`cancelOrder`) |
| **Audit Log / History** | Immutable JSON diffs (`beforeJson`, `afterJson`) committed inside transactions | `src/server/services/audit.service.ts`, `src/app/(dashboard)/audit-logs/` |
| **Testing & Quality** | 49 Vitest unit, integration, concurrency, and E2E demo tests against PostgreSQL | `src/tests/` |
| **Reproducibility** | Multi-stage `Dockerfile`, `compose.yaml` with health checks, automated seed | `Dockerfile`, `compose.yaml`, `docker-entrypoint.sh` |

---

## 7. Project Structure

```text
stock-pilot/
├── .github/
│   └── workflows/ci.yml         # CI workflow for types, tests, and build
├── prisma/
│   ├── schema.prisma            # Domain models (User, Product, Order, AuditLog...)
│   ├── migrations/              # Versioned PostgreSQL migrations
│   └── seed.ts                  # Deterministic seed data (Admin, Staff, Products)
├── public/                      # Static assets and robots.txt
├── src/
│   ├── app/
│   │   ├── (auth)/login/        # Login page with demo account shortcuts
│   │   ├── (dashboard)/         # Protected operations hub shell
│   │   │   ├── dashboard/       # KPIs, alerts, recent orders
│   │   │   ├── products/        # Product catalog & admin creation modal
│   │   │   ├── inventory/       # Stock balances & adjustment modal
│   │   │   ├── orders/          # Orders list, builder, and details
│   │   │   ├── customers/       # Customer directory
│   │   │   └── audit-logs/      # Admin audit trail with JSON diff viewer
│   │   ├── api/                 # Thin REST API endpoints
│   │   ├── globals.css          # Tailwind CSS v4 CSS-first entrypoint
│   │   └── layout.tsx           # Root layout with Sonner toast provider
│   ├── components/layout/       # Sidebar, Header, Mobile Navigation
│   ├── lib/
│   │   ├── auth/                # Scrypt hashing and session cookies
│   │   ├── permissions/         # Server-side RBAC guards
│   │   ├── validation/          # Zod schemas for products, orders, adjustments
│   │   └── db.ts                # Prisma 7 connection pool adapter
│   ├── server/services/         # Business logic & atomic transactions
│   └── tests/                   # Concurrency, integration, unit, and E2E suites
├── compose.yaml                 # Docker Compose with PostgreSQL & Web App
├── Dockerfile                   # Multi-stage production container
├── docker-entrypoint.sh         # Automatic migrations and seed on container start
├── prisma.config.ts             # Prisma 7 configuration file
└── PROJECT_TRACKER.md           # Engineering progress & Architecture Decision Records
```

---

## 8. License

Developed for evaluation in the **ARAVEX Tech Studio Practical Assessment**. All rights reserved.

