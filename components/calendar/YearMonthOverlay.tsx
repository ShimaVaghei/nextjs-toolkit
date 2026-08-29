"use client";

// ─── YearMonthOverlay (private sibling) ────────────────────────────────
//
// The Month/year picker overlay within a Calendar popup. Package-internal:
// it is imported only by CalendarPopup and is not part of the module's
// public interface. It manages its own stacked two-step flow (years first,
// then months) and always opens at the year panel regardless of prior state.

import { useEffect, useRef, useState } from "react";
import { pad2 } from "@/lib/date";
import {
  CALENDAR_DAY_DISABLED_CLASS,
  CALENDAR_DAY_SELECTED_CLASS,
  CALENDAR_HEADER_CLASS,
  CALENDAR_MONTH_CLASS,
  CALENDAR_NAV_BUTTON_CLASS,
  CALENDAR_NAV_BUTTON_DISABLED_CLASS,
  CALENDAR_YEAR_BUTTON_CLASS,
  CALENDAR_YEAR_GRID_CLASS,
  daysInMonth,
  extractYearBound,
  isMonthDisabled,
  isYearDisabled,
  MONTH_LABELS,
} from "./calendarShared";

type OverlayScreen = "year" | "month";

export function YearMonthOverlay({
  draftYear,
  draftMonth,
  draftDay,
  min,
  max,
  onDraftChange,
  onClose,
  onReturn,
}: {
  draftYear: number;
  draftMonth: number;
  draftDay: number;
  min?: string;
  max?: string;
  onDraftChange: (date: string) => void;
  onClose: () => void;
  onReturn: () => void;
}) {
  const [screen, setScreen] = useState<OverlayScreen>("year");
  const [decadeOffset, setDecadeOffset] = useState(0);
  const [focusedYearIdx, setFocusedYearIdx] = useState<number | null>(null);
  const [focusedMonthIdx, setFocusedMonthIdx] = useState<number | null>(null);
  const yearGridRef = useRef<HTMLDivElement>(null);
  const monthGridRef = useRef<HTMLDivElement>(null);

  const decadeStart =
    (draftYear || new Date().getFullYear()) -
    ((draftYear || new Date().getFullYear()) % 12) +
    decadeOffset * 12;

  // Focus the selected year when the year panel opens.
  useEffect(() => {
    if (screen !== "year" || !yearGridRef.current) return;
    const selectedBtn =
      yearGridRef.current.querySelector<HTMLElement>('[aria-selected="true"]');
    if (selectedBtn) {
      const yearVal = parseInt(selectedBtn.textContent || "0", 10);
      setFocusedYearIdx(yearVal - decadeStart);
      selectedBtn.focus({ preventScroll: true });
    }
  }, [screen, decadeStart]);

  // Focus the selected month when the month panel opens.
  useEffect(() => {
    if (screen !== "month" || !monthGridRef.current) return;
    const selectedBtn =
      monthGridRef.current.querySelector<HTMLElement>('[aria-selected="true"]');
    if (selectedBtn) {
      const label = selectedBtn.getAttribute("aria-label") || "";
      const monthIdx = MONTH_LABELS.indexOf(label);
      if (monthIdx >= 0) {
        setFocusedMonthIdx(monthIdx);
        selectedBtn.focus({ preventScroll: true });
      }
    }
  }, [screen]);

  const handleGridNavigation = (
    e: React.KeyboardEvent,
    gridRef: React.RefObject<HTMLDivElement | null>,
    focusedIdx: number | null,
    setFocusedIdx: (idx: number) => void,
    onSelect: () => void,
  ) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      onSelect();
      return;
    }
    const buttons = gridRef.current?.querySelectorAll<HTMLButtonElement>(
      ':scope > [role="gridcell"]',
    );
    if (!buttons || buttons.length === 0) return;
    const cols = 3;
    const total = buttons.length;
    let idx = focusedIdx ?? 0;
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        idx = Math.min(idx + 1, total - 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        idx = Math.max(idx - 1, 0);
        break;
      case "ArrowDown":
        e.preventDefault();
        idx = Math.min(idx + cols, total - 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        idx = Math.max(idx - cols, 0);
        break;
      default:
        return;
    }
    setFocusedIdx(idx);
    buttons[idx]?.focus();
  };

  const handleYearGridKeyDown = (e: React.KeyboardEvent) => {
    handleGridNavigation(e, yearGridRef, focusedYearIdx, setFocusedYearIdx, () => {
      const year = decadeStart + (focusedYearIdx ?? 0);
      const nm = draftMonth;
      const nd = Math.min(draftDay, daysInMonth(year, nm));
      onDraftChange(`${year}-${pad2(nm)}-${pad2(nd)}`);
      setScreen("month");
    });
  };

  const handleMonthGridKeyDown = (e: React.KeyboardEvent) => {
    handleGridNavigation(e, monthGridRef, focusedMonthIdx, setFocusedMonthIdx, () => {
      const monthNum = (focusedMonthIdx ?? 0) + 1;
      const nd = Math.min(draftDay, daysInMonth(draftYear, monthNum));
      onDraftChange(`${draftYear}-${pad2(monthNum)}-${pad2(nd)}`);
      onReturn();
    });
  };

  const minYear = extractYearBound(min);
  const maxYear = extractYearBound(max);
  const prevDecadeDisabled = minYear !== null && decadeStart <= minYear;
  const nextDecadeDisabled =
    maxYear !== null && decadeStart + 11 >= maxYear;

  return (
    <>
      <div className={CALENDAR_HEADER_CLASS}>
        <button
          type="button"
          aria-label="Previous decade"
          disabled={prevDecadeDisabled || undefined}
          className={`${CALENDAR_NAV_BUTTON_CLASS}${
            prevDecadeDisabled ? ` ${CALENDAR_NAV_BUTTON_DISABLED_CLASS}` : ""
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            setDecadeOffset((prev) => prev - 1);
          }}
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="size-4">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span className={CALENDAR_MONTH_CLASS}>
          {decadeStart}–{decadeStart + 11}
        </span>
        <button
          type="button"
          aria-label="Next decade"
          disabled={nextDecadeDisabled || undefined}
          className={`${CALENDAR_NAV_BUTTON_CLASS}${
            nextDecadeDisabled ? ` ${CALENDAR_NAV_BUTTON_DISABLED_CLASS}` : ""
          }`}
          onMouseDown={(e) => {
            e.preventDefault();
            setDecadeOffset((prev) => prev + 1);
          }}
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="size-4">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {screen === "year" ? (
        <div
          ref={yearGridRef}
          role="grid"
          aria-label="Choose year"
          className={CALENDAR_YEAR_GRID_CLASS}
          onKeyDown={handleYearGridKeyDown}
        >
          {Array.from({ length: 12 }, (_, i) => {
            const year = decadeStart + i;
            const isSelected = year === draftYear;
            const disabled = isYearDisabled(year, minYear, maxYear);
            const isFocused = focusedYearIdx !== null ? focusedYearIdx === i : isSelected;
            return (
              <button
                key={year}
                type="button"
                role="gridcell"
                aria-selected={isSelected || undefined}
                aria-disabled={disabled || undefined}
                disabled={disabled || undefined}
                className={`${CALENDAR_YEAR_BUTTON_CLASS}${
                  isSelected ? ` ${CALENDAR_DAY_SELECTED_CLASS}` : ""
                }${disabled ? ` ${CALENDAR_DAY_DISABLED_CLASS}` : ""}`}
                tabIndex={isFocused ? 0 : -1}
                onMouseDown={(e) => {
                  e.preventDefault();
                  const nm = draftMonth;
                  const nd = Math.min(draftDay, daysInMonth(year, nm));
                  onDraftChange(`${year}-${pad2(nm)}-${pad2(nd)}`);
                  setScreen("month");
                }}
              >
                {year}
              </button>
            );
          })}
        </div>
      ) : (
        <div
          ref={monthGridRef}
          role="grid"
          aria-label="Choose month"
          className={CALENDAR_YEAR_GRID_CLASS}
          onKeyDown={handleMonthGridKeyDown}
        >
          {MONTH_LABELS.map((label, i) => {
            const monthNum = i + 1;
            const isSelected = monthNum === draftMonth;
            const disabled = isMonthDisabled(draftYear, monthNum, min, max);
            const isFocused = focusedMonthIdx !== null ? focusedMonthIdx === i : isSelected;
            return (
              <button
                key={monthNum}
                type="button"
                role="gridcell"
                aria-selected={isSelected || undefined}
                aria-disabled={disabled || undefined}
                aria-label={label}
                disabled={disabled || undefined}
                className={`${CALENDAR_YEAR_BUTTON_CLASS}${
                  isSelected ? ` ${CALENDAR_DAY_SELECTED_CLASS}` : ""
                }${disabled ? ` ${CALENDAR_DAY_DISABLED_CLASS}` : ""}`}
                tabIndex={isFocused ? 0 : -1}
                onMouseDown={(e) => {
                  e.preventDefault();
                  const nd = Math.min(draftDay, daysInMonth(draftYear, monthNum));
                  onDraftChange(`${draftYear}-${pad2(monthNum)}-${pad2(nd)}`);
                  onReturn();
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

export default YearMonthOverlay;