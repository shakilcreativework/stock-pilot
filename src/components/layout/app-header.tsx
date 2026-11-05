"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Package,
  Layers,
  ShoppingCart,
  Users,
  ShieldAlert,
  Settings,
  Home,
  LogOut,
  LogIn,
  Shield,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Role } from "@prisma/client";

export interface HeaderUser {
  id: string;
  name: string;
  email: string;
  role: Role | string;
}

interface AppHeaderProps {
  user?: HeaderUser | null;
  /**
   * If true, renders with a dark backdrop style suitable for the dashboard layout.
   * If false, renders with a crisp sticky SaaS header suitable for public and shared views.
   */
  variant?: "dashboard" | "public";
}

export function AppHeader({ user, variant = "public" }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === Role.ADMIN || user?.role === "ADMIN";

  // Navigation Items matching PRD & routes
  const navigationLinks = [
    { name: "Home", href: "/", icon: Home, publicOnly: false },
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, authRequired: true },
    { name: "Products", href: "/products", icon: Package, authRequired: true },
    { name: "Inventory", href: "/inventory", icon: Layers, authRequired: true },
    { name: "Orders", href: "/orders", icon: ShoppingCart, authRequired: true },
    { name: "Customers", href: "/customers", icon: Users, authRequired: true },
    {
      name: "Audit Logs",
      href: "/audit-logs",
      icon: ShieldAlert,
      adminOnly: true,
      authRequired: true,
    },
    { name: "Settings", href: "/settings", icon: Settings, authRequired: true },
  ];

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
    setIsUserMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileOpen]);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard Escape key to close mobile drawer & user menu
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsMobileOpen(false);
        setIsUserMenuOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  // Helper to determine if link is active
  const isLinkActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // User initials for avatar
  const getInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <header
      className={cn(
        "w-full sticky top-0 z-40 transition-colors border-b shrink-0",
        variant === "dashboard"
          ? "bg-white border-slate-200"
          : "bg-white/95 backdrop-blur-md border-slate-200/80 shadow-2xs"
      )}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Mobile Hamburger & Logo Branding */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Mobile Hamburger Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open mobile navigation menu"
              aria-expanded={isMobileOpen}
              aria-controls="mobile-nav-drawer"
              className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 transition-colors"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Brand Logo */}
            <Link
              href={user ? "/dashboard" : "/"}
              className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded-lg p-1"
            >
              <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shadow-blue-500/30 group-hover:bg-blue-700 transition-colors">
                SP
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-900 tracking-tight text-base leading-none">
                  StockPilot
                </span>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide leading-none mt-1 hidden xs:inline-block">
                  Operations Hub
                </span>
              </div>
            </Link>
          </div>

          {/* Center: Desktop Navigation Bar */}
          <nav
            aria-label="Main Navigation"
            className="hidden lg:flex items-center gap-1 xl:gap-1.5 overflow-x-auto py-1"
          >
            {navigationLinks.map((item) => {
              // Hide admin-only links for non-admins
              if (item.adminOnly && !isAdmin) return null;
              // If user is not logged in and link requires auth, we can still show or hide based on auth state
              if (item.authRequired && !user) return null;

              const active = isLinkActive(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                    active
                      ? "bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs font-bold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5", active ? "text-blue-600" : "text-slate-400")} />
                  <span>{item.name}</span>
                  {item.adminOnly && (
                    <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-blue-100/70 text-blue-800 ml-0.5">
                      Admin
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: Auth Actions & User Profile Menu */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="true"
                  aria-label="User profile and account settings"
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  {/* User Avatar with Initials */}
                  <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                    {getInitials(user.name)}
                  </div>
                  {/* Name and Role on Tablet & Desktop */}
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[120px]">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium leading-none mt-0.5">
                      {isAdmin ? "Administrator" : "Operations Staff"}
                    </span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 text-slate-400 transition-transform",
                      isUserMenuOpen && "rotate-180"
                    )}
                  />
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                  >
                    <div className="px-3.5 py-2.5 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-900 truncate">{user.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border",
                            isAdmin
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-indigo-50 text-indigo-700 border-indigo-200"
                          )}
                        >
                          <Shield className="h-2.5 w-2.5" />
                          {user.role}
                        </span>
                      </div>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/settings"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <Settings className="h-3.5 w-3.5 text-slate-400" />
                        System Settings
                      </Link>
                      <Link
                        href="/dashboard"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                      >
                        <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" />
                        Dashboard
                      </Link>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                      >
                        <LogOut className="h-3.5 w-3.5 text-red-500" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  <span>Sign In</span>
                </Link>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-xs transition-colors"
                >
                  <span>Launch Demo</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Drawer / Slide-Over Sheet */}
      {isMobileOpen && (
        <div
          id="mobile-nav-drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile Navigation Drawer"
          className="fixed inset-0 z-50 lg:hidden"
        >
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer Content Panel */}
          <div
            ref={mobileNavRef}
            className="fixed inset-y-0 left-0 w-72 sm:w-80 bg-slate-950 text-slate-200 shadow-2xl z-50 flex flex-col justify-between animate-in slide-in-from-left duration-200 border-r border-slate-800"
          >
            {/* Drawer Top Header */}
            <div>
              <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800">
                <Link
                  href={user ? "/dashboard" : "/"}
                  onClick={() => setIsMobileOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                    SP
                  </div>
                  <div>
                    <span className="font-bold text-white tracking-tight">StockPilot</span>
                    <span className="block text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      Operations Hub
                    </span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  aria-label="Close mobile navigation menu"
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* User Session Banner in Mobile Drawer */}
              {user && (
                <div className="p-3.5 mx-3 mt-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {getInitials(user.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white truncate">{user.name}</div>
                      <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border",
                        isAdmin
                          ? "bg-blue-900/50 text-blue-300 border-blue-700/50"
                          : "bg-indigo-900/50 text-indigo-300 border-indigo-700/50"
                      )}
                    >
                      <Shield className="h-2.5 w-2.5" />
                      {user.role}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium">Session Active</span>
                  </div>
                </div>
              )}

              {/* Navigation Links in Mobile Drawer */}
              <nav aria-label="Mobile Menu Navigation" className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
                {navigationLinks.map((item) => {
                  if (item.adminOnly && !isAdmin) return null;
                  if (item.authRequired && !user) return null;

                  const active = isLinkActive(item.href);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors",
                        active
                          ? "bg-blue-600 text-white shadow-xs font-bold"
                          : "text-slate-400 hover:bg-slate-900 hover:text-white"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "text-white" : "text-slate-400")} />
                      <span className="flex-1">{item.name}</span>
                      {item.adminOnly && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          Admin
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Drawer Bottom Actions */}
            <div className="p-3 border-t border-slate-800 bg-slate-950">
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-950/40 border border-red-900/40 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out of Hub</span>
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={() => setIsMobileOpen(false)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-xs"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Sign In to Hub</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
