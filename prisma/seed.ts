import { PrismaClient } from "@prisma/client";

import { INDUSTRY_TEMPLATE_ROWS } from "./industry-templates";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const rows = INDUSTRY_TEMPLATE_ROWS.map((row) => ({
    slug: row.slug,
    displayName: row.displayName,
    description: row.description,
    presetServicesJson: { services: row.services },
  }));

  await prisma.$transaction(
    rows.map((row) =>
      prisma.industryTemplate.upsert({
        where: { slug: row.slug },
        update: {
          displayName: row.displayName,
          description: row.description,
          presetServicesJson: row.presetServicesJson,
        },
        create: row,
      }),
    ),
  );

  console.log(`Seeded ${rows.length} industry templates.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
