import { describe, it, expect } from "vitest";
import { computeActiveRoute, type Route } from "./Sidebar";

const routes: Route[] = [
  {
    path: "dashboard",
    label: "Dashboard",
  },
  {
    path: "settings",
    label: "Settings",
    children: [
      {
        path: "general",
        label: "General",
      },
      {
        path: "advanced",
        label: "Advanced",
        children: [
          {
            path: "debug",
            label: "Debug",
          },
        ],
      },
    ],
  },
  {
    path: "users",
    label: "Users",
  },
];

describe("computeActiveRoute", () => {
  it("leaf match at Level 1", () => {
    const result = computeActiveRoute("/dashboard", routes);
    expect(result.leaf).toBe("dashboard");
    expect(result.ancestors).toEqual(new Set());
  });

  it("leaf match at Level 2 with ancestor highlight", () => {
    const result = computeActiveRoute("/settings/general", routes);
    expect(result.leaf).toBe("general");
    expect(result.ancestors).toEqual(new Set(["settings"]));
  });

  it("leaf match at Level 3 with ancestor highlight", () => {
    const result = computeActiveRoute("/settings/advanced/debug", routes);
    expect(result.leaf).toBe("debug");
    expect(result.ancestors).toEqual(new Set(["settings", "advanced"]));
  });

  it("no match returns null leaf and empty ancestors", () => {
    const result = computeActiveRoute("/nonexistent", routes);
    expect(result.leaf).toBeNull();
    expect(result.ancestors).toEqual(new Set());
  });

  it("partial path match returns leaf at deepest matched level", () => {
    const result = computeActiveRoute("/settings/advanced", routes);
    expect(result.leaf).toBe("advanced");
    expect(result.ancestors).toEqual(new Set(["settings"]));
  });

  it("multiple Level 1 routes, only matching branch highlighted", () => {
    const result = computeActiveRoute("/users", routes);
    expect(result.leaf).toBe("users");
    expect(result.ancestors).toEqual(new Set());
  });
});
