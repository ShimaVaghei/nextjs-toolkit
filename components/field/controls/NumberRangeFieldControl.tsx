import type { NumberRangeControlProps } from "./FieldControl";
import { CONTROL_CLASS } from "../fieldShared";

/**
 * The number-range renderer: two adjacent number inputs labelled From and
 * To, committed as a `{ from?, to? }` range. The engine owns the from<=to
 * swap and per-end coercion — the adapter just renders the bound surfaces
 * and routes each edit through `onCommit`. Absent ends and NaN both render
 * as an empty control so React never sees a NaN value.
 */
export function NumberRangeFieldControl({
  fromId,
  toId,
  labelId,
  describedBy,
  required,
  error,
  disabled,
  value,
  onCommit,
  onBlur,
}: NumberRangeControlProps & {
  fromId: string;
  toId: string;
  labelId: string;
}) {
  const groupStatusAttributes = {
    "aria-required": required || undefined,
    "aria-invalid": error ? true : undefined,
  };
  return (
    <div
      className="mt-1.5 flex items-stretch gap-2"
      role="group"
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      {...groupStatusAttributes}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <label htmlFor={fromId} className="sr-only">
          From
        </label>
        <input
          id={fromId}
          type="number"
          value={
            value.from !== undefined && !Number.isNaN(value.from)
              ? value.from
              : ""
          }
          placeholder="From"
          disabled={disabled || undefined}
          onChange={(event) =>
            onCommit({
              from:
                event.target.value.trim() === ""
                  ? undefined
                  : Number(event.target.value),
              to: value.to,
            })
          }
          onBlur={onBlur}
          className={CONTROL_CLASS}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <label htmlFor={toId} className="sr-only">
          To
        </label>
        <input
          id={toId}
          type="number"
          value={
            value.to !== undefined && !Number.isNaN(value.to) ? value.to : ""
          }
          placeholder="To"
          disabled={disabled || undefined}
          onChange={(event) =>
            onCommit({
              from: value.from,
              to:
                event.target.value.trim() === ""
                  ? undefined
                  : Number(event.target.value),
            })
          }
          onBlur={onBlur}
          className={CONTROL_CLASS}
        />
      </div>
    </div>
  );
}