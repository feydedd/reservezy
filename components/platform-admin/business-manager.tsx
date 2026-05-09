"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ShieldOff, Shield } from "lucide-react";

type BusinessRow = {
  id: string;
  name: string;
  subdomain: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  isDisabled: boolean;
  onboardingComplete: boolean;
  createdAt: string;
  owner: { email: string; fullName: string };
};

const TIER_COLORS: Record<string, string> = {
  BASIC: "text-slate-400",
  STANDARD: "text-[#a5a0ff]",
  PREMIUM: "text-yellow-300",
};

export default function BusinessManager({ initialStats }: { initialStats: { total: number; active: number; mrr: number } }) {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("q", search);
      const res = await fetch(`/api/platform-admin/businesses?${params}`);
      const data = await res.json();
      setBusinesses(data.businesses ?? []);
      setTotal(data.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(q);
  }

  async function toggleDisabled(b: BusinessRow) {
    const action = b.isDisabled ? "re-enable" : "disable";
    if (!confirm(`${action} "${b.name}"?`)) return;
    const res = await fetch(`/api/platform-admin/businesses/${b.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDisabled: !b.isDisabled }),
    });
    if (res.ok) {
      setBusinesses((rows) => rows.map((r) => r.id === b.id ? { ...r, isDisabled: !b.isDisabled } : r));
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Platform admin</h1>
        <p className="mt-1 text-sm text-rz-muted">Manage all Reservezy businesses from a single view.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total businesses", value: initialStats.total },
          { label: "Active subscriptions", value: initialStats.active },
          { label: "Est. MRR", value: `£${(initialStats.mrr / 100).toFixed(0)}` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-[#11111f]/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-rz-subtle">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rz-subtle" />
          <input
            className="rz-field pl-9"
            placeholder="Search by name, subdomain, or owner email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button type="submit" className="rz-btn-ghost">Search</button>
        {search && (
          <button type="button" onClick={() => { setQ(""); setSearch(""); setPage(1); }} className="rz-btn-ghost">
            Clear
          </button>
        )}
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#11111f]/80 backdrop-blur-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#8b86f9]" />
          </div>
        ) : businesses.length === 0 ? (
          <p className="py-12 text-center text-sm text-rz-muted">No businesses found.</p>
        ) : (
          <table className="min-w-full divide-y divide-white/[0.06] text-sm">
            <thead className="bg-white/[0.03] text-xs font-semibold uppercase tracking-wide text-rz-subtle">
              <tr>
                <th className="px-5 py-3 text-left">Business</th>
                <th className="px-5 py-3 text-left">Owner</th>
                <th className="px-5 py-3 text-left">Plan</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Created</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {businesses.map((b) => (
                <tr key={b.id} className={`transition hover:bg-white/[0.03] ${b.isDisabled ? "opacity-50" : ""}`}>
                  <td className="px-5 py-3">
                    <div className="font-semibold text-white">{b.name}</div>
                    <div className="text-xs text-rz-subtle">{b.subdomain}.reservezy.com</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-white">{b.owner.fullName}</div>
                    <div className="text-xs text-rz-subtle">{b.owner.email}</div>
                  </td>
                  <td className={`px-5 py-3 font-semibold ${TIER_COLORS[b.subscriptionTier] ?? "text-rz-muted"}`}>
                    {b.subscriptionTier}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${b.isDisabled ? "bg-red-500/20 text-red-300" : b.onboardingComplete ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                      {b.isDisabled ? "Disabled" : b.onboardingComplete ? "Live" : "Onboarding"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-rz-muted">
                    {new Date(b.createdAt).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => toggleDisabled(b)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${b.isDisabled ? "border-[#8b86f9]/30 text-[#c4b5fd] hover:bg-[#8b86f9]/10" : "border-red-500/30 text-red-400 hover:bg-red-500/10"}`}
                    >
                      {b.isDisabled ? <><Shield className="h-3 w-3" /> Enable</> : <><ShieldOff className="h-3 w-3" /> Disable</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-rz-muted">
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="rz-btn-ghost disabled:opacity-40">← Prev</button>
            <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="rz-btn-ghost disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
