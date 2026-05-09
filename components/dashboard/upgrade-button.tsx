"use client";

import { useState } from "react";

export function UpgradeButton({ tier, label }: { tier: "STANDARD" | "PREMIUM"; label: string }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/upgrade-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error ?? "Could not start checkout.");
        setLoading(false);
      }
    } catch {
      alert("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="rz-btn-primary mt-5 w-full justify-center py-3 disabled:opacity-60"
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          Redirecting…
        </span>
      ) : (
        `Upgrade to ${label} →`
      )}
    </button>
  );
}
