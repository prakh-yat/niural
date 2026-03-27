# Niural TalentOS

Niural TalentOS is a full-stack take-home prototype for an AI-powered candidate onboarding system. It covers the candidate journey from careers page to Slack onboarding, using a table-first operational UX rather than a generic dashboard layout.

## Stack

- Next.js App Router + TypeScript
- Prisma over Supabase Postgres
- Supabase Auth + Storage
- OpenRouter for screening, research synthesis, offer drafting, and Slack welcome copy
- Resend for transactional email
- Google Calendar for real availability and event creation
- DocuSign JWT flow for remote signing
- Fireflies transcript ingestion
- Slack Enterprise Grid onboarding hooks
- Vercel Cron for hold expiry and RSVP sync

## Routes

- Public: `/`, `/careers`, `/careers/[slug]`, `/apply/[jobId]`
- Candidate: `/auth/sign-in`, `/candidate`, `/candidate/interviews/[id]`, `/candidate/offers/[id]`
- Internal: `/admin`, `/admin/candidates/[id]`, `/admin/offers/[id]`
- Integrations: `/settings/integrations/google`
- APIs: application submit, screening, research, scheduling, Google OAuth, DocuSign webhook/send, Fireflies webhook, Slack events, cron worker

## Environment

Copy `.env.example` to `.env.local` and fill in:

- Supabase: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- OpenRouter: `OPENROUTER_API_KEY`, model ids
- Email: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Search: optional `SERPER_API_KEY`
- Google: OAuth client id/secret, redirect URI, calendar id
- DocuSign: account id, user id, integration key, private key, base URLs
- Fireflies: API key and optional webhook signing secret
- Slack: bot token, admin token, signing secret, HR channel id
- Cron: `CRON_SECRET`

## Local setup

1. `npm install`
2. `npm run db:generate`
3. Configure `.env.local`
4. Push the Prisma schema when Supabase is ready: `npm run db:push`
5. Seed demo data: `npm run db:seed`
6. Run the app: `npm run dev`

## Architecture notes

- Prisma owns the application schema. Supabase handles auth identities and storage.
- Auth is passwordless. Candidate and internal users both use magic links. RBAC roles are `candidate`, `hiring_team`, and `admin`.
- Database-backed flows run when env vars exist. Without them, the UI still works in preview mode using seeded in-memory data and mock integration responses.
- Screening and research run synchronously on application submit for the prototype, while workflow and integration events are still recorded in dedicated tables for operational traceability.
- Scheduling uses persisted slot holds plus unique `(calendarId, startAt)` constraints to prevent conflicts.

## Delivered phases

### 1. Careers and applications

- Three drafted Niural-aligned openings with full JD sections
- Structured apply form with PDF/DOCX validation
- Duplicate `email + role` protection
- Confirmation email + candidate portal link

### 2. Screening and enrichment

- Resume parsing for PDF and DOCX
- AI fit score, rationale, strengths, gaps, skills, employers, achievements
- Auto-shortlist threshold via env
- Research synthesis from submitted links, extracted URLs, and optional Serper results
- Admin table and candidate detail view with refresh actions

### 3. Scheduling

- Google OAuth connect flow
- Availability lookup using Google Calendar `freeBusy`
- Tentative hold creation and confirm flow
- Candidate slot confirmation and structured reschedule request
- Cron endpoint for hold expiry and RSVP sync

### 4. Interview transcript

- Fireflies webhook + GraphQL transcript ingestion route
- Transcript + summary storage on interview records
- Mock fallback path through the same contract when the real API is unavailable

### 5. Offer generation and signature

- Offer workspace with editable manager inputs
- HTML offer generation
- DocuSign remote signing send path
- Webhook path to mark offers signed and advance the application state

### 6. Slack onboarding

- Slack invite send path for Enterprise Grid
- Slack `team_join` event handler
- AI-generated welcome DM
- HR confirmation message and stage transition to `onboarded`

## Top edge cases handled

1. Duplicate applications for the same role are blocked server-side with a unique Prisma constraint and a user-facing error.
2. Paused or closed roles are rejected at submission time even if the public page loaded while the role was open.
3. Slot conflicts are prevented with tentative holds plus a unique calendar/start constraint before confirmation.
4. Missing integration credentials do not crash the prototype; every provider has a preview fallback so the full product can still be demoed.
5. Research completeness is surfaced explicitly when public-web coverage is partial or search credentials are missing.

## Trade-offs

1. The prototype uses app-layer authorization rather than Supabase RLS because Prisma + serverless session propagation would slow down delivery significantly for this assignment.
2. Offer sending uses DocuSign remote signing rather than embedded signing to keep the signature flow cleaner and webhook-driven.
3. Google RSVP sync is represented through the cron worker structure, but full attendee response polling is intentionally light until real calendar credentials are added.

## Deployment notes

- `vercel.json` schedules `/api/cron/process` hourly.
- For Google OAuth on Vercel, update `GOOGLE_REDIRECT_URI` to `https://<your-domain>/api/auth/google/callback`.
- For Supabase storage, create a private bucket matching `SUPABASE_STORAGE_BUCKET`.
- For Fireflies, Slack, and DocuSign webhooks, point the provider callback URLs to the deployed `/api/webhooks/*` routes.

## Suggested Loom flow

1. Public landing page and careers portal
2. Apply flow with validation
3. Admin queue and candidate detail
4. Scheduling and candidate portal
5. Offer workspace and DocuSign handoff
6. Google / Slack integration settings and fallback behavior
