import { describe, it, expect, vi, afterEach } from "vitest";
import { createRef, act } from "react";
import {
  InputHarness,
  describedIds,
  hintParagraph,
  errorParagraph,
  labelFor,
  requiredControl,
  DEFAULT_REQUIRED_MESSAGE,
  cleanup,
  render,
  screen,
  fireEvent,
  within,
} from "./__test__/field-test-utils";
import { type FieldHandle, type FieldValue } from "./Field";

afterEach(() => {
  cleanup();
});

describe("FieldHandle.validate()", () => {
  it("force-runs every rule regardless of Touched, reveals any Error, and reports invalid", () => {
    const handle = createRef<FieldHandle<string | number>>();
    render(<InputHarness handleRef={handle} />);

    const control = requiredControl("Name");
    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");

    let valid: boolean | undefined;
    act(() => {
      valid = handle.current!.validate();
    });

    expect(valid).toBe(false);
    expect(errorParagraph(control)).toHaveTextContent(
      DEFAULT_REQUIRED_MESSAGE,
    );
    expect(control).toHaveAttribute("aria-invalid", "true");
  });

  it("returns true for a valid field that was never Touched, without revealing an Error", () => {
    const handle = createRef<FieldHandle<string | number>>();
    render(
      <InputHarness handleRef={handle} overrides={{ initialValue: "Ada" }} />,
    );

    const control = requiredControl("Name");
    let valid: boolean | undefined;
    act(() => {
      valid = handle.current!.validate();
    });

    expect(valid).toBe(true);
    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");
  });

  it("re-validates against the current internal value after fixes clear the Error", () => {
    const handle = createRef<FieldHandle<string | number>>();
    render(<InputHarness handleRef={handle} />);

    act(() => {
      handle.current!.validate();
    });

    const control = requiredControl("Name");
    fireEvent.change(control, { target: { value: "Ada" } });
    expect(errorParagraph(control)).toHaveTextContent("");

    let valid: boolean | undefined;
    act(() => {
      valid = handle.current!.validate();
    });
    expect(valid).toBe(true);
  });
});

describe("FieldHandle value control", () => {
  it("getValue() returns the current internal value, including undefined before any edit", () => {
    const handle = createRef<FieldHandle<string | number>>();
    render(<InputHarness handleRef={handle} />);

    const control = requiredControl("Name");

    let read: FieldValue | undefined;
    act(() => {
      read = handle.current!.getValue();
    });
    expect(read).toBeUndefined();
    expect(control).toHaveValue("");

    fireEvent.change(control, { target: { value: "Ada" } });
    act(() => {
      read = handle.current!.getValue();
    });
    expect(read).toBe("Ada");
  });

  it("setValue() installs the value through the same pipeline: DOM updates, observer fires", () => {
    const changes: FieldValue[] = [];
    const handle = createRef<FieldHandle<string | number>>();
    render(<InputHarness handleRef={handle} onChangeSpy={(v) => changes.push(v)} />);

    const control = requiredControl("Name");
    act(() => {
      handle.current!.setValue("Ada");
    });

    expect(control).toHaveValue("Ada");
    expect(changes).toEqual(["Ada"]);
    act(() => {
      handle.current!.setValue("");
    });
    expect(control).toHaveValue("");
    expect(changes).toEqual(["Ada", ""]);
  });

  it("setValue() re-evaluates the Error when Touched but never reveals one while pristine", () => {
    const handle = createRef<FieldHandle<string | number>>();
    render(
      <InputHarness
        handleRef={handle}
        overrides={{ validator: { required: true } }}
      />,
    );

    const control = requiredControl("Name");

    // Pristine: an invalid imperative set stays silent.
    act(() => {
      handle.current!.setValue("");
    });
    expect(errorParagraph(control)).toHaveTextContent("");

    // Once Touched, every set re-evaluates.
    fireEvent.blur(control);
    expect(errorParagraph(control)).toHaveTextContent(DEFAULT_REQUIRED_MESSAGE);

    act(() => {
      handle.current!.setValue("Ada");
    });
    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");

    act(() => {
      handle.current!.setValue("   ");
    });
    expect(errorParagraph(control)).toHaveTextContent(
      DEFAULT_REQUIRED_MESSAGE,
    );
  });

  it("fires the observer once per change for user edits and imperative sets alike — one honest stream", () => {
    const changes: FieldValue[] = [];
    const handle = createRef<FieldHandle<string | number>>();
    render(<InputHarness handleRef={handle} onChangeSpy={(v) => changes.push(v)} />);

    const control = requiredControl("Name");
    fireEvent.change(control, { target: { value: "A" } });
    act(() => {
      handle.current!.setValue("B");
    });
    fireEvent.change(control, { target: { value: "C" } });

    expect(changes).toEqual(["A", "B", "C"]);
  });
});

describe("Field accessibility floor", () => {
  it("keeps the hint and error paragraphs permanently mounted and orders describedby hint→error", () => {
    render(
      <InputHarness
        overrides={{ hint: "Shown publicly on your profile." }}
      />,
    );

    const control = requiredControl("Name");
    const ids = describedIds(control);

    expect(ids).toHaveLength(2);
    expect(hintParagraph(control)).not.toBeNull();
    expect(errorParagraph(control)).not.toBeNull();

    const hint = hintParagraph(control) as HTMLElement;
    const error = errorParagraph(control) as HTMLElement;

    expect(hint.id).toBe(ids[0]);
    expect(error.id).toBe(ids[1]);
    expect(hint.tagName).toBe("P");
    expect(error.tagName).toBe("P");
    expect(hint).toHaveTextContent("Shown publicly on your profile.");
    expect(error).toHaveAttribute("aria-live", "polite");
    expect(error).toHaveTextContent("");

    fireEvent.blur(control);
    expect(hint).toHaveTextContent("Shown publicly on your profile.");
    expect(error).toHaveAttribute("aria-live", "polite");
  });

  it("leaves an unconfigured hint slot mounted but empty", () => {
    render(<InputHarness />);

    const control = requiredControl("Name");
    const hint = hintParagraph(control) as HTMLElement;

    expect(hint).not.toBeNull();
    expect(hint).toHaveTextContent("");
  });

  it("carries a visually-hidden Error: prefix inside the revealed message", () => {
    render(<InputHarness />);

    const control = requiredControl("Name");
    fireEvent.blur(control);

    const error = errorParagraph(control) as HTMLElement;
    const prefix = within(error).getByText("Error:");
    expect(prefix).toHaveClass("sr-only");
    expect(error).toHaveTextContent(DEFAULT_REQUIRED_MESSAGE);
  });

  it("marks requiredness with * beside the label, visually-hidden (required), and aria-required", () => {
    render(<InputHarness />);

    const control = requiredControl("Name");
    const label = labelFor(control) as HTMLLabelElement;
    expect(label).toHaveAttribute("for", control.id);

    const star = within(label).getByText("*");
    expect(star).toHaveAttribute("aria-hidden", "true");

    const srOnly = screen.getByText("(required)");
    expect(srOnly).toHaveClass("sr-only");
    expect(srOnly.closest("label")).toBe(label);

    expect(control).toHaveAttribute("aria-required", "true");
  });

  it("omits the required marker and aria-required when the field is not required", () => {
    render(<InputHarness overrides={{ validator: undefined }} />);

    const control = screen.getByRole("textbox", { name: "Name" });
    const label = labelFor(control) as HTMLLabelElement;

    expect(within(label).queryByText("*")).not.toBeInTheDocument();
    expect(screen.queryByText("(required)")).not.toBeInTheDocument();
    expect(control).not.toHaveAttribute("aria-required");
  });
});
