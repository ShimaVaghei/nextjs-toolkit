import { describe, it, expect, vi, afterEach } from "vitest";
import { createRef, act } from "react";
import {
  DateTimeRangeHarness,
  DateTimeHarness,
  DateHarness,
  cleanup,
  render,
  screen,
  fireEvent,
  within,
} from "./field-test-utils";
import { type FieldHandle, type FieldDateRangeValue } from "../Field";

afterEach(() => { cleanup(); });

describe("DateTimeRangeField — engine value model", () => {


  it("stores both ends as fixed-width UTC datetime strings", () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateTimeRangeHarness handleRef={handle} />);

    act(() =>
      handle.current!.setValue({
        from: "2025-03-15T09:00:00Z",
        to: "2025-03-15T17:00:00Z",
      }),
    );
    expect(handle.current!.getValue()).toEqual({
      from: "2025-03-15T09:00:00Z",
      to: "2025-03-15T17:00:00Z",
    });
  });

  it("swaps out-of-order datetime ends", () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateTimeRangeHarness handleRef={handle} />);

    act(() =>
      handle.current!.setValue({
        from: "2025-03-15T17:00:00Z",
        to: "2025-03-15T09:00:00Z",
      }),
    );
    expect(handle.current!.getValue()).toEqual({
      from: "2025-03-15T09:00:00Z",
      to: "2025-03-15T17:00:00Z",
    });
  });

  it("required rejects a datetime range half-pick", () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(
      <DateTimeRangeHarness
        handleRef={handle}
        overrides={{ validator: { required: true } }}
      />,
    );

    act(() =>
      handle.current!.setValue({ from: "2025-03-15T09:00:00Z" }),
    );
    let valid: boolean;
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(false);
  });

  it("min tests from and max tests to for datetime ranges", () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(
      <DateTimeRangeHarness
        handleRef={handle}
        overrides={{
          validator: {
            min: "2025-06-01T00:00:00Z",
            max: "2025-12-31T23:59:59Z",
          },
        }}
      />,
    );

    act(() =>
      handle.current!.setValue({
        from: "2025-03-15T09:00:00Z",
        to: "2025-09-01T17:00:00Z",
      }),
    );
    let valid: boolean;
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(false); // from < min

    act(() =>
      handle.current!.setValue({
        from: "2025-07-01T09:00:00Z",
        to: "2025-11-01T17:00:00Z",
      }),
    );
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(true);
  });
});

describe("DateTimeRangeField — calendar widget", () => {


  it("opens calendar with independent start/end time controls", async () => {
    render(<DateTimeRangeHarness />);

    const trigger = screen.getByRole("button", { name: /Window/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    expect(screen.getByRole("dialog", { name: "Choose date range" })).toBeInTheDocument();
    expect(screen.getByLabelText("Start hour")).toBeInTheDocument();
    expect(screen.getByLabelText("Start minute")).toBeInTheDocument();
    expect(screen.getByLabelText("End hour")).toBeInTheDocument();
    expect(screen.getByLabelText("End minute")).toBeInTheDocument();
  });

  it("two-step picking with datetime-range commits both ends with time", async () => {
    const spy = vi.fn();
    render(<DateTimeRangeHarness onChangeSpy={spy} />);

    const trigger = screen.getByRole("button", { name: /Window/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Set start time using change events (no blur to avoid closing calendar)
    const startHourInput = screen.getByLabelText("Start hour");
    await act(async () => {
      fireEvent.change(startHourInput, { target: { value: "09" } });
    });
    const startMinuteInput = screen.getByLabelText("Start minute");
    await act(async () => {
      fireEvent.change(startMinuteInput, { target: { value: "30" } });
    });

    // Set end time
    const endHourInput = screen.getByLabelText("End hour");
    await act(async () => {
      fireEvent.change(endHourInput, { target: { value: "17" } });
    });
    const endMinuteInput = screen.getByLabelText("End minute");
    await act(async () => {
      fireEvent.change(endMinuteInput, { target: { value: "00" } });
    });

    // First click: set anchor (day 10 of current month)
    const day10 = screen.getByRole("gridcell", { name: /August 10, 2026/ });
    await act(async () => {
      fireEvent.mouseDown(day10);
    });

    // Second click: complete range (day 20 of current month)
    const day20 = screen.getByRole("gridcell", { name: /August 20, 2026/ });
    await act(async () => {
      fireEvent.mouseDown(day20);
    });

    // Apply commits the draft with time (may be UTC-converted)
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("button", { name: "Apply" }));
    });
    expect(spy).toHaveBeenCalled();
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1][0];
    // Verify time was included (may be UTC-converted from local)
    expect(lastCall.from).toMatch(/T\d{2}:\d{2}:00Z$/);
    expect(lastCall.to).toMatch(/T\d{2}:\d{2}:00Z$/);
    // Verify the times are different (start vs end)
    const fromTime = lastCall.from.match(/T(\d{2}:\d{2}):00Z$/)[1];
    const toTime = lastCall.to.match(/T(\d{2}:\d{2}):00Z$/)[1];
    expect(fromTime).not.toBe(toTime);
  });

  it("seeds start/end time controls with the field's displayed (local) times", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateTimeRangeHarness handleRef={handle} />);

    act(() =>
      handle.current!.setValue({ from: "2025-03-10T09:00:00Z", to: "2025-03-24T17:30:00Z" }),
    );

    const trigger = screen.getByRole("button", { name: /Window/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // The popup must show the same wall-clock times as the closed face,
    // i.e. the stored UTC instants rendered in the browser-local timezone
    // (same convention as the single datetime kind).
    const fromLocal = new Date("2025-03-10T09:00:00Z");
    const toLocal = new Date("2025-03-24T17:30:00Z");
    const pad2 = (n: number) => String(n).padStart(2, "0");
    expect(screen.getByLabelText("Start hour")).toHaveValue(pad2(fromLocal.getHours()));
    expect(screen.getByLabelText("Start minute")).toHaveValue(pad2(fromLocal.getMinutes()));
    expect(screen.getByLabelText("End hour")).toHaveValue(pad2(toLocal.getHours()));
    expect(screen.getByLabelText("End minute")).toHaveValue(pad2(toLocal.getMinutes()));
  });

  it("opening without a value seeds all time fields to now", async () => {
    render(<DateTimeRangeHarness />);

    const before = new Date();
    const trigger = screen.getByRole("button", { name: /Window/i });
    await act(async () => {
      fireEvent.click(trigger);
    });
    const after = new Date();
    const pad2 = (n: number) => String(n).padStart(2, "0");
    const minutes = [pad2(before.getMinutes()), pad2(after.getMinutes())];

    const startHour = screen.getByLabelText("Start hour") as HTMLInputElement;
    const startMinute = screen.getByLabelText("Start minute") as HTMLInputElement;
    const endHour = screen.getByLabelText("End hour") as HTMLInputElement;
    const endMinute = screen.getByLabelText("End minute") as HTMLInputElement;
    expect(startHour).toHaveValue(pad2(before.getHours()));
    expect(minutes).toContain(startMinute.value);
    expect(endHour).toHaveValue(pad2(before.getHours()));
    expect(minutes).toContain(endMinute.value);
  });

  it("picking days does not reset the start/end time controls", async () => {
    const spy = vi.fn();
    render(<DateTimeRangeHarness onChangeSpy={spy} />);

    const trigger = screen.getByRole("button", { name: /Window/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // User sets custom times before picking days
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Start hour"), { target: { value: "09" } });
      fireEvent.change(screen.getByLabelText("Start minute"), { target: { value: "30" } });
      fireEvent.change(screen.getByLabelText("End hour"), { target: { value: "17" } });
      fireEvent.change(screen.getByLabelText("End minute"), { target: { value: "00" } });
    });

    // First click: anchor (day 10)
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("gridcell", { name: /August 10, 2026/ }));
    });
    // Second click: complete (day 20)
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("gridcell", { name: /August 20, 2026/ }));
    });

    // Time controls must be untouched by day picking
    expect(screen.getByLabelText("Start hour")).toHaveValue("09");
    expect(screen.getByLabelText("Start minute")).toHaveValue("30");
    expect(screen.getByLabelText("End hour")).toHaveValue("17");
    expect(screen.getByLabelText("End minute")).toHaveValue("00");

    // Apply commits; the committed values carry the user's local times converted to UTC
    await act(async () => {
      fireEvent.mouseDown(screen.getByRole("button", { name: "Apply" }));
    });
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1][0];
    const expectedFrom = new Date(2026, 7, 10, 9, 30, 0).toISOString().replace(/\.\d{3}Z$/, "Z");
    const expectedTo = new Date(2026, 7, 20, 17, 0, 0).toISOString().replace(/\.\d{3}Z$/, "Z");
    expect(lastCall.from).toBe(expectedFrom);
    expect(lastCall.to).toBe(expectedTo);
  });

  it("apply after changing only times keeps both dates", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateTimeRangeHarness handleRef={handle} />);

    act(() =>
      handle.current!.setValue({ from: "2025-03-10T09:00:00Z", to: "2025-03-24T17:00:00Z" }),
    );

    const trigger = screen.getByRole("button", { name: /Window/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Change only the start time
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Start hour"), { target: { value: "11" } });
    });

    // Click Apply
    const apply = screen.getByRole("button", { name: "Apply" });
    await act(async () => {
      fireEvent.mouseDown(apply);
    });

    // Both ends must survive with the updated start time
    const value = handle.current!.getValue() as FieldDateRangeValue;
    expect(value.from).toBeDefined();
    expect(value.to).toBeDefined();
    // Start hour changed to 11; start minute keeps the seeded 30
    const expectedFrom = new Date(2025, 2, 10, 11, 30, 0).toISOString().replace(/\.\d{3}Z$/, "Z");
    expect(value.from).toBe(expectedFrom);
  });

  it("closed face joins datetime range with ' – '", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateTimeRangeHarness handleRef={handle} />);

    act(() =>
      handle.current!.setValue({
        from: "2025-03-15T09:00:00Z",
        to: "2025-03-15T17:00:00Z",
      }),
    );

    const trigger = screen.getByRole("button", { name: /Window/i });
    expect(trigger).toHaveTextContent(/–/);
  });

  it("half-pick shows set end plus trailing dash", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateTimeRangeHarness handleRef={handle} />);

    act(() => handle.current!.setValue({ from: "2025-03-15T09:00:00Z" }));

    const trigger = screen.getByRole("button", { name: /Window/i });
    expect(trigger).toHaveTextContent(/–/);
  });
});

describe("DateTimeRangeField — year panel", () => {


  it("header click opens year panel with 12-year grid", async () => {
    render(<DateTimeRangeHarness />);

    const trigger = screen.getByRole("button", { name: /Window/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    expect(screen.getByRole("grid", { name: "Choose year" })).toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: /Window/i })).not.toBeInTheDocument();
  });

  it("year grid renders 12 years derived from draftYear", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateTimeRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T09:00:00Z",
        to: "2025-06-20T17:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Window/i });
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
    render(<DateTimeRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T09:00:00Z",
        to: "2025-06-20T17:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Window/i });
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
    render(<DateTimeRangeHarness />);

    const trigger = screen.getByRole("button", { name: /Window/i });
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
    render(<DateTimeRangeHarness />);

    const trigger = screen.getByRole("button", { name: /Window/i });
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
    render(<DateTimeRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T09:00:00Z",
        to: "2025-06-20T17:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Window/i });
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
    render(<DateTimeRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T09:00:00Z",
        to: "2025-06-20T17:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Window/i });
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

describe("DateTimeRangeField — month panel", () => {


  it("month panel renders after year selection", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(<DateTimeRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T09:00:00Z",
        to: "2025-06-20T17:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Window/i });
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
    render(<DateTimeRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T09:00:00Z",
        to: "2025-06-20T17:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Window/i });
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
    render(<DateTimeRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T09:00:00Z",
        to: "2025-06-20T17:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Window/i });
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
    render(<DateTimeRangeHarness />);

    const trigger = screen.getByRole("button", { name: /Window/i });
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
    render(<DateTimeRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T09:00:00Z",
        to: "2025-06-20T17:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Window/i });
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
    render(<DateTimeRangeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T09:00:00Z",
        to: "2025-06-20T17:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Window/i });
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

describe("DateTimeRangeField — min/max constraints on year and month panels", () => {


  it("years outside min/max range render as disabled in the year panel", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(
      <DateTimeRangeHarness
        handleRef={handle}
        overrides={{ validator: { min: "2020-03-15", max: "2030-08-20" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T09:00:00Z",
        to: "2025-06-20T17:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Window/i });
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
      <DateTimeRangeHarness
        handleRef={handle}
        overrides={{ validator: { min: "2025-05-01", max: "2025-09-30" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T09:00:00Z",
        to: "2025-06-20T17:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Window/i });
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
      <DateTimeRangeHarness
        handleRef={handle}
        overrides={{ validator: { min: "2022-01-01" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T09:00:00Z",
        to: "2025-06-20T17:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Window/i });
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
      <DateTimeRangeHarness
        handleRef={handle}
        overrides={{ validator: { min: "2025-06-01" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue({
        from: "2025-06-15T09:00:00Z",
        to: "2025-06-20T17:00:00Z",
      });
    });

    const trigger = screen.getByRole("button", { name: /Window/i });
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
