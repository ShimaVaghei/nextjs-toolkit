import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Sidebar } from "./Sidebar";
import type { Route } from "./Sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

afterEach(() => {
  cleanup();
});

const routes: Route[] = [
  { path: "dashboard", label: "Dashboard" },
  {
    path: "settings",
    label: "Settings",
    children: [
      { path: "general", label: "General" },
      { path: "advanced", label: "Advanced" },
    ],
  },
  { path: "users", label: "Users" },
];

describe("Sidebar", () => {
  it("renders nothing when routes is empty", () => {
    const { container } = render(<Sidebar routes={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders Level 1 routes as a vertical list", () => {
    render(<Sidebar routes={routes} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  it("parent nodes have aria-expanded attribute", () => {
    render(<Sidebar routes={routes} />);
    const settingsButton = screen.getByRole("button", { name: "Settings" });
    expect(settingsButton).toHaveAttribute("aria-expanded", "false");
  });

  it("clicking a parent opens a second panel", () => {
    render(<Sidebar routes={routes} />);
    const settingsButton = screen.getByRole("button", { name: "Settings" });
    fireEvent.click(settingsButton);
    expect(settingsButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
  });

  it("clicking the same parent again closes the panel", () => {
    render(<Sidebar routes={routes} />);
    const settingsButton = screen.getByRole("button", { name: "Settings" });
    fireEvent.click(settingsButton);
    expect(settingsButton).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(settingsButton);
    expect(settingsButton).toHaveAttribute("aria-expanded", "false");
  });

  it("items are tab-focusable", () => {
    render(<Sidebar routes={routes} />);
    const dashboardLink = screen.getByRole("link", { name: "Dashboard" });
    expect(dashboardLink).toHaveAttribute("tabindex", "0");
  });

  it("sidebar container has max width for 3 panels", () => {
    const { container } = render(<Sidebar routes={routes} />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv).toHaveClass("max-w-[48rem]");
  });
});

describe("Sidebar Level 3 expansion", () => {
  const routesWithLevel3: Route[] = [
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
    { path: "users", label: "Users" },
  ];

  it("clicking a Level 2 parent with children opens a third panel", () => {
    render(<Sidebar routes={routesWithLevel3} />);
    const settingsButton = screen.getByRole("button", { name: "Settings" });
    fireEvent.click(settingsButton);
    const advancedButton = screen.getByRole("button", { name: "Advanced" });
    fireEvent.click(advancedButton);
    expect(screen.getByText("Debug")).toBeInTheDocument();
  });

  it("clicking a different Level 1 parent closes all deeper panels", () => {
    render(<Sidebar routes={routesWithLevel3} />);
    const settingsButton = screen.getByRole("button", { name: "Settings" });
    fireEvent.click(settingsButton);
    const advancedButton = screen.getByRole("button", { name: "Advanced" });
    fireEvent.click(advancedButton);
    expect(screen.getByText("Debug")).toBeInTheDocument();
    const usersLink = screen.getByRole("link", { name: "Users" });
    fireEvent.click(usersLink);
    // Debug should no longer be visible
    expect(screen.queryByText("Debug")).not.toBeInTheDocument();
  });

  it("clicking a different Level 2 parent closes the Level 3 panel", () => {
    render(<Sidebar routes={routesWithLevel3} />);
    const settingsButton = screen.getByRole("button", { name: "Settings" });
    fireEvent.click(settingsButton);
    const advancedButton = screen.getByRole("button", { name: "Advanced" });
    fireEvent.click(advancedButton);
    expect(screen.getByText("Debug")).toBeInTheDocument();
    // Click a different Level 2 parent (General) which has no children
    const generalLink = screen.getByRole("link", { name: "General" });
    fireEvent.click(generalLink);
    // Debug should no longer be visible
    expect(screen.queryByText("Debug")).not.toBeInTheDocument();
  });

  it("clicking a different Level 2 parent with children closes Level 3 and opens new one", () => {
    const routesWithMultipleParents: Route[] = [
      { path: "dashboard", label: "Dashboard" },
      {
        path: "settings",
        label: "Settings",
        children: [
          {
            path: "advanced",
            label: "Advanced",
            children: [{ path: "debug", label: "Debug" }],
          },
          {
            path: "other",
            label: "Other",
            children: [{ path: "other-child", label: "Other Child" }],
          },
        ],
      },
      { path: "users", label: "Users" },
    ];
    render(<Sidebar routes={routesWithMultipleParents} />);
    const settingsButton = screen.getByRole("button", { name: "Settings" });
    fireEvent.click(settingsButton);
    const advancedButton = screen.getByRole("button", { name: "Advanced" });
    fireEvent.click(advancedButton);
    expect(screen.getByText("Debug")).toBeInTheDocument();
    // Click a different Level 2 parent (Other) which has children
    const otherButton = screen.getByRole("button", { name: "Other" });
    fireEvent.click(otherButton);
    // Debug should no longer be visible, Other Child should appear
    expect(screen.queryByText("Debug")).not.toBeInTheDocument();
    expect(screen.getByText("Other Child")).toBeInTheDocument();
  });

  it("Level 2 parent chevron rotates when expanded", () => {
    render(<Sidebar routes={routesWithLevel3} />);
    const settingsButton = screen.getByRole("button", { name: "Settings" });
    fireEvent.click(settingsButton);
    const advancedButton = screen.getByRole("button", { name: "Advanced" });
    // Initially, Advanced button's SVG should not have rotate-90
    const svgBefore = advancedButton.querySelector("svg");
    expect(svgBefore).not.toHaveClass("rotate-90");
    fireEvent.click(advancedButton);
    // After clicking, SVG should have rotate-90
    const svgAfter = advancedButton.querySelector("svg");
    expect(svgAfter).toHaveClass("rotate-90");
  });
});
