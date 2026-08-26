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
  type FieldCheckboxConfig,
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
