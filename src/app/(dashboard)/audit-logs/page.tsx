"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldAlert,
  Search,
  RefreshCw,
  Clock,
  ChevronDown,
  ChevronRight,
  User,
  AlertTriangle,
  X,
  FileText,
} from "lucide-react";

interface AuditLog {
  id: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson: string | null;
  afterJson: string | null;
  createdAt: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [userRole, setUserRole] = useState<string>("STAFF");
  const [isLoading, setIsLoading] = useState(true);
  const [entityFilter, setEntityFilter] = useState<string>("");
  const [actionSearch, setActionSearch] = useState<string>("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityFilter) params.set("entityType", entityFilter);
      if (actionSearch) params.set("action", actionSearch);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setLogs(data.data.logs);
      } else {
        setErrorMessage(data.error?.message || "Failed to load audit logs");
      }
    } catch {
      setErrorMessage("Network error loading audit trail");
    } finally {
      setIsLoading(false);
    }
  }, [entityFilter, actionSearch]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const isAdmin = userRole === "ADMIN";

  if (!isAdmin && !isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center space-y-4">
        <div className="h-12 w-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Access Restricted (HTTP 403)</h2>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Audit log inspection is restricted to Admin personnel only. Staff roles are denied access
          at both the frontend view and server API boundaries.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              System Audit Trail
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              Admin Only
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Immutable log of all operational mutations with before/after state diff snapshots.
          </p>
        </div>

        <button
          onClick={loadLogs}
          title="Refresh audit logs"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors self-start"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

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

      {/* Filter and Search Bar */}
      <div className="p-3.5 sm:p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative w-full sm:w-72 lg:w-80">
          <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search action (e.g. ORDER_CREATED)..."
            value={actionSearch}
            onChange={(e) => setActionSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="text-xs py-2 px-3 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium flex-1 sm:flex-none"
          >
            <option value="">All Entities</option>
            <option value="Product">Product</option>
            <option value="Order">Order</option>
            <option value="Customer">Customer</option>
            <option value="System">System</option>
          </select>
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">Audit Events</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Click on any row to inspect serialized JSON state snapshots
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400">
              <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-500" />
              Loading audit records...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <FileText className="h-6 w-6 mx-auto mb-2 text-slate-300" />
              No audit logs matched your query.
            </div>
          ) : (
            logs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              let parsedBefore: unknown = null;
              let parsedAfter: unknown = null;
              try {
                if (log.beforeJson) parsedBefore = JSON.parse(log.beforeJson);
                if (log.afterJson) parsedAfter = JSON.parse(log.afterJson);
              } catch { }

              return (
                <div key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <button className="text-slate-400 hover:text-slate-600 mt-0.5 sm:mt-0">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {log.action}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {log.entityType}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Entity ID: {log.entityId}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-500 pl-7 sm:pl-0">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700">{log.actor.name}</span>
                        <span className="text-[10px] text-slate-400">({log.actor.role})</span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                        <Clock className="h-3 w-3" />
                        {new Date(log.createdAt).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Expanded JSON Diffs */}
                  {isExpanded && (
                    <div className="px-6 pb-5 pt-2 bg-slate-950 text-slate-200 text-xs font-mono border-t border-slate-800 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                            Before Mutation (Snapshot)
                          </span>
                          <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto text-[11px] text-slate-300">
                            {parsedBefore
                              ? JSON.stringify(parsedBefore, null, 2)
                              : "null (Created entity)"}
                          </pre>
                        </div>

                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                            After Mutation (Snapshot)
                          </span>
                          <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 overflow-x-auto text-[11px] text-emerald-400">
                            {parsedAfter
                              ? JSON.stringify(parsedAfter, null, 2)
                              : "null (Deleted entity)"}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

