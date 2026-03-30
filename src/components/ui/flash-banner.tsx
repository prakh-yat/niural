"use client";

import { useEffect } from "react";

import type { FlashMessage } from "@/lib/server/flash";

export function FlashBanner({
  cookieName,
  flash,
}: {
  cookieName: string;
  flash: FlashMessage;
}) {
  useEffect(() => {
    document.cookie = `${cookieName}=; path=/; max-age=0; SameSite=Lax`;
  }, [cookieName]);

  const toneClasses =
    flash.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-red-200 bg-red-50 text-red-700";

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClasses}`}>{flash.message}</div>
  );
}

