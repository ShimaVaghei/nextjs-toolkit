import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { AppLayout } from "./AppLayout";
import { appRoutes } from "../lib/routes";
import type { RoutesSection } from "./AppLayout";

let mockPathname = "/";
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

const mockMatchMedia = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

beforeEach(() => {
  mockMatchMedia(true);
});

afterEach(() => {
  cleanup();
  mockPush.mockClear();
  mockPathname = "/";
});

const routes: RoutesSection[] = [
  {
    routes: [
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
    ],
  },
];

const routesWithLevel3: RoutesSection[] = [
  {
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
      { path: "users", label: "Users" },
    ],
  },
];

const routesWithTwoCollapsibles: RoutesSection[] = [
  {
    routes: [
      {
        path: "settings",
        label: "Settings",
        children: [{ path: "general", label: "General" }],
      },
      {
        path: "projects",
        label: "Projects",
        children: [{ path: "active", label: "Active" }],
      },
    ],
  },
];

const pageContent = <div>Page content</div>;

const openOverlay = () => {
  fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
};

const getOverlay = () => screen.getByRole("dialog", { name: "Navigation" });

const getItem = (name: string) => screen.getByRole("treeitem", { name });

const getItemLi = (name: string) => getItem(name).closest("li") as HTMLElement;

const getDrawerGrid = (name: string) =>
  getItemLi(name).querySelector(".grid") as HTMLElement;

describe("AppLayout", () => {
  it("renders children when routes is empty", () => {
    render(<AppLayout routes={[]}>{pageContent}</AppLayout>);
    expect(screen.getByText("Page content")).toBeInTheDocument();
  });

  it("renders the seeded app routes and expands Table's Drawer inline", () => {
    render(<AppLayout routes={appRoutes}>{pageContent}</AppLayout>);
    expect(screen.getByRole("treeitem", { name: "Home" })).toBeInTheDocument();
    const tableTreeItem = screen.getByRole("treeitem", { name: "Table" });
    fireEvent.click(tableTreeItem);
    expect(tableTreeItem).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("treeitem", { name: "Local" })).toBeInTheDocument();
    expect(screen.getByRole("treeitem", { name: "Server" })).toBeInTheDocument();
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

  it("items are tab-focusable", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    expect(getItem("Dashboard")).toHaveAttribute("tabindex", "0");
  });
});

describe("AppLayout inline Drawers", () => {
  it("collapsible parent starts with aria-expanded=false and no Drawer content", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    expect(getItem("Settings")).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("General")).not.toBeInTheDocument();
  });

  it("clicking a Collapsible route reveals its children directly beneath it", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    const settingsTreeItem = getItem("Settings");
    fireEvent.click(settingsTreeItem);
    expect(settingsTreeItem).toHaveAttribute("aria-expanded", "true");
    const settingsGroup = within(getItemLi("Settings")).getByRole("group");
    expect(within(settingsGroup).getByText("General")).toBeInTheDocument();
    expect(within(settingsGroup).getByText("Advanced")).toBeInTheDocument();
  });

  it("clicking an open Collapsible route closes only its own Drawer", () => {
    render(<AppLayout routes={routesWithTwoCollapsibles}>{pageContent}</AppLayout>);
    const settingsTreeItem = getItem("Settings");
    fireEvent.click(settingsTreeItem);
    const projectsTreeItem = getItem("Projects");
    fireEvent.click(projectsTreeItem);
    expect(within(getItemLi("Projects")).getByText("Active")).toBeInTheDocument();

    fireEvent.click(settingsTreeItem);
    expect(settingsTreeItem).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("General")).not.toBeInTheDocument();
    expect(projectsTreeItem).toHaveAttribute("aria-expanded", "true");
    expect(within(getItemLi("Projects")).getByText("Active")).toBeInTheDocument();
  });

  it("any number of Drawers can be open at once; opening one never closes another", () => {
    render(<AppLayout routes={routesWithTwoCollapsibles}>{pageContent}</AppLayout>);
    fireEvent.click(getItem("Settings"));
    fireEvent.click(getItem("Projects"));
    expect(within(getItemLi("Settings")).getByText("General")).toBeInTheDocument();
    expect(within(getItemLi("Projects")).getByText("Active")).toBeInTheDocument();
    expect(getItem("Settings")).toHaveAttribute("aria-expanded", "true");
    expect(getItem("Projects")).toHaveAttribute("aria-expanded", "true");
  });

  it("nested Level 3 Drawers open recursively under their own parents", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    fireEvent.click(getItem("Settings"));
    const settingsGroup = within(getItemLi("Settings")).getByRole("group");
    const advancedTreeItem = within(settingsGroup).getByRole("treeitem", {
      name: "Advanced",
    });
    fireEvent.click(advancedTreeItem);

    const advancedGroup = within(
      advancedTreeItem.closest("li") as HTMLElement,
    ).getByRole("group");
    expect(within(advancedGroup).getByText("Debug")).toBeInTheDocument();
    expect(within(settingsGroup).getByText("General")).toBeInTheDocument();
    expect(within(settingsGroup).getByText("Advanced")).toBeInTheDocument();
  });

  it("a Collapsible route's chevron rotates while its Drawer is open", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    const svgBefore = getItem("Settings").querySelector("svg");
    expect(svgBefore).not.toHaveClass("rotate-90");
    fireEvent.click(getItem("Settings"));
    expect(getItem("Settings").querySelector("svg")).toHaveClass("rotate-90");
    fireEvent.click(getItem("Settings"));
    expect(getItem("Settings").querySelector("svg")).not.toHaveClass("rotate-90");
  });

  it("a Drawer animates as a vertical-only grid rows reveal", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    const drawer = getDrawerGrid("Settings");
    expect(drawer).toHaveClass("grid-rows-[0fr]");

    fireEvent.click(getItem("Settings"));
    expect(drawer).toHaveClass("grid-rows-[1fr]");
    expect(drawer).toHaveClass("transition-[grid-template-rows]");
    expect(drawer).toHaveClass("duration-300", "ease-in-out");
    expect(drawer).toHaveClass("overflow-hidden");
    expect(drawer).not.toHaveClass(
      "transition-[grid-template-rows,grid-template-columns]",
    );
    expect(drawer).not.toHaveClass("md:grid-cols-[1fr]");

    fireEvent.click(getItem("Settings"));
    expect(drawer).toHaveClass("grid-rows-[0fr]");
    expect(screen.queryByText("General")).not.toBeInTheDocument();
  });
});

describe("AppLayout fixed-width sidebar", () => {
  const getNavColumn = () =>
    screen.getByRole("navigation").parentElement as HTMLElement;

  it("sidebar keeps a constant fixed width with zero Drawers open", () => {
    render(<AppLayout routes={routesWithTwoCollapsibles}>{pageContent}</AppLayout>);
    const navColumn = getNavColumn();
    expect(navColumn).toHaveClass("w-64");
    expect(navColumn).not.toHaveClass("md:max-w-3xl");
  });

  it("sidebar width never changes however many Drawers are open", () => {
    render(<AppLayout routes={routesWithTwoCollapsibles}>{pageContent}</AppLayout>);
    fireEvent.click(getItem("Settings"));
    fireEvent.click(getItem("Projects"));
    const navColumn = getNavColumn();
    expect(navColumn).toHaveClass("w-64");
    expect(navColumn).not.toHaveClass("md:max-w-3xl");
    expect(navColumn).toHaveClass("shrink-0");
    expect(navColumn).not.toHaveClass("fixed");
    expect(navColumn).not.toHaveClass("absolute");
  });

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

  it("content column stays flex-1 so page content never shifts", () => {
    render(<AppLayout routes={routesWithTwoCollapsibles}>{pageContent}</AppLayout>);
    fireEvent.click(getItem("Settings"));
    const contentColumn = screen.getByText("Page content")
      .parentElement as HTMLElement;
    expect(contentColumn).toHaveClass("flex-1");
  });
});

describe("AppLayout active state", () => {
  it("active leaf node has bold styling", () => {
    mockPathname = "/settings/general";
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    fireEvent.click(getItem("Settings"));
    expect(getItem("General")).toHaveClass("font-bold");
  });

  it("ancestor nodes of active leaf have muted opacity", () => {
    mockPathname = "/settings/general";
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    expect(getItem("Settings")).toHaveClass("opacity-60");
  });

  it("non-active nodes do not have bold or muted styling", () => {
    mockPathname = "/dashboard";
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    expect(getItem("Users")).not.toHaveClass("font-bold");
    expect(getItem("Users")).not.toHaveClass("opacity-60");
  });

  it("clicking a leaf node navigates to full path via router", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    fireEvent.click(getItem("Dashboard"));
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });

  it("clicking a nested leaf navigates to concatenated full path", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    fireEvent.click(getItem("Settings"));
    fireEvent.click(getItem("General"));
    expect(mockPush).toHaveBeenCalledWith("/settings/general");
  });

  it("parents and leaves have pointer cursor", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    expect(getItem("Settings")).toHaveClass("cursor-pointer");
    expect(getItem("Dashboard")).toHaveClass("cursor-pointer");
  });
});

describe("AppLayout accessibility", () => {
  it("container has role=tree", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    expect(screen.getByRole("tree")).toBeInTheDocument();
  });

  it("items have role=treeitem", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    const treeItems = screen.getAllByRole("treeitem");
    expect(treeItems.length).toBeGreaterThanOrEqual(3);
    expect(getItem("Dashboard")).toHaveAttribute("role", "treeitem");
    expect(getItem("Settings")).toHaveAttribute("role", "treeitem");
  });

  it("leaf nodes have aria-expanded=false", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    expect(getItem("Dashboard")).toHaveAttribute("aria-expanded", "false");
  });

  it("Level 1 items have aria-level=1", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    expect(getItem("Settings")).toHaveAttribute("aria-level", "1");
  });

  it("Level 2 items have aria-level=2 once their Drawer is open", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    fireEvent.click(getItem("Settings"));
    expect(getItem("General")).toHaveAttribute("aria-level", "2");
  });

  it("Level 3 items have aria-level=3 once their Drawer is open", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    fireEvent.click(getItem("Settings"));
    fireEvent.click(getItem("Advanced"));
    expect(getItem("Debug")).toHaveAttribute("aria-level", "3");
  });

  it("Level 1 items expose sibling counts across the whole top list", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    expect(getItem("Dashboard")).toHaveAttribute("aria-setsize", "3");
    expect(getItem("Dashboard")).toHaveAttribute("aria-posinset", "1");
    expect(getItem("Users")).toHaveAttribute("aria-setsize", "3");
    expect(getItem("Users")).toHaveAttribute("aria-posinset", "3");
  });

  it("sibling counts are computed within each visible Drawer", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    fireEvent.click(getItem("Settings"));
    expect(getItem("General")).toHaveAttribute("aria-setsize", "2");
    expect(getItem("General")).toHaveAttribute("aria-posinset", "1");
    expect(getItem("Advanced")).toHaveAttribute("aria-setsize", "2");
    expect(getItem("Advanced")).toHaveAttribute("aria-posinset", "2");

    fireEvent.click(getItem("Advanced"));
    expect(getItem("Debug")).toHaveAttribute("aria-setsize", "1");
    expect(getItem("Debug")).toHaveAttribute("aria-posinset", "1");
  });

  it("each open Drawer renders a group role nested under its parent item", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    fireEvent.click(getItem("Settings"));
    const settingsGroup = within(getItemLi("Settings")).getByRole("group");
    expect(settingsGroup).toBeInTheDocument();
    fireEvent.click(getItem("Advanced"));
    const advancedGroup = within(getItemLi("Advanced")).getByRole("group");
    expect(advancedGroup).toBeInTheDocument();
  });
});

describe("AppLayout mobile overlay", () => {
  it("renders a mobile-only top bar with a hamburger button", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    const hamburger = screen.getByRole("button", { name: "Open navigation" });
    const topBar = hamburger.parentElement as HTMLElement;
    expect(topBar).toHaveClass("md:hidden");
  });

  it("hamburger opens a fullscreen overlay rendering the same accordion", () => {
    render(<AppLayout routes={routes}>{pageContent}</AppLayout>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    openOverlay();
    const overlay = getOverlay();
    expect(overlay).toHaveClass("fixed", "inset-0");
    expect(
      within(overlay).getByRole("treeitem", { name: "Dashboard" }),
    ).toBeInTheDocument();
    expect(
      within(overlay).getByRole("treeitem", { name: "Settings" }),
    ).toBeInTheDocument();
    expect(
      within(overlay).getByRole("treeitem", { name: "Users" }),
    ).toBeInTheDocument();
  });

  it("clicking a Collapsible route inside the overlay reveals its children inline, identically to desktop", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    openOverlay();
    const overlay = getOverlay();
    const settingsTreeItem = within(overlay).getByRole("treeitem", {
      name: "Settings",
    });
    fireEvent.click(settingsTreeItem);
    expect(settingsTreeItem).toHaveAttribute("aria-expanded", "true");
    expect(within(overlay).getByText("General")).toBeInTheDocument();
    expect(within(overlay).getByText("Advanced")).toBeInTheDocument();
    const drawer = (within(overlay).getByRole("treeitem", { name: "Settings" })
      .closest("li") as HTMLElement).querySelector(".grid") as HTMLElement;
    expect(drawer).toHaveClass("grid-rows-[1fr]");
  });

  it("overlay header shows title and close button only — never a Back icon", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    openOverlay();
    const overlay = getOverlay();
    expect(within(overlay).getByText("Navigation")).toBeInTheDocument();
    fireEvent.click(
      within(overlay).getByRole("treeitem", { name: "Settings" }),
    );
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Advanced" }));
    expect(
      within(overlay).queryByRole("button", { name: "Back" }),
    ).not.toBeInTheDocument();
    expect(within(overlay).getByText("Navigation")).toBeInTheDocument();
    expect(
      within(overlay).getByRole("button", { name: "Close navigation" }),
    ).toBeInTheDocument();
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

  it("tapping a Leaf node in the overlay navigates and dismisses it", () => {
    render(<AppLayout routes={routesWithLevel3}>{pageContent}</AppLayout>);
    openOverlay();
    const overlay = getOverlay();
    fireEvent.click(
      within(overlay).getByRole("treeitem", { name: "Settings" }),
    );
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "General" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith("/settings/general");
    expect(document.body.style.overflow).toBe("");
  });
});

describe("AppLayout legacy collapse triggers", () => {
  it("navigating to a Leaf node collapses every Drawer", () => {
    render(<AppLayout routes={routesWithTwoCollapsibles}>{pageContent}</AppLayout>);
    fireEvent.click(getItem("Settings"));
    fireEvent.click(getItem("Projects"));
    fireEvent.click(getItem("General"));

    expect(mockPush).toHaveBeenCalledWith("/settings/general");
    expect(screen.queryByText("General")).not.toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(getItem("Settings")).toHaveAttribute("aria-expanded", "false");
    expect(getItem("Projects")).toHaveAttribute("aria-expanded", "false");
  });

  it("clicking the page content collapses every Drawer on desktop", () => {
    render(<AppLayout routes={routesWithTwoCollapsibles}>{pageContent}</AppLayout>);
    fireEvent.click(getItem("Settings"));
    fireEvent.click(getItem("Projects"));
    fireEvent.click(screen.getByText("Page content"));

    expect(screen.queryByText("General")).not.toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
    expect(getItem("Settings")).toHaveAttribute("aria-expanded", "false");
  });

  it("clicking the page content on a mobile viewport does not collapse Drawers", () => {
    mockMatchMedia(false);
    render(<AppLayout routes={routesWithTwoCollapsibles}>{pageContent}</AppLayout>);
    fireEvent.click(getItem("Settings"));
    fireEvent.click(screen.getByText("Page content"));
    expect(screen.getByText("General")).toBeInTheDocument();
  });

  it("clicking the page content when every Drawer is closed is a no-op", () => {
    render(<AppLayout routes={routesWithTwoCollapsibles}>{pageContent}</AppLayout>);
    fireEvent.click(screen.getByText("Page content"));
    expect(getItem("Settings")).toHaveAttribute("aria-expanded", "false");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("closing the Mobile overlay collapses every Drawer; reopening shows none open", () => {
    render(<AppLayout routes={routesWithTwoCollapsibles}>{pageContent}</AppLayout>);
    openOverlay();
    let overlay = getOverlay();
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Settings" }));
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Projects" }));
    expect(within(overlay).getByText("General")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    openOverlay();
    overlay = getOverlay();
    expect(within(overlay).queryByText("General")).not.toBeInTheDocument();
    expect(within(overlay).queryByText("Active")).not.toBeInTheDocument();
    expect(
      within(overlay).getByRole("treeitem", { name: "Settings" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("closing the Mobile overlay via Escape collapses every Drawer", () => {
    render(<AppLayout routes={routesWithTwoCollapsibles}>{pageContent}</AppLayout>);
    openOverlay();
    const overlay = getOverlay();
    fireEvent.click(within(overlay).getByRole("treeitem", { name: "Settings" }));
    expect(within(overlay).getByText("General")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    openOverlay();
    const reopened = getOverlay();
    expect(within(reopened).queryByText("General")).not.toBeInTheDocument();
    expect(
      within(reopened).getByRole("treeitem", { name: "Settings" }),
    ).toHaveAttribute("aria-expanded", "false");
  });
});
