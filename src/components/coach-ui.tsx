import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CoachPageShellProps = {
  children: ReactNode;
  className?: string;
};

type CoachEvidenceItem = {
  label: string;
  value: string;
  helper?: string;
};

type CoachHeroProps = {
  eyebrow: string;
  title: string;
  recommendation: string;
  description: string;
  evidence?: CoachEvidenceItem[];
  actions?: ReactNode;
  className?: string;
};

type CoachMetric = {
  label: string;
  value: string;
  helper?: string;
  tone?: "default" | "positive" | "negative";
};

type CoachMetricStripProps = {
  metrics: CoachMetric[];
  className?: string;
};

type WorkbenchCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
};

type CoachActionCardProps = {
  title: string;
  description: string;
  action: string;
  href: string;
  meta?: string;
  className?: string;
};

type CoachEmptyStateProps = {
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
};

export function CoachPageShell({ children, className }: CoachPageShellProps) {
  return (
    <section className={cn("space-y-7 md:space-y-9", className)}>
      {children}
    </section>
  );
}

export function CoachHero({
  eyebrow,
  title,
  recommendation,
  description,
  evidence = [],
  actions,
  className,
}: CoachHeroProps) {
  return (
    <div
      className={cn(
        "rounded-[1.75rem] bg-[#2F2A1F]/5 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
        className,
      )}
    >
      <div className="overflow-hidden rounded-[calc(1.75rem-0.375rem)] border border-[#DED7CA]/90 bg-[#FFFDF7] shadow-[0_24px_80px_rgba(47,42,31,0.08),inset_0_1px_0_rgba(255,255,255,0.88)]">
        <div className="grid gap-6 p-5 md:p-7 xl:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)]">
          <div className="min-w-0">
            <Badge
              variant="outline"
              className="h-auto rounded-lg border-[#C8DCC9] bg-[#ECF3ED] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#2F6B4F]"
            >
              {eyebrow}
            </Badge>
            <h1 className="mt-5 max-w-4xl text-3xl font-bold leading-[1.02] text-foreground md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              {description}
            </p>
            {actions ? (
              <div className="mt-6 flex flex-wrap gap-3">{actions}</div>
            ) : null}
          </div>
          <aside className="rounded-[1.25rem] border border-[#C8DCC9] bg-[#EFF7EF] p-5 text-[#193427] shadow-[0_18px_52px_rgba(47,107,79,0.10),inset_0_1px_0_rgba(255,255,255,0.72)]">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#2F6B4F]">
              MoneyMind gợi ý
            </p>
            <h2 className="mt-3 text-xl font-semibold leading-snug md:text-2xl">
              {recommendation}
            </h2>
            {evidence.length > 0 ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {evidence.map((item) => (
                  <div
                    key={`${item.label}-${item.value}`}
                    className="rounded-xl border border-[#C8DCC9]/80 bg-[#FFFDF7]/76 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                  >
                    <p className="text-xs text-[#637265]">{item.label}</p>
                    <p className="mt-1 text-lg font-semibold">{item.value}</p>
                    {item.helper ? (
                      <p className="mt-1 text-xs leading-5 text-[#637265]">
                        {item.helper}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

export function CoachMetricStrip({ metrics, className }: CoachMetricStripProps) {
  return (
    <div
      className={cn(
        "grid gap-3 md:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          className="gap-0 rounded-xl border-[#E1DDD4] bg-[#FFFDF7]/92 py-0 shadow-[0_12px_34px_rgba(47,42,31,0.045)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_44px_rgba(47,42,31,0.065)]"
        >
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">
              {metric.label}
            </p>
            <p
              className={cn(
                "mt-2 text-2xl font-bold leading-none text-foreground",
                metric.tone === "positive" && "text-[#2F6B4F]",
                metric.tone === "negative" && "text-[#A2482D]",
              )}
            >
              {metric.value}
            </p>
            {metric.helper ? (
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {metric.helper}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function WorkbenchCard({
  title,
  description,
  children,
  className,
  action,
}: WorkbenchCardProps) {
  return (
    <Card
      className={cn(
        "gap-0 rounded-[1.25rem] border-[#DED7CA] bg-[#FFFDF7]/94 py-0 shadow-[0_18px_58px_rgba(47,42,31,0.06)]",
        className,
      )}
    >
      <CardContent className="p-5 md:p-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h2 className="text-xl font-semibold leading-tight text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function CoachActionCard({
  title,
  description,
  action,
  href,
  meta,
  className,
}: CoachActionCardProps) {
  return (
    <Card
      className={cn(
        "gap-0 rounded-xl border-[#D5E2D1] bg-[#F3F8F1] py-0 shadow-[0_14px_42px_rgba(47,107,79,0.07)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_rgba(47,107,79,0.10)]",
        className,
      )}
    >
      <CardContent className="p-4">
        {meta ? (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2F6B4F]">
            {meta}
          </p>
        ) : null}
        <h3 className="mt-2 text-base font-semibold leading-snug text-foreground">
          {title}
        </h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <Button asChild size="sm" className="mt-4 transition active:translate-y-px">
          <Link href={href}>{action}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function CoachEmptyState({
  title,
  description,
  children,
  className,
}: CoachEmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-[#DCD7CC] bg-[#FFFDF7]/88 p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
        className,
      )}
    >
      <p className="mx-auto flex size-10 items-center justify-center rounded-xl bg-[#ECF3ED] text-lg font-semibold text-[#2F6B4F]">
        AI
      </p>
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  );
}
