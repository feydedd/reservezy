"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";

type Step = {
  id: string;
  label: string;
  done: boolean;
  dismissed: boolean;
};

export function SetupChecklist() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard/checklist");
      const body = (await res.json()) as { steps?: Step[] };
      if (res.ok && Array.isArray(body.steps)) {
        setSteps(body.steps);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => null);
  }, [load]);

  const dismiss = async (id: string) => {
    try {
      await fetch("/api/dashboard/checklist", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dismissId: id }),
      });
      await load();
    } catch {
      /* ignore */
    }
  };

  const allDone = steps.length > 0 && steps.every((s) => s.done || s.dismissed);
  if (loading || steps.length === 0) {
    return null;
  }
  if (allDone) {
    return (
      <div className="rz-card flex items-start gap-3 p-5">
        <Sparkles className="h-5 w-5 shrink-0 text-emerald-400" />
        <div>
          <p className="text-sm font-bold text-white">Setup complete</p>
          <p className="mt-1 text-xs text-rz-muted">
            You have finished the essentials. Visit{" "}
            <Link href="/dashboard/promos" className="text-rz-accent hover:underline">
              Promo codes
            </Link>{" "}
            or{" "}
            <Link href="/dashboard/bookings" className="text-rz-accent hover:underline">
              Bookings
            </Link>{" "}
            any time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rz-card p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-rz-subtle">
        Setup checklist
      </p>
      <ul className="mt-4 space-y-3">
        {steps.map((s) => (
          <li key={s.id} className="flex items-start gap-3 text-sm">
            {s.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-rz-subtle" />
            )}
            <div className="min-w-0 flex-1">
              <span className={s.done ? "text-rz-muted line-through" : "text-white"}>
                {s.label}
              </span>
              {!s.done && s.id === "share" && (
                <button
                  type="button"
                  onClick={() => dismiss("share")}
                  className="ml-2 text-xs font-semibold text-rz-accent hover:underline"
                >
                  Mark done
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
