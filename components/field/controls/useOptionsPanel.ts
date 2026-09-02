"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import type { FieldOption } from "../fieldShared";

/**
 * The disclosure machinery the choice kinds share: open state, the search
 * query (and its reset on close), and the focus/blur handlers that
 * coordinate Escape, outside-click, and the dissolved-focus edge case. The
 * adapters own their own trigger and search refs; this hook owns the
 * state and the wiring that doesn't belong to any single kind.
 *
 * `onTouchAndValidate` runs every time focus genuinely leaves the widget —
 * mirroring the engine's "blur means Touched" contract the textual kinds
 * satisfy through their native onBlur handler.
 */
export type OptionsPanel = {
  open: boolean;
  search: string;
  setSearch: (next: string) => void;
  /**
   * Wire to the closed-face button so Escape and outside-click close
   * cleanly. Adapters pass their triggerRef here.
   */
  widgetHandlers: {
    onBlur: (event: FocusEvent<HTMLDivElement>) => void;
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  };
  absorbedPressRef: RefObject<boolean>;
  openPanel: () => void;
  closePanel: () => void;
  toggleOpen: () => void;
  query: string;
  panelRows: { option: FieldOption; index: number }[];
};

/**
 * The choice-kind disclosure contract shared between select and multi-select:
 * the panel state machine is identical (only the rows differ). The hook
 * keeps the engine- and adapter-agnostic pieces in one place so each
 * adapter is a thin, self-contained renderer.
 */
export function useOptionsPanel(options: {
  onTouchAndValidate: () => void;
  widgetRef: RefObject<HTMLDivElement | null>;
  searchRef: RefObject<HTMLInputElement | null>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  blocked: boolean;
  panelOptions: FieldOption[];
}): OptionsPanel {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const absorbedPressRef = useRef(false);

  const closePanel = useCallback(() => {
    setOpen(false);
    setSearch("");
  }, []);

  const openPanel = useCallback(() => setOpen(true), []);

  const query = search.trim().toLowerCase();

  const toggleOpen = useCallback(() => {
    if (!open && options.blocked) return;
    if (open) {
      closePanel();
    } else {
      openPanel();
    }
  }, [closePanel, open, options.blocked, openPanel]);

  const handleWidgetKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape" && open) {
        closePanel();
        options.triggerRef.current?.focus();
      }
    },
    [closePanel, open, options.triggerRef],
  );

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent | Event) => {
      const target = event.target;
      if (
        target instanceof Node &&
        options.widgetRef.current?.contains(target)
      ) {
        return;
      }
      closePanel();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown);
  }, [closePanel, open, options.widgetRef]);

  useEffect(() => {
    if (open) {
      options.searchRef.current?.focus();
    }
  }, [open, options.searchRef]);

  const handleWidgetBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const next = event.relatedTarget;
      const widget = options.widgetRef.current;
      if (next instanceof Node && widget?.contains(next)) {
        return;
      }
      if (open && next === null && absorbedPressRef.current) {
        absorbedPressRef.current = false;
        return;
      }
      if (open) {
        closePanel();
      }
      options.onTouchAndValidate();
    },
    [closePanel, open, options],
  );

  return {
    open,
    search,
    setSearch,
    widgetHandlers: {
      onBlur: handleWidgetBlur,
      onKeyDown: handleWidgetKeyDown,
    },
    absorbedPressRef,
    openPanel,
    closePanel,
    toggleOpen,
    query: query,
    panelRows: options.panelOptions
      .map((option, index) => ({ option, index }))
      .filter(({ option }) => option.label.toLowerCase().includes(query)),
  };
}