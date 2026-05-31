"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ComboboxOption<TValue extends string = string> = {
  value: TValue;
  label: string;
};

type FormComboboxProps<TValue extends string = string> = {
  name?: string;
  value: TValue;
  options: ComboboxOption<TValue>[];
  onValueChange: (value: TValue) => void;
  "aria-label"?: string;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  required?: boolean;
};

export function FormCombobox<TValue extends string = string>({
  name,
  value,
  options,
  onValueChange,
  "aria-label": ariaLabel,
  disabled = false,
  placeholder = "Chọn",
  emptyMessage = "Không tìm thấy lựa chọn.",
  required = false,
}: FormComboboxProps<TValue>) {
  const [open, setOpen] = useState(false);
  const selectedOption =
    options.find((option) => option.value === value) ?? null;

  return (
    <>
      {name ? (
        <input type="hidden" name={name} value={value} disabled={disabled} />
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-label={ariaLabel}
            aria-expanded={open}
            aria-required={required || undefined}
            disabled={disabled}
            className="h-10 w-full justify-between rounded-xl border-warm-border bg-surface px-3 font-normal hover:bg-surface"
          >
            <span
              className={cn(
                "truncate",
                !selectedOption && "text-muted-foreground",
              )}
            >
              {selectedOption?.label ?? placeholder}
            </span>
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    keywords={[option.label]}
                    onSelect={() => {
                      onValueChange(option.value);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                    <Check
                      className={cn(
                        "ml-auto size-4",
                        value === option.value ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}
