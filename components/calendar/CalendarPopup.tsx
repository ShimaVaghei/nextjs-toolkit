"use client";

// ─── CalendarPopup (public interface of the calendar module) ───────────
//
// The disclosure panel shared by the date, datetime, date-range, and
// datetime-range Field kinds. This is the module's only public interface.
// It owns the Draft (seeded from `value` on open, discarded internally),
// range anchoring and two-step pick, hover-range preview, time slices, and
// the disclosure mechanics — outside click, Escape, focus return, and
// placement measurement/flip. Field owns normalization and the observer +
// Error pipeline on commit, passing the raw draft here through `onCommit`.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { pad2, utcDateParts, type DateInputKind, type FieldDateRangeValue } from "@/lib/date";
import {
  CALENDAR_ACTIONS_CLASS,
  CALENDAR_APPLY_CLASS,
  CALENDAR_CANCEL_CLASS,
  CALENDAR_DAY_CLASS,
  CALENDAR_DAY_DISABLED_CLASS,
  CALENDAR_DAY_IN_RANGE_CLASS,
  CALENDAR_DAY_OUT_OF_MONTH_CLASS,
  CALENDAR_DAY_SELECTED_CLASS,
  CALENDAR_DAY_TODAY_CLASS,
  CALENDAR_HEADER_BUTTON_CLASS,
  CALENDAR_HEADER_CLASS,
  CALENDAR_MONTH_CLASS,
  CALENDAR_NAV_BUTTON_CLASS,
  CALENDAR_NAV_BUTTON_DISABLED_CLASS,
  CALENDAR_PANEL_ABOVE_CLASS,
  CALENDAR_PANEL_BASE_CLASS,
  CALENDAR_PANEL_BELOW_CLASS,
  CALENDAR_TIME_CLASS,
  CALENDAR_TIME_COLON_CLASS,
  CALENDAR_TIME_INPUT_CLASS,
  CALENDAR_WEEKDAY_CLASS,
  daysInMonth,
  formatCellLabel,
  formatMonthYear,
  isMonthDisabled,
  resolveCalendarPlacement,
  WEEKDAY_LABELS,
} from "./calendarShared";
import { YearMonthOverlay } from "./YearMonthOverlay";

export type CalendarPopupProps = {
  /** Which date Field kind drives the popup's draft shape. */
  kind: DateInputKind;
  /** The Field's committed value; seeds the draft on open. */
  value: string | FieldDateRangeValue | undefined;
  min?: string;
  max?: string;
  /** Focus-return target and placement anchor (the Field's trigger button). */
  triggerRef: RefObject<HTMLButtonElement | null>;
  /** Disclosure control — renders the panel while true. */
  open: boolean;
  /** Cancel, Escape, and outside click all map here; the draft is discarded. */
  onClose: () => void;
  /** Raw draft value; Field normalizes and runs its observer/Error pipeline. */
  onCommit: (rawDraft: string | FieldDateRangeValue) => void;
  /**
   * Streams the raw draft whenever the in-progress selection changes while
   * open. Optional: the parent uses it to show the draft on the closed face
   * instead of the last committed value. Nothing is committed by this —
   * Apply still routes through onCommit.
   */
  onDraftPreview?: (rawDraft: string | FieldDateRangeValue) => void;
  /** Accessibility plumbing: the panel id the trigger references via aria-controls. */
  panelId: string;
  gridId: string;
};
export function CalendarPopup({
  kind,
  value,
  min,
  max,
  triggerRef,
  open,
  onClose,
  onCommit,
  onDraftPreview,
  panelId,
  gridId,
}: CalendarPopupProps) {
  const isRangeKind = kind === "date-range" || kind === "datetime-range";
  const range = isRangeKind;

  // The Draft — internal, seeded from the committed Field value on open.
  const [draft, setDraft] = useState("");
  const [timeHour, setTimeHour] = useState("00");
  const [timeMinute, setTimeMinute] = useState("00");

  // Range state (date-range / datetime-range kinds only).
  const [rangeAnchor, setRangeAnchor] = useState<string | undefined>(undefined);
  const [rangeEndDate, setRangeEndDate] = useState<string | undefined>(undefined);
  const [hoverDate, setHoverDate] = useState<string | undefined>(undefined);
  const [startTimeHour, setStartTimeHour] = useState("00");
  const [startTimeMinute, setStartTimeMinute] = useState("00");
  const [endTimeHour, setEndTimeHour] = useState("00");
  const [endTimeMinute, setEndTimeMinute] = useState("00");

  const [showOverlay, setShowOverlay] = useState(false);
  const [placement, setPlacement] = useState<"bottom" | "top">("bottom");

  const gridRef = useRef<HTMLDivElement>(null);
  const calendarPanelRef = useRef<HTMLDivElement>(null);

  // Seeding reads the latest committed `value`, but must not re-seed on
  // incidental value updates mid-open (defensive: the draft lives here, so
  // the Field's value should not change while the popup is open), so the
  // value rides a ref rather than the seed's dependency list.
  const valueRef = useRef(value);
  // The latest value lands in the ref in an effect (refs stay read-only during
  // render), declared before the seed effect so an open-transition render
  // seeds from the same commit's value.
  useEffect(() => {
    valueRef.current = value;
  });

  const seedFromValue = useCallback(() => {
    const current = valueRef.current;
    const now = new Date();
    let dateStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
    const nowH = pad2(now.getHours());
    const nowM = pad2(now.getMinutes());
    const wantsTime = kind === "datetime" || kind === "datetime-range";
    let h = wantsTime ? nowH : "00";
    let m = wantsTime ? nowM : "00";

    if (isRangeKind) {
      const rangeValue =
        typeof current === "object" && current !== null
          ? (current as FieldDateRangeValue)
          : undefined;
      const fromParts = rangeValue?.from ? utcDateParts(rangeValue.from) : null;
      if (fromParts) {
        dateStr = `${fromParts.year}-${pad2(fromParts.month)}-${pad2(fromParts.day)}`;
        setRangeAnchor(dateStr);
      } else {
        setRangeAnchor(undefined);
      }
      const toParts = rangeValue?.to ? utcDateParts(rangeValue.to) : null;
      setRangeEndDate(
        toParts ? `${toParts.year}-${pad2(toParts.month)}-${pad2(toParts.day)}` : undefined,
      );
      setHoverDate(undefined);
      if (kind === "datetime-range") {
        let sh = nowH, sm = nowM, eh = nowH, em = nowM;
        if (rangeValue?.from) {
          const fd = new Date(rangeValue.from);
          if (!isNaN(fd.getTime())) { sh = pad2(fd.getHours()); sm = pad2(fd.getMinutes()); }
        }
        if (rangeValue?.to) {
          const td = new Date(rangeValue.to);
          if (!isNaN(td.getTime())) { eh = pad2(td.getHours()); em = pad2(td.getMinutes()); }
        }
        setStartTimeHour(sh);
        setStartTimeMinute(sm);
        setEndTimeHour(eh);
        setEndTimeMinute(em);
      }
      setDraft(dateStr);
      return;
    }

    if (typeof current === "string" && current) {
      const parts = utcDateParts(current);
      if (parts) {
        dateStr = `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
        if (kind === "datetime") {
          const d = new Date(current);
          if (!isNaN(d.getTime())) {
            h = pad2(d.getHours());
            m = pad2(d.getMinutes());
          }
        }
      }
    }
    setDraft(dateStr);
    if (kind === "datetime") {
      setTimeHour(h);
      setTimeMinute(m);
    }
    setRangeAnchor(undefined);
    setRangeEndDate(undefined);
    setHoverDate(undefined);
  }, [kind, isRangeKind]);
// Seed the Draft whenever the popup opens. `seedFromValue` is stable for a
  // given kind, so a mid-open value change (range streaming) does not re-seed.
  useEffect(() => {
    if (open) seedFromValue();
  }, [open, seedFromValue]);

  // Build the raw draft value for the kind — the single source of truth for
  // both what Apply commits and what the preview streams, so the two can
  // never drift. Returns null while the draft is unbuildable (pre-seed, or
  // a range pick with no anchor yet).
  // Time slices are read from free-typed inputs and can be a single digit or
  // empty mid-edit; normalizing here guarantees the emitted string is always
  // fixed-width, parseable ISO (an empty/single-digit slice would otherwise
  // produce an invalid instant and make the trigger face throw).
  const normalizeSlice = (v: string, max: number) =>
    pad2(Math.max(0, Math.min(max, parseInt(v, 10) || 0)));
  const buildDraftValue = useCallback((): string | FieldDateRangeValue | null => {
    if (!utcDateParts(draft)) return null;
    if (isRangeKind) {
      if (!rangeAnchor) return null;
      const from = rangeAnchor < draft ? rangeAnchor : draft;
      const to = rangeAnchor < draft ? draft : rangeAnchor;
      if (kind === "datetime-range") {
        return {
          from: `${from}T${normalizeSlice(startTimeHour, 23)}:${normalizeSlice(startTimeMinute, 59)}:00`,
          to: rangeEndDate
            ? `${to}T${normalizeSlice(endTimeHour, 23)}:${normalizeSlice(endTimeMinute, 59)}:00`
            : undefined,
        };
      }
      return { from, to: rangeEndDate ? to : undefined };
    }
    return kind === "datetime"
      ? `${draft}T${normalizeSlice(timeHour, 23)}:${normalizeSlice(timeMinute, 59)}:00`
      : draft;
  }, [
    draft,
    kind,
    isRangeKind,
    rangeAnchor,
    rangeEndDate,
    startTimeHour,
    startTimeMinute,
    endTimeHour,
    endTimeMinute,
    timeHour,
    timeMinute,
  ]);

  // Draft preview: while open, stream the current raw draft to the parent so
  // its trigger face can display the in-progress selection instead of the
  // last committed value. Built by the same builder Apply commits, so the
  // previewed value is exactly what Apply would emit.
  useEffect(() => {
    if (!open || !onDraftPreview) return;
    const raw = buildDraftValue();
    if (raw !== null) onDraftPreview(raw);
  }, [open, onDraftPreview, buildDraftValue]);

  // Reset the overlay when the popup closes. Derived-state pattern: the reset
  // happens during render when `open` flips, which the compiler rules accept.
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) setShowOverlay(false);
  }

  // Focus return: hand focus back to the trigger whenever the popup closes.
  const prevOpenRef = useRef(open);
  useEffect(() => {
    if (prevOpenRef.current && !open) {
      triggerRef.current?.focus();
    }
    prevOpenRef.current = open;
  }, [open, triggerRef]);

  // Measure available viewport space when the popup opens and flip the panel
  // above the field when it would overflow below (prevents page jump).
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const panel = calendarPanelRef.current;
    if (!trigger || !panel) return;
    const rect = trigger.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    setPlacement(
      resolveCalendarPlacement(rect, panelRect.height, window.innerHeight),
    );
  }, [open, triggerRef, calendarPanelRef]);

  // Outside click: a pointerdown outside the panel and trigger closes.
  useEffect(() => {
    if (!open) return;
    const handler = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        (calendarPanelRef.current?.contains(target) ||
          triggerRef.current?.contains(target))
      ) {
        return;
      }
      onClose();
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, [open, onClose]);

  const handlePanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  // Focus leaving the panel and trigger closes (discard is internal). One
  // null-relatedTarget blur is exempt: clicking non-focusable empty space in
  // the panel dissolves focus without moving it — closing there would eat it.
  const handlePanelBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget;
    if (
      next instanceof Node &&
      (calendarPanelRef.current?.contains(next) ||
        triggerRef.current?.contains(next))
    ) {
      return;
    }
    if (next === null && e.target === e.currentTarget) {
      return;
    }
    onClose();
  };

  // Derived draft calendar parts (always valid while open).
  const dp = utcDateParts(draft);
  const draftYear = dp?.year ?? 0;
  const draftMonth = dp?.month ?? 0;
  const draftDay = dp?.day ?? 0;
const headerLabel = formatMonthYear(draftYear, draftMonth);
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();
  const days = daysInMonth(draftYear, draftMonth);
  const firstDayOfWeek = new Date(Date.UTC(draftYear, draftMonth - 1, 1)).getUTCDay();
  const outOfMonthDays = daysInMonth(draftYear, draftMonth === 1 ? 12 : draftMonth - 1);

  // Focus the selected day, or the leading day cell, on open.
  useEffect(() => {
    if (!open || !gridRef.current) return;
    const selectedBtn =
      gridRef.current.querySelector<HTMLElement>('[aria-selected="true"]');
    if (selectedBtn) {
      selectedBtn.focus({ preventScroll: true });
      return;
    }
    const firstBtn = gridRef.current.querySelector<HTMLElement>("[data-day]");
    if (firstBtn) firstBtn.focus({ preventScroll: true });
  }, [open]);

  const prevMonth = () => {
    const nm = draftMonth === 1 ? 12 : draftMonth - 1;
    const ny = draftMonth === 1 ? draftYear - 1 : draftYear;
    setDraft(`${ny}-${pad2(nm)}-${pad2(draftDay)}`);
  };

  const nextMonth = () => {
    const nm = draftMonth === 12 ? 1 : draftMonth + 1;
    const ny = draftMonth === 12 ? draftYear + 1 : draftYear;
    setDraft(`${ny}-${pad2(nm)}-${pad2(draftDay)}`);
  };

  const prevMonthMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    prevMonth();
  };

  const nextMonthMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    nextMonth();
  };

  const prevMonthKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); prevMonth(); }
  };

  const nextMonthKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); nextMonth(); }
  };

  // Two-step range picking: picks edit the draft only. Apply commits via
  // buildDraftValue; the onDraftPreview effect streams each pick to the
  // trigger face. Nothing lands in the Field until Apply — Cancel/Escape
  // discards the whole draft without changing the committed value.
  const handleDayRangeSelect = (dateStr: string) => {
    if (!rangeAnchor || rangeEndDate) {
      setRangeAnchor(dateStr);
      setRangeEndDate(undefined);
      setDraft(dateStr);
    } else {
      const from = rangeAnchor < dateStr ? rangeAnchor : dateStr;
      const to = rangeAnchor < dateStr ? dateStr : rangeAnchor;
      setRangeEndDate(to);
      setDraft(dateStr);
      setHoverDate(undefined);
    }
  };

  const handleDayHover = (dateStr: string) => {
    if (rangeAnchor) setHoverDate(dateStr);
  };

  const handleDayHoverLeave = () => {
    setHoverDate(undefined);
  };

  // Build the raw draft value for the kind and commit it.
  const handleApply = () => {
    const raw = buildDraftValue();
    if (raw !== null) onCommit(raw);
    onClose();
  };

  const sanitizeDigits = (v: string): string => v.replace(/\D/g, "").slice(0, 2);

  const makeTimeFieldHandler = (
    max: number,
    onChange: (h: string, m: string) => void,
    fixed: string,
    isMinute: boolean,
  ) => (raw: string) => {
    const digits = sanitizeDigits(raw);
    if (isMinute) onChange(fixed, digits);
    else onChange(digits, fixed);
    if (digits.length === 2) {
      const n = parseInt(digits, 10);
      if (!isNaN(n)) {
        const clamped = pad2(Math.max(0, Math.min(max, n)));
        if (isMinute) onChange(fixed, clamped);
        else onChange(clamped, fixed);
      }
    }
  };

  const setSingleTime = (h: string, m: string) => {
    setTimeHour(h);
    setTimeMinute(m);
  };
  const setStartTime = (h: string, m: string) => {
    setStartTimeHour(h);
    setStartTimeMinute(m);
  };
  const setEndTime = (h: string, m: string) => {
    setEndTimeHour(h);
    setEndTimeMinute(m);
  };

  const handleHourChange = makeTimeFieldHandler(23, setSingleTime, timeMinute, false);
  const handleMinuteChange = makeTimeFieldHandler(59, setSingleTime, timeHour, true);
  const handleStartTimeHourChange = makeTimeFieldHandler(23, setStartTime, startTimeMinute || "00", false);
  const handleStartTimeMinuteChange = makeTimeFieldHandler(59, setStartTime, startTimeHour || "00", true);
  const handleEndTimeHourChange = makeTimeFieldHandler(23, setEndTime, endTimeMinute || "00", false);
  const handleEndTimeMinuteChange = makeTimeFieldHandler(59, setEndTime, endTimeHour || "00", true);

  const handleHourBlur = () => {
    const h = Math.max(0, Math.min(23, parseInt(timeHour, 10) || 0));
    setSingleTime(pad2(h), timeMinute);
  };
  const handleMinuteBlur = () => {
    const m = Math.max(0, Math.min(59, parseInt(timeMinute, 10) || 0));
    setSingleTime(timeHour, pad2(m));
  };
  const handleTimeKeyDown = (e: React.KeyboardEvent, isMinute: boolean) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isMinute) handleMinuteBlur();
      else handleHourBlur();
    }
  };
const handleGridKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }

    const d = utcDateParts(draft);
    if (!d) return;
    let { year, month } = d;
    const day = d.day;
    const dim = daysInMonth(year, month);

    const nav = (delta: number) => {
      let nd = day + delta;
      if (nd < 1) {
        month = month === 1 ? 12 : month - 1;
        if (month === 12) year--;
        nd = daysInMonth(year, month);
      } else if (nd > dim) {
        month = month === 12 ? 1 : month + 1;
        if (month === 1) year++;
        nd = 1;
      }
      setDraft(`${year}-${pad2(month)}-${pad2(nd)}`);
    };

    switch (e.key) {
      case "ArrowRight": e.preventDefault(); nav(1); break;
      case "ArrowLeft": e.preventDefault(); nav(-1); break;
      case "ArrowDown": e.preventDefault(); nav(7); break;
      case "ArrowUp": e.preventDefault(); nav(-7); break;
      case "PageUp":
        e.preventDefault();
        {
          const pm = month === 1 ? 12 : month - 1;
          const py = month === 1 ? year - 1 : year;
          const pd = Math.min(day, daysInMonth(py, pm));
          setDraft(`${py}-${pad2(pm)}-${pad2(pd)}`);
        }
        break;
      case "PageDown":
        e.preventDefault();
        {
          const nm = month === 12 ? 1 : month + 1;
          const ny = month === 12 ? year + 1 : year;
          const nd = Math.min(day, daysInMonth(ny, nm));
          setDraft(`${ny}-${pad2(nm)}-${pad2(nd)}`);
        }
        break;
      case "Home":
        e.preventDefault();
        {
          const wd = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
          const homeDay = Math.max(1, day - wd);
          setDraft(`${year}-${pad2(month)}-${pad2(homeDay)}`);
        }
        break;
      case "End":
        e.preventDefault();
        {
          const wd = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
          const endDay = Math.min(dim, day + (6 - wd));
          setDraft(`${year}-${pad2(month)}-${pad2(endDay)}`);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        handleApply();
        break;
    }
  };

  const focusDayRef = useCallback(
    (node: HTMLButtonElement | null) => {
      // preventScroll: focusing the day button during commit must not scroll
      // the page — the scroll skews the placement measurement that runs right
      // after commit and forced the popup below on the first open.
      if (node) node.focus({ preventScroll: true });
    },
    [draftDay, draftMonth, draftYear],
  );

  const renderDay = (day: number, isCurrentMonth: boolean, cellYear: number, cellMonth: number) => {
    const dateStr = `${cellYear}-${pad2(cellMonth)}-${pad2(day)}`;
    const isSelected = dateStr === draft;
    const isTodayCell = cellYear === todayYear && cellMonth === todayMonth && day === todayDay;

    let outOfMonth = false;
    if (!isCurrentMonth) {
      outOfMonth = true;
    } else if (min || max) {
      if (min && dateStr < min) outOfMonth = true;
      if (max && dateStr > max) outOfMonth = true;
    }

    const label = formatCellLabel(cellYear, cellMonth, day);

    // Range highlighting
    let isAnchor = false;
    let inRange = false;
    let isRangeStart = false;
    let isRangeEnd = false;
    if (range && rangeAnchor) {
      const compareDate = hoverDate || rangeEndDate || rangeAnchor;
      const minDate = rangeAnchor < compareDate ? rangeAnchor : compareDate;
      const maxDate = rangeAnchor < compareDate ? compareDate : rangeAnchor;
      isAnchor = dateStr === rangeAnchor;
      inRange = isCurrentMonth && dateStr > minDate && dateStr < maxDate;
      isRangeStart = dateStr === minDate;
      isRangeEnd = dateStr === maxDate;
    }

    let cls = CALENDAR_DAY_CLASS;
    if (isSelected) cls += " " + CALENDAR_DAY_SELECTED_CLASS;
    else if (isTodayCell) cls += " " + CALENDAR_DAY_TODAY_CLASS;
    if (outOfMonth) cls += " " + CALENDAR_DAY_OUT_OF_MONTH_CLASS;
    if (isSelected && isTodayCell) cls += " " + CALENDAR_DAY_TODAY_CLASS;

    if (range) {
      if (isAnchor || isRangeStart || isRangeEnd) {
        cls += " " + CALENDAR_DAY_SELECTED_CLASS;
      } else if (inRange) {
        cls += " " + CALENDAR_DAY_IN_RANGE_CLASS;
      }
    }

    const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      if (range) {
        handleDayRangeSelect(dateStr);
      } else {
        setDraft(dateStr);
      }
    };

    const handleMouseEnter = () => {
      if (range && rangeAnchor) {
        handleDayHover(dateStr);
      }
    };

    return (
      <button
        key={dateStr}
        type="button"
        role="gridcell"
        tabIndex={isSelected ? 0 : -1}
        aria-label={label}
        aria-selected={isSelected || isAnchor || isRangeStart || isRangeEnd || undefined}
        aria-disabled={outOfMonth || undefined}
        data-day={day}
        data-month={cellMonth}
        data-year={cellYear}
        className={cls}
        ref={isSelected ? focusDayRef : undefined}
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
      >
        {day}
      </button>
    );
  };

  const buildCells = () => {
    const cells: React.ReactNode[] = [];
    let dayCounter = outOfMonthDays - firstDayOfWeek + 1;
    for (let i = 0; i < firstDayOfWeek; i++) {
      const om = draftMonth === 1 ? 12 : draftMonth - 1;
      const oy = draftMonth === 1 ? draftYear - 1 : draftYear;
      cells.push(renderDay(dayCounter, false, oy, om));
      dayCounter++;
    }
    for (let d = 1; d <= days; d++) {
      cells.push(renderDay(d, true, draftYear, draftMonth));
    }
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nm = draftMonth === 12 ? 1 : draftMonth + 1;
      const ny = draftMonth === 12 ? draftYear + 1 : draftYear;
      cells.push(renderDay(d, false, ny, nm));
    }
    return cells;
  };
return (
    <div
      id={panelId}
      ref={calendarPanelRef}
      hidden={!open}
      data-placement={placement}
      className={`${CALENDAR_PANEL_BASE_CLASS} ${
        placement === "top" ? CALENDAR_PANEL_ABOVE_CLASS : CALENDAR_PANEL_BELOW_CLASS
      }`}
      role="dialog"
      aria-modal="false"
      aria-label={range ? "Choose date range" : "Choose date"}
      onKeyDown={handlePanelKeyDown}
      onBlur={handlePanelBlur}
    >
      {range && (
        <div aria-live="polite" className="sr-only">
          {rangeAnchor && !hoverDate &&
            `Start date selected: ${formatCellLabel(utcDateParts(rangeAnchor)!.year, utcDateParts(rangeAnchor)!.month, utcDateParts(rangeAnchor)!.day)}. Select end date.`}
          {rangeAnchor && hoverDate &&
            `Range: ${formatCellLabel(utcDateParts(rangeAnchor)!.year, utcDateParts(rangeAnchor)!.month, utcDateParts(rangeAnchor)!.day)} to ${formatCellLabel(utcDateParts(hoverDate)!.year, utcDateParts(hoverDate)!.month, utcDateParts(hoverDate)!.day)}`}
        </div>
      )}

      {showOverlay ? (
        <YearMonthOverlay
          draftYear={draftYear}
          draftMonth={draftMonth}
          draftDay={draftDay}
          min={min}
          max={max}
          onDraftChange={setDraft}
          onClose={onClose}
          onReturn={() => setShowOverlay(false)}
        />
      ) : (
        <>
          <div className={CALENDAR_HEADER_CLASS}>
            {(() => {
              const prevMonthDisabled = !!(min && `${draftYear}-${pad2(draftMonth)}-01` <= min.slice(0, 10));
              const nextMonthDisabled = !!(max && `${draftYear}-${pad2(draftMonth)}-${pad2(daysInMonth(draftYear, draftMonth))}` >= max.slice(0, 10));
              return (<>
              <button
                type="button"
                aria-label="Previous month"
                disabled={prevMonthDisabled || undefined}
                className={`${CALENDAR_NAV_BUTTON_CLASS}${prevMonthDisabled ? ` ${CALENDAR_NAV_BUTTON_DISABLED_CLASS}` : ""}`}
                onMouseDown={prevMonthMouseDown}
                onKeyDown={prevMonthKeyDown}
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="size-4">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button></>);
            })()}
            <span className={CALENDAR_MONTH_CLASS}>
              <button
                type="button"
                className={CALENDAR_HEADER_BUTTON_CLASS}
                aria-label="Choose year"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setShowOverlay(true);
                }}
              >
                {headerLabel}
              </button>
            </span>
            {(() => {
              const prevMonthDisabled = !!(min && `${draftYear}-${pad2(draftMonth)}-01` <= min.slice(0, 10));
              const nextMonthDisabled = !!(max && `${draftYear}-${pad2(draftMonth)}-${pad2(daysInMonth(draftYear, draftMonth))}` >= max.slice(0, 10));
              return (
              <button
                type="button"
                aria-label="Next month"
                disabled={nextMonthDisabled || undefined}
                className={`${CALENDAR_NAV_BUTTON_CLASS}${nextMonthDisabled ? ` ${CALENDAR_NAV_BUTTON_DISABLED_CLASS}` : ""}`}
                onMouseDown={nextMonthMouseDown}
                onKeyDown={nextMonthKeyDown}
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="size-4">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              );
            })()}
          </div>

          <div
            ref={gridRef}
            id={gridId}
            role="grid"
            aria-label={headerLabel}
            className="grid grid-cols-7 gap-0.5"
            onMouseLeave={() => {
              if (range) handleDayHoverLeave();
            }}
            onKeyDown={handleGridKeyDown}
          >
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} role="columnheader" aria-label={d} className={CALENDAR_WEEKDAY_CLASS}>{d}</div>
            ))}
            {buildCells()}
          </div>
        </>
      )}

      {kind === "datetime" && (
        <div className={CALENDAR_TIME_CLASS}>
          <label className="text-sm text-neutral-500 dark:text-neutral-400">Time</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={timeHour}
            aria-label="Hour"
            className={CALENDAR_TIME_INPUT_CLASS}
            onChange={(e) => handleHourChange(e.target.value)}
            onBlur={handleHourBlur}
            onKeyDown={(e) => handleTimeKeyDown(e, false)}
          />
          <span className={CALENDAR_TIME_COLON_CLASS}>:</span>
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={timeMinute}
            aria-label="Minute"
            className={CALENDAR_TIME_INPUT_CLASS}
            onChange={(e) => handleMinuteChange(e.target.value)}
            onBlur={handleMinuteBlur}
            onKeyDown={(e) => handleTimeKeyDown(e, true)}
          />
        </div>
      )}
{kind === "datetime-range" && (
        <div className={CALENDAR_TIME_CLASS}>
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-500 dark:text-neutral-400">Start time</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={startTimeHour || "00"}
              aria-label="Start hour"
              className={CALENDAR_TIME_INPUT_CLASS}
              onChange={(e) => handleStartTimeHourChange(e.target.value)}
              onBlur={() => {
                const h = Math.max(0, Math.min(23, parseInt(startTimeHour || "00", 10) || 0));
                setStartTime(pad2(h), startTimeMinute || "00");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const h = Math.max(0, Math.min(23, parseInt(startTimeHour || "00", 10) || 0));
                  setStartTime(pad2(h), startTimeMinute || "00");
                }
              }}
            />
            <span className={CALENDAR_TIME_COLON_CLASS}>:</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={startTimeMinute || "00"}
              aria-label="Start minute"
              className={CALENDAR_TIME_INPUT_CLASS}
              onChange={(e) => handleStartTimeMinuteChange(e.target.value)}
              onBlur={() => {
                const m = Math.max(0, Math.min(59, parseInt(startTimeMinute || "00", 10) || 0));
                setStartTime(startTimeHour || "00", pad2(m));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const m = Math.max(0, Math.min(59, parseInt(startTimeMinute || "00", 10) || 0));
                  setStartTime(startTimeHour || "00", pad2(m));
                }
              }}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-neutral-500 dark:text-neutral-400">End time</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={endTimeHour || "00"}
              aria-label="End hour"
              className={CALENDAR_TIME_INPUT_CLASS}
              onChange={(e) => handleEndTimeHourChange(e.target.value)}
              onBlur={() => {
                const h = Math.max(0, Math.min(23, parseInt(endTimeHour || "00", 10) || 0));
                setEndTime(pad2(h), endTimeMinute || "00");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const h = Math.max(0, Math.min(23, parseInt(endTimeHour || "00", 10) || 0));
                  setEndTime(pad2(h), endTimeMinute || "00");
                }
              }}
            />
            <span className={CALENDAR_TIME_COLON_CLASS}>:</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              value={endTimeMinute || "00"}
              aria-label="End minute"
              className={CALENDAR_TIME_INPUT_CLASS}
              onChange={(e) => handleEndTimeMinuteChange(e.target.value)}
              onBlur={() => {
                const m = Math.max(0, Math.min(59, parseInt(endTimeMinute || "00", 10) || 0));
                setEndTime(endTimeHour || "00", pad2(m));
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const m = Math.max(0, Math.min(59, parseInt(endTimeMinute || "00", 10) || 0));
                  setEndTime(endTimeHour || "00", pad2(m));
                }
              }}
            />
          </div>
        </div>
      )}

      <div className={CALENDAR_ACTIONS_CLASS}>
        <button
          type="button"
          className={CALENDAR_CANCEL_CLASS}
          onMouseDown={(e) => { e.preventDefault(); onClose(); }}
        >
          Cancel
        </button>
        <button
          type="button"
          className={CALENDAR_APPLY_CLASS}
          onMouseDown={(e) => { e.preventDefault(); handleApply(); }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}