"use client";

import { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  X,
  CheckCircle,
  ShieldAlert,
} from "lucide-react";

interface Product {
  id: string;
  sku: string;
  name: string;
  stockOnHand: number;
  lowStockThreshold: number;
}

interface Movement {
  id: string;
  productId: string;
  product: { id: string; name: string; sku: string };
  actor: { id: string; name: string; email: string; role: string };
  type: string;
  delta: number;
  quantityAfter: number;
  reason: string | null;
  createdAt: string;
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [userRole, setUserRole] = useState<string>("STAFF");
  const [isLoading, setIsLoading] = useState(true);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Stock Adjustment Form
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [adjustmentMode, setAdjustmentMode] = useState<"ADD" | "DEDUCT">("ADD");
  const [adjustQuantity, setAdjustQuantity] = useState<string>("5");
  const [adjustReason, setAdjustReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch current user
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data?.user) {
          setUserRole(res.data.user.role);
        }
      })
      .catch(() => { });
  }, []);

  // Load products & movements
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prodRes, moveRes] = await Promise.all([
        fetch("/api/products?limit=100"),
        fetch("/api/inventory/movements?limit=50"),
      ]);

      const prodData = await prodRes.json();
      const moveData = await moveRes.json();

      if (prodData.success) {
        setProducts(prodData.data.products);
        if (prodData.data.products.length > 0 && !selectedProductId) {
          setSelectedProductId(prodData.data.products[0].id);
        }
      }

      if (moveData.success) {
        setMovements(moveData.data.movements);
      }
    } catch {
      setErrorMessage("Failed to load inventory data");
    } finally {
      setIsLoading(false);
    }
  }, [selectedProductId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Selected product object for adjustment preview
  const currentProduct = products.find((p) => p.id === selectedProductId);
  const qtyNumber = parseInt(adjustQuantity, 10) || 0;
  const computedDelta = adjustmentMode === "ADD" ? qtyNumber : -qtyNumber;
  const projectedBalance = (currentProduct?.stockOnHand || 0) + computedDelta;

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    if (adjustmentMode === "DEDUCT" && projectedBalance < 0) {
      setErrorMessage(
        `Cannot deduct ${qtyNumber} units. Current stock is only ${currentProduct?.stockOnHand}.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/inventory/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          delta: computedDelta,
          reason: adjustReason.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || "Stock adjustment failed");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(
        `Successfully adjusted stock for ${data.data.product.name}. New balance: ${data.data.product.stockOnHand} units.`
      );
      setIsAdjustModalOpen(false);
      setAdjustReason("");
      loadData();
    } catch {
      setErrorMessage("Network error during stock adjustment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAdmin = userRole === "ADMIN";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Inventory & Stock Movements
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Enforced atomic stock balances and complete historical movement ledger.
          </p>
        </div>

        <div>
          {isAdmin ? (
            <button
              onClick={() => setIsAdjustModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-colors"
            >
              <PlusCircle className="h-4 w-4" />
              Adjust Stock
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200">
              <ShieldAlert className="h-3.5 w-3.5 text-slate-400" />
              Staff: Stock Adjustment Restricted
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Current Balances Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Live Stock Balances
            </h2>
            <p className="text-xs text-slate-500">
              Inventory balances updated in real-time by atomic transactions
            </p>
          </div>
          <button
            onClick={loadData}
            title="Refresh balances"
            className="p-1.5 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {products.map((p) => {
            const isLow = p.stockOnHand <= p.lowStockThreshold;
            return (
              <div
                key={p.id}
                className={`p-3 rounded-lg border transition-all ${isLow
                  ? "bg-amber-50/80 border-amber-300"
                  : "bg-slate-50/70 border-slate-200"
                  }`}
              >
                <div className="text-[10px] font-mono text-slate-500 truncate">{p.sku}</div>
                <div className="text-xs font-semibold text-slate-900 truncate mt-0.5">
                  {p.name}
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span
                    className={`text-base font-extrabold font-mono ${isLow ? "text-amber-800" : "text-slate-900"
                      }`}
                  >
                    {p.stockOnHand}
                  </span>
                  <span className="text-[10px] text-slate-400">min {p.lowStockThreshold}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Historical Inventory Movements
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all stock deductions, replenishments, and audit reasons
          </p>
        </div>

            {/* Mobile Feed View (< sm: 320px - 639px) */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {isLoading ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                  Loading movements ledger...
                </div>
              ) : movements.length === 0 ? (
                <div className="py-10 text-center text-slate-400 text-xs">
                  No movements recorded yet.
                </div>
              ) : (
                movements.map((m) => {
                  const isPositive = m.delta > 0;
                  return (
                    <div key={m.id} className="p-3.5 space-y-2 hover:bg-slate-50/70 transition-colors">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 leading-snug">
                            {m.product.name}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {m.product.sku}
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold font-mono shrink-0 whitespace-nowrap ${isPositive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                        >
                          {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {isPositive ? `+${m.delta}` : m.delta}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-50 gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                          {m.type}
                        </span>
                        <span className="font-mono text-slate-700">
                          Balance: <strong className="text-slate-900 font-bold">{m.quantityAfter}</strong>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono ml-auto">
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-500 flex items-center justify-between gap-2">
                        <span className="text-slate-600 truncate">
                          By: <span className="font-medium text-slate-800">{m.actor.name}</span> ({m.actor.role})
                        </span>
                        {m.reason && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[150px]" title={m.reason}>
                            {m.reason}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Tablet & Desktop Table View (>= sm: 640px+) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[850px]">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 whitespace-nowrap w-36">Date / Time</th>
                    <th className="py-3 px-4 min-w-[220px]">Product</th>
                    <th className="py-3 px-4 whitespace-nowrap w-36">Type</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap w-28">Signed Delta</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap w-28">Balance After</th>
                    <th className="py-3 px-4 whitespace-nowrap min-w-[130px]">Actor</th>
                    <th className="py-3 px-4 min-w-[200px]">Audit Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                        Loading movements ledger...
                      </td>
                    </tr>
                  ) : movements.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        No movements recorded yet.
                      </td>
                    </tr>
                  ) : (
                    movements.map((m) => {
                      const isPositive = m.delta > 0;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                            {new Date(m.createdAt).toLocaleString()}
                          </td>
                            <td className="py-3 px-4 min-w-[220px]">
                              <div className="font-semibold text-slate-900 leading-snug">{m.product.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono mt-0.5 whitespace-nowrap">{m.product.sku}</div>
                            </td>
                              <td className="py-3 px-4 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                  {m.type}
                                </span>
                              </td>
                                <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
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
                                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900 whitespace-nowrap">
                                    {m.quantityAfter}
                                  </td>
                                    <td className="py-3 px-4 whitespace-nowrap">
                                      <div className="font-medium text-slate-900 leading-tight">{m.actor.name}</div>
                                      <div className="text-[10px] text-slate-400 leading-tight">{m.actor.role}</div>
                                    </td>
                                      <td className="py-3 px-4 text-slate-600 min-w-[200px] max-w-sm whitespace-normal leading-relaxed">
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

                            {/* Adjust Stock Modal (Admin Only) */}
                            {isAdjustModalOpen && (
                              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
                                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                                  <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                                    <div>
                                      <h3 className="text-base font-bold text-slate-900">Adjust Product Stock</h3>
                                      <p className="text-xs text-slate-500">
                                        Executes conditional atomic database update with verified balance invariants.
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => setIsAdjustModalOpen(false)}
                                      className="text-slate-400 hover:text-slate-600 p-1"
                                    >
                                      <X className="h-5 w-5" />
                                    </button>
                                  </div>

                                  <form onSubmit={handleAdjustStock} className="p-4 sm:p-6 space-y-4">
                                    <div>
                                      <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Select Product
                                      </label>
                                      <select
                                        value={selectedProductId}
                                        onChange={(e) => setSelectedProductId(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium"
                                      >
                                        {products.map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.name} ({p.sku}) — Available: {p.stockOnHand}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                                        Adjustment Type
                                      </label>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                                        <button
                                          type="button"
                                          onClick={() => setAdjustmentMode("ADD")}
                                          className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${adjustmentMode === "ADD"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs"
                                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                            }`}
                                        >
                                          <TrendingUp className="h-4 w-4" />
                                          Receive / Add (+ Stock)
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setAdjustmentMode("DEDUCT")}
                                          className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${adjustmentMode === "DEDUCT"
                                            ? "bg-rose-50 text-rose-700 border-rose-300 shadow-2xs"
                                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                            }`}
                                        >
                                          <TrendingDown className="h-4 w-4" />
                                          Discard / Deduct (- Stock)
                                        </button>
                                      </div>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Units Quantity
                                      </label>
                                      <input
                                        type="number"
                                        min="1"
                                        required
                                        value={adjustQuantity}
                                        onChange={(e) => setAdjustQuantity(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>

                                    {/* Dynamic Balance Projection */}
                                    {currentProduct && (
                                      <div
                                        className={`p-3 rounded-lg border text-xs flex items-center justify-between ${projectedBalance < 0
                                          ? "bg-rose-50 border-rose-300 text-rose-700"
                                          : "bg-blue-50 border-blue-200 text-blue-900"
                                          }`}
                                      >
                                        <div>
                                          <span className="font-semibold">Projected Balance: </span>
                                          <span className="font-mono">{currentProduct.stockOnHand}</span>
                                          <span className="font-mono">
                                            {" "}
                                            {computedDelta >= 0 ? `+ ${computedDelta}` : `- ${Math.abs(computedDelta)}`} ={" "}
                                          </span>
                                          <span className="font-mono font-bold text-sm">{projectedBalance} units</span>
                                        </div>
                                        {projectedBalance < 0 && (
                                          <span className="text-[11px] font-bold text-rose-600">
                                            Illegal: Negative Stock!
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    <div>
                                      <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Audit Reason (Required)
                                      </label>
                                      <textarea
                                        rows={2}
                                        required
                                        placeholder="e.g. Stock count recount, damaged goods return, warehouse transfer..."
                                        value={adjustReason}
                                        onChange={(e) => setAdjustReason(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>

                                    <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
                                      <button
                                        type="button"
                                        onClick={() => setIsAdjustModalOpen(false)}
                                        className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="submit"
                                        disabled={isSubmitting || projectedBalance < 0}
                                        className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm disabled:opacity-50"
                                      >
                                        {isSubmitting ? "Applying Adjustment..." : "Confirm Stock Adjustment"}
                                      </button>
                                    </div>
                                  </form>
                                </div>
                              </div>
                            )}
                          </div>
                          );
}