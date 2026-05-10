"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

import { PREMIUM_TEMPLATES } from "@/lib/content/premium-templates";

export function TemplatesClient() {
  const [copied, setCopied] = useState<string | null>(null);

  async function copyText(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PREMIUM_TEMPLATES.map((t) => (
        <div key={t.id} className="rz-card flex flex-col p-5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rz-subtle">
              {t.category}
            </span>
            <button
              type="button"
              onClick={() => void copyText(t.id, t.body)}
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs font-semibold text-rz-muted hover:border-[#8b86f9]/40 hover:text-white"
            >
              {copied === t.id ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </>
              )}
            </button>
          </div>
          <h2 className="text-base font-bold text-white">{t.title}</h2>
          <p className="mt-3 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-rz-muted">
            {t.body}
          </p>
        </div>
      ))}
    </div>
  );
}
