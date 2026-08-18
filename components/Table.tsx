"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type TableColumnType =
  | "text"
  | "date"
  | "datetime"
  | "array"
  | "image"
  | "number";

export type TableSortDirection = "ascending" | "descending";

export type TableFilterValue = string | number | (string | number)[];

export type TableSort = {
  key: string;
  direction: TableSortDirection;
};

export type TableColumn<T> = {
  type: TableColumnType;
  label?: string;
  transform?: (value: unknown, row: T) => unknown;
  class?: string;
  dynamicClass?: (row: T) => string;
  hidden?: boolean;
  sortable?: string | false;
  filterable?: string | false;
};

export type TableDataRequest = {
  pagination?: { page: number; size: number };
  sort?: TableSort;
  filters?: Record<string, TableFilterValue>;
};

export type TablePagination = {
  total: number;
  size: number;
  page: number;
  totalPages: number;
};

export type TableDataResponse<T> = {
  rows: T[];
  pagination?: TablePagination;
};

export type TableConfig<T> = {
  caption?: string;
  dataSource: (
    request: TableDataRequest,
  ) => TableDataResponse<T> | Promise<TableDataResponse<T>>;
  columns: Record<string, TableColumn<T>>;
  serverSide?: boolean;
  pagination?: { page?: number; size?: number };
};

const EMPTY_MARK = <span className="text-neutral-400">—</span>;

const PAGER_BUTTON_CLASS =
  "rounded-md border border-neutral-300 px-2.5 py-1 text-sm dark:border-neutral-700";
const PAGER_EDGE_BUTTON_CLASS = `${PAGER_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-50`;

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

const DATETIME_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

const IMAGE_CLASS = "h-10 w-10 rounded-lg shadow-sm";

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined;
}

function compareRawValues(a: unknown, b: unknown, type: TableColumnType): number {
  switch (type) {
    case "array": {
      const aText = Array.isArray(a) ? a.join(", ") : String(a);
      const bText = Array.isArray(b) ? b.join(", ") : String(b);
      return aText.localeCompare(bText, undefined, { sensitivity: "base" });
    }
    case "number": {
      const aNum = Number(a);
      const bNum = Number(b);
      return aNum - bNum;
    }
    case "date":
    case "datetime": {
      const aDate = toDate(a);
      const bDate = toDate(b);
      return (aDate?.getTime() ?? 0) - (bDate?.getTime() ?? 0);
    }
    case "text":
    case "image":
    default:
      return String(a).localeCompare(String(b), undefined, {
        sensitivity: "base",
      });
  }
}

function isSortEmpty(value: unknown): boolean {
  return (
    isEmptyValue(value) || (Array.isArray(value) && value.length === 0)
  );
}

function cycleSort(current: TableSort | null, key: string): TableSort | null {
  if (!current || current.key !== key) {
    return { key, direction: "ascending" };
  }
  if (current.direction === "ascending") {
    return { key, direction: "descending" };
  }
  return null;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function buildDateTimeAttribute(date: Date, includeTime: boolean): string {
  const base = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
  if (!includeTime) {
    return base;
  }
  return `${base}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function renderTimeCell(value: unknown, includeTime: boolean): ReactNode {
  const date = toDate(value);
  if (!date) {
    return <>{String(value)}</>;
  }
  return (
    <time dateTime={buildDateTimeAttribute(date, includeTime)}>
      {(includeTime ? DATETIME_FORMAT : DATE_FORMAT).format(date)}
    </time>
  );
}

function renderImageCell<T>(value: unknown, row: T): ReactNode {
  const rawName = (row as Record<string, unknown>)["name"];
  const alt =
    typeof rawName === "string" && rawName.trim() !== ""
      ? `${rawName} thumbnail`
      : "";
  return <img src={String(value)} alt={alt} className={IMAGE_CLASS} />;
}

function renderCell<T>(value: unknown, column: TableColumn<T>, row: T): ReactNode {
  const display = column.transform ? column.transform(value, row) : value;
  if (isEmptyValue(display)) {
    return EMPTY_MARK;
  }
  switch (column.type) {
    case "date":
      return renderTimeCell(display, false);
    case "datetime":
      return renderTimeCell(display, true);
    case "array":
      return Array.isArray(display) ? display.join(", ") : String(display);
    case "image":
      return renderImageCell(display, row);
    case "number":
    case "text":
    default:
      return String(display);
  }
}

export function Table<T>({ config }: { config: TableConfig<T> }) {
  const dataSourceRef = useRef(config.dataSource);
  const [rows, setRows] = useState<T[] | null>(null);
  const [sort, setSort] = useState<TableSort | null>(null);
  const [pagination, setPagination] = useState(() => ({
    page: Math.max(1, config.pagination?.page ?? 1),
    size: config.pagination?.size ?? 10,
  }));

  useEffect(() => {
    let active = true;
    const response = dataSourceRef.current({});
    if (typeof (response as Promise<TableDataResponse<T>>).then === "function") {
      (response as Promise<TableDataResponse<T>>).then((resolved) => {
        if (active) setRows(resolved.rows);
      });
    } else if (active) {
      setRows((response as TableDataResponse<T>).rows);
    }
    return () => {
      active = false;
    };
  }, []);

  const visibleColumns = useMemo(
    () => Object.entries(config.columns).filter(([, column]) => !column.hidden),
    [config.columns],
  );

  const total = rows?.length ?? 0;
  const size = pagination.size;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(pagination.page, 1), totalPages);
  const start = (page - 1) * size;
  const end = Math.min(start + size, total);
  const sortedRows = useMemo(() => {
    if (!sort || !rows) {
      return rows ?? [];
    }
    const column = config.columns[sort.key];
    const factor = sort.direction === "ascending" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const aValue = a[sort.key as keyof T];
      const bValue = b[sort.key as keyof T];
      const aEmpty = isSortEmpty(aValue);
      const bEmpty = isSortEmpty(bValue);
      if (aEmpty || bEmpty) {
        if (aEmpty && bEmpty) {
          return 0;
        }
        return aEmpty ? 1 : -1;
      }
      return compareRawValues(aValue, bValue, column.type) * factor;
    });
  }, [rows, sort, config.columns]);
  const pageRows = sortedRows.slice(start, end);
  const from = total === 0 ? 0 : start + 1;
  const to = total === 0 ? 0 : end;

  if (rows === null) {
    return null;
  }

  return (
    <div>
      <table className="w-full border-collapse text-sm">
        {config.caption ? (
          <caption className="pb-2 text-left text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {config.caption}
          </caption>
        ) : null}
        <thead>
          <tr className="border-b border-neutral-300 text-left dark:border-neutral-700">
            {visibleColumns.map(([key, column]) => {
              const sorted = sort?.key === key;
              return (
                <th
                  key={key}
                  scope="col"
                  aria-sort={
                    sorted
                      ? sort.direction
                      : column.sortable
                        ? "none"
                        : undefined
                  }
                  className="px-3 py-2 font-medium text-neutral-900 dark:text-neutral-100"
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => setSort((current) => cycleSort(current, key))}
                      className="flex cursor-pointer items-center gap-1"
                    >
                      {column.label ?? key}
                      {sorted ? (
                        <span aria-hidden="true">
                          {sort.direction === "ascending" ? "\u2191" : "\u2193"}
                        </span>
                      ) : null}
                    </button>
                  ) : (
                    (column.label ?? key)
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {total === 0 ? (
            <tr>
              <td
                colSpan={visibleColumns.length}
                className="px-3 py-8 text-center text-neutral-500"
              >
                No data yet
              </td>
            </tr>
          ) : (
            pageRows.map((row, index) => (
              <tr
                key={index}
                className="border-b border-neutral-200 dark:border-neutral-800"
              >
                {visibleColumns.map(([key, column]) => {
                  const cellClass = [column.class, column.dynamicClass?.(row)]
                    .filter((c): c is string => Boolean(c))
                    .join(" ");
                  return (
                    <td
                      key={key}
                      className={`px-3 py-2 align-top text-left text-neutral-700 dark:text-neutral-300${cellClass ? ` ${cellClass}` : ""}`}
                    >
                      {renderCell(row[key as keyof T], column, row)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div
        role="status"
        aria-live="polite"
        className="mt-2 text-sm text-neutral-500"
      >
        Showing {from}–{to} of {total}
      </div>

      <nav aria-label="Pagination" className="mt-3 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setPagination((p) => ({ ...p, page: page - 1 }))}
          disabled={page <= 1}
          className={PAGER_EDGE_BUTTON_CLASS}
        >
          Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPagination((state) => ({ ...state, page: p }))}
            aria-current={p === page ? "page" : undefined}
            className={PAGER_BUTTON_CLASS}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPagination((p) => ({ ...p, page: page + 1 }))}
          disabled={page >= totalPages}
          className={PAGER_EDGE_BUTTON_CLASS}
        >
          Next
        </button>
      </nav>
    </div>
  );
}