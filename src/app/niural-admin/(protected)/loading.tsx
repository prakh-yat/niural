function LoadingBlock({
  className,
}: {
  className: string;
}) {
  return <div className={`animate-pulse rounded-2xl bg-gray-100 ${className}`} />;
}

export default function AdminLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div className="space-y-3">
        <LoadingBlock className="h-4 w-40" />
        <LoadingBlock className="h-10 w-80" />
        <LoadingBlock className="h-4 w-[32rem] max-w-full" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <LoadingBlock className="h-[460px] w-full" />
        <div className="space-y-6">
          <LoadingBlock className="h-44 w-full" />
          <LoadingBlock className="h-[360px] w-full" />
        </div>
      </div>
    </div>
  );
}
