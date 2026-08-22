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

function RoutePanel({
  routes,
  basePath,
  activeRoute,
  onChildToggle,
  expandedChildIndex,
  onLeafNavigate,
  level,
}: {
  routes: Route[];
  basePath: string;
  activeRoute: ActiveRouteResult;
  onChildToggle?: (childIndex: number) => void;
  expandedChildIndex?: number | null;
  onLeafNavigate: (fullPath: string) => void;
  level: number;
}) {
  return (
    <ul className="space-y-1 p-4" role="group">
      {routes.map((route, childIndex) => {
        const fullPath = `${basePath}/${route.path}`;
        const isLeaf = activeRoute.leaf === route.path;
        const isAncestor = activeRoute.ancestors.has(route.path);
        const isActive = isLeaf || isAncestor;
        const hasChildren = route.children && route.children.length > 0;

        if (hasChildren && onChildToggle) {
          return (
            <li key={route.path}>
              <button
                type="button"
                onClick={() => onChildToggle(childIndex)}
                aria-expanded={expandedChildIndex === childIndex}
                aria-level={level}
                aria-setsize={routes.length}
                aria-posinset={childIndex + 1}
                role="treeitem"
                tabIndex={0}
                className={`flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                  isAncestor
                    ? "opacity-60 text-neutral-900 dark:text-neutral-100"
                    : isActive
                      ? "text-neutral-900 dark:text-neutral-100"
                      : "text-neutral-600 dark:text-neutral-400"
                }`}
              >
                <span>{route.label}</span>
                <svg
                  className={`h-4 w-4 text-neutral-400 transition-transform ${
                    expandedChildIndex === childIndex ? "rotate-90" : ""
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
              </button>
            </li>
          );
        }

        return (
          <li key={route.path}>
            <a
              href={fullPath}
              onClick={(e) => {
                e.preventDefault();
                onLeafNavigate(fullPath);
              }}
              aria-expanded={false}
              aria-level={level}
              aria-setsize={routes.length}
              aria-posinset={childIndex + 1}
              role="treeitem"
              tabIndex={0}
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
      })}
    </ul>
  );
}

type ExpandedPanels = {
  level1: number | null;
  level2: number | null;
  level3Visible: boolean;
};

const COLLAPSED_PANELS: ExpandedPanels = {
  level1: null,
  level2: null,
  level3Visible: false,
};

function panelGridClasses(expanded: boolean, hiddenOnMobile = false): string {
  return [
    "grid",
    "overflow-hidden",
    "transition-[grid-template-rows,grid-template-columns]",
    "duration-300",
    "ease-in-out",
    "w-full",
    "md:w-auto",
    ...(hiddenOnMobile ? ["hidden md:grid"] : []),
    expanded
      ? "grid-rows-[1fr] md:grid-cols-[1fr]"
      : "grid-rows-[0fr] md:grid-cols-[0fr]",
  ].join(" ");
}

function NavigationPanels({
  routes,
  activeRoute,
  expandedPanels,
  onToggle,
  onChildToggle,
  onLeafNavigate,
}: {
  routes: Route[];
  activeRoute: ActiveRouteResult;
  expandedPanels: ExpandedPanels;
  onToggle: (index: number) => void;
  onChildToggle: (childIndex: number) => void;
  onLeafNavigate: (fullPath: string) => void;
}) {
  const expandedRoute =
    expandedPanels.level1 !== null ? routes[expandedPanels.level1] : null;
  const expandedChild =
    expandedPanels.level2 !== null &&
    expandedPanels.level3Visible &&
    expandedRoute?.children
      ? expandedRoute.children[expandedPanels.level2]
      : null;

  return (
    <>
      <nav
        className={`shrink-0 w-full md:w-auto ${
          expandedRoute && expandedRoute.children
            ? "hidden md:block"
            : "block md:block"
        }`}
      >
        <ul className="space-y-1 p-4" role="tree">
          {routes.map((route, index) => {
            const hasChildren = route.children && route.children.length > 0;
            const isLeaf = activeRoute.leaf === route.path;
            const isAncestor = activeRoute.ancestors.has(route.path);
            const isActive = isLeaf || isAncestor;

            if (hasChildren) {
              return (
                <li key={route.path}>
                  <button
                    type="button"
                    onClick={() => onToggle(index)}
                    aria-expanded={expandedPanels.level1 === index}
                    aria-level={1}
                    aria-setsize={routes.length}
                    aria-posinset={index + 1}
                    role="treeitem"
                    tabIndex={0}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                      isAncestor
                        ? "opacity-60 text-neutral-900 dark:text-neutral-100"
                        : isActive
                          ? "text-neutral-900 dark:text-neutral-100"
                          : "text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    <span>{route.label}</span>
                    <svg
                      className={`h-4 w-4 text-neutral-400 transition-transform ${
                        expandedPanels.level1 === index ? "rotate-90" : ""
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
                  </button>
                </li>
              );
            }

            return (
              <li key={route.path}>
                <a
                  href={`/${route.path}`}
                  onClick={(e) => {
                    e.preventDefault();
                    onLeafNavigate(`/${route.path}`);
                  }}
                  aria-expanded={false}
                  aria-level={1}
                  aria-setsize={routes.length}
                  aria-posinset={index + 1}
                  role="treeitem"
                  tabIndex={0}
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
          })}
        </ul>
      </nav>

      <div
        className={panelGridClasses(
          Boolean(expandedRoute && expandedRoute.children),
          Boolean(expandedChild && expandedChild.children),
        )}
      >
        <div className="shrink-0 overflow-hidden border-l border-neutral-200 dark:border-neutral-700 h-full md:w-max">
          {expandedRoute && expandedRoute.children && (
            <RoutePanel
              routes={expandedRoute.children}
              basePath={`/${expandedRoute.path}`}
              activeRoute={activeRoute}
              onChildToggle={onChildToggle}
              expandedChildIndex={expandedPanels.level2}
              onLeafNavigate={onLeafNavigate}
              level={2}
            />
          )}
        </div>
      </div>

      <div
        className={panelGridClasses(
          Boolean(expandedChild && expandedChild.children),
        )}
      >
        <div className="shrink-0 overflow-hidden border-l border-neutral-200 dark:border-neutral-700 md:w-max">
          {expandedChild && expandedChild.children && (
            <RoutePanel
              routes={expandedChild.children}
              basePath={`/${expandedRoute!.path}/${expandedChild.path}`}
              activeRoute={activeRoute}
              onLeafNavigate={onLeafNavigate}
              level={3}
            />
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Computes the active leaf node and its ancestor paths based on the current pathname.
 *
 * @param pathname - The current URL pathname (e.g., "/dashboard/settings")
 * @param routes - The sectioned route tree to match against; sections are transparent
 * @returns An object with the matched leaf path and a Set of ancestor paths
 */
export function computeActiveRoute(
  pathname: string,
  routes: RoutesSection[],
): ActiveRouteResult {
  const segments = pathname.split("/").filter(Boolean);
  const ancestors = new Set<string>();
  let leaf: string | null = null;

  function walk(routes: Route[], depth: number): boolean {
    for (const route of routes) {
      if (route.path === segments[depth]) {
        if (route.children && route.children.length > 0) {
          if (walk(route.children, depth + 1)) {
            ancestors.add(route.path);
            return true;
          }
        }

        if (depth === segments.length - 1) {
          leaf = route.path;
          return true;
        }
      }
    }
    return false;
  }

  for (const section of routes) {
    if (walk(section.routes, 0)) break;
  }
  return { leaf, ancestors };
}

const MD_MEDIA_QUERY = "(min-width: 768px)";

function isDesktopViewport(): boolean {
  return window.matchMedia(MD_MEDIA_QUERY).matches;
}

export function AppLayout({
  routes,
  children,
}: {
  routes: RoutesSection[];
  children: ReactNode;
}) {
  const allRoutes = routes.flatMap((section) => section.routes);
  const [expandedPanels, setExpandedPanels] = useState<ExpandedPanels>(
    COLLAPSED_PANELS,
  );
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const activeRoute = computeActiveRoute(pathname, routes);

  const handleCloseOverlay = useCallback(() => {
    setExpandedPanels(COLLAPSED_PANELS);
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

  const handleToggle = (index: number) => {
    setExpandedPanels((prev) => ({
      level1: prev.level1 === index ? null : index,
      level2: null,
      level3Visible: false,
    }));
  };

  const handleChildToggle = (childIndex: number) => {
    setExpandedPanels((prev) => {
      if (prev.level2 === childIndex) {
        if (prev.level3Visible) {
          return { ...prev, level3Visible: false };
        }
        return { ...prev, level2: null, level3Visible: false };
      }
      return { ...prev, level2: childIndex, level3Visible: true };
    });
  };

  const handleLeafNavigate = (fullPath: string) => {
    router.push(fullPath);
    handleCloseOverlay();
  };

  const handleBack = useCallback(() => {
    setExpandedPanels((prev) => {
      if (prev.level1 === null) return prev;
      if (prev.level2 !== null && prev.level3Visible) {
        return { ...prev, level3Visible: false };
      }
      return COLLAPSED_PANELS;
    });
  }, []);

  const handleContentClick = () => {
    if (isOverlayOpen) return;
    if (!isDesktopViewport()) return;
    if (expandedPanels.level1 === null) return;
    setExpandedPanels(COLLAPSED_PANELS);
  };

  if (allRoutes.length === 0) {
    return <div>{children}</div>;
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-700 dark:bg-sidebar md:hidden">
        <button
          type="button"
          aria-label="Open navigation"
          aria-expanded={isOverlayOpen}
          aria-controls="mobile-navigation"
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

      <div className="hidden md:flex shrink-0 max-w-full md:max-w-3xl overflow-y-auto overflow-x-hidden md:sticky md:top-0 md:max-h-screen md:self-start bg-sidebar min-h-screen">
        <NavigationPanels
          routes={allRoutes}
          activeRoute={activeRoute}
          expandedPanels={expandedPanels}
          onToggle={handleToggle}
          onChildToggle={handleChildToggle}
          onLeafNavigate={handleLeafNavigate}
        />
      </div>

      <div className="flex-1 p-4" onClick={handleContentClick}>
        {children}
      </div>

      {isOverlayOpen && (
        <div
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white dark:bg-neutral-950"
        >
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700 dark:bg-sidebar">
            {expandedPanels.level1 === null ? (
              <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Navigation
              </span>
            ) : (
              <button
                type="button"
                aria-label="Back"
                onClick={handleBack}
                className="rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            <button
              type="button"
              aria-label="Close navigation"
              onClick={handleCloseOverlay}
              className="rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            >
              <svg
                className="h-5 w-5"
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
          <div className="flex flex-1 overflow-x-hidden bg-sidebar">
            <NavigationPanels
              routes={allRoutes}
              activeRoute={activeRoute}
              expandedPanels={expandedPanels}
              onToggle={handleToggle}
              onChildToggle={handleChildToggle}
              onLeafNavigate={handleLeafNavigate}
            />
          </div>
        </div>
      )}
    </div>
  );
}
