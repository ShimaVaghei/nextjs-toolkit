"use client";

import {
  useCallback,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";

import {
  DATE_DISPLAY_FORMAT,
  DATE_ONLY_PATTERN,
  DATETIME_DISPLAY_FORMAT,
  pad2,
} from "@/lib/date";
import {
  DateField,
  DateTimeField,
  InputField,
  MultiSelectField,
  SelectField,
  type FieldHandle,
  type FieldOption,
  type FieldOptionSource,
} from "@/components/field/Field";

export type TableColumnType =
  | "text"
  | "date"
  | "datetime"
  | "option"
  | "image"
  | "number";

export type TableSortDirection = "ascending" | "descending";

export type TableFilterScalar = string | number;

export type TableFilterValue = TableFilterScalar | TableFilterScalar[];

/** The native input type an input filter kind may request. */
export type TableFilterInputType = "text" | "number";

/**
 * A column's filter config in object form: a discriminated union on `kind`
 * over the Filter kind set. Where Options come from is only expressible on
 * the choice kinds, the input type only on the input kind, and every member
 * takes an optional Filter key — a string for the single request key, or a
 * `{ from, to }` pair naming a range's two request keys verbatim.
 */
export type TableFilterable = {
  kind: "select" | "multi-select";
  options?: FieldOptionSource<TableFilterScalar>;
  key?: string | { from: string; to: string };
} | {
  kind: "input";
  inputType?: TableFilterInputType;
  key?: string | { from: string; to: string };
} | {
  kind: "date" | "datetime";
  key?: string | { from: string; to: string };
} | {
  kind: "date-range" | "datetime-range" | "number-range";
  key?: string | { from: string; to: string };
};

export type TableSort = {
  key: string;
  direction: TableSortDirection;
};

export type TableColumn<T> = {
  type: TableColumnType;
  label?: string;
  options?: FieldOption[];
  transform?: (value: unknown, row: T) => unknown;
  class?: string | ((row: T) => string);
  hidden?: boolean;
  sortable?: string | boolean;
  filterable?: string | boolean | TableFilterable;
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

export type TableColumns<T> = Record<string, TableColumn<T>>;

export type TableConfig<T> = {
  caption?: string;
  dataSource: (
    request: TableDataRequest,
  ) => Promise<TableDataResponse<T>>;
  columns: TableColumns<T>;
  serverSide?: boolean;
  pagination?: { page?: number; size?: number };
  filterSummary?: boolean;
};

export type TableHandle = {
  refresh: () => void;
};

const EMPTY_MARK = <span className="text-neutral-400">—</span>;

const PAGER_BUTTON_BASE_CLASS =
  "rounded-md border px-2.5 py-1 text-sm cursor-pointer";
const PAGER_BUTTON_CLASS = `${PAGER_BUTTON_BASE_CLASS} border-neutral-300 dark:border-neutral-700`;
const PAGER_CURRENT_BUTTON_CLASS = `${PAGER_BUTTON_BASE_CLASS} border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900`;
const PAGER_EDGE_BUTTON_CLASS = `${PAGER_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-50`;

const IMAGE_CLASS = "h-10 w-10 rounded-lg shadow-sm";

const LOADING_TBODY_CLASS = "opacity-50 transition-opacity";

const LOADING_SPINNER = (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    fill="none"
    className="inline-block h-3.5 w-3.5 animate-spin"
  >
    <circle
      cx="8"
      cy="8"
      r="6"
      stroke="currentColor"
      strokeOpacity="0.25"
      strokeWidth="2"
    />
    <path
      d="M14 8a6 6 0 0 0-6-6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const REFRESH_ICON = (
  <svg
    aria-hidden="true"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-3.5 w-3.5"
  >
    <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
    <path d="M13.5 1.5v2.6h-2.6" />
  </svg>
);

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined;
}

const OPTION_WARNED_COLUMNS = new WeakSet<object>();

function columnOptions<T>(column: TableColumn<T>): FieldOption[] | undefined {
  return column.type === "option" ? column.options : undefined;
}

function warnMissingOptions<T>(column: TableColumn<T>): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  if (OPTION_WARNED_COLUMNS.has(column)) {
    return;
  }
  OPTION_WARNED_COLUMNS.add(column);
  console.warn(
    'Table column of type "option" has no options; rendering raw values.',
  );
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

function compareRawValues<T>(
  a: unknown,
  b: unknown,
  column: TableColumn<T>,
): number {
  switch (column.type) {
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

function resolveRequestKey(
  columnKey: string,
  requestKey: string | boolean | undefined,
): string {
  return typeof requestKey === "string" ? requestKey : columnKey;
}

type TableFilterKind = TableFilterable["kind"];

/** The kind a legacy `filterable: true` shorthand infers from the column's type. */
function inferFilterKind<T>(column: TableColumn<T>): TableFilterKind {
  switch (column.type) {
    case "option":
      return "select";
    case "date":
      return "date";
    case "datetime":
      return "datetime";
    default:
      return "input";
  }
}

function resolveFilterKind<T>(column: TableColumn<T>): TableFilterKind {
  const filterable = column.filterable;
  if (typeof filterable === "object") {
    return filterable.kind;
  }
  // Only the `true` shorthand infers the kind; the string shorthand is a
  // request-key override that keeps the legacy bare-input behavior.
  return filterable === true ? inferFilterKind(column) : "input";
}

/**
 * The Input type an input filter kind renders with: the object config's own
 * `inputType`, or the column type's number-ness for the inferred shorthand.
 */
function resolveFilterInputType<T>(
  column: TableColumn<T>,
): TableFilterInputType {
  const filterable = column.filterable;
  if (
    typeof filterable === "object" &&
    filterable.kind === "input" &&
    filterable.inputType !== undefined
  ) {
    return filterable.inputType;
  }
  return column.type === "number" ? "number" : "text";
}

/**
 * Where a select/multi-select filter's Options come from: the object
 * config's own `options`, or — for the legacy `true` shorthand inferred to
 * select on an option column — the column's cell-render options. Filter
 * option values are filter scalars (the wire values), never the row type;
 * cell-render options remain a separate prop for every other shape.
 */
function filterOptionSource<T>(
  column: TableColumn<T>,
): FieldOptionSource<TableFilterScalar> | undefined {
  const filterable = column.filterable;
  if (typeof filterable === "object") {
    return filterable.kind === "select" || filterable.kind === "multi-select"
      ? filterable.options
      : undefined;
  }
  return filterable === true && column.type === "option"
    ? (column.options as FieldOptionSource<TableFilterScalar>)
    : undefined;
}
/**
 * The request key a column's filter writes under: the legacy string
 * shorthand, the object config's string key, or the column's own key.
 */
function resolveFilterRequestKey<T>(
  columnKey: string,
  column: TableColumn<T> | undefined,
): string {
  const filterable = column?.filterable;
  if (typeof filterable === "string") {
    return filterable;
  }
  if (
    typeof filterable === "object" &&
    typeof filterable.key === "string"
  ) {
    return filterable.key;
  }
  return columnKey;
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

function toMatchDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === "string") {
    const dateOnly = DATE_ONLY_PATTERN.exec(value);
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

function containsCaseInsensitive(
  value: unknown,
  filter: TableFilterScalar,
): boolean {
  const text = Array.isArray(value) ? value.join(", ") : String(value);
  return text.toLowerCase().includes(String(filter).toLowerCase());
}

function matchesFilter<T>(
  value: unknown,
  column: TableColumn<T>,
  filter: TableFilterValue,
): boolean {
  // A multi-select filter carries a scalar array: the row matches when any
  // of its scalars matches (an OR over the same scalar pipeline).
  if (Array.isArray(filter)) {
    return filter.some((scalar) => matchesFilter(value, column, scalar));
  }
  if (isEmptyValue(value)) {
    return false;
  }
  switch (column.type) {
    case "text":
    case "option":
      return containsCaseInsensitive(
        displayText(value, columnOptions(column)),
        filter,
      );
    case "date":
      return sameDateParts(value, filter, false);
    case "datetime":
      return sameDateParts(value, filter, true);
    case "number":
      return Number(value) === Number(filter);
    case "image":
    default:
      // Array display is value-shape behavior (see CONTEXT.md): any other
      // renderer joins array cells, so their filter matches the joined text.
      return Array.isArray(value)
        ? containsCaseInsensitive(displayText(value, columnOptions(column)), filter)
        : false;
  }
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
      {(includeTime ? DATETIME_DISPLAY_FORMAT : DATE_DISPLAY_FORMAT).format(date)}
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
    case "image":
      return renderImageCell(display, row);
    case "option":
    case "number":
    case "text":
    default: {
      if (column.type === "option" && !column.options?.length) {
        warnMissingOptions(column);
      }
      return displayText(display, columnOptions(column));
    }
  }
}

function FilterControl<T>({
  columnKey,
  column,
  value,
  onChange,
  open,
  onOpenChange,
}: {
  columnKey: string;
  column: TableColumn<T>;
  value: TableFilterValue | undefined;
  onChange: (value: TableFilterValue | undefined) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const popoverId = useId();
  const inputId = `${popoverId}-input`;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  const label = column.label ?? columnKey;
  const isNumber = column.type === "number";
  const filterKind = resolveFilterKind(column);
  // The legacy string shorthand keeps the bare input (its number/text typing
  // derives from the column type); so do the range kinds that no Field
  // rendering covers yet. Every other kind renders its real Field.
  const usesLegacyInput =
    filterKind === "input" && typeof column.filterable === "string";
  const rendersFieldComponent =
    filterKind === "select" ||
    filterKind === "multi-select" ||
    filterKind === "date" ||
    filterKind === "datetime" ||
    (filterKind === "input" && !usesLegacyInput);
  const isMultiSelectFilter = filterKind === "multi-select";
  const inputValue = value === undefined ? "" : String(value);
  const isActive = value !== undefined;
  // The Table owns the filters record; external changes (chip removal,
  // Clear all) are installed into the mounted Field through its handle.
  // A cleared value can't be pushed — setValue holds a defined V — so the
  // Field remounts and re-seeds from Initial instead. A multi-select's
  // emptiness is [] (a defined value), so the remount is skipped when the
  // mounted Field already holds an empty selection.
  const fieldHandleRef = useRef<FieldHandle<TableFilterScalar> | null>(null);
  const [fieldResetEpoch, setFieldResetEpoch] = useState(0);

  useEffect(() => {
    if (!rendersFieldComponent || !open) {
      return;
    }
    const handle = fieldHandleRef.current;
    if (!handle) {
      return;
    }
    if (value === undefined) {
      const current = handle.getValue();
      const currentEmpty = isMultiSelectFilter
        ? current === undefined ||
          (Array.isArray(current) && current.length === 0)
        : current === undefined;
      if (!currentEmpty) {
        setFieldResetEpoch((epoch) => epoch + 1);
      }
      return;
    }
    if (isMultiSelectFilter) {
      const arrayHandle = handle as unknown as FieldHandle<
        TableFilterScalar[]
      >;
      const next = Array.isArray(value) ? value : [];
      const current = arrayHandle.getValue() ?? [];
      const sameSelection =
        current.length === next.length &&
        next.every((scalar, index) => Object.is(current[index], scalar));
      if (!sameSelection) {
        arrayHandle.setValue(next);
      }
      return;
    }
    if (!Object.is(handle.getValue(), value)) {
      handle.setValue(value as TableFilterScalar);
    }
  }, [rendersFieldComponent, open, value, isMultiSelectFilter]);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        onOpenChangeRef.current(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  const closeAndFocus = () => {
    onOpenChangeRef.current(false);
    triggerRef.current?.focus();
  };

  const handleChange = (raw: string) => {
    if (raw === "") {
      onChange(undefined);
      return;
    }
    if (isNumber) {
      const num = Number(raw);
      if (Number.isNaN(num)) {
        return;
      }
      onChange(num);
    } else {
      onChange(raw);
    }
  };

  return (
    <div ref={containerRef} className="inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Filter ${label}`}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => onOpenChange(!open)}
        className={`relative flex cursor-pointer items-center rounded p-0.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200${
          isActive ? " text-neutral-900 dark:text-neutral-100" : ""
        }`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
        >
          <path d="M1.5 2h13l-5 6v4.5l-3 1.5V8l-5-6z" />
        </svg>
        {isActive ? (
          <span
            aria-hidden="true"
            className="active-filter-dot absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-current"
          />
        ) : null}
      </button>
      {open ? (
        <div
          id={popoverId}
          role="group"
          onKeyDown={
            rendersFieldComponent
              ? (event) => {
                  if (event.key === "Escape") {
                    closeAndFocus();
                  }
                }
              : undefined
          }
          className="absolute left-0 top-full z-20 mt-1 w-48 rounded-md border border-neutral-300 bg-white p-2 shadow-md dark:border-neutral-700 dark:bg-neutral-800"
        >
          {filterKind === "multi-select" ? (
            <MultiSelectField<TableFilterScalar>
              key={fieldResetEpoch}
              ref={
                fieldHandleRef as unknown as Ref<
                  FieldHandle<TableFilterScalar[]>
                >
              }
              config={{
                label: `Filter by ${label}`,
                options: filterOptionSource(column),
                selectionDisplay: "chips",
                initialValue: Array.isArray(value) ? value : undefined,
                onValueChange: (next) =>
                  onChange(next.length === 0 ? undefined : next),
              }}
            />
          ) : filterKind === "select" ? (
            <SelectField<TableFilterScalar>
              key={fieldResetEpoch}
              ref={fieldHandleRef}
              config={{
                label: `Filter by ${label}`,
                options: filterOptionSource(column),
                initialValue: Array.isArray(value) ? undefined : value,
                onValueChange: (next) =>
                  onChange(next === "" ? undefined : next),
              }}
            />
          ) : filterKind === "input" && !usesLegacyInput ? (
            <InputField
              key={fieldResetEpoch}
              ref={fieldHandleRef}
              config={{
                label: `Filter by ${label}`,
                inputType: resolveFilterInputType(column),
                initialValue: Array.isArray(value) ? undefined : value,
                onValueChange: (next) =>
                  onChange(
                    next === "" || Number.isNaN(next) ? undefined : next,
                  ),
              }}
            />
          ) : filterKind === "date" || filterKind === "datetime" ? (
            (() => {
              // The date kinds share one Field config; only the component
              // (and its value-shape-specific ref cast) differs.
              const dateConfig = {
                label: `Filter by ${label}`,
                initialValue: typeof value === "string" ? value : undefined,
                onValueChange: (next: string) =>
                  onChange(next === "" ? undefined : next),
              };
              const dateRef =
                fieldHandleRef as unknown as Ref<FieldHandle<string>>;
              return filterKind === "date" ? (
                <DateField key={fieldResetEpoch} ref={dateRef} config={dateConfig} />
              ) : (
                <DateTimeField key={fieldResetEpoch} ref={dateRef} config={dateConfig} />
              );
            })()
          ) : (
            <>
              <label
                htmlFor={inputId}
                className="mb-1 block text-xs font-medium text-neutral-500 dark:text-neutral-400"
              >
                Filter by {label}
              </label>
              <input
                id={inputId}
                type={isNumber ? "number" : "text"}
                value={inputValue}
                autoFocus
                onChange={(event) => handleChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    closeAndFocus();
                  }
                }}
                className="w-40 rounded-md border border-neutral-300 px-2 py-1 text-sm text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function Table<T>({
  config,
  ref,
}: {
  config: TableConfig<T>;
  ref?: Ref<TableHandle>;
}) {
  const dataSourceRef = useRef(config.dataSource);
  const columnsRef = useRef(config.columns);
  useEffect(() => {
    columnsRef.current = config.columns;
  });
  const serverSide = Boolean(config.serverSide);
  const [rows, setRows] = useState<T[] | null>(null);
  const [sort, setSort] = useState<TableSort | null>(null);
  const [filters, setFilters] = useState<Record<string, TableFilterValue>>({});
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  const [debouncedFilters, setDebouncedFilters] = useState(filters);
  const [pagination, setPagination] = useState(() => ({
    page: Math.max(1, config.pagination?.page ?? 1),
    size: config.pagination?.size ?? 10,
  }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mirroredPagination, setMirroredPagination] =
    useState<TablePagination | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestIdRef = useRef(0);
  const prevFiltersRef = useRef(filters);

  const updateFilter = (
    key: string,
    value: TableFilterValue | undefined,
  ) => {
    setFilters((current) => {
      if (value === undefined) {
        if (!(key in current)) {
          return current;
        }
        const next = { ...current };
        delete next[key];
        return next;
      }
      return { ...current, [key]: value };
    });
  };

  const clearAllFilters = () => {
    setFilters({});
  };

  const beginRequest = useCallback(() => {
    setLoading(true);
    setError(false);
  }, []);

  const resetPageToFirst = useCallback(() => {
    setPagination((current) =>
      current.page === 1 ? current : { ...current, page: 1 },
    );
  }, []);

  const reload = useCallback(() => {
    beginRequest();
    setReloadToken((token) => token + 1);
  }, [beginRequest]);

  useImperativeHandle(ref, () => ({ refresh: reload }), [reload]);

  const handleSortClick = (key: string) => {
    const next = cycleSort(sort, key);
    setSort(next);
    if (serverSide) {
      beginRequest();
      if (next !== sort) {
        resetPageToFirst();
      }
    }
  };

  const handlePageChange = (page: number) => {
    if (serverSide) {
      beginRequest();
    }
    setPagination((current) => ({ ...current, page }));
  };

  // Server mode debounces filter changes (~300ms); the page resets to 1 in the
  // same debounced request.
  useEffect(() => {
    if (!serverSide) {
      return;
    }
    const changed = prevFiltersRef.current !== filters;
    prevFiltersRef.current = filters;
    if (!changed) {
      return;
    }
    const id = setTimeout(() => {
      beginRequest();
      setDebouncedFilters(filters);
      resetPageToFirst();
    }, 300);
    return () => {
      clearTimeout(id);
    };
  }, [filters, serverSide, beginRequest, resetPageToFirst]);

  // Local mode fetches the full dataset on mount and again on each reload.
  useEffect(() => {
    if (serverSide) {
      return;
    }
    let active = true;
    const responsePromise = dataSourceRef.current({});
    responsePromise.then(
      (response) => {
        if (active) {
          setRows(response.rows);
          setLoading(false);
        }
      },
      () => {
        if (active) {
          setError(true);
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [serverSide, reloadToken]);

  // Server mode: fire dataSource on mount and immediately on pagination/sort
  // change, drop out-of-order responses via a monotonic request id plus the
  // effect-cleanup ignore flag.
  useEffect(() => {
    if (!serverSide) {
      return;
    }
    const requestId = ++requestIdRef.current;
    let active = true;

    const request: TableDataRequest = {
      pagination: { page: pagination.page, size: pagination.size },
      ...(sort
        ? {
            sort: {
              key: resolveRequestKey(
                sort.key,
                columnsRef.current[sort.key]?.sortable,
              ),
              direction: sort.direction,
            },
          }
        : {}),
      filters: Object.fromEntries(
        Object.entries(debouncedFilters).map(([key, value]) => [
          resolveFilterRequestKey(key, columnsRef.current[key]),
          value,
        ]),
      ),
    };

    const fail = () => {
      if (!active || requestIdRef.current !== requestId) {
        return;
      }
      setError(true);
      setLoading(false);
    };

    let responsePromise: Promise<TableDataResponse<T>>;
    try {
      responsePromise = Promise.resolve(dataSourceRef.current(request));
    } catch {
      fail();
      return;
    }
    responsePromise.then(
      (response) => {
        if (!active || requestIdRef.current !== requestId) {
          return;
        }
        setRows(response.rows);
        setMirroredPagination(response.pagination ?? null);
        setLoading(false);
      },
      () => {
        fail();
      },
    );
    return () => {
      active = false;
    };
  }, [
    serverSide,
    pagination.page,
    pagination.size,
    sort,
    debouncedFilters,
    reloadToken,
  ]);

  const visibleColumns = useMemo(
    () => Object.entries(config.columns).filter(([, column]) => !column.hidden),
    [config.columns],
  );

  const activeFilterChips = useMemo(() => {
    const chips: Array<[string, TableColumn<T>, TableFilterValue]> = [];
    for (const [key, column] of visibleColumns) {
      const value = filters[key];
      if (value !== undefined) {
        chips.push([key, column, value]);
      }
    }
    return chips;
  }, [visibleColumns, filters]);

  const showFilterSummary = config.filterSummary !== false;

  const filteredRows = useMemo(() => {
    if (!rows) {
      return [];
    }
    const entries = Object.entries(filters);
    if (entries.length === 0) {
      return rows;
    }
    return rows.filter((row) =>
      entries.every(([key, filter]) =>
        matchesFilter(row[key as keyof T], config.columns[key], filter),
      ),
    );
  }, [rows, filters, config.columns]);

  const total = filteredRows.length;
  const size = pagination.size;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const page = Math.min(Math.max(pagination.page, 1), totalPages);
  const start = (page - 1) * size;
  const end = Math.min(start + size, total);
  const sortedRows = useMemo(() => {
    if (!sort) {
      return filteredRows;
    }
    const column = config.columns[sort.key];
    const factor = sort.direction === "ascending" ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
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
      return compareRawValues(aValue, bValue, column) * factor;
    });
  }, [filteredRows, sort, config.columns]);
  const pageRows = sortedRows.slice(start, end);

  const displayPagination: TablePagination = serverSide
    ? mirroredPagination ?? {
        total: rows?.length ?? 0,
        size: pagination.size,
        page: 1,
        totalPages: Math.max(1, Math.ceil((rows?.length ?? 0) / pagination.size)),
      }
    : { total, size, page, totalPages };
  const displayFrom =
    displayPagination.total === 0
      ? 0
      : (displayPagination.page - 1) * displayPagination.size + 1;
  const displayTo = Math.min(
    displayPagination.page * displayPagination.size,
    displayPagination.total,
  );
  const bodyRows = serverSide ? rows ?? [] : pageRows;
  const hasActiveFilters = serverSide
    ? Object.keys(debouncedFilters).length > 0
    : Object.keys(filters).length > 0;

  return (
    <div>
      {config.caption || serverSide ? (
        <div className="flex items-center justify-between pb-2 text-left text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {config.caption ? <span>{config.caption}</span> : null}
          {serverSide ? (
            <button
              type="button"
              aria-label="Refresh"
              disabled={loading}
              onClick={reload}
              className="cursor-pointer rounded p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {REFRESH_ICON}
            </button>
          ) : null}
        </div>
      ) : null}
      {showFilterSummary && activeFilterChips.length > 0 ? (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {activeFilterChips.map(([key, column, value]) => {
            const label = column.label ?? key;
            const chipOptions = filterOptionSource(column);
            const resolveScalarText = (scalar: TableFilterScalar) =>
              Array.isArray(chipOptions)
                ? chipOptions.find((option) =>
                    Object.is(option.value, scalar),
                  )?.label ?? String(scalar)
                : String(scalar);
            const chipText = Array.isArray(value)
              ? value.map(resolveScalarText).join(", ")
              : resolveScalarText(value);
            return (
              <span
                key={key}
                className="flex items-center gap-1 rounded-md border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
              >
                <span>
                  {label}: {chipText}
                </span>
                <button
                  type="button"
                  aria-label={`Remove filter ${label}`}
                  onClick={() => updateFilter(key, undefined)}
                  className="cursor-pointer rounded p-0.5 leading-none text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  ×
                </button>
              </span>
            );
          })}
          <button
            type="button"
            onClick={clearAllFilters}
            className="cursor-pointer rounded-md border border-neutral-300 px-2 py-0.5 text-xs text-neutral-600 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
          >
            Clear all
          </button>
        </div>
      ) : null}
      <table className="w-full border-collapse text-sm">
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
                  className="relative px-3 py-2 font-medium text-neutral-900 dark:text-neutral-100"
                >
                  <div className="flex items-center gap-1">
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSortClick(key)}
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
                    {column.filterable ? (
                      <FilterControl
                        columnKey={key}
                        column={column}
                        value={filters[key]}
                        onChange={(value) => updateFilter(key, value)}
                        open={openFilterColumn === key}
                        onOpenChange={(nextOpen) =>
                          setOpenFilterColumn(nextOpen ? key : null)
                        }
                      />
                    ) : null}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody
          className={loading && !error ? LOADING_TBODY_CLASS : undefined}
        >
          {error ? (
            <tr>
              <td
                colSpan={visibleColumns.length}
                className="px-3 py-8 text-center text-neutral-500"
              >
                <span>{"Couldn't load data"}</span>
                <button
                  type="button"
                  onClick={reload}
                  className="ml-2 underline decoration-dotted underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-400"
                >
                  Retry
                </button>
              </td>
            </tr>
          ) : displayPagination.total === 0 ? (
            rows === null ? null : (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="px-3 py-8 text-center text-neutral-500"
                >
                  {hasActiveFilters ? (
                    <>
                      <span>No results match your filters</span>
                      <button
                        type="button"
                        onClick={clearAllFilters}
                        className="ml-2 underline decoration-dotted underline-offset-2 hover:text-neutral-700 dark:hover:text-neutral-400 cursor-pointer"
                      >
                        Clear filters
                      </button>
                    </>
                  ) : (
                    "No data yet"
                  )}
                </td>
              </tr>
            )
          ) : (
            bodyRows.map((row, index) => (
              <tr
                key={index}
                className="border-b border-neutral-200 dark:border-neutral-800"
              >
                {visibleColumns.map(([key, column]) => {
                  const classValue =
                    typeof column.class === "function"
                      ? column.class(row)
                      : column.class;
                  const cellClass = [classValue]
                    .filter((c): c is string => Boolean(c))
                    .join(" ");
                  return (
                    <td
                      key={key}
                      className={`px-3 py-2 align-top text-left text-neutral-700 dark:text-neutral-400${cellClass ? ` ${cellClass}` : ""}`}
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
        {error ? (
          "Couldn't load data"
        ) : loading ? (
          <span className="flex items-center gap-1.5">
            {LOADING_SPINNER}
            Loading…
          </span>
        ) : (
          `Showing ${displayFrom}–${displayTo} of ${displayPagination.total}`
        )}
      </div>

      <nav aria-label="Pagination" className="mt-3 flex items-center gap-1">
        <button
          type="button"
          onClick={() => handlePageChange(displayPagination.page - 1)}
          disabled={displayPagination.page <= 1}
          className={PAGER_EDGE_BUTTON_CLASS}
        >
          Previous
        </button>
        {Array.from(
          { length: displayPagination.totalPages },
          (_, i) => i + 1,
        ).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => handlePageChange(p)}
            aria-current={
              p === displayPagination.page ? "page" : undefined
            }
            className={
              p === displayPagination.page
                ? PAGER_CURRENT_BUTTON_CLASS
                : PAGER_BUTTON_CLASS
            }
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => handlePageChange(displayPagination.page + 1)}
          disabled={displayPagination.page >= displayPagination.totalPages}
          className={PAGER_EDGE_BUTTON_CLASS}
        >
          Next
        </button>
      </nav>
    </div>
  );
}