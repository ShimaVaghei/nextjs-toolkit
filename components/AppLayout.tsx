"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

export type Route = {
  path: string;
  label: string;
  children?: Route[];
};

export type RoutesSection = {
  label?: string;
  routes: Route[];
};

export type ActiveRouteResult = {
  leaf: string | null;
  ancestors: Set<string>;
};

function buildNodePath(basePath: string, segment: string): string {
  return `${basePath}/${segment}`;
}

function drawerGridClasses(open: boolean): string {
  return [
    "grid",
    "overflow-hidden",
    "transition-[grid-template-rows]",
    "duration-300",
    "ease-in-out",
    open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
  ].join(" ");
}

const MOBILE_NAVIGATION_ID = "mobile-navigation";

type RouteTreeSharedProps = {
  activeRoute: ActiveRouteResult;
  expandedDrawers: ReadonlySet<string>;
  onToggleDrawer: (nodePath: string) => void;
  onLeafNavigate: (nodePath: string) => void;
};

function treeItemAria(
  level: number,
  setSize: number,
  posInset: number,
  expanded: boolean,
): {
  role: "treeitem";
  tabIndex: number;
  "aria-expanded": boolean;
  "aria-level": number;
  "aria-setsize": number;
  "aria-posinset": number;
} {
  return {
    role: "treeitem",
    tabIndex: 0,
    "aria-expanded": expanded,
    "aria-level": level,
    "aria-setsize": setSize,
    "aria-posinset": posInset,
  };
}

function RouteTree({
  routes,
  basePath,
  level,
  activeRoute,
  expandedDrawers,
  onToggleDrawer,
  onLeafNavigate,
}: RouteTreeSharedProps & {
  routes: Route[];
  basePath: string;
  level: number;
}) {
  return (
    <ul
      className={`space-y-1 ${level === 1 ? "p-4" : "ml-4"}`}
      role={level === 1 ? "tree" : "group"}
    >
      {routes.map((route, index) => {
        const nodePath = buildNodePath(basePath, route.path);
        const isLeaf = activeRoute.leaf === nodePath;
        const isAncestor = activeRoute.ancestors.has(nodePath);
        const isActive = isLeaf || isAncestor;

        if (!route.children || route.children.length === 0) {
          return (
            <li key={route.path}>
              <a
                href={nodePath}
                onClick={(e) => {
                  e.preventDefault();
                  onLeafNavigate(nodePath);
                }}
                {...treeItemAria(level, routes.length, index + 1, false)}
                className={`block cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                  isLeaf
                    ? "font-bold text-neutral-900 dark:text-neutral-100"
                    : isActive
                      ? "text-neutral-900 dark:text-neutral-100"
                      : "text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {route.label}
              </a>
            </li>
          );
        }

        const isOpen = expandedDrawers.has(nodePath);

        return (
          <li key={route.path}>
            <button
              type="button"
              onClick={() => onToggleDrawer(nodePath)}
              {...treeItemAria(level, routes.length, index + 1, isOpen)}
              className={`flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                isAncestor
                  ? "opacity-60 text-neutral-900 dark:text-neutral-100"
                  : isActive
                    ? "text-neutral-900 dark:text-neutral-100"
                    : "text-neutral-600 dark:text-neutral-400"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {route.label}
                <svg
                  className={`h-4 w-4 shrink-0 text-neutral-300 transition-transform dark:text-neutral-400 ${
                    isOpen ? "rotate-90" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </span>
            </button>
            <div className={drawerGridClasses(isOpen)}>
              <div className="overflow-hidden">
                {isOpen && (
                  <RouteTree
                    routes={route.children}
                    basePath={nodePath}
                    activeRoute={activeRoute}
                    expandedDrawers={expandedDrawers}
                    onToggleDrawer={onToggleDrawer}
                    onLeafNavigate={onLeafNavigate}
                    level={level + 1}
                  />
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Computes the active leaf node path and its ancestor node paths based on the current pathname.
 *
 * @param pathname - The current URL pathname (e.g., "/dashboard/settings")
 * @param routes - The sectioned route tree to match against; sections are transparent
 * @returns An object with the matched leaf node path and a Set of ancestor node paths
 */
export function computeActiveRoute(
  pathname: string,
  routes: RoutesSection[],
): ActiveRouteResult {
  const segments = pathname.split("/").filter(Boolean);
  const ancestors = new Set<string>();
  let leaf: string | null = null;

  function walk(routes: Route[], level: number, basePath: string): boolean {
    for (const route of routes) {
      if (route.path === segments[level]) {
        const nodePath = buildNodePath(basePath, route.path);
        if (route.children && route.children.length > 0) {
          if (walk(route.children, level + 1, nodePath)) {
            ancestors.add(nodePath);
            return true;
          }
        }

        if (level === segments.length - 1) {
          leaf = nodePath;
          return true;
        }
      }
    }
    return false;
  }

  for (const section of routes) {
    if (walk(section.routes, 0, "")) break;
  }
  return { leaf, ancestors };
}

function isEmptySection(section: RoutesSection): boolean {
  return section.routes.length === 0;
}

function SidebarNav({
  routes,
  activeRoute,
  expandedDrawers,
  onToggleDrawer,
  onLeafNavigate,
}: RouteTreeSharedProps & { routes: RoutesSection[] }) {
  return (
    <nav className="w-full">
      {routes.map((section, index) => {
        if (isEmptySection(section)) return null;
        return (
          <div key={index}>
            {section.label && (
              <span className="block pb-1 pl-7 pr-4 pt-4 text-xs font-semibold text-neutral-400 select-none dark:text-neutral-500">
                {section.label}
              </span>
            )}
            <RouteTree
              routes={section.routes}
              basePath=""
              activeRoute={activeRoute}
              expandedDrawers={expandedDrawers}
              onToggleDrawer={onToggleDrawer}
              onLeafNavigate={onLeafNavigate}
              level={1}
            />
          </div>
        );
      })}
    </nav>
  );
}

export function AppLayout({
  routes,
  children,
}: {
  routes: RoutesSection[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeRoute = computeActiveRoute(pathname, routes);

  const [expandedDrawers, setExpandedDrawers] = useState<ReadonlySet<string>>(
    () => new Set(activeRoute.ancestors),
  );
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const handleToggleDrawer = useCallback((nodePath: string) => {
    setExpandedDrawers((prev) => {
      const next = new Set(prev);
      if (next.has(nodePath)) {
        next.delete(nodePath);
      } else {
        next.add(nodePath);
      }
      return next;
    });
  }, []);

  const handleCloseOverlay = useCallback(() => {
    setIsOverlayOpen(false);
  }, []);

  useEffect(() => {
    if (!isOverlayOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCloseOverlay();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOverlayOpen, handleCloseOverlay]);

  useEffect(() => {
    if (!isOverlayOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOverlayOpen]);

  const handleLeafNavigate = useCallback(
    (nodePath: string) => {
      router.push(nodePath);
      handleCloseOverlay();
    },
    [router, handleCloseOverlay],
  );

  if (routes.every(isEmptySection)) {
    return <div>{children}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-sidebar md:hidden">
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={isOverlayOpen}
          aria-controls={MOBILE_NAVIGATION_ID}
          onClick={() => setIsOverlayOpen(true)}
          className="rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      <div className="hidden md:flex w-64 shrink-0 overflow-y-auto bg-sidebar md:sticky md:top-0 md:max-h-screen md:self-start min-h-screen">
        <SidebarNav
          routes={routes}
          activeRoute={activeRoute}
          expandedDrawers={expandedDrawers}
          onToggleDrawer={handleToggleDrawer}
          onLeafNavigate={handleLeafNavigate}
        />
      </div>

      <div className="flex-1 p-4">{children}</div>

      {isOverlayOpen && (
        <div
          id={MOBILE_NAVIGATION_ID}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white dark:bg-neutral-950"
        >
          <div className="flex items-center border-b border-neutral-200 px-4 py-3 dark:border-neutral-700 dark:bg-sidebar">
            <button
              type="button"
              aria-label="Close navigation"
              aria-controls={MOBILE_NAVIGATION_ID}
              aria-expanded="true"
              onClick={handleCloseOverlay}
              className="rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1 bg-sidebar">
            <SidebarNav
              routes={routes}
              activeRoute={activeRoute}
              expandedDrawers={expandedDrawers}
              onToggleDrawer={handleToggleDrawer}
              onLeafNavigate={handleLeafNavigate}
            />
          </div>
        </div>
      )}
    </div>
  );
}
