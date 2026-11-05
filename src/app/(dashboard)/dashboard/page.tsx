import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  Package,
  AlertTriangle,
  Layers,
  ShoppingCart,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

export default async function DashboardPage() {
  // Real database metric queries
  const [totalProducts, lowStockProducts, totalStockAgg, totalOrders, recentMovements] =
    await Promise.all([
      prisma.product.count(),
      prisma.product.findMany({
        where: {
          stockOnHand: {
            lte: prisma.product.fields.lowStockThreshold,
          },
        },
        include: { category: true },
        take: 5,
      }),
      prisma.product.aggregate({
        _sum: { stockOnHand: true },
      }),
      prisma.order.count(),
      prisma.inventoryMovement.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          product: { select: { name: true, sku: true } },
          actor: { select: { name: true, role: true } },
        },
      }),
    ]);

  const totalStockUnits = totalStockAgg._sum.stockOnHand || 0;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Operations Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time inventory levels, stock health, and recent operational movements.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            <Layers className="h-4 w-4 text-slate-500" />
            Stock Balances
          </Link>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-2xs transition-colors"
          >
            <Package className="h-4 w-4" />
            Manage Products
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Products
            </span>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{totalProducts}</div>
          <p className="mt-1 text-xs text-slate-500">Categorized active SKUs</p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Total Units On Hand
            </span>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{totalStockUnits}</div>
          <p className="mt-1 text-xs text-slate-500">Total physical inventory</p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Low-Stock Warnings
            </span>
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{lowStockProducts.length}</div>
          <p className="mt-1 text-xs text-amber-600 font-medium">
            {lowStockProducts.length > 0 ? "Requires restock replenishment" : "Inventory healthy"}
          </p>
        </div>

        <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Recorded Orders
            </span>
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShoppingCart className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{totalOrders}</div>
          <p className="mt-1 text-xs text-slate-500">Processed order volume</p>
        </div>
      </div>

      {/* Low Stock Callout (if any) */}
      {lowStockProducts.length > 0 && (
        <div className="p-5 rounded-xl bg-amber-50/70 border border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900">
                Low Stock Warning: {lowStockProducts.length} Product(s) Below Threshold
              </h3>
              <p className="text-xs text-amber-700 mt-0.5">
                The following products have dropped to or below their safe reorder threshold:
              </p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-white/90 rounded-lg border border-amber-200/80 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{p.sku}</div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800">
                        {p.stockOnHand} left
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Min: {p.lowStockThreshold}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Inventory Movements Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Recent Inventory Movements</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit stream of all stock adjustments, orders, and restocks
            </p>
          </div>
          <Link
            href="/inventory"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            Full Ledger <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Delta</th>
                <th className="py-3 px-4 text-right">Balance After</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No movements recorded yet.
                  </td>
                </tr>
              ) : (
                recentMovements.map((m) => {
                  const isPositive = m.delta > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{m.product.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{m.product.sku}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          {m.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold font-mono">
                        <span
                          className={`inline-flex items-center gap-0.5 ${isPositive ? "text-emerald-600" : "text-rose-600"
                            }`}
                        >
                          {isPositive ? (
                            <TrendingUp className="h-3 w-3 inline" />
                          ) : (
                            <TrendingDown className="h-3 w-3 inline" />
                          )}
                          {isPositive ? `+${m.delta}` : m.delta}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-900">
                        {m.quantityAfter}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{m.actor.name}</div>
                        <div className="text-[10px] text-slate-400">{m.actor.role}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {m.reason || "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}