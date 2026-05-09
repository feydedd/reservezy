type LogoMarkProps = {
  size?: "sm" | "md";
};

export function LogoMark({ size = "md" }: LogoMarkProps) {
  const box = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const icon = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  return (
    <span
      className={`${box} slot-glow-soft flex shrink-0 items-center justify-center rounded-xl bg-[#1a1a2e] ring-1 ring-[#8b86f9]/40`}
      aria-hidden
    >
      <svg
        className={icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#a5a0ff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3.5" y="4.5" width="17" height="16" rx="2" />
        <path d="M3.5 9h17M8 2.5v4M16 2.5v4" />
        <path d="M8 14h2M12 14h2M8 17h6" className="opacity-70" />
      </svg>
    </span>
  );
}
