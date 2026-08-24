"use client";

import { useState, useId } from "react";
import type { ChangeEvent, FocusEvent } from "react";

export type FieldKind = "input" | "textarea";
export type InputType = "text" | "email" | "password";

export type RequiredRule = boolean | { value: boolean; message: string };

export type Validator = {
  required?: RequiredRule;
};

export type FieldConfig = {
  kind: FieldKind;
  inputType?: InputType;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  validator?: Validator;
  hint?: string;
  disabled?: boolean;
  className?: string;
};

const DEFAULT_REQUIRED_MESSAGE = "This field is required.";

const LABEL_CLASS =
  "block text-sm font-medium text-neutral-900 dark:text-neutral-100";

const CONTROL_CLASS =
  "mt-1.5 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 " +
  "text-sm text-neutral-900 shadow-sm placeholder:text-neutral-400 " +
  "focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 " +
  "disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 " +
  "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 " +
  "dark:placeholder:text-neutral-500 dark:focus:border-neutral-400 dark:focus:ring-neutral-400/30 " +
  "dark:disabled:bg-neutral-800 dark:disabled:text-neutral-500";

const HINT_CLASS = "mt-1 text-sm text-neutral-500 dark:text-neutral-400";

const ERROR_CLASS =
  "mt-1 text-sm font-semibold text-red-600 dark:text-red-400";

function requiredConstraint(
  rule: NonNullable<Validator["required"]>,
): { isRequired: boolean; message: string } {
  return typeof rule === "object"
    ? { isRequired: rule.value, message: rule.message }
    : { isRequired: rule, message: DEFAULT_REQUIRED_MESSAGE };
}

/** Empty semantics for textual kinds: null/undefined/"" plus whitespace-only, trimmed for testing only. */
function isEmptyTextual(value: string): boolean {
  return value.trim() === "";
}

function evaluate(config: FieldConfig, value: string): string | null {
  const rule = config.validator?.required;
  if (rule !== undefined) {
    const { isRequired, message } = requiredConstraint(rule);
    if (isRequired && isEmptyTextual(value)) {
      return message;
    }
  }
  return null;
}

type ControlAttributes = {
  id: string;
  disabled?: boolean;
  "aria-required"?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

export function Field({ config }: { config: FieldConfig }) {
  const {
    kind,
    inputType = "text",
    label,
    value,
    onValueChange,
    hint,
    disabled,
    className,
  } = config;

  const baseId = useId();
  const controlId = `${baseId}-control`;
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;

  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rule = config.validator?.required;
  const isRequired = rule !== undefined && requiredConstraint(rule).isRequired;

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const next = event.target.value;
    onValueChange(next);
    if (touched) {
      setError(evaluate(config, next));
    }
  };

  const handleBlur = (event: FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTouched(true);
    setError(evaluate(config, event.target.value));
  };

  const controlProps: ControlAttributes = {
    id: controlId,
    disabled,
    "aria-required": isRequired || undefined,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": `${hintId} ${errorId}`,
  };

  return (
    <div className={className}>
      <label htmlFor={controlId} className={LABEL_CLASS}>
        {label}
        {isRequired && (
          <>
            {" "}
            <span aria-hidden="true" className="text-red-600 dark:text-red-400">
              *
            </span>{" "}
            <span className="sr-only">(required)</span>
          </>
        )}
      </label>

      {kind === "input" ? (
        <input
          {...controlProps}
          type={inputType}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          className={CONTROL_CLASS}
        />
      ) : (
        <textarea
          {...controlProps}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          rows={4}
          className={`${CONTROL_CLASS} resize-y`}
        />
      )}

      <p id={hintId} className={HINT_CLASS}>
        {hint}
      </p>
      <p id={errorId} aria-live="polite" className={ERROR_CLASS}>
        {error && (
          <>
            <span className="sr-only">Error:</span>
            {error}
          </>
        )}
      </p>
    </div>
  );
}
