"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ShoppingCart,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string | null;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  priceMinor: number;
  stockOnHand: number;
  isActive: boolean;
}

interface OrderLineItem {
  productId: string;
  quantity: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [lines, setLines] = useState<OrderLineItem[]>([
    { productId: "", quantity: 1 },
  ]);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generate unique idempotency key on mount
  useEffect(() => {
    setIdempotencyKey(`idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  }, []);

  // Load customers and active products
  useEffect(() => {
    async function fetchData() {
      try {
        const [custRes, prodRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/products?isActive=true&limit=100"),
        ]);

        const custData = await custRes.json();
        const prodData = await prodRes.json();

        if (custData.success && custData.data) {
          setCustomers(custData.data);
          if (custData.data.length > 0) {
            setSelectedCustomerId(custData.data[0].id);
          }
        }

        if (prodData.success && prodData.data?.products) {
          setProducts(prodData.data.products);
          if (prodData.data.products.length > 0) {
            setLines([{ productId: prodData.data.products[0].id, quantity: 1 }]);
          }
        }
      } catch {
        setErrorMessage("Failed to load customer or product data.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleAddLine = () => {
    if (products.length === 0) return;
    setLines([...lines, { productId: products[0]!.id, quantity: 1 }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineProductChange = (index: number, productId: string) => {
    const updated = [...lines];
    updated[index]!.productId = productId;
    setLines(updated);
  };

  const handleLineQtyChange = (index: number, quantity: number) => {
    const updated = [...lines];
    updated[index]!.quantity = Math.max(1, quantity);
    setLines(updated);
  };

  // Compute live calculations
  const productMap = new Map(products.map((p) => [p.id, p]));
  let totalOrderMinor = 0;
  let totalUnits = 0;
  let hasStockDeficit = false;

  for (const line of lines) {
    const p = productMap.get(line.productId);
    if (p) {
      totalOrderMinor += p.priceMinor * line.quantity;
      totalUnits += line.quantity;
      if (line.quantity > p.stockOnHand) {
        hasStockDeficit = true;
      }
    }
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setErrorMessage("Please select a customer.");
      return;
    }

    if (hasStockDeficit) {
      setErrorMessage(
        "One or more lines request quantities exceeding current stock on hand."
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          idempotencyKey,
          items: lines,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || "Failed to create order.");
        setIsSubmitting(false);
        return;
      }

      router.push(`/orders/${data.data.id}`);
    } catch {
      setErrorMessage("Network error during order submission.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button & Title */}
      <div>
        <Link
          href="/orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Orders
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Create Transactional Order
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Atomic stock deduction with server-side validation and concurrency safeguards.
        </p>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmitOrder} className="space-y-6">
        {/* Customer Selector Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            1. Select Customer
          </h2>
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Customer Account
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white font-medium"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.email ? `(${c.email})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Order Items Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
                2. Order Product Line Items
              </h2>
              <p className="text-xs text-slate-500">
                Live availability verified against physical stock on hand
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddLine}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Product Line
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {lines.map((line, idx) => {
              const selectedProd = productMap.get(line.productId);
              const isOverStock = selectedProd
                ? line.quantity > selectedProd.stockOnHand
                : false;
              const lineTotal = selectedProd
                ? selectedProd.priceMinor * line.quantity
                : 0;

              return (
                <div
                  key={idx}
                  className={`p-3.5 rounded-lg border flex flex-col md:flex-row items-start md:items-center gap-3 transition-colors ${isOverStock
                    ? "bg-rose-50/70 border-rose-300"
                    : "bg-slate-50/70 border-slate-200"
                    }`}
                >
                  <div className="flex-1 w-full md:w-auto">
                    <label className="block text-[10px] font-semibold text-slate-500 uppercase">
                      Product
                    </label>
                    <select
                      value={line.productId}
                      onChange={(e) => handleLineProductChange(idx, e.target.value)}
                      className="mt-1 w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 bg-white font-medium"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku}) — {formatCurrency(p.priceMinor)} [In Stock:{" "}
                          {p.stockOnHand}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between sm:justify-start gap-3 w-full md:w-auto">
                    <div className="w-24 sm:w-28">
                      <label className="block text-[10px] font-semibold text-slate-500 uppercase">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={line.quantity}
                        onChange={(e) =>
                          handleLineQtyChange(idx, parseInt(e.target.value, 10) || 1)
                        }
                        className="mt-1 w-full px-2.5 py-1.5 text-xs rounded-md border border-slate-300 bg-white font-mono font-bold"
                      />
                    </div>

                    <div className="w-24 sm:w-28 text-right sm:text-left md:text-right">
                      <span className="block text-[10px] font-semibold text-slate-500 uppercase">
                        Line Total
                      </span>
                      <span className="mt-1.5 block font-mono font-bold text-xs text-slate-900 truncate">
                        {formatCurrency(lineTotal)}
                      </span>
                    </div>

                    <div className="pt-3">
                      <button
                        type="button"
                        disabled={lines.length === 1}
                        onClick={() => handleRemoveLine(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded transition-colors"
                        title="Remove Line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary & Submit Card */}
        <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-xs uppercase font-semibold text-slate-400 tracking-wider">
                Total Transactional Value
              </span>
              <div className="text-3xl font-extrabold font-mono text-white mt-0.5">
                {formatCurrency(totalOrderMinor)}
              </div>
            </div>

            <div className="text-sm text-slate-300">
              <span className="font-semibold">{totalUnits}</span> physical unit(s) across{" "}
              <span className="font-semibold">{lines.length}</span> line(s)
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Idempotency Token: </span>
            <code className="font-mono text-[11px] text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
              {idempotencyKey}
            </code>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Link
              href="/orders"
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || hasStockDeficit || isLoading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              {isSubmitting ? "Creating Order..." : "Confirm & Place Order"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}