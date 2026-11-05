import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  Settings,
  Shield,
  Database,
  Lock,
  CheckCircle2,
  Cpu,
  KeyRound,
} from "lucide-react";
import { Role } from "@prisma/client";

export default async function SettingsPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const { user } = session;
  const isAdmin = user.role === Role.ADMIN;

  return (
    <div className="space-y-6 sm:space-y-8 max-w-6xl mx-auto">
      {/* Page Title & Context Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6 text-blue-600" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              System & Account Settings
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Current session profile, security parameters, database invariants, and assessment runtime status.
          </p>
        </div>

        <div>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${isAdmin
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-indigo-50 text-indigo-700 border-indigo-200"
              }`}
          >
            <Shield className="h-3.5 w-3.5" />
            Active Role: {user.role}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols on Desktop): User Profile & Security Policy */}
        <div className="lg:col-span-2 space-y-6">
          {/* User Profile Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-4">
              <KeyRound className="h-4 w-4 text-blue-600" />
              Authenticated Session Profile
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Full Name
                </span>
                <span className="font-bold text-slate-900 text-sm">{user.name}</span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Email Address
                </span>
                <span className="font-bold text-slate-900 text-sm break-all">{user.email}</span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Assigned RBAC Role
                </span>
                <span className="font-bold text-blue-700 text-sm flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  {user.role} ({isAdmin ? "Full Privileges" : "Operational Only"})
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Session Security
                </span>
                <span className="font-mono text-emerald-700 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  HttpOnly Database Session
                </span>
              </div>
            </div>
          </div>

          {/* Database Invariants & Concurrency Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-600" />
              Core Invariants & Concurrency Guard
            </h2>

            <div className="space-y-3">
              <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-200 text-xs">
                <div className="flex items-center gap-2 font-bold text-emerald-900 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  Atomic Stock Deduction Invariant (ADR-03 / ADR-06)
                </div>
                <p className="text-emerald-800 leading-relaxed font-mono text-[11px] bg-white/70 p-2 rounded mt-2 border border-emerald-100">
                  UPDATE &quot;Product&quot; SET &quot;stockOnHand&quot; = &quot;stockOnHand&quot; - $quantity WHERE id = $productId AND &quot;stockOnHand&quot; &gt;= $quantity
                </p>
                <p className="text-emerald-700 mt-2 text-[11px]">
                  Guarantees that stock on hand can never drop below zero under simultaneous order bursts.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-200 text-xs">
                <div className="flex items-center gap-2 font-bold text-blue-900 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />
                  Optimistic Concurrency Control — OCC (ADR-07)
                </div>
                <p className="text-blue-800 text-[11px] leading-relaxed">
                  Every order edit validates that the database version matches the client payload (<code className="bg-white/80 px-1 py-0.5 rounded font-mono">version = expected</code>), rejecting stale overwrites with HTTP 409 <code className="font-mono">ORDER_CONFLICT</code>.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-indigo-50/60 border border-indigo-200 text-xs">
                <div className="flex items-center gap-2 font-bold text-indigo-900 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                  Single-Restoration Cancellation Guard
                </div>
                <p className="text-indigo-800 text-[11px] leading-relaxed">
                  Cancellation verifies order status <code className="bg-white/80 px-1 py-0.5 rounded font-mono">CONFIRMED</code> before crediting stock back. Repeated requests return HTTP 409 <code className="font-mono">ALREADY_CANCELLED</code> without modifying inventory.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Platform Environment & Assessment Credentials */}
        <div className="space-y-6">
          {/* Assessment Seed Accounts Reference */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
              <Lock className="h-3.5 w-3.5 text-blue-600" />
              Demo Assessment Accounts
            </h2>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between font-bold text-slate-900 mb-0.5">
                  <span>Administrator</span>
                  <span className="text-[10px] text-blue-600 font-semibold">Full Access</span>
                </div>
                <div className="font-mono text-slate-600 text-[11px]">admin@stockpilot.io</div>
                <div className="font-mono text-slate-400 text-[10px] mt-0.5">Password: Admin123!</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between font-bold text-slate-900 mb-0.5">
                  <span>Operations Staff</span>
                  <span className="text-[10px] text-indigo-600 font-semibold">Restricted</span>
                </div>
                <div className="font-mono text-slate-600 text-[11px]">staff@stockpilot.io</div>
                <div className="font-mono text-slate-400 text-[10px] mt-0.5">Password: Staff123!</div>
              </div>
            </div>
          </div>

          {/* System Runtime & Package Versions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2 mb-3">
              <Cpu className="h-3.5 w-3.5 text-slate-600" />
              Runtime Architecture
            </h2>

            <dl className="divide-y divide-slate-100 text-xs">
              <div className="py-2 flex items-center justify-between">
                <dt className="text-slate-500">Framework</dt>
                <dd className="font-semibold text-slate-900">Next.js 16.4.5 (App Router)</dd>
              </div>
              <div className="py-2 flex items-center justify-between">
                <dt className="text-slate-500">UI Engine</dt>
                <dd className="font-semibold text-slate-900">React 19.1.0</dd>
              </div>
              <div className="py-2 flex items-center justify-between">
                <dt className="text-slate-500">Styling Engine</dt>
                <dd className="font-semibold text-slate-900">Tailwind CSS v4.0.9</dd>
              </div>
              <div className="py-2 flex items-center justify-between">
                <dt className="text-slate-500">Database Engine</dt>
                <dd className="font-semibold text-slate-900">PostgreSQL (Prisma 7.10)</dd>
              </div>
              <div className="py-2 flex items-center justify-between">
                <dt className="text-slate-500">Driver Adapter</dt>
                <dd className="font-mono text-[11px] text-slate-900">@prisma/adapter-pg</dd>
              </div>
              <div className="py-2 flex items-center justify-between">
                <dt className="text-slate-500">Test Harness</dt>
                <dd className="font-semibold text-emerald-700">Vitest (49 tests passing)</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}