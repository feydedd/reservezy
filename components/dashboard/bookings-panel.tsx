"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Filter, Download } from "lucide-react";

type BookingRow = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  notes: string;
  pricePenceSnapshot: number;
  service: { name: string };
  staffMember: { fullName: string; id: string } | null;
  customer: { fullName: string; email: string; phone: string };
};

const STATUS_OPTIONS = ["", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

const STATUS_CHIP: Record<string, string> = {
  CONFIRMED: "border-[#8b86f9]/40 bg-[#8b86f9]/10 text-[#c4b5fd]",
  COMPLETED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  CANCELLED: "border-red-500/30 bg-red-500/10 text-red-300",
  NO_SHOW: "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

function fmt(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

export function BookingsPanel() {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (status) params.set("status", status);
      const res = await fetch(`/api/dashboard/bookings?${params}`);
      const body = (await res.json()) as { bookings?: BookingRow[]; error?: string };
      if (!res.ok) { setError(body.error ?? "Failed to load"); return; }
      setRows(body.bookings ?? []);
    } catch { setError("Network error."); }
    finally { setLoading(false); }
  }, [from, to, status]);

  useEffect(() => { load().catch(() => null); }, [load]);

  const filtered = search.trim()
    ? rows.filter(
        (r) =>
          r.customer.fullName.toLowerCase().includes(search.toLowerCase()) ||
          r.customer.email.toLowerCase().includes(search.toLowerCase()) ||
          r.service.name.toLowerCase().includes(search.toLowerCase()),
      )
    : rows;

  const updateStatus = async (id: string, newStatus: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/dashboard/bookings/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { const b = await res.json(); setError(b.error ?? "Update failed"); return; }
      await load();
    } finally { setBusyId(null); }
  };

  function exportCsv() {
    const header = ["Date", "Service", "Customer", "Email", "Phone", "Status", "Revenue"];
    const lines = filtered.map((r) => [
      new Date(r.startsAt).toLocaleDateString("en-GB"),
      r.service.name,
      r.customer.fullName,
      r.customer.email,
      r.customer.phone,
      r.status,
      (r.pricePenceSnapshot / 100).toFixed(2),
    ].map((v) => `"${v}"`).join(","));
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rz-subtle" />
          <input
            className="rz-field pl-9 text-sm"
            placeholder="Search customer or service…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`rz-btn-ghost gap-2 text-sm ${showFilters ? "border-[#8b86f9]/40 text-[#c4b5fd]" : ""}`}
        >
          <Filter className="h-4 w-4" /> Filters
        </button>

        <button onClick={exportCsv} className="rz-btn-ghost gap-2 text-sm">
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {showFilters && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div>
            <label className="mb-1 block text-xs text-rz-muted">Status</label>
            <select className="rz-field text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-rz-muted">From date</label>
            <input type="date" className="rz-field text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-rz-muted">To date</label>
            <input type="date" className="rz-field text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {(status || from || to) && (
            <button
              className="rz-btn-ghost text-sm"
              onClick={() => { setStatus(""); setFrom(""); setTo(""); }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/20 py-14 text-center">
          <p className="text-sm text-rz-muted">No bookings match your filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#11111f]/80 shadow-[0_0_24px_rgba(139,134,249,0.08)] backdrop-blur-sm">
          <table className="min-w-full divide-y divide-white/[0.06] text-left text-sm">
            <thead className="bg-white/[0.04] text-xs font-semibold uppercase tracking-wide text-rz-subtle">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filtered.map((row) => (
                <tr key={row.id} className="transition hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-white">
                      {new Date(row.startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </div>
                    <div className="text-[11px] text-rz-subtle">
                      {new Date(row.startsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{row.service.name}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-white">{row.customer.fullName}</div>
                    <div className="text-xs text-rz-subtle">{row.customer.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_CHIP[row.status] ?? "border-white/10 text-rz-muted"}`}>
                      {row.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-medium text-rz-muted">
                    {row.pricePenceSnapshot > 0 ? fmt(row.pricePenceSnapshot) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {row.status === "CONFIRMED" && (
                        <>
                          <button
                            disabled={busyId === row.id}
                            onClick={() => updateStatus(row.id, "COMPLETED")}
                            className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                          >
                            Complete
                          </button>
                          <button
                            disabled={busyId === row.id}
                            onClick={() => updateStatus(row.id, "NO_SHOW")}
                            className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50"
                          >
                            No-show
                          </button>
                          <button
                            disabled={busyId === row.id}
                            onClick={() => updateStatus(row.id, "CANCELLED")}
                            className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-right text-xs text-rz-subtle">
        {filtered.length} booking{filtered.length !== 1 ? "s" : ""}
        {search ? " (filtered)" : ""}
      </p>
    </div>
  );
}
