function SkeletonBlock({ className }: { className: string }) {
  return <div className={`rounded-xl bg-[#E9E4DA] ${className}`} />;
}

export default function Loading() {
  return (
    <section
      aria-busy="true"
      aria-label="Đang tải nội dung"
      className="space-y-8 motion-safe:animate-pulse"
    >
      <div className="space-y-3">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-10 w-full max-w-md" />
        <SkeletonBlock className="h-4 w-full max-w-2xl" />
        <SkeletonBlock className="h-4 w-3/4 max-w-xl" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-[#E1DDD4] bg-card p-5"
          >
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="mt-4 h-8 w-28" />
            <SkeletonBlock className="mt-3 h-3 w-full" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-[#E1DDD4] bg-card p-5 md:p-6">
          <SkeletonBlock className="h-5 w-36" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_96px] gap-4 border-b border-[#EDE8DE] pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-3/4" />
                  <SkeletonBlock className="h-3 w-1/2" />
                </div>
                <SkeletonBlock className="h-5 w-full" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#D8E1D7] bg-[#F3F8F2] p-5 md:p-6">
          <SkeletonBlock className="h-9 w-9 rounded-full" />
          <SkeletonBlock className="mt-5 h-5 w-40" />
          <SkeletonBlock className="mt-3 h-4 w-full" />
          <SkeletonBlock className="mt-2 h-4 w-5/6" />
          <SkeletonBlock className="mt-6 h-24 w-full" />
        </div>
      </div>
    </section>
  );
}
