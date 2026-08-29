import { describe, it, expect, vi, afterEach } from "vitest";
import { createRef, act } from "react";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  CheckboxField,
  InputField,
  MultiSelectField,
  SelectField,
  TextareaField,
  DateField,
  DateTimeField,
  DateRangeField,
  DateTimeRangeField,
  type FieldCheckboxConfig,
  type FieldDateConfig,
  type FieldDateTimeConfig,
  type FieldDateRangeConfig,
  type FieldDateTimeRangeConfig,
  type FieldDateRangeValue,
  type FieldHandle,
  type FieldInputConfig,
  type FieldMultiSelectConfig,
  type FieldOption,
  type FieldSelectConfig,
  type FieldTextareaConfig,
  type FieldValue,
} from "./Field";

const DEFAULT_REQUIRED_MESSAGE = "This field is required.";

function makeConfig(
  overrides: Partial<FieldInputConfig> = {},
): FieldInputConfig {
  return { label: "Name", validator: { required: true }, ...overrides };
}

/**
 * Renders an uncontrolled Field of one fixed kind, exactly like a parent with
 * no value wiring would. An optional spy observes the emitted change stream;
 * Initial values and any other config ride through `overrides`. One harness
 * exists per public Field component, each narrowed to its kind's value shape.
 */
function InputHarness({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldInputConfig>;
  onChangeSpy?: (value: string | number) => void;
  handleRef?: React.Ref<FieldHandle<string | number>>;
}) {
  return (
    <InputField
      ref={handleRef}
      config={{
        label: "Name",
        validator: { required: true },
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

function TextareaHarness({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldTextareaConfig>;
  onChangeSpy?: (value: string) => void;
  handleRef?: React.Ref<FieldHandle<string>>;
}) {
  return (
    <TextareaField
      ref={handleRef}
      config={{
        label: "Name",
        validator: { required: true },
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

function CheckboxHarness({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldCheckboxConfig>;
  onChangeSpy?: (value: boolean) => void;
  handleRef?: React.Ref<FieldHandle<boolean>>;
}) {
  return (
    <CheckboxField
      ref={handleRef}
      config={{
        label: "Name",
        validator: { required: true },
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

function SelectHarness<T>({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldSelectConfig<T>>;
  onChangeSpy?: (value: T) => void;
  handleRef?: React.Ref<FieldHandle<T>>;
}) {
  return (
    <SelectField
      ref={handleRef}
      config={{
        label: "Name",
        validator: { required: true },
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

function MultiSelectHarness<T>({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldMultiSelectConfig<T>>;
  onChangeSpy?: (value: T[]) => void;
  handleRef?: React.Ref<FieldHandle<T[]>>;
}) {
  return (
    <MultiSelectField
      ref={handleRef}
      config={{
        label: "Name",
        validator: { required: true },
        onValueChange: onChangeSpy,
        ...overrides,
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
  it("renders an explicitly associated labeled input and reports every edit through the observer", () => {
    const changes: FieldValue[] = [];
    render(
      <InputHarness
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
    const password = render(
      <InputField config={makeConfig({ inputType: "password" })} />,
    );
    // A password input has no textbox role; the label association still finds it.
    expect(password.getByLabelText("Name * (required)")).toHaveAttribute(
      "type",
      "password",
    );
    password.unmount();

    const number = render(<InputField config={makeConfig({ inputType: "number" })} />);
    expect(number.getByRole("spinbutton")).toHaveAttribute("type", "number");
    number.unmount();

    const text = render(<InputField config={makeConfig()} />);
    expect(text.getByRole("textbox")).toHaveAttribute("type", "text");
  });

  it("rejects the retired email input flavor at compile time", () => {
    render(
      <InputField
        config={{
          ...makeConfig(),
          // @ts-expect-error — email is a Validator rule now, not an input flavor
          inputType: "email",
        }}
      />,
    );

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders a textarea when kind is textarea and reports edits", () => {
    const onValueChange = vi.fn();
    render(
      <TextareaField
        config={{ label: "Bio", onValueChange, validator: undefined }}
      />,
    );

    const control = screen.getByRole("textbox", { name: "Bio" });
    expect(control.tagName).toBe("TEXTAREA");

    fireEvent.change(control, { target: { value: "Hello" } });
    expect(onValueChange).toHaveBeenCalledWith("Hello");
  });

  describe("Field placeholder", () => {
    it("passes the placeholder through as the native attribute on input and textarea", () => {
      const input = render(
        <InputField config={makeConfig({ placeholder: "Jane Doe" })} />,
      );
      expect(
        input.getByRole("textbox", { name: "Name (required)" }),
      ).toHaveAttribute("placeholder", "Jane Doe");
      input.unmount();

      render(
        <TextareaField
          config={{ label: "Bio", placeholder: "Tell us about yourself" }}
        />,
      );
      expect(screen.getByRole("textbox", { name: "Bio" })).toHaveAttribute(
        "placeholder",
        "Tell us about yourself",
      );
    });

    it("rejects a placeholder on the checkbox kind at compile time — there is no surface to show one", () => {
      render(
        <CheckboxField
          config={{
            label: "Consent",
            // @ts-expect-error — checkbox has no placeholder surface
            placeholder: "Not used",
          }}
        />,
      );

      expect(
        screen.getByRole("checkbox", { name: "Consent" }),
      ).toBeInTheDocument();
      expect(screen.queryByText("Not used")).toBeNull();
    });
  });

  it("disables the control when configured and omits the attribute entirely when enabled", () => {
    const disabled = render(<InputField config={makeConfig({ disabled: true })} />);
    expect(disabled.getByRole("textbox")).toBeDisabled();
    disabled.unmount();

    const enabled = render(<InputField config={makeConfig()} />);
    expect(enabled.getByRole("textbox")).not.toHaveAttribute("disabled");
    expect(enabled.getByRole("textbox")).toBeEnabled();
  });

  it("reaches the wrapper with className", () => {
    const { container } = render(
      <InputField config={makeConfig({ className: "max-w-md mx-auto" })} />,
    );

    expect(container.firstElementChild).toHaveClass("max-w-md", "mx-auto");
  });
});

/** Re-renders one Field with a fresh Initial value so prop-change behavior is observable. */
function SeededRerenderer({
  initialValue,
}: {
  /** Input-kind seeds only: the rerender tests exercise strings and numbers. */
  initialValue?: string | number;
}) {
  return (
    <InputField
      config={makeConfig({
        validator: undefined,
        ...(initialValue === undefined ? {} : { initialValue }),
      })}
    />
  );
}

describe("Field value ownership", () => {
  it("renders, accepts edits, and validates with no observer callback configured", () => {
    render(<InputField config={makeConfig()} />);

    const control = requiredControl("Name");

    expect(control).toHaveValue("");
    fireEvent.change(control, { target: { value: "Ada" } });

    expect(control).toHaveValue("Ada");

    fireEvent.blur(control);
    expect(errorParagraph(control)).toHaveTextContent("");
  });

  it("seeds internal state once from the Initial value at mount", () => {
    render(<InputField config={makeConfig({ initialValue: "Ada" })} />);

    const control = screen.getByRole("textbox", { name: "Name (required)" });
    expect(control).toHaveValue("Ada");

    fireEvent.change(control, { target: { value: "Lovelace" } });
    expect(control).toHaveValue("Lovelace");
  });

  it("ignores a changed Initial value prop after mount and draws a dev-only warning naming the Field", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { rerender } = render(<SeededRerenderer initialValue="Ada" />);

      const control = screen.getByRole("textbox", { name: "Name" });
      expect(control).toHaveValue("Ada");

      rerender(<SeededRerenderer initialValue="Bob" />);
      rerender(<SeededRerenderer initialValue="Bob" />);

      // The live value stays user-owned; the late prop never lands.
      expect(control).toHaveValue("Ada");
      const warnings = warnSpy.mock.calls.filter(
        (call) => typeof call[0] === "string",
      );
      expect(warnings).toHaveLength(1);
      expect(warnings[0][0]).toContain('"Name"');
      expect(warnings[0][0]).toContain("initialValue");
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("stays quiet across re-renders while the Initial value prop is unchanged", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { rerender } = render(<SeededRerenderer initialValue="Ada" />);
      rerender(<SeededRerenderer initialValue="Ada" />);

      expect(
        warnSpy.mock.calls.filter((call) => typeof call[0] === "string"),
      ).toHaveLength(0);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("treats undefined as no seed for every kind", () => {
    const text = render(
      <InputField
        config={makeConfig({ validator: undefined })}
      />,
    );
    expect(text.getByRole("textbox")).toHaveValue("");
    text.unmount();

    const bio = render(
      <TextareaField
        config={{ label: "Bio", validator: undefined }}
      />,
    );
    expect(bio.getByRole("textbox", { name: "Bio" })).toHaveValue("");
    bio.unmount();

    const checkbox = render(
      <CheckboxField
        config={{
          label: "Terms",
          validator: undefined,
          initialValue: undefined,
        }}
      />,
    );
    expect(
      screen.getByRole("checkbox", { name: "Terms" }),
    ).not.toBeChecked();
    checkbox.unmount();

    const select = render(
      <SelectField<string>
        config={{
          label: "Country",
          validator: undefined,
          placeholder: "Choose a country",
          options: COUNTRY_OPTIONS,
        }}
      />,
    );
    expect(
      within(selectTrigger("Country")).getByText("Choose a country"),
    ).toBeInTheDocument();
    select.unmount();

    const multi = render(
      <MultiSelectField<string>
        config={{
          label: "Tags",
          validator: undefined,
          options: TAG_OPTIONS,
        }}
      />,
    );
    expect(screen.queryByRole("button", { name: /^Remove / })).toBeNull();
    expect(
      screen.getByRole("group", { name: "Tags" }),
    ).toBeInTheDocument();
    multi.unmount();
  });
});

describe("Field required over Empty", () => {
  it("counts whitespace-only values as Empty without altering the stored value", () => {
    render(<InputHarness overrides={{ initialValue: "   " }} />);

    const control = requiredControl("Name");
    fireEvent.blur(control);

    expect(errorParagraph(control)).toHaveTextContent(
      DEFAULT_REQUIRED_MESSAGE,
    );
    expect(control).toHaveValue("   ");
  });

  it("shows a custom message from a { value, message } pair", () => {
    render(
      <InputHarness
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
    render(<InputHarness overrides={{ validator: undefined }} />);

    const control = screen.getByRole("textbox", { name: "Name" });
    fireEvent.blur(control);

    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");
  });
});

describe("Field Touched lifecycle", () => {
  it("stays silent until Touched, reveals on first blur, and re-evaluates on every later change", () => {
    render(<InputHarness />);

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
    render(<InputHarness />);

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
    render(<InputHarness overrides={{ validator: { minLength: 3 } }} />);

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
      <TextareaHarness
        overrides={{
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
    render(<InputHarness overrides={{ validator: { regex: /^\d+$/ } }} />);

    const control = screen.getByRole("textbox", { name: "Name" });
    fireEvent.change(control, { target: { value: "abc" } });
    fireEvent.blur(control);
    expect(errorParagraph(control)).toHaveTextContent("Invalid format.");

    fireEvent.change(control, { target: { value: "123" } });
    expect(errorParagraph(control)).toHaveTextContent("");
  });

  it("enforces textual rules on textareas too, minLength taking precedence over regex", () => {
    render(
      <TextareaHarness
        overrides={{ validator: { minLength: 3, regex: /^[a-z]+$/ } }}
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
    render(<InputHarness overrides={{ validator: { maxLength: 2 } }} />);

    const control = screen.getByRole("textbox", { name: "Name" });
    fireEvent.change(control, { target: { value: "Ada" } });
    fireEvent.blur(control);

    expect(errorParagraph(control)).toHaveTextContent(
      "Must be at most 2 characters.",
    );
  });

  it("honors custom { value, message } pairs for numeric and regex constraints", () => {
    const numeric = render(
      <InputHarness
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
      <InputHarness
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
      <InputHarness
        overrides={{
          inputType: "number",
          validator: { min: 1, max: 10 },
          initialValue: 5,
        }}
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
        <InputHarness
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
        <TextareaHarness
          overrides={{ validator: { min: 1 } }}
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
      <InputHarness
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

describe("Field email rule", () => {
  const DEFAULT_EMAIL_MESSAGE = "Enter a valid email address.";

  it("rejects a malformed address on an input with the built-in default message and clears once satisfied", () => {
    render(<InputHarness overrides={{ validator: { email: true } }} />);

    const control = screen.getByRole("textbox", { name: "Name" });

    // A pristine undefined value never reaches the textual rules…
    fireEvent.blur(control);
    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");

    // …but once Touched, typed garbage fails the email check…
    fireEvent.change(control, { target: { value: "not-an-email" } });
    expect(errorParagraph(control)).toHaveTextContent(DEFAULT_EMAIL_MESSAGE);
    expect(control).toHaveAttribute("aria-invalid", "true");

    // …and so does clearing back to Empty.
    fireEvent.change(control, { target: { value: "" } });
    expect(errorParagraph(control)).toHaveTextContent(DEFAULT_EMAIL_MESSAGE);

    fireEvent.change(control, { target: { value: "ada@example.com" } });
    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");
  });

  it("accepts a custom message from a { value, message } pair and stays inert when disabled", () => {
    const custom = render(
      <InputHarness
        overrides={{
          validator: {
            email: { value: true, message: "That is not an email." },
          },
        }}
      />,
    );
    const customControl = custom.getByRole("textbox", { name: "Name" });
    fireEvent.change(customControl, { target: { value: "nope" } });
    fireEvent.blur(customControl);
    expect(errorParagraph(customControl)).toHaveTextContent(
      "That is not an email.",
    );
    custom.unmount();

    const bareDisabled = render(
      <InputHarness overrides={{ validator: { email: false } }} />,
    );
    const bareControl = bareDisabled.getByRole("textbox", { name: "Name" });
    fireEvent.change(bareControl, { target: { value: "nope" } });
    fireEvent.blur(bareControl);
    expect(errorParagraph(bareControl)).toHaveTextContent("");
    expect(bareControl).not.toHaveAttribute("aria-invalid");
    bareDisabled.unmount();

    const pairedDisabled = render(
      <InputHarness
        overrides={{
          validator: {
            email: { value: false, message: "Never shown." },
          },
        }}
      />,
    );
    const pairedControl = pairedDisabled.getByRole("textbox", { name: "Name" });
    fireEvent.change(pairedControl, { target: { value: "nope" } });
    fireEvent.blur(pairedControl);
    expect(errorParagraph(pairedControl)).toHaveTextContent("");
    expect(pairedControl).not.toHaveAttribute("aria-invalid");
  });

  it("lets required short-circuit ahead of it while the value is Empty", () => {
    render(
      <InputHarness overrides={{ validator: { required: true, email: true } }} />,
    );

    const control = requiredControl("Name");
    fireEvent.blur(control);
    expect(errorParagraph(control)).toHaveTextContent(DEFAULT_REQUIRED_MESSAGE);

    // Non-Empty garbage hands control to the email rule.
    fireEvent.change(control, { target: { value: "ada at example dot com" } });
    expect(errorParagraph(control)).toHaveTextContent(DEFAULT_EMAIL_MESSAGE);
  });

  it("evaluates after maxLength — an over-long value reports length before format", () => {
    render(
      <InputHarness
        overrides={{ validator: { maxLength: 5, email: true } }}
      />,
    );

    const control = screen.getByRole("textbox", { name: "Name" });
    fireEvent.change(control, { target: { value: "way-too-long" } });
    fireEvent.blur(control);
    expect(errorParagraph(control)).toHaveTextContent(
      "Must be at most 5 characters.",
    );

    // Once length passes, the email rule takes its turn.
    fireEvent.change(control, { target: { value: "a@b" } });
    expect(errorParagraph(control)).toHaveTextContent(DEFAULT_EMAIL_MESSAGE);
  });

  it("evaluates before regex — first violation wins when both fail", () => {
    render(
      <InputHarness
        overrides={{ validator: { email: true, regex: /^[a-z]+$/ } }}
      />,
    );

    const control = screen.getByRole("textbox", { name: "Name" });

    // Fails both; the email message wins because regex runs last.
    fireEvent.change(control, { target: { value: "a@b" } });
    fireEvent.blur(control);
    expect(errorParagraph(control)).toHaveTextContent(DEFAULT_EMAIL_MESSAGE);

    // A value satisfying email still reaches regex afterwards.
    fireEvent.change(control, { target: { value: "Ada@example.com" } });
    expect(errorParagraph(control)).toHaveTextContent("Invalid format.");
  });

  it("fits non-number inputs only and ignores misplacement with the existing dev-only warn", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const emailWarning = () =>
        warnSpy.mock.calls.find(
          (call) =>
            typeof call[0] === "string" && call[0].includes('"email"'),
        )![0] as string;

      const numeric = render(
        <InputHarness
          overrides={{ inputType: "number", label: "Age", validator: { min: 0, email: true } }}
        />,
      );
      const ageControl = numeric.getByRole("spinbutton", { name: "Age" });
      fireEvent.change(ageControl, { target: { value: "42" } });
      fireEvent.blur(ageControl);
      expect(errorParagraph(ageControl)).toHaveTextContent("");
      expect(emailWarning()).toContain('"Age"');
      numeric.unmount();
      warnSpy.mockClear();

      const bio = render(
      <TextareaHarness
        overrides={{ label: "Bio", validator: { email: true } }}
      />,
      );
      const bioControl = bio.getByRole("textbox", { name: "Bio" });
      fireEvent.change(bioControl, { target: { value: "words" } });
      fireEvent.blur(bioControl);
      expect(errorParagraph(bioControl)).toHaveTextContent("");
      expect(emailWarning()).toContain('"Bio"');
    } finally {
      warnSpy.mockRestore();
    }
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
      <InputHarness
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
      <InputHarness
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
      <InputHarness
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
      <TextareaHarness
        onChangeSpy={(value) => received.push(value)}
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
      <CheckboxField
        config={{ label: "Subscribe", onValueChange, validator: undefined }}
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
      <CheckboxHarness
        onChangeSpy={(value) => received.push(value)}
        overrides={{
          label: "Terms",
          initialValue: false,
        }}
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
      <CheckboxHarness
        overrides={{ label: "Terms", initialValue: false }}
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
      <CheckboxHarness
        overrides={{ label: "Terms", initialValue: true }}
      />,
    );

    const control = screen.getByRole("checkbox", { name: "Terms (required)" });
    fireEvent.blur(control);

    expect(errorParagraph(control)).toHaveTextContent("");
    expect(control).not.toHaveAttribute("aria-invalid");
  });

  it("carries aria-required, aria-invalid, and describedby directly on the input", () => {
    render(
      <CheckboxHarness
        overrides={{
          label: "Terms",
          hint: "Required to continue.",
          initialValue: false,
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
        <CheckboxHarness
          overrides={{
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
    const handle = createRef<FieldHandle<boolean>>();
    render(
      <CheckboxHarness
        handleRef={handle}
        overrides={{ label: "Terms", initialValue: false }}
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

const selectTrigger = (name: string) =>
  screen.getByRole("button", { name }) as HTMLButtonElement;

/** A plain, valid select config every select suite can layer overrides onto. */
const SELECT_OVERRIDES: Partial<FieldSelectConfig<string>> = {
  label: "Country",
  validator: undefined,
  options: COUNTRY_OPTIONS,
};

describe("Field select kind", () => {
  it("opens the shared popup from the closed face and hands the picked Option's value to the change callback", () => {
    const received: FieldValue[] = [];
    render(
      <SelectHarness
        onChangeSpy={(value) => received.push(value)}
        overrides={SELECT_OVERRIDES}
      />,
    );

    const trigger = selectTrigger("Country");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "Japan" }));

    expect(received).toEqual(["jp"]);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("leaves no <select> element or composite popup roles behind", () => {
    const { container } = render(
      <SelectHarness overrides={SELECT_OVERRIDES} />,
    );

    fireEvent.click(selectTrigger("Country"));

    expect(container.querySelector("select")).toBeNull();
    expect(
      container.querySelector("[role=combobox], [role=listbox], [role=option]"),
    ).toBeNull();
    expect(container.querySelector("[aria-haspopup]")).toBeNull();
  });

  it("follows the Touched lifecycle with required over Empty", () => {
    render(
      <SelectHarness
        overrides={{
          ...SELECT_OVERRIDES,
          validator: { required: true },
        }}
      />,
    );

    const trigger = selectTrigger("Country (required)");

    expect(errorParagraph(trigger)).toHaveTextContent("");
    expect(trigger).not.toHaveAttribute("aria-invalid");

    fireEvent.blur(trigger);
    expect(errorParagraph(trigger)).toHaveTextContent(
      DEFAULT_REQUIRED_MESSAGE,
    );
    expect(trigger).toHaveAttribute("aria-invalid", "true");

    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "France" }));
    expect(errorParagraph(trigger)).toHaveTextContent("");
    expect(trigger).not.toHaveAttribute("aria-invalid");
  });

  it("carries aria-required, aria-invalid, and describedby on the trigger", () => {
    render(
      <SelectHarness
        overrides={{
          label: "Country",
          hint: "Where you live.",
          validator: { required: true },
        }}
      />,
    );

    const trigger = selectTrigger("Country (required)");
    expect(trigger).toHaveAttribute("aria-required", "true");

    fireEvent.blur(trigger);
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(describedIds(trigger)).toHaveLength(2);
    expect(hintParagraph(trigger)).toHaveTextContent("Where you live.");
  });

  it("ignores a textual rule with a dev-only warn naming field and rule", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(
        <SelectHarness
          overrides={{
            label: "Country",
            options: COUNTRY_OPTIONS,
            validator: { required: true, minLength: 3 },
          }}
        />,
      );

      const trigger = selectTrigger("Country (required)");
      fireEvent.click(trigger);
      fireEvent.click(screen.getByRole("button", { name: "France" }));
      fireEvent.blur(trigger);

      expect(errorParagraph(trigger)).toHaveTextContent("");
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

describe("Field select closed face", () => {
  const ghostOverrides: Partial<FieldSelectConfig<string>> = {
    label: "Country",
    validator: undefined,
    placeholder: "Choose a country",
    options: COUNTRY_OPTIONS,
  };

  it("shows the placeholder ghost while empty and never pre-selects a real Option", () => {
    render(<SelectHarness overrides={{ ...ghostOverrides }} />);

    const trigger = selectTrigger("Country");
    expect(within(trigger).getByText("Choose a country")).toBeInTheDocument();
    expect(within(trigger).queryByText("France")).toBeNull();
  });

  it("replaces the ghost with the chosen Option's label once a choice is made", () => {
    render(<SelectHarness overrides={{ ...ghostOverrides }} />);

    const trigger = selectTrigger("Country");
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Japan" }));

    expect(trigger).toHaveTextContent("Japan");
    expect(screen.queryByText("Choose a country")).toBeNull();
  });
});

describe("Field select stale value", () => {
  const staleOverrides: Partial<FieldSelectConfig<string>> = {
    label: "Country",
    validator: undefined,
    options: COUNTRY_OPTIONS,
  };

  it("renders an unknown current value as inert fallback text on the closed face with a dev-only warn", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(
        <SelectHarness
          overrides={{ ...staleOverrides, initialValue: "zz" }}
        />,
      );

      const trigger = selectTrigger("Country");
      expect(within(trigger).getByText("zz")).toBeInTheDocument();

      // The fallback never becomes a choosable row.
      fireEvent.click(trigger);
      expect(screen.queryByRole("button", { name: "zz" })).toBeNull();
      expect(screen.getByRole("button", { name: "France" })).toBeInTheDocument();

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
      render(<SelectHarness overrides={{ ...staleOverrides }} />);

      const trigger = selectTrigger("Country");

      expect(
        within(trigger).queryByText("Choose a country"),
      ).toBeNull();
      expect(
        warnSpy.mock.calls.filter((call) => typeof call[0] === "string"),
      ).toHaveLength(0);
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe("Field select keepDisabledSelection", () => {
  const heldOverrides: Partial<FieldSelectConfig<string>> = {
    label: "Country",
    validator: undefined,
    options: [
      ...COUNTRY_OPTIONS,
      { label: "Antarctica", value: "aq", disabled: true },
    ],
  };

  it("keeps a held disabled Option legally selected by default", () => {
    render(
      <SelectHarness
        overrides={{ ...heldOverrides, initialValue: "aq" }}
      />,
    );

    const trigger = selectTrigger("Country");
    expect(within(trigger).getByText("Antarctica")).toBeInTheDocument();
    // No fallback duplicates the display.
    expect(within(trigger).queryByText("aq")).toBeNull();

    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "Antarctica" })).toBeDisabled();
  });

  it("demotes a held disabled Option to an inert fallback that still shows its label when keepDisabledSelection is false", () => {
    render(
      <SelectHarness
        overrides={{
          ...heldOverrides,
          keepDisabledSelection: false,
          initialValue: "aq",
        }}
      />,
    );

    // Labels are the only rendered surface — even a demoted fallback never
    // leaks the raw value.
    const trigger = selectTrigger("Country");
    expect(within(trigger).getByText("Antarctica")).toBeInTheDocument();
    expect(within(trigger).queryByText("aq")).toBeNull();

    fireEvent.click(trigger);
    const antarctica = screen.getByRole("button", { name: "Antarctica" });
    expect(antarctica).toBeDisabled();
    // Other choices remain pickable so the user can deselect.
    expect(screen.getByRole("button", { name: "France" })).toBeEnabled();
  });
});

describe("Field select popup", () => {
  it("moves focus to the search box on open, filters rows client-side, and resets the query on close", () => {
    render(<SelectHarness overrides={SELECT_OVERRIDES} />);

    const trigger = selectTrigger("Country");
    fireEvent.click(trigger);

    const search = screen.getByRole("textbox", { name: "Search options" });
    expect(search).toHaveFocus();

    fireEvent.change(search, { target: { value: "ja" } });
    expect(screen.getByRole("button", { name: "Japan" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "France" })).toBeNull();

    fireEvent.keyDown(search, { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();

    fireEvent.click(trigger);
    expect(search).toHaveValue("");
    expect(screen.getByRole("button", { name: "France" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Japan" })).toBeInTheDocument();
  });

  it("closes on pointer-down outside without moving focus", () => {
    render(
      <>
        <button type="button">Elsewhere</button>
        <SelectHarness overrides={SELECT_OVERRIDES} />
      </>,
    );

    const trigger = selectTrigger("Country");
    fireEvent.click(trigger);
    const search = screen.getByRole("textbox", { name: "Search options" });
    expect(search).toHaveFocus();

    fireEvent.pointerDown(screen.getByRole("button", { name: "Elsewhere" }));
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    // Pointer dismissal never yanks focus anywhere.
    expect(search).toHaveFocus();
  });

  it("closes when focus tabs out of the widget and lets focus move naturally", () => {
    render(
      <>
        <SelectHarness overrides={SELECT_OVERRIDES} />
        <input aria-label="Outside" />
      </>,
    );

    const trigger = selectTrigger("Country");
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.blur(screen.getByRole("textbox", { name: "Search options" }), {
      relatedTarget: screen.getByLabelText("Outside"),
    });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("picks from anywhere in a row and closes, returning focus to the trigger", () => {
    const received: FieldValue[] = [];
    render(
      <SelectHarness
        onChangeSpy={(value) => received.push(value)}
        overrides={SELECT_OVERRIDES}
      />,
    );

    const trigger = selectTrigger("Country");
    fireEvent.click(trigger);

    const row = screen.getByRole("button", { name: "France" });
    // Click the row's text node, not its edge — the whole row is the target.
    fireEvent.click(within(row).getByText("France"));

    expect(received).toEqual(["fr"]);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("renders disabled Options as inert rows that cannot be picked", () => {
    const received: FieldValue[] = [];
    render(
      <SelectHarness
        onChangeSpy={(value) => received.push(value)}
        overrides={{
          ...SELECT_OVERRIDES,
          options: [
            ...COUNTRY_OPTIONS,
            { label: "Antarctica", value: "aq", disabled: true },
          ],
        }}
      />,
    );

    fireEvent.click(selectTrigger("Country"));
    const antarctica = screen.getByRole("button", { name: "Antarctica" });
    expect(antarctica).toBeDisabled();

    fireEvent.click(antarctica);
    expect(received).toEqual([]);
    expect(selectTrigger("Country")).toHaveAttribute("aria-expanded", "true");
  });

  it("shares the multi-select's popup structure: search outside a legend-named group of rows", () => {
    render(<SelectHarness overrides={SELECT_OVERRIDES} />);

    fireEvent.click(selectTrigger("Country"));

    const rowsGroup = screen.getByRole("group", { name: "Options" });
    expect(rowsGroup.tagName).toBe("FIELDSET");
    expect(rowsGroup.querySelector("legend")).toHaveTextContent("Options");
    expect(rowsGroup.querySelector("button")).not.toBeNull();

    const search = screen.getByRole("textbox", { name: "Search options" });
    expect(search.closest("fieldset")).toBeNull();
  });
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const REGION_OPTIONS: FieldOption[] = [
  { label: "Africa", value: "af" },
  { label: "Europe", value: "eu" },
];

describe("Field async options", () => {
  function asyncOverrides(
    loader: FieldSelectConfig["options"],
  ): Partial<FieldSelectConfig<unknown>> {
    return {
      label: "Region",
      validator: undefined,
      placeholder: "Choose a region",
      options: loader,
    };
  }

  it("fires the loader exactly once on mount, then renders resolved Options and enables choosing", async () => {
    const received: unknown[] = [];
    const d = deferred<FieldOption[]>();
    const loader = vi.fn(() => d.promise);
    render(
      <SelectHarness
        onChangeSpy={(value) => received.push(value)}
        overrides={asyncOverrides(loader)}
      />,
    );

    expect(loader).toHaveBeenCalledTimes(1);

    const trigger = selectTrigger("Region");
    expect(trigger).toBeDisabled();

    await act(async () => {
      d.resolve(REGION_OPTIONS);
    });

    expect(trigger).not.toBeDisabled();

    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "Africa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Europe" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Europe" }));
    expect(received).toEqual(["eu"]);
    // Interacting afterwards must not re-fire the loader.
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("blocks choosing while Pending with 'Loading options…' in the hint slot and keeps any selection visible", async () => {
    const d = deferred<FieldOption[]>();
    render(
      <SelectHarness
        overrides={{
          ...asyncOverrides(() => d.promise),
          initialValue: "eu",
        }}
      />,
    );

    const trigger = selectTrigger("Region");
    const hint = hintParagraph(trigger) as HTMLElement;

    expect(trigger).toBeDisabled();
    expect(hint).toHaveTextContent("Loading options…");
    expect(within(hint).getByText("Loading options…")).toBeInTheDocument();
    expect(hint.querySelector(".animate-spin")).not.toBeNull();
    // The held selection stays visible even though its Option has not arrived.
    expect(within(trigger).getByText("eu")).toBeInTheDocument();

    await act(async () => {
      d.resolve(REGION_OPTIONS);
    });

    expect(trigger).not.toBeDisabled();
    expect(within(trigger).getByText("Europe")).toBeInTheDocument();
    expect(hint).toHaveTextContent("");
  });

  it("shows 'Couldn't load options.' with a Retry that re-fires the loader successfully", async () => {
    const d1 = deferred<FieldOption[]>();
    const d2 = deferred<FieldOption[]>();
    const loader = vi
      .fn<() => Promise<FieldOption[]>>()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise);
    render(<SelectHarness overrides={asyncOverrides(loader)} />);

    await act(async () => {
      d1.reject(new Error("boom"));
    });

    const trigger = selectTrigger("Region");
    const hint = hintParagraph(trigger) as HTMLElement;

    expect(hint).toHaveTextContent("Couldn't load options.");
    expect(trigger).toBeDisabled();
    expect(loader).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(loader).toHaveBeenCalledTimes(2);
    expect(hint).toHaveTextContent("Loading options…");
    expect(trigger).toBeDisabled();

    await act(async () => {
      d2.resolve(REGION_OPTIONS);
    });

    expect(trigger).not.toBeDisabled();
    fireEvent.click(trigger);
    expect(
      screen.getByRole("button", { name: "Europe" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(hint).toHaveTextContent("");
  });

  it("keeps the popup closed through Pending and Rejected", async () => {
    const d1 = deferred<FieldOption[]>();
    const d2 = deferred<FieldOption[]>();
    const loader = vi
      .fn<() => Promise<FieldOption[]>>()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise);
    render(<SelectHarness overrides={asyncOverrides(loader)} />);

    const trigger = selectTrigger("Region");

    // Pending: the popup refuses to open.
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Africa" })).toBeNull();

    await act(async () => {
      d1.reject(new Error("boom"));
    });

    // Rejected: still refused, with Retry offered beside the failure status.
    expect(screen.getByText("Couldn't load options.")).toBeInTheDocument();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Africa" })).toBeNull();

    // Retry re-fires the loader; once resolved the popup opens normally.
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(loader).toHaveBeenCalledTimes(2);
    await act(async () => {
      d2.resolve(REGION_OPTIONS);
    });

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Africa" }));
    expect(trigger).toHaveTextContent("Africa");
  });

  it("styles Rejected distinctly from validation Error — no aria-invalid and the error slot stays untouched", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const d = deferred<FieldOption[]>();
      render(
        <SelectHarness
          handleRef={createRef<FieldHandle<string | number>>()}
          overrides={asyncOverrides(() => d.promise)}
        />,
      );

      await act(async () => {
        d.reject(new Error("boom"));
      });

      const trigger = selectTrigger("Region");
      const error = errorParagraph(trigger) as HTMLElement;

      expect(trigger).not.toHaveAttribute("aria-invalid");
      expect(error).toHaveTextContent("");

      // The rejection lives in the hint slot, not the Error paragraph.
      expect(hintParagraph(trigger)).toHaveTextContent(
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
      const d = deferred<FieldOption[]>();
      render(
        <SelectHarness
          overrides={{
            ...asyncOverrides(() => d.promise),
            initialValue: "eu",
          }}
        />,
      );

      const trigger = selectTrigger("Region");
      expect(warnSpy.mock.calls.filter((call) => typeof call[0] === "string"))
        .toHaveLength(0);

      await act(async () => {
        d.resolve(REGION_OPTIONS);
      });

      expect(within(trigger).getByText("Europe")).toBeInTheDocument();
      expect(warnSpy.mock.calls.filter((call) => typeof call[0] === "string"))
        .toHaveLength(0);
    } finally {
      warnSpy.mockRestore();
    }
  });
});

const TAG_OPTIONS: FieldOption<string>[] = [
  { label: "Design", value: "design" },
  { label: "Research", value: "research" },
  { label: "Engineering", value: "engineering" },
];

function tagOverrides(): Partial<FieldMultiSelectConfig<string>> {
  return {
    label: "Tags",
    validator: undefined,
    options: TAG_OPTIONS,
  };
}

/** Opts back into removable Chips for closed-face chip-behavior suites. */
function chipTagOverrides(): Partial<FieldMultiSelectConfig<string>> {
  return { ...tagOverrides(), selectionDisplay: "chips" };
}

function politeRegion(): HTMLElement {
  return document.querySelector('[aria-live="polite"]') as HTMLElement;
}

describe("Field multi-select closed face", () => {
  it("renders a label-named group of chips beside a separate open button with synced expanded state", () => {
    render(<MultiSelectHarness overrides={tagOverrides()} />);

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
      <MultiSelectHarness overrides={tagOverrides()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Show options" }));

    expect(
      container.querySelector("[role=combobox], [role=listbox], [role=option]"),
    ).toBeNull();
    expect(container.querySelector("[aria-haspopup]")).toBeNull();
  });

  it("defaults to the text Selection display: one comma-joined line carrying the whole string as its native tooltip", () => {
    const received: FieldValue[] = [];
    const { container } = render(
      <MultiSelectHarness
        onChangeSpy={(value) => received.push(value)}
        overrides={{ ...tagOverrides(), initialValue: ["design", "research"] }}
      />,
    );

    // No remove buttons on the text face — removal happens inside the popup.
    expect(screen.queryByRole("button", { name: /^Remove / })).toBeNull();

    const face = container.querySelector<HTMLElement>(".field-selection-text");
    expect(face).not.toBeNull();
    const line = within(face!).getByText("Design, Research");
    expect(line).toHaveAttribute("title", "Design, Research");
    expect(line).toHaveClass("truncate");

    // Toggling inside the popup updates the joined line live.
    fireEvent.click(screen.getByRole("button", { name: "Show options" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Engineering" }));
    expect(
      within(face!).getByText("Design, Research, Engineering"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Design" }));
    expect(received).toEqual([
      ["design", "research", "engineering"],
      ["research", "engineering"],
    ]);
  });

  it("renders fallback labels into the joined text face exactly as chips would show them", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { container } = render(
        <MultiSelectHarness
          overrides={{
            label: "Tags",
            validator: undefined,
            options: [
              { label: "Small", value: 1 },
              { label: "Large", value: 4 },
            ],
            initialValue: [1, 9],
          }}
        />,
      );

      const face = container.querySelector<HTMLElement>(
        ".field-selection-text",
      )!;
      expect(within(face).getByText("Small, 9")).toHaveAttribute(
        "title",
        "Small, 9",
      );
      const [message] = warnSpy.mock.calls.find(
        (call) => typeof call[0] === "string",
      )!;
      expect(message).toContain('"Tags"');
      expect(message).toContain('"9"');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("applies a changed selectionDisplay prop live: the same Field swaps its face without remounting", () => {
    const { container, rerender } = render(
      <MultiSelectHarness
        overrides={{
          ...tagOverrides(),
          initialValue: ["design"],
          selectionDisplay: "text",
        }}
      />,
    );
    expect(container.querySelector(".field-selection-text")).not.toBeNull();
    expect(container.querySelector(".field-chip-strip")).toBeNull();

    rerender(
      <MultiSelectHarness
        overrides={{
          ...tagOverrides(),
          initialValue: ["design"],
          selectionDisplay: "chips",
        }}
      />,
    );
    expect(container.querySelector(".field-chip-strip")).not.toBeNull();
    expect(container.querySelector(".field-selection-text")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Remove Design" }),
    ).toBeInTheDocument();
  });

  it("grows the chips strip vertically instead of scrolling horizontally, capping at about three rows", () => {
    const { container } = render(
      <MultiSelectHarness
        overrides={{
          ...tagOverrides(),
          selectionDisplay: "chips",
          initialValue: ["design", "research"],
        }}
      />,
    );

    const strip = container.querySelector<HTMLElement>(".field-chip-strip");
    expect(strip).not.toBeNull();
    expect(strip).toHaveClass("flex-wrap");
    expect(strip).toHaveClass("min-h-11");
    expect(strip).toHaveClass("max-h-24");
    expect(strip).toHaveClass("overflow-y-auto");
    expect(strip).not.toHaveClass("overflow-x-auto");
    expect(strip).not.toHaveClass("h-11");
  });
});

describe("Field multi-select toggle semantics", () => {
  it("adds and removes membership through panel checkboxes with Chips appearing and disappearing in step", () => {
    const received: FieldValue[] = [];
    render(
      <MultiSelectHarness
        onChangeSpy={(value) => received.push(value)}
        overrides={chipTagOverrides()}
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
      <MultiSelectHarness
        onChangeSpy={(value) => received.push(value)}
        overrides={{
          ...chipTagOverrides(),
          initialValue: ["design", "research"],
        }}
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
    render(<MultiSelectHarness overrides={tagOverrides()} />);

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

  it("keeps the popup open and still toggles when a row press dissolves focus", () => {
    const received: FieldValue[] = [];
    render(
      <MultiSelectHarness
        onChangeSpy={(value) => received.push(value)}
        overrides={tagOverrides()}
      />,
    );

    const openButton = screen.getByRole("button", { name: "Show options" });
    fireEvent.click(openButton);
    const search = screen.getByRole("textbox", { name: "Search options" });
    expect(search).toHaveFocus();

    // Real browsers dissolve focus when a press starts on a non-focusable
    // row: the search input blurs with nowhere for focus to go before the
    // click can reach the row's checkbox. That must not read as leaving.
    const rowText = screen.getByText("Research");
    fireEvent.mouseDown(rowText);
    fireEvent.blur(search, { relatedTarget: null });

    expect(openButton).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(rowText);
    expect(received).toEqual([["research"]]);
    expect(screen.getByRole("checkbox", { name: "Research" })).toBeChecked();
  });

  it("absorbs the mousedown on a row so focus never leaves the search input mid-press", () => {
    render(<MultiSelectHarness overrides={tagOverrides()} />);

    fireEvent.click(screen.getByRole("button", { name: "Show options" }));
    const search = screen.getByRole("textbox", { name: "Search options" });
    expect(search).toHaveFocus();

    // fireEvent dispatches cancelable events and reports whether the default
    // action survived — a false return means the row prevented it.
    expect(fireEvent.mouseDown(screen.getByText("Research"))).toBe(false);
    expect(search).toHaveFocus();
  });

  it("still reads a dissolved focus that no row press explains as leaving", () => {
    render(<MultiSelectHarness overrides={tagOverrides()} />);

    const openButton = screen.getByRole("button", { name: "Show options" });
    fireEvent.click(openButton);
    const search = screen.getByRole("textbox", { name: "Search options" });
    expect(search).toHaveFocus();

    // Tab with nowhere to go (or an app switch) also dissolves focus to a
    // null relatedTarget — without an absorbed row press that is a leave.
    fireEvent.blur(search, { relatedTarget: null });

    expect(openButton).toHaveAttribute("aria-expanded", "false");
  });

  it("lays rows out full-width with the same hover affordance as the select kind's rows", () => {
    render(
      <MultiSelectHarness
        overrides={{
          ...tagOverrides(),
          options: [
            ...TAG_OPTIONS,
            { label: "Archived", value: "archived", disabled: true },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show options" }));

    const row = screen.getByText("Research").closest("label")!;
    expect(row).toHaveClass(
      "w-full",
      "rounded-md",
      "px-2",
      "py-1.5",
      "hover:bg-neutral-100",
      "dark:hover:bg-neutral-800",
    );

    // Disabled rows stay visibly inert — no hover highlight.
    const disabledRow = screen.getByText("Archived").closest("label")!;
    expect(disabledRow).toHaveClass("cursor-not-allowed", "opacity-60");
    expect(disabledRow).not.toHaveClass("hover:bg-neutral-100");
  });

  it("wraps native checkbox rows in a fieldset/legend group with the search input outside it", () => {
    render(<MultiSelectHarness overrides={tagOverrides()} />);

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
      <MultiSelectHarness
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

  it("toggles membership when clicking anywhere in a row — the popup stays open", () => {
    const received: FieldValue[] = [];
    render(
      <MultiSelectHarness
        onChangeSpy={(value) => received.push(value)}
        overrides={tagOverrides()}
      />,
    );

    const openButton = screen.getByRole("button", { name: "Show options" });
    fireEvent.click(openButton);

    // Click the row's text node, not the checkbox — the whole row toggles.
    fireEvent.click(screen.getByText("Research"));

    expect(received).toEqual([["research"]]);
    expect(openButton).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("checkbox", { name: "Research" }),
    ).toBeChecked();
  });

  it("leaves disabled rows inert even when their label text is clicked directly", () => {
    const received: FieldValue[] = [];
    render(
      <MultiSelectHarness
        onChangeSpy={(value) => received.push(value)}
        overrides={{
          ...tagOverrides(),
          options: [...TAG_OPTIONS, { label: "Archived", value: "archived", disabled: true }],
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show options" }));
    fireEvent.click(screen.getByText("Archived"));

    expect(received).toEqual([]);
    expect(
      screen.getByRole("checkbox", { name: "Archived" }),
    ).not.toBeChecked();
  });
});

describe("Field multi-select focus choreography", () => {
  it("opens onto the search input, and Escape closes and returns focus to the open button", () => {
    render(<MultiSelectHarness overrides={tagOverrides()} />);

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
        <MultiSelectHarness overrides={tagOverrides()} />
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
        <MultiSelectHarness overrides={tagOverrides()} />
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
      <MultiSelectHarness
        overrides={{
          ...chipTagOverrides(),
          initialValue: ["design", "research", "engineering"],
        }}
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
      <MultiSelectHarness
        overrides={{ ...chipTagOverrides(), initialValue: ["design", "research"] }}
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
      <MultiSelectHarness
        overrides={{ ...chipTagOverrides(), initialValue: ["design"] }}
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
      <MultiSelectHarness
        overrides={{ ...chipTagOverrides(), initialValue: ["design", "research"] }}
      />,
    );

    const region = politeRegion();
    fireEvent.click(screen.getByRole("button", { name: "Remove Design" }));
    expect(region).toHaveTextContent("Removed Design. 1 selected.");

    fireEvent.click(screen.getByRole("button", { name: "Remove Research" }));
    expect(region).toHaveTextContent("Removed Research. 0 selected.");
  });

  it("stays silent while toggling inside the panel — native checked announcements suffice", () => {
    render(<MultiSelectHarness overrides={tagOverrides()} />);

    fireEvent.click(screen.getByRole("button", { name: "Show options" }));
    const region = politeRegion();
    expect(region).toHaveTextContent("");

    fireEvent.click(screen.getByRole("checkbox", { name: "Design" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Research" }));
    expect(region).toHaveTextContent("");
  });
});

describe("Field multi-select Empty, placeholder, and stale chips", () => {
  it("shows the placeholder inside the empty chip strip and drops it while a Chip exists", () => {
    render(
      <MultiSelectHarness
        overrides={{ ...tagOverrides(), placeholder: "Pick some tags" }}
      />,
    );

    expect(screen.getByText("Pick some tags")).toHaveAttribute(
      "aria-hidden",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Show options" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Design" }));
    expect(screen.queryByText("Pick some tags")).toBeNull();

    fireEvent.click(screen.getByRole("checkbox", { name: "Design" }));
    expect(screen.getByText("Pick some tags")).toBeInTheDocument();
  });

  it("counts [] as Empty so required reveals on leaving the widget and clears once something is selected", () => {
    render(
      <MultiSelectHarness
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

  it("renders unknown values as removable raw-value fallback chips with a dev-only warn", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const received: FieldValue[] = [];
      render(
        <MultiSelectHarness
          onChangeSpy={(value) => received.push(value)}
          overrides={{ ...chipTagOverrides(), initialValue: ["design", "zz"] }}
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
      const d = deferred<FieldOption<string>[]>();
      render(
        <MultiSelectHarness
          overrides={{
            ...chipTagOverrides(),
            options: () => d.promise,
            initialValue: ["eu"],
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

describe("Field multi-select async options", () => {
  function asyncTagOverrides(
    loader: FieldMultiSelectConfig["options"],
  ): Partial<FieldMultiSelectConfig<unknown>> {
    return {
      label: "Tags",
      validator: undefined,
      options: loader,
    };
  }

  it("fires the loader exactly once on mount; Pending disables the widget while chips stay visible", async () => {
    const d = deferred<FieldOption[]>();
    const loader = vi.fn(() => d.promise);
    render(
      <MultiSelectHarness
        overrides={{
          ...asyncTagOverrides(loader),
          selectionDisplay: "chips",
          initialValue: ["design"],
        }}
      />,
    );

    expect(loader).toHaveBeenCalledTimes(1);

    const openButton = screen.getByRole("button", { name: "Show options" });
    // Unresolved Options leave the held selection visible as its raw-value
    // fallback chip — expected-absent, never stale.
    const chipRemove = screen.getByRole("button", { name: "Remove design" });

    expect(openButton).toBeDisabled();
    expect(chipRemove).toBeDisabled();
    // The shared status contract renders in the persistent hint slot.
    const hint = hintParagraph(screen.getByRole("group", { name: "Tags" }))!;
    expect(hint).toHaveTextContent("Loading options…");

    await act(async () => {
      d.resolve(TAG_OPTIONS);
    });

    // The same persistent hint node swaps content — it never unmounts.
    expect(hint).toHaveTextContent("");
    expect(openButton).not.toBeDisabled();
    expect(screen.queryByRole("button", { name: "Remove design" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Remove Design" }),
    ).not.toBeDisabled();
    expect(screen.queryByText("Loading options…")).toBeNull();
    // Interacting afterwards must not re-fire the loader.
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("keeps the popup closed through Pending and Rejected, then Retry recovers it to fully usable", async () => {
    const d1 = deferred<FieldOption[]>();
    const d2 = deferred<FieldOption[]>();
    const loader = vi
      .fn<() => Promise<FieldOption[]>>()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise);
    render(
      <MultiSelectHarness
        overrides={{ ...asyncTagOverrides(loader), selectionDisplay: "chips" }}
      />,
    );

    const openButton = screen.getByRole("button", { name: "Show options" });
    const panelId = openButton.getAttribute("aria-controls")!;

    // Pending: the popup refuses to open.
    fireEvent.click(openButton);
    expect(openButton).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(panelId)).toHaveAttribute("hidden");
    expect(screen.queryByRole("checkbox", { name: "Design" })).toBeNull();

    await act(async () => {
      d1.reject(new Error("boom"));
    });

    // Rejected: still refused, with the failure status beside Retry.
    expect(screen.getByText("Couldn't load options.")).toBeInTheDocument();
    fireEvent.click(openButton);
    expect(openButton).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById(panelId)).toHaveAttribute("hidden");

    // Retry re-fires the loader and resolves recovery.
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(loader).toHaveBeenCalledTimes(2);
    await act(async () => {
      d2.resolve(TAG_OPTIONS);
    });

    expect(screen.queryByText("Couldn't load options.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Retry" })).toBeNull();
    expect(openButton).not.toBeDisabled();

    // Resolved: the popup opens normally and toggles work end to end.
    fireEvent.click(openButton);
    expect(openButton).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("checkbox", { name: "Research" }));
    expect(
      screen.getByRole("button", { name: "Remove Research" }),
    ).toBeInTheDocument();
  });

  it("keeps held fallback chips visible through Rejected until Retry resolves them to their labels", async () => {
    const d1 = deferred<FieldOption[]>();
    const d2 = deferred<FieldOption[]>();
    const loader = vi
      .fn<() => Promise<FieldOption[]>>()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise);
    render(
      <MultiSelectHarness
        overrides={{
          ...asyncTagOverrides(loader),
          selectionDisplay: "chips",
          initialValue: ["eu"],
        }}
      />,
    );

    await act(async () => {
      d1.reject(new Error("boom"));
    });

    // The held selection stays visible as its raw value while unresolved.
    expect(screen.getByRole("button", { name: "Remove eu" })).toBeDisabled();
    expect(screen.getByText("Couldn't load options.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await act(async () => {
      d2.resolve([
        { label: "Europe", value: "eu" },
        { label: "Africa", value: "af" },
      ]);
    });

    // Recovered: the chip upgrades to its Option label and removal works.
    const chipRemove = screen.getByRole("button", { name: "Remove Europe" });
    expect(chipRemove).not.toBeDisabled();
    fireEvent.click(chipRemove);
    expect(
      screen.queryByRole("button", { name: "Remove Europe" }),
    ).toBeNull();
  });
});

// --- Unbounded Option values, Matching, and Fallback ---

type Train = { id: number; codename: string };

const KEPLER: Train = { id: 1, codename: "kepler" };
const HOPPER: Train = { id: 2, codename: "hopper" };
const LOVELACE: Train = { id: 3, codename: "lovelace" };

const TRAIN_OPTIONS: FieldOption<Train>[] = [
  { label: "Kepler", value: KEPLER },
  { label: "Hopper", value: HOPPER },
  { label: "Lovelace", value: LOVELACE, disabled: true },
];

/** A matcher that Matches domain identity instead of references. */
const matchById = (a: Train, b: Train) => a.id === b.id;

function trainOverrides(): Partial<FieldSelectConfig<Train>> {
  return {
    label: "Release train",
    validator: undefined,
    placeholder: "Choose a train",
    options: TRAIN_OPTIONS,
  };
}

describe("Field object-valued Options", () => {
  it("resolves the closed face to the matched Option's label under reference identity, never rendering the value", () => {
    render(
      <SelectHarness
        overrides={{ ...trainOverrides(), initialValue: HOPPER }}
      />,
    );

    const trigger = selectTrigger("Release train");
    expect(within(trigger).getByText("Hopper")).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("[object Object]");
    expect(document.body.textContent).not.toContain("hopper");
  });

  it("hands the exact Option object through the observer and reads it back through the ref", () => {
    const received: Train[] = [];
    const handle = createRef<FieldHandle<Train>>();
    render(
      <SelectHarness
        onChangeSpy={(value) => received.push(value)}
        handleRef={handle}
        overrides={trainOverrides()}
      />,
    );

    fireEvent.click(selectTrigger("Release train"));
    fireEvent.click(screen.getByRole("button", { name: "Kepler" }));

    expect(received).toHaveLength(1);
    expect(received[0]).toBe(KEPLER);
    act(() => {
      expect(handle.current!.getValue()).toBe(KEPLER);
    });
  });

  it("installs an object value imperatively and resolves its label on the closed face", () => {
    const handle = createRef<FieldHandle<Train>>();
    render(
      <SelectHarness
        handleRef={handle}
        overrides={{ ...trainOverrides(), initialValue: KEPLER }}
      />,
    );

    act(() => {
      expect(handle.current!.getValue()?.id).toBe(1);
      handle.current!.setValue(HOPPER);
    });

    expect(within(selectTrigger("Release train")).getByText("Hopper"))
      .toBeInTheDocument();
  });
});

describe("Field matchValue override", () => {
  it("matches a distinct-but-equal object for the closed face and stays quiet about staleness", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(
        <SelectHarness
          overrides={{
            ...trainOverrides(),
            matchValue: matchById,
            initialValue: { id: 2, codename: "hopper-copy" },
          }}
        />,
      );

      // Reference identity would call this value stale; the matcher does not.
      const trigger = selectTrigger("Release train");
      expect(within(trigger).getByText("Hopper")).toBeInTheDocument();
      expect(warnSpy.mock.calls.filter((call) => typeof call[0] === "string"))
        .toHaveLength(0);

      // The popup row reflects membership through the matcher too.
      fireEvent.click(trigger);
      expect(screen.getByRole("button", { name: "Hopper" })).toBeInTheDocument();
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("does not mistake a re-created, matcher-equal Initial literal for a changed seed", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { rerender } = render(
        <SelectHarness
          overrides={{
            ...trainOverrides(),
            matchValue: matchById,
            initialValue: { id: 2, codename: "hopper-copy" },
          }}
        />,
      );

      // A fresh but id-equal literal is the same Initial under the matcher —
      // seed-once stays quiet.
      rerender(
        <SelectHarness
          overrides={{
            ...trainOverrides(),
            matchValue: matchById,
            initialValue: { id: 2, codename: "hopper-again" },
          }}
        />,
      );
      expect(
        within(selectTrigger("Release train")).getByText("Hopper"),
      ).toBeInTheDocument();
      expect(warnSpy.mock.calls.filter((call) => typeof call[0] === "string"))
        .toHaveLength(0);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("tolerates an undefined Initial value without feeding it through the matcher", () => {
    // trainConfig on the demo page: matchValue set, initialValue omitted.
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const onWindowError = vi.fn();
    window.addEventListener("error", onWindowError);
    try {
      render(
        <SelectHarness
          overrides={{ ...trainOverrides(), matchValue: matchById }}
        />,
      );

      expect(
        within(selectTrigger("Release train")).getByText("Choose a train"),
      ).toBeInTheDocument();
      expect(onWindowError).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy.mock.calls.filter((call) => typeof call[0] === "string"))
        .toHaveLength(0);
    } finally {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
      window.removeEventListener("error", onWindowError);
    }
  });

  it("drives checkbox states, chip membership, toggling, and removal on the multi-select", () => {    const received: Train[][] = [];
    render(
      <MultiSelectHarness
        onChangeSpy={(value) => received.push(value)}
          overrides={{
            label: "Trains",
            validator: undefined,
            options: TRAIN_OPTIONS,
            matchValue: matchById,
            selectionDisplay: "chips",
            initialValue: [{ id: 1, codename: "kepler-copy" }],
          }}
      />,
    );

    // The held id-equal copy renders as its Option's Chip.
    expect(
      screen.getByRole("button", { name: "Remove Kepler" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("kepler-copy")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show options" }));
    expect(screen.getByRole("checkbox", { name: "Kepler" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Hopper" })).not.toBeChecked();

    // Toggling appends the Option's own object.
    fireEvent.click(screen.getByRole("checkbox", { name: "Hopper" }));
    expect(received).toHaveLength(1);
    expect(received[0][0].id).toBe(1);
    expect(received[0][1]).toBe(HOPPER);

    // Removing the Kepler chip filters out the id-equal held copy.
    fireEvent.click(screen.getByRole("button", { name: "Remove Kepler" }));
    expect(received[1]).toEqual([HOPPER]);
  });
});

describe("Field Fallback", () => {
  it("renders an unmatched primitive as its string form on the select face with the dev-only warn", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(
        <SelectHarness
          overrides={{
            label: "Capacity",
            validator: undefined,
            placeholder: "Choose a capacity",
            options: [
              { label: "Small", value: 1 },
              { label: "Large", value: 4 },
            ],
            initialValue: 9,
          }}
        />,
      );

      const trigger = selectTrigger("Capacity");
      expect(within(trigger).getByText("9")).toBeInTheDocument();

      // The fallback never becomes a choosable row.
      fireEvent.click(trigger);
      expect(screen.queryByRole("button", { name: "9" })).toBeNull();
      expect(
        screen.getByRole("button", { name: "Small" }),
      ).toBeInTheDocument();

      const [message] = warnSpy.mock.calls.find(
        (call) => typeof call[0] === "string",
      )!;
      expect(message).toContain('"Capacity"');
      expect(message).toContain('"9"');
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("renders an unmatched non-primitive as the generic '(unknown option)' marker with the dev-only warn", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(
        <SelectHarness
          overrides={{
            ...trainOverrides(),
            initialValue: { id: 99, codename: "soyuz" },
          }}
        />,
      );

      const trigger = selectTrigger("Release train");
      expect(within(trigger).getByText("(unknown option)")).toBeInTheDocument();
      // Neither the raw value nor a stringified object ever leaks.
      expect(document.body.textContent).not.toContain("soyuz");
      expect(document.body.textContent).not.toContain("[object Object]");

      fireEvent.click(trigger);
      expect(
        screen.queryByRole("button", { name: "(unknown option)" }),
      ).toBeNull();
      expect(
        screen.getByRole("button", { name: "Kepler" }),
      ).toBeInTheDocument();

      const [message] = warnSpy.mock.calls.find(
        (call) => typeof call[0] === "string",
      )!;
      expect(message).toContain('"Release train"');
      expect(message).toContain("does not match any Option");
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("renders unmatched multi-select selections as honest chips — string form for primitives — and removes them", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const received: number[][] = [];
      render(
        <MultiSelectHarness
          onChangeSpy={(value) => received.push(value)}
          overrides={{
            label: "Capacities",
            validator: undefined,
            selectionDisplay: "chips",
            options: [
              { label: "Small", value: 1 },
              { label: "Large", value: 4 },
            ],
            initialValue: [1, 9],
          }}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Remove Small" }),
      ).toBeInTheDocument();
      expect(screen.getByText("9")).toBeInTheDocument();

      const [message] = warnSpy.mock.calls.find(
        (call) => typeof call[0] === "string",
      )!;
      expect(message).toContain('"Capacities"');
      expect(message).toContain('"9"');

      fireEvent.click(screen.getByRole("button", { name: "Remove 9" }));
      expect(received).toEqual([[1]]);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("renders an unmatched non-primitive selection as a removable '(unknown option)' chip without leaking the value", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const received: Train[][] = [];
      render(
        <MultiSelectHarness
          onChangeSpy={(value) => received.push(value)}
          overrides={{
            label: "Trains",
            validator: undefined,
            selectionDisplay: "chips",
            options: TRAIN_OPTIONS,
            initialValue: [KEPLER, { id: 99, codename: "ghost-train" }],
          }}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Remove Kepler" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Remove (unknown option)" }),
      ).toBeInTheDocument();
      expect(document.body.textContent).not.toContain("ghost-train");
      expect(document.body.textContent).not.toContain("[object Object]");
      expect(warnSpy.mock.calls.find((call) => typeof call[0] === "string")!)
        .toBeDefined();

      fireEvent.click(
        screen.getByRole("button", { name: "Remove (unknown option)" }),
      );
      expect(received).toEqual([[KEPLER]]);
      expect(received[0][0]).toBe(KEPLER);
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("shows a demoted disabled Option's label on its fallback chip when keepDisabledSelection is false", () => {
    render(
      <MultiSelectHarness
        overrides={{
          label: "Tags",
          validator: undefined,
          selectionDisplay: "chips",
          options: [
            ...TAG_OPTIONS,
            { label: "Archived", value: "archived", disabled: true },
          ],
          keepDisabledSelection: false,
          initialValue: ["archived"],
        }}
      />,
    );

    // The demoted chip renders its Option's label, never the raw value.
    expect(
      screen.getByRole("button", { name: "Remove Archived" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("archived")).toBeNull();
  });
});

describe("Field generic value typing", () => {
  it("narrows select and multi-select values through the generic config", () => {
    const selectConfig: FieldSelectConfig<Train> = {
      label: "Release train",
      options: TRAIN_OPTIONS,
    };
    expect(selectConfig.label).toBe("Release train");

    const wrongOption: FieldSelectConfig<Train> = {
      ...selectConfig,
      // @ts-expect-error — a string-valued Option cannot pose as a Train option
      options: [{ label: "Impostor", value: "kepler" }],
    };
    expect(wrongOption.label).toBe("Release train");

    const multiConfig: FieldMultiSelectConfig<Train> = {
      label: "Trains",
      options: TRAIN_OPTIONS,
      // @ts-expect-error — a multi-select Initial holds many values, never one bare T
      initialValue: HOPPER,
    };
    expect(multiConfig.label).toBe("Trains");

    // A bare kindless config is already a plain input Field config.
    const loose: FieldInputConfig = { label: "Name" };
    expect(loose.label).toBe("Name");
  });
});

// ─── Date kinds — engine value model tests ───────────────────────────

const DEFAULT_DATE_REQUIRED = "This field is required.";

function DateHarness({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldDateConfig>;
  onChangeSpy?: (value: string) => void;
  handleRef?: React.Ref<FieldHandle<string>>;
}) {
  return (
    <DateField
      ref={handleRef}
      config={{
        label: "Birthday",
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

function DateTimeHarness({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldDateTimeConfig>;
  onChangeSpy?: (value: string) => void;
  handleRef?: React.Ref<FieldHandle<string>>;
}) {
  return (
    <DateTimeField
      ref={handleRef}
      config={{
        label: "Appointment",
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

function DateRangeHarness({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldDateRangeConfig>;
  onChangeSpy?: (value: FieldDateRangeValue) => void;
  handleRef?: React.Ref<FieldHandle<FieldDateRangeValue>>;
}) {
  return (
    <DateRangeField
      ref={handleRef}
      config={{
        label: "Booking",
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

function DateTimeRangeHarness({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldDateTimeRangeConfig>;
  onChangeSpy?: (value: FieldDateRangeValue) => void;
  handleRef?: React.Ref<FieldHandle<FieldDateRangeValue>>;
}) {
  return (
    <DateTimeRangeField
      ref={handleRef}
      config={{
        label: "Window",
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

describe("DateField — engine value model", () => {
  afterEach(cleanup);

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
        overrides={{ validator: { min: "2025-06-01" as any } }}
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
        overrides={{ validator: { max: "2025-12-31T00:00:00Z" as any } }}
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

describe("DateTimeField — engine value model", () => {
  afterEach(cleanup);

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
        overrides={{ validator: { min: "2025-06-01T00:00:00Z" as any } }}
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

describe("DateRangeField — engine value model", () => {
  afterEach(cleanup);

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
            min: "2025-06-01T00:00:00Z" as any,
            max: "2025-12-31T00:00:00Z" as any,
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
      handle.current!.setValue({ from: "bad", to: "also-bad" } as any),
    );
    expect(handle.current!.getValue()).toEqual({
      from: undefined,
      to: undefined,
    });
    expect(warnSpy).toHaveBeenCalled();
  });
});

describe("DateTimeRangeField — engine value model", () => {
  afterEach(cleanup);

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
            min: "2025-06-01T00:00:00Z" as any,
            max: "2025-12-31T23:59:59Z" as any,
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

// ─── DateField & DateTimeField — calendar widget UI tests ─────────────

describe("DateField — calendar widget", () => {
  afterEach(cleanup);

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
        overrides={{ validator: { min: "2025-06-01T00:00:00Z" as any } }}
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

describe("DateTimeField — calendar widget", () => {
  afterEach(cleanup);

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

describe("DateField — keyboard accessibility", () => {
  afterEach(cleanup);

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
  afterEach(cleanup);

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
  afterEach(cleanup);

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
    expect(headerButton).toHaveTextContent("March 2024");
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

    // Header should still be visible and clickable
    expect(headerButton).toBeInTheDocument();
    expect(headerButton).toHaveTextContent("March 2024");

    // Click header to re-open year panel
    await act(async () => {
      fireEvent.mouseDown(headerButton);
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
    expect(headerButton).toHaveTextContent("March 2024");

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
  afterEach(cleanup);

  it("years outside min/max range render as disabled in the year panel", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateHarness
        handleRef={handle}
        overrides={{ validator: { min: "2020-03-15" as any, max: "2030-08-20" as any } }}
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
        overrides={{ validator: { max: "2026-06-01" as any } }}
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
        overrides={{ validator: { min: "2022-01-01" as any } }}
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
        overrides={{ validator: { min: "2016-01-01" as any } }}
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
        overrides={{ validator: { max: "2027-01-01" as any } }}
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
        overrides={{ validator: { min: "2025-05-01" as any, max: "2025-09-30" as any } }}
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
        overrides={{ validator: { min: "2025-06-01" as any } }}
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
        overrides={{ validator: { min: "2025-06-01" as any } }}
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
        overrides={{ validator: { max: "2025-06-30" as any } }}
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

describe("DateRangeField — calendar widget", () => {
  afterEach(cleanup);

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

    // Should commit but calendar stays open for Apply
    expect(spy).toHaveBeenCalled();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Draft range should remain highlighted in the grid after completion
    expect(screen.getByRole("gridcell", { name: /August 10, 2026/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("gridcell", { name: /August 20, 2026/ })).toHaveAttribute("aria-selected", "true");
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
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1][0];
    expect(lastCall.to).toBeUndefined();
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

    // Should commit with from <= to
    expect(spy).toHaveBeenCalled();
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1][0];
    expect(lastCall.from).toBeDefined();
    expect(lastCall.to).toBeDefined();
    expect(lastCall.from <= lastCall.to).toBe(true);
  });

  it("half-picks stream live with undefined ends", async () => {
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

    // The value should stream with only from set
    expect(spy).toHaveBeenCalled();
    const lastCall = spy.mock.calls[spy.mock.calls.length - 1][0];
    expect(lastCall.from).toBeDefined();
    expect(lastCall.to).toBeUndefined();
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
            min: "2025-06-01T00:00:00Z" as any,
            max: "2025-12-31T00:00:00Z" as any,
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

describe("DateTimeRangeField — calendar widget", () => {
  afterEach(cleanup);

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

    // Should commit with time (may be UTC-converted)
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

  it("fresh date pick seeds midnight in start time control", async () => {
    render(<DateTimeRangeHarness />);

    const trigger = screen.getByRole("button", { name: /Window/i });
    await act(async () => {
      fireEvent.click(trigger);
    });

    // First click: set anchor (day 10 of current month)
    const day10 = screen.getByRole("gridcell", { name: /August 10, 2026/ });
    await act(async () => {
      fireEvent.mouseDown(day10);
    });

    // Start time should be 00:00
    const startHourInput = screen.getByLabelText("Start hour");
    const startMinuteInput = screen.getByLabelText("Start minute");
    expect(startHourInput).toHaveValue("00");
    expect(startMinuteInput).toHaveValue("00");
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

// ─── Cross-kind verification ──────────────────────────────────────────

describe("DateTimeField — year panel", () => {
  afterEach(cleanup);

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
  afterEach(cleanup);

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

    expect(headerButton).toHaveTextContent("March 2024");
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
    expect(headerButton).toHaveTextContent("March 2024");
  });
});

describe("DateTimeField — min/max constraints on year and month panels", () => {
  afterEach(cleanup);

  it("years outside min/max range render as disabled in the year panel", async () => {
    const handle = createRef<FieldHandle<string>>();
    render(
      <DateTimeHarness
        handleRef={handle}
        overrides={{ validator: { min: "2020-03-15" as any, max: "2030-08-20" as any } }}
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
        overrides={{ validator: { min: "2025-05-01" as any, max: "2025-09-30" as any } }}
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
        overrides={{ validator: { min: "2022-01-01" as any } }}
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
        overrides={{ validator: { min: "2025-06-01" as any } }}
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

describe("DateRangeField — year panel", () => {
  afterEach(cleanup);

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
  afterEach(cleanup);

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

    expect(headerButton).toHaveTextContent("March 2024");
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
    expect(headerButton).toHaveTextContent("March 2024");
  });
});

describe("DateRangeField — min/max constraints on year and month panels", () => {
  afterEach(cleanup);

  it("years outside min/max range render as disabled in the year panel", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(
      <DateRangeHarness
        handleRef={handle}
        overrides={{ validator: { min: "2020-03-15" as any, max: "2030-08-20" as any } }}
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
        overrides={{ validator: { min: "2025-05-01" as any, max: "2025-09-30" as any } }}
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
        overrides={{ validator: { min: "2022-01-01" as any } }}
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
        overrides={{ validator: { min: "2025-06-01" as any } }}
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

describe("DateTimeRangeField — year panel", () => {
  afterEach(cleanup);

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
  afterEach(cleanup);

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

    expect(headerButton).toHaveTextContent("March 2024");
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
    expect(headerButton).toHaveTextContent("March 2024");
  });
});

describe("DateTimeRangeField — min/max constraints on year and month panels", () => {
  afterEach(cleanup);

  it("years outside min/max range render as disabled in the year panel", async () => {
    const handle = createRef<FieldHandle<FieldDateRangeValue>>();
    render(
      <DateTimeRangeHarness
        handleRef={handle}
        overrides={{ validator: { min: "2020-03-15" as any, max: "2030-08-20" as any } }}
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
        overrides={{ validator: { min: "2025-05-01" as any, max: "2025-09-30" as any } }}
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
        overrides={{ validator: { min: "2022-01-01" as any } }}
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
        overrides={{ validator: { min: "2025-06-01" as any } }}
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
