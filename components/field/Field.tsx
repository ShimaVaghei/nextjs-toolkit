"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { ReactNode, Ref } from "react";
import {
  normalizeDateInput,
  type DateInputKind,
  type FieldDateRangeValue,
} from "@/lib/date";

import {
  evaluate,
  isDateKind,
  isNumberInput,
  warnUnfittedRules,
  type FieldInputType,
  type FieldKind,
  type FieldMaxRule,
  type FieldMinRule,
  type FieldValidator,
} from "@/lib/field-validation";

import {
  coerceNumberInput,
  IDENTITY_MATCH,
  LABEL_CLASS,
  HINT_CLASS,
  ERROR_CLASS,
  REJECTED_MESSAGE_CLASS,
  RETRY_BUTTON_CLASS,
  OPTION_LOAD_SPINNER,
  isOptionsLoader,
  normalizeNumberRange,
  resolveChips,
  resolveSelectFace,
  sameInitial,
  describedStaleValue,
  type FieldOption,
  type FieldNumberRangeValue,
  type MatchFn,
  type OptionLoadStatus,
} from "./fieldShared";

import { TextualFieldControl } from "./controls/TextualFieldControl";
import { CheckboxFieldControl } from "./controls/CheckboxFieldControl";
import { NumberRangeFieldControl } from "./controls/NumberRangeFieldControl";
import { SelectFieldControl } from "./controls/SelectFieldControl";
import { MultiSelectFieldControl } from "./controls/MultiSelectFieldControl";
import { DateFieldControl } from "./controls/DateFieldControl";

export type { FieldOption, FieldNumberRangeValue } from "./fieldShared";

export type {
  FieldInputType,
  FieldKind,
  FieldRequiredRule,
  FieldMinRule,
  FieldMaxRule,
  FieldMinLengthRule,
  FieldMaxLengthRule,
  FieldEmailRule,
  FieldRegexRule,
  FieldValidator,
} from "@/lib/field-validation";

/**
 * How a multi-select Field renders its selected Options inside the control:
 * `chips` lays out one removable Chip per selection in a wrapping strip;
 * `text` joins the labels into one comma-separated line that truncates with
 * an ellipsis, the whole string riding the native tooltip.
 */
export type FieldSelectionDisplay = "chips" | "text";

export type FieldValue = string | number | boolean | string[];

/**
 * The value shape each Field kind carries: what Initial seeds, the observer
 * emits, and the Handle reads and installs. Choice kinds take it from the
 * config's T; the rest is fixed.
 */
type FieldValueOf<K extends FieldKind, T> = [K] extends ["select"]
  ? T
  : [K] extends ["multi-select"]
    ? T[]
    : [K] extends ["checkbox"]
      ? boolean
      : [K] extends ["textarea" | "date" | "datetime"]
        ? string
          : [K] extends ["date-range" | "datetime-range"]
            ? FieldDateRangeValue
            : [K] extends ["number-range"]
              ? FieldNumberRangeValue
              : string | number;

export type { FieldDateRangeValue };

/**
 * The config props every Field kind shares: identity, the value pipeline
 * (Initial seed plus observer), validation, and presentation. V is the
 * kind's value shape.
 */
type FieldCommonConfig<V> = {
  label: string;
  /**
   * Optional mount-time seed: read exactly once when the Field mounts, then
   * ignored — undefined seeds nothing. A changed prop after mount draws a
   * dev-only warning; live control flows only through user edits, setValue,
   * and onValueChange observation.
   */
  initialValue?: NoInfer<V>;
  /** Optional observer: fired for every committed change, however caused. */
  onValueChange?: (value: NoInfer<V>) => void;
  validator?: FieldValidator;
  hint?: string;
  disabled?: boolean;
  className?: string;
};

/**
 * The config props only the choice kinds (select, multi-select) consume:
 * where Options come from and how values Match against them.
 */
type FieldChoiceConfig<T> = {
  /** A static array or an async loader fired once on mount and re-fired only by Retry. */
  options?: FieldOption<T>[] | (() => Promise<FieldOption<T>[]>);
  /**
   * Matching override: replaces Object.is reference identity everywhere
   * consistently — closed-face resolution, popup checkbox states, chip
   * membership, and staleness detection. `a` is an Option's value, `b` the
   * held value.
   */
  matchValue?: (a: T, b: T) => boolean;
  /**
   * Whether a held currently-selected-but-disabled Option stays legally
   * selected (default true); false demotes it to the raw-value fallback.
   */
  keepDisabledSelection?: boolean;
};

/**
 * Muted hint text a Field shows while it holds nothing: the native attribute
 * on input and textarea kinds, the closed-face text on select, the empty
 * chip strip's text on multi-select. Checkbox has none.
 */
type FieldPlaceholderConfig = {
  placeholder?: string;
};

/**
 * Internal superset the shared Field component reads from, generic over the
 * Field kind: K picks the value shape (input → string | number,
 * textarea → string, checkbox → boolean) and T is the Option value type the
 * choice kinds (select → T, multi-select → T[]) carry through Initial, the
 * observer, and the Handle. Composed from the same building blocks as the
 * public per-kind configs, plus the props individual kinds add; each wrapper
 * component stamps its own literal kind and exposes a kindless alias
 * (FieldInputConfig, FieldSelectConfig<T>, …), so no config a caller writes
 * ever carries a `kind`.
 */
type FieldConfig<K extends FieldKind = "input", T = unknown> =
  FieldCommonConfig<FieldValueOf<K, T>> &
    FieldChoiceConfig<T> &
    FieldPlaceholderConfig & {
      /** Stamped by the per-kind wrapper components; never set by callers. */
      kind?: K;
      inputType?: FieldInputType;
      selectionDisplay?: FieldSelectionDisplay;
    };

/**
 * The imperative handle a parent obtains from Field via the ref prop,
 * carrying the kind's narrowed value shape. Method syntax keeps handles
 * mutually assignable across differently-narrowed instantiations, so refs
 * flow through harnesses and callbacks without variance friction.
 */
export type FieldHandle<V = FieldValue> = {
  validate(): boolean;
  getValue(): V | undefined;
  setValue(value: V): void;
};

/**
 * A date kind's Min/Max rule value as the ISO date string the calendar module
 * consumes — rules may be a bare string or an object carrying the value.
 */
function coerceDateBound(
  rule: FieldMinRule | FieldMaxRule | undefined,
): string | undefined {
  if (typeof rule === "string") return rule;
  if (typeof rule === "object" && rule && "value" in rule) {
    return String(rule.value);
  }
  return undefined;
}

/**
 * The shared engine behind the nine public Field wrapper components. The
 * engine owns the value lifecycle — ownership of the committed value,
 * **Commit**, the Touched lifecycle, the imperative `FieldHandle`, and the
 * async Options loader — and delegates the actual rendering of the labeled
 * control to a per-kind adapter (`controls/*FieldControl`) behind one
 * `FieldControl` seam. Adding a new kind means writing one adapter; the
 * engine never has to grow a new branch in a switch.
 */
function Field<K extends FieldKind = "input", T = unknown>({
  config,
  ref,
}: {
  config: FieldConfig<K, T>;
  ref?: Ref<FieldHandle<FieldValueOf<K, T>>>;
}) {
  const {
    kind = "input",
    inputType = "text",
    label,
    initialValue,
    validator,
    options = [],
    placeholder,
    keepDisabledSelection = true,
    selectionDisplay = "text",
    hint,
    disabled,
    className,
  } = config;

  // Matching: the configured override or Object.is reference identity,
  // applied at every decision point below.
  const matches = (config.matchValue ?? IDENTITY_MATCH) as MatchFn;

  const baseId = useId();
  const controlId = `${baseId}-control`;
  const fromId = `${baseId}-from`;
  const toId = `${baseId}-to`;
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const labelId = `${baseId}-label`;
  const panelId = `${baseId}-panel`;
  const searchId = `${baseId}-search`;

  const describedBy = `${hintId} ${errorId}`;

  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The Field owns its value: the Initial value seeds it exactly once at
  // mount; afterwards every change flows through commitValue below. The
  // internal value is unbounded — choice kinds carry whatever their Options
  // carry — so it is held as unknown and only the types narrow it.
  const [value, setValueState] = useState<unknown>(initialValue);
  const valueRef = useRef<unknown>(initialValue);

  /**
   * Seed-once guard: the Initial prop is compared against the last seen one
   * under the config's own Matching rule.
   */
  const lastInitialRef = useRef(initialValue);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }
    if (sameInitial(lastInitialRef.current, initialValue, matches)) {
      return;
    }
    lastInitialRef.current = initialValue;
    console.warn(
      `[Field] initialValue of "${label}" changed after mount. A Field seeds its value once at mount; the new Initial value is ignored.`,
    );
  }, [initialValue, label, matches]);

  // Calendar state (date kinds only): the popup's open state plus the
  // Draft preview streamed while the popup is open. The trigger face
  // shows the draft instead of the committed value so the user sees what
  // they are selecting; closing clears it and the face falls back to the
  // committed value (Apply commits, Cancel/Escape discards).
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarDraftPreview, setCalendarDraftPreview] = useState<
    string | FieldDateRangeValue | undefined
  >(undefined);
  const isRangeKind = kind === "date-range" || kind === "datetime-range";

  // Shared polite region for chip-removal announcements.
  const [announcement, setAnnouncement] = useState<string | null>(null);

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
   * re-evaluate the Error when Touched. The observer's narrowed parameter is
   * widened here once: only kind-appropriate values ever reach this pipeline.
   */
  const commitValue = useCallback((next: unknown) => {
    // Date kinds: normalize input through the serialization pipeline.
    const normalized = isDateKind(kind)
      ? normalizeDateInput(
          kind as DateInputKind,
          next as string | FieldDateRangeValue,
          configRef.current.label,
        )
      : next;
    // If normalization returned undefined (invalid input), ignore the change.
    if (isDateKind(kind) && normalized === undefined) {
      return;
    }
    // Number-range kinds: enforce the from <= to swap invariant on every
    // committed change, imperative or user-edit, so a caller can never hold
    // or install an out-of-order pair.
    const finalValue = isDateKind(kind)
      ? normalized
      : kind === "number-range"
        ? normalizeNumberRange(next as FieldNumberRangeValue)
        : next;
    valueRef.current = finalValue;
    setValueState(finalValue);
    (
      configRef.current.onValueChange as ((value: unknown) => void) | undefined
    )?.(finalValue);
    if (touchedRef.current) {
      setError(
        evaluate(kind, inputType, configRef.current.validator, finalValue, true),
      );
    }
  }, [kind, inputType]);

  /**
   * Adapter blur handler — single native/textarea/range/checkbox blur path,
   * and the choice-kind widget's blur funnel (which calls it on focus
   * genuinely leaving the widget). Uses refs so a stale closure never beats
   * the latest committed value/config.
   */
  const handleBlur = useCallback(() => {
    setTouched(true);
    setError(
      evaluate(
        kind,
        inputType,
        configRef.current.validator,
        valueRef.current,
        true,
      ),
    );
  }, [kind, inputType]);

  /**
   * Calendar Clear: installs emptiness directly through the same pipeline,
   * then resets the draft preview so the face falls back to the committed
   * (empty) value. The popup stays open — Clear's contract.
   */
  const handleCalendarClear = () => {
    const empty = isRangeKind ? {} : "";
    valueRef.current = empty;
    setValueState(empty);
    (configRef.current.onValueChange as ((value: unknown) => void) | undefined)?.(empty);
    handleBlur();
    setCalendarDraftPreview(undefined);
  };

  const closeCalendar = useCallback(() => {
    setCalendarOpen(false);
    setCalendarDraftPreview(undefined);
  }, []);

  const toggleCalendar = useCallback(() => {
    setCalendarOpen((wasOpen) => !wasOpen);
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
        const message = evaluate(
          kind,
          inputType,
          configRef.current.validator,
          valueRef.current,
          true,
        );
        setTouched(true);
        setError(message);
        return message === null;
      },
      getValue: () => valueRef.current as FieldValueOf<K, T> | undefined,
      setValue: commitValue,
    }),
    [commitValue, kind, inputType],
  );

  // Dev-only: name any rule configured on a kind it does not fit, whenever the
  // Validator or kind changes.
  useEffect(() => {
    warnUnfittedRules(kind, inputType, validator, label);
  }, [validator, kind, inputType, label]);

  // Choices' options array: under a loader, Options only become
  // authoritative once a load has resolved.
  const selectOptions: FieldOption[] = optionsIsLoader
    ? loadedOptions
    : options;
  const optionsAuthoritative = !optionsIsLoader || loadStatus === "resolved";

  // Pending/Rejected block choosing on choice kinds; the parent's own
  // disabled flag still applies independently.
  const optionsLoadBlocked = optionsIsLoader && loadStatus !== "resolved";

  const rule = validator?.required;
  const isRequired =
    rule !== undefined && (typeof rule === "object" ? rule.value : rule);

  const requiredMarker = isRequired && (
    <>
      {" "}
      <span aria-hidden="true" className="text-red-600 dark:text-red-400">
        *
      </span>{" "}
      <span className="sr-only">(required)</span>
    </>
  );

  // Dev-only staleness warnings — re-fire only when the joined description
  // string changes, so a stable held selection stays quiet.
  const selectFace = resolveSelectFace(
    selectOptions,
    kind === "select" ? value : undefined,
    matches,
    keepDisabledSelection,
    optionsAuthoritative,
  );
  const staleSelectDescription =
    kind === "select" && selectFace.isStale && selectFace.face.kind === "fallback"
      ? describedStaleValue(selectFace.face.value)
      : null;
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && staleSelectDescription !== null) {
      console.warn(
        `[Field] Value ${staleSelectDescription} of select "${label}" does not match any Option and is shown as a fallback.`,
      );
    }
  }, [staleSelectDescription, label]);

  const { staleValues } = resolveChips(
    selectOptions,
    kind === "multi-select" && Array.isArray(value) ? value : [],
    matches,
    keepDisabledSelection,
    optionsAuthoritative,
  );
  const staleMultiDescriptions = staleValues
    .map(describedStaleValue)
    .join('", "');
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" && staleMultiDescriptions !== "") {
      console.warn(
        `[Field] Value(s) ${staleMultiDescriptions} of multi-select "${label}" do not match any Option and are shown as fallbacks.`,
      );
    }
  }, [staleMultiDescriptions, label]);

  // ─── Render: pick a kind adapter behind one seam ────────────────────
  const common = {
    id: controlId,
    describedBy,
    required: !!isRequired,
    error,
    disabled: !!disabled,
    onCommit: commitValue,
    onBlur: handleBlur,
  } as const;

  let control: ReactNode;
  if (kind === "input" || kind === "textarea") {
    // NaN and seeded-nothing display as Empty; React would otherwise
    // stringify them into the control. Checkboxes render `checked` instead.
    const textualValue: string | number =
      typeof value === "number"
        ? isNumberInput(kind, inputType) && Number.isNaN(value)
          ? ""
          : value
        : typeof value === "string"
          ? value
          : "";
    control = (
      <TextualFieldControl
        {...common}
        value={textualValue}
        inputType={inputType}
        placeholder={placeholder}
        multiline={kind === "textarea"}
        coerce={
          isNumberInput(kind, inputType) ? coerceNumberInput : undefined
        }
      />
    );
  } else if (kind === "checkbox") {
    control = (
      <CheckboxFieldControl
        {...common}
        checked={value === true}
        label={label}
      />
    );
  } else if (kind === "select") {
    control = (
      <SelectFieldControl
        {...common}
        value={value}
        placeholder={placeholder}
        options={selectOptions}
        matches={matches}
        keepDisabledSelection={keepDisabledSelection}
        optionsAuthoritative={optionsAuthoritative}
        loadStatus={loadStatus}
        blocked={optionsLoadBlocked}
        onRetry={runOptionLoad}
        panelId={panelId}
        searchId={searchId}
      />
    );
  } else if (kind === "multi-select") {
    control = (
      <MultiSelectFieldControl
        {...common}
        value={Array.isArray(value) ? value : []}
        selectionDisplay={selectionDisplay}
        placeholder={placeholder}
        labelId={labelId}
        options={selectOptions}
        matches={matches}
        keepDisabledSelection={keepDisabledSelection}
        optionsAuthoritative={optionsAuthoritative}
        loadStatus={loadStatus}
        blocked={optionsLoadBlocked}
        onRetry={runOptionLoad}
        panelId={panelId}
        searchId={searchId}
        onAnnounce={setAnnouncement}
      />
    );
  } else if (kind === "number-range") {
    control = (
      <NumberRangeFieldControl
        {...common}
        fromId={fromId}
        toId={toId}
        labelId={labelId}
        value={(value as FieldNumberRangeValue | undefined) ?? {}}
      />
    );
  } else {
    // Date kinds: date, datetime, date-range, datetime-range.
    control = (
      <DateFieldControl
        {...common}
        kind={kind as "date" | "datetime" | "date-range" | "datetime-range"}
        value={
          value as string | FieldDateRangeValue | undefined
        }
        draftPreview={calendarDraftPreview}
        calendarOpen={calendarOpen}
        min={coerceDateBound(validator?.min)}
        max={coerceDateBound(validator?.max)}
        placeholder={placeholder}
        onCloseCalendar={closeCalendar}
        onToggleCalendar={toggleCalendar}
        onDraftPreview={setCalendarDraftPreview}
        onClearCalendar={handleCalendarClear}
      />
    );
  }

  // Date kinds & select need the label OUTSIDE the adapter (the adapter
  // renders the trigger). Number-range and multi-select render the label
  // names themselves via aria-labelledby inside the adapter. For the
  // textually-controlled kinds (input, textarea, checkbox) we keep the
  // existing label strategy.
  const labelIsGroupNamed =
    kind === "multi-select" || kind === "number-range";
  const labelIsCheckbox = kind === "checkbox";

  return (
    <div className={className}>
      {!labelIsGroupNamed && !labelIsCheckbox && (
        <label htmlFor={controlId} className={LABEL_CLASS}>
          {label}
          {requiredMarker}
        </label>
      )}

      {labelIsGroupNamed && (
        <label id={labelId} className={LABEL_CLASS}>
          {label}
          {requiredMarker}
        </label>
      )}

      {control}

      {/* Persistent hint slot: Pending/Rejected status lines swap in without unmounting the node. */}
      <p id={hintId} className={HINT_CLASS}>
        {(kind === "select" || kind === "multi-select") && optionsLoadBlocked ? (
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
        {announcement && <span className="sr-only">{announcement}</span>}
      </p>
    </div>
  );
}

// ─── Staleness warn helpers ────────────────────────────────────────────
//
// The descriptions above are computed during render and consumed by useEffects
// keyed on the joined description string — so a stable held selection stays
// quiet, and a new value re-evaluates the warning on the next render.

/**
 * The config for an InputField: value shape fixed at `string | number`,
 * plus the Input type and the native placeholder attribute.
 */
export type FieldInputConfig = FieldCommonConfig<string | number> &
  FieldPlaceholderConfig & {
    inputType?: FieldInputType;
  };

/** The config for a TextareaField: value shape fixed at `string`. */
export type FieldTextareaConfig = FieldCommonConfig<string> &
  FieldPlaceholderConfig;

/** The config for a CheckboxField: value shape fixed at `boolean`. */
export type FieldCheckboxConfig = FieldCommonConfig<boolean>;

/**
 * The config for a SelectField: `initialValue`, `onValueChange`, Options,
 * and `matchValue` narrow to T, the Option value type.
 */
export type FieldSelectConfig<T = unknown> = FieldCommonConfig<T> &
  FieldChoiceConfig<T> &
  FieldPlaceholderConfig;

/**
 * The config for a MultiSelectField: `initialValue`, `onValueChange`,
 * Options, and `matchValue` narrow to T, the Option value type; the Field
 * holds a `T[]`. `selectionDisplay` chooses how the selection renders inside
 * the control — `chips` or `text`, defaulting to `text`.
 */
export type FieldMultiSelectConfig<T = unknown> = FieldCommonConfig<T[]> &
  FieldChoiceConfig<T> &
  FieldPlaceholderConfig & {
    /** Applied live per render like the other presentation props. */
    selectionDisplay?: FieldSelectionDisplay;
  };

/** The config for a DateField: value shape fixed at `string` (ISO date). */
export type FieldDateConfig = FieldCommonConfig<string> &
  FieldPlaceholderConfig;

/** The config for a DateTimeField: value shape fixed at `string` (ISO datetime). */
export type FieldDateTimeConfig = FieldCommonConfig<string> &
  FieldPlaceholderConfig;

/**
 * The config for a DateRangeField: value shape fixed at `FieldDateRangeValue`.
 * Both ends are optional so half-picks are representable.
 */
export type FieldDateRangeConfig = FieldCommonConfig<FieldDateRangeValue> &
  FieldPlaceholderConfig;

/**
 * The config for a DateTimeRangeField: value shape fixed at `FieldDateRangeValue`.
 * Both ends are optional so half-picks are representable.
 */
export type FieldDateTimeRangeConfig = FieldCommonConfig<FieldDateRangeValue> &
  FieldPlaceholderConfig;

/**
 * The config for a NumberRangeField: value shape fixed at
 * `FieldNumberRangeValue`. Both ends are individually optional so open-ended
 * ranges are representable. The From/To placeholders are fixed by the kind —
 * no config surface for them.
 */
export type FieldNumberRangeConfig = FieldCommonConfig<FieldNumberRangeValue>;

/** An input Field: one labeled single-line control, narrowed by Input type. */
export function InputField({
  config,
  ref,
}: {
  config: FieldInputConfig;
  ref?: Ref<FieldHandle<string | number>>;
}) {
  return <Field config={{ ...config, kind: "input" }} ref={ref} />;
}

/** A textarea Field: one labeled multi-line text control. */
export function TextareaField({
  config,
  ref,
}: {
  config: FieldTextareaConfig;
  ref?: Ref<FieldHandle<string>>;
}) {
  return <Field config={{ ...config, kind: "textarea" }} ref={ref} />;
}

/** A checkbox Field: one labeled tick box (required = must-tick). */
export function CheckboxField({
  config,
  ref,
}: {
  config: FieldCheckboxConfig;
  ref?: Ref<FieldHandle<boolean>>;
}) {
  return <Field config={{ ...config, kind: "checkbox" }} ref={ref} />;
}

/** A select Field: single choice from searchable Options in a disclosure. */
export function SelectField<T>({
  config,
  ref,
}: {
  config: FieldSelectConfig<T>;
  ref?: Ref<FieldHandle<T>>;
}) {
  return <Field<"select", T> config={{ ...config, kind: "select" }} ref={ref} />;
}

/**
 * A multi-select Field: multiple choice from searchable Options. The
 * Selection display picks the closed face — a comma-joined text line by
 * default, or removable Chips via `selectionDisplay: "chips"`.
 */
export function MultiSelectField<T>({
  config,
  ref,
}: {
  config: FieldMultiSelectConfig<T>;
  ref?: Ref<FieldHandle<T[]>>;
}) {
  return (
    <Field<"multi-select", T>
      config={{ ...config, kind: "multi-select" }}
      ref={ref}
    />
  );
}

/** A date Field: one labeled control for a calendar date. */
export function DateField({
  config,
  ref,
}: {
  config: FieldDateConfig;
  ref?: Ref<FieldHandle<string>>;
}) {
  return <Field<"date"> config={{ ...config, kind: "date" }} ref={ref} />;
}

/** A datetime Field: one labeled control for a date + time. */
export function DateTimeField({
  config,
  ref,
}: {
  config: FieldDateTimeConfig;
  ref?: Ref<FieldHandle<string>>;
}) {
  return <Field<"datetime"> config={{ ...config, kind: "datetime" }} ref={ref} />;
}

/** A date-range Field: one labeled control for a start and end date. */
export function DateRangeField({
  config,
  ref,
}: {
  config: FieldDateRangeConfig;
  ref?: Ref<FieldHandle<FieldDateRangeValue>>;
}) {
  return (
    <Field<"date-range">
      config={{ ...config, kind: "date-range" }}
      ref={ref}
    />
  );
}

/**
 * A datetime-range Field: one labeled control for a start and end datetime.
 */
export function DateTimeRangeField({
  config,
  ref,
}: {
  config: FieldDateTimeRangeConfig;
  ref?: Ref<FieldHandle<FieldDateRangeValue>>;
}) {
  return (
    <Field<"datetime-range">
      config={{ ...config, kind: "datetime-range" }}
      ref={ref}
    />
  );
}

/** A number-range Field: one labelled control for a from and to numeric bound. */
export function NumberRangeField({
  config,
  ref,
}: {
  config: FieldNumberRangeConfig;
  ref?: Ref<FieldHandle<FieldNumberRangeValue>>;
}) {
  return (
    <Field<"number-range">
      config={{ ...config, kind: "number-range" }}
      ref={ref}
    />
  );
}
