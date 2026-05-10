"use client";

import { useState } from "react";

export function ReviewsClient({
  initialEnabled,
  initialUrl,
}: {
  initialEnabled: boolean;
  initialUrl: string;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [url, setUrl] = useState(initialUrl);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/dashboard/review-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reviewPromptEnabled: enabled,
        reviewUrl: url.trim() === "" ? null : url.trim(),
      }),
    });
    const body = (await res.json()) as { error?: string };
    setSaving(false);
    if (!res.ok) {
      setMsg(body.error ?? "Could not save.");
      return;
    }
    setMsg("Saved.");
  }

  return (
    <div className="rz-card space-y-5 p-6">
      <label className="flex cursor-pointer items-center gap-3 text-sm text-white">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-[#0d0d23]"
        />
        Send review emails for completed appointments
      </label>
      <label className="block text-sm">
        <span className="text-rz-muted">Review link (https://…)</span>
        <input
          className="rz-field mt-1"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://g.page/your-business/review"
        />
      </label>
      <p className="text-xs text-rz-subtle">
        Cron sends a message 1–6 hours after the appointment end time once the booking is marked{" "}
        <strong className="text-rz-muted">Completed</strong>. Ensure <code className="text-rz-accent">CRON_SECRET</code>{" "}
        is set so your scheduler can call <code className="text-rz-accent">/api/cron/reminders</code>.
      </p>
      {msg && <p className="text-sm text-rz-muted">{msg}</p>}
      <button
        type="button"
        disabled={saving}
        onClick={() => void save()}
        className="rz-btn-primary text-sm disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
