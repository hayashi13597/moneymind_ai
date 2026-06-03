"use client";

import {
  FormCombobox,
  type ComboboxOption,
} from "@/components/form-combobox";
import { FormDatePicker } from "@/components/form-date-picker";
import { useFormField } from "@/components/ui/form";

type RhfComboboxControlProps<TValue extends string = string> = {
  name?: string;
  value: TValue;
  options: ComboboxOption<TValue>[];
  onValueChange: (value: TValue) => void;
  onBlur?: () => void;
  "aria-label": string;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  required?: boolean;
  className?: string;
};

export function RhfComboboxControl<TValue extends string = string>({
  name,
  value,
  options,
  onValueChange,
  onBlur,
  "aria-label": ariaLabel,
  disabled,
  placeholder,
  emptyMessage,
  required,
  className,
}: RhfComboboxControlProps<TValue>) {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  return (
    <FormCombobox
      id={formItemId}
      name={name}
      value={value}
      options={options}
      onValueChange={onValueChange}
      onBlur={onBlur}
      aria-label={ariaLabel}
      aria-describedby={
        error
          ? `${formDescriptionId} ${formMessageId}`
          : `${formDescriptionId}`
      }
      aria-invalid={!!error}
      disabled={disabled}
      placeholder={placeholder}
      emptyMessage={emptyMessage}
      required={required}
      className={className}
    />
  );
}

type RhfDatePickerControlProps = {
  name?: string;
  value: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  "aria-label": string;
  placeholder?: string;
  required?: boolean;
  className?: string;
};

export function RhfDatePickerControl({
  name,
  value,
  onValueChange,
  onBlur,
  "aria-label": ariaLabel,
  placeholder,
  required,
  className,
}: RhfDatePickerControlProps) {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  return (
    <FormDatePicker
      id={formItemId}
      name={name}
      value={value}
      onValueChange={onValueChange}
      onBlur={onBlur}
      aria-label={ariaLabel}
      aria-describedby={
        error
          ? `${formDescriptionId} ${formMessageId}`
          : `${formDescriptionId}`
      }
      aria-invalid={!!error}
      placeholder={placeholder}
      required={required}
      className={className}
    />
  );
}
