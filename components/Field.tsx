"use client";

import { useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import type { ChangeEvent, Ref } from "react";

export type FieldKind = "input" | "textarea";
export type InputType = "text" | "email" | "password" | "number";

export type FieldValue = string | number;

export type RequiredRule = boolean | { value: boolean; message: string };
export type MinRule = number | { value: number; message: string };
export type MaxRule = number | { value: number; message: string };
export type MinLengthRule = number | { value: number; message: string };
export type MaxLengthRule = number | { value: number; message: string };
export type RegexRule = RegExp | { value: RegExp; message: string };

export type Validator = {
  required?: RequiredRule;
  min?: MinRule;
  max?: MaxRule;
  minLength?: MinLengthRule;
  maxLength?: MaxLengthRule;
  regex?: RegexRule;
};

export type FieldConfig = {
  kind: FieldKind;
  inputType?: InputType;
  label: string;
  value: FieldValue;
  onValueChange: (value: FieldValue) => void;
  validator?: Validator;
  hint?: string;
  disabled?: boolean;
  className?: string;
};

export type FieldHandle = {
  validate: () => boolean;
};

const DEFAULT_REQUIRED_MESSAGE = "This field is required.";
const DEFAULT_MIN_MESSAGE = (min: number) => `Must be ${min} or greater.`;
const DEFAULT_MAX_MESSAGE = (max: number) => `Must be ${max} or less.`;
const DEFAULT_MIN_LENGTH_MESSAGE = (minLength: number) =>
  `Must be at least ${minLength} characters.`;
const DEFAULT_MAX_LENGTH_MESSAGE = (maxLength: number) =>
  `Must be at most ${maxLength} characters.`;
const DEFAULT_REGEX_MESSAGE = "Invalid format.";

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

type Constraint<T> = T | { value: T; message: string };

function isConstraintPair<T>(
  rule: Constraint<T>,
): rule is { value: T; message: string } {
  return (
    typeof rule === "object" &&
    rule !== null &&
    "value" in rule &&
    "message" in rule
  );
}

/** A rule accepts a bare constraint (built-in default copy) or a { value, message } pair. */
function unpack<T>(
  rule: Constraint<T>,
  defaultMessage: (value: T) => string,
): { value: T; message: string } {
  return isConstraintPair(rule)
    ? { value: rule.value, message: rule.message }
    : { value: rule, message: defaultMessage(rule) };
}

function requiredConstraint(
  rule: NonNullable<Validator["required"]>,
): { isRequired: boolean; message: string } {
  const { value, message } = unpack(rule, () => DEFAULT_REQUIRED_MESSAGE);
  return { isRequired: value, message };
}

function isNumberInput(
  kind: FieldKind,
  inputType: InputType | undefined,
): boolean {
  return kind === "input" && inputType === "number";
}

/**
 * Number-input coercion: non-empty parseable → Number(raw); empty or
 * whitespace-only → ""; non-empty garbage → NaN (counts as Empty at runtime).
 */
function coerceNumberInput(raw: string): FieldValue {
  return raw.trim() === "" ? "" : Number(raw);
}

/** Textual rules fit textarea and non-number inputs. */
function fitsTextualRules(
  kind: FieldKind,
  inputType: InputType | undefined,
): boolean {
  return kind === "textarea" || !isNumberInput(kind, inputType);
}

type RuleName = keyof Validator;

const RULE_NAMES: RuleName[] = [
  "required",
  "min",
  "max",
  "minLength",
  "maxLength",
  "regex",
];

function ruleFits(
  kind: FieldKind,
  inputType: InputType | undefined,
  name: RuleName,
): boolean {
  switch (name) {
    case "required":
      return true;
    case "min":
    case "max":
      return isNumberInput(kind, inputType);
    case "minLength":
    case "maxLength":
    case "regex":
      return fitsTextualRules(kind, inputType);
  }
}

/**
 * Empty semantics: null/undefined/"" everywhere, whitespace-only for textual
 * kinds (trimmed for testing only), NaN on number inputs at runtime.
 */
function isEmpty(value: FieldValue): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "number") {
    return Number.isNaN(value);
  }
  return value.trim() === "";
}

/** Runs the applicable rules in fixed precedence; the first violation wins. */
function evaluate(config: FieldConfig, value: FieldValue): string | null {
  const validator = config.validator;
  if (!validator) {
    return null;
  }

  if (validator.required !== undefined) {
    const { isRequired, message } = requiredConstraint(validator.required);
    if (isRequired && isEmpty(value)) {
      return message;
    }
  }

  const numericValue =
    typeof value === "number" && !Number.isNaN(value) ? value : null;

  if (
    validator.min !== undefined &&
    isNumberInput(config.kind, config.inputType) &&
    numericValue !== null
  ) {
    const { value: min, message } = unpack(validator.min, DEFAULT_MIN_MESSAGE);
    if (numericValue < min) {
      return message;
    }
  }

  if (
    validator.max !== undefined &&
    isNumberInput(config.kind, config.inputType) &&
    numericValue !== null
  ) {
    const { value: max, message } = unpack(validator.max, DEFAULT_MAX_MESSAGE);
    if (numericValue > max) {
      return message;
    }
  }

  if (fitsTextualRules(config.kind, config.inputType) && typeof value === "string") {
    if (validator.minLength !== undefined) {
      const { value: minLength, message } = unpack(
        validator.minLength,
        DEFAULT_MIN_LENGTH_MESSAGE,
      );
      if (value.length < minLength) {
        return message;
      }
    }

    if (validator.maxLength !== undefined) {
      const { value: maxLength, message } = unpack(
        validator.maxLength,
        DEFAULT_MAX_LENGTH_MESSAGE,
      );
      if (value.length > maxLength) {
        return message;
      }
    }

    if (validator.regex !== undefined) {
      const { value: pattern, message } = unpack(
        validator.regex,
        () => DEFAULT_REGEX_MESSAGE,
      );
      // Fresh RegExp per run so g/y flags can't leak lastIndex between runs.
      const matcher = new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, ""));
      if (!matcher.test(value)) {
        return message;
      }
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

export function Field({
  config,
  ref,
}: {
  config: FieldConfig;
  ref?: Ref<FieldHandle>;
}) {
  const {
    kind,
    inputType = "text",
    label,
    value,
    onValueChange,
    validator,
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

  // validate() runs against the latest committed config and value.
  const configRef = useRef(config);
  const valueRef = useRef(value);
  useEffect(() => {
    configRef.current = config;
    valueRef.current = value;
  });

  useImperativeHandle(
    ref,
    () => ({
      validate: () => {
        const message = evaluate(configRef.current, valueRef.current);
        setTouched(true);
        setError(message);
        return message === null;
      },
    }),
    [],
  );

  // Dev-only: name any rule configured on a kind it does not fit, whenever the
  // Validator or kind changes.
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !validator) {
      return;
    }
    for (const name of RULE_NAMES) {
      if (validator[name] !== undefined && !ruleFits(kind, inputType, name)) {
        const target =
          kind === "input" ? `input (${inputType ?? "text"})` : kind;
        console.warn(
          `[Field] Rule "${name}" does not apply to ${target} "${label}" and will be ignored.`,
        );
      }
    }
  }, [validator, kind, inputType, label]);

  const rule = validator?.required;
  const isRequired = rule !== undefined && requiredConstraint(rule).isRequired;

  const handleChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const next = isNumberInput(kind, inputType)
      ? coerceNumberInput(event.target.value)
      : event.target.value;
    onValueChange(next);
    if (touched) {
      setError(evaluate(config, next));
    }
  };

  const handleBlur = () => {
    // Evaluate the committed (already coerced) value, never the raw event string.
    setTouched(true);
    setError(evaluate(config, value));
  };

  const controlProps: ControlAttributes = {
    id: controlId,
    disabled,
    "aria-required": isRequired || undefined,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": `${hintId} ${errorId}`,
  };

  // NaN displays as Empty; React would otherwise stringify it into the control.
  const displayValue =
    isNumberInput(kind, inputType) && typeof value === "number" && Number.isNaN(value)
      ? ""
      : value;

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
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={CONTROL_CLASS}
        />
      ) : (
        <textarea
          {...controlProps}
          value={displayValue}
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
