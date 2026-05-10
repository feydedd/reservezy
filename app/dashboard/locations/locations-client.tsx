"use client";

import { useCallback, useState } from "react";
import { MapPin, Plus, Trash2 } from "lucide-react";

type Loc = { id: string; name: string; sortOrder: number };

export function LocationsClient({ initial }: { initial: Loc[] }) {
  const [rows, setRows] = useState(initial);
  const [name, setName] = useState("");

  const sync = useCallback(async () => {
    const res = await fetch("/api/dashboard/locations");
    const body = (await res.json()) as { locations?: Loc[] };
    if (res.ok) {
      setRows(body.locations ?? []);
    }
  }, []);

  async function add() {
    if (!name.trim()) {
      return;
    }
    const res = await fetch("/api/dashboard/locations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) {
      setName("");
      await sync();
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this location?")) {
      return;
    }
    await fetch(`/api/dashboard/locations/${id}`, { method: "DELETE" });
    await sync();
  }

  return (
    <div className="space-y-6">
      <div className="rz-card flex flex-wrap items-end gap-3 p-6">
        <label className="min-w-[200px] flex-1 text-sm">
          <span className="text-rz-muted">Location name</span>
          <input
            className="rz-field mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="City centre, North branch…"
          />
        </label>
        <button type="button" onClick={() => void add()} className="rz-btn-primary gap-2 text-sm">
          <Plus className="h-4 w-4" /> Add location
        </button>
      </div>

      <div className="rz-card divide-y divide-white/[0.06]">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 px-5 py-4">
            <MapPin className="h-4 w-4 shrink-0 text-rz-accent" />
            <span className="flex-1 font-medium text-white">{r.name}</span>
            <button
              type="button"
              onClick={() => void remove(r.id)}
              className="rounded-lg p-2 text-rz-subtle hover:bg-red-500/10 hover:text-red-300"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="p-6 text-center text-sm text-rz-muted">
            Add at least two locations to enable the location picker on your public booking page.
          </p>
        )}
        {rows.length === 1 && (
          <p className="border-t border-amber-500/20 bg-amber-500/5 p-4 text-xs text-amber-200/90">
            Add a second location to require customers to choose a site before booking.
          </p>
        )}
      </div>
    </div>
  );
}
