"use client";

import { Table, type TableConfig } from "@/components/Table";
import {
  teamColumns,
  teamMembers,
  type TeamMember,
} from "./../demo-data";

export default function LocalTableDemoPage() {

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
      </header>

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
