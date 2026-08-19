"use client";

import { useRef, useState } from "react";
import { Table, type TableConfig } from "@/components/Table";
import {
  projectColumns,
  queryProjects,
  teamColumns,
  teamMembers,
  type Project,
  type TeamMember,
} from "./demo-data";

export default function TableDemoPage() {
  const errorRef = useRef(false);
  const [simulateError, setSimulateError] = useState(false);

  const toggleSimulateError = (checked: boolean) => {
    errorRef.current = checked;
    setSimulateError(checked);
  };

  const projectConfig: TableConfig<Project> = {
    caption: "Projects — server mode",
    serverSide: true,
    columns: projectColumns,
    dataSource: (request) => queryProjects(request, errorRef.current),
  };

  const teamConfig: TableConfig<TeamMember> = {
    caption: "Team members — local mode",
    columns: teamColumns,
    dataSource: () => ({ rows: teamMembers }),
    pagination: { size: 5 },
  };

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Table demo
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
          Two <code>Table</code> instances against mock data: one server-driven (a mock
          async <code>dataSource</code> honoring pagination, sort, and filters) and one
          local-mode over a small in-memory dataset.
        </p>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Server mode
          </h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <input
              type="checkbox"
              checked={simulateError}
              onChange={(event) => toggleSimulateError(event.target.checked)}
              className="h-4 w-4 accent-neutral-900 dark:accent-neutral-100"
            />
            Simulate server error
          </label>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Turn on the simulation, then trigger a request (page, sort, or filter) or hit
          Retry to see the failure path; turn it off and hit Retry to recover.
        </p>
        <Table config={projectConfig} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          Local mode
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          All rows are fetched once; pagination, sorting, and filtering run client-side.
        </p>
        <Table config={teamConfig} />
      </section>
    </div>
  );
}
