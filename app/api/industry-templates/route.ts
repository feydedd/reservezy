import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const rows = await prisma.industryTemplate.findMany({
    select: {
      slug: true,
      displayName: true,
      description: true,
    },
    orderBy: { displayName: "asc" },
  });

  return NextResponse.json({
    scratchModeLabel: "Start from scratch",
    templates: rows,
  });
}
