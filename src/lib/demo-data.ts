import { addDays, addHours } from "date-fns";

import type { CandidateRecord, JobRecord } from "@/lib/domain";

const now = new Date("2026-03-27T09:00:00.000Z");

export const demoJobs: JobRecord[] = [
  {
    id: "job-ai-product-operator",
    slug: "ai-product-operator",
    postedAt: addDays(now, -1).toISOString(),
    title: "AI Product Operator",
    team: "Product Operations",
    location: "New York, NY",
    remoteLabel: "Hybrid",
    experienceLevel: "Senior / Lead",
    overview:
      "Design and ship AI-powered internal systems that remove operational drag across hiring, payroll, and people workflows.",
    responsibilities: [
      "Own operator-facing AI products end to end.",
      "Translate messy workflows into resilient systems.",
      "Use LLMs where judgment compression actually matters.",
      "Create safeguards, escalation paths, and auditability.",
    ],
    requirements: [
      "6+ years in internal tools, operations platforms, or AI-enabled workflows.",
      "Strong product and systems judgment.",
      "Hands-on with modern TypeScript stacks and LLM APIs.",
      "Comfort moving from strategy to implementation fast.",
    ],
    differentiators: [
      "Direct ownership of high-leverage operational tooling.",
      "Fast decision-making with real production impact.",
      "Visible cross-functional role spanning HR and finance ops.",
    ],
    aiLeverageSummary:
      "AI handles resume parsing, research synthesis, scheduling suggestions, offer drafting, and onboarding personalization.",
    compensationBand: "$170k - $215k",
    status: "open",
  },
  {
    id: "job-payroll-automation-lead",
    slug: "global-payroll-automation-lead",
    postedAt: addDays(now, -3).toISOString(),
    title: "Global Payroll Automation Lead",
    team: "Global Payroll",
    location: "Remote (US)",
    remoteLabel: "Remote",
    experienceLevel: "Senior",
    overview:
      "Lead automation across payroll exception handling, workflow quality, and global operational readiness.",
    responsibilities: [
      "Systematize payroll operations into repeatable workflows.",
      "Build exception handling playbooks with clear controls.",
      "Partner with product and engineering on automation.",
      "Surface anomalies before payroll deadlines slip.",
    ],
    requirements: [
      "Strong payroll operations background.",
      "Process design and systems mindset.",
      "Ability to collaborate across technical and non-technical teams.",
      "Strong written communication and documentation skills.",
    ],
    differentiators: [
      "Meaningful automation ownership in a high-context domain.",
      "Cross-functional role spanning people, finance, and product.",
      "Visible operational impact across regions.",
    ],
    aiLeverageSummary:
      "AI supports anomaly detection, exception summaries, and country-specific workflow acceleration.",
    compensationBand: "$145k - $185k",
    status: "open",
  },
  {
    id: "job-platform-engineer",
    slug: "full-stack-platform-engineer",
    postedAt: addDays(now, -6).toISOString(),
    title: "Full-Stack Platform Engineer",
    team: "Platform",
    location: "San Francisco, CA",
    remoteLabel: "On-site flexible",
    experienceLevel: "Senior",
    overview:
      "Build the internal and external systems that power automation-heavy products at Niural.",
    responsibilities: [
      "Own full-stack product delivery across web, APIs, and data.",
      "Build resilient integration and workflow layers.",
      "Improve developer velocity and operational observability.",
      "Ship polished internal UX for dense workflows.",
    ],
    requirements: [
      "Strong TypeScript and backend experience.",
      "Comfort with queues, Postgres, and SaaS integrations.",
      "Taste for product quality and operational clarity.",
      "Experience shipping internal systems or workflow tools.",
    ],
    differentiators: [
      "High ownership with wide product surface area.",
      "Close contact with real operators and workflows.",
      "Blend of platform depth and product impact.",
    ],
    aiLeverageSummary:
      "AI powers orchestration, summarization, workflow assistance, and operator-facing guidance.",
    compensationBand: "$180k - $225k",
    status: "open",
  },
];

export const demoCandidates: CandidateRecord[] = [
  {
    id: "cand-maya",
    fullName: "Maya Fernandez",
    email: "maya.fernandez@example.com",
    linkedInUrl: "https://linkedin.com/in/mayafernandez",
    portfolioUrl: "https://mayafernandez.dev",
    jobTitle: "AI Product Operator",
    stage: "offer_sent",
    score: 91,
    submittedAt: addDays(now, -9).toISOString(),
    location: "Brooklyn, NY",
    profile: {
      headline: "Senior Product Operator",
      preferredLocation: "Remote or New York",
      skills: ["AI workflows", "recruiting ops", "Notion", "systems design"],
      desiredSalaryMin: 175000,
      desiredSalaryMax: 215000,
    },
    fitSummary:
      "Maya consistently ships internal AI tooling that compresses recruiting and support workflows. Her background maps tightly to the operator scope of this role.",
    strengths: [
      "Operator-native product judgment.",
      "Strong AI workflow implementation history.",
      "Clear evidence of cross-functional systems ownership.",
    ],
    gaps: ["Payroll domain depth is lighter than her workflow depth."],
    research: {
      brief:
        "Maya has credible public evidence of building internal workflow products. LinkedIn, GitHub, and her portfolio all reinforce the same story: she ships quickly, documents clearly, and knows where AI adds leverage. No substantive discrepancies surfaced.",
      githubSummary:
        "Maintains ops tooling repos with recent commits around workflow automation and structured review assistants.",
      linkedInSummary:
        "Highlights ownership of internal platforms that cut review and scheduling time for revenue and support teams.",
      xSummary:
        "Occasional posts about operator tooling, hiring systems, and balancing automation with human oversight.",
      discrepancies: [],
      completeness: "complete",
      sources: [
        { label: "LinkedIn", href: "https://linkedin.com/in/mayafernandez" },
        { label: "Portfolio", href: "https://mayafernandez.dev" },
        { label: "GitHub", href: "https://github.com/mayafernandez" },
      ],
    },
    interview: {
      id: "int-maya",
      interviewerName: "Leo Bennett",
      interviewerEmail: "leo.bennett@niural-demo.com",
      status: "completed",
      offeredSlots: [
        {
          label: "Tue, Apr 2 · 10:00 AM ET",
          startsAt: addDays(addHours(now, 1), 4).toISOString(),
          endsAt: addDays(addHours(now, 1.75), 4).toISOString(),
          status: "released",
        },
        {
          label: "Wed, Apr 3 · 2:00 PM ET",
          startsAt: addDays(addHours(now, 6), 5).toISOString(),
          endsAt: addDays(addHours(now, 6.75), 5).toISOString(),
          status: "confirmed",
        },
      ],
      confirmedAt: addDays(addHours(now, 6), 5).toISOString(),
      meetingUrl: "https://meet.google.com/niural-demo",
      transcriptSummary:
        "Maya emphasized operator empathy, stateful workflow design, and the need for explicit failure modes around AI automation.",
      transcriptExcerpt:
        "I care less about adding AI to every step and more about removing the waiting, handoffs, and copy-paste work that breaks trust in the process.",
    },
    offer: {
      id: "offer-maya",
      status: "sent",
      startDate: addDays(now, 38).toISOString(),
      baseSalary: 195000,
      bonus: "10% annual bonus",
      equity: "0.08% stock options",
      managerName: "Leo Bennett",
      managerGreeting:
        "You already know how to build leverage. We want you to raise the floor for every team here.",
      customTerms: "Candidate relocating within 45 days of start date.",
    },
  },
  {
    id: "cand-evelyn",
    fullName: "Evelyn Carter",
    email: "evelyn.carter@example.com",
    linkedInUrl: "https://linkedin.com/in/evelyncarter",
    jobTitle: "Global Payroll Automation Lead",
    stage: "interview_scheduled",
    score: 84,
    submittedAt: addDays(now, -4).toISOString(),
    location: "Austin, TX",
    profile: {
      headline: "Global Payroll Automation Lead",
      preferredLocation: "Remote",
      skills: ["payroll systems", "controls", "documentation"],
      desiredSalaryMin: 145000,
      desiredSalaryMax: 185000,
    },
    fitSummary:
      "Evelyn has strong payroll and controls experience, with enough systems fluency to work well in an automation-heavy role.",
    strengths: ["Deep payroll domain expertise.", "Strong cross-border operations background."],
    gaps: ["Less public evidence of AI-specific implementation work."],
    research: {
      brief:
        "Evelyn appears highly credible on payroll operations and global scaling. Her public profiles emphasize compliance, controls, and documentation rather than heavy product building. Research is partially complete because public engineering artifacts are limited.",
      githubSummary: "No notable public GitHub activity surfaced.",
      linkedInSummary:
        "Strong payroll operations history across multi-country environments with control ownership.",
      xSummary: "No material X presence surfaced.",
      discrepancies: ["Portfolio link not provided."],
      completeness: "partial",
      sources: [{ label: "LinkedIn", href: "https://linkedin.com/in/evelyncarter" }],
    },
    interview: {
      id: "int-evelyn",
      interviewerName: "Leo Bennett",
      interviewerEmail: "leo.bennett@niural-demo.com",
      status: "scheduled",
      offeredSlots: [
        {
          label: "Mon, Apr 1 · 11:30 AM ET",
          startsAt: addDays(addHours(now, 2.5), 3).toISOString(),
          endsAt: addDays(addHours(now, 3.25), 3).toISOString(),
          status: "held",
        },
        {
          label: "Tue, Apr 2 · 4:00 PM ET",
          startsAt: addDays(addHours(now, 7), 4).toISOString(),
          endsAt: addDays(addHours(now, 7.75), 4).toISOString(),
          status: "confirmed",
        },
      ],
      confirmedAt: addDays(addHours(now, 7), 4).toISOString(),
      meetingUrl: "https://meet.google.com/pay-demo",
    },
  },
  {
    id: "cand-omar",
    fullName: "Omar Khan",
    email: "omar.khan@example.com",
    portfolioUrl: "https://omarkhan.dev",
    jobTitle: "Full-Stack Platform Engineer",
    stage: "screened",
    score: 72,
    submittedAt: addDays(now, -2).toISOString(),
    location: "Chicago, IL",
    profile: {
      headline: "Platform Engineer",
      preferredLocation: "Chicago or remote",
      skills: ["TypeScript", "platform engineering", "Postgres"],
      desiredSalaryMin: 165000,
      desiredSalaryMax: 210000,
    },
    fitSummary:
      "Omar is strong on engineering fundamentals, but the brief is thinner on internal tools and workflow-heavy product surfaces.",
    strengths: ["Strong backend depth.", "Good platform instincts."],
    gaps: ["Less evidence of operator-facing systems.", "No public LinkedIn submitted."],
    research: {
      brief:
        "Omar's public portfolio suggests solid engineering craft, but the operator-tooling signal is weaker. Research is partial because only the portfolio link was available.",
      githubSummary: "Portfolio references several full-stack projects with clean systems thinking.",
      linkedInSummary: "Not available.",
      xSummary: "Not available.",
      discrepancies: ["LinkedIn URL missing from application."],
      completeness: "partial",
      sources: [{ label: "Portfolio", href: "https://omarkhan.dev" }],
    },
    interview: {
      id: "int-omar",
      interviewerName: "Leo Bennett",
      interviewerEmail: "leo.bennett@niural-demo.com",
      status: "queued",
      offeredSlots: [],
    },
  },
];

export const statusTimeline = [
  { stage: "Applied", detail: "Application captured with resume upload and role snapshot." },
  { stage: "Screened", detail: "AI parsed the resume and produced a fit score with rationale." },
  { stage: "Shortlisted", detail: "Candidate moved forward when score beat the configured threshold." },
  { stage: "Interview", detail: "Scheduling created held slots and a confirmed Google Calendar event." },
  { stage: "Offer", detail: "Offer drafted, reviewed, and routed to DocuSign." },
  { stage: "Onboarded", detail: "Slack invite and welcome messaging close the loop." },
];
