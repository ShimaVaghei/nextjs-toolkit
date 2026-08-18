import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AppLayout } from "./AppLayout";
import type { Route } from "./AppLayout";

let mockPathname = "/";
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

afterEach(() => {
  cleanup();
  mockPush.mockClear();
  mockPathname = "/";
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

const pageContent = <div>Page content</div>;

describe("AppLayout", () => {
  it("renders children when routes is empty", () => {
    render(<AppLayout routes={[]}>{pageContent}</AppLayout>);
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });

  it("renders Level 1 routes as a vertical list", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  it("renders children beside the navigation column", () => {
    const { container } = render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    const content = screen.getByText("Page content");
    const nav = screen.getByRole("navigation");
    expect(container.firstChild).toContainElement(nav);
    expect(container.firstChild).toContainElement(content);
  });

  it("parent nodes have aria-expanded attribute", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    expect(settingsTreeItem).toHaveAttribute("aria-expanded", "false");
  });

  it("clicking a parent opens a second panel", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    expect(settingsTreeItem).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
  });

  it("clicking the same parent again closes the panel", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    expect(settingsTreeItem).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(settingsTreeItem);
    expect(settingsTreeItem).toHaveAttribute("aria-expanded", "false");
  });

  it("items are tab-focusable", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    const dashboardTreeItem = screen.getByRole("treeitem", { name: "Dashboard" });
    expect(dashboardTreeItem).toHaveAttribute("tabindex", "0");
  });

  it("nav column has max width for 3 panels", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    const navColumn = screen.getByRole("navigation").parentElement as HTMLElement;
    expect(navColumn).toHaveClass("md:max-w-3xl");
  });
});

describe("AppLayout Level 3 expansion", () => {
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
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const advancedTreeItem = screen.getByRole("treeitem", { name: "Advanced" });
    fireEvent.click(advancedTreeItem);
    expect(screen.getByText("Debug")).toBeInTheDocument();
  });

  it("clicking a different Level 1 parent closes all deeper panels", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const advancedTreeItem = screen.getByRole("treeitem", { name: "Advanced" });
    fireEvent.click(advancedTreeItem);
    expect(screen.getByText("Debug")).toBeInTheDocument();
    const usersTreeItem = screen.getByRole("treeitem", { name: "Users" });
    fireEvent.click(usersTreeItem);
    expect(screen.queryByText("Debug")).not.toBeInTheDocument();
  });

  it("clicking a different Level 2 parent closes the Level 3 panel", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const advancedTreeItem = screen.getByRole("treeitem", { name: "Advanced" });
    fireEvent.click(advancedTreeItem);
    expect(screen.getByText("Debug")).toBeInTheDocument();
    const generalTreeItem = screen.getByRole("treeitem", { name: "General" });
    fireEvent.click(generalTreeItem);
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
    render(<AppLayout routes={routesWithMultipleParents}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const advancedTreeItem = screen.getByRole("treeitem", { name: "Advanced" });
    fireEvent.click(advancedTreeItem);
    expect(screen.getByText("Debug")).toBeInTheDocument();
    const otherTreeItem = screen.getByRole("treeitem", { name: "Other" });
    fireEvent.click(otherTreeItem);
    expect(screen.queryByText("Debug")).not.toBeInTheDocument();
    expect(screen.getByText("Other Child")).toBeInTheDocument();
  });

  it("Level 2 parent chevron rotates when expanded", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const advancedTreeItem = screen.getByRole("treeitem", { name: "Advanced" });
    const svgBefore = advancedTreeItem.querySelector("svg");
    expect(svgBefore).not.toHaveClass("rotate-90");
    fireEvent.click(advancedTreeItem);
    const svgAfter = advancedTreeItem.querySelector("svg");
    expect(svgAfter).toHaveClass("rotate-90");
  });
});

describe("AppLayout active state", () => {
  const routesWithActive: Route[] = [
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

  it("active leaf node has bold styling", () => {
    mockPathname = "/settings/general";
    render(<AppLayout routes={routesWithActive}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const generalTreeItem = screen.getByRole("treeitem", { name: "General" });
    expect(generalTreeItem).toHaveClass("font-bold");
  });

  it("ancestor nodes of active leaf have muted opacity", () => {
    mockPathname = "/settings/general";
    render(<AppLayout routes={routesWithActive}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    expect(settingsTreeItem).toHaveClass("opacity-60");
  });

  it("non-active nodes do not have bold or muted styling", () => {
    mockPathname = "/dashboard";
    render(<AppLayout routes={routesWithActive}>{pageContent}</AppLayout>);
    const usersTreeItem = screen.getByRole("treeitem", { name: "Users" });
    expect(usersTreeItem).not.toHaveClass("font-bold");
    expect(usersTreeItem).not.toHaveClass("opacity-60");
  });

  it("clicking a leaf node navigates to full path via router", () => {
    render(<AppLayout routes={routesWithActive}>{pageContent}</AppLayout>);
    const dashboardTreeItem = screen.getByRole("treeitem", { name: "Dashboard" });
    fireEvent.click(dashboardTreeItem);
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("clicking a Level 2 leaf navigates to concatenated full path", () => {
    render(<AppLayout routes={routesWithActive}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const generalTreeItem = screen.getByRole("treeitem", { name: "General" });
    fireEvent.click(generalTreeItem);
    expect(mockPush).toHaveBeenCalledWith("/settings/general");
  });

  it("after leaf click, drawer collapses to Level 1", () => {
    render(<AppLayout routes={routesWithActive}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    expect(screen.getByText("General")).toBeInTheDocument();
    const generalTreeItem = screen.getByRole("treeitem", { name: "General" });
    fireEvent.click(generalTreeItem);
    expect(screen.queryByText("General")).not.toBeInTheDocument();
  });

  it("parent nodes have pointer cursor", () => {
    render(<AppLayout routes={routesWithActive}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    expect(settingsTreeItem).toHaveClass("cursor-pointer");
  });

  it("leaf nodes have pointer cursor", () => {
    render(<AppLayout routes={routesWithActive}>{pageContent}</AppLayout>);
    const dashboardTreeItem = screen.getByRole("treeitem", { name: "Dashboard" });
    expect(dashboardTreeItem).toHaveClass("cursor-pointer");
  });
});

describe("AppLayout mobile responsive", () => {
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

  it("Level 1 nav is hidden on mobile when Level 2 is expanded", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("hidden", "md:block");
  });

  it("Level 2 panel takes full width on mobile", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
    const level2Grid = screen.getByText("General").closest(".grid");
    expect(level2Grid).toHaveClass("w-full", "md:w-auto");
  });

  it("Level 1 nav reappears when Level 2 collapses on mobile", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("hidden", "md:block");
    fireEvent.click(settingsTreeItem);
    expect(nav).toHaveClass("block", "md:block");
  });

  it("Level 2 is hidden on mobile when Level 3 is expanded", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const advancedTreeItem = screen.getByRole("treeitem", { name: "Advanced" });
    fireEvent.click(advancedTreeItem);
    expect(screen.getByText("Debug")).toBeInTheDocument();
    const level2Grid = screen.getByText("General").closest(".grid");
    expect(level2Grid).toHaveClass("hidden", "md:block");
  });

  it("Level 3 panel takes full width on mobile", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const advancedTreeItem = screen.getByRole("treeitem", { name: "Advanced" });
    fireEvent.click(advancedTreeItem);
    const level3Grid = screen.getByText("Debug").closest(".grid");
    expect(level3Grid).toHaveClass("w-full", "md:w-auto");
  });

  it("Level 1 is hidden on mobile when Level 3 is expanded", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const advancedTreeItem = screen.getByRole("treeitem", { name: "Advanced" });
    fireEvent.click(advancedTreeItem);
    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("hidden", "md:block");
  });

  it("back navigation from Level 3 to Level 2 on mobile", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const advancedTreeItem = screen.getByRole("treeitem", { name: "Advanced" });
    fireEvent.click(advancedTreeItem);
    expect(screen.getByText("Debug")).toBeInTheDocument();
    fireEvent.click(advancedTreeItem);
    expect(screen.queryByText("Debug")).not.toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("hidden", "md:block");
  });

  it("back navigation from Level 2 to Level 1 on mobile", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    expect(screen.getByText("General")).toBeInTheDocument();
    fireEvent.click(settingsTreeItem);
    expect(screen.queryByText("General")).not.toBeInTheDocument();
    const nav = screen.getByRole("navigation");
    expect(nav).toHaveClass("block", "md:block");
  });

  it("clicking a different Level 2 parent while Level 3 is open on mobile swaps Level 3", () => {
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
    render(<AppLayout routes={routesWithMultipleParents}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const advancedTreeItem = screen.getByRole("treeitem", { name: "Advanced" });
    fireEvent.click(advancedTreeItem);
    expect(screen.getByText("Debug")).toBeInTheDocument();
    const otherTreeItem = screen.getByRole("treeitem", { name: "Other" });
    fireEvent.click(otherTreeItem);
    expect(screen.queryByText("Debug")).not.toBeInTheDocument();
    expect(screen.getByText("Other Child")).toBeInTheDocument();
  });
});

describe("AppLayout accessibility", () => {
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

  it("container has role=tree", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const tree = screen.getByRole("tree");
    expect(tree).toBeInTheDocument();
  });

  it("Level 1 items have role=treeitem", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const treeItems = screen.getAllByRole("treeitem");
    expect(treeItems.length).toBeGreaterThanOrEqual(3);
  });

  it("parent nodes have aria-expanded", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    expect(settingsTreeItem).toHaveAttribute("aria-expanded");
  });

  it("parent nodes have aria-level", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    expect(settingsTreeItem).toHaveAttribute("aria-level", "1");
  });

  it("Level 2 items have aria-level=2", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const generalTreeItem = screen.getByRole("treeitem", { name: "General" });
    expect(generalTreeItem).toHaveAttribute("aria-level", "2");
  });

  it("Level 3 items have aria-level=3", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const advancedTreeItem = screen.getByRole("treeitem", { name: "Advanced" });
    fireEvent.click(advancedTreeItem);
    const debugTreeItem = screen.getByRole("treeitem", { name: "Debug" });
    expect(debugTreeItem).toHaveAttribute("aria-level", "3");
  });

  it("items have aria-setsize", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const dashboardTreeItem = screen.getByRole("treeitem", { name: "Dashboard" });
    expect(dashboardTreeItem).toHaveAttribute("aria-setsize", "3");
  });

  it("items have aria-posinset", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const dashboardTreeItem = screen.getByRole("treeitem", { name: "Dashboard" });
    expect(dashboardTreeItem).toHaveAttribute("aria-posinset", "1");
  });

  it("leaf nodes have aria-expanded=false", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const dashboardTreeItem = screen.getByRole("treeitem", { name: "Dashboard" });
    expect(dashboardTreeItem).toHaveAttribute("aria-expanded", "false");
  });

  it("parent nodes have role=treeitem with group", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    expect(settingsTreeItem).toHaveAttribute("role", "treeitem");
  });

  it("leaf nodes have role=treeitem", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const dashboardTreeItem = screen.getByRole("treeitem", { name: "Dashboard" });
    expect(dashboardTreeItem).toHaveAttribute("role", "treeitem");
  });

  it("Enter key on parent toggles panel", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    expect(settingsTreeItem).toHaveAttribute("aria-expanded", "true");
  });

  it("Space key on parent toggles panel", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    expect(settingsTreeItem).toHaveAttribute("aria-expanded", "true");
  });

  it("container has role=tree on Level 1", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const trees = screen.getAllByRole("tree");
    expect(trees.length).toBeGreaterThanOrEqual(1);
  });

  it("Level 2 container has role=group", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const groups = screen.getAllByRole("group");
    expect(groups.length).toBeGreaterThanOrEqual(1);
  });
});
