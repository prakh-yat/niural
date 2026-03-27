import { PrismaClient, UserRole } from "@prisma/client";
import slugify from "slugify";

const prisma = new PrismaClient();

const jobs = [
  {
    title: "AI Product Operator",
    team: "Product Operations",
    location: "New York, NY",
    remoteLabel: "Hybrid",
    experienceLevel: "Senior / Lead",
    overview:
      "Own AI-native internal tooling that compresses operational cycles across recruiting, payroll, and global HR workflows.",
    responsibilities: [
      "Design operator-grade AI workflows that remove repetitive recruiting work.",
      "Ship internal tools that connect LLM reasoning, workflow orchestration, and SaaS integrations.",
      "Instrument every workflow with audit trails, failure handling, and human review states.",
      "Partner with recruiting and people teams to improve throughput and quality.",
    ],
    requirements: [
      "6+ years building productized internal tools or ops platforms.",
      "Strong taste in workflow design and system-level thinking.",
      "Hands-on experience with LLM APIs, prompts, and evaluation loops.",
      "Comfort owning integrations, docs, and rapid prototyping end to end.",
    ],
    differentiators: [
      "Direct ownership of high-leverage internal AI systems.",
      "High-trust environment with fast shipping expectations.",
      "Meaningful product influence across HR and finance operations.",
    ],
    compensationBand: "$170,000 - $215,000",
    displayOrder: 1,
    aiLeverageSummary:
      "Primary role for building AI systems that reduce recruiter and operator workload.",
  },
  {
    title: "Global Payroll Automation Lead",
    team: "Global Payroll",
    location: "Remote (US)",
    remoteLabel: "Remote",
    experienceLevel: "Senior",
    overview:
      "Lead automation across global payroll workflows, exception handling, and operational readiness for international teams.",
    responsibilities: [
      "Map payroll failure points and automate high-volume manual tasks.",
      "Own systems that surface payroll anomalies before deadlines hit.",
      "Translate policy, compliance, and country logic into practical workflows.",
      "Partner with engineering to operationalize AI-assisted payroll reviews.",
    ],
    requirements: [
      "Deep payroll operations background across US and international markets.",
      "Comfort with tooling, spreadsheets, and systems automation.",
      "Strong process design and escalation judgment.",
      "Experience documenting controls and exception paths.",
    ],
    differentiators: [
      "High visibility role bridging HR, payroll, and product.",
      "Opportunity to standardize global payroll at scale.",
      "Strong mix of systems work and operational ownership.",
    ],
    compensationBand: "$145,000 - $185,000",
    displayOrder: 2,
    aiLeverageSummary:
      "Focuses on AI-assisted payroll reviews, anomaly detection, and operations acceleration.",
  },
  {
    title: "Full-Stack Platform Engineer",
    team: "Platform",
    location: "San Francisco, CA",
    remoteLabel: "On-site flexible",
    experienceLevel: "Senior",
    overview:
      "Build the systems, integrations, and internal product surfaces that power Niural's automation stack.",
    responsibilities: [
      "Own full-stack delivery across Next.js, APIs, and data services.",
      "Build resilient integration layers for HR, scheduling, and onboarding tools.",
      "Ship polished internal UX for dense operational workflows.",
      "Raise code quality, observability, and developer velocity.",
    ],
    requirements: [
      "Strong TypeScript and React background with backend ownership.",
      "Comfort with Postgres, queues, and external API design.",
      "Experience building internal tools or operational platforms.",
      "A sharp eye for product quality, not just raw implementation.",
    ],
    differentiators: [
      "Wide surface area and fast feedback loops.",
      "Meaningful ownership across backend and product surfaces.",
      "Close pairing with teams building AI-enabled systems.",
    ],
    compensationBand: "$180,000 - $225,000",
    displayOrder: 3,
    aiLeverageSummary:
      "Supports the platform layer that operationalizes LLMs, workflow jobs, and external integrations.",
  },
];

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

  for (const job of jobs) {
    await prisma.jobOpening.upsert({
      where: { slug: slugify(job.title, { lower: true, strict: true }) },
      update: job,
      create: {
        slug: slugify(job.title, { lower: true, strict: true }),
        ...job,
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

  console.log(`Seeded admin ${admin.email}, hiring ${hiringTeam.email}, and ${openings.length} job openings.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
