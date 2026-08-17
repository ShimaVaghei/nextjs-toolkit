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
