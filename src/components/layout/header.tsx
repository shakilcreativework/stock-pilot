"use client";

import { useRouter } from "next/navigation";
import { LogOut, User, Shield, CheckCircle } from "lucide-react";
import { SessionUser } from "@/lib/auth/session";
import { Role } from "@prisma/client";

interface HeaderProps {
  user: SessionUser;
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const isAdmin = user.role === Role.ADMIN;

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-slate-500">
          Environment: <span className="font-semibold text-slate-900">Local PostgreSQL</span>
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* User Identity & Role Badge */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <User className="h-4 w-4" />
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-900 leading-tight">{user.name}</div>
            <div className="text-[11px] text-slate-500 leading-tight">{user.email}</div>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              isAdmin
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "bg-indigo-50 text-indigo-700 border-indigo-200"
            }`}
          >
            {isAdmin ? <Shield className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
            {user.role}
          </span>
        </div>

        {/* Logout Action */}
        <button
          onClick={handleLogout}
          title="Sign out of StockPilot"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
}

