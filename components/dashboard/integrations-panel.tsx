"use client";

import { useState } from "react";
import { Lock, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

type GoogleIntegration = { accountEmail: string | null; calendarId: string | null } | null;
type OutlookIntegration = { accountEmail: string | null } | null;

export default function IntegrationsPanel({
  isPremium,
  googleIntegration,
  outlookIntegration,
  flashSuccess,
  flashError,
}: {
  isPremium: boolean;
  googleIntegration: GoogleIntegration;
  outlookIntegration: OutlookIntegration;
  flashSuccess?: string;
  flashError?: string;
}) {
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [googleState, setGoogleState] = useState<GoogleIntegration>(googleIntegration);
  const [outlookState, setOutlookState] = useState<OutlookIntegration>(outlookIntegration);
  const [outlookConnecting, setOutlookConnecting] = useState(false);
  const [outlookDisconnecting, setOutlookDisconnecting] = useState(false);

  async function connectGoogle() {
    setConnecting(true);
    try {
      const res = await fetch("/api/dashboard/integrations/google/connect");
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Failed to start Google sign-in. Check your Premium plan status.");
    } finally {
      setConnecting(false);
    }
  }

  async function disconnectGoogle() {
    if (!confirm("Disconnect Google Calendar? Future bookings won't sync.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/dashboard/integrations/google/disconnect", { method: "POST" });
      setGoogleState(null);
    } catch {
      alert("Failed to disconnect.");
    } finally {
      setDisconnecting(false);
    }
  }

  async function connectOutlook() {
    setOutlookConnecting(true);
    try {
      const res = await fetch("/api/dashboard/integrations/outlook/connect");
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      alert("Failed to start Microsoft sign-in.");
    } finally {
      setOutlookConnecting(false);
    }
  }

  async function disconnectOutlook() {
    if (!confirm("Disconnect Outlook Calendar? Future bookings won't sync.")) return;
    setOutlookDisconnecting(true);
    try {
      await fetch("/api/dashboard/integrations/outlook/disconnect", { method: "POST" });
      setOutlookState(null);
    } catch {
      alert("Failed to disconnect.");
    } finally {
      setOutlookDisconnecting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Integrations</h1>
        <p className="mt-1 text-sm text-rz-muted">Connect your calendar so bookings appear automatically.</p>
      </div>

      {/* Flash messages */}
      {(flashSuccess === "google_connected" || flashSuccess === "outlook_connected") && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <p className="text-sm font-medium text-emerald-300">
          {flashSuccess === "outlook_connected" ? "Outlook Calendar" : "Google Calendar"} connected successfully!
        </p>
        </div>
      )}
      {flashError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">
            {flashError === "oauth_denied"
              ? "Google sign-in was cancelled or denied."
              : "Something went wrong connecting Google Calendar. Please try again."}
          </p>
        </div>
      )}

      {!isPremium && (
        <div className="flex items-start gap-3 rounded-xl border border-[#8b86f9]/30 bg-[#8b86f9]/10 p-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#c4b5fd]" />
          <div>
            <p className="font-medium text-[#c4b5fd]">Premium feature</p>
            <p className="mt-0.5 text-sm text-rz-muted">
              Calendar integrations are available on the Premium plan. Upgrade to automatically sync bookings.
            </p>
            <a href="/dashboard/subscription" className="mt-2 inline-block text-sm font-semibold text-[#a5a0ff] hover:underline">
              Upgrade to Premium →
            </a>
          </div>
        </div>
      )}

      {/* Google Calendar */}
      <section className="rounded-2xl border border-white/10 bg-[#11111f]/80 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Google logo placeholder */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-xl font-bold">
              <svg viewBox="0 0 48 48" className="h-7 w-7" fill="none">
                <path fill="#4285F4" d="M47.532 24.552c0-1.636-.147-3.2-.418-4.694H24v8.881h13.216c-.57 3.01-2.3 5.565-4.906 7.274v6.043h7.941c4.648-4.28 7.281-10.585 7.281-17.504z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.916-2.149 15.888-5.832l-7.94-6.044c-2.208 1.479-5.03 2.35-7.948 2.35-6.107 0-11.283-4.124-13.134-9.666H2.56v6.24C6.515 42.786 14.64 48 24 48z"/>
                <path fill="#FBBC05" d="M10.866 28.808A14.968 14.968 0 0 1 9.418 24c0-1.666.286-3.287.8-4.808V12.95H2.56A23.986 23.986 0 0 0 0 24c0 3.876.931 7.543 2.56 10.808l8.306-6z"/>
                <path fill="#EA4335" d="M24 9.526c3.44 0 6.527 1.183 8.956 3.508l6.713-6.714C35.915 2.372 30.478 0 24 0 14.64 0 6.515 5.214 2.56 12.95l8.306 6c1.851-5.542 7.027-9.424 13.134-9.424z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">Google Calendar</h3>
              <p className="mt-0.5 text-sm text-rz-muted">
                New bookings are added to your Google Calendar automatically.
              </p>
              {googleState && (
                <p className="mt-1 text-xs text-[#a5a0ff]">
                  ✓ Connected as {googleState.accountEmail ?? "unknown"} · Calendar: {googleState.calendarId ?? "primary"}
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0">
            {googleState ? (
              <button
                onClick={disconnectGoogle}
                disabled={disconnecting || !isPremium}
                className="rz-btn-ghost text-sm disabled:opacity-50"
              >
                {disconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            ) : (
              <button
                onClick={connectGoogle}
                disabled={connecting || !isPremium}
                className="rz-btn-primary gap-2 text-sm disabled:opacity-50"
              >
                {connecting ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5" />
                )}
                {connecting ? "Redirecting…" : "Connect Google"}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Microsoft Outlook */}
      <section className="rounded-2xl border border-white/10 bg-[#11111f]/80 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75V22.1L0 20.699M10.949 12.6H24V24l-12.9-1.801" fill="#0078D4"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">Outlook Calendar</h3>
              <p className="mt-0.5 text-sm text-rz-muted">Microsoft 365 / Outlook calendar sync.</p>
              {outlookState && (
                <p className="mt-1 text-xs text-[#a5a0ff]">✓ Connected as {outlookState.accountEmail ?? "unknown"}</p>
              )}
            </div>
          </div>

          <div className="shrink-0">
            {outlookState ? (
              <button
                onClick={disconnectOutlook}
                disabled={outlookDisconnecting || !isPremium}
                className="rz-btn-ghost text-sm disabled:opacity-50"
              >
                {outlookDisconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            ) : (
              <button
                onClick={connectOutlook}
                disabled={outlookConnecting || !isPremium}
                className="rz-btn-primary gap-2 text-sm disabled:opacity-50"
              >
                {outlookConnecting ? (
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5" />
                )}
                {outlookConnecting ? "Redirecting…" : "Connect Outlook"}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
