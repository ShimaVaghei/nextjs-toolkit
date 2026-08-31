// ─── Internal shared helpers for the calendar module ──────────────────
//
// These names are package-internal to the calendar popup module. The only
// public interface of the module is `CalendarPopup`; this file carries the
// CSS tokens and pure date helpers both CalendarPopup and YearMonthOverlay
// rely on, so extracted ownership does not force them to leak through the
// public component's props.

import { pad2, utcDateParts } from "@/lib/date";

// ─── Calendar widget tokens ────────────────────────────────────────────

export const CALENDAR_PANEL_BASE_CLASS =
  "absolute left-0 right-0 z-10 rounded-md border border-neutral-300 bg-white p-3 shadow-md " +
  "dark:border-neutral-700 dark:bg-neutral-900";
export const CALENDAR_PANEL_BELOW_CLASS = "top-full mt-1.5";
export const CALENDAR_PANEL_ABOVE_CLASS = "bottom-full mb-1.5";

/**
 * Decide whether the calendar popup opens below ("bottom") or above ("top")
 * the field, given the trigger's bounding rect, the panel height, and the
 * viewport height. Prefers below; flips above when the panel would overflow
 * the viewport bottom and there is more room above.
 */
export function resolveCalendarPlacement(
  triggerRect: { top: number; bottom: number },
  panelHeight: number,
  viewportHeight: number,
): "top" | "bottom" {
  const spaceBelow = viewportHeight - triggerRect.bottom;
  const spaceAbove = triggerRect.top;
  if (spaceBelow >= panelHeight) return "bottom";
  if (spaceAbove >= panelHeight) return "top";
  return spaceAbove > spaceBelow ? "top" : "bottom";
}

export const CALENDAR_HEADER_CLASS = "flex items-center justify-between mb-2";

export const CALENDAR_MONTH_CLASS =
  "text-sm font-medium text-neutral-900 dark:text-neutral-100";

export const CALENDAR_HEADER_BUTTON_CLASS =
  "text-sm font-medium text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 rounded-md px-2 py-1 dark:hover:bg-neutral-800 dark:focus:ring-neutral-400/30 cursor-pointer";

export const CALENDAR_NAV_BUTTON_CLASS =
  "flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:focus:ring-neutral-400/30";

export const CALENDAR_WEEKDAY_CLASS =
  "flex h-8 w-8 items-center justify-center text-xs font-medium text-neutral-500 dark:text-neutral-400";

export const CALENDAR_DAY_CLASS =
  "flex h-8 w-8 items-center justify-center rounded-md text-sm text-neutral-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus:ring-neutral-400/30";

export const CALENDAR_DAY_SELECTED_CLASS =
  "bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200";

export const CALENDAR_DAY_TODAY_CLASS =
  "ring-1 ring-neutral-400 dark:ring-neutral-500";

export const CALENDAR_DAY_OUT_OF_MONTH_CLASS =
  "text-neutral-300 hover:text-neutral-500 dark:text-neutral-600 dark:hover:text-neutral-400";

export const CALENDAR_DAY_IN_RANGE_CLASS =
  "bg-neutral-100 dark:bg-neutral-800";

export const CALENDAR_DAY_DISABLED_CLASS =
  "cursor-not-allowed opacity-50";

export const CALENDAR_TIME_CLASS = "flex items-center gap-2 mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700";

export const CALENDAR_TIME_INPUT_CLASS =
  "w-12 rounded-md border border-neutral-300 bg-white px-2 py-1 text-center text-sm text-neutral-900 " +
  "focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 " +
  "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 " +
  "dark:focus:border-neutral-400 dark:focus:ring-neutral-400/30";

export const CALENDAR_TIME_COLON_CLASS = "text-sm text-neutral-500 dark:text-neutral-400";

export const CALENDAR_ACTIONS_CLASS = "flex justify-end gap-2 mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-700";

export const CALENDAR_ACTION_BUTTON_CLASS =
  "rounded-md px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-neutral-500/30 dark:focus:ring-neutral-400/30";

export const CALENDAR_APPLY_CLASS =
  `${CALENDAR_ACTION_BUTTON_CLASS} bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200`;

export const CALENDAR_CANCEL_CLASS =
  CALENDAR_ACTION_BUTTON_CLASS +
  " text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800";

export const CALENDAR_CLEAR_CLASS =
  CALENDAR_ACTION_BUTTON_CLASS +
  " mr-auto text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const CALENDAR_YEAR_GRID_CLASS = "grid grid-cols-3 gap-1.5";

export const CALENDAR_YEAR_BUTTON_CLASS =
  "flex h-9 items-center justify-center rounded-md text-sm text-neutral-900 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 dark:text-neutral-100 dark:hover:bg-neutral-800 dark:focus:ring-neutral-400/30";

export const CALENDAR_NAV_BUTTON_DISABLED_CLASS =
  "cursor-not-allowed opacity-50 pointer-events-none";

// ─── Calendar helpers ──────────────────────────────────────────────────

export const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CELL_LABEL_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
});

export function formatCellLabel(year: number, month: number, day: number): string {
  return CELL_LABEL_FORMATTER.format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatMonthYear(year: number, month: number): string {
  return MONTH_YEAR_FORMATTER.format(new Date(Date.UTC(year, month - 1, 1)));
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function extractYearBound(iso: string | undefined): number | null {
  if (!iso) return null;
  const parts = utcDateParts(iso);
  return parts ? parts.year : null;
}

export function isYearDisabled(year: number, minYear: number | null, maxYear: number | null): boolean {
  if (minYear !== null && year < minYear) return true;
  if (maxYear !== null && year > maxYear) return true;
  return false;
}

export function isMonthDisabled(year: number, month: number, min: string | undefined, max: string | undefined): boolean {
  const firstDay = `${year}-${pad2(month)}-01`;
  const lastDay = `${year}-${pad2(month)}-${pad2(daysInMonth(year, month))}`;
  if (min && lastDay < min.slice(0, 10)) return true;
  if (max && firstDay > max.slice(0, 10)) return true;
  return false;
}