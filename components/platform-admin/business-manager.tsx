"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, ShieldOff, Shield, CrownIcon, X, CheckCircle, AlertCircle, Send, Loader2 } from "lucide-react";

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

const TIER_BADGE: Record<string, string> = {
  BASIC: "bg-slate-500/20 text-slate-300",
  STANDARD: "bg-[#8b86f9]/20 text-[#a5a0ff]",
  PREMIUM: "bg-yellow-500/20 text-yellow-300",
};

const DURATION_PRESETS = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
  { label: "60 days", value: 60 },
  { label: "90 days", value: 90 },
  { label: "1 year", value: 365 },
  { label: "Custom…", value: -1 },
];

type PlanModalState = {
  business: BusinessRow;
  tier: string;
  durationPreset: number;
  customDays: string;
  saving: boolean;
  done: boolean;
};

type EmailHealthState = {
  open: boolean;
  loading: boolean;
  result: { apiKeyConfigured: boolean; fromEmailConfigured: boolean; fromEmail: string; sent: boolean; error: string | null } | null;
};

export default function BusinessManager({ initialStats }: { initialStats: { total: number; active: number; mrr: number } }) {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Plan grant modal
  const [planModal, setPlanModal] = useState<PlanModalState | null>(null);

  // Email health
  const [emailHealth, setEmailHealth] = useState<EmailHealthState>({ open: false, loading: false, result: null });

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

  function openPlanModal(b: BusinessRow) {
    setPlanModal({ business: b, tier: b.subscriptionTier, durationPreset: 30, customDays: "30", saving: false, done: false });
  }

  async function submitPlanGrant() {
    if (!planModal) return;
    const durationDays = planModal.durationPreset === -1
      ? parseInt(planModal.customDays, 10)
      : planModal.durationPreset;

    if (!durationDays || durationDays < 1) {
      alert("Please enter a valid number of days.");
      return;
    }

    setPlanModal((m) => m ? { ...m, saving: true } : null);
    const res = await fetch(`/api/platform-admin/businesses/${planModal.business.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: planModal.tier, durationDays }),
    });

    if (res.ok) {
      const data = await res.json();
      setBusinesses((rows) => rows.map((r) => r.id === planModal.business.id
        ? { ...r, subscriptionTier: data.business.subscriptionTier, subscriptionStatus: data.business.subscriptionStatus }
        : r));
      setPlanModal((m) => m ? { ...m, saving: false, done: true } : null);
      setTimeout(() => setPlanModal(null), 2000);
    } else {
      setPlanModal((m) => m ? { ...m, saving: false } : null);
      alert("Failed to grant plan. Please try again.");
    }
  }

  async function runEmailHealthCheck() {
    setEmailHealth({ open: true, loading: true, result: null });
    const res = await fetch("/api/platform-admin/email-health", { method: "POST" });
    const data = await res.json();
    setEmailHealth({ open: true, loading: false, result: data });
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Platform admin</h1>
          <p className="mt-1 text-sm text-rz-muted">Manage all Reservezy businesses from a single view.</p>
        </div>
        <button
          onClick={runEmailHealthCheck}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-rz-subtle transition hover:bg-white/[0.07] hover:text-white"
        >
          <Send className="h-3.5 w-3.5" />
          Email health check
        </button>
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
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TIER_BADGE[b.subscriptionTier] ?? "bg-slate-500/20 text-slate-300"}`}>
                      {b.subscriptionTier}
                    </span>
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
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openPlanModal(b)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[#8b86f9]/30 px-3 py-1.5 text-xs font-medium text-[#c4b5fd] transition hover:bg-[#8b86f9]/10"
                      >
                        <CrownIcon className="h-3 w-3" /> Grant plan
                      </button>
                      <button
                        onClick={() => toggleDisabled(b)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${b.isDisabled ? "border-[#8b86f9]/30 text-[#c4b5fd] hover:bg-[#8b86f9]/10" : "border-red-500/30 text-red-400 hover:bg-red-500/10"}`}
                      >
                        {b.isDisabled ? <><Shield className="h-3 w-3" /> Enable</> : <><ShieldOff className="h-3 w-3" /> Disable</>}
                      </button>
                    </div>
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

      {/* Plan Grant Modal */}
      {planModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => !planModal.saving && setPlanModal(null)}>
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d1f] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button className="absolute right-4 top-4 text-rz-subtle hover:text-white" onClick={() => setPlanModal(null)} disabled={planModal.saving}>
              <X className="h-5 w-5" />
            </button>

            {planModal.done ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle className="h-10 w-10 text-emerald-400" />
                <p className="text-lg font-semibold text-white">Plan granted!</p>
                <p className="text-sm text-rz-muted">An email notification has been sent to the account owner.</p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white">Grant a free plan</h2>
                  <p className="mt-1 text-sm text-rz-muted">
                    Upgrade <span className="font-semibold text-white">{planModal.business.name}</span> to a free plan for testing.
                    The owner will receive an email notification.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* Tier selector */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-rz-subtle">Plan</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["BASIC", "STANDARD", "PREMIUM"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setPlanModal((m) => m ? { ...m, tier: t } : null)}
                          className={`rounded-xl border py-3 text-sm font-bold uppercase tracking-wide transition ${
                            planModal.tier === t
                              ? t === "PREMIUM"
                                ? "border-yellow-500/50 bg-yellow-500/10 text-yellow-300"
                                : t === "STANDARD"
                                ? "border-[#8b86f9]/50 bg-[#8b86f9]/10 text-[#a5a0ff]"
                                : "border-slate-500/50 bg-slate-500/10 text-slate-300"
                              : "border-white/10 text-rz-subtle hover:border-white/20 hover:text-white"
                          }`}
                        >
                          {t === "BASIC" ? "Basic" : t === "STANDARD" ? "Standard" : "Premium"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Duration selector */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-rz-subtle">Duration</label>
                    <div className="grid grid-cols-4 gap-2">
                      {DURATION_PRESETS.map((p) => (
                        <button
                          key={p.value}
                          onClick={() => setPlanModal((m) => m ? { ...m, durationPreset: p.value, customDays: p.value > 0 ? String(p.value) : m.customDays } : null)}
                          className={`rounded-xl border py-2 text-xs font-medium transition ${
                            planModal.durationPreset === p.value
                              ? "border-[#8b86f9]/50 bg-[#8b86f9]/10 text-[#a5a0ff]"
                              : "border-white/10 text-rz-subtle hover:border-white/20 hover:text-white"
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    {planModal.durationPreset === -1 && (
                      <div className="mt-3">
                        <input
                          type="number"
                          min={1}
                          max={3650}
                          className="rz-field"
                          placeholder="Number of days"
                          value={planModal.customDays}
                          onChange={(e) => setPlanModal((m) => m ? { ...m, customDays: e.target.value } : null)}
                        />
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 text-sm">
                    <p className="text-rz-muted">
                      Grant <span className={`font-bold ${TIER_COLORS[planModal.tier] ?? "text-white"}`}>{planModal.tier}</span> plan
                      for{" "}
                      <span className="font-semibold text-white">
                        {planModal.durationPreset === -1 ? (planModal.customDays || "?") : planModal.durationPreset} day{(planModal.durationPreset === 1 || planModal.customDays === "1") ? "" : "s"}
                      </span>{" "}
                      to <span className="font-semibold text-white">{planModal.business.owner.email}</span>
                    </p>
                  </div>

                  <button
                    onClick={submitPlanGrant}
                    disabled={planModal.saving}
                    className="rz-btn-primary w-full py-3 disabled:opacity-50"
                  >
                    {planModal.saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Granting…
                      </span>
                    ) : (
                      "Grant plan & notify owner"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Email Health Modal */}
      {emailHealth.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEmailHealth((s) => ({ ...s, open: false }))}>
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d1f] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button className="absolute right-4 top-4 text-rz-subtle hover:text-white" onClick={() => setEmailHealth((s) => ({ ...s, open: false }))}>
              <X className="h-5 w-5" />
            </button>

            <h2 className="mb-4 text-lg font-bold text-white">Email health check</h2>

            {emailHealth.loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#8b86f9]" />
              </div>
            ) : emailHealth.result ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <HealthRow ok={emailHealth.result.apiKeyConfigured} label="RESEND_API_KEY configured" />
                  <HealthRow ok={emailHealth.result.fromEmailConfigured} label="RESEND_FROM_EMAIL configured" />
                  {emailHealth.result.fromEmailConfigured && (
                    <div className="ml-6 text-xs text-rz-muted">Sending from: <span className="font-mono text-white">{emailHealth.result.fromEmail}</span></div>
                  )}
                  <HealthRow ok={emailHealth.result.sent} label="Test email sent to SUPER_ADMIN_EMAIL" />
                </div>

                {emailHealth.result.error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      <div>
                        <p className="text-sm font-semibold text-red-300">Error</p>
                        <p className="mt-1 text-xs text-red-400">{emailHealth.result.error}</p>
                      </div>
                    </div>
                    <div className="mt-3 rounded-lg bg-red-500/10 p-3 text-xs text-red-300">
                      <p className="font-semibold">How to fix:</p>
                      <ol className="mt-1.5 list-decimal space-y-1 pl-4">
                        <li>Go to <strong>Vercel Dashboard → Your Project → Settings → Environment Variables</strong></li>
                        <li>Set <code className="font-mono">RESEND_API_KEY</code> to your Resend API key (from resend.com)</li>
                        <li>Set <code className="font-mono">RESEND_FROM_EMAIL</code> to a verified sender, e.g. <code>Reservezy &lt;noreply@reservezy.com&gt;</code></li>
                        <li>In your Resend dashboard, verify the sending domain (<strong>reservezy.com</strong>)</li>
                        <li>Redeploy your Vercel project for the env changes to take effect</li>
                      </ol>
                    </div>
                  </div>
                )}

                {emailHealth.result.sent && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <p className="text-sm font-semibold text-emerald-300">Email is working correctly!</p>
                    </div>
                    <p className="mt-1 text-xs text-emerald-400">A test email was sent to your super admin address. If password reset emails are still failing, check that the domain is fully verified in Resend.</p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function HealthRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {ok
        ? <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400" />
        : <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />}
      <span className={ok ? "text-white" : "text-red-300"}>{label}</span>
    </div>
  );
}
