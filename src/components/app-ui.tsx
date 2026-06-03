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
        <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p>
        <h1 className="text-3xl font-semibold tracking-normal text-foreground md:text-4xl">
          {title}
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
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
        "gap-0 rounded-2xl border-[#E1DDD4] bg-card py-0 shadow-none",
        muted && "bg-[#F6F3EC]",
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
    <Card className="gap-0 rounded-2xl border-[#E1DDD4] bg-card py-0 shadow-none">
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-3 text-2xl font-semibold tracking-normal text-foreground",
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
        "gap-0 rounded-2xl border-[#D8E1D7] bg-[#F3F8F2] py-0 shadow-none",
        className,
      )}
    >
      <CardHeader className="p-5 pb-0 md:p-6 md:pb-0">
        <div className="flex items-start gap-3">
          <Badge className="h-auto rounded-full bg-[#2F6B4F] p-2 text-white hover:bg-[#2F6B4F]">
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
    <Empty className="rounded-2xl border border-dashed border-[#DCD7CC] bg-[#FDFCF8] p-6 text-center">
      <EmptyHeader className="max-w-lg gap-0">
        <EmptyMedia
          variant="icon"
          className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#ECF3ED] text-[#2F6B4F]"
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
