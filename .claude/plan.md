# Niural TalentOS - Complete Restructuring Plan

## Summary
Rebuild the UI from scratch, replace subdomain routing with path-based routing, implement Google OAuth, add 12 jobs, remove dummy data, and ensure all flows work end-to-end.

## Phase A: Routing & Auth Restructuring

### A1. Remove subdomain routing
- Delete `src/proxy.ts` (middleware)
- Delete `src/lib/portal.ts` (portal URL helpers)
- Update `next.config.ts` - remove `allowedDevOrigins`
- Create new `src/middleware.ts` for simple path-based auth guards:
  - `/app/*` → requires candidate auth
  - `/niural-admin/*` → requires admin auth
  - Everything else → public

### A2. Restructure page routes
- **Public pages** (no auth):
  - `/` → Homepage (job cards grid, Semesteria-style)
  - `/jobs/[slug]` → Job detail page + apply form at bottom
  - `/auth/sign-in` → Google OAuth sign-in page
  - `/auth/callback` → OAuth callback handler
- **Candidate portal** (`/app/*`, requires auth):
  - `/app` → Candidate dashboard
  - `/app/applied-jobs` → Applied jobs list (sidebar link)
  - `/app/interviews/[id]` → Interview scheduling
  - `/app/offers/[id]` → Offer review
- **Admin portal** (`/niural-admin/*`, requires admin auth):
  - `/niural-admin` → Admin dashboard with candidate table + filters
  - `/niural-admin/candidates/[id]` → Candidate detail
  - `/niural-admin/offers/[id]` → Offer workspace
  - `/niural-admin/settings` → Integration settings

### A3. Implement Google OAuth
- Configure Supabase Google OAuth provider
- Create `/auth/sign-in` with "Sign in with Google" button for both roles
- Create `/auth/callback` route to handle Supabase OAuth callback
- On first Google sign-in: create Profile in DB, determine role based on route context
- Admin sign-in at `/niural-admin/login` → signs in with admin role
- Candidate sign-in at `/auth/sign-in` → signs in with candidate role

### A4. Update auth.ts
- Replace `requestMagicLink()` with `signInWithGoogle()`
- Keep `getViewer()` and `requireViewer()` but remove portal dependency
- Update redirect logic to use path-based routes instead of subdomain URLs

## Phase B: Database & Seed Changes

### B1. Add 9 more job openings to seed (total 12)
Add diverse roles: Product Manager, Data Engineer, DevOps Engineer, UX Designer, Marketing Lead, Customer Success Manager, QA Engineer, Sales Engineer, Frontend Developer

### B2. Remove demo data fallback
- Keep `withDatabaseFallback` for resilience but remove demo-data.ts usage from production flows
- All pages should query real database

### B3. Fix resume upload
- Debug the `ENOENT` error in pdf-parse (the `./test/data/05-versions-space.pdf` path issue)
- Ensure resume buffer is properly passed to extractResumeText
- Add proper error handling for Supabase storage failures

## Phase C: New UI Implementation

### C1. Homepage (Semesteria-style)
- Clean navbar: Logo "Niural" + nav links (Jobs, For Recruiters) + Login button
- Hero: "Let AI Handle Your **Hiring**" with subtitle
- Job cards grid: 3 columns, 4 rows (12 cards)
- Each card: Job title, team/company, location, tags, experience level, type, salary range
- "View More Jobs" + "Apply Now" CTAs

### C2. Job Detail Page (`/jobs/[slug]`)
- Full JD display: title, team, location, remote status, experience, overview
- Responsibilities + Requirements lists
- "Apply for this role" CTA that scrolls to bottom
- Apply form at bottom of page (no auth required):
  - Full name, email, LinkedIn URL, portfolio/GitHub, resume upload
  - On submit: save to DB, trigger AI screening, send confirmation email
  - Show success message

### C3. Candidate Dashboard (`/app`)
- Left sidebar: Dashboard, Applied Jobs, Interviews, Offers
- Main content: Welcome card, application status overview
- Applied Jobs page: List of applied roles with status, AI score, dates

### C4. Admin Dashboard (`/niural-admin`)
- Left sidebar: Dashboard, Applications, Settings
- Filters: by role, by status (Applied/Screened/Shortlisted/In Interview/Offer/Rejected), by date range
- Table view: name, role, submission date, AI score, status, actions
- Sections: Best Fit (shortlisted), All Applied, Not Fit
- Candidate detail page: full profile, screening results, research, interview, offer

### C5. Component Library
- Rewrite shell components for path-based routing
- Keep `StatusPill`, `Panel` components
- New `Navbar`, `Sidebar`, `JobCard` components

## Phase D: Core Flow Fixes

### D1. Application submission fix
- Fix pdf-parse ENOENT error (it tries to read a test file at startup)
- Ensure `readFileBuffer()` properly converts File to Buffer
- Ensure resume text is extracted before AI screening
- Ensure Supabase storage upload works (or gracefully falls back)

### D2. AI screening flow
- Ensure OpenRouter call sends resume text + JD with detailed prompt
- Structured output: fit score, rationale, strengths, gaps, skills, experience, education, employers, achievements
- Auto-shortlist when score >= threshold
- Store results in ScreeningResult table

### D3. Research enrichment
- For shortlisted candidates: trigger Serper web search
- Search for LinkedIn, GitHub, Twitter profiles
- AI synthesizes findings into candidate brief
- Flag discrepancies between resume and online profiles

### D4. Shortlist email notification
- When candidate is shortlisted, send email via Resend
- Include link to candidate portal

### D5. Interview scheduling
- Admin generates slots → Google Calendar freeBusy check
- Create tentative holds on calendar
- Send slot options to candidate via email
- Candidate selects slot → confirm on both calendars, release holds
- Handle reschedule requests
- 48-hour no-reply nudge
- Slot conflict prevention via unique constraint

## Phase E: Integration Verification

### E1. Verify each integration works
- OpenRouter: screening + research calls
- Resend: confirmation + shortlist + scheduling emails
- Google Calendar: OAuth + freeBusy + event creation
- Supabase: auth + storage
- DocuSign: envelope creation (existing)
- Fireflies: transcript webhook (existing)
- Slack: onboarding (existing)

## Execution Order
1. A1-A4 (routing + auth) — foundational
2. B1-B3 (database + seed) — data layer
3. C1-C5 (UI) — frontend
4. D1-D5 (flow fixes) — make everything work
5. E1 (verification) — confirm end-to-end

## Files to Create/Modify
- **Delete:** `src/proxy.ts`, `src/lib/portal.ts`, `src/lib/demo-data.ts`
- **Create:** `src/middleware.ts`, new page components, `src/components/shell/navbar.tsx`, `src/components/shell/sidebar.tsx`, `src/components/ui/job-card.tsx`
- **Modify:** `next.config.ts`, `src/lib/server/auth.ts`, `src/lib/server/data.ts`, `src/lib/server/applications.ts`, `prisma/seed.ts`, `src/app/globals.css`, all page files
