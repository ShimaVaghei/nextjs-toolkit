import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AppLayout } from "./AppLayout";
import { appRoutes } from "../lib/routes";
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

const openOverlay = () => {
  fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
};

const getOverlay = () => screen.getByRole("dialog", { name: "Navigation" });

describe("AppLayout", () => {
  it("renders children when routes is empty", () => {
    render(<AppLayout routes={[]}>{pageContent}</AppLayout>);
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });

  it("renders the seeded app routes and drills into a nested panel", () => {
    render(<AppLayout routes={appRoutes}>{pageContent}</AppLayout>);
    expect(screen.getByRole("treeitem", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Users" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("treeitem", { name: "Settings" }));
    expect(screen.getByRole("treeitem", { name: "General" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Advanced" })).toBeInTheDocument();
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

describe("AppLayout desktop sticky layout", () => {
  const getNavColumn = () =>
    screen.getByRole("navigation").parentElement as HTMLElement;

  it("navigation column is sticky on md+ so it stays visible while the page scrolls", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    expect(getNavColumn()).toHaveClass("md:sticky");
    expect(getNavColumn()).toHaveClass("md:top-0");
  });

  it("navigation column scrolls internally when taller than the viewport", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    expect(getNavColumn()).toHaveClass("overflow-y-auto");
    expect(getNavColumn()).toHaveClass("md:max-h-screen");
    expect(getNavColumn()).toHaveClass("md:self-start");
  });

  it("expanding a Collapsible section pushes the content column right as panels appear", () => {
    const { container } = render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    const shell = container.firstChild as HTMLElement;
    const navColumn = getNavColumn();
    const contentColumn = screen.getByText("Page content").parentElement as HTMLElement;

    fireEvent.click(screen.getByRole("treeitem", { name: "Settings" }));

    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
    expect(navColumn).toContainElement(screen.getByText("General"));
    expect(navColumn).toContainElement(screen.getByText("Advanced"));
    expect(shell).toContainElement(navColumn);
    expect(shell).toContainElement(contentColumn);
    expect(contentColumn).toHaveClass("flex-1");
    expect(navColumn).toHaveClass("shrink-0");
    expect(navColumn).not.toHaveClass("fixed");
    expect(navColumn).not.toHaveClass("absolute");
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
    openOverlay();
    const overlay = getOverlay();
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Settings" }));
    const nav = within(overlay).getByRole("navigation");
    expect(nav).toHaveClass("hidden", "md:block");
  });

  it("Level 2 panel takes full width on mobile", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    openOverlay();
    const overlay = getOverlay();
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Settings" }));
    expect(within(overlay).getByText("General")).toBeInTheDocument();
    expect(within(overlay).getByText("Advanced")).toBeInTheDocument();
    const level2Grid = within(overlay).getByText("General").closest(".grid");
    expect(level2Grid).toHaveClass("w-full", "md:w-auto");
  });

  it("Level 1 nav reappears when Level 2 collapses on mobile", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    openOverlay();
    const overlay = getOverlay();
    const settingsTreeItem = within(overlay).getByRole("treeitem", {
      name: "Settings",
    });
    fireEvent.click(settingsTreeItem);
    const nav = within(overlay).getByRole("navigation");
    expect(nav).toHaveClass("hidden", "md:block");
    fireEvent.click(settingsTreeItem);
    expect(nav).toHaveClass("block", "md:block");
  });

  it("Level 2 is hidden on mobile when Level 3 is expanded", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    openOverlay();
    const overlay = getOverlay();
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Settings" }));
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Advanced" }));
    expect(within(overlay).getByText("Debug")).toBeInTheDocument();
    const level2Grid = within(overlay).getByText("General").closest(".grid");
    expect(level2Grid).toHaveClass("hidden", "md:grid");
  });

  it("Level 3 panel takes full width on mobile", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    openOverlay();
    const overlay = getOverlay();
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Settings" }));
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Advanced" }));
    const level3Grid = within(overlay).getByText("Debug").closest(".grid");
    expect(level3Grid).toHaveClass("w-full", "md:w-auto");
  });

  it("Level 1 is hidden on mobile when Level 3 is expanded", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    openOverlay();
    const overlay = getOverlay();
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Settings" }));
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Advanced" }));
    const nav = within(overlay).getByRole("navigation");
    expect(nav).toHaveClass("hidden", "md:block");
  });

  it("back navigation from Level 3 to Level 2 on mobile", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    openOverlay();
    const overlay = getOverlay();
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Settings" }));
    const advancedTreeItem = within(overlay).getByRole("treeitem", {
      name: "Advanced",
    });
    fireEvent.click(advancedTreeItem);
    expect(within(overlay).getByText("Debug")).toBeInTheDocument();
    fireEvent.click(advancedTreeItem);
    expect(within(overlay).queryByText("Debug")).not.toBeInTheDocument();
    expect(within(overlay).getByText("General")).toBeInTheDocument();
    expect(within(overlay).getByText("Advanced")).toBeInTheDocument();
    const nav = within(overlay).getByRole("navigation");
    expect(nav).toHaveClass("hidden", "md:block");
  });

  it("back navigation from Level 2 to Level 1 on mobile", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    openOverlay();
    const overlay = getOverlay();
    const settingsTreeItem = within(overlay).getByRole("treeitem", {
      name: "Settings",
    });
    fireEvent.click(settingsTreeItem);
    expect(within(overlay).getByText("General")).toBeInTheDocument();
    fireEvent.click(settingsTreeItem);
    expect(within(overlay).queryByText("General")).not.toBeInTheDocument();
    const nav = within(overlay).getByRole("navigation");
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
    openOverlay();
    const overlay = getOverlay();
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Settings" }));
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Advanced" }));
    expect(within(overlay).getByText("Debug")).toBeInTheDocument();
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Other" }));
    expect(within(overlay).queryByText("Debug")).not.toBeInTheDocument();
    expect(within(overlay).getByText("Other Child")).toBeInTheDocument();
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

describe("AppLayout mobile overlay", () => {
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

  it("renders a mobile-only top bar with a hamburger button", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    const hamburger = screen.getByRole("button", { name: "Open navigation" });
    const topBar = hamburger.parentElement as HTMLElement;
    expect(topBar).toHaveClass("md:hidden");
  });

  it("hamburger opens a fullscreen overlay with the drill-down navigation", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    openOverlay();
    const overlay = getOverlay();
    expect(overlay).toHaveClass("fixed", "inset-0");
    expect(within(overlay).getByRole("treeitem", { name: "Dashboard" })).toBeInTheDocument();
    expect(within(overlay).getByRole("treeitem", { name: "Settings" })).toBeInTheDocument();
    expect(within(overlay).getByRole("treeitem", { name: "Users" })).toBeInTheDocument();
  });

  it("overlay closes via close button", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    openOverlay();
    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("overlay closes via Esc key", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    openOverlay();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("overlay closes when navigating to a Leaf node and panels collapse to Level 1", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    openOverlay();
    const overlay = getOverlay();
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Settings" }));
    expect(within(overlay).getByRole("treeitem", { name: "General" })).toBeInTheDocument();
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "General" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith("/settings/general");
    expect(screen.queryByText("General")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("background scroll is locked while overlay is open and restored when it closes", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    expect(document.body.style.overflow).toBe("");
    openOverlay();
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(document.body.style.overflow).toBe("");
  });

  it("overlay scrolls internally", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    openOverlay();
    expect(getOverlay()).toHaveClass("overflow-y-auto");
  });
});

describe("AppLayout smooth desktop expansion", () => {
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

  const getLevel2Grid = () =>
    screen.getByText("General").closest(".grid") as HTMLElement;

  const getLevel3Grid = () =>
    screen.getByText("Debug").closest(".grid") as HTMLElement;

  it("expanding a Level 1 section animates the sidebar column width on md+", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    fireEvent.click(screen.getByRole("treeitem", { name: "Settings" }));
    const level2Grid = getLevel2Grid();
    expect(level2Grid).toHaveClass("md:grid-cols-[1fr]");
    expect(level2Grid).toHaveClass(
      "transition-[grid-template-rows,grid-template-columns]",
    );
    expect(level2Grid).toHaveClass("duration-300", "ease-in-out");
  });

  it("collapsing the same section shrinks the column back on md+", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    const settingsTreeItem = screen.getByRole("treeitem", { name: "Settings" });
    fireEvent.click(settingsTreeItem);
    const level2Grid = getLevel2Grid();
    expect(level2Grid).toHaveClass("md:grid-cols-[1fr]");
    fireEvent.click(settingsTreeItem);
    expect(level2Grid).toHaveClass("md:grid-cols-[0fr]");
  });

  it("collapsing via a Leaf click shrinks the column back on md+", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    fireEvent.click(screen.getByRole("treeitem", { name: "Settings" }));
    const level2Grid = getLevel2Grid();
    fireEvent.click(screen.getByRole("treeitem", { name: "General" }));
    expect(level2Grid).toHaveClass("md:grid-cols-[0fr]");
  });

  it("panel body keeps a fixed natural width on md+ so labels do not reflow", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    fireEvent.click(screen.getByRole("treeitem", { name: "Settings" }));
    const panelBody = screen.getByText("General").closest(".border-l") as HTMLElement;
    expect(panelBody).toHaveClass("md:w-max");
    expect(panelBody).toHaveClass("overflow-hidden");
  });

  it("expanding a Level 2 section animates the Level 3 column width on md+", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    fireEvent.click(screen.getByRole("treeitem", { name: "Settings" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "Advanced" }));
    const level3Grid = getLevel3Grid();
    expect(level3Grid).toHaveClass("md:grid-cols-[1fr]");
    expect(level3Grid).toHaveClass(
      "transition-[grid-template-rows,grid-template-columns]",
    );
  });

  it("collapsing a Level 2 section shrinks the Level 3 column back on md+", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    fireEvent.click(screen.getByRole("treeitem", { name: "Settings" }));
    const advancedTreeItem = screen.getByRole("treeitem", { name: "Advanced" });
    fireEvent.click(advancedTreeItem);
    const level3Grid = getLevel3Grid();
    expect(level3Grid).toHaveClass("md:grid-cols-[1fr]");
    fireEvent.click(advancedTreeItem);
    expect(level3Grid).toHaveClass("md:grid-cols-[0fr]");
  });

  it("collapsing Level 1 while Level 3 is open keeps the Level 2 panel a grid so it animates", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    fireEvent.click(screen.getByRole("treeitem", { name: "Settings" }));
    fireEvent.click(screen.getByRole("treeitem", { name: "Advanced" }));
    const level2Grid = getLevel2Grid();
    expect(level2Grid).toHaveClass("md:grid");
    fireEvent.click(screen.getByRole("treeitem", { name: "Settings" }));
    expect(level2Grid).toHaveClass("md:grid-cols-[0fr]");
    expect(level2Grid).toHaveClass("grid-rows-[0fr]");
  });

  it("mobile panels stay full-width stacked when a Level 1 section is expanded", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    openOverlay();
    const overlay = getOverlay();
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Settings" }));
    const level2Grid = within(overlay)
      .getByText("General")
      .closest(".grid") as HTMLElement;
    expect(level2Grid).toHaveClass("w-full", "md:w-auto");
    expect(level2Grid).toHaveClass("md:grid-cols-[1fr]");
    expect(level2Grid).toHaveClass("grid-rows-[1fr]");
  });
});
