"use client";

import { useRef } from "react";
import type { SelectControlProps } from "./FieldControl";
import {
  resolveSelectFace,
  type FieldOption,
  ROW_BUTTON_CLASS,
  SELECT_TRIGGER_CLASS,
  SELECT_FACE_GHOST_CLASS,
} from "../fieldShared";
import { OptionsPopup } from "./OptionsPopup";
import { useOptionsPanel } from "./useOptionsPanel";

/**
 * The select renderer: a closed-face disclosure showing either the
 * placeholder ghost or the selected Option's label, opening the shared
 * searchable Options popup. A row press picks, closes the popup, and hands
 * focus back to the trigger. `keepDisabledSelection` lets a held disabled
 * Option stay legal; unmatched primitives render their string form, anything
 * else renders the generic "(unknown option)" marker.
 */
export function SelectFieldControl<T>({
  id,
  panelId,
  searchId,
  describedBy,
  required,
  error,
  disabled,
  value,
  placeholder,
  options,
  matches,
  keepDisabledSelection,
  optionsAuthoritative,
  blocked,
  onCommit,
  onBlur,
}: SelectControlProps<T>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const {
    open,
    search,
    setSearch,
    widgetHandlers,
    closePanel,
    toggleOpen,
    panelRows,
  } = useOptionsPanel({
    onTouchAndValidate: onBlur,
    widgetRef,
    searchRef,
    triggerRef,
    blocked,
    panelOptions: options,
  });
  const { face } = resolveSelectFace(
    options,
    value,
    matches,
    keepDisabledSelection,
    optionsAuthoritative,
  );

  const pickOption = (option: FieldOption) => {
    if (option.disabled) return;
    onCommit(option.value as T | undefined);
    closePanel();
    triggerRef.current?.focus();
  };

  return (
    <div
      ref={widgetRef}
      className="relative mt-1.5"
      onBlur={widgetHandlers.onBlur}
      onKeyDown={widgetHandlers.onKeyDown}
    >
      <button
        id={id}
        type="button"
        ref={triggerRef}
        onClick={toggleOpen}
        disabled={disabled || blocked || undefined}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-expanded={open}
        aria-controls={panelId}
        className={SELECT_TRIGGER_CLASS}
      >
        <span
          className={
            face.kind === "ghost" ? SELECT_FACE_GHOST_CLASS : undefined
          }
        >
          {face.kind === "ghost"
            ? placeholder
            : face.kind === "option"
              ? face.option.label
              : face.label}
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

      <OptionsPopup
        panelId={panelId}
        searchId={searchId}
        open={open}
        search={search}
        onSearchChange={setSearch}
        searchInputRef={searchRef}
        onClear={() => onCommit("" as T)}
        clearDisabled={
          disabled || value === "" || value === undefined || value === null
        }
      >
        {panelRows.map(({ option, index }) => (
          <button
            key={index}
            type="button"
            onClick={() => pickOption(option)}
            disabled={option.disabled || undefined}
            className={ROW_BUTTON_CLASS}
          >
            {option.label}
          </button>
        ))}
      </OptionsPopup>
    </div>
  );
}