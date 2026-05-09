export type ReservezyRole = "SUPER_ADMIN" | "BUSINESS_OWNER" | "STAFF";

export function isReservezyRole(value: string): value is ReservezyRole {
  return (
    value === "SUPER_ADMIN" ||
    value === "BUSINESS_OWNER" ||
    value === "STAFF"
  );
}
