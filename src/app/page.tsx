import { ShieldCheck, Layers, Activity } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-between p-6 sm:p-12 max-w-6xl mx-auto">
      <header className="flex items-center justify-between border-b border-slate-200 pb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-sm">
            SP
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">StockPilot</h1>
            <p className="text-xs text-slate-500 font-medium">Operations & Inventory Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Phase 0 Operational
          </span>
        </div>
      </header>

      <section className="my-12">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Deterministic stock management with safe transactions.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed">
            Engineered to eliminate overselling under high concurrency, enforce strict server-side RBAC, and provide an immutable audit trail for every stock movement.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-slate-900">Atomic Stock Invariants</h3>
            <p className="mt-2 text-sm text-slate-500 leading-normal">
              Conditional database updates ensure stock on hand cannot drop below zero, even under simultaneous checkout bursts.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-slate-900">Enforced Server RBAC</h3>
            <p className="mt-2 text-sm text-slate-500 leading-normal">
              Role-based access boundaries are asserted at the server API and service layer, strictly rejecting unauthorized mutations.
            </p>
          </div>

          <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Activity className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-slate-900">Immutable Audit Trail</h3>
            <p className="mt-2 text-sm text-slate-500 leading-normal">
              Every stock movement records actor, delta, timestamp, and resulting balance in the same transaction as the order.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
        <p>StockPilot — ARAVEX Full-Stack Assessment</p>
        <p>Next.js 16 • Tailwind CSS v4 • TypeScript Strict • Vitest</p>
      </footer>
    </main>
  );
}

