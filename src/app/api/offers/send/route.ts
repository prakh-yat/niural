import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { buildAdminUrl } from "@/lib/portal";
import { sendOfferDraft } from "@/lib/server/applications";
import { FLASH_COOKIE_NAMES, setFlashMessage } from "@/lib/server/flash";

function parseBaseSalary(value: FormDataEntryValue | null) {
  const parsed = Number(value ?? "");
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function POST(request: Request) {
  const referer = request.headers.get("referer");

  try {
    const formData = await request.formData();
    const offerId = String(formData.get("offerId") ?? "");

    if (!offerId) {
      throw new Error("offerId is required.");
    }

    const result = await sendOfferDraft({
      offerId,
      overrides: {
        jobTitle: String(formData.get("jobTitle") ?? "").trim() || undefined,
        startDate: String(formData.get("startDate") ?? "").trim() || undefined,
        baseSalary: parseBaseSalary(formData.get("baseSalary")),
        bonus: String(formData.get("bonus") ?? "").trim() || undefined,
        equity: String(formData.get("equity") ?? "").trim() || undefined,
        managerName: String(formData.get("managerName") ?? "").trim() || undefined,
        managerGreeting: String(formData.get("managerGreeting") ?? "").trim() || undefined,
        customTerms: String(formData.get("customTerms") ?? "").trim() || undefined,
      },
    });

    revalidatePath("/niural-admin/offers");
    revalidatePath("/niural-admin");
    revalidatePath("/niural-admin/pipeline");
    revalidatePath(buildAdminUrl(`/offers/${offerId}`));
    revalidatePath("/app/applied-jobs");
    revalidatePath("/app/offers");
    revalidatePath(`/app/offers/${offerId}`);
    revalidatePath(`/candidate/offers/${offerId}`);

    const response = NextResponse.redirect(
      referer ? new URL(referer) : new URL(buildAdminUrl(`/offers/${offerId}`), request.url),
      { status: 303 },
    );
    setFlashMessage(response, FLASH_COOKIE_NAMES.adminOffer, {
      tone: "success",
      message:
        result.deliveryMode === "docusign"
          ? result.warningMessage
            ? `Offer published to the candidate. DocuSign was created, but ${result.warningMessage}`
            : "Offer sent to the candidate and handed off to DocuSign."
          : result.warningMessage
            ? `Offer published to the candidate portal. ${result.warningMessage}`
            : "Offer published to the candidate portal and emailed successfully.",
    });
    return response;
  } catch (error) {
    const response = NextResponse.redirect(
      referer ? new URL(referer) : new URL(buildAdminUrl("/offers"), request.url),
      { status: 303 },
    );
    setFlashMessage(response, FLASH_COOKIE_NAMES.adminOffer, {
      tone: "error",
      message: error instanceof Error ? error.message : "Offer send failed.",
    });
    return response;
  }
}
