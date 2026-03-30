function LoadingBlock({
  className,
}: {
  className: string;
}) {
  return <div className={`animate-pulse rounded-2xl bg-gray-100 ${className}`} />;
}

export default function CandidateAppLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
      <div className="space-y-3">
        <LoadingBlock className="h-4 w-32" />
        <LoadingBlock className="h-10 w-72" />
        <LoadingBlock className="h-4 w-[28rem] max-w-full" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <LoadingBlock className="h-[420px] w-full" />
        <div className="space-y-6">
          <LoadingBlock className="h-40 w-full" />
          <LoadingBlock className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
