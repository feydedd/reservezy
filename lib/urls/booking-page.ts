/** Public customer booking page (subdomain host). */

export function publicBookingPageUrl(subdomain: string): string {
  const rootDomain =
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";
  const appBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";
  const protocol = appBase.startsWith("https") ? "https" : "http";
  return `${protocol}://${subdomain}.${rootDomain}`;
}

export function customerReferralBookingUrl(
  subdomain: string,
  referralToken: string,
): string {
  const base = publicBookingPageUrl(subdomain);
  return `${base}?ref=${encodeURIComponent(referralToken)}`;
}
