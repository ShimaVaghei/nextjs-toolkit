import { describe, it, expect, vi, afterEach } from "vitest";
import {
  evaluate,
  isEmpty,
  warnUnfittedRules,
  type FieldValidator,
} from "./field-validation";

afterEach(() => {
  vi.restoreAllMocks();
});

// Shorthand: evaluate assumes already-Touched unless the caller passes false.
const evalTouched = (
  kind: Parameters<typeof evaluate>[0],
  inputType: Parameters<typeof evaluate>[1] | undefined,
  validator: FieldValidator | undefined,
  value: unknown,
) => evaluate(kind, inputType, validator, value, true);

describe("isEmpty per-kind Empty semantics", () => {
  it("counts null/undefined as Empty", () => {
    expect(isEmpty(null)).toBe(true);
    expect(isEmpty(undefined)).toBe(true);
  });

  it("counts whitespace-only strings as Empty for textual kinds", () => {
    expect(isEmpty("")).toBe(true);
    expect(isEmpty("   ")).toBe(true);
  });

  it("does not count a non-empty string as Empty", () => {
    expect(isEmpty("Ada")).toBe(false);
  });

  it("counts NaN as Empty (number inputs at runtime)", () => {
    expect(isEmpty(NaN)).toBe(true);
  });

  it("does not count a finite number as Empty", () => {
    expect(isEmpty(0)).toBe(false);
    expect(isEmpty(42)).toBe(false);
  });

  it("counts false as Empty — required means must-tick for a checkbox", () => {
    expect(isEmpty(false)).toBe(true);
    expect(isEmpty(true)).toBe(false);
  });

  it("counts an empty array as Empty and a non-empty array as not", () => {
    expect(isEmpty([])).toBe(true);
    expect(isEmpty(["a"])).toBe(false);
  });

  it("counts an object as non-Empty (choice kinds)", () => {
    expect(isEmpty({ id: 1 })).toBe(false);
  });

  it("counts a date-range value as Empty unless both ends hold strings", () => {
    // A normalized range always carries both keys; a missing/empty end means Empty.
    expect(isEmpty({ from: "2025-01-10T00:00:00Z", to: undefined })).toBe(true);
    expect(isEmpty({ from: undefined, to: "2025-03-20T00:00:00Z" })).toBe(true);
    expect(isEmpty({ from: "", to: "2025-03-20T00:00:00Z" })).toBe(true);
    expect(
      isEmpty({
        from: "2025-01-10T00:00:00Z",
        to: "2025-03-20T00:00:00Z",
      }),
    ).toBe(false);
    // A one-key object is not a date range; like any other object it is never Empty.
    expect(isEmpty({ from: "2025-01-10T00:00:00Z" })).toBe(false);
  });
});

describe("evaluate Touched gating", () => {
  it("returns null while untouched even for an invalid required value", () => {
    expect(evaluate("input", undefined, { required: true }, "", false)).toBe(
      null,
    );
  });

  it("evaluates once Touched", () => {
    expect(evaluate("input", undefined, { required: true }, "", true)).toBe(
      "This field is required.",
    );
  });
});
describe("required over Empty", () => {
  it("reports the built-in required message for a whitespace-only Empty value", () => {
    expect(
      evalTouched("input", undefined, { required: true }, "   "),
    ).toBe("This field is required.");
  });

  it("shows a custom message from a { value, message } pair", () => {
    expect(
      evalTouched("input", undefined, {
        required: { value: true, message: "Enter your name." },
      }, ""),
    ).toBe("Enter your name.");
  });

  it("returns null when required is not configured", () => {
    expect(evalTouched("input", undefined, undefined, "")).toBe(null);
    expect(evalTouched("input", undefined, {}, "")).toBe(null);
  });
});

describe("minLength / maxLength", () => {
  it("enforces minLength with the built-in default message and clears once satisfied", () => {
    expect(evalTouched("input", "text", { minLength: 3 }, "ab")).toBe(
      "Must be at least 3 characters.",
    );
    expect(evalTouched("input", "text", { minLength: 3 }, "Ada")).toBe(null);
  });

  it("enforces maxLength on a textarea with a custom { value, message } pair", () => {
    expect(
      evalTouched("textarea", undefined, {
        maxLength: { value: 5, message: "Keep it under five." },
      }, "toolong"),
    ).toBe("Keep it under five.");
  });

  it("enforces minLength on a textarea too", () => {
    expect(evalTouched("textarea", undefined, { minLength: 3 }, "ab")).toBe(
      "Must be at least 3 characters.",
    );
  });
});

describe("regex rule", () => {
  it("enforces regex with the built-in default message and accepts a matching value", () => {
    expect(
      evalTouched("input", "text", { regex: /^\d+$/ }, "abc"),
    ).toBe("Invalid format.");
    expect(evalTouched("input", "text", { regex: /^\d+$/ }, "123")).toBe(
      null,
    );
  });

  it("honors a custom regex message", () => {
    expect(
      evalTouched("input", "text", {
        regex: { value: /^[a-z]+$/, message: "Lowercase letters only." },
      }, "ABC"),
    ).toBe("Lowercase letters only.");
  });
});

describe("numeric min/max on number inputs", () => {
  it("enforces numeric min and max only on number inputs, with boundaries passing", () => {
    expect(evalTouched("input", "number", { min: 1, max: 10 }, -3.5)).toBe(
      "Must be 1 or greater.",
    );
    expect(evalTouched("input", "number", { min: 1, max: 10 }, 42)).toBe(
      "Must be 10 or less.",
    );
    expect(evalTouched("input", "number", { min: 1, max: 10 }, 10)).toBe(null);
  });

  it("honors custom { value, message } pairs for numeric constraints", () => {
    expect(
      evalTouched("input", "number", { min: { value: 1, message: "Too small." } }, -3.5),
    ).toBe("Too small.");
  });

  it("ignores numeric rules on non-number inputs", () => {
    expect(evalTouched("input", "text", { min: 1 }, "anything")).toBe(null);
  });
});

describe("date-kind min/max", () => {
  it("tests the value itself on a single date kind", () => {
    expect(
      evalTouched("date", undefined, { min: "2025-06-01" }, "2025-01-10T00:00:00Z"),
    ).toBe("Must be on or after 2025-06-01.");
    expect(
      evalTouched("date", undefined, { min: "2025-06-01" }, "2025-07-01T00:00:00Z"),
    ).toBe(null);
  });

  it("tests from/to on range kinds", () => {
    expect(
      evalTouched("date-range", undefined, { min: "2025-06-01" }, {
        from: "2025-01-10T00:00:00Z",
      }),
    ).toBe("Must be on or after 2025-06-01.");
    expect(
      evalTouched("date-range", undefined, { max: "2025-01-31" }, {
        to: "2025-06-10T00:00:00Z",
      }),
    ).toBe("Must be on or before 2025-01-31.");
  });

  it("honors custom { value, message } pairs for date min/max", () => {
    expect(
      evalTouched("date", undefined, {
        min: { value: "2025-06-01", message: "Too early." },
      }, "2025-01-10T00:00:00Z"),
    ).toBe("Too early.");
    expect(
      evalTouched("date-range", undefined, {
        max: { value: "2025-01-31", message: "That date is past." },
      }, { to: "2025-06-10T00:00:00Z" }),
    ).toBe("That date is past.");
  });
});
describe("email rule", () => {
  it("rejects a malformed address with the built-in default message", () => {
    expect(
      evalTouched("input", "text", { email: true }, "not-an-email"),
    ).toBe("Enter a valid email address.");
    expect(
      evalTouched("input", "text", { email: true }, "ada@example.com"),
    ).toBe(null);
  });

  it("accepts a custom message from a { value, message } pair", () => {
    expect(
      evalTouched("input", "text", {
        email: { value: true, message: "That is not an email." },
      }, "nope"),
    ).toBe("That is not an email.");
  });

  it("stays inert when disabled via a bare or paired false", () => {
    expect(evalTouched("input", "text", { email: false }, "not-an-email")).toBe(
      null,
    );
    expect(
      evalTouched("input", "text", {
        email: { value: false, message: "Never shown." },
      }, "not-an-email"),
    ).toBe(null);
  });

  it("fits non-number inputs only — never a number input or a textarea", () => {
    expect(evalTouched("input", "number", { email: true }, "abc")).toBe(null);
    expect(evalTouched("textarea", undefined, { email: true }, "abc")).toBe(
      null,
    );
  });
});

describe("fixed rule precedence — first violation wins", () => {
  it("required wins while Empty, then textual rules take over", () => {
    const v: FieldValidator = { required: true, minLength: 3 };
    expect(evalTouched("input", "text", v, "")).toBe("This field is required.");
    expect(evalTouched("input", "text", v, "ab")).toBe(
      "Must be at least 3 characters.",
    );
  });

  it("lets required short-circuit ahead of email while Empty", () => {
    const v: FieldValidator = { required: true, email: true };
    expect(evalTouched("input", "text", v, "")).toBe("This field is required.");
    expect(evalTouched("input", "text", v, "ada at example dot com")).toBe(
      "Enter a valid email address.",
    );
  });

  it("evaluates maxLength before email — length reports before format", () => {
    const v: FieldValidator = { maxLength: 5, email: true };
    expect(evalTouched("input", "text", v, "way-too-long")).toBe(
      "Must be at most 5 characters.",
    );
    expect(evalTouched("input", "text", v, "a@b")).toBe(
      "Enter a valid email address.",
    );
  });

  it("evaluates email before regex — first violation wins when both fail", () => {
    const v: FieldValidator = { email: true, regex: /^[a-z]+$/ };
    expect(evalTouched("input", "text", v, "a@b")).toBe(
      "Enter a valid email address.",
    );
    expect(evalTouched("input", "text", v, "Ada@example.com")).toBe(
      "Invalid format.",
    );
  });

  it("minLength takes precedence over regex", () => {
    const v: FieldValidator = { minLength: 3, regex: /^[a-z]+$/ };
    expect(evalTouched("input", "text", v, "a!")).toBe(
      "Must be at least 3 characters.",
    );
    expect(evalTouched("input", "text", v, "abc!")).toBe("Invalid format.");
    expect(evalTouched("input", "text", v, "abc")).toBe(null);
  });
});

describe("number inputs: NaN and Empty rule handling", () => {
  it("counts coerced NaN as Empty so required catches it", () => {
    expect(evalTouched("input", "number", { required: true }, NaN)).toBe(
      "This field is required.",
    );
  });

  it("skips min and max evaluation while the value is Empty or NaN", () => {
    expect(evalTouched("input", "number", { min: 0 }, NaN)).toBe(null);
    expect(evalTouched("input", "number", { min: 0 }, "")).toBe(null);
  });
});

describe("warnUnfittedRules — dev-only rule-fit diagnostics", () => {
  it("warns naming the field and the rule when a rule does not fit the kind", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnUnfittedRules("input", "number", { minLength: 3 }, "Age");
    const message = warnSpy.mock.calls.find(
      (call) => typeof call[0] === "string",
    )![0] as string;
    expect(message).toContain('"Age"');
    expect(message).toContain('"minLength"');
    warnSpy.mockRestore();
  });

  it("warns the same way for numeric rules on non-number inputs", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    warnUnfittedRules("textarea", undefined, { min: 1 }, "Name");
    const message = warnSpy.mock.calls.find(
      (call) => typeof call[0] === "string",
    )![0] as string;
    expect(message).toContain('"Name"');
    expect(message).toContain('"min"');
    warnSpy.mockRestore();
  });

  it("does not warn in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      warnUnfittedRules("input", "number", { minLength: 3 }, "Age");
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
      vi.unstubAllEnvs();
    }
  });
});