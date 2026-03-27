import { env, envFlags } from "@/lib/env";

export async function searchProfiles(query: string) {
  if (!envFlags.hasSerper) {
    return [];
  }

  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": env.SERPER_API_KEY!,
    },
    body: JSON.stringify({
      q: query,
      num: 5,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  return payload.organic ?? [];
}
