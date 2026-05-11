import Link from "next/link";

type MarketingNavProps = {
  variant?: "default" | "minimal";
};

export function MarketingNav({ variant = "default" }: MarketingNavProps) {
  return (
    <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 pt-7 sm:px-8">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#8b86f9] to-[#6d66f0] shadow-[0_0_16px_rgba(139,134,249,0.4)]">
          <span className="text-sm font-extrabold text-white">R</span>
        </div>
        <span className="text-base font-bold tracking-tight text-white">
          Reservezy
        </span>
      </Link>

      {/* Centre nav pill */}
      {variant === "default" && (
        <nav
          className="hidden items-center gap-0.5 rounded-full border border-white/[0.09] bg-white/[0.04] px-2 py-1.5 backdrop-blur-md md:flex"
          aria-label="Primary navigation"
        >
          {[
            { href: "/#features", label: "Features" },
            { href: "/pricing", label: "Pricing" },
            { href: "/#businesses", label: "Industries" },
            { href: "/#faq", label: "FAQ" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-rz-muted transition-all duration-200 hover:bg-white/[0.07] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Link
          href="/login"
          className="rounded-full px-4 py-2 text-sm font-medium text-rz-muted transition-all duration-200 hover:text-white"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rz-glow rounded-full bg-gradient-to-r from-[#8b86f9] to-[#6d66f0] px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
        >
          Start free
        </Link>
      </div>
    </header>
  );
}
