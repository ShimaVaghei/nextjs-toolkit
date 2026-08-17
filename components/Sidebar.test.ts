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
    expect(result).toEqual(new Set(["dashboard"]));
  });

  it("leaf match at Level 2 with ancestor highlight", () => {
    const result = computeActiveRoute("/settings/general", routes);
    expect(result).toEqual(new Set(["settings", "general"]));
  });

  it("leaf match at Level 3 with ancestor highlight", () => {
    const result = computeActiveRoute("/settings/advanced/debug", routes);
    expect(result).toEqual(new Set(["settings", "advanced", "debug"]));
  });

  it("no match returns empty set", () => {
    const result = computeActiveRoute("/nonexistent", routes);
    expect(result).toEqual(new Set());
  });

  it("partial path match does not falsely highlight", () => {
    const result = computeActiveRoute("/settings/advanced", routes);
    expect(result).toEqual(new Set(["settings", "advanced"]));
  });

  it("multiple Level 1 routes, only matching branch highlighted", () => {
    const result = computeActiveRoute("/users", routes);
    expect(result).toEqual(new Set(["users"]));
    expect(result.has("dashboard")).toBe(false);
    expect(result.has("settings")).toBe(false);
  });
});
