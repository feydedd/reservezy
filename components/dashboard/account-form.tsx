"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, User } from "lucide-react";

type UserInfo = { id: string; fullName: string; email: string };

export default function AccountForm({ role }: { role: string }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [pwError, setPwError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/dashboard/account");
    const data = await res.json();
    setUser(data.user);
    setName(data.user?.fullName ?? "");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveProfile() {
    setSavingProfile(true);
    setProfileError("");
    setProfileSaved(false);
    try {
      const res = await fetch("/api/dashboard/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setUser(data.user);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword() {
    setPwError("");
    if (newPw !== confirmPw) { setPwError("Passwords don't match."); return; }
    if (newPw.length < 8) { setPwError("Password must be at least 8 characters."); return; }
    setSavingPw(true);
    setPwSaved(false);
    try {
      const res = await fetch("/api/dashboard/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 3000);
    } catch (e) {
      setPwError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSavingPw(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-white/[0.06]" />
        <div className="h-40 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-white">Account</h1>
        <p className="mt-1 text-sm text-rz-muted">Manage your personal details and login credentials.</p>
      </div>

      {/* Profile info */}
      <section className="rounded-2xl border border-white/10 bg-[#11111f]/80 p-6">
        <div className="mb-5 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#8b86f9]/30 bg-[#8b86f9]/15 text-xl font-bold text-[#c4b5fd]">
            {user?.fullName?.charAt(0).toUpperCase() ?? <User className="h-6 w-6" />}
          </div>
          <div>
            <div className="font-semibold text-white">{user?.fullName}</div>
            <div className="text-sm text-rz-muted">{user?.email}</div>
            <span className="rz-badge mt-1">{role === "BUSINESS_OWNER" ? "Owner" : "Staff"}</span>
          </div>
        </div>

        {profileError && <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{profileError}</div>}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-rz-muted">Full name</label>
            <input className="rz-field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-rz-muted">Email address</label>
            <input className="rz-field opacity-60" value={user?.email ?? ""} disabled />
            <p className="mt-1 text-xs text-rz-subtle">Contact support to change your email address.</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button onClick={saveProfile} disabled={savingProfile} className="rz-btn-primary gap-2 disabled:opacity-60">
            {savingProfile ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Check className="h-4 w-4" />}
            {savingProfile ? "Saving…" : "Save name"}
          </button>
          {profileSaved && <span className="text-sm text-[#a5a0ff]">✓ Saved</span>}
        </div>
      </section>

      {/* Change password */}
      <section className="rounded-2xl border border-white/10 bg-[#11111f]/80 p-6">
        <h2 className="mb-4 text-base font-semibold text-white">Change password</h2>

        {pwError && <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{pwError}</div>}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-rz-muted">Current password</label>
            <input type="password" className="rz-field" placeholder="••••••••" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-rz-muted">New password</label>
            <input type="password" className="rz-field" placeholder="Min 8 characters" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-rz-muted">Confirm new password</label>
            <input type="password" className="rz-field" placeholder="Same as above" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button onClick={savePassword} disabled={savingPw} className="rz-btn-primary gap-2 disabled:opacity-60">
            {savingPw ? <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Check className="h-4 w-4" />}
            {savingPw ? "Updating…" : "Update password"}
          </button>
          {pwSaved && <span className="text-sm text-[#a5a0ff]">✓ Password updated</span>}
        </div>
      </section>
    </div>
  );
}
