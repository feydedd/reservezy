"use client";

import { useCallback, useEffect, useState } from "react";
import { Percent, Trash2 } from "lucide-react";

type Promo = {
  id: string;
  code: string;
  percentOff: number | null;
  amountOffPence: number | null;
  active: boolean;
  usedCount: number;
  maxUses: number | null;
  expiresAt: string | null;
};

export function PromosClient() {
  const [rows, setRows] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState("");
  const [amountGbp, setAmountGbp] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/promo-codes");
      const body = (await res.json()) as { promoCodes?: Promo[] };
      if (res.ok) {
        setRows(body.promoCodes ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  async function create() {
    setError("");
    const p = percent.trim() === "" ? undefined : Number(percent);
    const amt =
      amountGbp.trim() === "" ? undefined : Math.round(Number(amountGbp) * 100);
    if (!code.trim()) {
      setError("Enter a code.");
      return;
    }
    if ((p === undefined || Number.isNaN(p)) && (amt === undefined || Number.isNaN(amt))) {
      setError("Set either a percent off (1–100) or an amount off in £.");
      return;
    }
    const res = await fetch("/api/dashboard/promo-codes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        ...(p !== undefined && !Number.isNaN(p) ? { percentOff: p } : {}),
        ...(amt !== undefined && !Number.isNaN(amt) ? { amountOffPence: amt } : {}),
      }),
    });
    const body = (await res.json()) as { error?: string };
    if (!res.ok) {
      setError(body.error ?? "Could not create.");
      return;
    }
    setCode("");
    setPercent("");
    setAmountGbp("");
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this promo code?")) {
      return;
    }
    await fetch(`/api/dashboard/promo-codes/${id}`, { method: "DELETE" });
    await load();
  }

  async function toggle(id: string, active: boolean) {
    await fetch(`/api/dashboard/promo-codes/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    await load();
  }

  if (loading) {
    return <p className="text-sm text-rz-muted">Loading…</p>;
  }

  return (
    <div className="space-y-8">
      <div className="rz-card space-y-4 p-6">
        <h2 className="text-sm font-bold text-white">Create a code</h2>
        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className="text-rz-muted">Code</span>
            <input
              className="rz-field mt-1 uppercase"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="WELCOME10"
            />
          </label>
          <label className="text-sm">
            <span className="text-rz-muted">Percent off (optional)</span>
            <input
              type="number"
              min={1}
              max={100}
              className="rz-field mt-1"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              placeholder="10"
            />
          </label>
          <label className="text-sm">
            <span className="text-rz-muted">Amount off £ (optional)</span>
            <input
              type="number"
              min={0}
              step={0.5}
              className="rz-field mt-1"
              value={amountGbp}
              onChange={(e) => setAmountGbp(e.target.value)}
              placeholder="5"
            />
          </label>
        </div>
        <button type="button" onClick={() => void create()} className="rz-btn-primary gap-2 text-sm">
          <Percent className="h-4 w-4" /> Add promo code
        </button>
      </div>

      <div className="rz-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-white/[0.07] bg-white/[0.03] text-xs uppercase text-rz-subtle">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Uses</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {rows.map((r) => (
              <tr key={r.id} className="text-rz-muted">
                <td className="px-4 py-3 font-mono font-semibold text-white">{r.code}</td>
                <td className="px-4 py-3">
                  {r.percentOff != null ? `${r.percentOff}%` : `£${(r.amountOffPence ?? 0) / 100}`}
                </td>
                <td className="px-4 py-3">
                  {r.usedCount}
                  {r.maxUses != null ? ` / ${r.maxUses}` : ""}
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => void toggle(r.id, r.active)}
                    className="text-xs font-semibold text-rz-accent hover:underline"
                  >
                    {r.active ? "Active" : "Disabled"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => void remove(r.id)}
                    className="inline-flex rounded-lg p-2 text-rz-subtle hover:bg-red-500/10 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-6 text-center text-sm text-rz-muted">No promo codes yet.</p>
        )}
      </div>
    </div>
  );
}
