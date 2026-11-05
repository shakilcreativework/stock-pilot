import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { AppHeader } from "@/components/layout/app-header";
import { Footer } from "@/components/layout/footer";
import {
  ShieldCheck,
  Layers,
  Activity,
  ArrowRight,
  Package,
  CheckCircle2,
  Lock,
} from "lucide-react";

  export default async function HomePage() {
    const session = await getSession();
    const user = session?.user || null;

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white">
          {/* Universal Top Header with Navigation & Mobile Drawer */}
          <AppHeader user={user} variant="public" />

            <main className="flex-1">
              {/* Hero Section */}
              <section className="relative overflow-hidden pt-12 sm:pt-16 md:pt-20 pb-12 sm:pb-16 bg-gradient-to-b from-white to-slate-50 border-b border-slate-200/80">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                  <div className="max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">
                    {/* Status Badge */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                      <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
                      <span>Production Operations Hub • ARAVEX Practical Assessment</span>
                    </div>

                          {/* Main Headline */}
                          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight">
                            Deterministic stock management with safe transactions.
                          </h1>

                          {/* Subheading */}
                          <p className="text-base sm:text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
                            Engineered to eliminate overselling under high concurrency, enforce strict server-side RBAC, and provide an immutable audit trail for every warehouse movement.
                          </p>

                          {/* Working Call To Action Buttons */}
                          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                            {user ? (
                              <>
                                <Link
                                  href="/dashboard"
                                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5"
                                >
                                  <span>Open Operations Dashboard</span>
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link
                                  href="/products"
                                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition-colors"
                                >
                                  <Package className="h-4 w-4 text-slate-500" />
                                  <span>Browse Products</span>
                                </Link>
                              </>
                            ) : (
                              <>
                                <Link
                                  href="/login"
                                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 transition-all hover:-translate-y-0.5"
                                >
                                  <span>Launch Operations Hub</span>
                                  <ArrowRight className="h-4 w-4" />
                                </Link>
                                <Link
                                  href="/login"
                                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 shadow-2xs transition-colors"
                                >
                                  <Lock className="h-4 w-4 text-slate-500" />
                                  <span>Sign In with Demo Account</span>
                                </Link>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* Core Architecture Pillars Grid */}
                    <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                      <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2">
                          Engineering Architecture
                        </h2>
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                          Architected for Integrity & Concurrency
                        </h3>
                        <p className="mt-2 text-sm text-slate-600">
                          Every business mutation is protected by database transactions and mathematical invariants.
                        </p>
                      </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Card 1: Atomic Invariants */}
                            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-shadow">
                              <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                                <ShieldCheck className="h-5 w-5" />
                              </div>
                              <h4 className="text-base font-bold text-slate-900">Atomic Stock Invariants</h4>
                              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                Conditional database updates execute inside transactions to ensure stock on hand cannot drop below zero, preventing race conditions even under concurrent order bursts.
                              </p>
                              <div className="mt-4 pt-3 border-t border-slate-100 font-mono text-[11px] text-blue-700 bg-blue-50/50 p-2 rounded-lg">
                                WHERE stockOnHand &gt;= $quantity
                              </div>
                            </div>

                            {/* Card 2: Enforced Server RBAC */}
                            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-shadow">
                              <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                                <Layers className="h-5 w-5" />
                              </div>
                              <h4 className="text-base font-bold text-slate-900">Server-Enforced RBAC</h4>
                              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                Role-based access boundaries are asserted at the server API and service layer. Unauthorized mutation attempts from Staff strictly return HTTP 403 Forbidden.
                              </p>
                              <div className="mt-4 pt-3 border-t border-slate-100 font-mono text-[11px] text-indigo-700 bg-indigo-50/50 p-2 rounded-lg">
                                Admin: Full • Staff: Operational
                              </div>
                            </div>

                            {/* Card 3: Immutable Audit Trail */}
                            <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs hover:shadow-md transition-shadow">
                              <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                                <Activity className="h-5 w-5" />
                              </div>
                              <h4 className="text-base font-bold text-slate-900">Immutable Audit Trail</h4>
                              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                Every product change, stock adjustment, and order lifecycle event commits an audit record with before/after serialized JSON state diffs in the same transaction.
                              </p>
                              <div className="mt-4 pt-3 border-t border-slate-100 font-mono text-[11px] text-emerald-700 bg-emerald-50/50 p-2 rounded-lg">
                                Atomically Committed JSON Diffs
                              </div>
                            </div>
                          </div>
                        </section>

                            {/* Live Assessment Demo Flow Callout */}
                            <section className="py-8 sm:py-12 bg-slate-900 text-white">
                              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                                  <div className="space-y-2 max-w-2xl">
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-semibold border border-blue-500/30">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      3-Minute Live Assessment Demonstration
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                                      Deterministic Demo Lifecycle: 10 &rarr; 7 &rarr; 5 &rarr; 10
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                                      Test SKU <code className="text-blue-300 font-mono">PROD-SCAN-10</code> starts with 10 units. Ordering 3 drops it to 7. Editing to 5 drops it to 5. Cancelling restores it to 10. Repeated cancellation returns 409 and never duplicates inventory.
                                    </p>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-3">
                                    <Link
                                      href="/orders/new"
                                      className="px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-colors"
                                    >
                                      Create Demo Order
                                    </Link>
                                    <Link
                                      href="/inventory"
                                      className="px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                                    >
                                      Inspect Inventory Ledger
                                    </Link>
                                  </div>
                                </div>
                              </div>
                    </section>
                  </main>

                {/* Global Public Footer */}
                <Footer variant="public" />
              </div>
              );
}
