import Image from "next/image";
import { cookies } from "next/headers";

import { FlashBanner } from "@/components/ui/flash-banner";
import { Panel } from "@/components/ui/panel";
import { FLASH_COOKIE_NAMES } from "@/lib/server/flash";
import { getViewer } from "@/lib/server/auth";
import { getCandidateProfileSettings } from "@/lib/server/candidate-profile";

export default async function CandidateSettingsPage() {
  const viewer = await getViewer("candidate");
  const cookieStore = await cookies();
  const flashValue = cookieStore.get(FLASH_COOKIE_NAMES.candidateProfile)?.value;
  const flash = flashValue
    ? (() => {
        try {
          return JSON.parse(decodeURIComponent(flashValue)) as {
            tone: "success" | "error";
            message: string;
          };
        } catch {
          return null;
        }
      })()
    : null;
  const profile = await getCandidateProfileSettings(
    viewer?.email ?? "candidate@preview.local",
    viewer?.fullName ?? "Candidate",
  );

  const initials = profile.fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Candidate workspace
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">Account settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your matching preferences and profile details for the hiring workspace.
        </p>
      </div>

      {flash ? <FlashBanner cookieName={FLASH_COOKIE_NAMES.candidateProfile} flash={flash} /> : null}

      <Panel className="rounded-xl p-6">
        <form action="/api/candidate/profile" method="post" encType="multipart/form-data" className="space-y-6">
          <input type="hidden" name="next" value="/app/settings" />

          <div className="flex flex-col gap-5 border-b border-gray-100 pb-6 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              {profile.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={`${profile.fullName} avatar`}
                  width={80}
                  height={80}
                  unoptimized
                  className="h-20 w-20 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-violet-100 text-lg font-semibold text-violet-700">
                  {initials}
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-gray-900">{profile.fullName}</p>
                <p className="text-sm text-gray-500">{viewer?.email}</p>
              </div>
            </div>

            <label className="sm:ml-auto">
              <span className="mb-2 block text-sm font-medium text-gray-700">Profile image</span>
              <input
                type="file"
                name="avatar"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500"
              />
            </label>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Role headline</span>
              <input
                type="text"
                name="headline"
                defaultValue={profile.headline}
                placeholder="Senior product operator"
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Preferred location</span>
              <input
                type="text"
                name="preferredLocation"
                defaultValue={profile.preferredLocation}
                placeholder="Remote or New York"
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Key skills</span>
            <textarea
              name="skills"
              rows={5}
              defaultValue={profile.skills.join(", ")}
              placeholder="AI workflows, recruiting ops, SQL, Zapier, operations systems"
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-3 text-sm leading-6 text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
            />
          </label>

          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Salary min</span>
              <input
                type="number"
                name="desiredSalaryMin"
                defaultValue={profile.desiredSalaryMin ?? ""}
                placeholder="150000"
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Salary max</span>
              <input
                type="number"
                name="desiredSalaryMax"
                defaultValue={profile.desiredSalaryMax ?? ""}
                placeholder="220000"
                className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-500/10"
              />
            </label>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="submit"
              className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              Save preferences
            </button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
