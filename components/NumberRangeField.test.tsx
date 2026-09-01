import { describe, it, expect, vi, afterEach } from "vitest";
import { createRef, act } from "react";
import {
  NumberRangeHarness,
  cleanup,
  render,
  screen,
  fireEvent,
} from "./__test__/field-test-utils";
import { type FieldHandle, type FieldNumberRangeValue } from "./Field";

afterEach(() => {
  cleanup();
});

describe("NumberRangeField — engine value model", () => {


  it("renders two adjacent number inputs labelled From and To as one control", () => {
    render(<NumberRangeHarness />);
    // The visible label names the group; each input gets an accessible From/To label.
    expect(screen.getByRole("group", { name: "Quantity" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "From" })).toHaveAttribute(
      "type",
      "number",
    );
    expect(screen.getByRole("spinbutton", { name: "To" })).toHaveAttribute(
      "type",
      "number",
    );
  });

  it("commits a merged range when either bound is edited, preserving the other end", () => {
    const spy = vi.fn();
    const handle = createRef<FieldHandle<FieldNumberRangeValue>>();
    render(<NumberRangeHarness onChangeSpy={spy} handleRef={handle} />);

    fireEvent.change(screen.getByRole("spinbutton", { name: "From" }), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "To" }), {
      target: { value: "20" },
    });
    expect(spy).toHaveBeenLastCalledWith({ from: 10, to: 20 });
    expect(handle.current!.getValue()).toEqual({ from: 10, to: 20 });

    // Editing From again preserves the committed To.
    fireEvent.change(screen.getByRole("spinbutton", { name: "From" }), {
      target: { value: "5" },
    });
    expect(handle.current!.getValue()).toEqual({ from: 5, to: 20 });
  });

  it("preserves undefined ends for open-ended ranges", () => {
    const handle = createRef<FieldHandle<FieldNumberRangeValue>>();
    render(<NumberRangeHarness handleRef={handle} />);

    fireEvent.change(screen.getByRole("spinbutton", { name: "To" }), {
      target: { value: "100" },
    });
    expect(handle.current!.getValue()).toEqual({ from: undefined, to: 100 });
  });

  it("swaps out-of-order ends so from <= to", () => {
    const handle = createRef<FieldHandle<FieldNumberRangeValue>>();
    render(<NumberRangeHarness handleRef={handle} />);

    fireEvent.change(screen.getByRole("spinbutton", { name: "From" }), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "To" }), {
      target: { value: "10" },
    });
    expect(handle.current!.getValue()).toEqual({ from: 10, to: 30 });

    // setValue runs the same swap pipeline.
    act(() => handle.current!.setValue({ from: 50, to: 5 }));
    expect(handle.current!.getValue()).toEqual({ from: 5, to: 50 });
  });

  it("clearing an end commits an absent bound rather than a string", () => {
    const handle = createRef<FieldHandle<FieldNumberRangeValue>>();
    render(<NumberRangeHarness handleRef={handle} />);

    fireEvent.change(screen.getByRole("spinbutton", { name: "From" }), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "From" }), {
      target: { value: "" },
    });
    expect(handle.current!.getValue()).toEqual({
      from: undefined,
      to: undefined,
    });
  });

  it("a range is Empty unless both ends hold numbers, so required rejects a half-pick", () => {
    const handle = createRef<FieldHandle<FieldNumberRangeValue>>();
    render(
      <NumberRangeHarness
        handleRef={handle}
        overrides={{ validator: { required: true } }}
      />,
    );

    act(() => handle.current!.setValue({ from: 5 }));
    let valid: boolean;
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(false);

    act(() => handle.current!.setValue({ from: 5, to: 10 }));
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid!).toBe(true);
  });

  it("setValue installs through the same pipeline and fires the observer", () => {
    const spy = vi.fn();
    const handle = createRef<FieldHandle<FieldNumberRangeValue>>();
    render(<NumberRangeHarness onChangeSpy={spy} handleRef={handle} />);

    act(() => handle.current!.setValue({ from: 2, to: 4 }));
    expect(spy).toHaveBeenCalledWith({ from: 2, to: 4 });
    expect(handle.current!.getValue()).toEqual({ from: 2, to: 4 });
    expect(screen.getByRole("spinbutton", { name: "From" })).toHaveValue(2);
    expect(screen.getByRole("spinbutton", { name: "To" })).toHaveValue(4);
  });
});
