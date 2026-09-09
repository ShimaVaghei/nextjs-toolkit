"use client";

// ─── Modal (public interface of the modal module) ──────────────────────
//
// A controlled, centered dialog that blocks interaction with the rest of
// the page until dismissed. The parent owns visibility through the `open`
// flag; every dismiss path — the Cancel button, an Escape keypress, and a
// backdrop click — funnels through the single `onClose` callback. It
// renders portaled to document.body over a translucent backdrop, locks
// body scroll while open, and moves focus to the panel on open.

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
};

/** A numeric size is a CSS pixel value; a string is used literally. */
function cssSize(size: number | string): string {
  return typeof size === "number" ? `${size}px` : size;
}

export function Modal({ title, open, onClose, children, width, height }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while open; restore whatever was there on close.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

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
        <footer className="sticky bottom-0 shrink-0 border-t border-neutral-200 px-6 py-4 dark:border-neutral-700">
          <button
            type="button"
            className="rounded-md px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
            onClick={onClose}
          >
            Cancel
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
