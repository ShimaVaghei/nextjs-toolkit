"use client";

import type { ReactNode, RefObject } from "react";
import {
  CONTROL_CLASS,
  PANEL_CLASS,
  OPTIONS_CLEAR_BUTTON_CLASS,
} from "../fieldShared";

/**
 * The Options popup the select and multi-select kinds share: a plain
 * disclosure panel with a search box filtering rows above them. Opening
 * moves focus to the search input (handled by `useOptionsPanel`); every
 * close path resets the query via the parent's closePanel. The rows
 * themselves differ per kind — the parent renders them as children.
 */
export function OptionsPopup({
  panelId,
  searchId,
  open,
  search,
  onSearchChange,
  searchInputRef,
  onClear,
  clearDisabled,
  children,
}: {
  panelId: string;
  searchId: string;
  open: boolean;
  search: string;
  onSearchChange: (next: string) => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  /**
   * Clear: commits emptiness through the parent's pipeline. Optional — the
   * footer only renders when provided. The popup stays open (Clear's
   * uniform contract across both popups).
   */
  onClear?: () => void;
  clearDisabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div id={panelId} hidden={!open} className={PANEL_CLASS}>
      <label htmlFor={searchId} className="sr-only">
        Search options
      </label>
      <input
        ref={searchInputRef}
        id={searchId}
        type="text"
        value={search}
        placeholder="Search options"
        onChange={(event) => onSearchChange(event.target.value)}
        className={`${CONTROL_CLASS} mt-0`}
      />
      <fieldset className="min-w-0 border-0 p-0">
        <legend className="sr-only">Options</legend>
        <div className="max-h-60 space-y-1 overflow-y-auto p-0.5">
          {children}
        </div>
      </fieldset>
      {onClear && (
        <div className="flex justify-end border-t border-neutral-200 pt-2 dark:border-neutral-700">
          <button
            type="button"
            onClick={onClear}
            disabled={clearDisabled || undefined}
            className={OPTIONS_CLEAR_BUTTON_CLASS}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}