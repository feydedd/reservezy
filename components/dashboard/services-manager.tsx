"use client";

import type { SubscriptionTier } from "@prisma/client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, X, Check, Clock, PoundSterling } from "lucide-react";

import { parseIntakeFieldsJson } from "@/lib/intake/fields";
import {
  hasIntakeAndAccountingExport,
  hasPremiumFeatures,
} from "@/lib/subscription/tiers";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

type Service = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  pricePence: number;
  isActive: boolean;
  sortOrder: number;
  intakeFormFieldsJson?: unknown;
  businessLocationId?: string | null;
};

type FormState = {
  name: string;
  description: string;
  durationMinutes: number | "";
  pricePence: number | "";
  isActive: boolean;
  intakeJsonText: string;
  businessLocationId: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  description: "",
  durationMinutes: 60,
  pricePence: 0,
  isActive: true,
  intakeJsonText: "[]",
  businessLocationId: "",
};

function fmt(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

export default function ServicesManager({
  subscriptionTier,
  locations,
}: {
  subscriptionTier: SubscriptionTier;
  locations: Array<{ id: string; name: string }>;
}) {
  const canIntake = hasIntakeAndAccountingExport(subscriptionTier);
  const canLocation = hasPremiumFeatures(subscriptionTier);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modal, setModal] = useState<"add" | "edit" | null>(null);

  useBodyScrollLock(modal !== null);
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/services");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setServices(data.services);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setFormError("");
    setModal("add");
  }

  function openEdit(svc: Service) {
    setEditing(svc);
    const fields = parseIntakeFieldsJson(svc.intakeFormFieldsJson);
    setForm({
      name: svc.name,
      description: svc.description ?? "",
      durationMinutes: svc.durationMinutes,
      pricePence: svc.pricePence,
      isActive: svc.isActive,
      intakeJsonText: JSON.stringify(fields, null, 2),
      businessLocationId: svc.businessLocationId ?? "",
    });
    setFormError("");
    setModal("edit");
  }

  async function save() {
    setSaving(true);
    setFormError("");
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        description: form.description,
        durationMinutes: Number(form.durationMinutes),
        pricePence: Math.round(Number(form.pricePence) * 100),
        isActive: form.isActive,
      };

      if (canIntake) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(form.intakeJsonText.trim() || "[]");
        } catch {
          throw new Error("Intake form must be valid JSON.");
        }
        body.intakeFormFields = parseIntakeFieldsJson(parsed);
      }

      if (canLocation) {
        body.businessLocationId =
          form.businessLocationId === "" ? null : form.businessLocationId;
      }

      const url = modal === "edit" && editing ? `/api/dashboard/services/${editing.id}` : "/api/dashboard/services";
      const method = modal === "edit" ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setModal(null);
      await load();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this service? Existing bookings won't be affected.")) return;
    try {
      const res = await fetch(`/api/dashboard/services/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await load();
    } catch {
      alert("Failed to delete service.");
    }
  }

  async function toggleActive(svc: Service) {
    try {
      await fetch(`/api/dashboard/services/${svc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !svc.isActive }),
      });
      await load();
    } catch {
      alert("Failed to update service.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Services</h1>
          <p className="mt-1 text-sm text-rz-muted">Manage what you offer and how long each service takes.</p>
        </div>
        <button onClick={openAdd} className="rz-btn-primary gap-2">
          <Plus className="h-4 w-4" /> Add service
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.04]" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/20 py-16 text-center">
          <div className="text-4xl">🎯</div>
          <p className="mt-3 font-medium text-white">No services yet</p>
          <p className="mt-1 text-sm text-rz-muted">Add your first service so customers can book with you.</p>
          <button onClick={openAdd} className="rz-btn-primary mx-auto mt-5 gap-2">
            <Plus className="h-4 w-4" /> Add service
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="flex items-center gap-4 rounded-xl border border-white/10 bg-[#11111f]/85 px-5 py-4 shadow-[0_0_20px_rgba(139,134,249,0.06)] backdrop-blur-sm transition hover:border-white/20"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{svc.name}</span>
                  {!svc.isActive && (
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rz-muted">
                      Hidden
                    </span>
                  )}
                </div>
                {svc.description && <p className="mt-0.5 truncate text-xs text-rz-muted">{svc.description}</p>}
                <div className="mt-1 flex items-center gap-3 text-xs text-rz-subtle">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {svc.durationMinutes} min
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <PoundSterling className="h-3 w-3" /> {fmt(svc.pricePence)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(svc)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${svc.isActive ? "border-white/10 bg-white/[0.04] text-rz-muted hover:bg-white/[0.08]" : "border-[#8b86f9]/30 bg-[#8b86f9]/10 text-[#c4b5fd] hover:bg-[#8b86f9]/20"}`}
                >
                  {svc.isActive ? "Hide" : "Show"}
                </button>
                <button
                  onClick={() => openEdit(svc)}
                  className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-rz-muted transition hover:border-white/20 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => remove(svc.id)}
                  className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-rz-muted transition hover:border-red-500/40 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#13132c] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {modal === "add" ? "Add a service" : "Edit service"}
              </h2>
              <button onClick={() => setModal(null)} className="text-rz-muted hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-rz-muted">Service name</label>
                <input
                  className="rz-field"
                  placeholder="e.g. Haircut, Consultation, 1hr massage…"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-rz-muted">Description (optional)</label>
                <textarea
                  className="rz-field min-h-[70px] resize-none"
                  placeholder="What's included? Any notes for customers…"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-rz-muted">Duration (minutes)</label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    className="rz-field"
                    value={form.durationMinutes}
                    onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value === "" ? "" : Number(e.target.value) }))}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-rz-muted">Price (£)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="rz-field"
                    placeholder="0.00"
                    value={form.pricePence === "" ? "" : (form.pricePence as number) / 100}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        pricePence: e.target.value === "" ? "" : Math.round(Number(e.target.value) * 100),
                      }))
                    }
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.isActive}
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${form.isActive ? "border-[#8b86f9]/60 bg-[#8b86f9]/30" : "border-white/10 bg-white/[0.08]"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full transition-transform ${form.isActive ? "translate-x-6 bg-[#a5a0ff]" : "translate-x-1 bg-rz-subtle"}`}
                  />
                </button>
                <span className="text-sm text-rz-muted">Show to customers</span>
              </label>

              {canLocation && locations.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-rz-muted">
                    Location (Premium)
                  </label>
                  <select
                    className="rz-field"
                    value={form.businessLocationId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, businessLocationId: e.target.value }))
                    }
                  >
                    <option value="">All locations</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {canIntake && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-rz-muted">
                    Intake form (Standard+) — JSON array
                  </label>
                  <textarea
                    className="rz-field min-h-[140px] font-mono text-xs"
                    value={form.intakeJsonText}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, intakeJsonText: e.target.value }))
                    }
                    spellCheck={false}
                  />
                  <p className="mt-1 text-xs text-rz-subtle">
                    Each entry needs id, label, type (text or textarea), and required (boolean).
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rz-btn-ghost">
                Cancel
              </button>
              <button onClick={save} disabled={saving} className="rz-btn-primary gap-2 disabled:opacity-60">
                {saving ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
