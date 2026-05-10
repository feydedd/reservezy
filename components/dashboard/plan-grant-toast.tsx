"use client";

import { useState, useEffect } from "react";
import { X, CrownIcon, Sparkles } from "lucide-react";

export function PlanGrantToast({ note }: { note: string }) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Slight delay for a smooth entrance after page load
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, []);

  async function dismiss() {
    setVisible(false);
    setTimeout(async () => {
      setDismissed(true);
      try {
        await fetch("/api/dashboard/grant-notification", { method: "DELETE" });
      } catch {
        // best-effort — will re-show on next login if it fails
      }
    }, 400);
  }

  if (dismissed) return null;

  // Parse simple **bold** markdown for the note text
  const parts = note.split(/\*\*(.*?)\*\*/g);
  const formatted = parts.map((p, i) =>
    i % 2 === 1 ? <strong key={i} className="font-bold text-white">{p}</strong> : p
  );

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-full max-w-sm transition-all duration-500 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[#8b86f9]/30 bg-[#0d0d1f] shadow-2xl shadow-[#8b86f9]/10">
        {/* Gradient accent line at top */}
        <div className="h-1 w-full bg-gradient-to-r from-[#8b86f9] via-[#a78bfa] to-[#fbbf24]" />

        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b86f9] to-[#6d66f0]">
              <CrownIcon className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 pr-6">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-white">Plan updated</p>
                <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
              </div>
              <p className="mt-1 text-sm leading-relaxed text-rz-muted">{formatted}</p>
            </div>
          </div>

          <button
            onClick={dismiss}
            className="mt-4 w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]"
          >
            Got it, thanks!
          </button>
        </div>

        <button
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-rz-subtle transition hover:bg-white/[0.07] hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
