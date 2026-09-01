import { describe, it, expect, vi, afterEach } from "vitest";
import { createRef, act } from "react";
import {
  DateTimeHarness,
  DateHarness,
  cleanup,
  render,
  screen,
  fireEvent,
  within,
} from "./__test__/field-test-utils";
import { type FieldHandle } from "./Field";

afterEach(() => {
  cleanup();
});

describe("DateTimeField — engine value model", () => {


  it("accepts a full Z-terminated ISO string as-is", () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateTimeHarness handleRef={handle} />);

    act(() => handle.current!.setValue("2025-03-15T14:30:00Z"));
    expect(handle.current!.getValue()).toBe("2025-03-15T14:30:00Z");
  });

  it("accepts a no-Z string and converts from local to UTC", () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateTimeHarness handleRef={handle} />);

    act(() => handle.current!.setValue("2025-03-15T14:30:00"));
    const value = handle.current!.getValue();
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/);
  });

  it("accepts a bare YYYY-MM-DD and treats as local midnight", () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateTimeHarness handleRef={handle} />);

    act(() => handle.current!.setValue("2025-03-15"));
    const value = handle.current!.getValue();
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/);
  });

  it("rejects an invalid string with a dev warning", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const handle = createRef<FieldHandle<string>>();
    render(<DateTimeHarness handleRef={handle} />);

    act(() => handle.current!.setValue("garbage"));
    expect(handle.current!.getValue()).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("streams the normalized value through onValueChange", () => {
    const spy = vi.fn();
    const handle = createRef<FieldHandle<string>>();
    render(<DateTimeHarness onChangeSpy={spy} handleRef={handle} />);

    act(() => handle.current!.setValue("2025-03-15T09:00:00Z"));
    expect(spy).toHaveBeenCalledWith("2025-03-15T09:00:00Z");
  });

  it("min validates the datetime string via lexicographic comparison", () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateTimeHarness
        handleRef={handle}
        overrides={{ validator: { min: "2025-06-01T00:00:00Z" } }}
      />,
    );

    act(() => handle.current!.setValue("2025-03-15T10:00:00Z"));
    let valid: boolean;
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(false);

    act(() => handle.current!.setValue("2025-07-01T10:00:00Z"));
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(true);
  });
});

describe("DateTimeField — calendar widget", () => {


  it("renders a trigger button with placeholder when empty", () => {
    render(
      <DateTimeHarness overrides={{ placeholder: "Pick date & time" }} />,
    );

    // Button accessible name comes from the label association; placeholder is visual ghost text
    const trigger = screen.getByRole("button", { name: "Appointment" });
    expect(trigger).toBeInTheDocument();
    expect(within(trigger).getByText("Pick date & time")).toBeInTheDocument();
  });

  it("opens calendar with time inputs for datetime kind", async () => {
    render(<DateTimeHarness />);

    const trigger = screen.getByRole("button", { name: /Appointment/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    expect(screen.getByRole("dialog", { name: "Choose date" })).toBeInTheDocument();
    expect(screen.getByLabelText("Hour")).toBeInTheDocument();
    expect(screen.getByLabelText("Minute")).toBeInTheDocument();
  });

  it("datetime Apply commits with time", async () => {
    const spy = vi.fn();
    render(<DateTimeHarness onChangeSpy={spy} />);

    const trigger = screen.getByRole("button", { name: /Appointment/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // Pick day 15
    const day15 = screen.getByRole("gridcell", { name: /15/ });
    await act(async () => {
      fireEvent.mouseDown(day15);
    });

    // Set time (local time)
    const hourInput = screen.getByLabelText("Hour");
    const minuteInput = screen.getByLabelText("Minute");
    await act(async () => {
      fireEvent.change(hourInput, { target: { value: "14" } });
      fireEvent.change(minuteInput, { target: { value: "30" } });
    });

    // Click Apply
    const apply = screen.getByRole("button", { name: "Apply" });
    await act(async () => {
      fireEvent.mouseDown(apply);
    });

    expect(spy).toHaveBeenCalled();
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1][0];
    // The value is the UTC equivalent of local 14:30 on the picked date
    expect(lastCall).toMatch(/^\d{4}-\d{2}-15T\d{2}:\d{2}:00Z$/);
  });

  it("datetime shows formatted value on trigger face", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateTimeHarness handleRef={handle} />);

    act(() => handle.current!.setValue("2025-03-15T14:30:00Z"));

    const trigger = screen.getByRole("button", { name: /Appointment/i });
    expect(trigger).toHaveTextContent(/Mar 15, 2025/);
    // Time displayed in local timezone — just check the date part
  });

  it("minutes type freely and clamp on blur", async () => {
    render(<DateTimeHarness />);

    const trigger = screen.getByRole("button", { name: /Appointment/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const minuteInput = screen.getByLabelText("Minute");

    // Type a value > 59
    await act(async () => {
      fireEvent.change(minuteInput, { target: { value: "75" } });
      fireEvent.blur(minuteInput);
    });

    // Should clamp to 59
    expect(minuteInput).toHaveValue("59");
  });

  it("Escape closes the datetime calendar from time input", async () => {
    render(<DateTimeHarness />);

    const trigger = screen.getByRole("button", { name: /Appointment/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const hourInput = screen.getByLabelText("Hour");
    await act(async () => {
      fireEvent.keyDown(hourInput, { key: "Escape" });
    });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});

describe("DateTimeField — year panel", () => {


  it("header click opens year panel with 12-year grid", async () => {
    render(<DateTimeHarness />);

    const trigger = screen.getByRole("button", { name: /Appointment/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => {
      fireEvent.mouseDown(headerButton);
    });

    expect(screen.getByRole("grid", { name: "Choose year" })).toBeInTheDocument();
    expect(screen.queryByRole("grid", { name: /Appointment/i })).not.toBeInTheDocument();
  });

  it("year grid renders 12 years derived from draftYear", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateTimeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15T10:30:00Z");
    });

    const trigger = screen.getByRole("button", { name: /Appointment/i });
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
    const handle = createRef<FieldHandle<string>>();
    render(<DateTimeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15T10:30:00Z");
    });

    const trigger = screen.getByRole("button", { name: /Appointment/i });
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
    render(<DateTimeHarness />);

    const trigger = screen.getByRole("button", { name: /Appointment/i });
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
    render(<DateTimeHarness />);

    const trigger = screen.getByRole("button", { name: /Appointment/i });
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
    const handle = createRef<FieldHandle<string>>();
    render(<DateTimeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15T10:30:00Z");
    });

    const trigger = screen.getByRole("button", { name: /Appointment/i });
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
    const handle = createRef<FieldHandle<string>>();
    render(<DateTimeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15T10:30:00Z");
    });

    const trigger = screen.getByRole("button", { name: /Appointment/i });
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

describe("DateTimeField — month panel", () => {


  it("month panel renders after year selection", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateTimeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15T10:30:00Z");
    });

    const trigger = screen.getByRole("button", { name: /Appointment/i });
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
    const handle = createRef<FieldHandle<string>>();
    render(<DateTimeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15T10:30:00Z");
    });

    const trigger = screen.getByRole("button", { name: /Appointment/i });
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
    const handle = createRef<FieldHandle<string>>();
    render(<DateTimeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15T10:30:00Z");
    });

    const trigger = screen.getByRole("button", { name: /Appointment/i });
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
    render(<DateTimeHarness />);

    const trigger = screen.getByRole("button", { name: /Appointment/i });
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
    const handle = createRef<FieldHandle<string>>();
    render(<DateTimeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15T10:30:00Z");
    });

    const trigger = screen.getByRole("button", { name: /Appointment/i });
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
    render(<DateTimeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15T10:30:00Z");
    });

    const trigger = screen.getByRole("button", { name: /Appointment/i });
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
    render(<DateTimeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15T10:30:00Z");
    });

    const trigger = screen.getByRole("button", { name: /Appointment/i });
    await act(async () => { fireEvent.click(trigger); });

    const headerButton = screen.getByRole("button", { name: "Choose year" });
    await act(async () => { fireEvent.mouseDown(headerButton); });
    const yearButton = screen.getByRole("gridcell", { name: "2025" });
    await act(async () => { fireEvent.mouseDown(yearButton); });

    const monthGrid = screen.getByRole("grid", { name: "Choose month" });

    await act(async () => { fireEvent.keyDown(monthGrid, { key: "ArrowDown" }); });

    const sep = screen.getByRole("gridcell", { name: "Sep" });
    expect(sep).toHaveFocus();
  });

  it("Enter selects the focused month and returns to day grid", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(<DateTimeHarness handleRef={handle} />);

    await act(async () => {
      handle.current!.setValue("2025-06-15T10:30:00Z");
    });

    const trigger = screen.getByRole("button", { name: /Appointment/i });
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

describe("DateTimeField — min/max constraints on year and month panels", () => {


  it("years outside min/max range render as disabled in the year panel", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateTimeHarness
        handleRef={handle}
        overrides={{ validator: { min: "2020-03-15", max: "2030-08-20" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue("2025-06-15T10:30:00Z");
    });

    const trigger = screen.getByRole("button", { name: /Appointment/i });
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
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateTimeHarness
        handleRef={handle}
        overrides={{ validator: { min: "2025-05-01", max: "2025-09-30" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue("2025-06-15T10:30:00Z");
    });

    const trigger = screen.getByRole("button", { name: /Appointment/i });
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
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateTimeHarness
        handleRef={handle}
        overrides={{ validator: { min: "2022-01-01" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue("2025-06-15T10:30:00Z");
    });

    const trigger = screen.getByRole("button", { name: /Appointment/i });
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
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateTimeHarness
        handleRef={handle}
        overrides={{ validator: { min: "2025-06-01" } }}
      />,
    );

    await act(async () => {
      handle.current!.setValue("2025-06-15T10:30:00Z");
    });

    const trigger = screen.getByRole("button", { name: /Appointment/i });
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
