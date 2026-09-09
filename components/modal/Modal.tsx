"use client";

// ─── Modal (public interface of the modal module) ──────────────────────
//
// A controlled, centered dialog that blocks interaction with the rest of
// the page until dismissed. The parent owns visibility through the `open`
// flag; every dismiss path — the Cancel button, an Escape keypress, and a
// backdrop click — funnels through the single `onClose` callback. It
// renders portaled to document.body over a translucent backdrop, locks
// body scroll while open, and moves focus to the panel on open.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

export type ModalProps = {
  /** Rendered as the visible heading and the dialog's `aria-label`. */
  title: string;
  /** The parent's visibility flag; when false nothing renders. */
  open: boolean;
  /** The single close channel: Cancel, Escape, and backdrop click all map here. */
  onClose: () => void;
  /** The dialog's body content; the only internally scrolling region. */
  children?: ReactNode;
  /**
   * The panel's literal CSS width (number → px). Hard-clamped so the modal
   * never exceeds the viewport (`max-width: 100vw`).
   */
  width?: number | string;
  /**
   * The panel's literal CSS height (number → px). Hard-clamped so the modal
   * never exceeds the viewport (`max-height: 100vh`).
   */
  height?: number | string;
  /**
   * The footer's primary action. May return a promise: while it is pending
   * Apply is busy + disabled and the modal does not close; on resolve the
   * modal auto-closes through `onClose`; on reject it stays open and Apply
   * returns to idle — the caller handles the failure itself (no error slot).
   */
  onSubmit?: () => void | Promise<unknown>;
  /** The footer's primary action label. Default: "Apply". */
  submitText?: string;
  /** The footer's secondary, dismissive action label. Default: "Cancel". */
  cancelText?: string;
  /** Hides Cancel, collapsing the dialog to a single Apply action. */
  hideCancel?: boolean;
  /** Disables Apply without busy semantics (e.g. validation incomplete). */
  submitDisabled?: boolean;
};

/** A numeric size is a CSS pixel value; a string is used literally. */
function cssSize(size: number | string): string {
  return typeof size === "number" ? `${size}px` : size;
}

export function Modal({
  title,
  open,
  onClose,
  children,
  width,
  height,
  onSubmit,
  submitText = "Apply",
  cancelText = "Cancel",
  hideCancel = false,
  submitDisabled = false,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  // The async submit lifecycle: while `onSubmit`'s promise is pending the
  // Apply button is busy + disabled and the modal does not close. On resolve
  // the modal auto-closes through `onClose`; on reject it stays open and
  // Apply returns to idle — the caller handles the failure itself.
  const isSubmitBusy = pendingSubmit || undefined;
  const isSubmitDisabled = submitDisabled || pendingSubmit;
  const handleSubmit = () => {
    if (isSubmitDisabled) return;
    const result = onSubmit?.();
    if (!(result instanceof Promise)) return;
    setPendingSubmit(true);
    result.then(
      () => {
        setPendingSubmit(false);
        onClose();
      },
      () => {
        setPendingSubmit(false);
      },
    );
  };

  // Drop the pending state if the modal unmounts while a submit is in flight.
  useEffect(() => () => setPendingSubmit(false), []);

  // Lock body scroll while open (with scrollbar-width compensation so the
  // page does not jump); restore whatever was there on close.
  useBodyScrollLock(open);

  // Escape closes through the single `onClose` channel.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Move focus to the panel on open.
  useEffect(() => {
    if (!open) return;
    panelRef.current?.focus({ preventScroll: true });
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        style={{
          ...(width !== undefined && { width: cssSize(width), maxWidth: "100vw" }),
          ...(height !== undefined && { height: cssSize(height), maxHeight: "100vh" }),
        }}
        className="relative flex max-h-full w-full max-w-md flex-col rounded-lg bg-white shadow-xl outline-none dark:bg-neutral-800"
      >
        <header className="sticky top-0 shrink-0 border-b border-neutral-200 px-6 py-4 dark:border-neutral-700">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </h2>
        </header>
        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-6 py-4 text-neutral-700 dark:text-neutral-300">
          {children}
        </div>
        <footer className="sticky bottom-0 flex shrink-0 items-center justify-end gap-2 border-t border-neutral-200 px-6 py-4 dark:border-neutral-700">
          {!hideCancel && (
            <button
              type="button"
              className="rounded-md px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
              onClick={onClose}
            >
              {cancelText}
            </button>
          )}
          {onSubmit && (
            <button
              type="button"
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
              disabled={isSubmitDisabled || undefined}
              aria-busy={isSubmitBusy}
              onClick={handleSubmit}
            >
              {submitText}
            </button>
          )}
        </footer>
      </div>
    </div>,
    document.body,
  );
}
