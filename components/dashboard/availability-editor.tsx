"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, Plus, Trash2 } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type WorkingHour = { id?: string; dayOfWeek: number; openMinutes: number; closeMinutes: number };
type Holiday = { id: string; dateStart: string; label: string };
type StaffOption = { id: string; fullName: string };

function minutesToTime(m: number) {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const min = (m % 60).toString().padStart(2, "0");
  return `${h}:${min}`;
}

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

const TIMEZONES = [
  "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Amsterdam",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Asia/Dubai", "Asia/Tokyo", "Australia/Sydney",
];

export default function AvailabilityEditor() {
  const [hours, setHours] = useState<WorkingHour[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [bufferMinutes, setBufferMinutes] = useState(0);
  const [timezone, setTimezone] = useState("Europe/London");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [staffId, setStaffId] = useState<string>(""); // empty = business-level

  const [newHoliday, setNewHoliday] = useState({ dateStart: "", label: "" });
  const [addingHoliday, setAddingHoliday] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = staffId ? `?staffId=${staffId}` : "";
      const [res, staffRes] = await Promise.all([
        fetch(`/api/dashboard/availability${params}`),
        fetch("/api/dashboard/staff"),
      ]);
      const data = await res.json();
      const staffData = await staffRes.json();
      setStaffList(staffData.staff?.map((s: { id: string; fullName: string }) => ({ id: s.id, fullName: s.fullName })) ?? []);
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setHours(data.workingHours);
      setHolidays(
        data.holidays.map((h: { id: string; dateStart: string; label: string }) => ({
          id: h.id,
          dateStart: h.dateStart.slice(0, 10),
          label: h.label ?? "",
        })),
      );
      setBufferMinutes(data.business?.bookingBufferMinutes ?? 0);
      setTimezone(data.business?.timezone ?? "Europe/London");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => { load(); }, [load]);

  function isDayOn(day: number) {
    return hours.some((h) => h.dayOfWeek === day);
  }

  function toggleDay(day: number) {
    if (isDayOn(day)) {
      setHours((h) => h.filter((wh) => wh.dayOfWeek !== day));
    } else {
      setHours((h) => [...h, { dayOfWeek: day, openMinutes: 9 * 60, closeMinutes: 17 * 60 }].sort((a, b) => a.dayOfWeek - b.dayOfWeek));
    }
  }

  function updateHour(day: number, field: "openMinutes" | "closeMinutes", value: string) {
    setHours((h) =>
      h.map((wh) => (wh.dayOfWeek === day ? { ...wh, [field]: timeToMinutes(value) } : wh)),
    );
  }

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const params = staffId ? `?staffId=${staffId}` : "";
      const res = await fetch(`/api/dashboard/availability${params}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workingHours: hours, bufferMinutes, timezone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function addHoliday() {
    if (!newHoliday.dateStart) return;
    setAddingHoliday(true);
    try {
      const res = await fetch("/api/dashboard/availability/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateStart: newHoliday.dateStart, label: newHoliday.label }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add");
      setHolidays((h) => [
        ...h,
        { id: data.holiday.id, dateStart: data.holiday.dateStart.slice(0, 10), label: data.holiday.label ?? "" },
      ]);
      setNewHoliday({ dateStart: "", label: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add holiday");
    } finally {
      setAddingHoliday(false);
    }
  }

  async function removeHoliday(id: string) {
    try {
      await fetch(`/api/dashboard/availability/holidays/${id}`, { method: "DELETE" });
      setHolidays((h) => h.filter((hol) => hol.id !== id));
    } catch {
      alert("Failed to remove holiday.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="h-64 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Availability</h1>
          <p className="mt-1 text-sm text-rz-muted">Set working hours, buffer times, and closures.</p>
        </div>
        {staffList.length > 0 && (
          <div>
            <label className="mb-1 block text-xs text-rz-muted">Editing hours for</label>
            <select
              className="rz-field text-sm"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            >
              <option value="">Whole business</option>
              {staffList.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
            </select>
          </div>
        )}
      </div>
      {staffId && (
        <div className="rounded-xl border border-[#8b86f9]/30 bg-[#8b86f9]/10 px-4 py-3 text-sm text-[#c4b5fd]">
          You&apos;re editing <strong>{staffList.find((s) => s.id === staffId)?.fullName}&apos;s</strong> personal hours.
          When set, these override the business hours for this team member.
        </div>
      )}

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      {/* Working hours */}
      <section className="rounded-2xl border border-white/10 bg-[#11111f]/80 p-6">
        <h2 className="mb-4 text-base font-semibold text-white">Working hours</h2>
        <div className="space-y-3">
          {DAYS.map((name, day) => {
            const on = isDayOn(day);
            const wh = hours.find((h) => h.dayOfWeek === day);
            return (
              <div key={day} className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${on ? "border-[#8b86f9]/60 bg-[#8b86f9]/30" : "border-white/10 bg-white/[0.08]"}`}
                >
                  <span className={`inline-block h-4 w-4 rounded-full transition-transform ${on ? "translate-x-6 bg-[#a5a0ff]" : "translate-x-1 bg-rz-subtle"}`} />
                </button>
                <span className={`w-24 text-sm font-medium ${on ? "text-white" : "text-rz-muted"}`}>{name}</span>
                {on && wh ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="time"
                      className="rz-field w-28 text-sm"
                      value={minutesToTime(wh.openMinutes)}
                      onChange={(e) => updateHour(day, "openMinutes", e.target.value)}
                    />
                    <span className="text-rz-subtle">–</span>
                    <input
                      type="time"
                      className="rz-field w-28 text-sm"
                      value={minutesToTime(wh.closeMinutes)}
                      onChange={(e) => updateHour(day, "closeMinutes", e.target.value)}
                    />
                  </div>
                ) : (
                  <span className="text-sm text-rz-subtle">Closed</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Settings */}
      <section className="rounded-2xl border border-white/10 bg-[#11111f]/80 p-6">
        <h2 className="mb-4 text-base font-semibold text-white">Settings</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-rz-muted">Buffer between bookings (min)</label>
            <input
              type="number"
              min={0}
              max={120}
              className="rz-field"
              value={bufferMinutes}
              onChange={(e) => setBufferMinutes(Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-rz-subtle">Extra time after each booking before the next can start.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-rz-muted">Timezone</label>
            <select className="rz-field" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="rz-btn-primary gap-2 disabled:opacity-60">
          {saving ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Check className="h-4 w-4" />}
          {saving ? "Saving…" : "Save working hours"}
        </button>
        {saved && <span className="text-sm text-[#a5a0ff]">✓ Saved</span>}
      </div>

      {/* Holidays / closures */}
      <section className="rounded-2xl border border-white/10 bg-[#11111f]/80 p-6">
        <h2 className="mb-1 text-base font-semibold text-white">Closures & holidays</h2>
        <p className="mb-4 text-sm text-rz-muted">Dates when you&apos;re unavailable to accept bookings.</p>

        <div className="mb-4 space-y-2">
          {holidays.length === 0 && <p className="text-sm text-rz-subtle">No closures added yet.</p>}
          {holidays.map((hol) => (
            <div key={hol.id} className="flex items-center gap-3 rounded-lg border border-white/[0.08] bg-white/[0.04] px-4 py-3">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-white">{hol.dateStart}</span>
                {hol.label && <span className="ml-2 text-sm text-rz-muted">— {hol.label}</span>}
              </div>
              <button onClick={() => removeHoliday(hol.id)} className="shrink-0 rounded-full p-1.5 text-rz-muted transition hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-rz-muted">Date</label>
            <input type="date" className="rz-field text-sm" value={newHoliday.dateStart} onChange={(e) => setNewHoliday((h) => ({ ...h, dateStart: e.target.value }))} />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="mb-1 block text-xs text-rz-muted">Label (optional)</label>
            <input className="rz-field text-sm" placeholder="e.g. Bank holiday" value={newHoliday.label} onChange={(e) => setNewHoliday((h) => ({ ...h, label: e.target.value }))} />
          </div>
          <button onClick={addHoliday} disabled={!newHoliday.dateStart || addingHoliday} className="rz-btn-ghost gap-2 disabled:opacity-50">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </section>
    </div>
  );
}
