"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

export type Route = {
  path: string;
  label: string;
  children?: Route[];
};

/**
 * Computes the set of route paths that should be highlighted based on the current pathname.
 * Returns the matched leaf node path plus all its ancestor paths.
 *
 * @param pathname - The current URL pathname (e.g., "/dashboard/settings")
 * @param routes - The route tree to match against
 * @returns A Set of path strings that should be highlighted
 */
export function computeActiveRoute(
  pathname: string,
  routes: Route[],
): Set<string> {
  const segments = pathname.split("/").filter(Boolean);
  const active = new Set<string>();

  function walk(routes: Route[], depth: number): boolean {
    for (const route of routes) {
      if (route.path === segments[depth]) {
        active.add(route.path);

        if (route.children && route.children.length > 0) {
          if (walk(route.children, depth + 1)) {
            return true;
          }
        }

        if (depth === segments.length - 1) {
          return true;
        }

        active.delete(route.path);
      }
    }
    return false;
  }

  walk(routes, 0);
  return active;
}

export function Sidebar({ routes }: { routes: Route[] }) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const pathname = usePathname();
  const activeRoutes = computeActiveRoute(pathname, routes);

  const handleToggle = (index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  };

  const handleNavigate = () => {
    setExpandedIndex(null);
  };

  if (routes.length === 0) {
    return null;
  }

  const expandedRoute = expandedIndex !== null ? routes[expandedIndex] : null;

  return (
    <div className="flex h-full overflow-y-auto">
      <nav className="w-64 shrink-0">
        <ul className="space-y-1">
          {routes.map((route, index) => {
            const hasChildren = route.children && route.children.length > 0;
            const isActive = activeRoutes.has(route.path);

            if (hasChildren) {
              return (
                <li key={route.path}>
                  <button
                    type="button"
                    onClick={() => handleToggle(index)}
                    aria-expanded={expandedIndex === index}
                    tabIndex={0}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                      isActive
                        ? "text-neutral-900 dark:text-neutral-100"
                        : "text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    <span>{route.label}</span>
                    <svg
                      className={`h-4 w-4 text-neutral-400 transition-transform ${
                        expandedIndex === index ? "rotate-90" : ""
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
                  tabIndex={0}
                  className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                    isActive
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

      {expandedRoute && expandedRoute.children && (
        <div className="w-64 shrink-0 border-l border-neutral-200 dark:border-neutral-700 pl-4">
          <ul className="space-y-1">
            {expandedRoute.children.map((route) => {
              const fullPath = `/${expandedRoute.path}/${route.path}`;
              const isActive = activeRoutes.has(route.path);
              const hasChildren = route.children && route.children.length > 0;

              if (hasChildren) {
                return (
                  <li key={route.path}>
                    <button
                      type="button"
                      tabIndex={0}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                        isActive
                          ? "text-neutral-900 dark:text-neutral-100"
                          : "text-neutral-600 dark:text-neutral-400"
                      }`}
                    >
                      <span>{route.label}</span>
                      <svg
                        className="h-4 w-4 text-neutral-400"
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
                    onClick={handleNavigate}
                    tabIndex={0}
                    className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                      isActive
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
        </div>
      )}
    </div>
  );
}
