import type { Metadata } from "next";

import { ManageBookingClient } from "./manage-booking-client";

export const metadata: Metadata = {
  title: "Manage your booking — Reservezy",
};

type ManagePageProps = { params: { token: string } };

export default function ManageBookingPage({ params }: ManagePageProps) {
  return (
    <div className="rz-radial-hero min-h-screen px-4 py-16">
      {/* Logo */}
      <header className="mb-10 text-center">
        <a
          href="/"
          className="inline-flex items-center gap-2.5"
          aria-label="Reservezy home"
        >
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b86f9] to-[#6d66f0] shadow-[0_0_20px_rgba(139,134,249,0.4)]">
            <span className="text-base font-extrabold text-white">R</span>
          </div>
        </a>
      </header>
      <ManageBookingClient token={params.token} />
    </div>
  );
}
