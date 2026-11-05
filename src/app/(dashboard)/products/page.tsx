"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  Search,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Edit2,
  X,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  categoryId: string;
  category: { id: string; name: string };
  priceMinor: number;
  stockOnHand: number;
  lowStockThreshold: number;
  isActive: boolean;
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userRole, setUserRole] = useState<string>("STAFF");
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State for Create Product
  const [newSku, setNewSku] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCatId, setNewCatId] = useState("");
  const [newPrice, setNewPrice] = useState("19.99");
  const [newStock, setNewStock] = useState("10");
  const [newThreshold, setNewThreshold] = useState("5");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch current user role
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

  // Fetch categories
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setCategories(res.data);
          if (res.data.length > 0 && !newCatId) {
            setNewCatId(res.data[0].id);
          }
        }
      })
      .catch(() => { });
  }, [newCatId]);

  // Load products
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (selectedCategory) params.set("categoryId", selectedCategory);
      if (statusFilter) params.set("isActive", statusFilter);

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setProducts(data.data.products);
      } else {
        setErrorMessage(data.error?.message || "Failed to load products");
      }
    } catch {
      setErrorMessage("Network error while loading products");
    } finally {
      setIsLoading(false);
    }
  }, [search, selectedCategory, statusFilter]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const priceMinor = Math.round(parseFloat(newPrice) * 100);
      const initialStock = parseInt(newStock, 10);
      const lowStockThreshold = parseInt(newThreshold, 10);

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: newSku.toUpperCase().trim(),
          name: newName.trim(),
          description: newDesc.trim() || undefined,
          categoryId: newCatId,
          priceMinor,
          initialStock,
          lowStockThreshold,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || "Failed to create product");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(`Product '${data.data.name}' created successfully with SKU: ${data.data.sku}`);
      setIsCreateModalOpen(false);
      setNewSku("");
      setNewName("");
      setNewDesc("");
      loadProducts();
    } catch {
      setErrorMessage("Network error while creating product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingProduct.name,
          description: editingProduct.description,
          categoryId: editingProduct.categoryId,
          priceMinor: editingProduct.priceMinor,
          lowStockThreshold: editingProduct.lowStockThreshold,
          isActive: editingProduct.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.error?.message || "Failed to update product");
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(`Product '${editingProduct.sku}' updated successfully`);
      setEditingProduct(null);
      loadProducts();
    } catch {
      setErrorMessage("Network error while updating product");
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Products Catalog</h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse, filter, and manage warehouse product records, pricing, and stock thresholds.
          </p>
        </div>

        <div>
          {isAdmin ? (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-sm transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Staff: Read-Only Access
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

      {/* Filter & Search Bar */}
      <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative w-full sm:w-72 lg:w-80">
          <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Archived Only</option>
          </select>

          <button
            onClick={loadProducts}
            title="Refresh table"
            className="p-2 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Products Catalog Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            {/* 1. Mobile Feed View (< sm: 320px - 639px): Zero Cramped Columns */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {isLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                  Loading products catalog...
                </div>
              ) : products.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  No products matched your criteria.
                </div>
              ) : (
                products.map((p) => {
                  const isLowStock = p.stockOnHand <= p.lowStockThreshold;
                  return (
                    <div key={p.id} className="p-4 space-y-2.5 hover:bg-slate-50/70 transition-colors">
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900 leading-snug">
                            {p.name}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-mono text-slate-500">{p.sku}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                              {p.category?.name || "General"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-mono font-bold text-slate-900">
                            {formatCurrency(p.priceMinor)}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold mt-1 whitespace-nowrap ${isLowStock
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              }`}
                          >
                            {isLowStock && <AlertTriangle className="h-2.5 w-2.5" />}
                            {p.stockOnHand} in stock
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-50">
                        <span className="text-[10px] text-slate-400 font-mono">
                          Threshold: <strong className="text-slate-600">{p.lowStockThreshold}</strong>
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${p.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                            }`}
                        >
                          {p.isActive ? "Active" : "Archived"}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => setEditingProduct(p)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-blue-600 hover:bg-blue-50 border border-blue-200 ml-auto"
                          >
                            <Edit2 className="h-3 w-3" /> Edit
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 2. Tablet & Desktop Table View (>= sm: 640px+): Fully Expanded Columns */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[750px]">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4 whitespace-nowrap w-32">SKU</th>
                    <th className="py-3 px-4 min-w-[220px]">Name & Category</th>
                    <th className="py-3 px-4 text-right whitespace-nowrap w-28">Unit Price</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap w-28">Stock On Hand</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap w-24">Threshold</th>
                    <th className="py-3 px-4 text-center whitespace-nowrap w-24">Status</th>
                    {isAdmin && <th className="py-3 px-4 text-right whitespace-nowrap w-20">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoading ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-slate-400">
                        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
                        Loading products catalog...
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-slate-400">
                        No products matched your criteria.
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const isLowStock = p.stockOnHand <= p.lowStockThreshold;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">{p.sku}</td>
                            <td className="py-3 px-4 min-w-[220px]">
                              <div className="font-semibold text-slate-900 leading-snug">{p.name}</div>
                              <div className="text-[11px] text-slate-500 whitespace-nowrap mt-0.5">{p.category?.name || "General"}</div>
                            </td>
                              <td className="py-3 px-4 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                                {formatCurrency(p.priceMinor)}
                              </td>
                                <td className="py-3 px-4 text-center whitespace-nowrap">
                                  <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-xs font-bold whitespace-nowrap ${isLowStock
                                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      }`}
                                  >
                                    {isLowStock && <AlertTriangle className="h-3 w-3" />}
                                    {p.stockOnHand}
                                  </span>
                                </td>
                                  <td className="py-3 px-4 text-center font-mono text-slate-500 whitespace-nowrap">
                                    {p.lowStockThreshold}
                                  </td>
                                    <td className="py-3 px-4 text-center whitespace-nowrap">
                                      <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold whitespace-nowrap ${p.isActive
                                          ? "bg-emerald-50 text-emerald-700"
                                          : "bg-slate-100 text-slate-500"
                                          }`}
                                      >
                                        {p.isActive ? (
                                          <>
                                            <CheckCircle className="h-3 w-3" /> Active
                                          </>
                                        ) : (
                                          <>
                                            <XCircle className="h-3 w-3" /> Archived
                                          </>
                                        )}
                                      </span>
                                    </td>
                                    {isAdmin && (
                                      <td className="py-3 px-4 text-right">
                                        <button
                                          onClick={() => setEditingProduct(p)}
                                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                          title="Edit Product Metadata"
                                        >
                                          <Edit2 className="h-3.5 w-3.5" />
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                  );
                })
              )}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Add Product Modal (Admin Only) */}
                          {isCreateModalOpen && (
                            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
                              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                                <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                                  <div>
                                    <h3 className="text-base font-bold text-slate-900">Create New Product</h3>
                                    <p className="text-xs text-slate-500">
                                      Initial stock creates an automated INITIAL inventory movement record.
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="text-slate-400 hover:text-slate-600 p-1"
                                  >
                                    <X className="h-5 w-5" />
                                  </button>
                                </div>

                                <form onSubmit={handleCreateProduct} className="p-4 sm:p-6 space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                      <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        SKU (Unique)
                                      </label>
                                      <input
                                        type="text"
                                        required
                                        placeholder="PROD-ITEM-01"
                                        value={newSku}
                                        onChange={(e) => setNewSku(e.target.value.toUpperCase())}
                                        className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono uppercase focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Category
                                      </label>
                                      <select
                                        value={newCatId}
                                        onChange={(e) => setNewCatId(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                                      >
                                        {categories.map((c) => (
                                          <option key={c.id} value={c.id}>
                                            {c.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                      Product Name
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="e.g. Industrial Barcode Scanner"
                                      value={newName}
                                      onChange={(e) => setNewName(e.target.value)}
                                      className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                      Description
                                    </label>
                                    <textarea
                                      rows={2}
                                      placeholder="Optional item details and specifications..."
                                      value={newDesc}
                                      onChange={(e) => setNewDesc(e.target.value)}
                                      className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500"
                                    />
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                      <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Price ($ USD)
                                      </label>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        value={newPrice}
                                        onChange={(e) => setNewPrice(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Initial Stock
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        required
                                        value={newStock}
                                        onChange={(e) => setNewStock(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Low Stock Min
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        required
                                        value={newThreshold}
                                        onChange={(e) => setNewThreshold(e.target.value)}
                                        className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono focus:ring-2 focus:ring-blue-500"
                                      />
                                    </div>
                                  </div>

                                  <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
                                    <button
                                      type="button"
                                      onClick={() => setIsCreateModalOpen(false)}
                                      className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      disabled={isSubmitting}
                                      className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm disabled:opacity-50"
                                    >
                                      {isSubmitting ? "Creating..." : "Save Product"}
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </div>
                          )}

                          {/* Edit Product Modal (Admin Only) */}
                          {editingProduct && (
                            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
                              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                                <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
                                  <div>
                                    <h3 className="text-base font-bold text-slate-900">
                                      Edit Product: {editingProduct.sku}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                      Stock adjustments cannot be made here; use the Inventory Adjustment ledger.
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => setEditingProduct(null)}
                                    className="text-slate-400 hover:text-slate-600 p-1"
                                  >
                                    <X className="h-5 w-5" />
                                  </button>
                                </div>

                                <form onSubmit={handleUpdateProduct} className="p-4 sm:p-6 space-y-4">
                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">Name</label>
                                    <input
                                      type="text"
                                      required
                                      value={editingProduct.name}
                                      onChange={(e) =>
                                        setEditingProduct({ ...editingProduct, name: e.target.value })
                                      }
                                      className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-xs font-semibold text-slate-700 uppercase">
                                      Category
                                    </label>
                                    <select
                                      value={editingProduct.categoryId}
                                      onChange={(e) =>
                                        setEditingProduct({ ...editingProduct, categoryId: e.target.value })
                                      }
                                      className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                                    >
                                      {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                      <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Price (Cents)
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        required
                                        value={editingProduct.priceMinor}
                                        onChange={(e) =>
                                          setEditingProduct({
                                            ...editingProduct,
                                            priceMinor: parseInt(e.target.value, 10) || 0,
                                          })
                                        }
                                        className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                                      />
                                      <span className="text-[11px] text-slate-400 mt-0.5 block">
                                        = {formatCurrency(editingProduct.priceMinor)}
                                      </span>
                                    </div>

                                    <div>
                                      <label className="block text-xs font-semibold text-slate-700 uppercase">
                                        Threshold
                                      </label>
                                      <input
                                        type="number"
                                        min="0"
                                        required
                                        value={editingProduct.lowStockThreshold}
                                        onChange={(e) =>
                                          setEditingProduct({
                                            ...editingProduct,
                                            lowStockThreshold: parseInt(e.target.value, 10) || 0,
                                          })
                                        }
                                        className="mt-1 w-full px-3 py-2 text-xs rounded-lg border border-slate-300 font-mono"
                                      />
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 pt-2">
                                    <input
                                      type="checkbox"
                                      id="isActive"
                                      checked={editingProduct.isActive}
                                      onChange={(e) =>
                                        setEditingProduct({ ...editingProduct, isActive: e.target.checked })
                                      }
                                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="isActive" className="text-xs font-medium text-slate-700">
                                      Active (Can be added to customer orders)
                                    </label>
                                  </div>

                                  <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
                                    <button
                                      type="button"
                                      onClick={() => setEditingProduct(null)}
                                      className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="submit"
                                      disabled={isSubmitting}
                                      className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm disabled:opacity-50"
                                    >
                                      {isSubmitting ? "Saving..." : "Update Product"}
                                    </button>
                                  </div>
                                </form>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }