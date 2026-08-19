import type { Route } from "@/components/AppLayout";

export const appRoutes: Route[] = [
  { path: "", label: "Home" },
  {
    path: "table", label: "Table", children: [
      { path: "local", label: "Local" },
      { path: "server", label: "Server" },
    ]
  },
];
