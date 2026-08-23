import type { RoutesSection } from "@/components/AppLayout";

export const appRoutes: RoutesSection[] = [
  {
    routes: [
      { path: "", label: "Home" },
      {
        path: "table", label: "Table", children: [
          { path: "local", label: "Local" },
          { path: "server", label: "Server" },
        ]
      },
    ],
  },
];
