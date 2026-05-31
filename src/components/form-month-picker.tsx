"use client";

import { CalendarDays, ChevronDownIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type FormMonthPickerProps = {
  value: string;
  onValueChange: (value: string) => void;
  "aria-label": string;
  className?: string;
};

const monthLabels = Array.from({ length: 12 }, (_, index) => ({
  index,
  label: `Tháng ${String(index + 1).padStart(2, "0")}`,
}));

function parseMonthKey(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value);

  if (!match) {
    return { year: new Date().getFullYear(), monthIndex: new Date().getMonth() };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);

  if (!Number.isInteger(year) || month < 1 || month > 12) {
    return { year: new Date().getFullYear(), monthIndex: new Date().getMonth() };
  }

  return { year, monthIndex: month - 1 };
}

function toMonthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function formatMonthLabel(value: string) {
  const { year, monthIndex } = parseMonthKey(value);

  return `Tháng ${String(monthIndex + 1).padStart(2, "0")}/${year}`;
}

export function FormMonthPicker({
  value,
  onValueChange,
  "aria-label": ariaLabel,
  className,
}: FormMonthPickerProps) {
  const [open, setOpen] = useState(false);
  const selectedMonth = useMemo(() => parseMonthKey(value), [value]);
  const [visibleYear, setVisibleYear] = useState(selectedMonth.year);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setVisibleYear(selectedMonth.year);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={ariaLabel}
          className={cn(
            "h-10 w-full min-w-0 justify-between rounded-xl border-warm-border bg-surface px-3 font-normal hover:bg-surface",
            className,
          )}
        >
          <span className="inline-flex min-w-0 items-center gap-2 truncate">
            <CalendarDays className="size-4 shrink-0 opacity-60" />
            <span className="truncate">{formatMonthLabel(value)}</span>
          </span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-3" align="end">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Năm trước"
            onClick={() => setVisibleYear((year) => year - 1)}
            className="size-8"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <div className="text-sm font-semibold">{visibleYear}</div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Năm sau"
            onClick={() => setVisibleYear((year) => year + 1)}
            className="size-8"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {monthLabels.map((month) => {
            const selected =
              visibleYear === selectedMonth.year &&
              month.index === selectedMonth.monthIndex;

            return (
              <Button
                key={month.index}
                type="button"
                variant={selected ? "default" : "outline"}
                aria-pressed={selected}
                onClick={() => {
                  onValueChange(toMonthKey(visibleYear, month.index));
                  setOpen(false);
                }}
                className={cn(
                  "h-9 rounded-lg px-2 text-xs",
                  !selected && "border-[#DDD8CE] bg-white",
                )}
              >
                {month.label}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
