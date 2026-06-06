import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className: string }) {
  return <Skeleton className={cn("rounded-lg bg-[#E4DED3]", className)} />;
}

export default function Loading() {
  return (
    <section
      aria-busy="true"
      aria-label="Đang chuẩn bị phiên cố vấn"
      className="space-y-7 motion-safe:animate-pulse md:space-y-9"
    >
      <div className="rounded-[2rem] bg-[#2F2A1F]/5 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
        <div className="overflow-hidden rounded-[calc(2rem-0.375rem)] border border-[#DED7CA]/90 bg-[#FFFDF7] shadow-[0_24px_80px_rgba(47,42,31,0.08),inset_0_1px_0_rgba(255,255,255,0.88)]">
          <div className="grid gap-6 p-5 md:p-7 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
            <div className="space-y-4">
              <p className="sr-only">Đang chuẩn bị phiên cố vấn</p>
              <SkeletonBlock className="h-6 w-36 rounded-full" />
              <SkeletonBlock className="h-12 w-full max-w-2xl md:h-16" />
              <SkeletonBlock className="h-4 w-full max-w-2xl" />
              <SkeletonBlock className="h-4 w-4/5 max-w-xl" />
            </div>
            <div className="rounded-[1.5rem] bg-[#263F32] p-5 text-white shadow-[0_18px_56px_rgba(47,107,79,0.18),inset_0_1px_0_rgba(255,255,255,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
                MoneyMind đang đọc tín hiệu
              </p>
              <SkeletonBlock className="mt-4 h-8 w-full bg-white/18" />
              <SkeletonBlock className="mt-3 h-8 w-5/6 bg-white/18" />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <SkeletonBlock className="h-20 w-full rounded-2xl bg-white/14" />
                <SkeletonBlock className="h-20 w-full rounded-2xl bg-white/14" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-2xl border border-[#E1DDD4] bg-[#FFFDF7]/92 p-4 shadow-[0_12px_34px_rgba(47,42,31,0.045)]"
          >
            <SkeletonBlock className="h-3 w-20" />
            <SkeletonBlock className="mt-3 h-8 w-32" />
            <SkeletonBlock className="mt-3 h-3 w-full" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-3xl border border-[#D5E2D1] bg-[#F3F8F1] p-5 shadow-[0_14px_42px_rgba(47,107,79,0.07)] md:p-6">
          <SkeletonBlock className="h-4 w-32" />
          <SkeletonBlock className="mt-5 h-6 w-3/4" />
          <SkeletonBlock className="mt-3 h-4 w-full" />
          <SkeletonBlock className="mt-2 h-4 w-5/6" />
          <SkeletonBlock className="mt-7 h-9 w-36 rounded-lg" />
        </div>

        <div className="rounded-[1.5rem] border border-[#DED7CA] bg-[#FFFDF7]/94 p-5 shadow-[0_18px_58px_rgba(47,42,31,0.06)] md:p-6">
          <SkeletonBlock className="h-6 w-44" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-[#EDE8DE] p-4">
                <SkeletonBlock className="h-4 w-3/4" />
                <SkeletonBlock className="mt-2 h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
