import { Suspense } from "react";
import VerifyEmailClient from "./verify-email-client";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-rz-bg">
        <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#8b86f9]" />
      </div>
    }>
      <VerifyEmailClient />
    </Suspense>
  );
}
