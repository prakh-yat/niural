import slugify from "slugify";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { JOB_STATUSES, type JobStatusKey } from "@/lib/domain";
import { buildAdminUrl } from "@/lib/portal";
import { prisma } from "@/lib/prisma";
import { getViewer } from "@/lib/server/auth";
import { FLASH_COOKIE_NAMES, setFlashMessage } from "@/lib/server/flash";

function getTextValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function parseLineItems(value: FormDataEntryValue | null, fieldLabel: string) {
  const items = getTextValue(value)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (items.length === 0) {
    throw new Error(`${fieldLabel} must include at least one line item.`);
  }

  return items;
}

function parseJobStatus(value: FormDataEntryValue | null): JobStatusKey {
  const status = getTextValue(value).toLowerCase();
  if (!JOB_STATUSES.includes(status as JobStatusKey)) {
    throw new Error("Invalid job status.");
  }

  return status as JobStatusKey;
}

async function buildUniqueJobSlug(title: string) {
  const baseSlug = slugify(title, { lower: true, strict: true });
  if (!baseSlug) {
    throw new Error("A valid job title is required.");
  }

  let slug = baseSlug;
  let suffix = 2;

  while (await prisma.jobOpening.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

function revalidateJobPaths(job: { id: string; slug: string }) {
  revalidatePath(buildAdminUrl("/jobs"));
  revalidatePath(buildAdminUrl("/"));
  revalidatePath("/careers");
  revalidatePath(`/jobs/${job.slug}`);
  revalidatePath(`/apply/${job.id}`);
}

export async function POST(request: Request) {
  const viewer = await getViewer("admin");
  const referer = request.headers.get("referer");

  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const intent = getTextValue(formData.get("intent"));

    if (intent === "create") {
      const title = getTextValue(formData.get("title"));
      const team = getTextValue(formData.get("team"));
      const location = getTextValue(formData.get("location"));
      const remoteLabel = getTextValue(formData.get("remoteLabel"));
      const experienceLevel = getTextValue(formData.get("experienceLevel"));
      const overview = getTextValue(formData.get("overview"));
      const compensationBand = getTextValue(formData.get("compensationBand"));
      const aiLeverageSummary = getTextValue(formData.get("aiLeverageSummary"));
      const status = parseJobStatus(formData.get("status"));

      if (
        !title ||
        !team ||
        !location ||
        !remoteLabel ||
        !experienceLevel ||
        !overview ||
        !compensationBand
      ) {
        throw new Error("All core job fields are required.");
      }

      const slug = await buildUniqueJobSlug(title);
      const responsibilities = parseLineItems(formData.get("responsibilities"), "Responsibilities");
      const requirements = parseLineItems(formData.get("requirements"), "Requirements");
      const differentiators = parseLineItems(formData.get("differentiators"), "Differentiators");
      const displayOrderResult = await prisma.jobOpening.aggregate({
        _max: { displayOrder: true },
      });

      const job = await prisma.jobOpening.create({
        data: {
          slug,
          title,
          team,
          location,
          remoteLabel,
          experienceLevel,
          overview,
          responsibilities,
          requirements,
          differentiators,
          compensationBand,
          status,
          aiLeverageSummary: aiLeverageSummary || null,
          displayOrder: (displayOrderResult._max.displayOrder ?? 0) + 1,
        },
      });

      revalidateJobPaths(job);

      const response = NextResponse.redirect(
        referer ? new URL(referer) : new URL(buildAdminUrl("/jobs"), request.url),
        { status: 303 },
      );
      setFlashMessage(response, FLASH_COOKIE_NAMES.adminJobs, {
        tone: "success",
        message: `${job.title} created and ready for review.`,
      });
      return response;
    }

    if (intent === "update-status") {
      const jobId = getTextValue(formData.get("jobId"));
      const status = parseJobStatus(formData.get("status"));

      if (!jobId) {
        throw new Error("Job id is required.");
      }

      const job = await prisma.jobOpening.update({
        where: { id: jobId },
        data: { status },
        select: {
          id: true,
          slug: true,
          title: true,
        },
      });

      revalidateJobPaths(job);

      const response = NextResponse.redirect(
        referer ? new URL(referer) : new URL(buildAdminUrl("/jobs"), request.url),
        { status: 303 },
      );
      setFlashMessage(response, FLASH_COOKIE_NAMES.adminJobs, {
        tone: "success",
        message: `${job.title} is now ${status}.`,
      });
      return response;
    }

    throw new Error("Unsupported job action.");
  } catch (error) {
    const response = NextResponse.redirect(
      referer ? new URL(referer) : new URL(buildAdminUrl("/jobs"), request.url),
      { status: 303 },
    );
    setFlashMessage(response, FLASH_COOKIE_NAMES.adminJobs, {
      tone: "error",
      message: error instanceof Error ? error.message : "Job update failed.",
    });
    return response;
  }
}
