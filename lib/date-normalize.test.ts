import { describe, it, expect, vi, afterEach } from "vitest";
import { normalizeDateInput, type DateInputKind } from "./date-normalize";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("normalizeDateInput", () => {
  describe("date kind", () => {
    it("accepts a bare YYYY-MM-DD and stores verbatim with fixed-zero time", () => {
      expect(normalizeDateInput("date", "2025-03-15")).toBe(
        "2025-03-15T00:00:00Z",
      );
    });

    it("accepts a full Z-terminated ISO string and extracts the UTC calendar date", () => {
      expect(normalizeDateInput("date", "2025-03-15T14:30:00Z")).toBe(
        "2025-03-15T00:00:00Z",
      );
    });

    it("accepts a no-Z ISO string, interprets as local, and emits the UTC calendar date", () => {
      // 2025-06-15T14:30:00 (no Z) → local midnight might be different date
      // We just verify it returns a valid fixed-zero string
      const result = normalizeDateInput("date", "2025-06-15T14:30:00");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00Z$/);
    });

    it("accepts an offset string and normalizes to UTC calendar date", () => {
      const result = normalizeDateInput("date", "2025-03-15T14:30:00+05:00");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00Z$/);
    });

    it("rejects an invalid string with a dev warning and returns undefined", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(normalizeDateInput("date", "not-a-date", "Birthday")).toBe(
        undefined,
      );
      expect(warnSpy).toHaveBeenCalledWith(
        '[Field] Invalid date input for "Birthday" — value ignored.',
      );
    });

    it("rejects an empty string and returns undefined", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(normalizeDateInput("date", "", "Birthday")).toBe(undefined);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe("datetime kind", () => {
    it("accepts a full Z-terminated ISO string as-is", () => {
      expect(
        normalizeDateInput("datetime", "2025-03-15T14:30:00Z"),
      ).toBe("2025-03-15T14:30:00Z");
    });

    it("accepts a no-Z string and converts from local to UTC", () => {
      const result = normalizeDateInput("datetime", "2025-03-15T14:30:00");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/);
    });

    it("accepts a bare YYYY-MM-DD and treats as local midnight", () => {
      const result = normalizeDateInput("datetime", "2025-03-15");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/);
    });

    it("accepts an offset string and normalizes to UTC", () => {
      const result = normalizeDateInput(
        "datetime",
        "2025-03-15T14:30:00+05:00",
      );
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00Z$/);
    });

    it("rejects an invalid string with a dev warning and returns undefined", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(normalizeDateInput("datetime", "garbage", "When")).toBe(undefined);
      expect(warnSpy).toHaveBeenCalledWith(
        '[Field] Invalid date input for "When" — value ignored.',
      );
    });
  });

  describe("date-range kind", () => {
    it("normalizes both ends when both are present", () => {
      const result = normalizeDateInput("date-range", {
        from: "2025-01-10",
        to: "2025-03-20",
      });
      expect(result).toEqual({
        from: "2025-01-10T00:00:00Z",
        to: "2025-03-20T00:00:00Z",
      });
    });

    it("preserves undefined ends", () => {
      const result = normalizeDateInput("date-range", {
        from: "2025-01-10",
      });
      expect(result).toEqual({
        from: "2025-01-10T00:00:00Z",
        to: undefined,
      });
    });

    it("rejects an invalid end and sets it to undefined", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = normalizeDateInput(
        "date-range",
        { from: "2025-01-10", to: "bad" },
        "Booking",
      );
      expect(result).toEqual({
        from: "2025-01-10T00:00:00Z",
        to: undefined,
      });
      expect(warnSpy).toHaveBeenCalled();
    });

    it("swaps out-of-order ends so from <= to", () => {
      const result = normalizeDateInput("date-range", {
        from: "2025-03-20",
        to: "2025-01-10",
      });
      expect(result).toEqual({
        from: "2025-01-10T00:00:00Z",
        to: "2025-03-20T00:00:00Z",
      });
    });
  });

  describe("datetime-range kind", () => {
    it("normalizes both ends as datetime", () => {
      const result = normalizeDateInput("datetime-range", {
        from: "2025-03-15T09:00:00Z",
        to: "2025-03-15T17:00:00Z",
      });
      expect(result).toEqual({
        from: "2025-03-15T09:00:00Z",
        to: "2025-03-15T17:00:00Z",
      });
    });

    it("swaps out-of-order datetime ends", () => {
      const result = normalizeDateInput("datetime-range", {
        from: "2025-03-15T17:00:00Z",
        to: "2025-03-15T09:00:00Z",
      });
      expect(result).toEqual({
        from: "2025-03-15T09:00:00Z",
        to: "2025-03-15T17:00:00Z",
      });
    });
  });

  describe("dev warning naming", () => {
    it("warns with the field label when provided", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      normalizeDateInput("date", "invalid", "My Date Field");
      expect(warnSpy).toHaveBeenCalledWith(
        '[Field] Invalid date input for "My Date Field" — value ignored.',
      );
    });

    it("warns without a label when none provided", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      normalizeDateInput("date", "invalid");
      expect(warnSpy).toHaveBeenCalledWith(
        "[Field] Invalid date input — value ignored.",
      );
    });
  });
});
