"use client";

import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type FormDatePickerProps = {
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  "aria-label": string;
  placeholder?: string;
  required?: boolean;
  className?: string;
};

function parseDateKey(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return undefined;
  }

  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date: Date | undefined) {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function FormDatePicker({
  name,
  value,
  onValueChange,
  "aria-label": ariaLabel,
  placeholder = "Chọn ngày",
  required = false,
  className,
}: FormDatePickerProps) {
  const [open, setOpen] = useState(false);
  const date = parseDateKey(value);

  return (
    <>
      {name ? (
        <input type="hidden" name={name} value={value} data-required={required} />
      ) : (
        <input type="hidden" value={value} data-required={required} />
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-label={ariaLabel}
            aria-required={required || undefined}
            data-empty={!date}
            className={cn(
              "h-10 w-full justify-between rounded-xl border-warm-border bg-surface px-3 font-normal hover:bg-surface data-[empty=true]:text-muted-foreground",
              className,
            )}
          >
            <span>{date ? formatDate(date) : placeholder}</span>
            <ChevronDownIcon className="size-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            captionLayout="dropdown"
            onSelect={(nextDate) => {
              if (!nextDate) {
                return;
              }

              onValueChange(toDateKey(nextDate));
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
