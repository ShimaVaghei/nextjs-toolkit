"use client";

import { useRef, useState } from "react";
import { Table, type TableConfig } from "@/components/Table";
import {
  projectColumns,
  queryProjects,
  type Project,
} from "./../demo-data";

export default function ServerTableDemoPage() {
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

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Table demo
        </h1>
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
    </div>
  );
}
