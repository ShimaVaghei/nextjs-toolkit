import { describe, it, expect, vi, afterEach } from "vitest";
import { useState, createRef, act } from "react";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Field, type FieldConfig, type FieldHandle, type FieldValue, type Option } from "./Field";

const DEFAULT_REQUIRED_MESSAGE = "This field is required.";

type FieldOverrides = Partial<FieldConfig>;

function makeConfig(overrides: FieldOverrides = {}): FieldConfig {
  return {
    kind: "input",
    label: "Name",
    value: "",
    onValueChange: vi.fn(),
    validator: { required: true },
    ...overrides,
  };
}

/**
 * Renders Field fully controlled, like a real parent would: the value lives in
 * harness state and flows back through onValueChange. An optional spy observes
 * each emitted edit without breaking the controlled loop.
 */
function ControlledHarness({
  initialValue = "",
  overrides,
  onChangeSpy,
  handleRef,
}: {
  initialValue?: FieldValue;
  overrides?: FieldOverrides;
  onChangeSpy?: (value: FieldValue) => void;
  handleRef?: React.Ref<FieldHandle>;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <Field
      ref={handleRef}
      config={{
        kind: "input",
        label: "Name",
        validator: { required: true },
        ...overrides,
        value,
        onValueChange: (next) => {
          onChangeSpy?.(next);
          setValue(next);
        },
      }}
    />
  );
}

function describedIds(control: HTMLElement): string[] {
  return (control.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter(Boolean);
}

function hintParagraph(control: HTMLElement): HTMLElement | null {
  const ids = describedIds(control);
  return ids.length > 0 ? document.getElementById(ids[0]) : null;
}

function errorParagraph(control: HTMLElement): HTMLElement | null {
  const ids = describedIds(control);
  return ids.length > 1 ? document.getElementById(ids[ids.length - 1]) : null;
}

/** The label is a sibling associated via for/id, not an ancestor of the control. */
function labelFor(control: HTMLElement): HTMLLabelElement | null {
  return document.querySelector(
    `label[for="${control.id}"]`,
  ) as HTMLLabelElement | null;
}

/**
 * A required field's accessible name carries the visually-hidden "(required)"
 * marker, so queries use the full announced name.
 */
const requiredControl = (label: string) =>
  screen.getByRole("textbox", { name: `${label} (required)` });

afterEach(() => {
  cleanup();
});

describe("Field rendering", () => {
  it("renders an explicitly associated labeled input and reports every edit through the change callback", () => {
    const changes: FieldValue[] = [];
    render(
      <ControlledHarness
        onChangeSpy={(value) => changes.push(value)}
        overrides={{ label: "Full name" }}
      />,
    );

    const control = screen.getByRole("textbox", { name: "Full name (required)" });
    expect(control.tagName).toBe("INPUT");
    expect(control).toHaveAttribute("type", "text");

    fireEvent.change(control, { target: { value: "A" } });
    fireEvent.change(control, { target: { value: "Ada" } });

    expect(changes).toEqual(["A", "Ada"]);
    expect(control).toHaveValue("Ada");
  });

  it("narrows the input by inputType, defaulting to text", () => {
    const email = render(<Field config={makeConfig({ inputType: "email" })} />);
    expect(email.getByRole("textbox")).toHaveAttribute("type", "email");
    email.unmount();

    const password = render(
      <Field config={makeConfig({ inputType: "password" })} />,
    );
    // A password input has no textbox role; the label association still finds it.
    expect(password.getByLabelText("Name * (required)")).toHaveAttribute(
      "type",
      "password",
    );
    password.unmount();

    const text = render(<Field config={makeConfig()} />);
    expect(text.getByRole("textbox")).toHaveAttribute("type", "text");
  });

  it("renders a textarea when kind is textarea and reports edits", () => {
    const onValueChange = vi.fn();
    render(
      <Field
        config={makeConfig({
          kind: "textarea",
          label: "Bio",
          value: "",
          onValueChange,
          validator: undefined,
        })}
      />,
    );

    const control = screen.getByRole("textbox", { name: "Bio" });
    expect(control.tagName).toBe("TEXTAREA");

    fireEvent.change(control, { target: { value: "Hello" } });
    expect(onValueChange).toHaveBeenCalledWith("Hello");
  });

  it("disables the control when configured and omits the attribute entirely when enabled", () => {
    const disabled = render(<Field config={makeConfig({ disabled: true })} />);
    expect(disabled.getByRole("textbox")).toBeDisabled();
    disabled.unmount();

    const enabled = render(<Field config={makeConfig()} />);
    expect(enabled.getByRole("textbox")).not.toHaveAttribute("disabled");
    expect(enabled.getByRole("textbox")).toBeEnabled();
  });

  it("reaches the wrapper with className", () => {
    const { container } = render(
      <Field config={makeConfig({ className: "max-w-md mx-auto" })} />,
    );

    expect(container.firstElementChild).toHaveClass("max-w-md", "mx-auto");
  });
});

describe("Field required over Empty", () => {
  it("counts whitespace-only values as Empty without altering the stored value", () => {
    render(<ControlledHarness initialValue="   " />);

    const control = requiredControl("Name");
    fireEvent.blur(control);

    expect(errorParagraph(control)).toHaveTextContent(
      DEFAULT_REQUIRED_MESSAGE,
    );
    expect(control).toHaveValue("   ");
  });

  it("shows a custom message from a { value, message } pair", () => {
    render(
      <ControlledHarness
        overrides={{
          validator: {
            required: { value: true, message: "Enter your name." },
          },
        }}
      />,
    );

    const control = requiredControl("Name");
    fireEvent.blur(control);

    expect(errorParagraph(control)).toHaveTextContent("Enter your name.");
  });

  it("skips required entirely when not configured", () => {
    render(<ControlledHarness overrides={{ validator: undefined }} />);

    const control = screen.getByRole("textbox", { name: "Name" });
    fireEvent.blur(control);

    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");
  });
});

describe("Field Touched lifecycle", () => {
  it("stays silent until Touched, reveals on first blur, and re-evaluates on every later change", () => {
    render(<ControlledHarness />);

    const control = requiredControl("Name");

    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");

    fireEvent.blur(control);
    expect(errorParagraph(control)).toHaveTextContent(
      DEFAULT_REQUIRED_MESSAGE,
    );
    expect(control).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(control, { target: { value: "Ada" } });
    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");

    fireEvent.change(control, { target: { value: "" } });
    expect(errorParagraph(control)).toHaveTextContent(
      DEFAULT_REQUIRED_MESSAGE,
    );
    expect(control).toHaveAttribute("aria-invalid", "true");
  });

  it("never shouts while typing before the field is Touched, even with invalid values", () => {
    render(<ControlledHarness />);

    const control = requiredControl("Name");

    fireEvent.change(control, { target: { value: "   " } });
    fireEvent.change(control, { target: { value: "" } });
    fireEvent.change(control, { target: { value: "  " } });

    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");

    fireEvent.blur(control);
    expect(errorParagraph(control)).toHaveTextContent(
      DEFAULT_REQUIRED_MESSAGE,
    );
  });
});

describe("Field Validator rule set", () => {
  it("enforces minLength on an input with the built-in default message and clears once satisfied", () => {
    render(<ControlledHarness overrides={{ validator: { minLength: 3 } }} />);

    const control = screen.getByRole("textbox", { name: "Name" });
    fireEvent.change(control, { target: { value: "ab" } });
    fireEvent.blur(control);

    expect(errorParagraph(control)).toHaveTextContent(
      "Must be at least 3 characters.",
    );
    expect(control).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(control, { target: { value: "Ada" } });
    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");
  });

  it("enforces maxLength on a textarea with a custom { value, message } pair", () => {
    render(
      <ControlledHarness
        overrides={{
          kind: "textarea",
          validator: {
            maxLength: { value: 5, message: "Keep it under five." },
          },
        }}
      />,
    );

    const control = screen.getByRole("textbox", { name: "Name" });
    fireEvent.change(control, { target: { value: "toolong" } });
    fireEvent.blur(control);

    expect(errorParagraph(control)).toHaveTextContent("Keep it under five.");
  });

  it("enforces regex with the built-in default message and accepts a matching value", () => {
    render(<ControlledHarness overrides={{ validator: { regex: /^\d+$/ } }} />);

    const control = screen.getByRole("textbox", { name: "Name" });
    fireEvent.change(control, { target: { value: "abc" } });
    fireEvent.blur(control);
    expect(errorParagraph(control)).toHaveTextContent("Invalid format.");

    fireEvent.change(control, { target: { value: "123" } });
    expect(errorParagraph(control)).toHaveTextContent("");
  });

  it("enforces textual rules on textareas too, minLength taking precedence over regex", () => {
    render(
      <ControlledHarness
        overrides={{ kind: "textarea", validator: { minLength: 3, regex: /^[a-z]+$/ } }}
      />,
    );

    const control = screen.getByRole("textbox", { name: "Name" });
    fireEvent.change(control, { target: { value: "a!" } });
    fireEvent.blur(control);
    expect(errorParagraph(control)).toHaveTextContent(
      "Must be at least 3 characters.",
    );

    fireEvent.change(control, { target: { value: "abc!" } });
    expect(errorParagraph(control)).toHaveTextContent("Invalid format.");

    fireEvent.change(control, { target: { value: "abc" } });
    expect(errorParagraph(control)).toHaveTextContent("");
  });

  it("enforces maxLength on an input with the built-in default message", () => {
    render(<ControlledHarness overrides={{ validator: { maxLength: 2 } }} />);

    const control = screen.getByRole("textbox", { name: "Name" });
    fireEvent.change(control, { target: { value: "Ada" } });
    fireEvent.blur(control);

    expect(errorParagraph(control)).toHaveTextContent(
      "Must be at most 2 characters.",
    );
  });

  it("honors custom { value, message } pairs for numeric and regex constraints", () => {
    const numeric = render(
      <ControlledHarness
        overrides={{
          inputType: "number",
          validator: { min: { value: 1, message: "Too small." } },
        }}
      />,
    );
    const numericControl = numeric.getByRole("spinbutton", { name: "Name" });
    fireEvent.change(numericControl, { target: { value: "-3.5" } });
    fireEvent.blur(numericControl);
    expect(errorParagraph(numericControl)).toHaveTextContent("Too small.");
    numeric.unmount();

    const pattern = render(
      <ControlledHarness
        overrides={{
          validator: {
            regex: { value: /^[a-z]+$/, message: "Lowercase letters only." },
          },
        }}
      />,
    );
    const patternControl = pattern.getByRole("textbox", { name: "Name" });
    fireEvent.change(patternControl, { target: { value: "ABC" } });
    fireEvent.blur(patternControl);
    expect(errorParagraph(patternControl)).toHaveTextContent(
      "Lowercase letters only.",
    );
  });

  it("enforces numeric min and max only on number inputs, with boundaries passing", () => {
    render(
      <ControlledHarness
        initialValue={5}
        overrides={{ inputType: "number", validator: { min: 1, max: 10 } }}
      />,
    );

    const control = screen.getByRole("spinbutton", { name: "Name" });

    fireEvent.change(control, { target: { value: "-3.5" } });
    fireEvent.blur(control);
    expect(errorParagraph(control)).toHaveTextContent("Must be 1 or greater.");

    fireEvent.change(control, { target: { value: "42" } });
    expect(errorParagraph(control)).toHaveTextContent("Must be 10 or less.");

    fireEvent.change(control, { target: { value: "10" } });
    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");
  });

  it("ignores a rule that does not fit the kind with a dev-only warn naming the field and the rule", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(
        <ControlledHarness
          overrides={{
            inputType: "number",
            label: "Age",
            validator: { minLength: 3 },
          }}
        />,
      );
      const warnCalls = () =>
        warnSpy.mock.calls.filter((call) => typeof call[0] === "string");

      const control = screen.getByRole("spinbutton", { name: "Age" });
      fireEvent.change(control, { target: { value: "42" } });
      fireEvent.blur(control);

      expect(errorParagraph(control)).toHaveTextContent("");
      expect(warnCalls()).toHaveLength(1);
      const [message] = warnCalls()[0];
      expect(message).toContain('"Age"');
      expect(message).toContain('"minLength"');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("ignores numeric rules on non-number inputs the same way", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(
        <ControlledHarness
          overrides={{ kind: "textarea", validator: { min: 1 } }}
        />,
      );

      const control = screen.getByRole("textbox", { name: "Name" });
      fireEvent.change(control, { target: { value: "anything" } });
      fireEvent.blur(control);

      expect(errorParagraph(control)).toHaveTextContent("");
      const [message] = warnSpy.mock.calls.find(
        (call) => typeof call[0] === "string",
      )!;
      expect(message).toContain('"Name"');
      expect(message).toContain('"min"');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("shows at most one Error — required wins while Empty, then textual rules take over", () => {
    render(
      <ControlledHarness
        overrides={{ validator: { required: true, minLength: 3 } }}
      />,
    );

    const control = requiredControl("Name");
    fireEvent.blur(control);
    expect(errorParagraph(control)).toHaveTextContent(DEFAULT_REQUIRED_MESSAGE);

    fireEvent.change(control, { target: { value: "ab" } });
    expect(errorParagraph(control)).toHaveTextContent(
      "Must be at least 3 characters.",
    );
  });
});

/**
 * jsdom sanitizes number-input values like real browsers do (badInput → ""),
 * so deliver the raw string by temporarily flipping to a text input — this
 * pins what the Field does with whatever string the platform hands it.
 */
function fireRawChange(control: HTMLElement, raw: string) {
  const input = control as HTMLInputElement;
  const originalType = input.type;
  input.type = "text";
  fireEvent.change(input, { target: { value: raw } });
  input.type = originalType;
}

describe("Field number coercion", () => {
  it("coerces number-input edits per the matrix before handing them to the parent", () => {
    const received: FieldValue[] = [];
    render(
      <ControlledHarness
        overrides={{
          inputType: "number",
          label: "Age",
          validator: undefined,
        }}
        onChangeSpy={(value) => received.push(value)}
      />,
    );

    const control = screen.getByRole("spinbutton", { name: "Age" });
    fireRawChange(control, "   ");
    fireRawChange(control, "42");
    fireRawChange(control, "-3.5");
    fireRawChange(control, "007");
    fireRawChange(control, "1e3");
    fireRawChange(control, "abc");

    expect(received).toEqual(["", 42, -3.5, 7, 1000, NaN]);
  });

  it("counts coerced NaN as Empty so required catches it", () => {
    render(
      <ControlledHarness
        overrides={{ inputType: "number", label: "Age" }}
      />,
    );

    const control = screen.getByRole("spinbutton", {
      name: "Age (required)",
    });
    fireRawChange(control, "abc");
    fireEvent.blur(control);

    expect(errorParagraph(control)).toHaveTextContent(
      DEFAULT_REQUIRED_MESSAGE,
    );
  });

  it("skips min and max evaluation while the value is Empty or NaN", () => {
    render(
      <ControlledHarness
        overrides={{ inputType: "number", label: "Age", validator: { min: 0 } }}
      />,
    );

    const control = screen.getByRole("spinbutton", { name: "Age" });
    fireRawChange(control, "abc");
    fireEvent.blur(control);
    expect(errorParagraph(control)).toHaveTextContent("");

    fireRawChange(control, "   ");
    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");
  });

  it("leaves textual kinds uncoerced", () => {
    const received: FieldValue[] = [];
    render(
      <ControlledHarness
        onChangeSpy={(value) => received.push(value)}
        overrides={{ kind: "textarea" }}
      />,
    );

    const control = requiredControl("Name");
    fireEvent.change(control, { target: { value: "007" } });

    expect(received).toEqual(["007"]);
  });
});

describe("Field checkbox kind", () => {
  it("renders an explicitly associated checkbox with its label right of the box", () => {
    const onValueChange = vi.fn();
    render(
      <Field
        config={makeConfig({
          kind: "checkbox",
          label: "Subscribe",
          value: false,
          onValueChange,
          validator: undefined,
        })}
      />,
    );

    // The accessible name comes from the label association alone.
    const control = screen.getByRole("checkbox", { name: "Subscribe" });
    expect(control).toHaveAttribute("type", "checkbox");

    const label = labelFor(control) as HTMLLabelElement;
    expect(label).not.toBeNull();
    expect(within(label).getByText("Subscribe")).toBeInTheDocument();

    // Explicit association only — the box is not a child of its label.
    expect(label.contains(control)).toBe(false);
    // Box first, label after: the label sits visually right of the box.
    expect(control.nextElementSibling).toBe(label);
  });

  it("reports toggles through the change callback as real booleans", () => {
    const received: FieldValue[] = [];
    render(
      <ControlledHarness
        initialValue={false}
        onChangeSpy={(value) => received.push(value)}
        overrides={{ kind: "checkbox", label: "Terms" }}
      />,
    );

    const control = screen.getByRole("checkbox", { name: "Terms (required)" });
    fireEvent.click(control);
    fireEvent.click(control);

    expect(received).toEqual([true, false]);
    expect(control).not.toBeChecked();
  });

  it("counts unticked as Empty so required follows the Touched lifecycle", () => {
    render(
      <ControlledHarness
        initialValue={false}
        overrides={{ kind: "checkbox", label: "Terms" }}
      />,
    );

    const control = screen.getByRole("checkbox", { name: "Terms (required)" });

    // Pristine invalid stays silent.
    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");

    // First blur evaluates and reveals.
    fireEvent.blur(control);
    expect(errorParagraph(control)).toHaveTextContent(
      DEFAULT_REQUIRED_MESSAGE,
    );
    expect(control).toHaveAttribute("aria-invalid", "true");

    // Ticking re-evaluates and clears immediately.
    fireEvent.click(control);
    expect(errorParagraph(control)).toHaveTextContent("");

    // Unticking re-reveals.
    fireEvent.click(control);
    expect(errorParagraph(control)).toHaveTextContent(
      DEFAULT_REQUIRED_MESSAGE,
    );
  });

  it("accepts a ticked required checkbox as valid", () => {
    render(
      <ControlledHarness
        initialValue={true}
        overrides={{ kind: "checkbox", label: "Terms" }}
      />,
    );

    const control = screen.getByRole("checkbox", { name: "Terms (required)" });
    fireEvent.blur(control);

    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");
  });

  it("carries aria-required, aria-invalid, and describedby directly on the input", () => {
    render(
      <ControlledHarness
        initialValue={false}
        overrides={{
          kind: "checkbox",
          label: "Terms",
          hint: "Required to continue.",
        }}
      />,
    );

    const control = screen.getByRole("checkbox", { name: "Terms (required)" });
    expect(control).toHaveAttribute("aria-required", "true");
    expect(describedIds(control)).toHaveLength(2);

    const label = labelFor(control) as HTMLLabelElement;
    expect(within(label).getByText("*")).toHaveAttribute("aria-hidden", "true");
    expect(within(label).getByText("(required)")).toHaveClass("sr-only");

    // The feedback paragraphs sit outside the control row entirely.
    const hint = hintParagraph(control) as HTMLElement;
    expect(hint).toHaveTextContent("Required to continue.");
    expect(label.contains(hint)).toBe(false);

    fireEvent.blur(control);
    expect(control).toHaveAttribute("aria-invalid", "true");
    expect(errorParagraph(control)).toHaveAttribute("aria-live", "polite");
    expect(errorParagraph(control)).toHaveTextContent(
      DEFAULT_REQUIRED_MESSAGE,
    );
  });

  it("ignores a textual rule configured on a checkbox with a dev-only warn naming field and rule", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(
        <ControlledHarness
          overrides={{
            kind: "checkbox",
            label: "Terms",
            validator: { required: true, minLength: 3 },
          }}
        />,
      );

      const control = screen.getByRole("checkbox", { name: "Terms (required)" });
      fireEvent.click(control);
      fireEvent.blur(control);

      expect(errorParagraph(control)).toHaveTextContent("");
      const [message] = warnSpy.mock.calls.find(
        (call) => typeof call[0] === "string",
      )!;
      expect(message).toContain('"Terms"');
      expect(message).toContain('"minLength"');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("exposes validate() through the handle, revealing the consent Error while pristine", () => {
    const handle = createRef<FieldHandle>();
    render(
      <ControlledHarness
        initialValue={false}
        handleRef={handle}
        overrides={{ kind: "checkbox", label: "Terms" }}
      />,
    );

    let valid: boolean | undefined;
    act(() => {
      valid = handle.current!.validate();
    });

    expect(valid).toBe(false);
    const control = screen.getByRole("checkbox", { name: "Terms (required)" });
    expect(control).toHaveAttribute("aria-invalid", "true");
    expect(errorParagraph(control)).toHaveTextContent(
      DEFAULT_REQUIRED_MESSAGE,
    );
  });
});

const COUNTRY_OPTIONS = [
  { label: "France", value: "fr" },
  { label: "Japan", value: "jp" },
];

describe("Field select kind", () => {
  it("renders static Options and hands the picked Option's value to the change callback", () => {
    const received: FieldValue[] = [];
    render(
      <ControlledHarness
        onChangeSpy={(value) => received.push(value)}
        overrides={{
          kind: "select",
          label: "Country",
          validator: undefined,
          options: COUNTRY_OPTIONS,
        }}
      />,
    );

    const control = screen.getByRole("combobox", { name: "Country" });
    expect(control.tagName).toBe("SELECT");
    expect(
      within(control).getByRole("option", { name: "France" }),
    ).toHaveValue("fr");
    expect(
      within(control).getByRole("option", { name: "Japan" }),
    ).toHaveValue("jp");

    fireEvent.change(control, { target: { value: "jp" } });
    expect(received).toEqual(["jp"]);
    expect(control).toHaveValue("jp");
  });

  it("follows the Touched lifecycle with required over Empty", () => {
    render(
      <ControlledHarness
        overrides={{
          kind: "select",
          label: "Country",
          options: COUNTRY_OPTIONS,
        }}
      />,
    );

    const control = screen.getByRole("combobox", { name: "Country (required)" });

    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");

    fireEvent.blur(control);
    expect(errorParagraph(control)).toHaveTextContent(
      DEFAULT_REQUIRED_MESSAGE,
    );
    expect(control).toHaveAttribute("aria-invalid", "true");

    fireEvent.change(control, { target: { value: "fr" } });
    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");
  });

  it("ignores a textual rule with a dev-only warn naming field and rule", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(
        <ControlledHarness
          overrides={{
            kind: "select",
            label: "Country",
            options: COUNTRY_OPTIONS,
            validator: { required: true, minLength: 3 },
          }}
        />,
      );

      const control = screen.getByRole("combobox", {
        name: "Country (required)",
      });
      fireEvent.change(control, { target: { value: "fr" } });
      fireEvent.blur(control);

      expect(errorParagraph(control)).toHaveTextContent("");
      const [message] = warnSpy.mock.calls.find(
        (call) => typeof call[0] === "string",
      )!;
      expect(message).toContain('"Country"');
      expect(message).toContain('"minLength"');
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe("Field select ghost option", () => {
  const ghostOverrides: Partial<FieldConfig> = {
    kind: "select",
    label: "Country",
    validator: undefined,
    placeholder: "Choose a country",
    options: COUNTRY_OPTIONS,
  };

  it("shows the placeholder ghost while empty and never pre-selects a real Option", () => {
    render(<ControlledHarness overrides={{ ...ghostOverrides }} />);

    const control = screen.getByRole("combobox", { name: "Country" });
    const ghost = within(control).getByRole("option", {
      name: "Choose a country",
    });

    expect(ghost).toHaveValue("");
    expect(ghost).toBeDisabled();
    expect(ghost).not.toHaveAttribute("hidden");
    expect(control).toHaveValue("");
  });

  it("hides the ghost from the open dropdown once a value is chosen", () => {
    render(<ControlledHarness overrides={{ ...ghostOverrides }} />);

    const control = screen.getByRole("combobox", { name: "Country" });
    expect(
      within(control).getByRole("option", { name: "Choose a country" }),
    ).toBeInTheDocument();

    fireEvent.change(control, { target: { value: "fr" } });

    // Still mounted but hidden — dropped from the open dropdown's a11y tree.
    expect(
      within(control).queryByRole("option", { name: "Choose a country" }),
    ).toBeNull();
    const ghost = control.querySelector<HTMLSelectElement>('option[value=""]');
    expect(ghost).toHaveAttribute("hidden");
    expect(ghost).toHaveTextContent("Choose a country");
  });

  it("ignores placeholder on non-select kinds", () => {
    render(<Field config={makeConfig({ placeholder: "Not used" })} />);

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Name (required)" }),
    ).not.toHaveAttribute("placeholder");
  });
});

describe("Field select stale value", () => {
  const staleOverrides: Partial<FieldConfig> = {
    kind: "select",
    label: "Country",
    validator: undefined,
    options: COUNTRY_OPTIONS,
  };

  it("renders an unknown current value as a disabled raw-value entry with a dev-only warn", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(
        <ControlledHarness
          initialValue="zz"
          overrides={{ ...staleOverrides }}
        />,
      );

      const control = screen.getByRole("combobox", { name: "Country" });
      const fallback = within(control).getByRole("option", { name: "zz" });

      expect(fallback).toHaveValue("zz");
      expect(fallback).toBeDisabled();
      expect(control).toHaveValue("zz");

      const [message] = warnSpy.mock.calls.find(
        (call) => typeof call[0] === "string",
      )!;
      expect(message).toContain('"Country"');
      expect(message).toContain('"zz"');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("stays quiet while the value is empty — absence of a choice is not staleness", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(<ControlledHarness overrides={{ ...staleOverrides }} />);

      const control = screen.getByRole("combobox", { name: "Country" });

      expect(control).toHaveValue("");
      expect(
        warnSpy.mock.calls.filter((call) => typeof call[0] === "string"),
      ).toHaveLength(0);
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe("Field select keepDisabledSelection", () => {
  const heldOverrides: Partial<FieldConfig> = {
    kind: "select",
    label: "Country",
    validator: undefined,
    options: [
      ...COUNTRY_OPTIONS,
      { label: "Antarctica", value: "aq", disabled: true },
    ],
  };

  it("keeps a held disabled Option legally selected by default", () => {
    render(
      <ControlledHarness
        initialValue="aq"
        overrides={{ ...heldOverrides }}
      />,
    );

    const control = screen.getByRole("combobox", { name: "Country" });

    expect(control).toHaveValue("aq");
    const held = within(control).getByRole("option", { name: "Antarctica" });
    expect(held).toHaveValue("aq");
    expect(held).toBeDisabled();
    // No raw-value fallback duplicates the display.
    expect(within(control).queryByRole("option", { name: "aq" })).toBeNull();
  });

  it("demotes a held disabled Option to the raw-value fallback when keepDisabledSelection is false", () => {
    render(
      <ControlledHarness
        initialValue="aq"
        overrides={{ ...heldOverrides, keepDisabledSelection: false }}
      />,
    );

    const control = screen.getByRole("combobox", { name: "Country" });

    expect(control).toHaveValue("aq");
    expect(
      within(control).queryByRole("option", { name: "Antarctica" }),
    ).toBeNull();
    const fallback = within(control).getByRole("option", { name: "aq" });
    expect(fallback).toBeDisabled();
    // Other choices remain pickable so the user can deselect.
    expect(
      within(control).getByRole("option", { name: "France" }),
    ).toBeEnabled();
  });
});

describe("FieldHandle.validate()", () => {
  it("force-runs every rule regardless of Touched, reveals any Error, and reports invalid", () => {
    const handle = createRef<FieldHandle>();
    render(<ControlledHarness handleRef={handle} />);

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
    const handle = createRef<FieldHandle>();
    render(<ControlledHarness handleRef={handle} initialValue="Ada" />);

    const control = requiredControl("Name");
    let valid: boolean | undefined;
    act(() => {
      valid = handle.current!.validate();
    });

    expect(valid).toBe(true);
    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");
  });

  it("re-validates against the current parent value after fixes clear the Error", () => {
    const handle = createRef<FieldHandle>();
    render(<ControlledHarness handleRef={handle} />);

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

describe("Field accessibility floor", () => {
  it("keeps the hint and error paragraphs permanently mounted and orders describedby hint→error", () => {
    render(
      <ControlledHarness
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
    render(<ControlledHarness />);

    const control = requiredControl("Name");
    const hint = hintParagraph(control) as HTMLElement;

    expect(hint).not.toBeNull();
    expect(hint).toHaveTextContent("");
  });

  it("carries a visually-hidden Error: prefix inside the revealed message", () => {
    render(<ControlledHarness />);

    const control = requiredControl("Name");
    fireEvent.blur(control);

    const error = errorParagraph(control) as HTMLElement;
    const prefix = within(error).getByText("Error:");
    expect(prefix).toHaveClass("sr-only");
    expect(error).toHaveTextContent(DEFAULT_REQUIRED_MESSAGE);
  });

  it("marks requiredness with * beside the label, visually-hidden (required), and aria-required", () => {
    render(<ControlledHarness />);

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
    render(<ControlledHarness overrides={{ validator: undefined }} />);

    const control = screen.getByRole("textbox", { name: "Name" });
    const label = labelFor(control) as HTMLLabelElement;

    expect(within(label).queryByText("*")).not.toBeInTheDocument();
    expect(screen.queryByText("(required)")).not.toBeInTheDocument();
    expect(control).not.toHaveAttribute("aria-required");
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const REGION_OPTIONS: Option[] = [
  { label: "Africa", value: "af" },
  { label: "Europe", value: "eu" },
];

describe("Field async options", () => {
  function asyncOverrides(loader: FieldConfig["options"]): FieldOverrides {
    return {
      kind: "select",
      label: "Region",
      validator: undefined,
      placeholder: "Choose a region",
      options: loader,
    };
  }

  it("fires the loader exactly once on mount, then renders resolved Options and enables the control", async () => {
    const d = deferred<Option[]>();
    const loader = vi.fn(() => d.promise);
    render(<ControlledHarness overrides={asyncOverrides(loader)} />);

    expect(loader).toHaveBeenCalledTimes(1);

    const control = screen.getByRole("combobox", { name: "Region" });
    expect(control).toBeDisabled();

    await act(async () => {
      d.resolve(REGION_OPTIONS);
    });

    expect(
      within(control).getByRole("option", { name: "Africa" }),
    ).toHaveValue("af");
    expect(
      within(control).getByRole("option", { name: "Europe" }),
    ).toHaveValue("eu");
    expect(control).not.toHaveAttribute("disabled");

    fireEvent.change(control, { target: { value: "eu" } });
    expect(control).toHaveValue("eu");
    // Interacting afterwards must not re-fire the loader.
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("blocks choosing while Pending with 'Loading options…' in the hint slot and keeps any selection visible", async () => {
    const d = deferred<Option[]>();
    render(
      <ControlledHarness
        initialValue="eu"
        overrides={asyncOverrides(() => d.promise)}
      />,
    );

    const control = screen.getByRole("combobox", { name: "Region" });
    const hint = hintParagraph(control) as HTMLElement;

    expect(control).toBeDisabled();
    expect(hint).toHaveTextContent("Loading options…");
    expect(within(hint).getByText("Loading options…")).toBeInTheDocument();
    expect(hint.querySelector(".animate-spin")).not.toBeNull();
    // The held selection stays visible even though its Option has not arrived.
    expect(control).toHaveValue("eu");

    await act(async () => {
      d.resolve(REGION_OPTIONS);
    });

    expect(control).not.toBeDisabled();
    expect(control).toHaveValue("eu");
    expect(hint).toHaveTextContent("");
  });

  it("shows 'Couldn't load options.' with a Retry that re-fires the loader successfully", async () => {
    const d1 = deferred<Option[]>();
    const d2 = deferred<Option[]>();
    const loader = vi
      .fn<() => Promise<Option[]>>()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise);
    render(<ControlledHarness overrides={asyncOverrides(loader)} />);

    await act(async () => {
      d1.reject(new Error("boom"));
    });

    const control = screen.getByRole("combobox", { name: "Region" });
    const hint = hintParagraph(control) as HTMLElement;

    expect(hint).toHaveTextContent("Couldn't load options.");
    expect(control).toBeDisabled();
    expect(loader).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(loader).toHaveBeenCalledTimes(2);
    expect(hint).toHaveTextContent("Loading options…");
    expect(control).toBeDisabled();

    await act(async () => {
      d2.resolve(REGION_OPTIONS);
    });

    expect(control).not.toBeDisabled();
    expect(
      within(control).getByRole("option", { name: "Europe" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(hint).toHaveTextContent("");
  });

  it("styles Rejected distinctly from validation Error — no aria-invalid and the error slot stays untouched", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const d = deferred<Option[]>();
      render(
        <ControlledHarness
          handleRef={createRef<FieldHandle>()}
          overrides={asyncOverrides(() => d.promise)}
        />,
      );

      await act(async () => {
        d.reject(new Error("boom"));
      });

      const control = screen.getByRole("combobox", { name: "Region" });
      const error = errorParagraph(control) as HTMLElement;

      expect(control).not.toHaveAttribute("aria-invalid");
      expect(error).toHaveTextContent("");

      // The rejection lives in the hint slot, not the Error paragraph.
      expect(hintParagraph(control)).toHaveTextContent(
        "Couldn't load options.",
      );
      expect(error).not.toHaveTextContent("Couldn't load options.");

      // An absent selection is still expected, not stale, once Rejected.
      expect(warnSpy.mock.calls.filter((call) => typeof call[0] === "string"))
        .toHaveLength(0);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("never fires the stale-value warn for an absent selection while a load is in flight", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const d = deferred<Option[]>();
      render(
        <ControlledHarness
          initialValue="eu"
          overrides={asyncOverrides(() => d.promise)}
        />,
      );

      const control = screen.getByRole("combobox", { name: "Region" });
      expect(warnSpy.mock.calls.filter((call) => typeof call[0] === "string"))
        .toHaveLength(0);

      await act(async () => {
        d.resolve(REGION_OPTIONS);
      });

      expect(control).toHaveValue("eu");
      expect(warnSpy.mock.calls.filter((call) => typeof call[0] === "string"))
        .toHaveLength(0);
    } finally {
      warnSpy.mockRestore();
    }
  });
});

const TAG_OPTIONS: Option[] = [
  { label: "Design", value: "design" },
  { label: "Research", value: "research" },
  { label: "Engineering", value: "engineering" },
];

function tagOverrides(): FieldOverrides {
  return {
    kind: "multi-select",
    label: "Tags",
    validator: undefined,
    options: TAG_OPTIONS,
  };
}

function politeRegion(): HTMLElement {
  return document.querySelector('[aria-live="polite"]') as HTMLElement;
}

describe("Field multi-select closed face", () => {
  it("renders a label-named group of chips beside a separate open button with synced expanded state", () => {
    render(<ControlledHarness overrides={tagOverrides()} />);

    // The group is named by the visible field label via aria-labelledby.
    expect(screen.getByRole("group", { name: "Tags" })).toBeInTheDocument();

    const openButton = screen.getByRole("button", { name: "Show options" });
    expect(openButton).toHaveAttribute("aria-expanded", "false");
    const panelId = openButton.getAttribute("aria-controls");
    expect(panelId).not.toBe("");

    fireEvent.click(openButton);
    expect(openButton).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(panelId!)).not.toHaveAttribute("hidden");

    fireEvent.click(openButton);
    expect(openButton).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(panelId!)).toHaveAttribute("hidden");
  });

  it("uses no combobox/listbox/option roles and no aria-haspopup anywhere", () => {
    const { container } = render(
      <ControlledHarness overrides={tagOverrides()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show options" }));

    expect(
      container.querySelector("[role=combobox], [role=listbox], [role=option]"),
    ).toBeNull();
    expect(container.querySelector("[aria-haspopup]")).toBeNull();
  });

  it("keeps the chip strip fixed-height and horizontally scrolling", () => {
    const { container } = render(
      <ControlledHarness
        initialValue={["design", "research"]}
        overrides={tagOverrides()}
      />,
    );

    const strip = container.querySelector<HTMLElement>(".field-chip-strip");
    expect(strip).not.toBeNull();
    expect(strip).toHaveClass("overflow-x-auto");
    expect(strip).toHaveClass("h-11");
  });
});

describe("Field multi-select toggle semantics", () => {
  it("adds and removes membership through panel checkboxes with Chips appearing and disappearing in step", () => {
    const received: FieldValue[] = [];
    render(
      <ControlledHarness
        onChangeSpy={(value) => received.push(value)}
        overrides={tagOverrides()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show options" }));

    fireEvent.click(screen.getByRole("checkbox", { name: "Design" }));
    expect(received).toEqual([["design"]]);
    expect(
      screen.getByRole("button", { name: "Remove Design" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Research" }));
    expect(received).toEqual([["design"], ["design", "research"]]);
    expect(
      screen.getByRole("button", { name: "Remove Research" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "Design" }));
    expect(received).toEqual([["design"], ["design", "research"], ["research"]]);
    expect(
      screen.queryByRole("button", { name: "Remove Design" }),
    ).toBeNull();
  });

  it("removes membership from anywhere: each Chip's named remove button works while the popup is closed", () => {
    const received: FieldValue[] = [];
    render(
      <ControlledHarness
        initialValue={["design", "research"]}
        onChangeSpy={(value) => received.push(value)}
        overrides={tagOverrides()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Remove Design" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove Research" }));

    expect(received).toEqual([["design"]]);
    expect(
      screen.queryByRole("button", { name: "Remove Research" }),
    ).toBeNull();
    expect(
      screen.getByRole("button", { name: "Remove Design" }),
    ).toBeInTheDocument();
  });
});

describe("Field multi-select panel", () => {
  it("filters rows client-side from the labelled search input, removing filtered rows entirely", () => {
    render(<ControlledHarness overrides={tagOverrides()} />);

    fireEvent.click(screen.getByRole("button", { name: "Show options" }));
    const search = screen.getByRole("textbox", { name: "Search options" });

    fireEvent.change(search, { target: { value: "re" } });
    expect(screen.getByRole("checkbox", { name: "Research" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Design" })).toBeNull();
    expect(
      screen.queryByRole("checkbox", { name: "Engineering" }),
    ).toBeNull();

    fireEvent.change(search, { target: { value: "" } });
    expect(
      screen.getByRole("checkbox", { name: "Engineering" }),
    ).toBeInTheDocument();
  });

  it("wraps native checkbox rows in a fieldset/legend group with the search input outside it", () => {
    render(<ControlledHarness overrides={tagOverrides()} />);

    fireEvent.click(screen.getByRole("button", { name: "Show options" }));

    const rowsGroup = screen.getByRole("group", { name: "Options" });
    expect(rowsGroup.tagName).toBe("FIELDSET");
    expect(rowsGroup.querySelector("legend")).toHaveTextContent("Options");

    const design = within(rowsGroup).getByRole("checkbox", { name: "Design" });
    expect(design).toHaveAttribute("type", "checkbox");

    const search = screen.getByRole("textbox", { name: "Search options" });
    expect(search.closest("fieldset")).toBeNull();
  });

  it("renders disabled Options as disabled checkboxes that cannot join the selection", () => {
    render(
      <ControlledHarness
        overrides={{
          ...tagOverrides(),
          options: [...TAG_OPTIONS, { label: "Archived", value: "archived", disabled: true }],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show options" }));
    const archived = screen.getByRole("checkbox", { name: "Archived" });
    expect(archived).toBeDisabled();
    expect(archived).not.toBeChecked();
  });
});

describe("Field multi-select focus choreography", () => {
  it("opens onto the search input, and Escape closes and returns focus to the open button", () => {
    render(<ControlledHarness overrides={tagOverrides()} />);

    const openButton = screen.getByRole("button", { name: "Show options" });
    fireEvent.click(openButton);
    expect(
      screen.getByRole("textbox", { name: "Search options" }),
    ).toHaveFocus();

    fireEvent.keyDown(
      screen.getByRole("textbox", { name: "Search options" }),
      { key: "Escape" },
    );
    expect(openButton).toHaveAttribute("aria-expanded", "false");
    expect(openButton).toHaveFocus();
  });

  it("closes on pointer-down outside without moving focus", () => {
    render(
      <>
        <button type="button">Elsewhere</button>
        <ControlledHarness overrides={tagOverrides()} />
      </>,
    );

    const openButton = screen.getByRole("button", { name: "Show options" });
    fireEvent.click(openButton);
    const search = screen.getByRole("textbox", { name: "Search options" });
    expect(search).toHaveFocus();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Elsewhere" }));
    expect(openButton).toHaveAttribute("aria-expanded", "false");
    // Pointer dismissal never yanks focus anywhere.
    expect(search).toHaveFocus();
  });

  it("closes when focus tabs out of the widget and lets focus move naturally", () => {
    render(
      <>
        <ControlledHarness overrides={tagOverrides()} />
        <input aria-label="Outside" />
      </>,
    );

    const openButton = screen.getByRole("button", { name: "Show options" });
    fireEvent.click(openButton);
    expect(openButton).toHaveAttribute("aria-expanded", "true");

    fireEvent.blur(screen.getByRole("textbox", { name: "Search options" }), {
      relatedTarget: screen.getByLabelText("Outside"),
    });

    expect(openButton).toHaveAttribute("aria-expanded", "false");
  });

  it("hops focus to the chip that took the removed focused chip's slot", () => {
    render(
      <ControlledHarness
        initialValue={["design", "research", "engineering"]}
        overrides={tagOverrides()}
      />,
    );

    const researchRemove = screen.getByRole("button", {
      name: "Remove Research",
    });
    act(() => researchRemove.focus());
    fireEvent.click(researchRemove);

    expect(
      screen.getByRole("button", { name: "Remove Engineering" }),
    ).toHaveFocus();
  });

  it("hops focus to the last remaining chip when the focused last-positioned chip is removed", () => {
    render(
      <ControlledHarness
        initialValue={["design", "research"]}
        overrides={tagOverrides()}
      />,
    );

    const researchRemove = screen.getByRole("button", {
      name: "Remove Research",
    });
    act(() => researchRemove.focus());
    fireEvent.click(researchRemove);

    expect(screen.getByRole("button", { name: "Remove Design" })).toHaveFocus();
  });

  it("returns focus to the open button when the final focused chip is removed", () => {
    render(
      <ControlledHarness
        initialValue={["design"]}
        overrides={tagOverrides()}
      />,
    );

    const designRemove = screen.getByRole("button", { name: "Remove Design" });
    act(() => designRemove.focus());
    fireEvent.click(designRemove);

    expect(
      screen.queryByRole("button", { name: "Remove Design" }),
    ).toBeNull();
    expect(screen.getByRole("button", { name: "Show options" })).toHaveFocus();
  });
});

describe("Field multi-select removal announcements", () => {
  it("writes 'Removed X. N selected.' into the shared polite region with the last message winning", () => {
    render(
      <ControlledHarness
        initialValue={["design", "research"]}
        overrides={tagOverrides()}
      />,
    );

    const region = politeRegion();
    fireEvent.click(screen.getByRole("button", { name: "Remove Design" }));
    expect(region).toHaveTextContent("Removed Design. 1 selected.");

    fireEvent.click(screen.getByRole("button", { name: "Remove Research" }));
    expect(region).toHaveTextContent("Removed Research. 0 selected.");
  });

  it("stays silent while toggling inside the panel — native checked announcements suffice", () => {
    render(<ControlledHarness overrides={tagOverrides()} />);

    fireEvent.click(screen.getByRole("button", { name: "Show options" }));
    const region = politeRegion();
    expect(region).toHaveTextContent("");

    fireEvent.click(screen.getByRole("checkbox", { name: "Design" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Research" }));
    expect(region).toHaveTextContent("");
  });
});

describe("Field multi-select Empty, placeholder, and stale chips", () => {
  it("counts [] as Empty so required reveals on leaving the widget and clears once something is selected", () => {
    render(
      <ControlledHarness
        overrides={{ ...tagOverrides(), validator: { required: true } }}
      />,
    );

    // The group's accessible name carries the required marker.
    const openButton = screen.getByRole("button", { name: "Show options" });
    expect(
      screen.getByRole("group", { name: "Tags (required)" }),
    ).toBeInTheDocument();
    expect(politeRegion()).toHaveTextContent("");

    // Invalid while untouched stays silent; leaving the widget evaluates.
    fireEvent.blur(openButton, { relatedTarget: document.body });
    expect(politeRegion()).toHaveTextContent(DEFAULT_REQUIRED_MESSAGE);

    // The closed-face group anchors invalid state and hint→error describedby.
    const group = screen.getByRole("group", { name: "Tags (required)" });
    expect(group).toHaveAttribute("aria-invalid", "true");
    expect(group).toHaveAttribute("aria-required", "true");
    const describedBy = (group.getAttribute("aria-describedby") ?? "").split(/\s+/);
    expect(describedBy).toHaveLength(2);
    expect(document.getElementById(describedBy[0])!.tagName).toBe("P");
    expect(document.getElementById(describedBy[1])!).toHaveAttribute(
      "aria-live",
      "polite",
    );

    // Selecting re-evaluates instantly and clears the Error.
    fireEvent.click(openButton);
    fireEvent.click(screen.getByRole("checkbox", { name: "Design" }));
    expect(politeRegion()).toHaveTextContent("");
    expect(group).not.toHaveAttribute("aria-invalid");
  });

  it("ignores placeholder entirely", () => {
    render(
      <ControlledHarness
        overrides={{ ...tagOverrides(), placeholder: "Pick some tags" }}
      />,
    );

    expect(screen.queryByText("Pick some tags")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show options" }));
    expect(screen.queryByText("Pick some tags")).toBeNull();
  });

  it("renders unknown values as removable raw-value fallback chips with a dev-only warn", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const received: FieldValue[] = [];
      render(
        <ControlledHarness
          initialValue={["design", "zz"]}
          onChangeSpy={(value) => received.push(value)}
          overrides={tagOverrides()}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Remove zz" }),
      ).toBeInTheDocument();
      const [message] = warnSpy.mock.calls.find(
        (call) => typeof call[0] === "string",
      )!;
      expect(message).toContain('"Tags"');
      expect(message).toContain('"zz"');

      fireEvent.click(screen.getByRole("button", { name: "Remove zz" }));
      expect(received).toEqual([["design"]]);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("stays quiet while a load is Pending — held selections are expected-absent, not stale", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const d = deferred<Option[]>();
      render(
        <ControlledHarness
          initialValue={["eu"]}
          overrides={{
            ...tagOverrides(),
            options: () => d.promise,
          }}
        />,
      );

      // Held selection stays visible as a chip while the load is in flight,
      // and the shared status contract shows in the hint slot.
      expect(screen.getByRole("button", { name: "Remove eu" })).toBeInTheDocument();
      expect(screen.getByText("Loading options…")).toBeInTheDocument();
      expect(warnSpy.mock.calls.filter((call) => typeof call[0] === "string"))
        .toHaveLength(0);

      await act(async () => {
        d.resolve([
          { label: "Europe", value: "eu" },
          { label: "Africa", value: "af" },
        ]);
      });

      // Once resolved the chip upgrades to its Option label — no stale warn.
      expect(
        screen.getByRole("button", { name: "Remove Europe" }),
      ).toBeInTheDocument();
      expect(warnSpy.mock.calls.filter((call) => typeof call[0] === "string"))
        .toHaveLength(0);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
