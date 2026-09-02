import type { FieldOption, FieldNumberRangeValue, MatchFn } from "../fieldShared";
import type { FieldInputType } from "@/lib/field-validation";
import type { FieldDateRangeValue } from "@/lib/date";

/**
 * The props every Field renderer consumes from the engine: identity, the
 * value pipeline (committed value + onCommit + onBlur for the Test on blur
 * lifecycle), validation feedback (touched/error), and the field-level ARIA
 * attributes the engine has already composed. Each renderer extends this
 * with its kind-specific concerns (options, bounds, etc.) and a matching
 * `value` shape — adapters are present, never typed-any.
 */
export type FieldControlBase<V> = {
  /** The renderer-stable control id — wired into `htmlFor`/`aria-*` by the engine. */
  id: string;
  /** The id the engine uses to anchor hint + error in `aria-describedby`. */
  describedBy: string;
  /** Whether `required` is set — drives the marker and `aria-required`. */
  required: boolean;
  /** The current Error text — the engine reveals it on the polite region. */
  error: string | null;
  /** Disabled is engine-owned: choice-kind `optionsLoadBlocked` flows through here. */
  disabled: boolean;
  /** Install a fresh committed value through the engine's pipeline. */
  onCommit: (next: V) => void;
  /** Mark Touched + re-run the Validator on blur. The renderer calls this verbatim. */
  onBlur: () => void;
};

/**
 * Common props the field kinds that present a single labeled native control
 * (input, textarea, password, number) share: a display value (already coerced
 * for number inputs) plus placeholder + inputType + an optional coercion
 * step applied to raw edits before they reach the engine (number inputs).
 */
export type NativeInputControl<V extends string | number> = FieldControlBase<V> & {
  value: V;
  inputType?: FieldInputType;
  placeholder?: string;
  /** Coerces a raw string edit to the engine's value shape; identity for non-number inputs. */
  coerce?: (raw: string) => V;
};

/** A checkbox renderer — `checked` is the surface, `onCommit` installs a boolean. */
export type CheckboxControlProps = FieldControlBase<boolean> & {
  checked: boolean;
};

/**
 * The number-range renderer: two adjacent number inputs committed as a
 * `FieldNumberRangeValue`. Each end is individually optional so open-ended
 * ranges are representable; absent ends render an empty input.
 */
export type NumberRangeControlProps = FieldControlBase<FieldNumberRangeValue> & {
  value: FieldNumberRangeValue;
};

/**
 * The closed-face pieces a choice kind needs: the Options array (already
 * resolved against the loader lifecycle), the match function, the disabled
 * selection rule, and whether Options are authoritative for staleness.
 */
export type ChoiceControlOptions = {
  options: FieldOption[];
  matches: MatchFn;
  keepDisabledSelection: boolean;
  optionsAuthoritative: boolean;
  /** Async Option load status — Pending/Rejected block choosing. */
  loadStatus: "pending" | "resolved" | "rejected";
  /** Retry handler exposed by the engine for Rejected loads. */
  onRetry: () => void;
  /**
   * True when choosing must be blocked because Options are not yet
   * authoritative (async load Pending or Rejected). The adapter uses this
   * to gate the trigger click and the in-panel row picker.
   */
  blocked: boolean;
};

/**
 * The select renderer's props: the single held value plus the choice-kind
 * shared pieces, plus the engine-supplied ids the disclosure widget and
 * Options popup anchor their ARIA on.
 */
export type SelectControlProps<T> = FieldControlBase<T | undefined> &
  ChoiceControlOptions & {
    value: T | undefined;
    placeholder?: string;
    panelId: string;
    searchId: string;
  };

/**
 * The multi-select renderer's props: the held values plus the choice-kind
 * shared pieces, the selectionDisplay variant, and the panel/search ids.
 * The renderer allocates its own chip-remove map and forwards it back via
 * `getChipRemoveRefs` so the focus-hop on closed-face removal can land on
 * the next chip.
 */
export type MultiSelectControlProps<T> = FieldControlBase<T[]> &
  ChoiceControlOptions & {
    value: T[];
    selectionDisplay: "chips" | "text";
    placeholder?: string;
    panelId: string;
    searchId: string;
    labelId: string;
    /** Optional callback the adapter fires to announce chip removals. */
    onAnnounce?: (message: string) => void;
  };

/**
 * The contract the four date kinds' shared adapter consumes: the value shape
 * (a single ISO string or a `{ from?, to? }` range), the rendered draft
 * preview (when the popup is open the face shows this instead of the
 * committed value), and the engine's commit/clear/preview hooks.
 */
export type DateControlProps = FieldControlBase<string | FieldDateRangeValue> & {
  kind: "date" | "datetime" | "date-range" | "datetime-range";
  value: string | FieldDateRangeValue | undefined;
  /** The Draft preview streamed by the calendar — undefined means use the committed value. */
  draftPreview: string | FieldDateRangeValue | undefined;
  /** Whether the calendar popup is open — drives the trigger's `aria-expanded`. */
  calendarOpen: boolean;
  /** Coerced min/max from the validator, if any — the calendar disables out-of-range dates. */
  min?: string;
  max?: string;
  placeholder?: string;
  onCloseCalendar: () => void;
  onToggleCalendar: () => void;
  /**
   * Streams the draft from the calendar to the engine; the engine stores it
   * as `draftPreview` so the closed face previews the in-progress pick.
   */
  onDraftPreview: (raw: string | FieldDateRangeValue) => void;
  /**
   * Clear commits emptiness through the engine's pipeline AND resets the
   * draft preview so the closed face falls back to the empty state.
   * The popup stays open (Clear's contract).
   */
  onClearCalendar: () => void;
};