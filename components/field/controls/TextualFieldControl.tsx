import type { NativeInputControl } from "./FieldControl";
import { CONTROL_CLASS } from "../fieldShared";

/**
 * The shared native-control renderer used by the input and textarea kinds:
 * one labeled control whose value flows back through `onCommit` and whose
 * blur signals the engine to re-run the Validator. Number-input coercion
 * (empty → "", garbage → NaN) is the engine's job; the adapter hands the
 * pre-coerced value straight to the DOM.
 */
export function TextualFieldControl<V extends string | number>({
  id,
  describedBy,
  required,
  error,
  disabled,
  value,
  inputType,
  placeholder,
  coerce,
  onCommit,
  onBlur,
  multiline,
  rows,
}: NativeInputControl<V> & {
  multiline?: boolean;
  rows?: number;
}) {
  const ariaProps = {
    id,
    disabled: disabled || undefined,
    "aria-required": required || undefined,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  };
  const coerceOrIdentity = (raw: string): V =>
    coerce ? (coerce(raw) as V) : (raw as unknown as V);
  if (multiline) {
    return (
      <textarea
        {...ariaProps}
        value={value as string}
        placeholder={placeholder}
        onChange={(event) => onCommit(coerceOrIdentity(event.target.value))}
        onBlur={onBlur}
        rows={rows ?? 4}
        className={`${CONTROL_CLASS} resize-y`}
      />
    );
  }
  return (
    <input
      {...ariaProps}
      type={inputType ?? "text"}
      value={value as string | number}
      placeholder={placeholder}
      onChange={(event) => onCommit(coerceOrIdentity(event.target.value))}
      onBlur={onBlur}
      className={CONTROL_CLASS}
    />
  );
}