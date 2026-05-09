import { NextResponse } from "next/server";

export type FieldErrorPayload = Record<string, string[] | undefined>;

function compactFields(
  fields?: FieldErrorPayload,
): Record<string, string[]> | undefined {
  if (!fields) {
    return undefined;
  }
  const entries = Object.entries(fields).filter(([, msgs]) =>
    Boolean(msgs?.length),
  ) as Array<[string, string[]]>;
  if (!entries.length) {
    return undefined;
  }
  return Object.fromEntries(entries);
}

export function jsonOk<T>(body: T, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

export function jsonError(
  message: string,
  status: number,
  fields?: FieldErrorPayload,
): NextResponse {
  const compact = compactFields(fields);
  return NextResponse.json(
    compact ? { error: message, fields: compact } : { error: message },
    { status },
  );
}
