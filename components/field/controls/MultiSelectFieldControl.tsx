"use client";

import { useRef } from "react";
import type { MouseEvent } from "react";
import type { MultiSelectControlProps } from "./FieldControl";
import {
  resolveChips,
  type FieldOption,
  type Chip,
  CHIP_STRIP_CLASS,
  CHIP_CLASS,
  CHIP_REMOVE_CLASS,
  SELECTION_TEXT_STRIP_CLASS,
  SELECTION_TEXT_CLASS,
  SELECT_FACE_GHOST_CLASS,
  OPEN_BUTTON_CLASS,
  ROW_LABEL_CLASS,
  ROW_LABEL_ENABLED_CLASS,
  ROW_LABEL_DISABLED_CLASS,
  CHECKBOX_CLASS,
} from "../fieldShared";
import { OptionsPopup } from "./OptionsPopup";
import { useOptionsPanel } from "./useOptionsPanel";

/**
 * The multi-select renderer: a closed-face group showing either removable
 * Chips (one per selected Option) or a comma-joined text strip, both opening
 * the shared searchable Options popup. A row press toggles membership and
 * the popup stays open; the closed face is the disclosure trigger itself
 * (text mode) or paired with a chevron button (chips mode). Chip removals
 * hop focus to a neighbouring chip; the last remaining chip removal hops
 * focus back to the trigger.
 */
export function MultiSelectFieldControl<T>({
  id,
  panelId,
  searchId,
  describedBy,
  labelId,
  required,
  error,
  disabled,
  value,
  selectionDisplay,
  placeholder,
  options,
  matches,
  keepDisabledSelection,
  optionsAuthoritative,
  blocked,
  onCommit,
  onBlur,
  onAnnounce,
}: MultiSelectControlProps<T>) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const chipRemoveRefs = useRef(new Map<string, HTMLButtonElement>());
  const {
    open,
    search,
    setSearch,
    widgetHandlers,
    absorbedPressRef,
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

  const multiDisabled = disabled || blocked;

  const { entries: chips } = resolveChips(
    options,
    value as unknown[],
    matches,
    keepDisabledSelection,
    optionsAuthoritative,
  );

  const toggleOption = (option: FieldOption) => {
    onAnnounce?.("");
    const selectedValues = value as unknown[];
    const kept = selectedValues.filter((v) => !matches(option.value, v));
    onCommit(
      (kept.length === selectedValues.length
        ? [...selectedValues, option.value]
        : kept) as T[],
    );
  };

  const removeChip = (chip: Chip, index: number) => {
    const selectedValues = value as unknown[];
    const next = selectedValues.filter((v) => !matches(chip.value, v));
    onCommit(next as T[]);
    onAnnounce?.(`Removed ${chip.label}. ${next.length} selected.`);

    const { entries: remaining } = resolveChips(
      options,
      next,
      matches,
      keepDisabledSelection,
      optionsAuthoritative,
    );
    if (remaining.length === 0) {
      triggerRef.current?.focus();
      return;
    }
    const hopChip = remaining[Math.min(index, remaining.length - 1)];
    chipRemoveRefs.current.get(hopChip.key)?.focus();
  };

  const joinedSelection = chips.map((chip) => chip.label).join(", ");
  const emptySelectionFace =
    chips.length === 0 && placeholder ? (
      <span aria-hidden="true" className={SELECT_FACE_GHOST_CLASS}>
        {placeholder}
      </span>
    ) : null;

  const groupStatusAttributes = {
    "aria-required": required || undefined,
    "aria-invalid": error ? true : undefined,
  };

  const absorbedPress = (event: MouseEvent) => {
    event.preventDefault();
    absorbedPressRef.current = true;
  };

  return (
    <div
      ref={widgetRef}
      className="relative mt-1.5"
      onBlur={widgetHandlers.onBlur}
      onKeyDown={widgetHandlers.onKeyDown}
    >
      <div
        role="group"
        id={id}
        aria-labelledby={labelId}
        aria-describedby={describedBy}
        {...groupStatusAttributes}
        className="flex items-stretch gap-1.5"
      >
        {selectionDisplay === "chips" ? (
          <div className={CHIP_STRIP_CLASS}>
            {emptySelectionFace}
            {chips.map((chip, index) => (
              <span key={chip.key} className={CHIP_CLASS}>
                <span className="max-w-40 truncate">{chip.label}</span>
                <button
                  type="button"
                  ref={(element) => {
                    if (element) {
                      chipRemoveRefs.current.set(chip.key, element);
                    } else {
                      chipRemoveRefs.current.delete(chip.key);
                    }
                  }}
                  aria-label={`Remove ${chip.label}`}
                  disabled={multiDisabled || undefined}
                  onClick={() => removeChip(chip, index)}
                  className={CHIP_REMOVE_CLASS}
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 12 12"
                    fill="none"
                    className="size-3"
                  >
                    <path
                      d="M3 3l6 6M9 3l-6 6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        ) : (
          <button
            type="button"
            ref={triggerRef}
            onClick={toggleOpen}
            disabled={multiDisabled || undefined}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label="Show options"
            className={
              SELECTION_TEXT_STRIP_CLASS +
              " cursor-pointer focus:border-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 " +
              "disabled:cursor-not-allowed disabled:bg-neutral-100 dark:disabled:bg-neutral-800 " +
              "dark:focus:ring-neutral-400/30"
            }
          >
            {chips.length === 0 ? (
              emptySelectionFace
            ) : (
              <span
                className={SELECTION_TEXT_CLASS}
                title={joinedSelection}
              >
                {joinedSelection}
              </span>
            )}
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
        )}
        {selectionDisplay === "chips" && (
          <button
            type="button"
            ref={triggerRef}
            onClick={toggleOpen}
            disabled={multiDisabled || undefined}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label="Show options"
            className={OPEN_BUTTON_CLASS}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              fill="none"
              className="size-4"
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
        )}
      </div>

      <OptionsPopup
        panelId={panelId}
        searchId={searchId}
        open={open}
        search={search}
        onSearchChange={setSearch}
        searchInputRef={searchRef}
        onClear={() => {
          onAnnounce?.("All selections cleared.");
          onCommit([] as T[]);
        }}
        clearDisabled={
          multiDisabled || (value as unknown[]).length === 0
        }
      >
        {panelRows.map(({ option, index }) => (
          <label
            key={index}
            className={
              ROW_LABEL_CLASS +
              (option.disabled
                ? ROW_LABEL_DISABLED_CLASS
                : ROW_LABEL_ENABLED_CLASS)
            }
            onMouseDown={absorbedPress}
          >
            <input
              type="checkbox"
              className={CHECKBOX_CLASS}
              checked={(value as unknown[]).some((v) =>
                matches(option.value, v),
              )}
              disabled={option.disabled || multiDisabled || undefined}
              onChange={() => toggleOption(option)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </OptionsPopup>
    </div>
  );
}