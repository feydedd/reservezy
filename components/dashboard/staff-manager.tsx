"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, UserX, UserCheck, X, Check } from "lucide-react";

import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

type ServiceOption = { id: string; name: string };

type StaffMember = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  offeredServices: ServiceOption[];
};

type FormState = {
  fullName: string;
  email: string;
  password: string;
  serviceIds: string[];
};

const DEFAULT_FORM: FormState = { fullName: "", email: "", password: "", serviceIds: [] };

export default function StaffManager() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useBodyScrollLock(modal !== null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [staffRes, svcRes] = await Promise.all([
        fetch("/api/dashboard/staff"),
        fetch("/api/dashboard/services"),
      ]);
      const staffData = await staffRes.json();
      const svcData = await svcRes.json();
      if (!staffRes.ok) throw new Error(staffData.error ?? "Failed to load staff");
      setStaff(staffData.staff);
      setServices(svcData.services ?? []);
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

  function openEdit(member: StaffMember) {
    setEditing(member);
    setForm({
      fullName: member.fullName,
      email: member.email,
      password: "",
      serviceIds: member.offeredServices.map((s) => s.id),
    });
    setFormError("");
    setModal("edit");
  }

  async function save() {
    setSaving(true);
    setFormError("");
    try {
      const body: Record<string, unknown> = {
        fullName: form.fullName,
        email: form.email,
        serviceIds: form.serviceIds,
      };
      if (form.password) body.password = form.password;

      const url = modal === "edit" && editing ? `/api/dashboard/staff/${editing.id}` : "/api/dashboard/staff";
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

  async function toggleActive(member: StaffMember) {
    const action = member.isActive ? "deactivate" : "reactivate";
    if (!confirm(`This will ${action} ${member.fullName}. Continue?`)) return;
    try {
      const url = member.isActive
        ? `/api/dashboard/staff/${member.id}`
        : `/api/dashboard/staff/${member.id}`;
      const method = member.isActive ? "DELETE" : "PATCH";
      const body = member.isActive ? undefined : JSON.stringify({ isActive: true });
      await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body,
      });
      await load();
    } catch {
      alert("Failed to update staff member.");
    }
  }

  function toggleService(id: string) {
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((s) => s !== id) : [...f.serviceIds, id],
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Staff</h1>
          <p className="mt-1 text-sm text-rz-muted">Add team members who can take bookings.</p>
        </div>
        <button onClick={openAdd} className="rz-btn-primary gap-2">
          <Plus className="h-4 w-4" /> Add staff
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.04]" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/20 py-16 text-center">
          <div className="text-4xl">👥</div>
          <p className="mt-3 font-medium text-white">No staff yet</p>
          <p className="mt-1 text-sm text-rz-muted">Add your first team member to start sharing the bookings load.</p>
          <button onClick={openAdd} className="rz-btn-primary mx-auto mt-5 gap-2">
            <Plus className="h-4 w-4" /> Add staff
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {staff.map((member) => (
            <div
              key={member.id}
              className={`flex items-center gap-4 rounded-xl border px-5 py-4 backdrop-blur-sm transition ${member.isActive ? "border-white/10 bg-[#11111f]/85" : "border-white/[0.06] bg-white/[0.02] opacity-60"}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#8b86f9]/30 bg-[#8b86f9]/15 text-sm font-bold text-[#c4b5fd]">
                {member.fullName.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{member.fullName}</span>
                  {!member.isActive && (
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rz-muted">
                      Deactivated
                    </span>
                  )}
                </div>
                <div className="text-xs text-rz-muted">{member.email}</div>
                {member.offeredServices.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {member.offeredServices.map((s) => (
                      <span
                        key={s.id}
                        className="rounded-full border border-[#8b86f9]/20 bg-[#8b86f9]/10 px-2 py-0.5 text-[10px] text-[#c4b5fd]"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => openEdit(member)}
                  className="rounded-full border border-white/10 bg-white/[0.04] p-2 text-rz-muted transition hover:border-white/20 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => toggleActive(member)}
                  className={`rounded-full border p-2 transition ${member.isActive ? "border-white/10 bg-white/[0.04] text-rz-muted hover:border-red-500/40 hover:text-red-400" : "border-[#8b86f9]/30 bg-[#8b86f9]/10 text-[#c4b5fd] hover:bg-[#8b86f9]/20"}`}
                >
                  {member.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#13132c] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {modal === "add" ? "Add team member" : "Edit team member"}
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
                <label className="mb-1.5 block text-sm font-medium text-rz-muted">Full name</label>
                <input className="rz-field" placeholder="Jane Smith" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-rz-muted">Email</label>
                <input type="email" className="rz-field" placeholder="jane@example.com" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-rz-muted">
                  {modal === "edit" ? "New password (leave blank to keep current)" : "Password"}
                </label>
                <input type="password" className="rz-field" placeholder="Min 8 characters" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
              </div>

              {services.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-rz-muted">Services offered</label>
                  <div className="flex flex-wrap gap-2">
                    {services.map((svc) => {
                      const selected = form.serviceIds.includes(svc.id);
                      return (
                        <button
                          key={svc.id}
                          type="button"
                          onClick={() => toggleService(svc.id)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${selected ? "border-[#8b86f9]/60 bg-[#8b86f9]/20 text-[#c4b5fd]" : "border-white/10 bg-white/[0.04] text-rz-muted hover:border-white/20"}`}
                        >
                          {selected && <Check className="mr-1 inline-block h-3 w-3" />}{svc.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setModal(null)} className="rz-btn-ghost">Cancel</button>
              <button onClick={save} disabled={saving} className="rz-btn-primary gap-2 disabled:opacity-60">
                {saving ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Check className="h-4 w-4" />}
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
