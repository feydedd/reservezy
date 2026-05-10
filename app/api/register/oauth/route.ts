import { getServerSession } from "next-auth";
import { z } from "zod";

import { SubscriptionStatus, SubscriptionTier } from "@prisma/client";

import { authOptions } from "@/lib/auth/options";
import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { normalizeSubdomainCandidate } from "@/lib/subdomain/normalize-subdomain";
import type { PresetServiceSeed } from "../../../../prisma/industry-templates";

type PresetPayload = { services: PresetServiceSeed[] };

function isPresetPayload(value: unknown): value is PresetPayload {
  return Boolean(value && typeof value === "object" && Array.isArray((value as { services?: unknown }).services));
}

const WEEKDAY_MON_FRI = [1, 2, 3, 4, 5] as const;

const scratchLike = ["", "scratch", "none"];

const oauthRegisterSchema = z.object({
  businessName: z.string().trim().min(2).max(120),
  subdomain: z.string().trim().min(3).max(63),
  industrySlug: z
    .union([z.string().max(64), z.literal(null)])
    .optional()
    .transform((value) => {
      const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
      if (!raw || scratchLike.includes(raw)) return undefined;
      return raw;
    }),
});

export async function POST(request: Request): Promise<Response> {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "BUSINESS_OWNER") {
    return jsonError("Unauthorised.", 401);
  }

  const ownerId = session.user.ownerId;
  if (!ownerId) {
    return jsonError("No owner account found. Please sign up again.", 400);
  }

  // Reject if a business already exists for this owner
  const existing = await prisma.business.findUnique({
    where: { ownerId },
    select: { id: true },
  });
  if (existing) {
    return jsonError("A business is already registered for this account.", 409);
  }

  let parsedJson: unknown;
  try {
    parsedJson = await request.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  const parsed = oauthRegisterSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return jsonError("Validation failed.", 422, parsed.error.flatten().fieldErrors);
  }

  const { businessName, subdomain: rawSubdomain, industrySlug } = parsed.data;

  const subdomainState = normalizeSubdomainCandidate(rawSubdomain);
  if (!subdomainState.ok) {
    return jsonError(subdomainState.message, 422, { subdomain: [subdomainState.message] });
  }
  const subdomain = subdomainState.value;

  let templateId: string | undefined;
  let seedServices: PresetServiceSeed[] | null = null;

  if (industrySlug) {
    const template = await prisma.industryTemplate.findUnique({
      where: { slug: industrySlug },
      select: { id: true, presetServicesJson: true },
    });
    if (!template) {
      return jsonError("Unknown industry preset.", 404, {
        industrySlug: ["That industry preset does not exist."],
      });
    }
    if (!isPresetPayload(template.presetServicesJson)) {
      return jsonError("Industry preset data is malformed.", 500);
    }
    templateId = template.id;
    seedServices = template.presetServicesJson.services ?? [];
  }

  const existingDomain = await prisma.business.findUnique({
    where: { subdomain },
    select: { id: true },
  });
  if (existingDomain) {
    return jsonError("That subdomain is already taken.", 409, {
      subdomain: ["That booking address is already taken — please choose another."],
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: businessName,
          subdomain,
          industryTemplateId: templateId ?? null,
          ownerId,
          onboardingComplete: false,
          onboardingStep: 2,
        },
      });

      await tx.branding.create({ data: { businessId: business.id } });

      await tx.subscription.create({
        data: {
          businessId: business.id,
          tier: SubscriptionTier.BASIC,
          status: SubscriptionStatus.INACTIVE,
        },
      });

      await Promise.all(
        WEEKDAY_MON_FRI.map((dayOfWeek) =>
          tx.workingHours.create({
            data: {
              businessId: business.id,
              dayOfWeek,
              openMinutes: 9 * 60,
              closeMinutes: 17 * 60,
            },
          }),
        ),
      );

      if (seedServices && seedServices.length > 0) {
        for (let i = 0; i < seedServices.length; i++) {
          const svc = seedServices[i];
          await tx.service.create({
            data: {
              businessId: business.id,
              name: svc.name,
              description: svc.description ?? "",
              durationMinutes: svc.durationMinutes,
              pricePence: svc.pricePence,
              sortOrder: i,
            },
          });
        }
      } else {
        await tx.service.create({
          data: {
            businessId: business.id,
            name: "Intro consultation",
            description: "Tune this starter service in onboarding step 5.",
            durationMinutes: 30,
            pricePence: 0,
            sortOrder: 0,
          },
        });
      }
    });
  } catch {
    return jsonError("Could not provision your workspace — please try again.", 500);
  }

  const business = await prisma.business.findUnique({
    where: { subdomain },
    select: { id: true },
  });

  return jsonOk({ message: "Business created.", businessId: business?.id, subdomain }, 201);
}
