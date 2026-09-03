import type { CheckboxControlProps } from "./FieldControl";
import { CHECKBOX_CLASS, CHECKBOX_ROW_CLASS, CHECKBOX_LABEL_CLASS } from "../fieldShared";

/**
 * The checkbox renderer: a labeled tick box. `required` means must-tick —
 * the engine's `isEmpty` rule for booleans treats `false` as Empty, so this
 * adapter just exposes `checked`/`onCommit` and never its own validity.
 */
export function CheckboxFieldControl({
  id,
  describedBy,
  label,
  required,
  error,
  disabled,
  checked,
  onCommit,
  onBlur,
}: CheckboxControlProps & { label: string }) {
  const requiredMarker = required && (
    <>
      {" "}
      <span aria-hidden="true" className="text-red-600 dark:text-red-400">
        *
      </span>{" "}
      <span className="sr-only">(required)</span>
    </>
  );
  return (
    <div className={CHECKBOX_ROW_CLASS}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled || undefined}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onCommit(event.target.checked)}
        onBlur={onBlur}
        className={CHECKBOX_CLASS}
      />
      <label htmlFor={id} className={CHECKBOX_LABEL_CLASS}>
        {label}
        {requiredMarker}
      </label>
    </div>
  );
}