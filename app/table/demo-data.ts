import type {
  TableColumns,
  TableColumn,
  TableDataRequest,
  TableDataResponse,
  TableFilterScalar,
  TableSort,
} from "@/components/table";
import type { FieldOption } from "@/components/field/Field";

export type Project = {
  id: number;
  name: string;
  owner: string;
  status: string;
  startDate: string;
  lastActive: string;
  tags: string[];
  avatar: string;
  score: number;
};

export type TeamMember = {
  id: number;
  name: string;
  role: string;
  joined: string;
  lastSeen: string;
  skills: string[];
  avatar: string;
  projects: number;
};

const AVATARS = ["/next.svg", "/vercel.svg", "/globe.svg", "/window.svg", "/file.svg"];

const pad = (value: number) => String(value).padStart(2, "0");

function toLocalDatetime(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
): string {
  return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00`;
}

const PROJECT_NAMES = [
  "Aurora",
  "Beacon",
  "Cascade",
  "Drift",
  "Ember",
  "Falcon",
  "Grove",
  "Harbor",
  "Ivy",
  "Juniper",
  "Kite",
  "Lumen",
  "Mesa",
  "Nimbus",
  "Orbit",
  "Pine",
  "Quartz",
  "Reef",
  "Summit",
  "Talon",
];

export const PROJECT_STATUS_OPTIONS: FieldOption<string>[] = [
  { label: "Active", value: "act" },
  { label: "Planning", value: "pln" },
  { label: "Paused", value: "pau" },
  { label: "Archived", value: "arc" },
  { label: "Review", value: "rev" },
];

const PROJECT_STATUS_CODES = PROJECT_STATUS_OPTIONS.map(
  (option) => option.value,
);

const PROJECT_TAGS = [
  "frontend",
  "backend",
  "infra",
  "mobile",
  "design",
  "data",
  "security",
  "api",
];

export const projectColumns: TableColumns<Project> = {
  name: {
    type: "text",
    label: "Project",
    sortable: true,
    // Legacy `true` shorthand: the kind is inferred (text → input).
    filterable: true,
  },
  owner: {
    type: "text",
    label: "Owner",
    sortable: true,
    // Legacy string shorthand: a Filter key override (the request writes
    // under "owner_name" instead of the column's own key).
    filterable: "owner_name",
  },
  status: {
    type: "option",
    label: "Status",
    options: PROJECT_STATUS_OPTIONS,
    sortable: true,
    // Object form: a select whose Options come from an async loader.
    filterable: {
      kind: "select",
      options: () =>
        new Promise((resolve) => setTimeout(() => resolve(PROJECT_STATUS_OPTIONS), 400)),
    },
  },
  startDate: {
    type: "date",
    label: "Start date",
    sortable: true,
    // Object form: a date range whose two Filter keys are explicit and
    // used verbatim — no ".from"/".to" suffix is ever appended to them.
    filterable: {
      kind: "date-range",
      key: { from: "startDateFrom", to: "startDateTo" },
    },
  },
  lastActive: {
    type: "datetime",
    label: "Last active",
    sortable: true,
  },
  tags: {
    type: "text",
    label: "Tags",
    sortable: true,
    // Object form: a multi-select emitting an array of scalars.
    filterable: {
      kind: "multi-select",
      options: PROJECT_TAGS.map((tag) => ({ label: tag, value: tag })),
    },
  },
  avatar: { type: "image", label: "Avatar" },
  score: {
    type: "number",
    label: "Score",
    sortable: true,
    // Object form: a number range with explicit, verbatim request keys —
    // no ".from"/".to" suffix is ever appended to them. Two unnamed range
    // filters in one table would collide under the derived default keys,
    // so range filters should name their keys.
    filterable: {
      kind: "number-range",
      key: { from: "minScore", to: "maxScore" },
    },
  },
};

/**
 * Where each request key a demo filter can emit filters on: the row key and,
 * for range bounds, which side of the comparison it drives. The fake server
 * needs this map because explicit range keys ("minScore") don't name a row
 * property, and explicit range keys ("startDateFrom") name a bound of one
 * without saying so in the key itself.
 */
const filterKeyTargets: Record<
  string,
  { key: string; bound?: "from" | "to" }
> = {
  name: { key: "name" },
  owner_name: { key: "owner" },
  status: { key: "status" },
  tags: { key: "tags" },
  startDateFrom: { key: "startDate", bound: "from" },
  startDateTo: { key: "startDate", bound: "to" },
  minScore: { key: "score", bound: "from" },
  maxScore: { key: "score", bound: "to" },
};

export const projects: Project[] = Array.from({ length: 57 }, (_, i) => {
  const year = 2021 + (i % 5);
  const month = (i % 12) + 1;
  const day = ((i * 7) % 27) + 1;
  return {
    id: i + 1,
    name: `${PROJECT_NAMES[i % PROJECT_NAMES.length]} ${i + 1}`,
    owner: `Owner ${i + 1}`,
    status: PROJECT_STATUS_CODES[i % PROJECT_STATUS_CODES.length],
    startDate: `${year}-${pad(month)}-${pad(day)}`,
    lastActive: toLocalDatetime(
      2024 + (i % 2),
      month,
      day,
      (i * 3) % 24,
      (i * 13) % 60,
    ),
    tags: [PROJECT_TAGS[i % PROJECT_TAGS.length], PROJECT_TAGS[(i + 3) % PROJECT_TAGS.length]],
    avatar: AVATARS[i % AVATARS.length],
    score: ((i * 37) % 1000) + 1,
  };
});

const MEMBER_SKILLS = [
  ["analytical", "math"],
  ["compilers", "cobol"],
  ["algorithms", "logic"],
  ["algorithms", "math"],
  ["systems", "reliability"],
  ["math", "physics"],
  ["linux", "c"],
  ["algorithms", "typesetting"],
  ["abstraction", "distributed"],
  ["unix", "c"],
  ["networking", "security"],
  ["web", "html"],
  ["c++", "templates"],
  ["python", "language design"],
];

export const MEMBER_SKILL_OPTIONS = Array.from(
  new Set(MEMBER_SKILLS.flat()),
).map((skill) => ({ label: skill, value: skill }));

export const teamColumns: TableColumns<TeamMember> = {
  name: { type: "text", label: "Name", sortable: true, filterable: true },
  role: { type: "text", label: "Role", sortable: true, filterable: "role" },
  joined: {
    type: "date",
    label: "Joined",
    sortable: true,
    // Object form: a date range under "joined.from"/"joined.to".
    filterable: { kind: "date-range" },
  },
  lastSeen: {
    type: "datetime",
    label: "Last seen",
    sortable: true,
    filterable: { kind: "datetime" },
  },
  skills: {
    type: "text",
    label: "Skills",
    sortable: true,
    // Object form: a multi-select over the flattened skill set.
    filterable: {
      kind: "multi-select",
      options: MEMBER_SKILL_OPTIONS,
    },
  },
  avatar: { type: "image", label: "Avatar" },
  projects: {
    type: "number",
    label: "Projects",
    sortable: true,
    filterable: { kind: "number-range" },
  },
};

const MEMBER_NAMES = [
  "Ada Lovelace",
  "Grace Hopper",
  "Alan Turing",
  "Edsger Dijkstra",
  "Margaret Hamilton",
  "Katherine Johnson",
  "Linus Torvalds",
  "Donald Knuth",
  "Barbara Liskov",
  "Ken Thompson",
  "Radia Perlman",
  "Tim Berners-Lee",
  "Bjarne Stroustrup",
  "Guido van Rossum",
];

const MEMBER_ROLES = [
  "Engineer",
  "Engineer",
  "Researcher",
  "Architect",
  "Engineer",
  "Data scientist",
  "Engineer",
  "Researcher",
  "Engineer",
  "Engineer",
  "Network architect",
  "Web developer",
  "Engineer",
  "Developer",
];


export const teamMembers: TeamMember[] = MEMBER_NAMES.map((name, i) => {
  const year = 2015 + (i % 10);
  const month = (i % 12) + 1;
  const day = ((i * 5) % 27) + 1;
  return {
    id: i + 1,
    name,
    role: MEMBER_ROLES[i],
    joined: `${year}-${pad(month)}-${pad(day)}`,
    lastSeen: toLocalDatetime(2025, month, day, (i * 3) % 24, (i * 11) % 60),
    skills: MEMBER_SKILLS[i],
    avatar: AVATARS[i % AVATARS.length],
    projects: ((i * 13) % 8) + 1,
  };
});

function containsText(value: unknown, filter: TableFilterScalar): boolean {
  const text = Array.isArray(value) ? value.join(", ") : String(value);
  return text.toLowerCase().includes(String(filter).toLowerCase());
}

function resolveOptionLabel(
  value: unknown,
  options: FieldOption[] | undefined,
): string {
  const match = options?.find((option) => Object.is(option.value, value));
  return match ? match.label : String(value);
}

function displayText(
  value: unknown,
  options: FieldOption[] | undefined,
): string {
  if (Array.isArray(value)) {
    return value
      .map((element) => resolveOptionLabel(element, options))
      .join(", ");
  }
  return resolveOptionLabel(value, options);
}

function toMatchDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string") {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.exec(value);
    if (dateOnly) {
      const [year, month, day] = value.split("-").map(Number);
      return new Date(year, month - 1, day);
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function sameDateParts(
  value: unknown,
  filter: TableFilterScalar,
  includeTime: boolean,
): boolean {
  const valueDate = toMatchDate(value);
  const filterDate = toMatchDate(filter);
  if (!valueDate || !filterDate) {
    return false;
  }
  if (
    valueDate.getFullYear() !== filterDate.getFullYear() ||
    valueDate.getMonth() !== filterDate.getMonth() ||
    valueDate.getDate() !== filterDate.getDate()
  ) {
    return false;
  }
  if (includeTime) {
    if (
      valueDate.getHours() !== filterDate.getHours() ||
      valueDate.getMinutes() !== filterDate.getMinutes() ||
      valueDate.getSeconds() !== filterDate.getSeconds()
    ) {
      return false;
    }
  }
  return true;
}

function columnOptions(
  column: TableColumn<unknown>,
): FieldOption[] | undefined {
  return column.type === "option" ? column.options : undefined;
}

function matchesValue(
  value: unknown,
  filter: TableFilterScalar,
  column: TableColumn<unknown>,
): boolean {
  if (value === null || value === undefined) {
    return false;
  }
  switch (column.type) {
    case "text":
    case "option":
      return containsText(displayText(value, columnOptions(column)), filter);
    case "date":
      return sameDateParts(value, filter, false);
    case "datetime":
      return sameDateParts(value, filter, true);
    case "number":
      return Number(value) === Number(filter);
    case "image":
    default:
      return false;
  }
}

function matchesBound(
  value: unknown,
  bound: "from" | "to",
  filter: TableFilterScalar,
  column: TableColumn<unknown>,
): boolean {
  if (column.type === "number") {
    const num = Number(value);
    if (Number.isNaN(num)) {
      return false;
    }
    return bound === "from" ? num >= Number(filter) : num <= Number(filter);
  }
  const valueDate = toMatchDate(value);
  const filterDate = toMatchDate(filter);
  if (!valueDate || !filterDate) {
    return false;
  }
  return bound === "from"
    ? valueDate.getTime() >= filterDate.getTime()
    : valueDate.getTime() <= filterDate.getTime();
}

function applyFilters<T>(
  rows: T[],
  filters: TableDataRequest["filters"],
  columns: TableColumns<T>,
): T[] {
  const entries = Object.entries(filters ?? {});
  if (entries.length === 0) {
    return rows;
  }
  return rows.filter((row) =>
    entries.every(([key, filter]) => {
      // Range bounds arrive under their resolved request keys (a derived
      // "<base>.from"/".to" pair or explicit keys like "minScore"); the
      // target map translates them back to a row key and comparison side.
      const target = filterKeyTargets[key];
      if (target?.bound) {
        const bound = target.bound;
        const column = columns[target.key] as TableColumn<unknown>;
        return filter !== undefined
          ? matchesBound(
              (row as Record<string, unknown>)[target.key],
              bound,
              filter as TableFilterScalar,
              column,
            )
          : true;
      }
      const baseKey = target?.key ?? key;
      const values = Array.isArray(filter) ? filter : [filter];
      return (
        values.length === 0 ||
        values.some((value) =>
          matchesValue(
            (row as Record<string, unknown>)[baseKey],
            value,
            columns[baseKey] as TableColumn<unknown>,
          ),
        )
      );
    }),
  );
}

function isSortEmpty(value: unknown): boolean {
  return (
    value === null || value === undefined || (Array.isArray(value) && value.length === 0)
  );
}

function compareRaw(
  a: unknown,
  b: unknown,
  column: TableColumn<unknown>,
): number {
  switch (column.type) {
    case "number":
      return Number(a) - Number(b);
    case "date":
    case "datetime": {
      const aTime = toMatchDate(a)?.getTime() ?? 0;
      const bTime = toMatchDate(b)?.getTime() ?? 0;
      return aTime - bTime;
    }
    case "text":
    case "option":
    case "image":
    default:
      return displayText(a, columnOptions(column)).localeCompare(
        displayText(b, columnOptions(column)),
        undefined,
        { sensitivity: "base" },
      );
  }
}

function applySort<T>(
  rows: T[],
  sort: TableSort | undefined,
  columns: TableColumns<T>,
): T[] {
  if (!sort) {
    return rows;
  }
  const column = columns[sort.key] as TableColumn<unknown> | undefined;
  const factor = sort.direction === "ascending" ? 1 : -1;
  const indexed = rows.map((row, index) => ({ row, index }));
  indexed.sort((a, b) => {
    const aValue = (a.row as Record<string, unknown>)[sort.key];
    const bValue = (b.row as Record<string, unknown>)[sort.key];
    const aEmpty = isSortEmpty(aValue);
    const bEmpty = isSortEmpty(bValue);
    if (aEmpty || bEmpty) {
      if (aEmpty && bEmpty) {
        return a.index - b.index;
      }
      return aEmpty ? 1 : -1;
    }
    const cmp =
      compareRaw(
        aValue,
        bValue,
        column ?? ({ type: "text" } as TableColumn<unknown>),
      ) * factor;
    return cmp !== 0 ? cmp : a.index - b.index;
  });
  return indexed.map(({ row }) => row);
}

export async function queryProjects(
  request: TableDataRequest,
  shouldFail: boolean,
): Promise<TableDataResponse<Project>> {
  await new Promise((resolve) => setTimeout(resolve, 600));
  if (shouldFail) {
    throw new Error("Simulated server failure");
  }
  const size = request.pagination?.size ?? 10;
  const page = request.pagination?.page ?? 1;
  let rows = applyFilters(projects, request.filters, projectColumns);
  rows = applySort(rows, request.sort, projectColumns);
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const start = (page - 1) * size;
  return {
    rows: rows.slice(start, start + size),
    pagination: { total, size, page, totalPages },
  };
}
