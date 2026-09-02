import { describe, it, expect, vi, afterEach } from "vitest";
import { createRef } from "react";
import {
  SelectHarness,
  COUNTRY_OPTIONS,
  selectTrigger,
  SELECT_OVERRIDES,
  describedIds,
  hintParagraph,
  errorParagraph,
  DEFAULT_REQUIRED_MESSAGE,
  REGION_OPTIONS,
  deferred,
  cleanup,
  fireEvent,
  screen,
  within,
  act,
  render,
  Train,
  KEPLER,
  HOPPER,
  trainOverrides,
} from "./field-test-utils";
import type { FieldValue, FieldOption, FieldSelectConfig, FieldHandle } from "../Field";

afterEach(() => { cleanup(); });

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

  it("shows a visible placeholder on the popup's search input", () => {
    render(<SelectHarness overrides={SELECT_OVERRIDES} />);
    fireEvent.click(selectTrigger("Country"));
    expect(
      screen.getByRole("textbox", { name: "Search options" }),
    ).toHaveAttribute("placeholder", "Search options");
  });

  it("stands as tall as the multi-select strips when closed", () => {
    render(<SelectHarness overrides={SELECT_OVERRIDES} />);
    expect(selectTrigger("Country")).toHaveClass("min-h-11");
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
