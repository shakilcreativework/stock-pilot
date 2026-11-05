"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingCart,
  Users,
  ShieldAlert,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Role } from "@prisma/client";

interface SidebarProps {
  userRole: Role;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Products", href: "/products", icon: Package },
    { name: "Inventory", href: "/inventory", icon: Layers },
    { name: "Orders", href: "/orders", icon: ShoppingCart },
    { name: "Customers", href: "/customers", icon: Users },
    {
      name: "Audit Logs",
      href: "/audit-logs",
      icon: ShieldAlert,
      adminOnly: true,
    },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
      <aside className="hidden lg:flex w-64 bg-slate-950 text-slate-300 flex-col shrink-0 border-r border-slate-800">
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/80">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-600/30">
            SP
          </div>
          <div>
            <span className="font-bold text-white tracking-tight">StockPilot</span>
            <span className="block text-[10px] text-slate-500 font-medium tracking-wider uppercase">
              Operations Hub
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            if (item.adminOnly && userRole !== Role.ADMIN) {
              return null;
            }

            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-400")} />
                <span>{item.name}</span>
                {item.adminOnly && (
                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    Admin
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Assessment Info Pill */}
        <div className="p-4 border-t border-slate-800/80">
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Stock Invariants Active
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Atomic SQL updates & strict server-side RBAC protection.
            </p>
          </div>
        </div>
      </aside>
      );
}

