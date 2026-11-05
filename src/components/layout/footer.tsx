import Link from "next/link";
import { ShieldCheck, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface FooterProps {
  variant?: "dashboard" | "public";
  className?: string;
}

export function Footer({ variant = "public", className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  if (variant === "dashboard") {
    return (
      <footer
        className={cn(
          "py-4 px-4 sm:px-6 lg:px-8 border-t border-slate-200 bg-white/70 text-slate-500 text-xs shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2.5",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">StockPilot</span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span>ARAVEX Practical Assessment Operations Hub</span>
        </div>

        <div className="flex items-center gap-4 text-[11px]">
          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Atomic Invariants Enforced
          </span>
          <span className="text-slate-400">© {currentYear}</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className={cn("border-t border-slate-200 bg-white text-slate-600", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-blue-500/20">
                SP
              </div>
              <span className="font-bold text-slate-900 tracking-tight text-lg">StockPilot</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              High-concurrency operations hub engineered with conditional atomic SQL updates, optimistic locking, and server-side RBAC for deterministic inventory accounting.
            </p>
            <div className="flex items-center gap-3 pt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" />
                Zero Overselling Guarantee
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                <Activity className="h-3.5 w-3.5" />
                Immutable Audit Trail
              </span>
            </div>
          </div>

          {/* Core Navigation Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Operations Hub
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-blue-600 transition-colors">
                  Dashboard Overview
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-blue-600 transition-colors">
                  Product Catalog
                </Link>
              </li>
              <li>
                <Link href="/inventory" className="hover:text-blue-600 transition-colors">
                  Inventory & Movements
                </Link>
              </li>
              <li>
                <Link href="/orders" className="hover:text-blue-600 transition-colors">
                  Orders & Lifecycle
                </Link>
              </li>
              <li>
                <Link href="/customers" className="hover:text-blue-600 transition-colors">
                  Customer Directory
                </Link>
              </li>
            </ul>
          </div>

          {/* System & Architecture Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Assessment Stack
            </h4>
            <ul className="space-y-2 text-xs text-slate-500">
              <li>Next.js 16.4.5 (App Router)</li>
              <li>React 19.1.0 & Tailwind CSS v4</li>
              <li>Prisma 7 & PostgreSQL 17/18</li>
              <li>Vitest Real-DB Concurrency Suite</li>
              <li>Docker Compose Multi-Stage</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-10 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© {currentYear} StockPilot Operations Hub. Built for ARAVEX Practical Assessment.</p>
          <div className="flex items-center gap-4 text-xs font-medium">
            <Link href="/login" className="hover:text-blue-600 transition-colors">
              Staff & Admin Login
            </Link>
            <span>•</span>
            <Link href="/settings" className="hover:text-blue-600 transition-colors">
              System Settings
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

