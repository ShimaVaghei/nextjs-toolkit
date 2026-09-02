import { describe, it, expect, vi, afterEach } from "vitest";
import { createRef, act } from "react";
import {
  InputHarness,
  TextareaHarness,
  CheckboxHarness,
  SelectHarness,
  MultiSelectHarness,
  makeConfig,
  describedIds,
  hintParagraph,
  errorParagraph,
  labelFor,
  requiredControl,
  SeededRerenderer,
  fireRawChange,
  COUNTRY_OPTIONS,
  selectTrigger,
  SELECT_OVERRIDES,
  TAG_OPTIONS,
  tagOverrides,
  chipTagOverrides,
  politeRegion,
  Train,
  KEPLER,
  HOPPER,
  LOVELACE,
  TRAIN_OPTIONS,
  matchById,
  trainOverrides,
  DEFAULT_REQUIRED_MESSAGE,
  cleanup,
  render,
  screen,
  fireEvent,
  within,
} from "./field-test-utils";
import {
  CheckboxField,
  InputField,
  MultiSelectField,
  SelectField,
  TextareaField,
  type FieldInputConfig,
  type FieldTextareaConfig,
  type FieldSelectConfig,
  type FieldMultiSelectConfig,
  type FieldOption,
  type FieldHandle,
  type FieldValue,
} from "../Field";
import { resolveCalendarPlacement } from "../../calendar";

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

describe("Field Clear in the options popup", () => {
  it("single select: commits emptiness, keeps the popup open, and shows the ghost face", () => {
    const received: FieldValue[] = [];
    render(
      <SelectHarness
        onChangeSpy={(value) => received.push(value)}
        overrides={{ ...SELECT_OVERRIDES, placeholder: "Choose a country" }}
      />,
    );

    const trigger = selectTrigger("Country");
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole("button", { name: "Japan" }));
    expect(received).toEqual(["jp"]);
    // A pick closes the popup; reopen for the Clear.
    fireEvent.click(trigger);

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(received).toEqual(["jp", ""]);
    // Clear's contract: emptiness commits, the popup stays open, and the
    // closed face falls back to the placeholder ghost.
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveTextContent("Choose a country");
  });

  it("single select: Clear is disabled while nothing is selected", () => {
    render(<SelectHarness overrides={SELECT_OVERRIDES} />);
    fireEvent.click(selectTrigger("Country"));
    expect(screen.getByRole("button", { name: "Clear" })).toBeDisabled();
  });

  it("multi-select: unchecks every Option, commits [], and announces", () => {
    const received: FieldValue[] = [];
    render(
      <MultiSelectHarness
        onChangeSpy={(value) => received.push(value as unknown as FieldValue)}
        overrides={tagOverrides()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Show options" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Design" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Research" }));

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(received.at(-1)).toEqual([]);
    expect(
      (screen.getByRole("checkbox", { name: "Design" }) as HTMLInputElement)
        .checked,
    ).toBe(false);
    expect(politeRegion()).toHaveTextContent("All selections cleared.");
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

describe("resolveCalendarPlacement", () => {
  it("opens below when there is enough space under the field", () => {
    expect(resolveCalendarPlacement({ top: 100, bottom: 140 }, 300, 768)).toBe("bottom");
  });

  it("opens above when there is no space below but enough above", () => {
    // Trigger near the viewport bottom: 28px below, 700px above
    expect(resolveCalendarPlacement({ top: 700, bottom: 740 }, 300, 768)).toBe("top");
  });

  it("picks the side with more space when neither side fits the panel", () => {
    // Panel (400) taller than both gaps: above 300 vs below 388 → below
    expect(resolveCalendarPlacement({ top: 300, bottom: 380 }, 400, 768)).toBe("bottom");
    // Above 380 vs below 310 → above
    expect(resolveCalendarPlacement({ top: 380, bottom: 458 }, 400, 768)).toBe("top");
  });
});
