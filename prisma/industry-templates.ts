/** Seed payloads for IndustryTemplate.presetServicesJson — shape verified in schemas. */

export type PresetServiceSeed = {
  name: string;
  durationMinutes: number;
  pricePence: number;
  description: string;
};

export type IndustrySeedRow = {
  slug: string;
  displayName: string;
  description: string;
  services: PresetServiceSeed[];
};

function p(
  name: string,
  durationMinutes: number,
  pricePence: number,
  description: string,
): PresetServiceSeed {
  return { name, durationMinutes, pricePence, description };
}

/** 15 industry presets from product spec — prices are suggested GBP snapshots. */
export const INDUSTRY_TEMPLATE_ROWS: IndustrySeedRow[] = [
  {
    slug: "hair-salon",
    displayName: "Hair Salon",
    description:
      "Cut, colour & finishing services tuned for salons and blow-dry studios.",
    services: [
      p(
        "Cut & blow dry",
        60,
        4800,
        "Wash, bespoke cut and professional finish.",
      ),
      p("Root colour refresh", 90, 7500, "Demi gloss or tint on regrowth."),
      p("Balayage & tone", 150, 15500, "Hand-painted lightness with toner gloss."),
    ],
  },
  {
    slug: "barbershop",
    displayName: "Barbershop",
    description:
      "Clipper fades, beard detailing and grooming add-ons tailored for barbershops.",
    services: [
      p("Classic cut & style", 30, 2200, "Clipper/scissor blended shape-up."),
      p("Skin fade", 45, 2800, "Low or high fade with neckline detail."),
      p("Hot towel shave", 35, 2000, "Traditional straight razor shave with balm."),
    ],
  },
  {
    slug: "beauty-therapist",
    displayName: "Beauty Therapist",
    description:
      "Facials, brows and lash treatments curated for medi-beauty style studios.",
    services: [
      p("Signature facial", 60, 6500, "Deep cleanse and tailored mask therapy."),
      p("Hybrid brow sculpt", 45, 3500, "Mapping, tidy and hybrid tint."),
      p("Relaxation massage back & neck", 45, 4500, "Deep tissue release."),
    ],
  },
  {
    slug: "nail-salon",
    displayName: "Nail Salon",
    description: "Structured nail art, overlays and removals for busy nail boutiques.",
    services: [
      p("Gel polish manicure", 45, 3200, "Shape, cuticle tidy and glossy gel."),
      p("Structured gel extensions", 90, 4800, "Builder gel length with colour."),
      p("Medical pedicure", 55, 4000, "Callus care and hydrating finish."),
    ],
  },
  {
    slug: "personal-trainer",
    displayName: "Personal Trainer",
    description: "1:1 strength, cardio and bespoke programming blocks.",
    services: [
      p("Starter assessment + session", 60, 4000, "Movement screen and coached plan."),
      p("Buddy strength block", 60, 6000, "Partner session with shared drills."),
      p("Hybrid monthly coaching pack", 60, 8000, "Four sessions bundled at home + gym."),
    ],
  },
  {
    slug: "gym",
    displayName: "Gym",
    description: "Induction tours, coached classes and bespoke programming.",
    services: [
      p("Facility induction", 45, 0, "Equipment tour and SMART goal worksheet."),
      p("Coach-led cardio lab", 45, 1500, "Heart-rate guided intervals."),
      p("Strength workshop", 60, 2000, "Small group squat & hinge fundamentals."),
    ],
  },
  {
    slug: "massage-therapist",
    displayName: "Massage Therapist",
    description: "Deep tissue, sports flush and restorative treatments.",
    services: [
      p("Deep tissue reset", 60, 6200, "Layered compression for desk athletes."),
      p("Sports massage", 45, 5500, "Targeted flushing pre/post competition."),
      p("Relaxation aroma massage", 60, 5900, "Swedish flow with blend selection."),
    ],
  },
  {
    slug: "tattoo-studio",
    displayName: "Tattoo Studio",
    description: "Flash, custom illustrative and blackout sessions paced fairly.",
    services: [
      p("Consultation & stencil", 60, 0, "Sizing, stencil and pigment planning."),
      p("Fine line tattoo", 120, 15500, "Detailed single session piece."),
      p("Japanese sleeve continuation", 360, 35000, "Multi-hour colour block."),
    ],
  },
  {
    slug: "consultant",
    displayName: "Consultant",
    description:
      "Strategy workshops, stakeholder interviews and retrospective sessions.",
    services: [
      p("Diagnostic workshop", 90, 15000, "Pain mapping workshop with RACI."),
      p("Executive coaching", 60, 20000, "Structured leadership coaching."),
      p("Quarterly OKR facilitation", 120, 18000, "Quarterly prioritisation facilitation."),
    ],
  },
  {
    slug: "coach",
    displayName: "Coach",
    description: "Life and performance coaching tiers with journaling prompts.",
    services: [
      p("Vision & values session", 60, 9500, "Articulate north star behaviours."),
      p("Accountability fortnightly", 45, 7000, "Momentum check-ins and assignments."),
      p("Quarterly immersion day", 240, 25000, "Offsite deep-dive with toolkit."),
    ],
  },
  {
    slug: "medical-clinic",
    displayName: "Medical / Clinic",
    description: "GP-style slotting for consults, follow-ups and chronic care reviews.",
    services: [
      p("New patient consult", 20, 6500, "History, vitals and care plan."),
      p("Follow-up review", 15, 4500, "Medication tweaks and pathology review."),
      p("Annual health screening", 40, 12000, "Bloods counselling and lifestyle."),
    ],
  },
  {
    slug: "dentist",
    displayName: "Dentist",
    description:
      "Hygienist visits, composites and orthodontic reviews paced with surgery time.",
    services: [
      p("Dental hygiene visit", 30, 7500, "Scale, polish and perio scoring."),
      p("Exam + small composite", 45, 9800, "Clinical photos and restoration."),
      p("Whitening booster", 60, 19900, "Chairside brighten with custom trays."),
    ],
  },
  {
    slug: "physiotherapist",
    displayName: "Physiotherapist",
    description: "Manual therapy blocks, gait analysis blocks and Pilates rehab tiers.",
    services: [
      p("Assessment & treatment", 45, 7000, "Objective measures and mobilisation."),
      p("Sports rehab block", 60, 8500, "Return-to-play loading protocol."),
      p("Pilates reformer intro", 55, 7200, "Foundation reformer session."),
    ],
  },
  {
    slug: "tutor",
    displayName: "Tutor",
    description: "Academic tutoring across STEM, humanities and admissions coaching.",
    services: [
      p("Exam booster (GCSE)", 60, 4000, "Past paper walkthrough."),
      p("A-level intensive", 90, 6000, "Topic sprint with homework pack."),
      p("Interview coaching", 60, 7000, "Mock panel with feedback."),
    ],
  },
  {
    slug: "photographer",
    displayName: "Photographer",
    description: "Portrait, editorial and branding shoots bundled by deliverables.",
    services: [
      p("Portrait mini session", 45, 15000, "30 edited frames, studio lighting."),
      p("Brand day rate", 480, 120000, "Eight hour creative direction on location."),
      p("Couples engagement", 90, 27500, "Outdoor golden hour storytelling."),
    ],
  },
];
