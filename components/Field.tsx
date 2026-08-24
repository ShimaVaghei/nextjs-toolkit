"use client";

import { useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import type { ChangeEvent, Ref } from "react";

export type FieldKind = "input" | "textarea" | "checkbox" | "select";
export type InputType = "text" | "email" | "password" | "number";

/** One choice offered by a choice kind: display label, handed-over value, optional unselectable flag. */
export type Option = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type FieldValue = string | number | boolean;

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
  /** Choice kinds only; select renders a static array here. */
  options?: Option[];
  /** Select-only: labels the closed control while empty via the ghost option. */
  placeholder?: string;
  /**
   * Whether a held currently-selected-but-disabled Option stays legally
   * selected (default true); false demotes it to the raw-value fallback.
   */
  keepDisabledSelection?: boolean;
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

const CHECKBOX_ROW_CLASS = "mt-1.5 flex items-center";

const CHECKBOX_CLASS =
  "size-4 shrink-0 rounded border border-neutral-300 bg-white accent-neutral-900 " +
  "focus:outline-none focus:ring-2 focus:ring-neutral-500/30 disabled:cursor-not-allowed " +
  "disabled:bg-neutral-100 disabled:accent-neutral-400 " +
  "dark:border-neutral-700 dark:bg-neutral-900 dark:accent-neutral-100 " +
  "dark:focus:ring-neutral-400/30 dark:disabled:bg-neutral-800";

const CHECKBOX_LABEL_CLASS =
  "ml-2 text-sm font-medium text-neutral-900 dark:text-neutral-100";

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

/** The string a native <select> matches against its options; Empty renders as "". */
function selectRawValue(value: FieldValue): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return Number.isNaN(value) ? "" : String(value);
  }
  return String(value);
}

type SelectEntry =
  | { kind: "option"; option: Option }
  | { kind: "fallback"; raw: string };

/**
 * Resolves the rendered dropdown entries for a select: real Options as-is,
 * a held disabled Option swapped for the raw-value fallback when demoted by
 * keepDisabledSelection, and one appended fallback for a stale/unknown value.
 */
function resolveSelectEntries(
  options: Option[],
  raw: string,
  keepDisabledSelection: boolean,
): { entries: SelectEntry[]; isStale: boolean } {
  const isStale = raw !== "" && !options.some((option) => option.value === raw);
  const entries: SelectEntry[] = options.map((option) =>
    option.value === raw && option.disabled && !keepDisabledSelection
      ? { kind: "fallback", raw }
      : { kind: "option", option },
  );
  if (isStale) {
    entries.push({ kind: "fallback", raw });
  }
  return { entries, isStale };
}

/** Textual rules fit textarea and non-number inputs — never a checkbox. */
function fitsTextualRules(
  kind: FieldKind,
  inputType: InputType | undefined,
): boolean {
  return kind === "textarea" || (kind === "input" && !isNumberInput(kind, inputType));
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
 * kinds (trimmed for testing only), NaN on number inputs at runtime, and
 * `false` for checkbox — required means must-tick (the consent pattern).
 */
function isEmpty(value: FieldValue): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "number") {
    return Number.isNaN(value);
  }
  if (typeof value === "boolean") {
    return value === false;
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
    options = [],
    placeholder,
    keepDisabledSelection = true,
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

  // Select display resolution: raw value matched against Options, with the
  // stale flag driving the dev-only warn and the synthetic fallback entry.
  const rawValue = kind === "select" ? selectRawValue(value) : "";
  const { entries: selectEntries, isStale } = resolveSelectEntries(
    options,
    rawValue,
    keepDisabledSelection,
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && isStale) {
      console.warn(
        `[Field] Value "${rawValue}" of select "${label}" does not match any Option and is shown as a raw-value fallback.`,
      );
    }
  }, [isStale, rawValue, label]);

  const rule = validator?.required;
  const isRequired = rule !== undefined && requiredConstraint(rule).isRequired;

  const requiredMarker = isRequired && (
    <>
      {" "}
      <span aria-hidden="true" className="text-red-600 dark:text-red-400">
        *
      </span>{" "}
      <span className="sr-only">(required)</span>
    </>
  );

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const next =
      kind === "checkbox"
        ? // Only a checkbox input renders this branch, so the target carries checked.
          (event.target as HTMLInputElement).checked
        : kind === "select"
          ? event.target.value
          : isNumberInput(kind, inputType)
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
  // Checkboxes render `checked` instead, so booleans never reach this value.
  const displayValue: string | number =
    typeof value === "boolean"
      ? ""
      : isNumberInput(kind, inputType) &&
          typeof value === "number" &&
          Number.isNaN(value)
        ? ""
        : value;

  return (
    <div className={className}>
      {kind === "checkbox" ? (
        <div className={CHECKBOX_ROW_CLASS}>
          <input
            {...controlProps}
            type="checkbox"
            checked={value === true}
            onChange={handleChange}
            onBlur={handleBlur}
            className={CHECKBOX_CLASS}
          />
          <label htmlFor={controlId} className={CHECKBOX_LABEL_CLASS}>
            {label}
            {requiredMarker}
          </label>
        </div>
      ) : (
        <>
          <label htmlFor={controlId} className={LABEL_CLASS}>
            {label}
            {requiredMarker}
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
          ) : kind === "select" ? (
            <select
              {...controlProps}
              value={rawValue}
              onChange={handleChange}
              onBlur={handleBlur}
              className={CONTROL_CLASS}
            >
              {/* Ghost: labels the closed control while empty, drops out of the open dropdown after a choice. */}
              <option value="" disabled hidden={rawValue !== ""}>
                {placeholder}
              </option>
              {selectEntries.map((entry, index) =>
                entry.kind === "option" ? (
                  <option
                    key={`${entry.option.value}-${index}`}
                    value={entry.option.value}
                    disabled={entry.option.disabled || undefined}
                  >
                    {entry.option.label}
                  </option>
                ) : (
                  <option key={`fallback-${index}`} value={entry.raw} disabled>
                    {entry.raw}
                  </option>
                ),
              )}
            </select>
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
        </>
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
