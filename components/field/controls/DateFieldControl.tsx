"use client";

import { useRef } from "react";
import type { DateControlProps } from "./FieldControl";
import {
  DATE_DISPLAY_FORMAT,
  DATETIME_DISPLAY_FORMAT,
  type FieldDateRangeValue,
} from "@/lib/date";
import { SELECT_TRIGGER_CLASS, SELECT_FACE_GHOST_CLASS } from "../fieldShared";
import { CalendarPopup } from "../../calendar";

/**
 * The shared date adapter used by all four date kinds (date, datetime,
 * date-range, datetime-range): a closed-face trigger button showing the
 * formatted committed value (or the Draft preview while the calendar is
 * open), opening the `CalendarPopup` for picks. The adapter owns the
 * calendar composition — calendar concerns never leak into the engine.
 */
export function DateFieldControl({
  kind,
  id,
  describedBy,
  required,
  error,
  disabled,
  value,
  draftPreview,
  calendarOpen,
  min,
  max,
  placeholder,
  onCommit,
  onCloseCalendar,
  onToggleCalendar,
  onDraftPreview,
  onClearCalendar,
}: DateControlProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = `${id}-calendar`;
  const gridId = `${id}-calendar-grid`;
  const isRangeKind = kind === "date-range" || kind === "datetime-range";

  const faceValue =
    calendarOpen && draftPreview !== undefined ? draftPreview : value;

  return (
    <div className="relative mt-1.5">
      <button
        type="button"
        id={id}
        ref={triggerRef}
        disabled={disabled || undefined}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-expanded={calendarOpen}
        aria-controls={panelId}
        onClick={onToggleCalendar}
        className={SELECT_TRIGGER_CLASS}
      >
        <span
          className={!faceValue ? SELECT_FACE_GHOST_CLASS : undefined}
        >
          {isRangeKind ? (
            typeof faceValue === "object" &&
            faceValue !== null &&
            "from" in faceValue ? (
              (() => {
                const rangeVal = faceValue as FieldDateRangeValue;
                const formatSingle = (iso: string | undefined) => {
                  if (!iso) return "";
                  const d = new Date(iso);
                  if (Number.isNaN(d.getTime())) return "";
                  return kind === "date-range"
                    ? DATE_DISPLAY_FORMAT.format(d)
                    : DATETIME_DISPLAY_FORMAT.format(d);
                };
                const fromStr = formatSingle(rangeVal.from);
                const toStr = formatSingle(rangeVal.to);
                if (fromStr && toStr) return `${fromStr} – ${toStr}`;
                if (fromStr) return `${fromStr} –`;
                if (toStr) return `– ${toStr}`;
                return "";
              })()
            ) : null
          ) : faceValue ? (
            (() => {
              const d = new Date(String(faceValue));
              if (Number.isNaN(d.getTime())) return "";
              return kind === "date"
                ? DATE_DISPLAY_FORMAT.format(d)
                : DATETIME_DISPLAY_FORMAT.format(d);
            })()
          ) : null}
          {!isRangeKind && !faceValue && placeholder}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          className="size-4 shrink-0 text-neutral-500 dark:text-neutral-400"
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

      <CalendarPopup
        kind={kind as "date" | "datetime" | "date-range" | "datetime-range"}
        value={value}
        min={min}
        max={max}
        triggerRef={triggerRef}
        open={calendarOpen}
        onClose={onCloseCalendar}
        onCommit={onCommit}
        onClear={onClearCalendar}
        onDraftPreview={onDraftPreview}
        panelId={panelId}
        gridId={gridId}
      />
    </div>
  );
}