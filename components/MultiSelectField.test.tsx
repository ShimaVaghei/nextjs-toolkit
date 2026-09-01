import { describe, it, expect, vi, afterEach } from "vitest";
import {
  MultiSelectHarness,
  TAG_OPTIONS,
  tagOverrides,
  chipTagOverrides,
  politeRegion,
  COUNTRY_OPTIONS,
  SELECT_OVERRIDES,
  selectTrigger,
  describedIds,
  hintParagraph,
  errorParagraph,
  DEFAULT_REQUIRED_MESSAGE,
  deferred,
  REGION_OPTIONS,
  render,
  cleanup,
  fireEvent,
  screen,
  within,
  act,
  createRef,
} from "./__test__/field-test-utils";
import { type FieldMultiSelectConfig, type FieldOption, type FieldValue } from "./Field";

afterEach(() => {
  cleanup();
});

describe("Field multi-select closed face", () => {
  it("renders a label-named group whose text face itself is the open trigger with synced expanded state", () => {
    const { container } = render(<MultiSelectHarness overrides={tagOverrides()} />);

    // The group is named by the visible field label via aria-labelledby.
    expect(screen.getByRole("group", { name: "Tags" })).toBeInTheDocument();

    // No separate toggle button beside the strip: the strip is the trigger.
    const openButton = screen.getByRole("button", { name: "Show options" });
    expect(container.querySelector(".field-selection-text")).toBe(
      openButton,
    );
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
    // Button-reset: labels sit at the left edge, and the chevron rides the
    // right edge exactly like the select kind's closed face.
    expect(face).toHaveClass("text-left");
    expect(face).toHaveClass("justify-between");
    expect(face!.querySelector("svg")).not.toBeNull();
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

  it("shows a visible placeholder on the popup's search input", () => {
    render(<MultiSelectHarness overrides={tagOverrides()} />);
    fireEvent.click(screen.getByRole("button", { name: "Show options" }));
    expect(
      screen.getByRole("textbox", { name: "Search options" }),
    ).toHaveAttribute("placeholder", "Search options");
  });

  it("keeps a separate open button beside the strip when the Selection display is chips", () => {
    const { container } = render(
      <MultiSelectHarness overrides={chipTagOverrides()} />,
    );

    const strip = container.querySelector(".field-chip-strip");
    expect(strip).not.toBeNull();
    const openButton = screen.getByRole("button", { name: "Show options" });
    expect(openButton).not.toBe(strip);
    // The toggle holds the control's base height and never grows with the
    // strip, even when the chips wrap onto extra rows.
    expect(openButton).toHaveClass("h-11");
    expect(openButton).toHaveClass("self-start");
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
    // No align-content override: the default stretch lets items-center center
    // the single-row case instead of packing chips against the top edge.
    expect(strip).not.toHaveClass("content-start");
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
