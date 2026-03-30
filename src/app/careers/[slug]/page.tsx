import { redirect } from "next/navigation";

export default async function CareerDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/jobs/${slug}`);
}
