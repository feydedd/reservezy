import crypto from "crypto";

import bcrypt from "bcryptjs";

import { SubscriptionStatus, SubscriptionTier } from "@prisma/client";

import { jsonError, jsonOk } from "@/lib/http/api-response";
import { prisma } from "@/lib/prisma";
import { normalizeSubdomainCandidate } from "@/lib/subdomain/normalize-subdomain";
import type { PresetServiceSeed } from "../../../prisma/industry-templates";
import { registerBusinessSchema } from "@/schemas/register-business";
import { getResend } from "@/lib/email/resend";

const FROM = process.env.RESEND_FROM_EMAIL ?? "Reservezy <noreply@reservezy.com>";

type PresetPayload = {
  services: PresetServiceSeed[];
};

function isPresetPayload(value: unknown): value is PresetPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  const maybe = value as { services?: unknown };
  return Array.isArray(maybe.services);
}

const WEEKDAY_MON_FRI = [1, 2, 3, 4, 5] as const;

export async function POST(request: Request): Promise<Response> {
  let parsedJson: unknown;
  try {
    parsedJson = await request.json();
  } catch {
    return jsonError("Invalid JSON.", 400);
  }

  const parsed = registerBusinessSchema.safeParse(parsedJson);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return jsonError("Validation failed.", 422, fieldErrors);
  }

  const payload = parsed.data;
  const subdomainState = normalizeSubdomainCandidate(payload.subdomain);
  if (!subdomainState.ok) {
    return jsonError(subdomainState.message, 422, {
      subdomain: [subdomainState.message],
    });
  }

  const subdomain = subdomainState.value;
  let templateId: string | undefined;
  let seedServices: PresetServiceSeed[] | null = null;

  if (payload.industrySlug) {
    const template = await prisma.industryTemplate.findUnique({
      where: { slug: payload.industrySlug },
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

  const existingEmail = await prisma.owner.findUnique({
    where: { email: payload.ownerEmail },
    select: { id: true },
  });
  if (existingEmail) {
    return jsonError("An owner already exists with this email.", 409);
  }

  const existingDomain = await prisma.business.findUnique({
    where: { subdomain },
    select: { id: true },
  });

  if (existingDomain) {
    return jsonError("That subdomain is already taken.", 409);
  }

  const passwordHash = await bcrypt.hash(payload.ownerPassword, 12);
  const verificationToken = crypto.randomBytes(32).toString("hex");

  const initialTier = SubscriptionTier.BASIC;

  try {
    await prisma.$transaction(async (tx) => {
      const owner = await tx.owner.create({
        data: {
          email: payload.ownerEmail,
          fullName: payload.ownerFullName,
          passwordHash,
          emailVerificationToken: verificationToken,
          emailVerificationSentAt: new Date(),
        },
      });

      const business = await tx.business.create({
        data: {
          name: payload.businessName,
          subdomain,
          industryTemplateId: templateId ?? null,
          ownerId: owner.id,
          onboardingComplete: false,
          onboardingStep: 2,
        },
      });

      await tx.branding.create({
        data: { businessId: business.id },
      });

      await tx.subscription.create({
        data: {
          businessId: business.id,
          tier: initialTier,
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
        for (let index = 0; index < seedServices.length; index += 1) {
          const svc = seedServices[index];
          await tx.service.create({
            data: {
              businessId: business.id,
              name: svc.name,
              description: svc.description ?? "",
              durationMinutes: svc.durationMinutes,
              pricePence: svc.pricePence,
              sortOrder: index,
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
    return jsonError("Could not provision your workspace — try again.", 500);
  }

  const businessRecord = await prisma.business.findUnique({
    where: { subdomain },
    select: { id: true },
  });

  // Send verification email (fire-and-forget)
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const verifyUrl = `${base}/verify-email?token=${verificationToken}`;
  const resend = getResend();
  if (resend) {
    resend.emails.send({
      from: FROM,
      to: [payload.ownerEmail],
      subject: "Verify your Reservezy email",
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#09091a;color:#eef0f8;border-radius:16px">
        <h2 style="font-size:22px;font-weight:700;color:#fff;margin:0 0 8px">Verify your email</h2>
        <p style="color:#9aa3c2;margin:0 0 24px">Hi ${payload.ownerFullName}, just click the button below to confirm your email address and activate your Reservezy account.</p>
        <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#8b86f9,#6d66f0);color:#fff;font-weight:600;padding:14px 28px;border-radius:999px;text-decoration:none">
          Verify email →
        </a>
        <p style="margin:24px 0 0;font-size:12px;color:#6b7499">If you didn&apos;t create a Reservezy account, you can ignore this email.</p>
      </div>`,
    }).catch(() => null);
  }

  return jsonOk(
    {
      message: "Account created. Check your email to verify your address.",
      businessId: businessRecord?.id,
      subdomain,
    },
    201,
  );
}
