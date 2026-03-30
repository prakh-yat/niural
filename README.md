# Niural TalentOS

AI-powered candidate onboarding system covering the full hiring pipeline: job listings, AI screening, interview scheduling, offer generation, e-signature, and Slack onboarding.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Database | PostgreSQL via Prisma ORM on Supabase |
| Auth | Supabase magic links (passwordless) |
| AI | OpenRouter (Claude/GPT) for screening, research, offer drafting, welcome messages |
| Email | Resend for transactional email |
| Calendar | Google Calendar API (OAuth, freeBusy, event creation) |
| E-Signature | DocuSign JWT flow for remote signing |
| Transcripts | Fireflies.ai webhook + GraphQL ingestion |
| Onboarding | Slack API (workspace invite, welcome DM, HR notification) |
| Search | Serper API for candidate web research (optional) |

## Architecture

### Multi-Portal Routing

The app uses subdomain-based routing via `src/proxy.ts` middleware:

- **Public** (`localhost:3000`): Landing page, careers, job details, application form
- **Admin** (`admin.localhost:3000`): Hiring dashboard, candidate detail, offer workspace, settings
- **Candidate** (`candidate.localhost:3000`): Application status, interview scheduling, offer review

Internal filesystem routes live under `/admin/*` and `/candidate/*`, but the proxy rewrites them behind subdomain hosts so each portal has clean URLs.

### State Machine

Applications progress through 11 stages with explicit transitions:

```
Applied -> Screened -> Shortlisted -> Interview Pending -> Interview Scheduled
-> Interview Completed -> Offer Drafting -> Offer Sent -> Offer Signed -> Onboarded
```

Each transition is recorded in `statusHistory` for audit. Rejections can happen at any stage.

### Graceful Degradation

Every integration has a preview fallback when credentials are missing:
- No database -> in-memory demo data
- No OpenRouter -> mock screening results
- No Google Calendar -> mock slot generation
- No DocuSign -> mock envelope flow
- No Slack -> mock invite confirmation
- No Fireflies -> mock transcript

This means the full product can be demoed without any external credentials configured.

## Delivered Phases

### Phase 1: Career Portal & Job Listings
- 3 job openings with full JDs (title, team, location, experience, responsibilities, requirements)
- Application form: name, email, LinkedIn, portfolio/GitHub, role selection, resume upload (PDF/DOCX)
- Confirmation email with candidate portal link
- Duplicate `email + role` protection via unique constraint

### Phase 2: Resume Intake, AI Screening & Research
- **Resume parsing**: PDF and DOCX text extraction
- **AI screening**: Fit score (0-100), rationale, strengths, gaps, skills, experience, employers, achievements
- **Auto-shortlist**: Configurable threshold (default 50)
- **Research enrichment**: LinkedIn, GitHub, portfolio, X/public web analysis via Serper + AI synthesis
- **Admin dashboard**: Table view with filters, candidate detail, re-run screening/research actions

### Phase 3: Calendar Orchestration & Scheduling
- Google OAuth consent flow for calendar access
- FreeBusy availability lookup for 45-minute slots across next 5 business days
- Tentative hold creation with unique `(calendarId, startAt)` constraint to prevent double-booking
- Candidate slot selection and confirmation flow
- Reschedule request capture with notes
- Cron endpoint for hold expiry and RSVP sync

### Phase 4: Interview & AI Notetaker
- **Integration choice: Fireflies.ai** - selected because it offers both a REST API and webhook-based transcript delivery, making it the most integration-friendly option
- Webhook endpoint receives transcript + summary after interview
- GraphQL fallback for pulling transcripts by meeting ID
- Transcript stored against candidate record and visible in admin + candidate views
- Mock transcript generated when Fireflies credentials unavailable

### Phase 5: Offer Letter Generation & E-Signature
- Hiring manager wizard: job title, start date, salary, bonus, equity, manager, custom terms
- AI generates offer letter (HTML + Markdown)
- **E-signature: DocuSign API (Option A)** - JWT auth flow (no user passwords needed), remote signing envelope creation, webhook callback on signature completion
- Signed offer triggers stage transition to `offer_signed`

### Phase 6: Slack Onboarding
- On offer signature: Slack workspace invite sent to candidate
- `team_join` event webhook handler detects when candidate joins
- AI-generated personalized welcome DM (name, role, start date, manager greeting, onboarding links)
- HR channel notification confirming candidate has been onboarded
- Stage transition to `onboarded`

## Edge Cases Handled

1. **Duplicate applications**: Unique `(email, jobOpeningId)` constraint blocks repeated submissions with a clear error message.
2. **Closed/paused roles**: Job status checked at submission time, not just page load. Applications rejected if role closed between page view and submit.
3. **Slot conflict prevention**: Tentative holds created on all offered slots before candidate responds. Unique `(calendarId, startAt)` DB constraint prevents any double-booking. Only the confirmed slot keeps its hold; others are released.
4. **No-reply candidate**: Cron endpoint expires unheld slots after 48 hours and sends automated follow-up nudge.
5. **Missing integrations**: Every external service has a graceful preview fallback. The system never crashes due to missing credentials.

## Assumptions & Trade-offs

1. **App-layer auth instead of Supabase RLS**: Prisma + serverless session propagation with RLS would significantly slow development. Authorization is handled at the application layer with role checks per page.
2. **DocuSign remote signing instead of embedded signing**: Remote signing keeps the flow webhook-driven and simpler. The candidate receives an email from DocuSign to sign, rather than signing in-app.
3. **Synchronous screening on submit**: For the prototype, AI screening and research run inline during application submission. In production, these would be async background jobs with progress notifications.

## AI Tools Used

- **Claude Code (Anthropic)**: Primary development assistant for architecture design, code generation, and debugging
- **OpenRouter API**: Runtime AI for resume screening, candidate research synthesis, offer letter drafting, and Slack welcome message generation
- **Cursor**: Used for rapid prototyping and code iteration

## Local Setup

```bash
npm install
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

Access the portals:
- Public: `http://localhost:3000`
- Admin: `http://admin.localhost:3000`
- Candidate: `http://candidate.localhost:3000`

## Environment Variables

Required in `.env`:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL`, `DIRECT_URL` | Supabase Postgres connection |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase client auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin operations (storage, magic links) |
| `OPENROUTER_API_KEY` | AI screening and research |
| `RESEND_API_KEY` | Transactional email |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Calendar OAuth |
| `DOCUSIGN_ACCOUNT_ID`, `DOCUSIGN_USER_ID`, `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_PRIVATE_KEY` | E-signature |
| `FIREFLIES_API_KEY` | Interview transcripts |
| `SLACK_BOT_TOKEN`, `SLACK_ADMIN_USER_TOKEN`, `SLACK_SIGNING_SECRET` | Onboarding |

Optional: `SERPER_API_KEY` (web search), `CRON_SECRET` (cron auth), `AUTO_SHORTLIST_THRESHOLD` (default: 50)

## Deployment

- Set `NEXT_PUBLIC_APP_URL` to your apex domain
- Point `admin.yourdomain.com` and `candidate.yourdomain.com` to the same deployment
- Update `GOOGLE_REDIRECT_URI` to match your deployed callback URL
- Create a private Supabase storage bucket matching `SUPABASE_STORAGE_BUCKET`
- Configure webhook URLs for DocuSign, Fireflies, and Slack to point to `/api/webhooks/*`
