"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Edit3,
  AlertTriangle,
  X,
  Layers,
  User,
  RefreshCw,
} from "lucide-react";

interface OrderDetail {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: { id: string; name: string; email: string | null; phone: string | null };
  status: "CONFIRMED" | "CANCELLED";
  totalMinor: number;
  version: number;
  createdAt: string;
  cancelledAt: string | null;
  createdBy: { id: string; name: string; role: string };
  items: Array<{
    id: string;
    productId: string;
    product: { id: string; name: string; sku: string; stockOnHand: number };
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
  }>;
  movements: Array<{
    id: string;
    type: string;
    delta: number;
    quantityAfter: number;
    reason: string | null;
    createdAt: string;
    product: { name: string; sku: string };
    actor: { name: string };
  }>;
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editQuantities, setEditQuantities] = useState<Record<string, number>>({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Cancel Modal State
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  const loadOrder = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setOrder(data.data);
        const initialQtyMap: Record<string, number> = {};
        for (const item of data.data.items) {
          initialQtyMap[item.productId] = item.quantity;
        }
        setEditQuantities(initialQtyMap);
      } else {
        setErrorMessage(data.error?.message || "Order not found");
      }
    } catch {
      setErrorMessage("Network error loading order details");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleUpdateQuantities = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    setIsSubmittingEdit(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const itemsPayload = Object.entries(editQuantities).map(
        ([productId, quantity]) => ({
          productId,
          quantity,
        })
      );

      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: order.version,
          items: itemsPayload,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || "Failed to update order quantities.");
        setIsSubmittingEdit(false);
        return;
      }

      setSuccessMessage(
        `Order ${order.orderNumber} updated successfully. Stock deltas accounted.`
      );
      setIsEditModalOpen(false);
      loadOrder();
    } catch {
      setErrorMessage("Network error during order update.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;

    setIsSubmittingCancel(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/orders/${id}/cancel`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || "Failed to cancel order.");
        setIsSubmittingCancel(false);
        setIsCancelConfirmOpen(false);
        return;
      }

      setSuccessMessage(
        `Order ${order.orderNumber} cancelled. All inventory quantities restored.`
      );
      setIsCancelConfirmOpen(false);
      loadOrder();
    } catch {
      setErrorMessage("Network error during order cancellation.");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
        Loading order information...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-24 text-center text-slate-500">
        <p className="font-semibold text-lg text-slate-800">Order not found</p>
        <Link href="/orders" className="text-xs text-blue-600 hover:underline mt-2 inline-block">
          &larr; Back to Orders
        </Link>
      </div>
    );
  }

  const isConfirmed = order.status === "CONFIRMED";

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>

        {isConfirmed && (
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Quantities
            </button>
            <button
              onClick={() => setIsCancelConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Cancel Order
            </button>
          </div>
        )}
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
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main Order Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              {order.orderNumber}
            </h1>
            <span
              className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold ${isConfirmed
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
            >
              {isConfirmed ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> Confirmed
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5" /> Cancelled
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Created on {new Date(order.createdAt).toLocaleString()} by {order.createdBy.name} (
            {order.createdBy.role})
          </p>
        </div>

        <div className="text-right">
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider block">
            Authoritative Total
          </span>
          <span className="text-3xl font-extrabold font-mono text-slate-900">
            {formatCurrency(order.totalMinor)}
          </span>
          <span className="block text-[11px] font-mono text-slate-400 mt-0.5">
            Optimistic Version: v{order.version}
          </span>
        </div>
      </div>

      {/* Customer Information */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
          <User className="h-4 w-4 text-slate-500" />
          Customer Information
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Name:</span>
            <span className="font-semibold text-slate-900">{order.customer.name}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Email:</span>
            <span className="font-medium text-slate-700">
              {order.customer.email || "Not specified"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Phone:</span>
            <span className="font-medium text-slate-700">
              {order.customer.phone || "Not specified"}
            </span>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Order Line Items
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Authoritative price snapshots and unit totals
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[550px]">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4 text-center">Quantity</th>
                <th className="py-3 px-4 text-right">Unit Price Snapshot</th>
                <th className="py-3 px-4 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {order.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {item.product.sku}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">{item.product.name}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold">
                    {item.quantity}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">
                    {formatCurrency(item.unitPriceMinor)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {formatCurrency(item.lineTotalMinor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Movements Audit Trail for this Order */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Inventory Ledger Entries for Order {order.orderNumber}
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable movement records corresponding directly to order creations, modifications, and cancellations
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Movement Type</th>
                <th className="py-3 px-4 text-right">Delta</th>
                <th className="py-3 px-4 text-right">Stock After</th>
                <th className="py-3 px-4">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {order.movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No movements recorded.
                  </td>
                </tr>
              ) : (
                order.movements.map((m) => {
                  const isPositive = m.delta > 0;
                  return (
                    <tr key={m.id}>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(m.createdAt).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-900">{m.product.name}</span>{" "}
                        <span className="text-[11px] font-mono text-slate-400">
                          ({m.product.sku})
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {m.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold">
                        <span className={isPositive ? "text-emerald-600" : "text-rose-600"}>
                          {isPositive ? `+${m.delta}` : m.delta}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-900 font-semibold">
                        {m.quantityAfter}
                      </td>
                      <td className="py-3 px-4 text-slate-600">{m.reason}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Quantities Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Order Quantities ({order.orderNumber})
                </h3>
                <p className="text-xs text-slate-500">
                  Computes stock deltas (newQty - oldQty) and checks optimistic version token (v
                  {order.version}).
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateQuantities} className="p-4 sm:p-6 space-y-4">
              <div className="space-y-3">
                {order.items.map((item) => {
                  const currentQty = editQuantities[item.productId] ?? item.quantity;
                  const delta = currentQty - item.quantity;
                  return (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1 w-full sm:w-auto">
                        <div className="text-xs font-semibold text-slate-900">
                          {item.product.name}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {item.product.sku} — Currently in order: {item.quantity}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                        <div className="w-24">
                          <label className="block text-[10px] font-semibold text-slate-500 uppercase">
                            New Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={currentQty}
                            onChange={(e) =>
                              setEditQuantities({
                                ...editQuantities,
                                [item.productId]: Math.max(1, parseInt(e.target.value, 10) || 1),
                              })
                            }
                            className="mt-0.5 w-full px-2 py-1 text-xs rounded border border-slate-300 bg-white font-mono font-bold"
                          />
                        </div>

                        <div className="w-20 text-right">
                          <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                            Delta
                          </span>
                          <span
                            className={`font-mono text-xs font-bold ${delta > 0
                              ? "text-rose-600"
                              : delta < 0
                                ? "text-emerald-600"
                                : "text-slate-400"
                              }`}
                          >
                            {delta > 0 ? `+${delta}` : delta < 0 ? delta : "0"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmittingEdit ? "Applying Delta..." : "Confirm & Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Order Confirmation Modal */}
      {isCancelConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 sm:p-6 space-y-3">
              <div className="h-10 w-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Cancel Order {order.orderNumber}?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cancelling this order will atomically restore all line item quantities (
                {order.items.reduce((s, i) => s + i.quantity, 0)} total units) back into physical
                inventory and record audit movements. This action cannot be undone.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3">
              <button
                type="button"
                onClick={() => setIsCancelConfirmOpen(false)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/60 rounded-lg"
              >
                Go Back
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleCancelOrder}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm disabled:opacity-50"
              >
                {isSubmittingCancel ? "Cancelling & Restoring..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}