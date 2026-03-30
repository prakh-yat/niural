import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const source = new URL(request.url);
  const target = new URL("/auth/callback", request.url);

  source.searchParams.forEach((value, key) => {
    target.searchParams.set(key, value);
  });

  return NextResponse.redirect(target, { status: 307 });
}
