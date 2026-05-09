export type ResolvedHost =
  | { kind: "apex" }
  | { kind: "admin" }
  | { kind: "tenant"; subdomain: string };

function classifySubdomain(subdomain: string): ResolvedHost {
  const sub = subdomain.trim().toLowerCase();
  if (!sub || sub === "www") {
    return { kind: "apex" };
  }
  if (sub === "admin") {
    return { kind: "admin" };
  }
  return { kind: "tenant", subdomain: sub };
}

const stripOptionalWww = (value: string) =>
  value.startsWith("www.") ? value.slice("www.".length) : value;

/// Maps `Host` to tenant/admin vs apex using `NEXT_PUBLIC_ROOT_DOMAIN` (hostname + optional `:port`).
export function resolveHost(
  hostHeaderValue: string,
  rootDomainRaw: string,
): ResolvedHost {
  const host = hostHeaderValue.split(":")[0]?.toLowerCase() ?? "";

  let rootHost = rootDomainRaw.split(":")[0]?.toLowerCase().trim();
  if (!rootHost) {
    rootHost = "localhost";
  }

  const hostNoWww = stripOptionalWww(host);
  const rootHostNoWww = stripOptionalWww(rootHost);

  const isBareApex =
    host === rootHost ||
    host === `www.${rootHost}` ||
    hostNoWww === rootHostNoWww;

  if (isBareApex) {
    return { kind: "apex" };
  }

  if (rootHostNoWww === "localhost" && host.endsWith(".localhost")) {
    const sub = host.slice(0, -".localhost".length);
    return classifySubdomain(sub);
  }

  const suffix = `.${rootHostNoWww}`;
  if (host.endsWith(suffix)) {
    const sub = host.slice(0, -suffix.length);
    return classifySubdomain(sub);
  }

  return { kind: "apex" };
}
