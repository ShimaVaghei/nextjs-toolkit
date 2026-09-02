// ─── Field vocabulary ──────────────────────────────────────────────────

export type FieldKind =
  | "input"
  | "textarea"
  | "checkbox"
  | "select"
  | "multi-select"
  | "date"
  | "datetime"
  | "date-range"
  | "datetime-range"
  | "number-range";

export type FieldInputType = "text" | "password" | "number";

// ─── Rule types ────────────────────────────────────────────────────────

export type FieldRequiredRule = boolean | { value: boolean; message: string };
export type FieldMinRule = number | string | { value: number | string; message: string };
export type FieldMaxRule = number | string | { value: number | string; message: string };
export type FieldMinLengthRule = number | { value: number; message: string };
export type FieldMaxLengthRule = number | { value: number; message: string };
export type FieldEmailRule = boolean | { value: boolean; message: string };
export type FieldRegexRule = RegExp | { value: RegExp; message: string };

export type FieldValidator = {
  required?: FieldRequiredRule;
  min?: FieldMinRule;
  max?: FieldMaxRule;
  minLength?: FieldMinLengthRule;
  maxLength?: FieldMaxLengthRule;
  email?: FieldEmailRule;
  regex?: FieldRegexRule;
};

// ─── Default copy ──────────────────────────────────────────────────────

const DEFAULT_REQUIRED_MESSAGE = "This field is required.";
const DEFAULT_MIN_MESSAGE = (min: number) => `Must be ${min} or greater.`;
const DEFAULT_MAX_MESSAGE = (max: number) => `Must be ${max} or less.`;
const DEFAULT_DATE_MIN_MESSAGE = (min: string) => `Must be on or after ${min}.`;
const DEFAULT_DATE_MAX_MESSAGE = (max: string) => `Must be on or before ${max}.`;
const DEFAULT_MIN_LENGTH_MESSAGE = (minLength: number) =>
  `Must be at least ${minLength} characters.`;
const DEFAULT_MAX_LENGTH_MESSAGE = (maxLength: number) =>
  `Must be at most ${maxLength} characters.`;
const DEFAULT_EMAIL_MESSAGE = "Enter a valid email address.";
const DEFAULT_REGEX_MESSAGE = "Invalid format.";

/** The demo page's long-standing hand-written baseline, promoted to the built-in. */
const DEFAULT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─── Constraint unpacking ──────────────────────────────────────────────

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
  rule: NonNullable<FieldValidator["required"]>,
): { isRequired: boolean; message: string } {
  const { value, message } = unpack(rule, () => DEFAULT_REQUIRED_MESSAGE);
  return { isRequired: value, message };
}

// ─── Rule-kind fitting ─────────────────────────────────────────────────

export function isNumberInput(
  kind: FieldKind,
  inputType: FieldInputType | undefined,
): boolean {
  return kind === "input" && inputType === "number";
}

/** Textual rules fit textarea and non-number inputs — never a checkbox or date kind. */
function fitsTextualRules(
  kind: FieldKind,
  inputType: FieldInputType | undefined,
): boolean {
  return (kind === "textarea" || (kind === "input" && !isNumberInput(kind, inputType))) && !isDateKind(kind);
}

/** The email rule fits non-number inputs only — never a number input, textarea, or date kind. */
function fitsEmailRule(
  kind: FieldKind,
  inputType: FieldInputType | undefined,
): boolean {
  return kind === "input" && !isNumberInput(kind, inputType) && !isDateKind(kind);
}

/** Whether the kind is one of the four date kinds. */
export function isDateKind(kind: FieldKind): boolean {
  return (
    kind === "date" ||
    kind === "datetime" ||
    kind === "date-range" ||
    kind === "datetime-range"
  );
}

type RuleName = keyof FieldValidator;

const RULE_NAMES: RuleName[] = [
  "required",
  "min",
  "max",
  "minLength",
  "maxLength",
  "email",
  "regex",
];

function ruleFits(
  kind: FieldKind,
  inputType: FieldInputType | undefined,
  name: RuleName,
): boolean {
  switch (name) {
    case "required":
      return true;
    case "min":
    case "max":
      return isNumberInput(kind, inputType) || isDateKind(kind);
    case "minLength":
    case "maxLength":
      return fitsTextualRules(kind, inputType);
    case "email":
      return fitsEmailRule(kind, inputType);
    case "regex":
      return fitsTextualRules(kind, inputType);
  }
}

/**
 * Dev-only: name any rule configured on a kind it does not fit. Called by
 * Field whenever the Validator or kind changes; a no-op in production.
 */
export function warnUnfittedRules(
  kind: FieldKind,
  inputType: FieldInputType | undefined,
  validator: FieldValidator | undefined,
  label: string,
): void {
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
}

// ─── Empty semantics ───────────────────────────────────────────────────

/**
 * Empty semantics: null/undefined/"" everywhere, whitespace-only for textual
 * kinds (trimmed for testing only), NaN on number inputs at runtime, and
 * `false` for checkbox — required means must-tick (the consent pattern).
 * Anything else a choice kind can hold (objects, non-empty arrays) is never
 * Empty. A date-range value is Empty unless both ends hold strings.
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "number") {
    return Number.isNaN(value);
  }
  if (typeof value === "boolean") {
    return value === false;
  }
  if (typeof value === "string") {
    return value.trim() === "";
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  // Range objects (date-range and number-range): Empty unless both ends hold
  // values. Each end is tested with the same #isEmpty semantics — an empty
  // string, undefined, or NaN (number edges) all read as a missing end, while
  // a legitimately `0` numeric bound does not.
  if (
    typeof value === "object" &&
    value !== null &&
    "from" in value &&
    "to" in value
  ) {
    const range = value as { from?: unknown; to?: unknown };
    return isEmpty(range.from) || isEmpty(range.to);
  }
  return false;
}

// ─── Evaluation ────────────────────────────────────────────────────────

/**
 * Runs the applicable rules in fixed precedence; the first violation wins.
 * The Touched gate lives here: an untouched Field never reports an Error,
 * per the CONTEXT.md contract — the imperative validate() path passes
 * always-Touched to force every rule regardless.
 */
export function evaluate(
  kind: FieldKind,
  inputType: FieldInputType | undefined,
  validator: FieldValidator | undefined,
  value: unknown,
  touched: boolean,
): string | null {
  if (!touched || !validator) {
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
    isNumberInput(kind, inputType) &&
    numericValue !== null
  ) {
    const raw = validator.min;
    const min = typeof raw === "object" ? raw.value : raw;
    const message = typeof raw === "object" ? raw.message : DEFAULT_MIN_MESSAGE(min as number);
    if (typeof min === "number" && numericValue < min) {
      return message;
    }
  }

  // Date-kind min: tests `from` on ranges, the value itself on singles.
  // Lexicographic string comparison is safe because output width is fixed.
  if (validator.min !== undefined && isDateKind(kind)) {
    const raw = validator.min;
    const min = typeof raw === "object" ? raw.value : raw;
    const message = typeof raw === "object"
      ? raw.message
      : DEFAULT_DATE_MIN_MESSAGE(String(min));
    const testValue =
      typeof value === "object" && value !== null && "from" in value
        ? (value as { from?: string }).from
        : typeof value === "string"
          ? value
          : undefined;
    if (testValue !== undefined && typeof min === "string" && testValue < min) {
      return message;
    }
  }

  if (
    validator.max !== undefined &&
    isNumberInput(kind, inputType) &&
    numericValue !== null
  ) {
    const raw = validator.max;
    const max = typeof raw === "object" ? raw.value : raw;
    const message = typeof raw === "object" ? raw.message : DEFAULT_MAX_MESSAGE(max as number);
    if (typeof max === "number" && numericValue > max) {
      return message;
    }
  }

  // Date-kind max: tests `to` on ranges, the value itself on singles.
  if (validator.max !== undefined && isDateKind(kind)) {
    const raw = validator.max;
    const max = typeof raw === "object" ? raw.value : raw;
    const message = typeof raw === "object"
      ? raw.message
      : DEFAULT_DATE_MAX_MESSAGE(String(max));
    const testValue =
      typeof value === "object" && value !== null && "to" in value
        ? (value as { to?: string }).to
        : typeof value === "string"
          ? value
          : undefined;
    if (testValue !== undefined && typeof max === "string" && testValue > max) {
      return message;
    }
  }

  if (fitsTextualRules(kind, inputType) && typeof value === "string") {
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

    // Fixed precedence: email sits after maxLength and before regex.
    if (
      validator.email !== undefined &&
      fitsEmailRule(kind, inputType)
    ) {
      const { value: mustBeEmail, message } = unpack(
        validator.email,
        () => DEFAULT_EMAIL_MESSAGE,
      );
      if (mustBeEmail && !DEFAULT_EMAIL_PATTERN.test(value)) {
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
