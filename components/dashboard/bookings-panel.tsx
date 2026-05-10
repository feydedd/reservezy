"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, Filter, Download, Plus, X } from "lucide-react";

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

type ServiceOption  = { id: string; name: string; durationMinutes: number };
type StaffOption    = { id: string; fullName: string };

const STATUS_OPTIONS = ["", "CONFIRMED", "COMPLETED", "CANCELLED", "NO_SHOW"] as const;

const STATUS_CHIP: Record<string, string> = {
  CONFIRMED: "border-[#8b86f9]/40 bg-[#8b86f9]/10 text-[#c4b5fd]",
  COMPLETED: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  CANCELLED: "border-red-500/30 bg-red-500/10 text-red-300",
  NO_SHOW:   "border-amber-500/30 bg-amber-500/10 text-amber-300",
};

function fmt(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

/* ── "Book for customer" modal ─────────────────────────────────────────── */
function NewBookingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [services,  setServices]  = useState<ServiceOption[]>([]);
  const [staff,     setStaff]     = useState<StaffOption[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const [serviceId,     setServiceId]     = useState("");
  const [staffMemberId, setStaffMemberId] = useState("");
  const [dateStr,       setDateStr]       = useState("");
  const [timeStr,       setTimeStr]       = useState("09:00");
  const [customerName,  setCustomerName]  = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes,         setNotes]         = useState("");

  useEffect(() => {
    fetch("/api/onboarding")
      .then(async r => {
        const d = await r.json() as { services?: ServiceOption[]; staff?: StaffOption[] };
        setServices(d.services ?? []);
        setStaff(d.staff ?? []);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const submit = async () => {
    if (!serviceId || !dateStr || !customerName.trim() || !customerEmail.trim()) {
      setError("Please fill in all required fields."); return;
    }
    setError(null); setSaving(true);
    try {
      const startsAt = new Date(`${dateStr}T${timeStr}:00`).toISOString();
      const res = await fetch("/api/dashboard/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ serviceId, staffMemberId: staffMemberId || null, startsAt, customerName: customerName.trim(), customerEmail: customerEmail.trim(), customerPhone: customerPhone.trim(), notes: notes.trim() }),
      });
      const body: unknown = await res.json();
      if (!res.ok) { setError((body as { error?: string }).error ?? "Failed to create booking."); return; }
      onCreated();
      onClose();
    } catch { setError("Network error — please try again."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="rz-glow-soft w-full max-w-lg rounded-3xl border border-[#8b86f9]/18 bg-[#13132c]/98 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.07] px-6 py-4">
          <div>
            <h2 className="text-base font-extrabold text-white">Book for a customer</h2>
            <p className="text-xs text-rz-muted">For phone or walk-in bookings — enter the details below.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-rz-subtle hover:bg-white/[0.06] hover:text-white"><X className="h-4 w-4" /></button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {error && <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

          {loading ? (
            <p className="text-sm text-rz-muted">Loading services…</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="font-semibold text-rz-muted">Service <span className="text-red-400">*</span></span>
                  <select className="rz-field" value={serviceId} onChange={e => setServiceId(e.target.value)}>
                    <option value="">Select service…</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes}min)</option>)}
                  </select>
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-semibold text-rz-muted">Team member</span>
                  <select className="rz-field" value={staffMemberId} onChange={e => setStaffMemberId(e.target.value)}>
                    <option value="">Any available</option>
                    {staff.map(s => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                  </select>
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-semibold text-rz-muted">Date <span className="text-red-400">*</span></span>
                  <input type="date" className="rz-field" value={dateStr} onChange={e => setDateStr(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-semibold text-rz-muted">Time <span className="text-red-400">*</span></span>
                  <input type="time" className="rz-field" value={timeStr} onChange={e => setTimeStr(e.target.value)} />
                </label>
              </div>

              <div className="border-t border-white/[0.06] pt-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-rz-subtle">Customer details</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1.5 text-sm">
                    <span className="font-semibold text-rz-muted">Full name <span className="text-red-400">*</span></span>
                    <input className="rz-field" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Jane Smith" />
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span className="font-semibold text-rz-muted">Email <span className="text-red-400">*</span></span>
                    <input type="email" className="rz-field" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="jane@example.com" />
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span className="font-semibold text-rz-muted">Phone</span>
                    <input type="tel" className="rz-field" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="+44 7700 000000" />
                  </label>
                  <label className="space-y-1.5 text-sm">
                    <span className="font-semibold text-rz-muted">Notes</span>
                    <input className="rz-field" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any special requests…" />
                  </label>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-white/[0.07] px-6 py-4">
          <button onClick={onClose} className="rz-btn-ghost px-4 py-2 text-sm" disabled={saving}>Cancel</button>
          <button onClick={submit}  className="rz-btn-primary px-5 py-2 text-sm disabled:opacity-60" disabled={saving || loading}>
            {saving ? "Saving…" : "Create booking"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Bookings panel ────────────────────────────────────────────────────── */
export function BookingsPanel() {
  const [rows,    setRows]    = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [busyId,  setBusyId]  = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const [search,      setSearch]      = useState("");
  const [status,      setStatus]      = useState("");
  const [from,        setFrom]        = useState("");
  const [to,          setTo]          = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (from)   params.set("from",   from);
      if (to)     params.set("to",     to);
      if (status) params.set("status", status);
      const res  = await fetch(`/api/dashboard/bookings?${params}`);
      const body = (await res.json()) as { bookings?: BookingRow[]; error?: string };
      if (!res.ok) { setError(body.error ?? "Failed to load"); return; }
      setRows(body.bookings ?? []);
    } catch { setError("Network error."); }
    finally  { setLoading(false); }
  }, [from, to, status]);

  useEffect(() => { load().catch(() => null); }, [load]);

  const filtered = search.trim()
    ? rows.filter(r =>
        r.customer.fullName.toLowerCase().includes(search.toLowerCase()) ||
        r.customer.email.toLowerCase().includes(search.toLowerCase()) ||
        r.service.name.toLowerCase().includes(search.toLowerCase()))
    : rows;

  const updateStatus = async (id: string, newStatus: string) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/dashboard/bookings/${id}`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { const b = await res.json(); setError(b.error ?? "Update failed"); return; }
      await load();
    } finally { setBusyId(null); }
  };

  function exportCsv() {
    const header = ["Date", "Service", "Customer", "Email", "Phone", "Status", "Revenue"];
    const lines  = filtered.map(r => [
      new Date(r.startsAt).toLocaleDateString("en-GB"),
      r.service.name, r.customer.fullName, r.customer.email, r.customer.phone,
      r.status, (r.pricePenceSnapshot / 100).toFixed(2),
    ].map(v => `"${v}"`).join(","));
    const csv  = [header.join(","), ...lines].join("\n");
    const url  = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a    = document.createElement("a");
    a.href = url; a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <>
      {showNew && (
        <NewBookingModal
          onClose={() => setShowNew(false)}
          onCreated={() => { void load(); }}
        />
      )}

      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rz-subtle" />
            <input className="rz-field pl-9 text-sm" placeholder="Search customer or service…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <button onClick={() => setShowFilters(v => !v)} className={`rz-btn-ghost gap-2 text-sm ${showFilters ? "border-[#8b86f9]/40 text-[#c4b5fd]" : ""}`}>
            <Filter className="h-4 w-4" /> Filters
          </button>

          <button onClick={exportCsv} className="rz-btn-ghost gap-2 text-sm">
            <Download className="h-4 w-4" /> Export CSV
          </button>

          <button onClick={() => setShowNew(true)} className="rz-btn-primary gap-2 text-sm">
            <Plus className="h-4 w-4" /> Book for customer
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div>
              <label className="mb-1 block text-xs text-rz-muted">Status</label>
              <select className="rz-field text-sm" value={status} onChange={e => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || "All statuses"}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-rz-muted">From date</label>
              <input type="date" className="rz-field text-sm" value={from} onChange={e => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-rz-muted">To date</label>
              <input type="date" className="rz-field text-sm" value={to} onChange={e => setTo(e.target.value)} />
            </div>
            {(status || from || to) && (
              <button className="rz-btn-ghost text-sm" onClick={() => { setStatus(""); setFrom(""); setTo(""); }}>Clear filters</button>
            )}
          </div>
        )}

        {error && <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.04]" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/20 py-14 text-center">
            <p className="text-sm text-rz-muted">No bookings yet.</p>
            <button onClick={() => setShowNew(true)} className="rz-btn-primary mt-4 gap-2 text-sm">
              <Plus className="h-4 w-4" /> Add your first booking
            </button>
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
                {filtered.map(row => (
                  <tr key={row.id} className="transition hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-white">{new Date(row.startsAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                      <div className="text-[11px] text-rz-subtle">{new Date(row.startsAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div>
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
                            <button disabled={busyId === row.id} onClick={() => updateStatus(row.id, "COMPLETED")} className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50">Complete</button>
                            <button disabled={busyId === row.id} onClick={() => updateStatus(row.id, "NO_SHOW")}    className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-300 transition hover:bg-amber-500/20 disabled:opacity-50">No-show</button>
                            <button disabled={busyId === row.id} onClick={() => updateStatus(row.id, "CANCELLED")}  className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50">Cancel</button>
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
          {filtered.length} booking{filtered.length !== 1 ? "s" : ""}{search ? " (filtered)" : ""}
        </p>
      </div>
    </>
  );
}
