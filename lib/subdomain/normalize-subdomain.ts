const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])$/;

/** Reserved apex / platform names that collide with middleware routing */
export const RESERVED_SUBDOMAINS = new Set<string>([
  "admin",
  "www",
  "api",
  "app",
  "cdn",
  "mail",
  "ftp",
  "static",
  "assets",
  "reservezy",
]);

export type SubdomainNormalization =
  | { ok: true; value: string }
  | {
      ok: false;
      code: "invalid" | "reserved" | "empty";
      message: string;
    };

export function normalizeSubdomainCandidate(raw: string): SubdomainNormalization {
  const value = raw.trim().toLowerCase();

  if (!value) {
    return { ok: false, code: "empty", message: "Subdomain cannot be blank." };
  }

  if (value.length > 63) {
    return {
      ok: false,
      code: "invalid",
      message: "Subdomains may be up to 63 characters.",
    };
  }

  if (!SUBDOMAIN_REGEX.test(value)) {
    return {
      ok: false,
      code: "invalid",
      message:
        "Use lowercase letters, numbers, and single hyphens (no spaces or underscores).",
    };
  }

  if (RESERVED_SUBDOMAINS.has(value)) {
    return {
      ok: false,
      code: "reserved",
      message: "That subdomain is reserved by Reservezy.",
    };
  }

  return { ok: true, value };
}
