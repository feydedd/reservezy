"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, QrCode } from "lucide-react";

type Props = { subdomain: string };

function QRCodeDisplay({ url }: { url: string }) {
  const encoded = encodeURIComponent(url);
  const qrSrc   = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encoded}&bgcolor=13132c&color=c4b5fd&margin=8`;
  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrSrc} alt="QR code for booking link" width={180} height={180} className="rounded-xl border border-white/[0.08]" />
      <a
        href={qrSrc.replace("13132c", "ffffff").replace("c4b5fd", "000000")}
        download="booking-qr.png"
        className="rz-btn-ghost gap-2 px-4 py-2 text-xs"
        target="_blank"
        rel="noreferrer"
      >
        Download for print
      </a>
    </div>
  );
}

export function BookingLinkWidget({ subdomain }: Props) {
  const bookingUrl = `https://${subdomain}.reservezy.com`;
  const [copied,  setCopied]  = useState(false);
  const [showQr,  setShowQr]  = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback: select text */ }
  };

  const whatsappMsg = encodeURIComponent(`You can book an appointment with us here: ${bookingUrl}`);
  const smsMsg      = encodeURIComponent(`Book online at ${bookingUrl}`);

  return (
    <div className="rz-card space-y-5 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-rz-subtle">Your booking link</p>
          <p className="mt-1 text-sm text-rz-muted">Share this with customers so they can book 24/7 without calling.</p>
        </div>
        <a href={bookingUrl} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg p-1.5 text-rz-subtle hover:bg-white/[0.06] hover:text-white" title="Open booking page">
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* URL bar */}
      <div className="flex items-center gap-2 overflow-hidden rounded-xl border border-[#8b86f9]/20 bg-[#0d0d23]/80">
        <span className="flex-1 truncate px-4 py-2.5 font-mono text-sm text-rz-accent">{bookingUrl}</span>
        <button
          onClick={copy}
          className="flex shrink-0 items-center gap-1.5 border-l border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-rz-muted transition hover:bg-white/[0.08] hover:text-white"
        >
          {copied ? <><Check className="h-3.5 w-3.5 text-emerald-400" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
        </button>
      </div>

      {/* Share channels */}
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${whatsappMsg}`}
          target="_blank" rel="noreferrer"
          className="flex items-center gap-2 rounded-full border border-[#25d366]/30 bg-[#25d366]/10 px-3 py-1.5 text-xs font-semibold text-[#4ade80] transition hover:bg-[#25d366]/20"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a13 13 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
          Share via WhatsApp
        </a>

        <a
          href={`sms:?body=${smsMsg}`}
          className="flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-rz-muted transition hover:bg-white/[0.08] hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Send as SMS
        </a>

        <button
          onClick={() => setShowQr(v => !v)}
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${showQr ? "border-[#8b86f9]/40 bg-[#8b86f9]/15 text-rz-accent" : "border-white/[0.10] bg-white/[0.04] text-rz-muted hover:bg-white/[0.08] hover:text-white"}`}
        >
          <QrCode className="h-3.5 w-3.5" />
          QR code
        </button>
      </div>

      {/* QR code panel */}
      {showQr && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5">
          <QRCodeDisplay url={bookingUrl} />
          <p className="mt-3 text-center text-xs text-rz-subtle">Print and display at your counter, window, or on appointment reminder cards.</p>
        </div>
      )}

      {/* Transition tips */}
      <details className="group">
        <summary className="cursor-pointer list-none text-xs font-semibold text-rz-subtle hover:text-rz-muted">
          <span className="group-open:hidden">▸ Tips for transitioning from phone bookings</span>
          <span className="hidden group-open:inline">▾ Tips for transitioning from phone bookings</span>
        </summary>
        <ul className="mt-3 space-y-2 text-xs text-rz-subtle">
          <li className="flex gap-2"><span className="shrink-0 text-rz-accent">1.</span> Add the link to your email signature, Google Business profile, Instagram bio, and Facebook page.</li>
          <li className="flex gap-2"><span className="shrink-0 text-rz-accent">2.</span> Print the QR code and stick it on your counter, door, or appointment reminder cards.</li>
          <li className="flex gap-2"><span className="shrink-0 text-rz-accent">3.</span> When a customer calls, take their booking using the <strong className="text-rz-muted">&ldquo;Book for customer&rdquo;</strong> button on the Bookings page — keeps everything in one place.</li>
          <li className="flex gap-2"><span className="shrink-0 text-rz-accent">4.</span> Tell callers: <em className="text-rz-muted">&ldquo;I&apos;ll text you the link so you can book directly next time.&rdquo;</em> Send the SMS shortcut above.</li>
          <li className="flex gap-2"><span className="shrink-0 text-rz-accent">5.</span> After a few weeks most regulars will book themselves — no more phone tag.</li>
        </ul>
      </details>
    </div>
  );
}
