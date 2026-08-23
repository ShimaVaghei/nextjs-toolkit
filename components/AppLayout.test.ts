import { describe, it, expect } from "vitest";
import { computeActiveRoute, type RoutesSection } from "./AppLayout";

const routes: RoutesSection[] = [
  {
    routes: [
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
    ],
  },
];

describe("computeActiveRoute", () => {
  it("leaf match at Level 1", () => {
    const result = computeActiveRoute("/dashboard", routes);
    expect(result.leaf).toBe("/dashboard");
    expect(result.ancestors).toEqual(new Set());
  });

  it("leaf match at Level 2 with ancestor node paths", () => {
    const result = computeActiveRoute("/settings/general", routes);
    expect(result.leaf).toBe("/settings/general");
    expect(result.ancestors).toEqual(new Set(["/settings"]));
  });

  it("leaf match at Level 3 with ancestor node paths", () => {
    const result = computeActiveRoute("/settings/advanced/debug", routes);
    expect(result.leaf).toBe("/settings/advanced/debug");
    expect(result.ancestors).toEqual(
      new Set(["/settings", "/settings/advanced"]),
    );
  });

  it("no match returns null leaf and empty ancestors", () => {
    const result = computeActiveRoute("/nonexistent", routes);
    expect(result.leaf).toBeNull();
    expect(result.ancestors).toEqual(new Set());
  });

  it("partial path match returns leaf at deepest matched level", () => {
    const result = computeActiveRoute("/settings/advanced", routes);
    expect(result.leaf).toBe("/settings/advanced");
    expect(result.ancestors).toEqual(new Set(["/settings"]));
  });

  it("multiple Level 1 routes, only matching branch highlighted", () => {
    const result = computeActiveRoute("/users", routes);
    expect(result.leaf).toBe("/users");
    expect(result.ancestors).toEqual(new Set());
  });

  it("sections are transparent: same routes in multiple sections resolve identically", () => {
    const sectioned: RoutesSection[] = [
      {
        label: "Main",
        routes: [
          { path: "dashboard", label: "Dashboard" },
          {
            path: "settings",
            label: "Settings",
            children: [
              { path: "general", label: "General" },
              {
                path: "advanced",
                label: "Advanced",
                children: [{ path: "debug", label: "Debug" }],
              },
            ],
          },
        ],
      },
      { routes: [{ path: "users", label: "Users" }] },
    ];

    expect(computeActiveRoute("/dashboard", sectioned)).toEqual(
      computeActiveRoute("/dashboard", routes),
    );
    expect(computeActiveRoute("/settings/general", sectioned)).toEqual(
      computeActiveRoute("/settings/general", routes),
    );
    expect(computeActiveRoute("/settings/advanced/debug", sectioned)).toEqual(
      computeActiveRoute("/settings/advanced/debug", routes),
    );
    expect(computeActiveRoute("/users", sectioned)).toEqual(
      computeActiveRoute("/users", routes),
    );
    expect(computeActiveRoute("/nonexistent", sectioned).leaf).toBeNull();
  });

  it("empty sections are skipped", () => {
    const withEmpty: RoutesSection[] = [
      { label: "Placeholder", routes: [] },
      ...routes,
      { routes: [] },
    ];
    const result = computeActiveRoute("/settings/general", withEmpty);
    expect(result.leaf).toBe("/settings/general");
    expect(result.ancestors).toEqual(new Set(["/settings"]));
  });
});
