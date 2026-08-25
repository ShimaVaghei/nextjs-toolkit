"use client";

import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import type { ChangeEvent, FocusEvent, KeyboardEvent, Ref } from "react";

export type FieldKind =
  | "input"
  | "textarea"
  | "checkbox"
  | "select"
  | "multi-select";
export type FieldInputType = "text" | "password" | "number";

/** One choice offered by a choice kind: display label, handed-over value, optional unselectable flag. */
export type FieldOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type FieldValue = string | number | boolean | string[];

export type FieldRequiredRule = boolean | { value: boolean; message: string };
export type FieldMinRule = number | { value: number; message: string };
export type FieldMaxRule = number | { value: number; message: string };
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

export type FieldConfig = {
  kind: FieldKind;
  inputType?: FieldInputType;
  label: string;
  /**
   * Optional mount-time seed: read exactly once when the Field mounts, then
   * ignored — undefined seeds nothing. A changed prop after mount draws a
   * dev-only warning; live control flows only through user edits, setValue,
   * and onValueChange observation.
   */
  initialValue?: FieldValue;
  /** Optional observer: fired for every committed change, however caused. */
  onValueChange?: (value: FieldValue) => void;
  validator?: FieldValidator;
  /** Choice kinds only: a static array or an async loader fired once on mount and re-fired only by Retry. */
  options?: FieldOption[] | (() => Promise<FieldOption[]>);
  /** Select-only: labels the closed control while empty via the ghost option. Multi-select ignores it. */
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
  getValue: () => FieldValue | undefined;
  setValue: (value: FieldValue) => void;
};

const DEFAULT_REQUIRED_MESSAGE = "This field is required.";
const DEFAULT_MIN_MESSAGE = (min: number) => `Must be ${min} or greater.`;
const DEFAULT_MAX_MESSAGE = (max: number) => `Must be ${max} or less.`;
const DEFAULT_MIN_LENGTH_MESSAGE = (minLength: number) =>
  `Must be at least ${minLength} characters.`;
const DEFAULT_MAX_LENGTH_MESSAGE = (maxLength: number) =>
  `Must be at most ${maxLength} characters.`;
const DEFAULT_EMAIL_MESSAGE = "Enter a valid email address.";
const DEFAULT_REGEX_MESSAGE = "Invalid format.";

/** The demo page's long-standing hand-written baseline, promoted to the built-in. */
const DEFAULT_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const REJECTED_MESSAGE_CLASS = "text-red-600 dark:text-red-400";

const RETRY_BUTTON_CLASS =
  "ml-2 rounded-md border border-red-300 bg-white px-2 py-0.5 text-xs font-medium " +
  "text-red-600 cursor-pointer hover:bg-red-50 focus:outline-none " +
  "focus:ring-2 focus:ring-red-500/30 dark:border-red-900 dark:bg-transparent " +
  "dark:text-red-400 dark:hover:bg-red-950 dark:focus:ring-red-400/30";

/** Muted pure-Tailwind spinner for the Pending status line (same shape as Table's). */
const OPTION_LOAD_SPINNER = (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    fill="none"
    className="inline-block h-3.5 w-3.5 animate-spin"
  >
    <circle
      cx="8"
      cy="8"
      r="6"
      stroke="currentColor"
      strokeOpacity="0.25"
      strokeWidth="2"
    />
    <path
      d="M14 8a6 6 0 0 0-6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const CHECKBOX_ROW_CLASS = "mt-1.5 flex items-center";

const CHECKBOX_CLASS =
  "size-4 shrink-0 rounded border border-neutral-300 bg-white accent-neutral-900 " +
  "focus:outline-none focus:ring-2 focus:ring-neutral-500/30 disabled:cursor-not-allowed " +
  "disabled:bg-neutral-100 disabled:accent-neutral-400 " +
  "dark:border-neutral-700 dark:bg-neutral-900 dark:accent-neutral-100 " +
  "dark:focus:ring-neutral-400/30 dark:disabled:bg-neutral-800";

const CHECKBOX_LABEL_CLASS =
  "ml-2 text-sm font-medium text-neutral-900 dark:text-neutral-100";

/** Fixed-height chip strip: scrolls horizontally under a slim styled scrollbar, never grows. */
const CHIP_STRIP_CLASS =
  "field-chip-strip flex h-11 min-w-0 flex-1 items-center gap-1.5 overflow-x-auto rounded-md border border-neutral-300 bg-white px-2 py-1 " +
  "dark:border-neutral-700 dark:bg-neutral-900";

const CHIP_CLASS =
  "inline-flex shrink-0 items-center gap-1 rounded-full border border-neutral-200 bg-neutral-100 py-0.5 pl-2.5 pr-0.5 " +
  "text-xs font-medium text-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100";

const CHIP_REMOVE_CLASS =
  "flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full text-neutral-500 " +
  "hover:bg-neutral-300 hover:text-neutral-700 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 " +
  "disabled:cursor-not-allowed disabled:text-neutral-400 disabled:hover:bg-transparent " +
  "dark:text-neutral-400 dark:hover:bg-neutral-600 dark:hover:text-neutral-200 dark:focus:ring-neutral-400/30 " +
  "dark:disabled:hover:bg-transparent";

const OPEN_BUTTON_CLASS =
  "flex w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-neutral-300 bg-white " +
  "text-neutral-500 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 " +
  "disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 disabled:hover:bg-white " +
  "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 " +
  "dark:focus:ring-neutral-400/30 dark:disabled:bg-neutral-800 dark:disabled:hover:bg-neutral-800";

const PANEL_CLASS =
  "absolute left-0 right-0 top-full z-10 mt-1.5 space-y-3 rounded-md border border-neutral-300 bg-white p-3 shadow-md " +
  "dark:border-neutral-700 dark:bg-neutral-900";

const ROW_LABEL_CLASS =
  "flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100";

const ROW_LABEL_DISABLED_CLASS = " cursor-not-allowed opacity-60";

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

function isNumberInput(
  kind: FieldKind,
  inputType: FieldInputType | undefined,
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
function selectRawValue(value: FieldValue | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return Number.isNaN(value) ? "" : String(value);
  }
  return String(value);
}

type SelectEntry =
  | { kind: "option"; option: FieldOption }
  | { kind: "fallback"; raw: string };

/** One rendered Chip: a matched Option or a raw-value fallback for an unknown selection. */
type ChipEntry = SelectEntry;

function chipValue(entry: ChipEntry): string {
  return entry.kind === "option" ? entry.option.value : entry.raw;
}

function chipLabel(entry: ChipEntry): string {
  return entry.kind === "option" ? entry.option.label : entry.raw;
}

/**
 * Resolves the rendered Chips for a multi-select in Options order, with held
 * disabled Options demoted to fallbacks by keepDisabledSelection and unknown
 * values appended as raw-value fallback chips. While Options are not yet
 * authoritative (a load is Pending or Rejected) held selections stay visible
 * without being reported stale.
 */
function resolveChips(
  options: FieldOption[],
  values: string[],
  keepDisabledSelection: boolean,
  optionsAuthoritative: boolean,
): { entries: ChipEntry[]; staleValues: string[] } {
  const entries: ChipEntry[] = [];
  const known = new Set<string>();
  for (const option of options) {
    if (!values.includes(option.value)) {
      continue;
    }
    known.add(option.value);
    entries.push(
      option.disabled && !keepDisabledSelection
        ? { kind: "fallback", raw: option.value }
        : { kind: "option", option },
    );
  }
  const staleValues = optionsAuthoritative
    ? values.filter((value) => !known.has(value))
    : [];
  for (const value of values) {
    if (!known.has(value)) {
      entries.push({ kind: "fallback", raw: value });
    }
  }
  return { entries, staleValues };
}

/**
 * Resolves the rendered dropdown entries for a select: real Options as-is,
 * a held disabled Option swapped for the raw-value fallback when demoted by
 * keepDisabledSelection, and one appended fallback for a stale/unknown value.
 * While Options are not yet authoritative (a load is Pending or Rejected) a
 * held selection is expected-absent rather than stale: it still renders as a
 * fallback entry so it stays visible, but no staleness is reported.
 */
function resolveSelectEntries(
  options: FieldOption[],
  raw: string,
  keepDisabledSelection: boolean,
  optionsAuthoritative: boolean,
): { entries: SelectEntry[]; isStale: boolean } {
  const isStale =
    optionsAuthoritative &&
    raw !== "" &&
    !options.some((option) => option.value === raw);
  const entries: SelectEntry[] = options.map((option) =>
    option.value === raw && option.disabled && !keepDisabledSelection
      ? { kind: "fallback", raw }
      : { kind: "option", option },
  );
  if (isStale || (!optionsAuthoritative && raw !== "")) {
    entries.push({ kind: "fallback", raw });
  }
  return { entries, isStale };
}

/** Lifecycle of an async Option load; only meaningful when `options` is a loader. */
type OptionLoadStatus = "pending" | "resolved" | "rejected";

/**
 * Seed-once comparison: strict identity, with a shallow pass for arrays so a
 * re-created-but-equal literal (the common multi-select call site) does not
 * read as a changed Initial value.
 */
function sameInitial(
  a: FieldValue | undefined,
  b: FieldValue | undefined,
): boolean {
  if (Object.is(a, b)) {
    return true;
  }
  return (
    Array.isArray(a) &&
    Array.isArray(b) &&
    a.length === b.length &&
    a.every((entry, index) => Object.is(entry, b[index]))
  );
}

function isOptionsLoader(
  options: FieldConfig["options"],
): options is () => Promise<FieldOption[]> {
  return typeof options === "function";
}

/** Textual rules fit textarea and non-number inputs — never a checkbox. */
function fitsTextualRules(
  kind: FieldKind,
  inputType: FieldInputType | undefined,
): boolean {
  return kind === "textarea" || (kind === "input" && !isNumberInput(kind, inputType));
}

/** The email rule fits non-number inputs only — never a number input or textarea. */
function fitsEmailRule(
  kind: FieldKind,
  inputType: FieldInputType | undefined,
): boolean {
  return kind === "input" && !isNumberInput(kind, inputType);
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
      return isNumberInput(kind, inputType);
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
 * Empty semantics: null/undefined/"" everywhere, whitespace-only for textual
 * kinds (trimmed for testing only), NaN on number inputs at runtime, and
 * `false` for checkbox — required means must-tick (the consent pattern).
 */
function isEmpty(value: FieldValue | undefined): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "number") {
    return Number.isNaN(value);
  }
  if (typeof value === "boolean") {
    return value === false;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return value.trim() === "";
}

/** Runs the applicable rules in fixed precedence; the first violation wins. */
function evaluate(
  config: FieldConfig,
  value: FieldValue | undefined,
): string | null {
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

    // Fixed precedence: email sits after maxLength and before regex.
    if (
      validator.email !== undefined &&
      fitsEmailRule(config.kind, config.inputType)
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
    initialValue,
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
  const labelId = `${baseId}-label`;
  const panelId = `${baseId}-panel`;
  const searchId = `${baseId}-search`;

  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The Field owns its value: the Initial value seeds it exactly once at
  // mount; afterwards every change flows through commitValue below.
  const [value, setValueState] = useState<FieldValue | undefined>(initialValue);
  const valueRef = useRef<FieldValue | undefined>(initialValue);

  /**
   * Seed-once guard: the Initial prop is compared against the last seen one.
   */
  const lastInitialRef = useRef(initialValue);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }
    if (sameInitial(lastInitialRef.current, initialValue)) {
      return;
    }
    lastInitialRef.current = initialValue;
    console.warn(
      `[Field] initialValue of "${label}" changed after mount. A Field seeds its value once at mount; the new Initial value is ignored.`,
    );
  }, [initialValue, label]);

  // Multi-select popup state: disclosure visibility plus the client-side
  // search query; the query resets whenever the panel closes.
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [announcement, setAnnouncement] = useState<string | null>(null);

  const widgetRef = useRef<HTMLDivElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const chipRemoveRefs = useRef(new Map<string, HTMLButtonElement>());

  // Async Option load lifecycle (loader-form configs only): Pending until the
  // mount-fired loader settles, then Resolved with the Options or Rejected.
  const optionsIsLoader = isOptionsLoader(options);
  const [loadedOptions, setLoadedOptions] = useState<FieldOption[]>([]);
  const [loadStatus, setLoadStatus] = useState<OptionLoadStatus>("pending");

  // validate()/getValue()/setValue() run against the latest committed config,
  // Touched state, and value.
  const configRef = useRef(config);
  const touchedRef = useRef(touched);
  useEffect(() => {
    configRef.current = config;
    touchedRef.current = touched;
    valueRef.current = value;
  });

  /**
   * One honest pipeline for every committed change, however caused — user
   * edit or setValue: install the value internally, notify the observer, and
   * re-evaluate the Error when Touched.
   */
  const commitValue = useCallback((next: FieldValue) => {
    valueRef.current = next;
    setValueState(next);
    configRef.current.onValueChange?.(next);
    if (touchedRef.current) {
      setError(evaluate(configRef.current, next));
    }
  }, []);

  // Retry always re-fires the newest loader the parent passed.
  const loaderRef = useRef(options);
  useEffect(() => {
    loaderRef.current = options;
  });

  // A newer load supersedes an older in-flight one (Retry while still loading).
  const loadTicketRef = useRef(0);

  const runOptionLoad = useCallback(() => {
    if (!isOptionsLoader(loaderRef.current)) {
      return;
    }
    const ticket = ++loadTicketRef.current;
    setLoadStatus("pending");
    loaderRef.current().then(
      (resolved) => {
        if (ticket === loadTicketRef.current) {
          setLoadedOptions(resolved);
          setLoadStatus("resolved");
        }
      },
      () => {
        if (ticket === loadTicketRef.current) {
          setLoadStatus("rejected");
        }
      },
    );
  }, []);

  // The loader fires exactly once on mount; only Retry re-fires it afterwards.
  // The started guard keeps StrictMode's dev double-invoke honest too.
  const mountLoadStartedRef = useRef(false);
  useEffect(() => {
    if (!isOptionsLoader(loaderRef.current) || mountLoadStartedRef.current) {
      return;
    }
    mountLoadStartedRef.current = true;
    runOptionLoad();
  }, [runOptionLoad]);

  useImperativeHandle(
    ref,
    () => ({
      validate: () => {
        const message = evaluate(configRef.current, valueRef.current);
        setTouched(true);
        setError(message);
        return message === null;
      },
      getValue: () => valueRef.current,
      setValue: commitValue,
    }),
    [commitValue],
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
  // Under a loader, Options only become authoritative once a load has resolved.
  const optionsAuthoritative = !optionsIsLoader || loadStatus === "resolved";
  const rawValue = kind === "select" ? selectRawValue(value) : "";
  const selectOptions = optionsIsLoader ? loadedOptions : (options as FieldOption[]);
  const { entries: selectEntries, isStale } = resolveSelectEntries(
    selectOptions,
    rawValue,
    keepDisabledSelection,
    optionsAuthoritative,
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && isStale) {
      console.warn(
        `[Field] Value "${rawValue}" of select "${label}" does not match any Option and is shown as a raw-value fallback.`,
      );
    }
  }, [isStale, rawValue, label]);

  // Multi-select resolution: Chips in Options order plus fallback chips for
  // unknown values; the joined stale list keeps the dev-warn effect stable.
  const selectedValues: string[] =
    kind === "multi-select" && Array.isArray(value) ? value : [];
  const { entries: chips, staleValues } = resolveChips(
    selectOptions,
    selectedValues,
    keepDisabledSelection,
    optionsAuthoritative,
  );
  const staleChipList = staleValues.join('", "');
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && staleChipList !== "") {
      console.warn(
        `[Field] Value(s) "${staleChipList}" of multi-select "${label}" do not match any Option and are shown as raw-value fallback chips.`,
      );
    }
  }, [staleChipList, label]);

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
    commitValue(next);
  };

  const handleBlur = () => {
    // Evaluate the committed (already coerced) value, never the raw event string.
    setTouched(true);
    setError(evaluate(config, value));
  };

  const toggleOption = (optionValue: string) => {
    // In-panel toggles announce nothing extra — clear any pending removal
    // message so a repeated removal re-announces with fresh text.
    setAnnouncement(null);
    commitValue(
      selectedValues.includes(optionValue)
        ? selectedValues.filter((value) => value !== optionValue)
        : [...selectedValues, optionValue],
    );
  };

  const removeChip = (entry: ChipEntry, index: number) => {
    const removedValue = chipValue(entry);
    const removedLabel = chipLabel(entry);
    const next = selectedValues.filter((value) => value !== removedValue);
    commitValue(next);

    // Closed-face removals announce through the shared always-mounted polite
    // region; last message wins. In-panel toggles never reach this path.
    setAnnouncement(`Removed ${removedLabel}. ${next.length} selected.`);

    // Focus hop over the post-removal chip list so focus never rests on a
    // removed node: the chip that took its slot, the last chip, or the open button.
    const { entries: remaining } = resolveChips(
      selectOptions,
      next,
      keepDisabledSelection,
      optionsAuthoritative,
    );
    if (remaining.length === 0) {
      openButtonRef.current?.focus();
      return;
    }
    const hopEntry = remaining[Math.min(index, remaining.length - 1)];
    chipRemoveRefs.current.get(chipValue(hopEntry))?.focus();
  };

  // Every close path funnels here: the panel hides and the search query
  // resets so reopening starts unfiltered.
  const closePanel = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  // Escape anywhere in the widget closes the panel and returns focus to the
  // open button.
  const handleWidgetKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (open && event.key === "Escape") {
      closePanel();
      openButtonRef.current?.focus();
    }
  };

  // Pointer-down outside the widget closes the panel without moving focus.
  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent | Event) => {
      const target = event.target;
      if (target instanceof Node && widgetRef.current?.contains(target)) {
        return;
      }
      closePanel();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [closePanel, open]);

  const toggleOpen = () => {
    // The popup only ever opens once options are resolved — Pending and
    // Rejected refuse outright, independent of the disabled open button.
    if (!open && optionsLoadBlocked) {
      return;
    }
    if (open) {
      closePanel();
    } else {
      setOpen(true);
    }
  };

  // Focus leaving the whole widget (Tab-out or otherwise) closes the panel
  // naturally — no trap — and counts as leaving the field for the Touched
  // lifecycle. Internal focus moves are ignored.
  const handleWidgetBlur = (event: FocusEvent<HTMLDivElement>) => {
    const next = event.relatedTarget;
    if (next instanceof Node && widgetRef.current?.contains(next)) {
      return;
    }
    if (open) {
      closePanel();
    }
    setTouched(true);
    setError(evaluate(config, value));
  };

  // Opening moves DOM focus to the search input.
  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    }
  }, [open]);

  // The search filters resolved Options client-side; filtered rows leave the
  // accessibility tree because they are not rendered at all.
  const query = search.trim().toLowerCase();
  const panelRows = selectOptions.filter((option) =>
    option.label.toLowerCase().includes(query),
  );

  // Pending/Rejected block choosing on choice kinds; the parent's own
  // disabled flag still applies independently.
  const optionsLoadBlocked =
    optionsIsLoader && loadStatus !== "resolved";
  const multiDisabled = disabled || optionsLoadBlocked;

  const controlProps: ControlAttributes = {
    id: controlId,
    disabled: disabled || (kind === "select" && optionsLoadBlocked) || undefined,
    "aria-required": isRequired || undefined,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": `${hintId} ${errorId}`,
  };

  // NaN and seeded-nothing display as Empty; React would otherwise stringify
  // them into the control. Checkboxes render `checked` instead, so booleans
  // never reach this value.
  const displayValue: string | number =
    value === undefined ||
    typeof value === "boolean" ||
    Array.isArray(value)
      ? ""
      : isNumberInput(kind, inputType) &&
          typeof value === "number" &&
          Number.isNaN(value)
        ? ""
        : value;

  // The composite multi-select has no single native control to host failure
  // state, so the named closed-face group anchors it. Spread deliberately:
  // jsx-a11y's role map has no entry for these on `group`, but the DOM/a11y
  // contract requires aria-invalid while failing and wired aria-required.
  const groupStatusAttributes = {
    "aria-required": isRequired || undefined,
    "aria-invalid": error ? true : undefined,
  };

  return (
    <div className={className}>
      {kind === "multi-select" ? (
        <>
          {/* The visible label names the closed-face group via aria-labelledby — never content-computed. */}
          <label id={labelId} className={LABEL_CLASS}>
            {label}
            {requiredMarker}
          </label>

          <div
            ref={widgetRef}
            className="relative mt-1.5"
            onBlur={handleWidgetBlur}
            onKeyDown={handleWidgetKeyDown}
          >
            <div
              role="group"
              id={controlId}
              aria-labelledby={labelId}
              aria-describedby={`${hintId} ${errorId}`}
              {...groupStatusAttributes}
              className="flex items-stretch gap-1.5"
            >
              <div className={CHIP_STRIP_CLASS}>
                {chips.map((entry, index) => (
                  <span key={chipValue(entry)} className={CHIP_CLASS}>
                    <span className="max-w-40 truncate">
                      {chipLabel(entry)}
                    </span>
                    <button
                      type="button"
                      ref={(element) => {
                        if (element) {
                          chipRemoveRefs.current.set(chipValue(entry), element);
                        } else {
                          chipRemoveRefs.current.delete(chipValue(entry));
                        }
                      }}
                      aria-label={`Remove ${chipLabel(entry)}`}
                      disabled={multiDisabled || undefined}
                      onClick={() => removeChip(entry, index)}
                      className={CHIP_REMOVE_CLASS}
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 12 12"
                        fill="none"
                        className="size-3"
                      >
                        <path
                          d="M3 3l6 6M9 3l-6 6"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                ref={openButtonRef}
                onClick={toggleOpen}
                disabled={multiDisabled || undefined}
                aria-expanded={open}
                aria-controls={panelId}
                aria-label="Show options"
                className={OPEN_BUTTON_CLASS}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  fill="none"
                  className="size-4"
                >
                  <path
                    d="M4 6l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            {/* Plain disclosure popup: no dialog/listbox role, no focus trap. */}
            <div id={panelId} hidden={!open} className={PANEL_CLASS}>
              <label htmlFor={searchId} className="sr-only">
                Search options
              </label>
              <input
                ref={searchRef}
                id={searchId}
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className={`${CONTROL_CLASS} mt-0`}
              />
              <fieldset className="min-w-0 border-0 p-0">
                <legend className="sr-only">Options</legend>
                <div className="max-h-60 space-y-1 overflow-y-auto p-0.5">
                  {panelRows.map((option) => (
                    <label
                      key={option.value}
                      className={
                        ROW_LABEL_CLASS +
                        (option.disabled ? ROW_LABEL_DISABLED_CLASS : "")
                      }
                    >
                      <input
                        type="checkbox"
                        className={CHECKBOX_CLASS}
                        checked={selectedValues.includes(option.value)}
                        disabled={
                          option.disabled || multiDisabled || undefined
                        }
                        onChange={() => toggleOption(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>
        </>
      ) : kind === "checkbox" ? (
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

      {/* Persistent hint slot: Pending/Rejected status lines swap in without unmounting the node. */}
      <p id={hintId} className={HINT_CLASS}>
        {(kind === "select" || kind === "multi-select") &&
        optionsLoadBlocked ? (
          loadStatus === "pending" ? (
            <span className="flex items-center gap-1.5">
              {OPTION_LOAD_SPINNER}
              Loading options…
            </span>
          ) : (
            <>
              <span className={REJECTED_MESSAGE_CLASS}>
                {"Couldn't load options."}
              </span>
              <button
                type="button"
                onClick={runOptionLoad}
                className={RETRY_BUTTON_CLASS}
              >
                Retry
              </button>
            </>
          )
        ) : (
          hint
        )}
      </p>
      <p id={errorId} aria-live="polite" className={ERROR_CLASS}>
        {error && (
          <>
            <span className="sr-only">Error:</span>
            {error}
          </>
        )}
        {/* Multi-select closed-face removal announcements share this polite region, visually hidden. */}
        {announcement && (
          <span className="sr-only">{announcement}</span>
        )}
      </p>
    </div>
  );
}
