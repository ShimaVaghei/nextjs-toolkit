import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useBodyScrollLock } from "../useBodyScrollLock";
import { stubScrollbarWidth } from "./stubScrollbarWidth";

// ─── useBodyScrollLock ───────────────────────────────────────────────────

function Harness({ locked }: { locked: boolean }) {
  useBodyScrollLock(locked);
  return null;
}

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
});

describe("useBodyScrollLock", () => {
  it("locks body overflow while locked and restores it on unlock", () => {
    const restore = stubScrollbarWidth(0);
    document.body.style.overflow = "auto";

    const { rerender } = render(<Harness locked />);
    expect(document.body.style.overflow).toBe("hidden");

    rerender(<Harness locked={false} />);
    expect(document.body.style.overflow).toBe("auto");
    restore();
  });

  it("compensates padding-right by the scrollbar width while locked", () => {
    const restore = stubScrollbarWidth(15);

    const { rerender } = render(<Harness locked />);
    // jsdom normalizes "calc(0px + 15px)" down to "calc(15px)".
    expect(document.body.style.paddingRight).toBe("calc(15px)");

    rerender(<Harness locked={false} />);
    expect(document.body.style.paddingRight).toBe("");
    restore();
  });

  it("adds to any padding the body already had (nested locks compose)", () => {
    const restore = stubScrollbarWidth(10);
    document.body.style.paddingRight = "8px";

    const { rerender } = render(<Harness locked />);
    expect(document.body.style.paddingRight).toBe("calc(18px)");

    rerender(<Harness locked={false} />);
    expect(document.body.style.paddingRight).toBe("8px");
    document.body.style.paddingRight = "";
    restore();
  });

  it("does nothing when not locked", () => {
    const restore = stubScrollbarWidth(15);
    render(<Harness locked={false} />);
    expect(document.body.style.overflow).toBe("");
    expect(document.body.style.paddingRight).toBe("");
    restore();
  });

  it("restores the previous lock when the component unmounts", () => {
    const restore = stubScrollbarWidth(15);
    document.body.style.overflow = "scroll";

    const { unmount } = render(<Harness locked />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("scroll");
    expect(document.body.style.paddingRight).toBe("");
    document.body.style.overflow = "";
    restore();
  });
});
