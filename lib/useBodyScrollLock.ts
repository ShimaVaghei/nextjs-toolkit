"use client";

// ─── useBodyScrollLock ───────────────────────────────────────────────────
//
// Locks <body> scroll while `locked` is true and compensates for the
// disappearing scrollbar: hiding overflow widens the viewport by the
// scrollbar's width, which would otherwise reflow the page as a visible
// jump when a Modal opens. The measured width is added to the body's
// padding-right so content keeps its exact position. The previous
// overflow and padding values are captured and restored on unlock, so
// nested locks (e.g. a Modal over the AppLayout mobile overlay) compose.

import { useEffect } from "react";

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const body = document.body;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `calc(${previousPaddingRight || "0px"} + ${scrollbarWidth}px)`;
    }
    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
    };
  }, [locked]);
}
