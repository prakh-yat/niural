import { PrismaClient, UserRole } from "@prisma/client";

import { fallbackJobCatalog } from "../src/lib/job-catalog";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.profile.upsert({
    where: { email: "ops-admin@niural-demo.com" },
    update: { role: UserRole.admin, fullName: "Amara Singh" },
    create: {
      email: "ops-admin@niural-demo.com",
      fullName: "Amara Singh",
      role: UserRole.admin,
      title: "People Operations Director",
      managerGreeting: "We already have your onboarding checklist ready to go.",
    },
  });

  const hiringTeam = await prisma.profile.upsert({
    where: { email: "hiring@niural-demo.com" },
    update: { role: UserRole.hiring_team, fullName: "Leo Bennett" },
    create: {
      email: "hiring@niural-demo.com",
      fullName: "Leo Bennett",
      role: UserRole.hiring_team,
      title: "Hiring Lead",
    },
  });

  for (const [index, job] of fallbackJobCatalog.entries()) {
    const payload = {
      title: job.title,
      team: job.team,
      location: job.location,
      remoteLabel: job.remoteLabel,
      experienceLevel: job.experienceLevel,
      overview: job.overview,
      responsibilities: job.responsibilities,
      requirements: job.requirements,
      differentiators: job.differentiators,
      compensationBand: job.compensationBand,
      displayOrder: index + 1,
      aiLeverageSummary: job.aiLeverageSummary || null,
      status: job.status,
      createdAt: new Date(job.postedAt),
    };

    await prisma.jobOpening.upsert({
      where: { slug: job.slug },
      update: payload,
      create: {
        slug: job.slug,
        ...payload,
      },
    });
  }

  const openings = await prisma.jobOpening.findMany({ orderBy: { displayOrder: "asc" } });
  const candidate = await prisma.profile.upsert({
    where: { email: "maya.fernandez@example.com" },
    update: { role: UserRole.candidate, fullName: "Maya Fernandez" },
    create: {
      email: "maya.fernandez@example.com",
      fullName: "Maya Fernandez",
      role: UserRole.candidate,
      location: "Brooklyn, NY",
      title: "Senior Product Operator",
      managerName: "Leo Bennett",
      managerGreeting: "You already know how to create leverage. We hired you to multiply it.",
    },
  });

  const app = await prisma.application.upsert({
    where: {
      email_jobOpeningId: {
        email: candidate.email,
        jobOpeningId: openings[0].id,
      },
    },
    update: {
      stage: "offer_sent",
      fullName: candidate.fullName,
      roleSelectionSnapshot: openings[0].title,
    },
    create: {
      candidateId: candidate.id,
      jobOpeningId: openings[0].id,
      fullName: candidate.fullName,
      email: candidate.email,
      linkedInUrl: "https://linkedin.com/in/mayafernandez",
      portfolioUrl: "https://mayafernandez.dev",
      roleSelectionSnapshot: openings[0].title,
      stage: "offer_sent",
    },
  });

  await prisma.screeningResult.upsert({
    where: { applicationId: app.id },
    update: { fitScore: 91, rationale: "Strong systems thinker with relevant AI workflow delivery." },
    create: {
      applicationId: app.id,
      fitScore: 91,
      rationale: "Strong systems thinker with relevant AI workflow delivery.",
      strengths: [
        "Built AI-assisted internal tools for recruiting and support.",
        "Strong product judgment with operator empathy.",
      ],
      gaps: ["Limited direct payroll domain background."],
      skills: ["Next.js", "Workflow automation", "LLM prompting", "Operations design"],
      yearsExperience: "8.0",
      pastEmployers: ["HyperFlow", "Orbit", "Dashline"],
      achievements: [
        "Reduced recruiting ops turnaround by 52%.",
        "Built review assistants adopted by 4 internal teams.",
      ],
      autoShortlisted: true,
      thresholdUsed: 75,
      sourceModel: "env:OPENROUTER_MODEL_PRIMARY",
    },
  });

  await prisma.researchProfile.upsert({
    where: { applicationId: app.id },
    update: {
      candidateBrief:
        "Maya has a strong pattern of shipping internal tools that collapse recruiting and support workflows. Her public work shows solid product taste, operational rigor, and credible LLM integration experience. GitHub and portfolio both reinforce her resume claims. Payroll domain depth is lighter, but the systems thinking is clearly there.",
    },
    create: {
      applicationId: app.id,
      candidateBrief:
        "Maya has a strong pattern of shipping internal tools that collapse recruiting and support workflows. Her public work shows solid product taste, operational rigor, and credible LLM integration experience. GitHub and portfolio both reinforce her resume claims. Payroll domain depth is lighter, but the systems thinking is clearly there.",
      githubSummary: "Maintains workflow and internal tooling repos with recent commits.",
      linkedInSummary: "Highlights operations platform wins and AI systems ownership.",
      xSummary: "Occasional posts about operator tooling and automation design.",
      discrepancyFlags: [],
      completeness: "complete",
      sources: {
        linkedin: "https://linkedin.com/in/mayafernandez",
        portfolio: "https://mayafernandez.dev",
        github: "https://github.com/mayafernandez",
      },
      sourceModel: "env:OPENROUTER_MODEL_PRIMARY",
    },
  });

  await prisma.offerDraft.createMany({
    data: [
      {
        applicationId: app.id,
        status: "sent",
        jobTitle: openings[0].title,
        startDate: new Date("2026-05-04T09:00:00.000Z"),
        baseSalary: 195000,
        compensationNotes: "10% annual bonus target.",
        bonus: "10% annual bonus",
        equity: "0.08% stock options",
        managerName: "Leo Bennett",
        customTerms: "Candidate relocating within 45 days of start date.",
        markdown: "# Offer Letter\n\nWelcome to Niural.",
        html: "<h1>Offer Letter</h1><p>Welcome to Niural.</p>",
      },
    ],
    skipDuplicates: true,
  });

  console.log(
    `Seeded admin ${admin.email}, hiring ${hiringTeam.email}, and ${openings.length} job openings.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
