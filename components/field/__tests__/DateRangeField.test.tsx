import { describe, it, expect, vi, afterEach } from "vitest";
import { createRef, act } from "react";
import {
  DateRangeHarness,
  DateHarness,
  cleanup,
  render,
  screen,
  fireEvent,
  within,
} from "./field-test-utils";
import { type FieldHandle, type FieldDateRangeValue } from "../Field";

afterEach(() => {
  cleanup();
});

describe("DateRangeField — engine value model", () => {


  it("stores both ends as fixed-zero UTC midnight strings", () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness handleRef={handle} />);

    act(() =>
      handle.current!.setValue({ from: "2025-01-10", to: "2025-03-20" }),
    );
    expect(handle.current!.getValue()).toEqual({
      from: "2025-01-10T00:00:00Z",
      to: "2025-03-20T00:00:00Z",
    });
  });

  it("preserves undefined ends for half-picks", () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness handleRef={handle} />);

    act(() => handle.current!.setValue({ from: "2025-01-10" }));
    expect(handle.current!.getValue()).toEqual({
      from: "2025-01-10T00:00:00Z",
      to: undefined,
    });
  });

  it("swaps out-of-order ends so from <= to", () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness handleRef={handle} />);

    act(() =>
      handle.current!.setValue({ from: "2025-03-20", to: "2025-01-10" }),
    );
    expect(handle.current!.getValue()).toEqual({
      from: "2025-01-10T00:00:00Z",
      to: "2025-03-20T00:00:00Z",
    });
  });

  it("a range is Empty unless both ends hold values", () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(
      <DateRangeHarness
        handleRef={handle}
        overrides={{ validator: { required: true } }}
      />,
    );

    // Half-pick: required should reject
    act(() => handle.current!.setValue({ from: "2025-01-10" }));
    let valid: boolean;
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(false);

    // Both ends: required should pass
    act(() =>
      handle.current!.setValue({ from: "2025-01-10", to: "2025-03-20" }),
    );
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(true);
  });

  it("min tests from and max tests to via string comparison", () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(
      <DateRangeHarness
        handleRef={handle}
        overrides={{
          validator: {
            min: "2025-06-01T00:00:00Z",
            max: "2025-12-31T00:00:00Z",
          },
        }}
      />,
    );

    // from < min → invalid
    act(() =>
      handle.current!.setValue({ from: "2025-03-15", to: "2025-09-01" }),
    );
    let valid: boolean;
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(false);

    // Both within bounds → valid
    act(() =>
      handle.current!.setValue({ from: "2025-07-01", to: "2025-11-01" }),
    );
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(true);

    // to > max → invalid
    act(() =>
      handle.current!.setValue({ from: "2025-07-01", to: "2026-01-01" }),
    );
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(false);
  });

  it("streams range progress live with undefined ends", () => {
    const spy = vi.fn();
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness onChangeSpy={spy} handleRef={handle} />);

    act(() => handle.current!.setValue({ from: "2025-01-10" }));
    expect(spy).toHaveBeenCalledWith({
      from: "2025-01-10T00:00:00Z",
      to: undefined,
    });
  });

  it("rejects invalid range input with a dev warning", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness handleRef={handle} />);

    act(() =>
      handle.current!.setValue({ from: "bad", to: "also-bad" }),
    );
    expect(handle.current!.getValue()).toEqual({
      from: undefined,
      to: undefined,
    });
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe("DateRangeField — calendar widget", () => {


  it("renders a trigger button with label and placeholder ghost when empty", () => {
    render(
      <DateRangeHarness overrides={{ placeholder: "Pick dates" }} />,
    );

    const trigger = screen.getByRole("button", { name: /Booking/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Booking")).toBeInTheDocument();
  });

  it("opens the calendar popup on trigger click", async () => {
    render(<DateRangeHarness />);

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Choose date range" })).toBeInTheDocument();
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("two-step picking: first click sets anchor, second click completes range", async () => {
    const spy = vi.fn();
    render(<DateRangeHarness onChangeSpy={spy} />);

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // First click: set anchor (day 10 of current month)
    const day10 = screen.getByRole("gridcell", { name: /August 10, 2026/ });
    await act(async () => {
      fireEvent.mouseDown(day10);
    });

    // Calendar should still be open
    expect(screen.getByRole("grid")).toBeInTheDocument();

    // Second click: complete range (day 20 of current month)
    const day20 = screen.getByRole("gridcell", { name: /August 20, 2026/ });
    await act(async () => {
      fireEvent.mouseDown(day20);
    });

    // Picks preview only — nothing commits until Apply.
    expect(spy).not.toHaveBeenCalled();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Draft range should remain highlighted in the grid after completion
    expect(screen.getByRole("gridcell", { name: /August 10, 2026/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("gridcell", { name: /August 20, 2026/ })).toHaveAttribute("aria-selected", "true");

    // Apply commits the completed pair.
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("button", { name: "Apply" }));
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].from).toBeDefined();
    expect(spy.mock.calls[0][0].to).toBeDefined();
  });

  it("picking does not commit: Cancel rolls back to the committed value", async () => {
    const spy = vi.fn();
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness onChangeSpy={spy} handleRef={handle} />);

    act(() =>
      handle.current!.setValue({ from: "2025-03-10", to: "2025-03-12" }),
    );
    // Seeding legitimately fires the observer; only picks must not.
    spy.mockClear();

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Two-step pick: anchor then complete.
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("gridcell", { name: /March 15, 2025/ }));
    });
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("gridcell", { name: /March 25, 2025/ }));
    });

    // Picks only preview; the Field's committed value is untouched.
    expect(spy).not.toHaveBeenCalled();
    expect(handle.current!.getValue()).toEqual({
      from: "2025-03-10T00:00:00Z",
      to: "2025-03-12T00:00:00Z",
    });

    // Cancel discards the draft and the face reverts to the committed value.
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("button", { name: "Cancel" }));
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(spy).not.toHaveBeenCalled();
    expect(handle.current!.getValue()).toEqual({
      from: "2025-03-10T00:00:00Z",
      to: "2025-03-12T00:00:00Z",
    });
  });

  it("draft range stays highlighted after the second click (no reset)", async () => {
    const spy = vi.fn();
    render(<DateRangeHarness onChangeSpy={spy} />);

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // First click: anchor (day 5)
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("gridcell", { name: /August 5, 2026/ }));
    });
    expect(screen.getByRole("gridcell", { name: /August 5, 2026/ })).toHaveAttribute("aria-selected", "true");

    // Second click: complete (day 25)
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("gridcell", { name: /August 25, 2026/ }));
    });

    // Both ends of the completed draft must still be highlighted
    expect(screen.getByRole("gridcell", { name: /August 5, 2026/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("gridcell", { name: /August 25, 2026/ })).toHaveAttribute("aria-selected", "true");

    // A third click starts a fresh pick: re-anchors and clears the old range
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("gridcell", { name: /August 12, 2026/ }));
    });
    expect(screen.getByRole("gridcell", { name: /August 12, 2026/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("gridcell", { name: /August 5, 2026/ })).not.toHaveAttribute("aria-selected", "true");
    // Re-anchoring is still draft-only: nothing has committed.
    expect(spy).not.toHaveBeenCalled();
  });

  it("out-of-order picking swaps ends so from <= to", async () => {
    const spy = vi.fn();
    render(<DateRangeHarness onChangeSpy={spy} />);

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // First click: set anchor (day 20 of current month)
    const day20 = screen.getByRole("gridcell", { name: /August 20, 2026/ });
    await act(async () => {
      fireEvent.mouseDown(day20);
    });

    // Second click: complete range before anchor (day 10 of current month)
    const day10 = screen.getByRole("gridcell", { name: /August 10, 2026/ });
    await act(async () => {
      fireEvent.mouseDown(day10);
    });

    // Picks stay in the draft; Apply commits with from <= to.
    expect(spy).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("button", { name: "Apply" }));
    });
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1][0];
    expect(lastCall.from).toBeDefined();
    expect(lastCall.to).toBeDefined();
    expect(lastCall.from <= lastCall.to).toBe(true);
  });

  it("hover preview clears when the pointer leaves the calendar grid", async () => {
    const spy = vi.fn();
    render(<DateRangeHarness onChangeSpy={spy} />);

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // First click: anchor (day 5)
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("gridcell", { name: /August 5, 2026/ }));
    });
    expect(screen.getByRole("gridcell", { name: /August 5, 2026/ })).toHaveAttribute("aria-selected", "true");

    // Hover a later day: preview end is highlighted
    const grid = screen.getByRole("grid");
    await act(async () => {
      fireEvent.mouseEnter(screen.getByRole("gridcell", { name: /August 20, 2026/ }));
    });
    expect(screen.getByRole("gridcell", { name: /August 20, 2026/ })).toHaveAttribute("aria-selected", "true");

    // Move the mouse outside the grid: preview must fall back to the anchor
    await act(async () => {
      fireEvent.mouseLeave(grid);
    });
    expect(screen.getByRole("gridcell", { name: /August 20, 2026/ })).not.toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("gridcell", { name: /August 5, 2026/ })).toHaveAttribute("aria-selected", "true");
  });

  it("opens above the field when there is no space below", async () => {
    const rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      if (this.tagName === "BUTTON") {
        // Trigger near the viewport bottom (jsdom viewport = 768px)
        return { top: 700, bottom: 740, left: 0, right: 200, width: 200, height: 40, x: 0, y: 700, toJSON: () => ({}) } as DOMRect;
      }
      // Calendar panel: 300px tall
      return { top: 0, bottom: 300, left: 0, right: 200, width: 200, height: 300, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    });

    render(<DateHarness />);
    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const dialog = screen.getByRole("dialog", { name: "Choose date" });
    expect(dialog).toHaveAttribute("data-placement", "top");
    expect(dialog.className).toContain("bottom-full");
    expect(dialog.className).not.toContain("top-full");

    rectSpy.mockRestore();
  });

  it("opens below the field when there is enough space below", async () => {
    render(<DateHarness />);
    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const dialog = screen.getByRole("dialog", { name: "Choose date" });
    // jsdom rects are all zeros → effectively unlimited space below
    expect(dialog).toHaveAttribute("data-placement", "bottom");
    expect(dialog.className).toContain("top-full");
  });

  it("half-picks preview live but never commit", async () => {
    const spy = vi.fn();
    render(<DateRangeHarness onChangeSpy={spy} />);

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // First click: set anchor (day 10 of current month)
    const day10 = screen.getByRole("gridcell", { name: /August 10, 2026/ });
    await act(async () => {
      fireEvent.mouseDown(day10);
    });

    // The half-pick previews on the trigger face but commits nothing.
    expect(trigger).toHaveTextContent(/Aug 10, 2026/);
    expect(spy).not.toHaveBeenCalled();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("required rejects a half-pick", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(
      <DateRangeHarness
        handleRef={handle}
        overrides={{ validator: { required: true } }}
      />,
    );

    // Set a half-pick
    act(() => handle.current!.setValue({ from: "2025-01-10" }));
    
    let valid: boolean;
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(false);
  });

  it("closed face joins with ' – ' for complete ranges", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness handleRef={handle} />);

    act(() =>
      handle.current!.setValue({
        from: "2025-03-15T00:00:00Z",
        to: "2025-03-20T00:00:00Z",
      }),
    );

    const trigger = screen.getByRole("button", { name: /Booking/i });
    expect(trigger).toHaveTextContent(/–/);
  });

  it("closed face shows set end plus trailing dash for half-picks", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness handleRef={handle} />);

    act(() => handle.current!.setValue({ from: "2025-03-15" }));

    const trigger = screen.getByRole("button", { name: /Booking/i });
    expect(trigger).toHaveTextContent(/–/);
  });

  it("min/max validators work with the calendar", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(
      <DateRangeHarness
        handleRef={handle}
        overrides={{
          validator: {
            min: "2025-06-01T00:00:00Z",
            max: "2025-12-31T00:00:00Z",
          },
        }}
      />,
    );

    // from < min → invalid
    act(() =>
      handle.current!.setValue({ from: "2025-03-15", to: "2025-09-01" }),
    );
    let valid: boolean;
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(false);

    // Both within bounds → valid
    act(() =>
      handle.current!.setValue({ from: "2025-07-01", to: "2025-11-01" }),
    );
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(true);
  });

  it("Escape closes the calendar without committing", async () => {
    const spy = vi.fn();
    render(<DateRangeHarness onChangeSpy={spy} />);

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Set anchor (day 10 of current month)
    const day10 = screen.getByRole("gridcell", { name: /August 10, 2026/ });
    await act(async () => {
      fireEvent.mouseDown(day10);
    });

    // Press Escape
    const grid = screen.getByRole("grid");
    await act(async () => {
      fireEvent.keyDown(grid, { key: "Escape" });
    });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("reopening with a committed range highlights start, end, and intermediate dates", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness handleRef={handle} />);

    // Set a committed range value
    act(() =>
      handle.current!.setValue({
        from: "2026-08-10T00:00:00Z",
        to: "2026-08-20T00:00:00Z",
      }),
    );

    const trigger = screen.getByRole("button", { name: /Booking/i });
    
    // Open the calendar
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Verify calendar is open
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    
    // Check that start date (day 10) has selected class
    const day10 = screen.getByRole("gridcell", { name: /August 10, 2026/ });
    expect(day10).toHaveAttribute("aria-selected", "true");
    
    // Check that end date (day 20) has selected class
    const day20 = screen.getByRole("gridcell", { name: /August 20, 2026/ });
    expect(day20).toHaveAttribute("aria-selected", "true");
    
    // Check that intermediate dates have in-range class
    const day15 = screen.getByRole("gridcell", { name: /August 15, 2026/ });
    expect(day15.className).toContain("bg-neutral-100");
  });

  it("reopening with a half-picked range highlights only the anchor date", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness handleRef={handle} />);

    // Set a half-picked range value (only from set)
    act(() =>
      handle.current!.setValue({
        from: "2026-08-10T00:00:00Z",
      }),
    );

    const trigger = screen.getByRole("button", { name: /Booking/i });
    
    // Open the calendar
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Verify calendar is open
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    
    // Check that start date (day 10) has selected class
    const day10 = screen.getByRole("gridcell", { name: /August 10, 2026/ });
    expect(day10).toHaveAttribute("aria-selected", "true");
    
    // Check that other dates don't have the in-range class (bg-neutral-100 without hover: prefix)
    const day15 = screen.getByRole("gridcell", { name: /August 15, 2026/ });
    expect(day15.className).not.toMatch(/(?<!hover:)(?<!dark:)bg-neutral-100/);
  });
});

describe("DateRangeField — year panel", () => {


  it("header click opens year panel with 12-year grid", async () => {
    render(<DateRangeHarness />);

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    expect(screen.getByRole("grid", { name: "Choose year" })).toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: /Booking/i })).not.toBeInTheDocument();
  });

  it("year grid renders 12 years derived from draftYear", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T00:00:00Z",
        to: "2025-06-20T00:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    expect(screen.getByRole("gridcell", { name: "2016" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "2025" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "2027" })).toBeInTheDocument();
  });

  it("clicking a year sets overlay to month panel", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T00:00:00Z",
        to: "2025-06-20T00:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    const yearButton = screen.getByRole("gridcell", { name: "2024" });
    await act(async () => {
      fireEvent.mouseDown(yearButton);
    });

    expect(screen.queryByRole("grid", { name: "Choose year" })).not.toBeInTheDocument();
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("Escape from year panel closes the calendar popup", async () => {
    render(<DateRangeHarness />);

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    const yearGrid = screen.getByRole("grid", { name: "Choose year" });
    await act(async () => {
      fireEvent.keyDown(yearGrid, { key: "Escape" });
    });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("overlay resets to none when calendar closes", async () => {
    render(<DateRangeHarness />);

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    const grid = screen.getByRole("grid", { name: "Choose year" });
    await act(async () => {
      fireEvent.keyDown(grid, { key: "Escape" });
    });

    await act(async () => {
      fireEvent.click(trigger);
    });

    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "Choose year" })).not.toBeInTheDocument();
  });

  it("ArrowRight moves focus to the next year in the grid", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T00:00:00Z",
        to: "2025-06-20T00:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => { fireEvent.click(trigger); });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => { fireEvent.mouseDown(headerButton); });

    const yearGrid = screen.getByRole("grid", { name: "Choose year" });
    const year2025 = screen.getByRole("gridcell", { name: "2025" });
    expect(year2025).toHaveFocus();

    await act(async () => { fireEvent.keyDown(yearGrid, { key: "ArrowRight" }); });

    const year2026 = screen.getByRole("gridcell", { name: "2026" });
    expect(year2026).toHaveFocus();
  });

  it("Enter selects the focused year and transitions to month panel", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T00:00:00Z",
        to: "2025-06-20T00:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => { fireEvent.click(trigger); });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => { fireEvent.mouseDown(headerButton); });

    const yearGrid = screen.getByRole("grid", { name: "Choose year" });
    await act(async () => { fireEvent.keyDown(yearGrid, { key: "ArrowLeft" }); });
    const year2024 = screen.getByRole("gridcell", { name: "2024" });
    expect(year2024).toHaveFocus();

    await act(async () => { fireEvent.keyDown(yearGrid, { key: "Enter" }); });

    expect(screen.queryByRole("grid", { name: "Choose year" })).not.toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "Choose month" })).toBeInTheDocument();

    const jun = screen.getByRole("gridcell", { name: "Jun" });
    expect(jun).toHaveFocus();
  });
});

describe("DateRangeField — month panel", () => {


  it("month panel renders after year selection", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T00:00:00Z",
        to: "2025-06-20T00:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    const yearButton = screen.getByRole("gridcell", { name: "2024" });
    await act(async () => {
      fireEvent.mouseDown(yearButton);
    });

    expect(screen.getByRole("grid", { name: "Choose month" })).toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "Choose year" })).not.toBeInTheDocument();
  });

  it("month grid renders 12 months in a 3×4 grid", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T00:00:00Z",
        to: "2025-06-20T00:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });
    const yearButton = screen.getByRole("gridcell", { name: "2024" });
    await act(async () => {
      fireEvent.mouseDown(yearButton);
    });

    const monthGrid = screen.getByRole("grid", { name: "Choose month" });
    const monthButtons = monthGrid.querySelectorAll('[role="gridcell"]');
    expect(monthButtons).toHaveLength(12);

    expect(screen.getByRole("gridcell", { name: "Jan" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "Dec" })).toBeInTheDocument();
  });

  it("clicking a month returns to day grid with correct month/year", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T00:00:00Z",
        to: "2025-06-20T00:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });
    const yearButton = screen.getByRole("gridcell", { name: "2024" });
    await act(async () => {
      fireEvent.mouseDown(yearButton);
    });

    const monthButton = screen.getByRole("gridcell", { name: "Mar" });
    await act(async () => {
      fireEvent.mouseDown(monthButton);
    });

    expect(screen.queryByRole("grid", { name: "Choose month" })).not.toBeInTheDocument();
    expect(screen.getByRole("grid")).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Choose year" })).toHaveTextContent("March 2024");
  });

  it("Escape from month panel closes the calendar popup", async () => {
    render(<DateRangeHarness />);

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });
    const yearButton = screen.getByRole("gridcell", { name: "2024" });
    await act(async () => {
      fireEvent.mouseDown(yearButton);
    });

    const monthGrid = screen.getByRole("grid", { name: "Choose month" });
    await act(async () => {
      fireEvent.keyDown(monthGrid, { key: "Escape" });
    });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ArrowRight moves focus to the next month in the grid", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T00:00:00Z",
        to: "2025-06-20T00:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => { fireEvent.click(trigger); });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => { fireEvent.mouseDown(headerButton); });
    const yearButton = screen.getByRole("gridcell", { name: "2025" });
    await act(async () => { fireEvent.mouseDown(yearButton); });

    const monthGrid = screen.getByRole("grid", { name: "Choose month" });
    const jun = screen.getByRole("gridcell", { name: "Jun" });
    expect(jun).toHaveFocus();

    await act(async () => { fireEvent.keyDown(monthGrid, { key: "ArrowRight" }); });

    const jul = screen.getByRole("gridcell", { name: "Jul" });
    expect(jul).toHaveFocus();
  });

  it("Enter selects the focused month and returns to day grid", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T00:00:00Z",
        to: "2025-06-20T00:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => { fireEvent.click(trigger); });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => { fireEvent.mouseDown(headerButton); });
    const yearButton = screen.getByRole("gridcell", { name: "2024" });
    await act(async () => { fireEvent.mouseDown(yearButton); });

    const monthGrid = screen.getByRole("grid", { name: "Choose month" });
    await act(async () => { fireEvent.keyDown(monthGrid, { key: "ArrowUp" }); });
    const mar = screen.getByRole("gridcell", { name: "Mar" });
    expect(mar).toHaveFocus();

    await act(async () => { fireEvent.keyDown(monthGrid, { key: "Enter" }); });

    expect(screen.queryByRole("grid", { name: "Choose month" })).not.toBeInTheDocument();
    const dayGrid = screen.getByRole("grid");
    expect(dayGrid).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose year" })).toHaveTextContent("March 2024");
  });
});

describe("DateRangeField — min/max constraints on year and month panels", () => {


  it("years outside min/max range render as disabled in the year panel", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(
      <DateRangeHarness
        handleRef={handle}
        overrides={{ validator: { min: "2020-03-15", max: "2030-08-20" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T00:00:00Z",
        to: "2025-06-20T00:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    const year2019 = screen.getByRole("gridcell", { name: "2019" });
    expect(year2019).toHaveAttribute("aria-disabled", "true");
    expect(year2019).toBeDisabled();

    const year2020 = screen.getByRole("gridcell", { name: "2020" });
    expect(year2020).not.toHaveAttribute("aria-disabled");
    expect(year2020).not.toBeDisabled();
  });

  it("months outside min/max range render as disabled in the month panel", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(
      <DateRangeHarness
        handleRef={handle}
        overrides={{ validator: { min: "2025-05-01", max: "2025-09-30" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T00:00:00Z",
        to: "2025-06-20T00:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    const yearButton = screen.getByRole("gridcell", { name: "2025" });
    await act(async () => {
      fireEvent.mouseDown(yearButton);
    });

    const jan = screen.getByRole("gridcell", { name: "Jan" });
    expect(jan).toHaveAttribute("aria-disabled", "true");
    expect(jan).toBeDisabled();

    const may = screen.getByRole("gridcell", { name: "May" });
    expect(may).not.toHaveAttribute("aria-disabled");
    expect(may).not.toBeDisabled();

    const oct = screen.getByRole("gridcell", { name: "Oct" });
    expect(oct).toHaveAttribute("aria-disabled", "true");
    expect(oct).toBeDisabled();
  });

  it("disabled years cannot be clicked/selected", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(
      <DateRangeHarness
        handleRef={handle}
        overrides={{ validator: { min: "2022-01-01" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T00:00:00Z",
        to: "2025-06-20T00:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    const disabledYear = screen.getByRole("gridcell", { name: "2019" });
    await act(async () => {
      fireEvent.mouseDown(disabledYear);
    });

    expect(screen.getByRole("grid", { name: "Choose year" })).toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "Choose month" })).not.toBeInTheDocument();
  });

  it("disabled months cannot be clicked/selected", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(
      <DateRangeHarness
        handleRef={handle}
        overrides={{ validator: { min: "2025-06-01" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T00:00:00Z",
        to: "2025-06-20T00:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Booking/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    const yearButton = screen.getByRole("gridcell", { name: "2025" });
    await act(async () => {
      fireEvent.mouseDown(yearButton);
    });

    const disabledMonth = screen.getByRole("gridcell", { name: "Jan" });
    await act(async () => {
      fireEvent.mouseDown(disabledMonth);
    });

    expect(screen.getByRole("grid", { name: "Choose month" })).toBeInTheDocument();
  });
});
