"use client";

import type { ComponentProps, ReactNode } from "react";
import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type BaseProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
};

type FieldShellProps<T extends FieldValues> = BaseProps<T> & {
  children: (
    field: ControllerRenderProps<T, FieldPath<T>>,
    invalid: boolean,
  ) => ReactNode;
};

function FieldShell<T extends FieldValues>({
  control,
  name,
  label,
  children,
}: FieldShellProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
          {children(field, fieldState.invalid)}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

export function FormField<T extends FieldValues>({
  control,
  name,
  label,
  ...inputProps
}: BaseProps<T> & Omit<ComponentProps<typeof Input>, "name">) {
  return (
    <FieldShell control={control} name={name} label={label}>
      {(field, invalid) => (
        <Input
          {...field}
          {...inputProps}
          id={field.name}
          className="h-11"
          aria-invalid={invalid}
        />
      )}
    </FieldShell>
  );
}

export function FormTextarea<T extends FieldValues>({
  control,
  name,
  label,
  ...textareaProps
}: BaseProps<T> & Omit<ComponentProps<typeof Textarea>, "name">) {
  return (
    <FieldShell control={control} name={name} label={label}>
      {(field, invalid) => (
        <Textarea
          {...field}
          {...textareaProps}
          id={field.name}
          aria-invalid={invalid}
        />
      )}
    </FieldShell>
  );
}

export type SelectOption = { value: string; label: string };

export function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  placeholder,
  onValueChange,
}: BaseProps<T> & {
  options: SelectOption[];
  placeholder: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <FieldShell control={control} name={name} label={label}>
      {(field, invalid) => (
        <select
          {...field}
          id={field.name}
          aria-invalid={invalid}
          onChange={(event) => {
            field.onChange(event);
            onValueChange?.(event.target.value);
          }}
          className="h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}
