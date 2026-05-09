"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Check, Lock, Upload } from "lucide-react";

type BrandingData = {
  logoUrl: string | null;
  primaryColour: string | null;
  secondaryColour: string | null;
  googleFontFamily: string | null;
};

const FONT_OPTIONS = [
  "Plus Jakarta Sans", "Inter", "Nunito", "Poppins", "Raleway",
  "Montserrat", "Lato", "Open Sans", "Source Sans 3", "DM Sans",
];

const DEFAULT_PRIMARY = "#8b86f9";
const DEFAULT_SECONDARY = "#c4b5fd";

export default function BrandingEditor({ isPremium }: { isPremium: boolean }) {
  const [branding, setBranding] = useState<BrandingData>({
    logoUrl: null,
    primaryColour: DEFAULT_PRIMARY,
    secondaryColour: DEFAULT_SECONDARY,
    googleFontFamily: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/branding");
      const data = await res.json();
      if (res.ok && data.branding) {
        setBranding({
          logoUrl: data.branding.logoUrl ?? null,
          primaryColour: data.branding.primaryColour ?? DEFAULT_PRIMARY,
          secondaryColour: data.branding.secondaryColour ?? DEFAULT_SECONDARY,
          googleFontFamily: data.branding.googleFontFamily ?? null,
        });
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function uploadLogo(file: File) {
    setUploading(true);
    setError("");
    try {
      const res = await fetch("/api/dashboard/blob-upload", {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setBranding((b) => ({ ...b, logoUrl: data.url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/dashboard/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
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
      <div>
        <h1 className="text-2xl font-semibold text-white">Branding</h1>
        <p className="mt-1 text-sm text-rz-muted">Customise how your booking page looks to your customers.</p>
      </div>

      {!isPremium && (
        <div className="flex items-start gap-3 rounded-xl border border-[#8b86f9]/30 bg-[#8b86f9]/10 p-4">
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-[#c4b5fd]" />
          <div>
            <p className="font-medium text-[#c4b5fd]">Premium feature</p>
            <p className="mt-0.5 text-sm text-rz-muted">
              Custom branding is available on the Premium plan. Your booking page uses the default Reservezy style.
            </p>
            <a href="/dashboard/subscription" className="mt-2 inline-block text-sm font-semibold text-[#a5a0ff] hover:underline">
              Upgrade to Premium →
            </a>
          </div>
        </div>
      )}

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <fieldset disabled={!isPremium} className="space-y-6 disabled:opacity-50">
        {/* Logo */}
        <section className="rounded-2xl border border-white/10 bg-[#11111f]/80 p-6">
          <h2 className="mb-4 text-base font-semibold text-white">Logo</h2>

          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
              {branding.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.logoUrl} alt="Logo preview" className="h-14 w-14 rounded-lg object-contain" />
              ) : (
                <span className="text-2xl font-bold text-rz-subtle">R</span>
              )}
            </div>
            <div className="flex-1 space-y-3">
              {/* File upload */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-rz-muted">Upload logo</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="rz-btn-ghost gap-2 text-sm disabled:opacity-60"
                >
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Choose file"}
                </button>
                <p className="mt-1 text-xs text-rz-subtle">PNG, JPG, WEBP. Max ~4MB. Square images work best.</p>
              </div>
              {/* Or URL */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-rz-muted">Or paste a URL</label>
                <input
                  type="url"
                  className="rz-field"
                  placeholder="https://example.com/logo.png"
                  value={branding.logoUrl ?? ""}
                  onChange={(e) => setBranding((b) => ({ ...b, logoUrl: e.target.value || null }))}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Colours */}
        <section className="rounded-2xl border border-white/10 bg-[#11111f]/80 p-6">
          <h2 className="mb-4 text-base font-semibold text-white">Colours</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-rz-muted">Primary colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
                  value={branding.primaryColour ?? DEFAULT_PRIMARY}
                  onChange={(e) => setBranding((b) => ({ ...b, primaryColour: e.target.value }))}
                />
                <input
                  type="text"
                  maxLength={7}
                  className="rz-field font-mono text-sm"
                  value={branding.primaryColour ?? DEFAULT_PRIMARY}
                  onChange={(e) => setBranding((b) => ({ ...b, primaryColour: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-rz-muted">Secondary / accent colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-transparent p-1"
                  value={branding.secondaryColour ?? DEFAULT_SECONDARY}
                  onChange={(e) => setBranding((b) => ({ ...b, secondaryColour: e.target.value }))}
                />
                <input
                  type="text"
                  maxLength={7}
                  className="rz-field font-mono text-sm"
                  value={branding.secondaryColour ?? DEFAULT_SECONDARY}
                  onChange={(e) => setBranding((b) => ({ ...b, secondaryColour: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Preview swatch */}
          <div className="mt-5 flex items-center gap-3">
            <div
              className="h-8 w-24 rounded-full text-center text-xs font-semibold leading-8 text-white shadow-md"
              style={{ background: branding.primaryColour ?? DEFAULT_PRIMARY }}
            >
              Button
            </div>
            <div
              className="h-5 w-5 rounded-full border border-white/20"
              style={{ background: branding.secondaryColour ?? DEFAULT_SECONDARY }}
            />
            <span className="text-xs text-rz-subtle">Preview</span>
          </div>
        </section>

        {/* Font */}
        <section className="rounded-2xl border border-white/10 bg-[#11111f]/80 p-6">
          <h2 className="mb-4 text-base font-semibold text-white">Font</h2>
          <label className="mb-1.5 block text-sm font-medium text-rz-muted">Google Font family</label>
          <select
            className="rz-field"
            value={branding.googleFontFamily ?? "Plus Jakarta Sans"}
            onChange={(e) => setBranding((b) => ({ ...b, googleFontFamily: e.target.value }))}
          >
            {FONT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <p className="mt-1 text-xs text-rz-subtle">Applied to your public booking page.</p>
        </section>
      </fieldset>

      {isPremium && (
        <div className="flex items-center gap-3">
          <button onClick={save} disabled={saving} className="rz-btn-primary gap-2 disabled:opacity-60">
            {saving ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Check className="h-4 w-4" />}
            {saving ? "Saving…" : "Save branding"}
          </button>
          {saved && <span className="text-sm text-[#a5a0ff]">✓ Saved</span>}
        </div>
      )}
    </div>
  );
}
