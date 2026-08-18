import type { Route } from "@/components/AppLayout";

export const appRoutes: Route[] = [
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
