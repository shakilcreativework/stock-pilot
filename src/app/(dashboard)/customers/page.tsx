"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  Mail,
  Phone,
  ShoppingCart,
  X,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  _count: {
    orders: number;
  };
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadCustomers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/customers?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setCustomers(data.data);
      } else {
        setErrorMessage(data.error?.message || "Failed to load customers");
      }
    } catch {
      setErrorMessage("Network error loading customers");
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || "Failed to create customer.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(`Customer '${data.data.name}' created successfully.`);
      setIsAddModalOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      loadCustomers();
    } catch {
      setErrorMessage("Network error during customer creation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Customer Directory
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Accounts, contact information, and order volume statistics.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
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

      {/* Search Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        <button
          onClick={loadCustomers}
          title="Refresh customers"
          className="p-2 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Customers List Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* 1. Mobile Feed View (< sm: 320px - 639px): Zero Cramped Columns */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
              Loading customer records...
            </div>
          ) : customers.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Users className="h-6 w-6 mx-auto mb-2 text-slate-300" />
              No customer records found.
            </div>
          ) : (
            customers.map((c) => (
              <div key={c.id} className="p-4 space-y-2 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 leading-snug">
                      {c.name}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                      <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                      <span className="truncate">{c.email || "No email"}</span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0 whitespace-nowrap">
                    <ShoppingCart className="h-3 w-3 text-slate-400" />
                    {c._count.orders} order(s)
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-50">
                  <span className="font-mono text-slate-600 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                    {c.phone || "—"}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Joined: {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 2. Tablet & Desktop Table View (>= sm: 640px+): Fully Expanded Columns */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 min-w-[180px] whitespace-nowrap">Customer Name</th>
                <th className="py-3 px-4 min-w-[200px] whitespace-nowrap">Email Address</th>
                <th className="py-3 px-4 whitespace-nowrap w-36">Phone Number</th>
                <th className="py-3 px-4 text-center whitespace-nowrap w-32">Orders Placed</th>
                <th className="py-3 px-4 text-right whitespace-nowrap w-28">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Loading customer records...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                    No customer records found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 min-w-[180px]">
                      {c.name}
                    </td>
                    <td className="py-3 px-4 text-slate-600 min-w-[200px]">
                      {c.email ? (
                        <span className="inline-flex items-center gap-1">
                          <Mail className="h-3 w-3 text-slate-400 shrink-0" /> {c.email}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      {c.phone ? (
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Phone className="h-3 w-3 text-slate-400 shrink-0" /> {c.phone}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                        <ShoppingCart className="h-3 w-3 text-slate-400 shrink-0" />
                        {c._count.orders} order(s)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px] whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add Customer</h3>
                <p className="text-xs text-slate-500">
                  Register a customer for order fulfillment.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Customer / Business Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Corporation"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="purchasing@acme.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

