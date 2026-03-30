import { subHours } from "date-fns";

import type { JobRecord } from "@/lib/domain";

const basePostedAt = new Date("2026-03-27T12:00:00.000Z");

type JobSpec = Omit<JobRecord, "id" | "postedAt" | "status"> & {
  postedHoursAgo: number;
};

function hoursAgo(hours: number) {
  return subHours(basePostedAt, hours).toISOString();
}

function requiredYears(experienceLevel: string) {
  if (experienceLevel.toLowerCase().includes("principal")) return "10+";
  if (experienceLevel.toLowerCase().includes("staff")) return "8+";
  if (experienceLevel.toLowerCase().includes("lead")) return "7+";
  if (experienceLevel.toLowerCase().includes("senior")) return "5+";
  return "3+";
}

function slugifyTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const coreJobs: JobSpec[] = [
  {
    slug: "ai-product-operator",
    postedHoursAgo: 144,
    title: "AI Product Operator",
    team: "Product Operations",
    location: "New York, NY",
    remoteLabel: "Hybrid",
    experienceLevel: "Senior / Lead",
    overview:
      "Lead the design and rollout of AI-native internal systems that shorten execution cycles across recruiting, payroll, and global people operations while keeping control, auditability, and human judgment intact.",
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
    aiLeverageSummary:
      "Primary role for building AI systems that reduce recruiter and operator workload.",
  },
  {
    slug: "global-payroll-automation-lead",
    postedHoursAgo: 168,
    title: "Global Payroll Automation Lead",
    team: "Global Payroll",
    location: "Remote (US)",
    remoteLabel: "Remote",
    experienceLevel: "Senior",
    overview:
      "Own the automation layer behind complex global payroll operations, improving accuracy, visibility, and exception handling across multi-country teams and time-sensitive payroll deadlines.",
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
    aiLeverageSummary:
      "Focuses on AI-assisted payroll reviews, anomaly detection, and operations acceleration.",
  },
  {
    slug: "full-stack-platform-engineer",
    postedHoursAgo: 192,
    title: "Full-Stack Platform Engineer",
    team: "Platform",
    location: "San Francisco, CA",
    remoteLabel: "On-site flexible",
    experienceLevel: "Senior",
    overview:
      "Build the application surfaces, APIs, and integrations that power Niural's internal automation stack, with a strong bias toward reliability, operator experience, and clean product execution.",
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
    aiLeverageSummary:
      "Supports the platform layer that operationalizes LLMs, workflow jobs, and external integrations.",
  },
  {
    slug: "product-manager",
    postedHoursAgo: 216,
    title: "Product Manager",
    team: "Product",
    location: "Remote (US)",
    remoteLabel: "Remote",
    experienceLevel: "Senior",
    overview:
      "Drive strategy and execution for Niural's talent operating system, shaping AI-first workflows that feel practical for recruiters, hiring managers, and operations teams.",
    responsibilities: [
      "Define product vision and roadmap aligned with company OKRs.",
      "Lead cross-functional discovery sessions with engineering, design, and operations.",
      "Own prioritization frameworks and sprint planning for two product squads.",
      "Analyze product metrics and user feedback to drive data-informed decisions.",
    ],
    requirements: [
      "5+ years of product management experience in B2B SaaS or HR-tech.",
      "Strong analytical skills with experience using product analytics tools.",
      "Proven track record of shipping features that move business metrics.",
      "Excellent written and verbal communication skills.",
    ],
    differentiators: [
      "Shape the future of AI-augmented hiring workflows.",
      "High autonomy with direct access to executive stakeholders.",
      "Fast-paced environment with real user impact from day one.",
    ],
    compensationBand: "$160,000 - $200,000",
    aiLeverageSummary:
      "Guides how AI features are prioritized and shaped across the talent management platform.",
  },
  {
    slug: "data-engineer",
    postedHoursAgo: 240,
    title: "Data Engineer",
    team: "Data",
    location: "New York, NY",
    remoteLabel: "Hybrid",
    experienceLevel: "Senior",
    overview:
      "Build the data foundation behind Niural's analytics, AI systems, and operating dashboards, turning messy recruiting and payroll signals into trusted, production-ready datasets.",
    responsibilities: [
      "Design and operate scalable ETL/ELT pipelines for recruiting and payroll data.",
      "Build data models that support analytical queries and ML feature stores.",
      "Ensure data quality, lineage tracking, and compliance with privacy regulations.",
      "Partner with AI and product teams to deliver curated datasets for model training.",
    ],
    requirements: [
      "5+ years building production data pipelines with dbt, Airflow, Dagster, or similar tooling.",
      "Strong SQL and Python skills with experience in cloud data warehouses.",
      "Familiarity with data governance, PII handling, and compliance frameworks.",
      "Experience working alongside ML engineers to deliver training data.",
    ],
    differentiators: [
      "Greenfield data infrastructure with modern tooling choices.",
      "Direct impact on AI model quality through data curation.",
      "Collaborative team that values engineering excellence.",
    ],
    compensationBand: "$165,000 - $210,000",
    aiLeverageSummary:
      "Provides the foundational data layer that powers AI screening, research, and analytics features.",
  },
  {
    slug: "devops-engineer",
    postedHoursAgo: 264,
    title: "DevOps Engineer",
    team: "Infrastructure",
    location: "Remote (US)",
    remoteLabel: "Remote",
    experienceLevel: "Mid-Senior",
    overview:
      "Own the infrastructure, deployment systems, and operational reliability of the Niural platform, making it easy to ship quickly without compromising resilience, security, or cost discipline.",
    responsibilities: [
      "Design and maintain CI/CD pipelines for rapid, reliable deployments.",
      "Manage cloud infrastructure using IaC tools like Terraform or Pulumi.",
      "Implement monitoring, alerting, and incident response procedures.",
      "Optimize cost and performance across cloud services and databases.",
    ],
    requirements: [
      "4+ years of DevOps or SRE experience with AWS, GCP, or Azure.",
      "Strong experience with containerization, Kubernetes, and orchestration.",
      "Proficiency with infrastructure-as-code and configuration management.",
      "Solid understanding of networking, security, and compliance requirements.",
    ],
    differentiators: [
      "Ownership of the full deployment lifecycle from staging to production.",
      "Opportunity to build observability from the ground up.",
      "Work directly with engineering leads to shape platform reliability.",
    ],
    compensationBand: "$150,000 - $195,000",
    aiLeverageSummary:
      "Ensures reliable infrastructure for AI workloads, model inference, and real-time integrations.",
  },
  {
    slug: "ux-designer",
    postedHoursAgo: 288,
    title: "UX Designer",
    team: "Design",
    location: "San Francisco, CA",
    remoteLabel: "On-site flexible",
    experienceLevel: "Mid",
    overview:
      "Design calm, high-signal product experiences for recruiters, candidates, and operators, especially across information-dense workflows where clarity and speed matter more than decorative UI.",
    responsibilities: [
      "Own end-to-end design for critical product surfaces including dashboards, workflow builders, and review experiences.",
      "Run user interviews, workflow walkthroughs, and usability tests with internal and external users.",
      "Translate product ambiguity into interface structure, component behavior, and crisp interaction patterns.",
      "Partner closely with engineering to ensure implementation quality matches the intended experience.",
    ],
    requirements: [
      "3+ years of product design experience with a portfolio showing strong systems thinking.",
      "Comfort designing enterprise, B2B, or workflow-heavy applications in Figma.",
      "Strong visual hierarchy, interaction design, and accessibility fundamentals.",
      "Ability to defend design decisions with user reasoning, not just taste.",
    ],
    differentiators: [
      "Design AI-heavy experiences where trust and readability matter as much as speed.",
      "Direct influence on the product language and design quality bar.",
      "Tight collaboration with product and engineering on high-impact surfaces.",
    ],
    compensationBand: "$130,000 - $170,000",
    aiLeverageSummary:
      "Designs the interfaces that present AI recommendations, workflow state, and decision support clearly to users.",
  },
  {
    slug: "marketing-lead",
    postedHoursAgo: 312,
    title: "Marketing Lead",
    team: "Growth",
    location: "Remote (US)",
    remoteLabel: "Remote",
    experienceLevel: "Senior",
    overview:
      "Lead the go-to-market narrative for Niural and build demand programs that turn strong product proof into durable pipeline across HR, payroll, and operations buyers.",
    responsibilities: [
      "Own integrated campaigns across content, lifecycle, partnerships, and demand generation.",
      "Develop positioning and messaging that explains Niural's AI-native workflows in clear business terms.",
      "Build content systems including customer proof, launch narratives, and operator education assets.",
      "Measure channel performance rigorously and refine spend, messaging, and creative based on pipeline impact.",
    ],
    requirements: [
      "5+ years in B2B SaaS marketing with ownership of pipeline-driving programs.",
      "Strong writing and messaging instincts, especially for technical or workflow-heavy products.",
      "Comfort working across paid, owned, and partner channels with performance accountability.",
      "Analytical rigor and the ability to connect campaign work to revenue outcomes.",
    ],
    differentiators: [
      "First-principles marketing role with meaningful ownership over brand and pipeline.",
      "Room to shape how the market understands AI-enabled recruiting and operations.",
      "Close access to product signal, customer stories, and executive stakeholders.",
    ],
    compensationBand: "$140,000 - $180,000",
    aiLeverageSummary:
      "Translates Niural's AI capabilities into clear, credible market positioning and scalable demand generation.",
  },
  {
    slug: "customer-success-manager",
    postedHoursAgo: 336,
    title: "Customer Success Manager",
    team: "Customer",
    location: "Austin, TX",
    remoteLabel: "Hybrid",
    experienceLevel: "Mid",
    overview:
      "Own the post-sale customer relationship and help customers operationalize Niural quickly, with strong onboarding, steady adoption, and proactive risk management.",
    responsibilities: [
      "Lead onboarding plans, rollout checkpoints, and early adoption milestones for new customers.",
      "Monitor customer health signals and intervene before risk becomes churn.",
      "Run business reviews that connect product usage to measurable outcomes for the customer.",
      "Feed recurring customer pain points back to product, support, and implementation teams.",
    ],
    requirements: [
      "3+ years in customer success, account management, or post-sale delivery for B2B SaaS.",
      "Strong communication and relationship management skills with operational credibility.",
      "Comfort interpreting usage data, renewal risk, and adoption signals.",
      "Ability to manage multiple accounts without losing precision or responsiveness.",
    ],
    differentiators: [
      "High-trust role with direct input into customer experience and retention strategy.",
      "Customers using a modern AI-first workflow product with real operational depth.",
      "Strong cross-functional influence across product, support, and implementation.",
    ],
    compensationBand: "$110,000 - $150,000",
    aiLeverageSummary:
      "Helps customers adopt and expand AI-assisted workflows while feeding usage insight back into the platform.",
  },
  {
    slug: "qa-engineer",
    postedHoursAgo: 360,
    title: "QA Engineer",
    team: "Platform",
    location: "Remote (US)",
    remoteLabel: "Remote",
    experienceLevel: "Mid",
    overview:
      "Build the quality systems that keep Niural reliable across UI, API, workflow, and AI-assisted product surfaces, with a strong focus on catching regressions before users do.",
    responsibilities: [
      "Design and maintain automated test coverage for critical recruiting, scheduling, and offer workflows.",
      "Create robust API and integration tests around external services and edge cases.",
      "Run targeted exploratory testing for new features, workflow changes, and AI-generated output paths.",
      "Define release-quality signals and partner with engineering to improve confidence over time.",
    ],
    requirements: [
      "3+ years in QA or quality engineering with modern automation tooling.",
      "Hands-on experience with end-to-end testing frameworks such as Playwright or Cypress.",
      "Comfort validating APIs, asynchronous workflows, and third-party integrations.",
      "Strong bug-reporting instincts with clear reproduction detail and prioritization judgment.",
    ],
    differentiators: [
      "Broad ownership across product, platform, and AI-assisted workflows.",
      "Opportunity to shape the quality bar early instead of inheriting a rigid process.",
      "Engineering culture that treats quality as part of delivery, not an afterthought.",
    ],
    compensationBand: "$120,000 - $160,000",
    aiLeverageSummary:
      "Protects the reliability of AI-influenced workflows by validating outputs, edge cases, and integrations end to end.",
  },
  {
    slug: "sales-engineer",
    postedHoursAgo: 384,
    title: "Sales Engineer",
    team: "Revenue",
    location: "New York, NY",
    remoteLabel: "Hybrid",
    experienceLevel: "Senior",
    overview:
      "Partner with revenue leadership to run technical discovery, prove product fit, and translate Niural's workflow and AI capabilities into confident enterprise buying decisions.",
    responsibilities: [
      "Lead technical discovery, architecture conversations, and product demonstrations for strategic prospects.",
      "Design proof-of-concept plans that validate integrations, workflows, and expected operating outcomes.",
      "Create technical collateral including solution diagrams, integration notes, and security-oriented responses.",
      "Feed recurring market objections and implementation patterns back to product and engineering.",
    ],
    requirements: [
      "5+ years in sales engineering, solutions consulting, or technical pre-sales for B2B SaaS.",
      "Ability to explain APIs, integrations, data flow, and workflow design clearly to mixed audiences.",
      "Strong presentation skills with executive presence and technical depth.",
      "Comfort navigating complex enterprise buying cycles and implementation concerns.",
    ],
    differentiators: [
      "Sell a workflow-heavy product with meaningful technical depth and a clear AI story.",
      "High-leverage role shaping both deals and future product priorities.",
      "Tight loop between go-to-market, customer signal, and engineering reality.",
    ],
    compensationBand: "$155,000 - $200,000",
    aiLeverageSummary:
      "Converts Niural's AI and workflow capabilities into concrete business value during enterprise sales cycles.",
  },
  {
    slug: "frontend-developer",
    postedHoursAgo: 408,
    title: "Frontend Developer",
    team: "Platform",
    location: "San Francisco, CA",
    remoteLabel: "On-site flexible",
    experienceLevel: "Mid-Senior",
    overview:
      "Build polished, fast, and readable frontend experiences for Niural's recruiting and onboarding products, especially where dense workflow state and AI-generated content need careful presentation.",
    responsibilities: [
      "Implement responsive, accessible product surfaces across candidate, recruiter, and admin experiences.",
      "Improve frontend performance, rendering behavior, and UX quality across data-heavy screens.",
      "Contribute reusable components and interaction patterns to the shared design system.",
      "Collaborate with design and backend engineering to ship cohesive product experiences end to end.",
    ],
    requirements: [
      "4+ years of frontend development experience with React and TypeScript.",
      "Strong familiarity with Next.js, server-rendered patterns, and modern state management tradeoffs.",
      "Deep understanding of CSS, accessibility, and information hierarchy.",
      "Product judgment that goes beyond implementing tickets pixel for pixel.",
    ],
    differentiators: [
      "Work on interfaces where workflow clarity materially changes user throughput.",
      "Modern stack with strong expectations around craft and maintainability.",
      "Close collaboration with product and design on fast-moving internal and external surfaces.",
    ],
    compensationBand: "$160,000 - $200,000",
    aiLeverageSummary:
      "Builds the frontend surfaces that turn AI outputs and workflow state into understandable, actionable product experiences.",
  },
];

const generatedRoleSpecs = [
  ["Revenue Operations Manager", "Revenue Operations", "Remote (US)", "Remote", "Senior", "$145,000 - $185,000", "Own forecasting, pipeline hygiene, and automation across the full revenue engine."],
  ["GTM Systems Engineer", "Revenue Systems", "New York, NY", "Hybrid", "Senior", "$165,000 - $205,000", "Build the systems that connect CRM, support, billing, and onboarding workflows."],
  ["Talent Intelligence Analyst", "People Analytics", "Remote (US)", "Remote", "Mid-Senior", "$110,000 - $145,000", "Translate hiring, funnel, and productivity data into sharper recruiting decisions."],
  ["HRIS Implementation Lead", "People Systems", "Austin, TX", "Hybrid", "Senior", "$140,000 - $180,000", "Lead enterprise HRIS rollouts and operationalize cleaner people data."],
  ["Technical Recruiter", "Talent", "San Francisco, CA", "On-site flexible", "Mid-Senior", "$130,000 - $165,000", "Run high-signal technical hiring loops for engineering and AI teams."],
  ["Employer Brand Manager", "Growth", "Remote (US)", "Remote", "Mid", "$115,000 - $150,000", "Turn customer proof and product quality into a hiring brand that compounds."],
  ["Compliance Operations Manager", "Compliance", "New York, NY", "Hybrid", "Senior", "$135,000 - $170,000", "Own repeatable controls for global hiring, payroll, and worker classification."],
  ["AI Solutions Architect", "Solutions", "Remote (US)", "Remote", "Senior / Lead", "$185,000 - $230,000", "Design enterprise implementations that blend integrations, workflows, and AI copilots."],
  ["Workforce Planning Analyst", "Finance", "Remote (US)", "Remote", "Mid", "$105,000 - $135,000", "Model headcount scenarios and capacity plans with tighter operating rigor."],
  ["Partnerships Manager", "Partnerships", "Chicago, IL", "Hybrid", "Senior", "$125,000 - $165,000", "Grow channel partnerships across HR, payroll, and systems integrator ecosystems."],
  ["Finance Automation Manager", "Finance Systems", "Remote (US)", "Remote", "Senior", "$150,000 - $190,000", "Eliminate manual finance ops work through workflows, controls, and AI summaries."],
  ["Security Engineer", "Security", "Remote (US)", "Remote", "Senior", "$170,000 - $215,000", "Harden the platform across identity, infrastructure, and data access boundaries."],
  ["Site Reliability Engineer", "Infrastructure", "Remote (US)", "Remote", "Senior", "$165,000 - $205,000", "Raise availability, observability, and incident response quality across the platform."],
  ["Machine Learning Engineer", "AI", "San Francisco, CA", "On-site flexible", "Senior", "$190,000 - $240,000", "Operationalize ranking, extraction, and reasoning workflows in production."],
  ["Applied AI Engineer", "AI", "Remote (US)", "Remote", "Senior", "$185,000 - $235,000", "Ship product-facing AI features with evals, fallbacks, and measurable impact."],
  ["Data Analyst", "Data", "Remote (US)", "Remote", "Mid", "$100,000 - $130,000", "Build trusted reporting on recruiting, payroll, and operational health."],
  ["Analytics Engineer", "Data", "New York, NY", "Hybrid", "Senior", "$140,000 - $180,000", "Model clean, decision-ready datasets that power product and GTM reporting."],
  ["Integration Engineer", "Platform", "Remote (US)", "Remote", "Senior", "$155,000 - $195,000", "Build and maintain external integrations across payroll, HRIS, CRM, and scheduling systems."],
  ["Product Designer", "Design", "Remote (US)", "Remote", "Senior", "$145,000 - $180,000", "Design AI-heavy workflow surfaces that still feel calm and legible under load."],
  ["Technical Writer", "Product", "Remote (US)", "Remote", "Mid", "$95,000 - $125,000", "Create implementation docs, internal playbooks, and API guidance that reduce support load."],
  ["Customer Education Lead", "Customer", "Remote (US)", "Remote", "Senior", "$120,000 - $150,000", "Turn onboarding and enablement into scalable self-serve systems."],
  ["Sales Enablement Manager", "Revenue", "Remote (US)", "Remote", "Senior", "$120,000 - $155,000", "Equip the sales team with sharper messaging, demos, and competitive proof."],
  ["Enterprise Account Executive", "Revenue", "New York, NY", "Hybrid", "Senior", "$160,000 - $220,000", "Own complex enterprise cycles with HR, payroll, and operations buyers."],
  ["Partnerships Solutions Engineer", "Partnerships", "Remote (US)", "Remote", "Senior", "$150,000 - $190,000", "Support technical validation for channel and strategic partnerships."],
  ["People Analytics Manager", "People Analytics", "Remote (US)", "Remote", "Senior", "$135,000 - $170,000", "Lead a small analytics function focused on workforce planning and funnel quality."],
  ["Onboarding Experience Lead", "Customer", "Austin, TX", "Hybrid", "Mid-Senior", "$115,000 - $145,000", "Design an onboarding motion that feels productized, not services-heavy."],
  ["Implementation Consultant", "Solutions", "Remote (US)", "Remote", "Mid-Senior", "$120,000 - $155,000", "Guide customers through configuration, rollout, and change management."],
  ["Legal Operations Manager", "Legal", "Remote (US)", "Remote", "Senior", "$135,000 - $175,000", "Streamline legal review and signature workflows for commercial and hiring documents."],
  ["Benefits Operations Manager", "People Operations", "Remote (US)", "Remote", "Senior", "$120,000 - $155,000", "Own benefits operations, escalations, and systems quality across markets."],
  ["Support Operations Lead", "Support", "Remote (US)", "Remote", "Senior", "$115,000 - $150,000", "Improve queue design, macros, and operational reporting for customer support."],
  ["Enterprise Support Engineer", "Support", "Chicago, IL", "Hybrid", "Mid-Senior", "$110,000 - $145,000", "Handle high-complexity technical support issues for enterprise customers."],
  ["Business Systems Analyst", "Business Systems", "Remote (US)", "Remote", "Mid", "$105,000 - $135,000", "Map internal pain points and translate them into system improvements."],
  ["Program Manager", "Operations", "Remote (US)", "Remote", "Senior", "$130,000 - $165,000", "Drive cross-functional execution for strategic initiatives with clear owners and cadences."],
  ["Revenue Strategy Lead", "Revenue Operations", "New York, NY", "Hybrid", "Senior / Lead", "$170,000 - $215,000", "Own planning, segmentation, and operating rhythm across the revenue org."],
  ["Content Marketing Manager", "Growth", "Remote (US)", "Remote", "Mid-Senior", "$110,000 - $145,000", "Create content that wins trust with HR, finance, and operations leaders."],
  ["SEO Growth Manager", "Growth", "Remote (US)", "Remote", "Mid-Senior", "$105,000 - $140,000", "Build a search strategy that compounds around hiring, payroll, and people systems intent."],
  ["Field Marketing Manager", "Growth", "Remote (US)", "Remote", "Mid-Senior", "$115,000 - $145,000", "Run events, partner activations, and executive roundtables that generate pipeline."],
  ["Community Manager", "Growth", "Remote (US)", "Remote", "Mid", "$90,000 - $120,000", "Build an operator community around practical AI adoption in people workflows."],
  ["GTM Analyst", "Revenue Operations", "Remote (US)", "Remote", "Mid", "$95,000 - $125,000", "Build reliable performance dashboards and diagnose pipeline movement."],
  ["Backend Engineer", "Platform", "Remote (US)", "Remote", "Senior", "$170,000 - $210,000", "Own APIs, queues, and data workflows that support recruiting and onboarding products."],
  ["Mobile Engineer", "Platform", "Remote (US)", "Remote", "Senior", "$160,000 - $200,000", "Ship a focused candidate and hiring-manager experience for mobile surfaces."],
  ["Staff Frontend Engineer", "Platform", "San Francisco, CA", "On-site flexible", "Staff", "$205,000 - $255,000", "Lead architecture and quality for complex, data-dense frontend surfaces."],
  ["Principal Product Manager", "Product", "Remote (US)", "Remote", "Principal", "$210,000 - $260,000", "Set product direction across the platform, not just a single feature area."],
  ["Research Operations Lead", "AI", "Remote (US)", "Remote", "Senior", "$130,000 - $165,000", "Build the eval, prompt, and data operations that keep AI systems reliable."],
  ["Candidate Experience Manager", "Talent", "Remote (US)", "Remote", "Mid-Senior", "$105,000 - $135,000", "Own the communication quality, handoffs, and responsiveness candidates feel."],
  ["Interview Coordination Manager", "Talent Operations", "Remote (US)", "Remote", "Mid", "$95,000 - $125,000", "Run scheduling operations with tight SLAs and better tooling."],
  ["Employer Partnerships Lead", "Partnerships", "Remote (US)", "Remote", "Senior", "$125,000 - $160,000", "Grow the employer network and structured talent partnerships around the platform."],
  ["Solutions Consultant", "Solutions", "Remote (US)", "Remote", "Mid-Senior", "$120,000 - $155,000", "Bridge product, implementation, and customer stakeholders during rollout."],
  ["Recruiting Operations Manager", "Talent Operations", "New York, NY", "Hybrid", "Senior", "$125,000 - $160,000", "Own funnel instrumentation, recruiter workflows, and process quality."],
  ["Workforce Automation Specialist", "Operations", "Remote (US)", "Remote", "Mid-Senior", "$115,000 - $145,000", "Turn repetitive operational work into reliable automations with human review built in."],
] as const;

function createGeneratedJob(
  spec: (typeof generatedRoleSpecs)[number],
  displayOrder: number,
  postedHoursAgo: number,
): JobRecord {
  const [title, team, location, remoteLabel, experienceLevel, compensationBand, leverageSummary] = spec;

  return {
    id: `fallback-${slugifyTitle(title)}`,
    slug: slugifyTitle(title),
    postedAt: hoursAgo(postedHoursAgo),
    title,
    team,
    location,
    remoteLabel,
    experienceLevel,
    overview:
      `Join Niural's ${team} team as ${title} and build the systems, operating rhythms, and cross-functional execution that keep complex hiring, payroll, and people workflows moving with speed and clarity.`,
    responsibilities: [
      `Own the highest-leverage workstreams for ${title.toLowerCase()}, from planning and execution through rollout and iteration.`,
      "Turn ambiguous operational or customer pain into clear systems, automations, and decision-making workflows.",
      "Partner with product, engineering, and business stakeholders to improve quality, speed, and reliability at the same time.",
      "Create documentation, metrics, and review loops that help the function scale without adding unnecessary process.",
    ],
    requirements: [
      `${requiredYears(experienceLevel)} years in ${team.toLowerCase()}, operations, systems, or a closely related function with clear ownership of outcomes.`,
      "Strong written communication, structured thinking, and the ability to turn ambiguity into simple execution plans.",
      "Comfort using modern SaaS tools, analytics, and automation systems to drive measurable improvement.",
      "Track record of improving speed, quality, or reliability in high-stakes workflows.",
    ],
    differentiators: [
      "High-ownership role with real influence on how Niural scales this function.",
      "AI-native environment where strong operators are expected to multiply impact through automation.",
      "Fast feedback loops with teams willing to iterate quickly on both process and product.",
    ],
    aiLeverageSummary: leverageSummary,
    compensationBand,
    status: "open",
  };
}

export const fallbackJobCatalog: JobRecord[] = [
  ...coreJobs.map((job) => ({
    id: `fallback-${job.slug}`,
    slug: job.slug,
    postedAt: hoursAgo(job.postedHoursAgo),
    title: job.title,
    team: job.team,
    location: job.location,
    remoteLabel: job.remoteLabel,
    experienceLevel: job.experienceLevel,
    overview: job.overview,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    differentiators: job.differentiators,
    aiLeverageSummary: job.aiLeverageSummary,
    compensationBand: job.compensationBand,
    status: "open" as const,
  })),
  ...generatedRoleSpecs.map((spec, index) =>
    createGeneratedJob(spec, coreJobs.length + index + 1, (index + 1) * 10),
  ),
];
