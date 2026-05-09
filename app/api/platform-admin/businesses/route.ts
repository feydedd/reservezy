import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { getReservezySession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  const session = await getReservezySession();
  if (session?.user?.role !== "SUPER_ADMIN") return jsonError("Forbidden.", 403);

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const perPage = 20;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { subdomain: { contains: q, mode: "insensitive" as const } },
          { owner: { email: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {};

  const [total, businesses] = await Promise.all([
    prisma.business.count({ where }),
    prisma.business.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        subdomain: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        isDisabled: true,
        onboardingComplete: true,
        createdAt: true,
        owner: { select: { email: true, fullName: true } },
      },
    }),
  ]);

  return jsonOk({ businesses, total, page, perPage });
}
