import { Bot, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-primary">{eyebrow}</p>
        <h1 className="max-w-3xl text-3xl font-bold leading-tight text-foreground md:text-5xl">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
          {description}
        </p>
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </header>
  );
}

type SectionCardProps = {
  children: ReactNode;
  className?: string;
  muted?: boolean;
};

export function SectionCard({ children, className, muted }: SectionCardProps) {
  return (
    <Card
      className={cn(
        "gap-0 rounded-xl border-[#E1DDD4] bg-card/92 py-0 shadow-[0_14px_48px_rgba(47,42,31,0.055)] transition-shadow duration-300 hover:shadow-[0_18px_58px_rgba(47,42,31,0.075)]",
        muted && "bg-[#F4EFE4]",
        className,
      )}
    >
      <CardContent className="p-5 md:p-6">{children}</CardContent>
    </Card>
  );
}

type MetricCardProps = {
  label: string;
  value: string;
  helper: string;
  tone?: "default" | "positive" | "negative";
};

export function MetricCard({
  label,
  value,
  helper,
  tone = "default",
}: MetricCardProps) {
  return (
    <Card className="gap-0 rounded-xl border-[#E1DDD4] bg-card/92 py-0 shadow-[0_12px_36px_rgba(47,42,31,0.045)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_54px_rgba(47,42,31,0.07)]">
      <CardContent className="p-5">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-3 text-2xl font-bold leading-none text-foreground",
            tone === "positive" && "text-[#2F6B4F]",
            tone === "negative" && "text-[#A2482D]",
          )}
        >
          {value}
        </p>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">{helper}</p>
      </CardContent>
    </Card>
  );
}

type InsightCardProps = {
  title: string;
  description: string;
  children?: ReactNode;
  className?: string;
};

export function InsightCard({
  title,
  description,
  children,
  className,
}: InsightCardProps) {
  return (
    <Card
      className={cn(
        "gap-0 rounded-xl border-[#C8DCC9] bg-[#EFF7EF]/95 py-0 shadow-[0_16px_54px_rgba(47,107,79,0.08)]",
        className,
      )}
    >
      <CardHeader className="p-5 pb-0 md:p-6 md:pb-0">
        <div className="flex items-start gap-3">
          <Badge className="h-auto rounded-lg bg-[#2F6B4F] p-2 text-white shadow-[0_8px_24px_rgba(47,107,79,0.22)] hover:bg-[#2F6B4F]">
            <Sparkles className="size-4" />
          </Badge>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
      </CardHeader>
      {children ? (
        <CardContent className="p-5 md:p-6">{children}</CardContent>
      ) : null}
    </Card>
  );
}

type EmptyStateProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <Empty className="rounded-xl border border-dashed border-[#DCD7CC] bg-[#FFFDF7]/88 p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
      <EmptyHeader className="max-w-lg gap-0">
        <EmptyMedia
          variant="icon"
          className="mx-auto flex size-10 items-center justify-center rounded-lg bg-[#ECF3ED] text-[#2F6B4F]"
        >
          <Bot className="size-5" />
        </EmptyMedia>
        <EmptyTitle className="mt-4 text-base font-semibold">
          {title}
        </EmptyTitle>
        <EmptyDescription className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {children ? <div className="mt-5">{children}</div> : null}
    </Empty>
  );
}
