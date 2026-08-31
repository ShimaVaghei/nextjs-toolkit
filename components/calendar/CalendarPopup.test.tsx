import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { createRef, useRef } from "react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { CalendarPopup } from "./CalendarPopup";
import { resolveCalendarPlacement } from "./calendarShared";
import type { DateInputKind } from "@/lib/date";

// ─── resolveCalendarPlacement — pure placement decision ────────────────

describe("resolveCalendarPlacement", () => {
  it("opens below when there is enough space under the field", () => {
    expect(resolveCalendarPlacement({ top: 100, bottom: 140 }, 300, 768)).toBe("bottom");
  });

  it("opens above when there is no space below but enough above", () => {
    expect(resolveCalendarPlacement({ top: 600, bottom: 640 }, 300, 768)).toBe("top");
  });

  it("picks the side with more space when neither side fits the panel", () => {
    expect(resolveCalendarPlacement({ top: 500, bottom: 540 }, 300, 768)).toBe("top");
    expect(resolveCalendarPlacement({ top: 40, bottom: 80 }, 300, 768)).toBe("bottom");
  });
});

// ─── CalendarPopup — behavior through the module's public interface ────

function PopupHarness({
  kind,
  value,
  min,
  max,
  onCommit = vi.fn(),
  onClose = vi.fn(),
  onDraftPreview,
  open = true,
}: {
  kind: DateInputKind;
  value?: string | { from?: string; to?: string };
  min?: string;
  max?: string;
  onCommit?: (raw: string | { from?: string; to?: string }) => void;
  onClose?: () => void;
  onDraftPreview?: (raw: string | { from?: string; to?: string }) => void;
  open?: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <div>
      <button type="button" ref={triggerRef}>
        Trigger
      </button>
      <CalendarPopup
        kind={kind}
        value={value as never}
        min={min}
        max={max}
        triggerRef={triggerRef}
        open={open}
        onClose={onClose}
        onCommit={onCommit as never}
        onDraftPreview={onDraftPreview as never}
        panelId="panel"
        gridId="grid"
      />
    </div>
  );
}

function openPopup(
  kind: DateInputKind,
  value?: string | { from?: string; to?: string },
) {
  const onCommit = vi.fn();
  const onClose = vi.fn();
  render(<PopupHarness kind={kind} value={value} open onCommit={onCommit} onClose={onClose} />);
  return { onCommit, onClose };
}

describe("CalendarPopup — seeding (date kinds)", () => {
  afterEach(cleanup);

  it("seeds the day grid from the committed value", () => {
    openPopup("date", "2024-03-15");
    expect(screen.getByRole("button", { name: "Choose year" })).toHaveTextContent("March 2024");
    expect(screen.getByRole("gridcell", { name: /March 15, 2024/ })).toBeInTheDocument();
  });

  it("seeds the time slices from a datetime value (local wall-clock)", () => {
    openPopup("datetime", "2024-03-15T14:30:00Z");
    const hour = screen.getByLabelText("Hour") as HTMLInputElement;
    const minute = screen.getByLabelText("Minute") as HTMLInputElement;
    const local = new Date("2024-03-15T14:30:00Z");
    expect(hour.value).toBe(String(local.getHours()).padStart(2, "0"));
    expect(minute.value).toBe(String(local.getMinutes()).padStart(2, "0"));
  });

  it("falls back to today when the value is empty", () => {
    openPopup("date");
    const now = new Date();
    const label = now.toLocaleString("en-US", { month: "long" });
    expect(
      screen.getByRole("button", { name: "Choose year" }),
    ).toHaveTextContent(`${label} ${now.getFullYear()}`);
  });

  it("re-seeds from the value whenever the popup (re)opens", () => {
    const onCommit = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <PopupHarness kind="date" value="2024-03-15" open onCommit={onCommit} onClose={onClose} />,
    );
    expect(screen.getByRole("button", { name: "Choose year" })).toHaveTextContent("March 2024");
    rerender(
      <PopupHarness kind="date" value="2024-03-15" open={false} onCommit={onCommit} onClose={onClose} />,
    );
    rerender(
      <PopupHarness kind="date" value="2025-01-02" open onCommit={onCommit} onClose={onClose} />,
    );
    expect(screen.getByRole("button", { name: "Choose year" })).toHaveTextContent("January 2025");
  });
});

describe("CalendarPopup — commit and cancel flows", () => {
  afterEach(cleanup);

  it("date: Apply commits the picked day and closes", () => {
    const { onCommit, onClose } = openPopup("date", "2024-03-15");
    fireEvent.mouseDown(screen.getByRole("gridcell", { name: /March 20, 2024/ }));
    fireEvent.mouseDown(screen.getByRole("button", { name: "Apply" }));
    expect(onCommit).toHaveBeenCalledWith("2024-03-20");
    expect(onClose).toHaveBeenCalled();
  });

  it("datetime: Apply commits the picked day with the edited time slices", () => {
    const { onCommit } = openPopup("datetime", "2024-03-15T10:00:00Z");
    fireEvent.change(screen.getByLabelText("Hour"), { target: { value: "22" } });
    fireEvent.change(screen.getByLabelText("Minute"), { target: { value: "00" } });
    fireEvent.mouseDown(screen.getByRole("button", { name: "Apply" }));
    expect(onCommit).toHaveBeenCalledWith("2024-03-15T22:00:00");
  });

  it("Cancel discards the draft: no commit, onClose only", () => {
    const { onCommit, onClose } = openPopup("date", "2024-03-15");
    fireEvent.mouseDown(screen.getByRole("gridcell", { name: /March 20, 2024/ }));
    fireEvent.mouseDown(screen.getByRole("button", { name: "Cancel" }));
    expect(onCommit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Escape maps to onClose — indistinguishable from Cancel", () => {
    const { onCommit, onClose } = openPopup("date", "2024-03-15");
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Choose date" }), { key: "Escape" });
    expect(onCommit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("outside click maps to onClose without committing", () => {
    const { onCommit, onClose } = openPopup("date", "2024-03-15");
    fireEvent.pointerDown(document.body);
    expect(onCommit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("CalendarPopup — range picking", () => {
  afterEach(cleanup);

  it("date-range: two-step pick streams the half-pick, then Apply commits both ends", () => {
    // Seed a complete (degenerate) range so the day grid lands on March 2024
    // and the next click starts a fresh two-step pick.
    const { onCommit } = openPopup("date-range", { from: "2024-03-15", to: "2024-03-15" });
    // First click sets a fresh anchor and streams the half-pick.
    fireEvent.mouseDown(screen.getByRole("gridcell", { name: /March 20, 2024/ }));
    expect(onCommit).toHaveBeenCalledWith({ from: "2024-03-20", to: undefined });
    // Second click completes the range; the streamed commit carries both ends.
    fireEvent.mouseDown(screen.getByRole("gridcell", { name: /March 25, 2024/ }));
    expect(onCommit).toHaveBeenLastCalledWith({ from: "2024-03-20", to: "2024-03-25" });
    // Apply commits the completed pair again for Field's normalization.
    fireEvent.mouseDown(screen.getByRole("button", { name: "Apply" }));
    expect(onCommit).toHaveBeenLastCalledWith({ from: "2024-03-20", to: "2024-03-25" });
  });

  it("date-range: the popup stays open after completing the range (review before Apply)", () => {
    const { onClose } = openPopup("date-range", { from: "2024-03-10" });
    fireEvent.mouseDown(screen.getByRole("gridcell", { name: /March 15, 2024/ }));
    fireEvent.mouseDown(screen.getByRole("gridcell", { name: /March 20, 2024/ }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Choose date range" })).toBeInTheDocument();
  });

  it("datetime-range: Apply commits both ends carrying the edited time slices", () => {
    const { onCommit } = openPopup("datetime-range", { from: "2024-03-10" });
    // The seeded anchor makes the first click complete the range 10 → 15.
    fireEvent.mouseDown(screen.getByRole("gridcell", { name: /March 15, 2024/ }));
    fireEvent.change(screen.getByLabelText("Start hour"), { target: { value: "08" } });
    fireEvent.change(screen.getByLabelText("Start minute"), { target: { value: "00" } });
    fireEvent.change(screen.getByLabelText("End hour"), { target: { value: "17" } });
    fireEvent.change(screen.getByLabelText("End minute"), { target: { value: "00" } });
    fireEvent.mouseDown(screen.getByRole("button", { name: "Apply" }));
    expect(onCommit).toHaveBeenLastCalledWith({
      from: "2024-03-10T08:00:00",
      to: "2024-03-15T17:00:00",
    });
  });
});

describe("CalendarPopup — stacked year/month overlay", () => {
  afterEach(cleanup);

  it("year pick then month pick lands the day grid on the picked month/year", () => {
    openPopup("date", "2025-06-15");
    fireEvent.mouseDown(screen.getByRole("button", { name: "Choose year" }));
    fireEvent.mouseDown(screen.getByRole("gridcell", { name: "2024" }));
    fireEvent.mouseDown(screen.getByRole("gridcell", { name: "Mar" }));
    expect(screen.getByRole("button", { name: "Choose year" })).toHaveTextContent("March 2024");
  });

  it("Escape in the overlay closes the whole popup (discard)", () => {
    const { onClose, onCommit } = openPopup("date", "2025-06-15");
    fireEvent.mouseDown(screen.getByRole("button", { name: "Choose year" }));
    fireEvent.keyDown(screen.getByRole("grid", { name: "Choose year" }), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe("CalendarPopup — disclosure mechanics", () => {
  afterEach(cleanup);

  it("renders persistently but hidden when closed", () => {
    const { container } = render(<PopupHarness kind="date" value="2024-03-15" open={false} />);
    // A hidden panel leaves the accessibility tree, so query by id.
    const panel = container.querySelector("#panel");
    expect(panel).not.toBeNull();
    expect(panel).toHaveAttribute("hidden");
    expect(panel).toHaveAttribute("role", "dialog");
  });

  it("carries the placement attribute measured from the trigger", () => {
    render(<PopupHarness kind="date" value="2024-03-15" open />);
    // jsdom reports zero geometry, so this only asserts the wiring; the flip
    // decision itself is covered by the resolveCalendarPlacement unit tests.
    expect(screen.getByRole("dialog", { name: "Choose date" })).toHaveAttribute("data-placement");
  });
});



// ─── CalendarPopup — draft preview streaming ────────────────────────────

describe("CalendarPopup — draft preview", () => {
  afterEach(cleanup);

  it("streams the seeded draft immediately on open", () => {
    const onDraftPreview = vi.fn();
    render(<PopupHarness kind="date" value="2024-03-15" open onDraftPreview={onDraftPreview} />);
    expect(onDraftPreview).toHaveBeenCalledWith("2024-03-15");
  });

  it("streams the new draft when a day is picked (date kind), without committing", () => {
    const onDraftPreview = vi.fn();
    const onCommit = vi.fn();
    render(
      <PopupHarness kind="date" value="2024-03-15" open onCommit={onCommit} onDraftPreview={onDraftPreview} />,
    );
    fireEvent.mouseDown(screen.getByRole("gridcell", { name: /March 20, 2024/ }));
    expect(onDraftPreview).toHaveBeenLastCalledWith("2024-03-20");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("streams the datetime draft when the time slices change", () => {
    const onDraftPreview = vi.fn();
    render(<PopupHarness kind="datetime" value="2024-03-15T14:30:00Z" open onDraftPreview={onDraftPreview} />);
    // Set both slices so the expectation is timezone-independent (the seed
    // derives hour/minute from local wall-clock time).
    fireEvent.change(screen.getByLabelText("Hour"), { target: { value: "22" } });
    fireEvent.change(screen.getByLabelText("Minute"), { target: { value: "30" } });
    expect(onDraftPreview).toHaveBeenLastCalledWith("2024-03-15T22:30:00");
  });

  it("does not stream while closed", () => {
    const onDraftPreview = vi.fn();
    render(<PopupHarness kind="date" value="2024-03-15" open={false} onDraftPreview={onDraftPreview} />);
    expect(onDraftPreview).not.toHaveBeenCalled();
  });

  it("streams range drafts: half-pick, then complete pair", () => {
    const onDraftPreview = vi.fn();
    render(
      <PopupHarness
        kind="date-range"
        value={{ from: "2024-03-15", to: "2024-03-15" }}
        open
        onDraftPreview={onDraftPreview}
      />,
    );
    fireEvent.mouseDown(screen.getByRole("gridcell", { name: /March 20, 2024/ }));
    expect(onDraftPreview).toHaveBeenLastCalledWith({ from: "2024-03-20", to: undefined });
    fireEvent.mouseDown(screen.getByRole("gridcell", { name: /March 25, 2024/ }));
    expect(onDraftPreview).toHaveBeenLastCalledWith({ from: "2024-03-20", to: "2024-03-25" });
  });
});
