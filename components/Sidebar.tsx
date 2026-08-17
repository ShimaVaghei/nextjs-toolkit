"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export type Route = {
  path: string;
  label: string;
  children?: Route[];
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
}: {
  routes: Route[];
  basePath: string;
  activeRoute: ActiveRouteResult;
  onChildToggle?: (childIndex: number) => void;
  expandedChildIndex?: number | null;
  onLeafNavigate: (fullPath: string) => void;
}) {
  return (
    <ul className="space-y-1">
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

/**
 * Computes the active leaf node and its ancestor paths based on the current pathname.
 *
 * @param pathname - The current URL pathname (e.g., "/dashboard/settings")
 * @param routes - The route tree to match against
 * @returns An object with the matched leaf path and a Set of ancestor paths
 */
export function computeActiveRoute(
  pathname: string,
  routes: Route[],
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

  walk(routes, 0);
  return { leaf, ancestors };
}

export function Sidebar({ routes }: { routes: Route[] }) {
  const [expandedPanels, setExpandedPanels] = useState<{
    level1: number | null;
    level2: number | null;
    level3Visible: boolean;
  }>({ level1: null, level2: null, level3Visible: false });
  const pathname = usePathname();
  const router = useRouter();
  const activeRoute = computeActiveRoute(pathname, routes);

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

  const handleNavigate = () => {
    setExpandedPanels({ level1: null, level2: null, level3Visible: false });
  };

  const handleLeafNavigate = (fullPath: string) => {
    router.push(fullPath);
    handleNavigate();
  };

  if (routes.length === 0) {
    return null;
  }

  const expandedRoute = expandedPanels.level1 !== null ? routes[expandedPanels.level1] : null;
  const expandedChild =
    expandedPanels.level2 !== null &&
    expandedPanels.level3Visible &&
    expandedRoute?.children
      ? expandedRoute.children[expandedPanels.level2]
      : null;

  return (
    <div className="flex h-full max-w-[48rem] overflow-y-auto">
      <nav className={`shrink-0 w-full md:w-64 ${expandedRoute && expandedRoute.children ? "hidden md:block" : "block md:block"}`}>
        <ul className="space-y-1">
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
                    onClick={() => handleToggle(index)}
                    aria-expanded={expandedPanels.level1 === index}
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
                    handleLeafNavigate(`/${route.path}`);
                  }}
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
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out w-full md:w-auto ${
          expandedChild && expandedChild.children
            ? "hidden md:block"
            : ""
        } ${
          expandedRoute && expandedRoute.children
            ? "grid-rows-[1fr]"
            : "grid-rows-[0fr]"
        }`}
      >
        <div className="shrink-0 overflow-hidden border-l border-neutral-200 dark:border-neutral-700 pl-4">
          {expandedRoute && expandedRoute.children && (
            <RoutePanel
              routes={expandedRoute.children}
              basePath={`/${expandedRoute.path}`}
              activeRoute={activeRoute}
              onChildToggle={handleChildToggle}
              expandedChildIndex={expandedPanels.level2}
              onLeafNavigate={handleLeafNavigate}
            />
          )}
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out w-full md:w-auto ${
          expandedChild && expandedChild.children
            ? "grid-rows-[1fr]"
            : "grid-rows-[0fr]"
        }`}
      >
        <div className="shrink-0 overflow-hidden border-l border-neutral-200 dark:border-neutral-700 pl-4">
          {expandedChild && expandedChild.children && (
            <RoutePanel
              routes={expandedChild.children}
              basePath={`/${expandedRoute!.path}/${expandedChild.path}`}
              activeRoute={activeRoute}
              onLeafNavigate={handleLeafNavigate}
            />
          )}
        </div>
      </div>
    </div>
  );
}
