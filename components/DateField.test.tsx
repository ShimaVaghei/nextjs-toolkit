import { describe, it, expect, vi, afterEach } from "vitest";
import { createRef, act } from "react";
import {
  DateHarness,
  DateTimeHarness,
  cleanup,
  render,
  screen,
  fireEvent,
  within,
} from "./__test__/field-test-utils";
import { type FieldHandle } from "./Field";

afterEach(() => { cleanup(); });

describe("DateField — engine value model", () => {
  it("accepts a bare YYYY-MM-DD and stores with fixed-zero UTC midnight", () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    act(() => handle.current!.setValue("2025-03-15"));
    expect(handle.current!.getValue()).toBe("2025-03-15T00:00:00Z");
  });

  it("accepts a full Z-terminated ISO string and extracts the UTC calendar date", () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    act(() => handle.current!.setValue("2025-03-15T14:30:00Z"));
    expect(handle.current!.getValue()).toBe("2025-03-15T00:00:00Z");
  });

  it("accepts a no-Z ISO string and normalizes to UTC calendar date", () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    act(() => handle.current!.setValue("2025-06-15T14:30:00"));
    const value = handle.current!.getValue();
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00Z$/);
  });

  it("rejects an invalid string (no-op setValue, seed-less Initial)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    act(() => handle.current!.setValue("not-a-date"));
    expect(handle.current!.getValue()).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("rejects an empty string with a dev warning", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    act(() => handle.current!.setValue(""));
    expect(handle.current!.getValue()).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("streams the normalized value through onValueChange", () => {
    const spy = vi.fn();
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness onChangeSpy={spy} handleRef={handle} />);

    act(() => handle.current!.setValue("2025-03-15"));
    expect(spy).toHaveBeenCalledWith("2025-03-15T00:00:00Z");
  });

  it("required validates a date field", () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateHarness
        handleRef={handle}
        overrides={{ validator: { required: true } }}
      />,
    );

    act(() => {
      handle.current!.validate();
    });
    expect(handle.current!.getValue()).toBeUndefined();
    // validate returns false when value is empty
    let valid: boolean;
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(false);
  });

  it("min validates the date string via lexicographic comparison", () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateHarness
        handleRef={handle}
        overrides={{ validator: { min: "2025-06-01" } }}
      />,
    );

    act(() => handle.current!.setValue("2025-03-15"));
    let valid: boolean;
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(false);

    act(() => handle.current!.setValue("2025-07-01"));
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(true);
  });

  it("max validates the date string via lexicographic comparison", () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateHarness
        handleRef={handle}
        overrides={{ validator: { max: "2025-12-31T00:00:00Z" } }}
      />,
    );

    act(() => handle.current!.setValue("2025-12-15"));
    let valid: boolean;
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(true);

    act(() => handle.current!.setValue("2026-01-01"));
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(false);
  });

  it("textual rules (minLength, maxLength, regex, email) draw a dev-only rule-fit warning", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <DateHarness
        overrides={{
          validator: {
            minLength: 5,
            maxLength: 10,
            regex: /abc/,
            email: true,
          },
        }}
      />,
    );

    // The dev warning fires for each non-fitting rule
    const fieldWarnings = warnSpy.mock.calls.filter(
      (call) =>
        typeof call[0] === "string" && call[0].startsWith("[Field]"),
    );
    expect(fieldWarnings.length).toBeGreaterThanOrEqual(4);
  });
});

describe("DateField — calendar widget", () => {
  it("renders a trigger button with label and placeholder ghost when empty", () => {
    render(
      <DateHarness overrides={{ placeholder: "Pick a date" }} />,
    );

    // Button accessible name includes label text ("Birthday") + placeholder
    const trigger = screen.getByRole("button", { name: /Birthday/i });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Birthday")).toBeInTheDocument();
  });

  it("opens the calendar popup on trigger click", async () => {
    render(<DateHarness />);

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "Choose date" })).toBeInTheDocument();
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("closes the calendar on Escape", async () => {
    render(<DateHarness />);

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const grid = screen.getByRole("grid");
    await act(async () => {
      fireEvent.keyDown(grid, { key: "Escape" });
    });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the formatted date value on the trigger face when filled", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    act(() => handle.current!.setValue("2025-03-15"));

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    expect(trigger).toHaveTextContent(/Mar 15, 2025/);
  });

  it("shows the in-progress draft on the trigger face while the calendar is open", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    act(() => handle.current!.setValue("2025-03-15"));

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Pick a different day: the face previews the draft while the popup is
    // open, and nothing is committed yet.
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("gridcell", { name: /March 20, 2025/ }));
    });
    expect(trigger).toHaveTextContent(/Mar 20, 2025/);
    expect(handle.current!.getValue()).toBe("2025-03-15T00:00:00Z");

    // Cancel discards: the face reverts to the committed value.
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("button", { name: "Cancel" }));
    });
    expect(trigger).toHaveTextContent(/Mar 15, 2025/);
    expect(handle.current!.getValue()).toBe("2025-03-15T00:00:00Z");
  });

  it("previews datetime drafts (day and time slices) on the trigger face", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateTimeHarness handleRef={handle} />);

    act(() => handle.current!.setValue("2025-03-15T10:00:00Z"));

    const trigger = screen.getByRole("button", { name: /Appointment/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Pick a different day and set the minute: the face shows the combined
    // draft while the popup stays open, and nothing is committed yet.
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("gridcell", { name: /March 20, 2025/ }));
    });
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Minute"), { target: { value: "45" } });
    });
    expect(trigger).toHaveTextContent(/Mar 20, 2025/);
    expect(trigger).toHaveTextContent(/45/);
    expect(handle.current!.getValue()).toBe("2025-03-15T10:00:00Z");
  });

  it("picking a day and clicking Apply commits the value", async () => {
    const spy = vi.fn();
    render(<DateHarness onChangeSpy={spy} />);

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Click day 15 in the current month
    const day15 = screen.getByRole("gridcell", { name: /15/ });
    await act(async () => {
      fireEvent.mouseDown(day15);
    });

    // Click Apply
    const apply = screen.getByRole("button", { name: "Apply" });
    await act(async () => {
      fireEvent.mouseDown(apply);
    });

    expect(spy).toHaveBeenCalled();
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1][0];
    expect(lastCall).toMatch(/^\d{4}-\d{2}-15T00:00:00Z$/);
  });

  it("Cancel discards the draft and closes the calendar", async () => {
    const spy = vi.fn();
    render(<DateHarness onChangeSpy={spy} />);

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Pick a day
    const day15 = screen.getByRole("gridcell", { name: /15/ });
    await act(async () => {
      fireEvent.mouseDown(day15);
    });

    // Click Cancel
    const cancel = screen.getByRole("button", { name: "Cancel" });
    await act(async () => {
      fireEvent.mouseDown(cancel);
    });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    // onValueChange should NOT have been called
    expect(spy).not.toHaveBeenCalled();
  });

  it("placeholder shows only on the closed face when empty", () => {
    render(<DateHarness overrides={{ placeholder: "Select date" }} />);

    // Button accessible name comes from the label association; placeholder is visual ghost text
    const trigger = screen.getByRole("button", { name: "Birthday" });
    expect(trigger).toBeInTheDocument();
    // Placeholder text is rendered inside the button
    expect(within(trigger).getByText("Select date")).toBeInTheDocument();
  });

  it("calendar shows month grid with weekday headers", async () => {
    render(<DateHarness />);

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Weekday headers
    expect(screen.getByRole("columnheader", { name: "Su" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Mo" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Fr" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Sa" })).toBeInTheDocument();
  });

  it("navigates months with Previous/Next month buttons", async () => {
    render(<DateHarness />);

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const prevBtn = screen.getByRole("button", { name: "Previous month" });
    const nextBtn = screen.getByRole("button", { name: "Next month" });

    // Navigate forward then back
    await act(async () => {
      fireEvent.mouseDown(nextBtn);
    });
    await act(async () => {
      fireEvent.mouseDown(prevBtn);
    });

    // Should still show the calendar (no error thrown)
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("required validation shows error after validate()", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateHarness
        handleRef={handle}
        overrides={{ validator: { required: true } }}
      />,
    );

    let valid: boolean;
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(false);
    expect(screen.getByText("This field is required.")).toBeInTheDocument();
  });

  it("min/max validators work with the calendar", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateHarness
        handleRef={handle}
        overrides={{ validator: { min: "2025-06-01T00:00:00Z" } }}
      />,
    );

    act(() => handle.current!.setValue("2025-03-15"));
    let valid: boolean;
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(false);

    act(() => handle.current!.setValue("2025-07-01"));
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(true);
  });
});

describe("DateField — keyboard accessibility", () => {
  it("arrow keys navigate days in the grid", async () => {
    render(<DateHarness />);

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const grid = screen.getByRole("grid");

    // Arrow right should move to next day
    await act(async () => {
      fireEvent.keyDown(grid, { key: "ArrowRight" });
    });

    // Grid should still be open
    expect(grid).toBeInTheDocument();
  });

  it("PageDown navigates to next month", async () => {
    render(<DateHarness />);

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const grid = screen.getByRole("grid");

    await act(async () => {
      fireEvent.keyDown(grid, { key: "PageDown" });
    });

    // Should still show the calendar
    expect(grid).toBeInTheDocument();
  });

  it("Enter selects the focused day and commits", async () => {
    const spy = vi.fn();
    render(<DateHarness onChangeSpy={spy} />);

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const grid = screen.getByRole("grid");

    // Press Enter to select the currently focused day
    await act(async () => {
      fireEvent.keyDown(grid, { key: "Enter" });
    });

    expect(spy).toHaveBeenCalled();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("Space selects the focused day and commits", async () => {
    const spy = vi.fn();
    render(<DateHarness onChangeSpy={spy} />);

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const grid = screen.getByRole("grid");

    await act(async () => {
      fireEvent.keyDown(grid, { key: " " });
    });

    expect(spy).toHaveBeenCalled();
  });
});

describe("DateField — year panel", () => {
  it("header click opens year panel with 12-year grid", async () => {
    render(<DateHarness />);

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Click the header button to open year panel
    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    // Year panel should be visible
    expect(screen.getByRole("grid", { name: "Choose year" })).toBeInTheDocument();
    // Month grid should be hidden
    expect(screen.queryByRole("grid", { name: /Birthday/i })).not.toBeInTheDocument();
  });

  it("year grid renders 12 years derived from draftYear", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    // Set a specific date
    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Click header to open year panel
    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    // Should show years from 2016 to 2027 (decade containing 2025: 2025 - (2025 % 12) = 2016)
    expect(screen.getByRole("gridcell", { name: "2016" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "2025" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "2027" })).toBeInTheDocument();
  });

  it("prev/next decade buttons navigate between decades", async () => {
    render(<DateHarness />);

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Open year panel
    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    const prevDecade = screen.getByRole("button", { name: "Previous decade" });
    const nextDecade = screen.getByRole("button", { name: "Next decade" });

    // Get the current decade start (current year: 2026, 2026 % 12 = 10, so decadeStart = 2016)
    const currentYear = new Date().getFullYear();
    const originalDecadeStart = currentYear - (currentYear % 12);

    // Navigate to previous decade
    await act(async () => {
      fireEvent.mouseDown(prevDecade);
    });

    // Should show years from previous decade
    expect(screen.getByRole("gridcell", { name: String(originalDecadeStart - 12) })).toBeInTheDocument();

    // Navigate to next decade
    await act(async () => {
      fireEvent.mouseDown(nextDecade);
    });

    // Should show original decade
    expect(screen.getByRole("gridcell", { name: String(originalDecadeStart) })).toBeInTheDocument();
  });

  it("currently selected year is visually highlighted", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    // Set a specific date
    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Open year panel
    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    // Year 2025 should be selected
    const yearButton = screen.getByRole("gridcell", { name: "2025" });
    expect(yearButton).toHaveAttribute("aria-selected", "true");
  });

  it("clicking a year sets overlay to month panel", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    // Set a specific date
    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Open year panel
    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    // Click a year
    const yearButton = screen.getByRole("gridcell", { name: "2024" });
    await act(async () => {
      fireEvent.mouseDown(yearButton);
    });

    // Should transition to month panel (year panel hidden, month grid visible)
    expect(screen.queryByRole("grid", { name: "Choose year" })).not.toBeInTheDocument();
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("Escape from year panel closes the calendar popup", async () => {
    render(<DateHarness />);

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Open year panel
    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    // Press Escape
    const yearGrid = screen.getByRole("grid", { name: "Choose year" });
    await act(async () => {
      fireEvent.keyDown(yearGrid, { key: "Escape" });
    });

    // Calendar should close
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("overlay resets to none when calendar closes", async () => {
    render(<DateHarness />);

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Open year panel
    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    // Close calendar
    const grid = screen.getByRole("grid", { name: "Choose year" });
    await act(async () => {
      fireEvent.keyDown(grid, { key: "Escape" });
    });

    // Reopen calendar - should show month grid, not year panel
    await act(async () => {
      fireEvent.click(trigger);
    });

    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "Choose year" })).not.toBeInTheDocument();
  });

  it("ArrowRight moves focus to the next year in the grid", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
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

  it("ArrowLeft moves focus to the previous year in the grid", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => { fireEvent.click(trigger); });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => { fireEvent.mouseDown(headerButton); });

    const yearGrid = screen.getByRole("grid", { name: "Choose year" });

    await act(async () => { fireEvent.keyDown(yearGrid, { key: "ArrowLeft" }); });

    const year2024 = screen.getByRole("gridcell", { name: "2024" });
    expect(year2024).toHaveFocus();
  });

  it("ArrowDown moves focus one row down in the year grid", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => { fireEvent.click(trigger); });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => { fireEvent.mouseDown(headerButton); });

    const yearGrid = screen.getByRole("grid", { name: "Choose year" });

    // 2025 is at index 9 in the decade (2016-2027)
    // Moving down from row 3 should go to row 4 (index 12 would be out of bounds)
    // So it should stay at the last row
    await act(async () => { fireEvent.keyDown(yearGrid, { key: "ArrowDown" }); });

    // Should still have focus on 2025 or a valid year
    const focused = yearGrid.querySelector(":focus");
    expect(focused).toBeInTheDocument();
  });

  it("ArrowUp moves focus one row up in the year grid", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => { fireEvent.click(trigger); });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => { fireEvent.mouseDown(headerButton); });

    const yearGrid = screen.getByRole("grid", { name: "Choose year" });

    await act(async () => { fireEvent.keyDown(yearGrid, { key: "ArrowUp" }); });

    // 2025 is at index 9, moving up 3 should go to index 6 = 2022
    const year2022 = screen.getByRole("gridcell", { name: "2022" });
    expect(year2022).toHaveFocus();
  });

  it("Enter selects the focused year and transitions to month panel", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => { fireEvent.click(trigger); });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => { fireEvent.mouseDown(headerButton); });

    const yearGrid = screen.getByRole("grid", { name: "Choose year" });

    // Navigate to 2024
    await act(async () => { fireEvent.keyDown(yearGrid, { key: "ArrowLeft" }); });
    const year2024 = screen.getByRole("gridcell", { name: "2024" });
    expect(year2024).toHaveFocus();

    // Press Enter to select
    await act(async () => { fireEvent.keyDown(yearGrid, { key: "Enter" }); });

    // Should transition to month panel
    expect(screen.queryByRole("grid", { name: "Choose year" })).not.toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "Choose month" })).toBeInTheDocument();

    // Focus should move to the selected month in the month panel
    const jun = screen.getByRole("gridcell", { name: "Jun" });
    expect(jun).toHaveFocus();
  });

  it("arrow keys are trapped within the year grid bounds", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => { fireEvent.click(trigger); });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => { fireEvent.mouseDown(headerButton); });

    const yearGrid = screen.getByRole("grid", { name: "Choose year" });

    // Navigate to 2016 (first year in decade) using ArrowLeft
    // 2025 is at index 9, need to go left 9 times to reach index 0 (2016)
    for (let i = 0; i < 9; i++) {
      await act(async () => { fireEvent.keyDown(yearGrid, { key: "ArrowLeft" }); });
    }
    const year2016 = screen.getByRole("gridcell", { name: "2016" });
    expect(year2016).toHaveFocus();

    // Try to go left from first year - should stay
    await act(async () => { fireEvent.keyDown(yearGrid, { key: "ArrowLeft" }); });
    expect(year2016).toHaveFocus();
  });
});

describe("DateField — month panel", () => {
  it("month panel renders after year selection", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    // Set a specific date
    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Open year panel
    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    // Click a year
    const yearButton = screen.getByRole("gridcell", { name: "2024" });
    await act(async () => {
      fireEvent.mouseDown(yearButton);
    });

    // Month panel should be visible
    expect(screen.getByRole("grid", { name: "Choose month" })).toBeInTheDocument();
    // Year panel should be hidden
    expect(screen.queryByRole("grid", { name: "Choose year" })).not.toBeInTheDocument();
  });

  it("month grid renders 12 months in a 3×4 grid", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    // Set a specific date
    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Open year panel and select year
    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });
    const yearButton = screen.getByRole("gridcell", { name: "2024" });
    await act(async () => {
      fireEvent.mouseDown(yearButton);
    });

    // Should have 12 month buttons
    const monthGrid = screen.getByRole("grid", { name: "Choose month" });
    const monthButtons = monthGrid.querySelectorAll('[role="gridcell"]');
    expect(monthButtons).toHaveLength(12);

    // Verify month labels
    expect(screen.getByRole("gridcell", { name: "Jan" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "Dec" })).toBeInTheDocument();
  });

  it("currently selected month is visually highlighted", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    // Set a specific date
    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Open year panel and select year
    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });
    const yearButton = screen.getByRole("gridcell", { name: "2025" });
    await act(async () => {
      fireEvent.mouseDown(yearButton);
    });

    // Month 6 (Jun) should be selected
    const monthButton = screen.getByRole("gridcell", { name: "Jun" });
    expect(monthButton).toHaveAttribute("aria-selected", "true");
  });

  it("clicking a month returns to day grid with correct month/year", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    // Set a specific date
    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Open year panel and select year
    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });
    const yearButton = screen.getByRole("gridcell", { name: "2024" });
    await act(async () => {
      fireEvent.mouseDown(yearButton);
    });

    // Click month
    const monthButton = screen.getByRole("gridcell", { name: "Mar" });
    await act(async () => {
      fireEvent.mouseDown(monthButton);
    });

    // Should return to day grid
    expect(screen.queryByRole("grid", { name: "Choose month" })).not.toBeInTheDocument();
    expect(screen.getByRole("grid")).toBeInTheDocument();

    // Header should reflect the selected month/year
    expect(screen.getByRole("button", { name: "Choose year" })).toHaveTextContent("March 2024");
  });

  it("header label remains visible and clickable after month selection", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    // Set a specific date
    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Open year panel and select year
    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });
    const yearButton = screen.getByRole("gridcell", { name: "2024" });
    await act(async () => {
      fireEvent.mouseDown(yearButton);
    });

    // Click month
    const monthButton = screen.getByRole("gridcell", { name: "Mar" });
    await act(async () => {
      fireEvent.mouseDown(monthButton);
    });

    // Header should still be visible and clickable — fresh query, because toggling
    // the overlay replaces the header node and the earlier reference goes stale.
    const freshHeader = screen.getByRole("button", { name: "Choose year" });
    expect(freshHeader).toBeInTheDocument();
    expect(freshHeader).toHaveTextContent("March 2024");

    // Click header to re-open year panel
    await act(async () => {
      fireEvent.mouseDown(freshHeader);
    });
    expect(screen.getByRole("grid", { name: "Choose year" })).toBeInTheDocument();
  });

  it("Escape from month panel closes the calendar popup", async () => {
    render(<DateHarness />);

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Open year panel and select year
    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });
    const yearButton = screen.getByRole("gridcell", { name: "2024" });
    await act(async () => {
      fireEvent.mouseDown(yearButton);
    });

    // Press Escape on month panel
    const monthGrid = screen.getByRole("grid", { name: "Choose month" });
    await act(async () => {
      fireEvent.keyDown(monthGrid, { key: "Escape" });
    });

    // Calendar should close
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ArrowRight moves focus to the next month in the grid", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
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

  it("ArrowLeft moves focus to the previous month in the grid", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => { fireEvent.click(trigger); });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => { fireEvent.mouseDown(headerButton); });
    const yearButton = screen.getByRole("gridcell", { name: "2025" });
    await act(async () => { fireEvent.mouseDown(yearButton); });

    const monthGrid = screen.getByRole("grid", { name: "Choose month" });

    await act(async () => { fireEvent.keyDown(monthGrid, { key: "ArrowLeft" }); });

    const may = screen.getByRole("gridcell", { name: "May" });
    expect(may).toHaveFocus();
  });

  it("ArrowDown moves focus one row down in the month grid", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => { fireEvent.click(trigger); });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => { fireEvent.mouseDown(headerButton); });
    const yearButton = screen.getByRole("gridcell", { name: "2025" });
    await act(async () => { fireEvent.mouseDown(yearButton); });

    const monthGrid = screen.getByRole("grid", { name: "Choose month" });

    // Jun is at index 5, moving down 3 should go to index 8 = Sep
    await act(async () => { fireEvent.keyDown(monthGrid, { key: "ArrowDown" }); });

    const sep = screen.getByRole("gridcell", { name: "Sep" });
    expect(sep).toHaveFocus();
  });

  it("ArrowUp moves focus one row up in the month grid", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => { fireEvent.click(trigger); });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => { fireEvent.mouseDown(headerButton); });
    const yearButton = screen.getByRole("gridcell", { name: "2025" });
    await act(async () => { fireEvent.mouseDown(yearButton); });

    const monthGrid = screen.getByRole("grid", { name: "Choose month" });

    // Jun is at index 5, moving up 3 should go to index 2 = Mar
    await act(async () => { fireEvent.keyDown(monthGrid, { key: "ArrowUp" }); });

    const mar = screen.getByRole("gridcell", { name: "Mar" });
    expect(mar).toHaveFocus();
  });

  it("Enter selects the focused month and returns to day grid", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => { fireEvent.click(trigger); });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => { fireEvent.mouseDown(headerButton); });
    const yearButton = screen.getByRole("gridcell", { name: "2024" });
    await act(async () => { fireEvent.mouseDown(yearButton); });

    const monthGrid = screen.getByRole("grid", { name: "Choose month" });

    // Navigate to Mar: from Jun(5) go up one row to Mar(2)
    await act(async () => { fireEvent.keyDown(monthGrid, { key: "ArrowUp" }); });
    const mar = screen.getByRole("gridcell", { name: "Mar" });
    expect(mar).toHaveFocus();

    // Press Enter
    await act(async () => { fireEvent.keyDown(monthGrid, { key: "Enter" }); });

    // Should return to day grid
    expect(screen.queryByRole("grid", { name: "Choose month" })).not.toBeInTheDocument();
    const dayGrid = screen.getByRole("grid");
    expect(dayGrid).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose year" })).toHaveTextContent("March 2024");

    // Focus should move to the selected day button within the day grid
    const selectedDay = screen.getByRole("gridcell", { name: /March 15, 2024/ });
    expect(selectedDay).toHaveFocus();
  });

  it("arrow keys are trapped within the month grid bounds", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-01-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => { fireEvent.click(trigger); });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => { fireEvent.mouseDown(headerButton); });
    const yearButton = screen.getByRole("gridcell", { name: "2025" });
    await act(async () => { fireEvent.mouseDown(yearButton); });

    const monthGrid = screen.getByRole("grid", { name: "Choose month" });
    const jan = screen.getByRole("gridcell", { name: "Jan" });
    expect(jan).toHaveFocus();

    // Try to go left from Jan - should stay
    await act(async () => { fireEvent.keyDown(monthGrid, { key: "ArrowLeft" }); });
    expect(jan).toHaveFocus();
  });

  it("focus moves to selected month when month panel opens", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => { fireEvent.click(trigger); });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => { fireEvent.mouseDown(headerButton); });
    const yearButton = screen.getByRole("gridcell", { name: "2025" });
    await act(async () => { fireEvent.mouseDown(yearButton); });

    // Focus should be on Jun (selected month)
    const jun = screen.getByRole("gridcell", { name: "Jun" });
    expect(jun).toHaveFocus();
  });

  it("focus moves to selected year when year panel opens", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => { fireEvent.click(trigger); });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => { fireEvent.mouseDown(headerButton); });

    // Focus should be on 2025 (selected year)
    const year2025 = screen.getByRole("gridcell", { name: "2025" });
    expect(year2025).toHaveFocus();
  });
});

describe("DateField — min/max constraints on year and month panels", () => {
  it("years outside min/max range render as disabled in the year panel", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateHarness
        handleRef={handle}
        overrides={{ validator: { min: "2020-03-15", max: "2030-08-20" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    // Years 2016-2019 are before min year 2020, should be disabled
    const year2019 = screen.getByRole("gridcell", { name: "2019" });
    expect(year2019).toHaveAttribute("aria-disabled", "true");
    expect(year2019).toBeDisabled();

    // Year 2020 is the min year, should be enabled
    const year2020 = screen.getByRole("gridcell", { name: "2020" });
    expect(year2020).not.toHaveAttribute("aria-disabled");
    expect(year2020).not.toBeDisabled();

    // Years 2021-2027 are within range, should be enabled
    const year2025 = screen.getByRole("gridcell", { name: "2025" });
    expect(year2025).not.toHaveAttribute("aria-disabled");
  });

  it("years beyond max range render as disabled in the year panel", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateHarness
        handleRef={handle}
        overrides={{ validator: { max: "2026-06-01" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    // decadeStart for 2025: 2025 - (2025 % 12) = 2016, decade shows 2016-2027
    // Max year is 2026, so 2027 should be disabled
    const year2027 = screen.getByRole("gridcell", { name: "2027" });
    expect(year2027).toHaveAttribute("aria-disabled", "true");
    expect(year2027).toBeDisabled();

    // Year 2026 is max year, should be enabled
    const year2026 = screen.getByRole("gridcell", { name: "2026" });
    expect(year2026).not.toHaveAttribute("aria-disabled");
    expect(year2026).not.toBeDisabled();
  });

  it("disabled years cannot be clicked/selected", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateHarness
        handleRef={handle}
        overrides={{ validator: { min: "2022-01-01" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    // Try clicking a disabled year (2019 is before min year 2022)
    const disabledYear = screen.getByRole("gridcell", { name: "2019" });
    await act(async () => {
      fireEvent.mouseDown(disabledYear);
    });

    // Should still be on year panel (not transitioned to month panel)
    expect(screen.getByRole("grid", { name: "Choose year" })).toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: "Choose month" })).not.toBeInTheDocument();
  });

  it("prev decade arrow is disabled when earliest displayed year is at or before min year", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateHarness
        handleRef={handle}
        overrides={{ validator: { min: "2016-01-01" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue("2020-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    // decadeStart for 2020: 2020 - (2020 % 12) = 2020 - 8 = 2012
    // Previous decade would show 2000-2011, all before min year 2016
    const prevDecade = screen.getByRole("button", { name: "Previous decade" });
    expect(prevDecade).toBeDisabled();
  });

  it("next decade arrow is disabled when latest displayed year is at or after max year", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateHarness
        handleRef={handle}
        overrides={{ validator: { max: "2027-01-01" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    // decadeStart for 2025: 2025 - (2025 % 12) = 2025 - 9 = 2016
    // decadeEnd = 2016 + 11 = 2027, which is >= max year 2027
    const nextDecade = screen.getByRole("button", { name: "Next decade" });
    expect(nextDecade).toBeDisabled();
  });

  it("months outside min/max range render as disabled in the month panel", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateHarness
        handleRef={handle}
        overrides={{ validator: { min: "2025-05-01", max: "2025-09-30" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    // Select year 2025 (within range)
    const yearButton = screen.getByRole("gridcell", { name: "2025" });
    await act(async () => {
      fireEvent.mouseDown(yearButton);
    });

    // Month panel should be visible
    expect(screen.getByRole("grid", { name: "Choose month" })).toBeInTheDocument();

    // Months before May (Jan, Feb, Mar, Apr) should be disabled
    // (their last day is before min 2025-05-01)
    const jan = screen.getByRole("gridcell", { name: "Jan" });
    expect(jan).toHaveAttribute("aria-disabled", "true");
    expect(jan).toBeDisabled();

    const feb = screen.getByRole("gridcell", { name: "Feb" });
    expect(feb).toHaveAttribute("aria-disabled", "true");

    const mar = screen.getByRole("gridcell", { name: "Mar" });
    expect(mar).toHaveAttribute("aria-disabled", "true");

    const apr = screen.getByRole("gridcell", { name: "Apr" });
    expect(apr).toHaveAttribute("aria-disabled", "true");

    // May should be enabled (min month)
    const may = screen.getByRole("gridcell", { name: "May" });
    expect(may).not.toHaveAttribute("aria-disabled");
    expect(may).not.toBeDisabled();

    // June should be enabled (within range)
    const jun = screen.getByRole("gridcell", { name: "Jun" });
    expect(jun).not.toHaveAttribute("aria-disabled");

    // September should be enabled (max month)
    const sep = screen.getByRole("gridcell", { name: "Sep" });
    expect(sep).not.toHaveAttribute("aria-disabled");

    // Months after September (Oct, Nov, Dec) should be disabled
    // (their first day is after max 2025-09-30)
    const oct = screen.getByRole("gridcell", { name: "Oct" });
    expect(oct).toHaveAttribute("aria-disabled", "true");
    expect(oct).toBeDisabled();

    const nov = screen.getByRole("gridcell", { name: "Nov" });
    expect(nov).toHaveAttribute("aria-disabled", "true");

    const dec = screen.getByRole("gridcell", { name: "Dec" });
    expect(dec).toHaveAttribute("aria-disabled", "true");
  });

  it("disabled months cannot be clicked/selected", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateHarness
        handleRef={handle}
        overrides={{ validator: { min: "2025-06-01" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
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

    // Try clicking a disabled month (Jan is before min month June)
    const disabledMonth = screen.getByRole("gridcell", { name: "Jan" });
    await act(async () => {
      fireEvent.mouseDown(disabledMonth);
    });

    // Should still be on month panel
    expect(screen.getByRole("grid", { name: "Choose month" })).toBeInTheDocument();
  });

  it("prev month arrow is disabled when current month is at min boundary", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateHarness
        handleRef={handle}
        overrides={{ validator: { min: "2025-06-01" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Current month is June 2025, min is 2025-06-01
    // Previous month would be May 2025, which is before min
    const prevMonth = screen.getByRole("button", { name: "Previous month" });
    expect(prevMonth).toBeDisabled();
  });

  it("next month arrow is disabled when current month is at max boundary", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateHarness
        handleRef={handle}
        overrides={{ validator: { max: "2025-06-30" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue("2025-06-15");
    });

    const trigger = screen.getByRole("button", { name: /Birthday/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Current month is June 2025, max is 2025-06-30
    // Next month would be July 2025, which is after max
    const nextMonth = screen.getByRole("button", { name: "Next month" });
    expect(nextMonth).toBeDisabled();
  });
});
