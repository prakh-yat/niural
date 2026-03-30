import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const CANDIDATE_EMAIL = "candidate@preview.local";
const CANDIDATE_NAME = "Preview Candidate";
const LINKEDIN_URL = "https://www.linkedin.com/in/preview-candidate";
const PORTFOLIO_URL = "https://github.com/preview-candidate";

type ResetPayload = {
  jobs: Array<{
    id: string;
    slug: string;
    title: string;
  }>;
};

type TestApplicationState = {
  id: string;
  email: string;
  role: string;
  stage: string;
  stageReason: string | null;
  interviews: Array<{
    id: string;
    status: string;
    googleEventId: string | null;
    candidateRsvp: string | null;
    startsAt: string | null;
    endsAt: string | null;
    meetingUrl: string | null;
    offerSets: Array<{
      id: string;
      status: string;
      holdCount: number;
      holds: Array<{
        id: string;
        status: string;
        startsAt: string;
        endsAt: string;
      }>;
    }>;
  }>;
};

function buildResumeUpload() {
  return {
    name: "resume.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(
      "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF",
      "utf8",
    ),
  };
}

async function resetHarness(request: APIRequestContext) {
  const response = await request.post("/api/test/reset");
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as ResetPayload;
}

async function submitApplication(page: Page, jobId: string) {
  await page.goto(`/apply/${jobId}`);
  await page.getByLabel("Full name").fill(CANDIDATE_NAME);
  await page.getByLabel("Email").fill(CANDIDATE_EMAIL);
  await page.getByLabel("LinkedIn URL").fill(LINKEDIN_URL);
  await page.getByLabel("Portfolio / GitHub").fill(PORTFOLIO_URL);
  await page.getByLabel("Resume upload").setInputFiles(buildResumeUpload());
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page.getByText("Application received.")).toBeVisible();
}

async function fetchApplications(
  request: APIRequestContext,
  email = CANDIDATE_EMAIL,
) {
  const response = await request.get(`/api/test/state?email=${encodeURIComponent(email)}`);
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { applications: TestApplicationState[] };
  return payload.applications;
}

async function findInterview(request: APIRequestContext, interviewId: string) {
  const applications = await fetchApplications(request);
  return (
    applications
      .flatMap((application) => application.interviews)
      .find((interview) => interview.id === interviewId) ?? null
  );
}

async function waitForApplication(
  request: APIRequestContext,
  roleTitle: string,
  predicate?: (application: TestApplicationState) => boolean,
) {
  let matched: TestApplicationState | undefined;

  await expect
    .poll(async () => {
      const applications = await fetchApplications(request);
      matched = applications.find((application) => application.role === roleTitle);
      return matched && (!predicate || predicate(matched));
    })
    .toBeTruthy();

  return matched!;
}

async function openInterviewFromAdmin(
  page: Page,
  request: APIRequestContext,
  roleTitle: string,
) {
  const application = await waitForApplication(request, roleTitle);
  await page.goto(`/niural-admin/candidates/${application.id}`);
  return application;
}

async function sendSchedulingInvite(
  page: Page,
  request: APIRequestContext,
  roleTitle: string,
) {
  await openInterviewFromAdmin(page, request, roleTitle);
  await page.getByRole("button", { name: "Send scheduling invite" }).click();

  const application = await waitForApplication(
    request,
    roleTitle,
    (candidate) =>
      candidate.interviews.length > 0 &&
      candidate.interviews[0]!.status === "offered" &&
      candidate.interviews[0]!.offerSets.some((offerSet) => offerSet.status === "open"),
  );

  return application.interviews[0]!;
}

async function waitForInterview(
  request: APIRequestContext,
  interviewId: string,
) {
  let matchedInterview: TestApplicationState["interviews"][number] | undefined;

  await expect
    .poll(async () => {
      matchedInterview = (await findInterview(request, interviewId)) ?? undefined;
      return Boolean(matchedInterview);
    })
    .toBeTruthy();

  return matchedInterview!;
}

async function confirmFirstOfferedSlot(
  page: Page,
  request: APIRequestContext,
  interviewId: string,
) {
  await page.goto(`/app/interviews/${interviewId}`);
  await page.locator('form[action="/api/scheduling/confirm"] button').first().click();

  await expect
    .poll(async () => (await findInterview(request, interviewId))?.status)
    .toBe("scheduled");

  return waitForInterview(request, interviewId);
}

async function requestDifferentTime(
  page: Page,
  interviewId: string,
  notes: string,
) {
  await page.goto(`/app/interviews/${interviewId}`);
  await page.getByLabel("Share alternative availability").fill(notes);
  await page.getByRole("button", { name: /Request new options|Update availability request/ }).click();
}

async function fetchCalendarEvents(request: APIRequestContext) {
  const response = await request.get("/api/test/calendar");
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as {
    events: Array<{
      id: string;
      kind: string;
      startsAt: string;
      endsAt: string;
      candidateRsvp: string | null;
    }>;
  };
}

test.describe.configure({ mode: "serial" });

test.skip(!process.env.DATABASE_URL, "DATABASE_URL is required for database-backed E2E tests.");

test("public apply supports multiple jobs for the same candidate email", async ({
  page,
  request,
}) => {
  const { jobs } = await resetHarness(request);

  await submitApplication(page, jobs[0]!.id);
  await submitApplication(page, jobs[1]!.id);

  await page.goto("/app/applied-jobs");
  await expect(page.getByRole("heading", { name: "Your Applications" })).toBeVisible();
  await expect(page.getByText(jobs[0]!.title)).toBeVisible();
  await expect(page.getByText(jobs[1]!.title)).toBeVisible();

  const applications = await fetchApplications(request);
  expect(applications).toHaveLength(2);
  expect(applications.map((application) => application.role)).toEqual([
    jobs[0]!.title,
    jobs[1]!.title,
  ]);
});

test("recruiter approval directly reschedules the interview and email logs stay visible in admin", async ({
  page,
  request,
}) => {
  const { jobs } = await resetHarness(request);
  await submitApplication(page, jobs[0]!.id);

  const offeredInterview = await sendSchedulingInvite(page, request, jobs[0]!.title);
  const scheduledInterview = await confirmFirstOfferedSlot(page, request, offeredInterview.id);
  const originalStart = scheduledInterview.startsAt;

  await requestDifferentTime(
    page,
    offeredInterview.id,
    "I can do late afternoon only. Please move this if possible.",
  );

  await page.goto(`/niural-admin/candidates/${(await waitForApplication(request, jobs[0]!.title)).id}`);
  await expect(page.getByText("Candidate requested a different time.")).toBeVisible();
  await page.getByRole("button", { name: "Approve and send updated invite" }).click();

  let rescheduledApplication: TestApplicationState | undefined;
  await expect
    .poll(async () => {
      const applications = await fetchApplications(request);
      rescheduledApplication = applications.find(
        (application) => application.role === jobs[0]!.title,
      );
      const interview = rescheduledApplication?.interviews[0];
      return Boolean(
        interview &&
          interview.status === "scheduled" &&
          interview.startsAt &&
          interview.startsAt !== originalStart,
      );
    })
    .toBeTruthy();

  const rescheduledInterview = rescheduledApplication!.interviews[0]!;
  const calendar = await fetchCalendarEvents(request);
  expect(calendar.events.filter((event) => event.kind === "hold")).toHaveLength(0);
  expect(calendar.events.filter((event) => event.kind === "confirmed")).toHaveLength(1);
  expect(calendar.events[0]!.id).toBe(rescheduledInterview.googleEventId);

  await page.goto("/niural-admin/settings");
  await expect(page.getByText("Candidate and recruiter email activity")).toBeVisible();
  await expect(page.getByText("interview.scheduling_invite")).toBeVisible();
  await expect(page.getByText("interview.reschedule_review_request")).toBeVisible();
  await expect(page.getByText("interview.reschedule_confirmed")).toBeVisible();
});

test("recruiter decline uses the AI yes-no loop and Google RSVP sync updates the interview", async ({
  page,
  request,
}) => {
  const { jobs } = await resetHarness(request);
  await submitApplication(page, jobs[0]!.id);

  const offeredInterview = await sendSchedulingInvite(page, request, jobs[0]!.title);
  await confirmFirstOfferedSlot(page, request, offeredInterview.id);
  await requestDifferentTime(
    page,
    offeredInterview.id,
    "Anything next week after lunch would be better for me.",
  );

  const application = await waitForApplication(request, jobs[0]!.title);
  await page.goto(`/niural-admin/candidates/${application.id}`);
  await page.getByRole("button", { name: "Find next best option" }).click();

  await page.goto(`/app/interviews/${offeredInterview.id}`);
  await expect(page.getByText("Interviewer declined the previous request")).toBeVisible();
  const firstSuggestion = await page
    .locator("div.rounded-2xl.border.border-amber-200.bg-amber-50 p.text-sm.font-semibold")
    .textContent();
  await page.getByRole("button", { name: "No, show another option" }).click();
  await expect(page.getByText("A new held interview option is ready for you to review.")).toBeVisible();
  const nextSuggestion = await page
    .locator("div.rounded-2xl.border.border-amber-200.bg-amber-50 p.text-sm.font-semibold")
    .textContent();
  expect(nextSuggestion).not.toBe(firstSuggestion);

  await page.getByRole("button", { name: "Yes, this time works" }).click();

  let updatedApplication: TestApplicationState | undefined;
  await expect
    .poll(async () => {
      const applications = await fetchApplications(request);
      updatedApplication = applications.find((entry) => entry.role === jobs[0]!.title);
      return updatedApplication?.interviews[0]?.status === "scheduled";
    })
    .toBeTruthy();

  const updatedInterview = updatedApplication!.interviews[0]!;
  expect(updatedInterview.googleEventId).toBeTruthy();

  await request.post("/api/test/calendar", {
    data: {
      action: "rsvp",
      eventId: updatedInterview.googleEventId,
      responseStatus: "accepted",
    },
  });
  const cronResponse = await request.get("/api/cron/process?secret=e2e-cron-secret");
  expect(cronResponse.ok()).toBeTruthy();

  await expect
    .poll(async () => {
      const applications = await fetchApplications(request);
      const current = applications.find((entry) => entry.role === jobs[0]!.title);
      return current?.interviews[0]?.candidateRsvp;
    })
    .toBe("accepted");
});

test("deleted calendar events are reconciled back into interview pending state", async ({
  page,
  request,
}) => {
  const { jobs } = await resetHarness(request);
  await submitApplication(page, jobs[0]!.id);

  const offeredInterview = await sendSchedulingInvite(page, request, jobs[0]!.title);
  const scheduledInterview = await confirmFirstOfferedSlot(page, request, offeredInterview.id);

  await request.post("/api/test/calendar", {
    data: {
      action: "delete",
      eventId: scheduledInterview.googleEventId,
    },
  });
  const cronResponse = await request.get("/api/cron/process?secret=e2e-cron-secret");
  expect(cronResponse.ok()).toBeTruthy();

  await expect
    .poll(async () => {
      const applications = await fetchApplications(request);
      const current = applications.find((entry) => entry.role === jobs[0]!.title);
      return {
        stage: current?.stage,
        interviewStatus: current?.interviews[0]?.status,
        googleEventId: current?.interviews[0]?.googleEventId,
      };
    })
    .toEqual({
      stage: "interview_pending",
      interviewStatus: "queued",
      googleEventId: null,
    });
});
