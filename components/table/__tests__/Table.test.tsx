import { describe, it, expect, vi, afterEach } from "vitest";
import { createRef } from "react";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  Table,
  type TableConfig,
  type TableDataRequest,
  type TableDataResponse,
  type TableFilterScalar,
  type TableHandle,
} from "../Table";
import type { FieldOption } from "@/components/field/Field";

type Person = {
  id: number;
  name: string;
  email: string | null;
  role: string;
};

const people = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `Person ${i + 1}`,
  email: `person${i + 1}@example.com`,
  role: i % 2 === 0 ? "admin" : "user",
}));

const columns: TableConfig<Person>["columns"] = {
  name: { type: "text", label: "Name" },
  email: { type: "text", label: "Email" },
  role: { type: "text", label: "Role" },
};

function makeConfig(
  rows: Person[],
  overrides: Partial<TableConfig<Person>> = {},
): TableConfig<Person> {
  return {
    dataSource: async () => ({ rows }),
    columns,
    ...overrides,
  };
}

const currentPageButtons = () =>
  screen
    .getAllByRole("button")
    .filter((button) => button.getAttribute("aria-current") === "page");

const filterTrigger = (name: string) =>
  screen.getByRole("button", { name: `Filter ${name}` });

const hasActiveDot = (trigger: HTMLElement) =>
  trigger.querySelector(".active-filter-dot") !== null;

async function renderLocal<T>(config: TableConfig<T>) {
  const utils = render(<Table config={config} />);
  await act(async () => {});
  return utils;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  cleanup();
});

describe("Table local mode", () => {
  it("renders the caption, all column headers, and the first page of rows as text cells", async () => {
    await renderLocal(makeConfig(people, { caption: "People" }));

    expect(screen.getByText("People")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Role" })).toBeInTheDocument();

    expect(screen.getByText("Person 1")).toBeInTheDocument();
    expect(screen.getByText("person1@example.com")).toBeInTheDocument();
    expect(screen.getByText("Person 10")).toBeInTheDocument();
    expect(screen.queryByText("Person 11")).not.toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(11);
  });

  it("renders a muted em-dash for empty cell values", async () => {
    await renderLocal(
      makeConfig([
        { id: 1, name: "Ada", email: null, role: "admin" },
        { id: 2, name: "Grace", email: "grace@example.com", role: "user" },
      ]),
    );

    const dash = screen.getByText("—");
    expect(dash).toHaveClass("text-neutral-400");
    const row = screen.getByText("Ada").closest("tr") as HTMLElement;
    expect(within(row).getByText("—")).toBeInTheDocument();
    expect(screen.getByText("grace@example.com")).toBeInTheDocument();
  });

  it("announces the showing summary in a single polite role=status region", async () => {
    await renderLocal(makeConfig(people));

    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toHaveAttribute("aria-live", "polite");
    expect(statuses[0]).toHaveTextContent("Showing 1–10 of 25");
  });

  it("marks exactly one page button aria-current=page and natively disables prev/next at the ends", async () => {
    await renderLocal(makeConfig(people));

    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(nav).getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(within(nav).getByRole("button", { name: "Next" })).toBeEnabled();

    let current = currentPageButtons();
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("1");

    fireEvent.click(within(nav).getByRole("button", { name: "3" }));

    expect(within(nav).getByRole("button", { name: "Previous" })).toBeEnabled();
    expect(within(nav).getByRole("button", { name: "Next" })).toBeDisabled();
    current = currentPageButtons();
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("3");
  });

  it("styles the current page button with a filled/inverted neutral style in light and dark mode, leaving other buttons unchanged", async () => {
    await renderLocal(makeConfig(people));

    const nav = screen.getByRole("navigation", { name: "Pagination" });
    const current = currentPageButtons();
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveAttribute("aria-current", "page");
    expect(current[0]).toHaveClass(
      "bg-neutral-900",
      "text-white",
      "dark:bg-neutral-100",
      "dark:text-neutral-900",
    );

    within(nav)
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-current") !== "page")
      .forEach((button) => {
        expect(button).not.toHaveClass("bg-neutral-900", "text-white");
      });
  });

  it("keeps the filled style on the current page button as the user navigates", async () => {
    await renderLocal(makeConfig(people));

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    const current = currentPageButtons();
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("2");
    expect(current[0]).toHaveAttribute("aria-current", "page");
    expect(current[0]).toHaveClass("bg-neutral-900", "text-white");
    expect(screen.getByRole("button", { name: "1" })).not.toHaveClass(
      "bg-neutral-900",
      "text-white",
    );
  });

  it("navigating pages updates the rendered rows and the summary", async () => {
    await renderLocal(makeConfig(people));

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    expect(screen.getByText("Person 11")).toBeInTheDocument();
    expect(screen.queryByText("Person 1")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 11–20 of 25");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Person 21")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 21–25 of 25");

    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByRole("status")).toHaveTextContent("Showing 11–20 of 25");
  });

  it("uses the optional pagination config for the initial page and size", async () => {
    await renderLocal(makeConfig(people, { pagination: { page: 2, size: 5 } }));

    expect(screen.getByText("Person 6")).toBeInTheDocument();
    expect(screen.getByText("Person 10")).toBeInTheDocument();
    expect(screen.queryByText("Person 5")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 6–10 of 25");

    const current = currentPageButtons();
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("2");
  });

  it("clamps an out-of-range seeded page to the last page and navigates from there", async () => {
    await renderLocal(makeConfig(people, { pagination: { page: 99 } }));

    expect(screen.getByText("Person 21")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 21–25 of 25");

    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(nav).getByRole("button", { name: "Previous" })).toBeEnabled();
    expect(within(nav).getByRole("button", { name: "Next" })).toBeDisabled();

    fireEvent.click(within(nav).getByRole("button", { name: "Previous" }));
    expect(screen.getByRole("status")).toHaveTextContent("Showing 11–20 of 25");
    expect(screen.getByText("Person 11")).toBeInTheDocument();
  });

  it("calls dataSource exactly once and never again on pagination", async () => {
    const dataSource = vi.fn(async () => ({ rows: people }));
    await renderLocal({ dataSource, columns });

    expect(dataSource).toHaveBeenCalledTimes(1);
    expect(dataSource).toHaveBeenCalledWith({});

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));

    expect(dataSource).toHaveBeenCalledTimes(1);
  });

  it("renders 'No data yet' across a column-spanning row when there are no rows", async () => {
    await renderLocal(makeConfig([]));

    const emptyCell = screen.getByText("No data yet").closest("td") as HTMLElement;
    expect(emptyCell).toHaveAttribute("colspan", "3");
    expect(screen.getByRole("status")).toHaveTextContent("Showing 0–0 of 0");
  });

  it("shows a loading spinner on first load while the dataSource promise is pending, then renders the rows", async () => {
    const d = deferred<TableDataResponse<Person>>();
    const dataSource: TableConfig<Person>["dataSource"] = vi.fn(() => d.promise);
    render(<Table config={{ dataSource, columns }} />);

    expect(dataSource).toHaveBeenCalledTimes(1);
    expect(dataSource).toHaveBeenCalledWith({});
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.queryByText("Person 1")).not.toBeInTheDocument();
    expect(screen.getAllByRole("rowgroup")[1]).toHaveClass("opacity-50");

    await act(async () => {
      d.resolve({ rows: people });
    });

    expect(screen.getByText("Person 1")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 1–10 of 25");
  });

  it("dims the body and shows a spinner while a Retry refresh is in flight", async () => {
    const d1 = deferred<TableDataResponse<Person>>();
    const d2 = deferred<TableDataResponse<Person>>();
    const dataSource: TableConfig<Person>["dataSource"] = vi
      .fn()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise);

    render(<Table config={{ dataSource, columns }} />);

    await act(async () => {
      d1.reject(new Error("boom"));
    });
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(dataSource).toHaveBeenCalledTimes(2);
    expect(dataSource).toHaveBeenLastCalledWith({});
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.getAllByRole("rowgroup")[1]).toHaveClass("opacity-50");

    await act(async () => {
      d2.resolve({ rows: people.slice(0, 10) });
    });

    expect(screen.getByText("Person 1")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 1–10 of 10");
  });

  it("shows 'Couldn't load data' with a Retry that re-fetches after a rejected fetch", async () => {
    const d1 = deferred<TableDataResponse<Person>>();
    const d2 = deferred<TableDataResponse<Person>>();
    const dataSource: TableConfig<Person>["dataSource"] = vi
      .fn()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise);

    render(<Table config={{ dataSource, columns }} />);

    await act(async () => {
      d1.reject(new Error("boom"));
    });

    expect(screen.getAllByText("Couldn't load data").length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent("Couldn't load data");
    const retry = screen.getByRole("button", { name: "Retry" });
    expect(retry).toBeInTheDocument();

    fireEvent.click(retry);

    expect(dataSource).toHaveBeenCalledTimes(2);
    expect(dataSource).toHaveBeenLastCalledWith({});

    await act(async () => {
      d2.resolve({ rows: people.slice(0, 10) });
    });

    expect(screen.getByText("Person 1")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument();
  });

  it("does not render a Refresh button in local mode", async () => {
    await renderLocal(makeConfig(people));

    expect(
      screen.queryByRole("button", { name: "Refresh" }),
    ).not.toBeInTheDocument();
  });

  it("re-fetches the full dataset on ref.refresh() with the loading dim and spinner", async () => {
    const d1 = deferred<TableDataResponse<Person>>();
    const d2 = deferred<TableDataResponse<Person>>();
    const dataSource: TableConfig<Person>["dataSource"] = vi
      .fn()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise);

    const ref = createRef<TableHandle>();
    render(<Table config={{ dataSource, columns }} ref={ref} />);

    await act(async () => {
      d1.resolve({ rows: people });
    });
    expect(screen.getByText("Person 1")).toBeInTheDocument();

    expect(ref.current).not.toBeNull();
    act(() => {
      ref.current?.refresh();
    });

    expect(dataSource).toHaveBeenCalledTimes(2);
    expect(dataSource).toHaveBeenLastCalledWith({});
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(screen.getAllByRole("rowgroup")[1]).toHaveClass("opacity-50");

    await act(async () => {
      d2.resolve({ rows: people.slice(0, 5) });
    });

    expect(screen.getByRole("status")).toHaveTextContent("Showing 1–5 of 5");
    expect(screen.queryByText("Person 6")).not.toBeInTheDocument();
  });
});

describe("Table column type renderers", () => {
  type Item = {
    id: number;
    name: string;
    joined: Date | string | null;
    updated: Date | null;
    tags: string[] | null;
    avatar: string | null;
    score: number | null;
  };

  const itemRows: Item[] = [
    {
      id: 1,
      name: "Ada",
      joined: new Date(2023, 5, 12),
      updated: new Date(2023, 10, 2, 14, 20),
      tags: ["design", "admin"],
      avatar: "/avatars/ada.png",
      score: 1234.5,
    },
    {
      id: 2,
      name: "Grace",
      joined: null,
      updated: null,
      tags: null,
      avatar: null,
      score: null,
    },
  ];

  const typeColumns: TableConfig<Item>["columns"] = {
    name: { type: "text", label: "Name" },
    joined: { type: "date", label: "Joined" },
    updated: { type: "datetime", label: "Updated" },
    tags: { type: "text", label: "Tags" },
    avatar: { type: "image", label: "Avatar" },
    score: { type: "number", label: "Score" },
  };

  function typeConfig(
    rows: Item[],
    overrides: Partial<TableConfig<Item>> = {},
  ): TableConfig<Item> {
    return {
      dataSource: async () => ({ rows }),
      columns: typeColumns,
      ...overrides,
    };
  }

  it("renders date cells as Intl short dates inside a native <time dateTime>", async () => {
    await renderLocal(typeConfig([itemRows[0]]));

    const dateTime = screen
      .getByText("Jun 12, 2023")
      .closest("time") as HTMLElement;
    expect(dateTime).toHaveAttribute("datetime", "2023-06-12");
  });

  it("renders datetime cells as Intl date + time inside a native <time dateTime>", async () => {
    await renderLocal(typeConfig([itemRows[0]]));

    const dateTime = screen
      .getByText("Nov 2, 2023, 14:20")
      .closest("time") as HTMLElement;
    expect(dateTime).toHaveAttribute("datetime", "2023-11-02T14:20");
  });

  it("accepts date strings and coerces them through the same date formatter", async () => {
    const row = { ...itemRows[0], joined: "2023-06-12T12:00:00" };
    await renderLocal(typeConfig([row]));

    expect(screen.getByText("Jun 12, 2023")).toBeInTheDocument();
  });

  it("falls back to the raw string for an unparseable date value", async () => {
    const row = { ...itemRows[0], joined: "garbage" };
    await renderLocal(typeConfig([row]));

    const text = screen.getByText("garbage");
    expect(text).toBeInTheDocument();
    expect(text.closest("time")).toBeNull();
  });

  it("renders array cells as a comma-joined string", async () => {
    await renderLocal(typeConfig([itemRows[0]]));

    expect(screen.getByText("design, admin")).toBeInTheDocument();
  });

  it("renders image cells as a small rounded img with a name-derived alt", async () => {
    await renderLocal(typeConfig([itemRows[0]]));

    const img = screen.getByRole("img", { name: "Ada thumbnail" });
    expect(img).toHaveAttribute("src", "/avatars/ada.png");
    expect(img).toHaveClass("h-10", "w-10", "rounded-lg", "shadow-sm");
  });

  it("renders image cells with an empty alt when the row has no name", async () => {
    const { container } = await renderLocal(
      typeConfig([{ ...itemRows[0], name: "" }]),
    );

    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("src", "/avatars/ada.png");
  });

  it("renders number cells as plain left-aligned raw strings", async () => {
    await renderLocal(typeConfig([itemRows[0]]));

    const score = screen.getByText("1234.5");
    expect(score).toBeInTheDocument();
    expect(screen.queryByText("1,234.5")).not.toBeInTheDocument();
    const td = score.closest("td") as HTMLElement;
    expect(td).toHaveClass("text-left");
  });

  it("runs a column transform before type rendering", async () => {
    const columns: TableConfig<Item>["columns"] = {
      joined: { type: "date", transform: () => new Date(2023, 5, 12) },
    };
    await renderLocal({
      dataSource: async () => ({ rows: [{ ...itemRows[0], joined: "garbage" }] }),
      columns,
    });

    expect(screen.getByText("Jun 12, 2023")).toBeInTheDocument();
    expect(screen.queryByText("garbage")).not.toBeInTheDocument();
  });

  it("renders the em-dash when a transform returns null", async () => {
    const columns: TableConfig<Item>["columns"] = {
      name: { type: "text", transform: () => null },
    };
    await renderLocal({
      dataSource: async () => ({ rows: [{ ...itemRows[0], name: "Ada" }] }),
      columns,
    });

    const dash = screen.getByText("—");
    expect(dash).toHaveClass("text-neutral-400");
    expect(screen.queryByText("Ada")).not.toBeInTheDocument();
  });

  it("applies a per-row class function to the cell", async () => {
    const columns: TableConfig<Item>["columns"] = {
      name: {
        type: "text",
        class: (row) =>
          row.score != null && row.score > 100
            ? "text-emerald-600"
            : "text-red-600",
      },
    };
    await renderLocal({
      dataSource: async () => ({ rows: itemRows }),
      columns,
    });

    const adaCell = screen.getByText("Ada").closest("td") as HTMLElement;
    expect(adaCell).toHaveClass("text-emerald-600");
    const graceCell = screen.getByText("Grace").closest("td") as HTMLElement;
    expect(graceCell).toHaveClass("text-red-600");
  });

  it("drops hidden columns entirely", async () => {
    const columns: TableConfig<Item>["columns"] = {
      name: { type: "text" },
      secret: { type: "text", hidden: true },
    };
    const row = { ...itemRows[0], secret: "s3cret" } as Item & {
      secret: string;
    };
    await renderLocal({
      dataSource: async () => ({ rows: [row] }),
      columns,
    });

    expect(screen.getAllByRole("columnheader")).toHaveLength(1);
    expect(screen.queryByRole("columnheader", { name: "secret" })).not.toBeInTheDocument();
    expect(screen.queryByText("s3cret")).not.toBeInTheDocument();
  });

  it("renders the muted em-dash for null/undefined values of every type", async () => {
    await renderLocal(typeConfig([itemRows[1]]));

    const dashes = screen.getAllByText("—");
    expect(dashes).toHaveLength(5);
    dashes.forEach((dash) => expect(dash).toHaveClass("text-neutral-400"));
  });
});

describe("Table local sort", () => {
  type SortableItem = {
    id: number;
    name: string;
    score: number | null;
    joined: string | null;
    tags: string[] | null;
    avatar: string | null;
  };

  const sortableRows: SortableItem[] = [
    { id: 1, name: "banana", score: 50, joined: "2023-01-15", tags: ["b"], avatar: "/b.png" },
    { id: 2, name: "Apple", score: null, joined: "2022-06-10", tags: ["a"], avatar: "/A.png" },
    { id: 3, name: "cherry", score: 10, joined: null, tags: [], avatar: "/c.png" },
  ];

  const sortableColumns: TableConfig<SortableItem>["columns"] = {
    name: { type: "text", label: "Name", sortable: "name" },
    score: { type: "number", label: "Score", sortable: "score" },
    joined: { type: "date", label: "Joined", sortable: "joined" },
    tags: { type: "text", label: "Tags", sortable: "tags" },
    avatar: { type: "image", label: "Avatar", sortable: "avatar" },
  };

  function sortableConfig(
    rows: SortableItem[] = sortableRows,
    overrides: Partial<TableConfig<SortableItem>> = {},
  ): TableConfig<SortableItem> {
    return {
      dataSource: async () => ({ rows }),
      columns: sortableColumns,
      ...overrides,
    };
  }

  const nameHeader = () => screen.getByRole("columnheader", { name: /name/i });
  const scoreHeader = () => screen.getByRole("columnheader", { name: /score/i });

  const clickSort = (header: HTMLElement) =>
    fireEvent.click(within(header).getByRole("button"));

  const hasDirectionIcon = (header: HTMLElement) =>
    within(header)
      .getByRole("button")
      .textContent?.includes("\u2191") ||
    within(header)
      .getByRole("button")
      .textContent?.includes("\u2193");

  it("cycles a sortable header ascending → descending → none, showing aria-sort and a direction icon only while sorted", async () => {
    await renderLocal(sortableConfig());

    const header = nameHeader();
    expect(header).toHaveAttribute("aria-sort", "none");
    expect(within(header).getAllByRole("button")).toHaveLength(1);

    clickSort(header);
    expect(header).toHaveAttribute("aria-sort", "ascending");
    expect(hasDirectionIcon(header)).toBe(true);

    clickSort(header);
    expect(header).toHaveAttribute("aria-sort", "descending");
    expect(hasDirectionIcon(header)).toBe(true);

    clickSort(header);
    expect(header).toHaveAttribute("aria-sort", "none");
    expect(hasDirectionIcon(header)).toBe(false);
  });

  it("clicking a different sortable column starts it ascending and clears the previous header's sort", async () => {
    await renderLocal(sortableConfig());

    const name = nameHeader();
    const score = scoreHeader();

    clickSort(name);
    clickSort(name);
    expect(name).toHaveAttribute("aria-sort", "descending");
    expect(hasDirectionIcon(name)).toBe(true);
    expect(score).toHaveAttribute("aria-sort", "none");
    expect(hasDirectionIcon(score)).toBe(false);

    clickSort(score);

    expect(score).toHaveAttribute("aria-sort", "ascending");
    expect(name).toHaveAttribute("aria-sort", "none");
    expect(hasDirectionIcon(score)).toBe(true);
    expect(hasDirectionIcon(name)).toBe(false);
  });

  const sortedRowNames = () =>
    screen
      .getAllByRole("row")
      .slice(1)
      .map((row) => row.querySelector("td")?.textContent);

  it("sorts number columns numerically on the raw value", async () => {
    await renderLocal(sortableConfig());

    clickSort(scoreHeader());

    expect(sortedRowNames()).toEqual(["cherry", "banana", "Apple"]);
  });

  it("sorts date columns chronologically on the raw value", async () => {
    await renderLocal(sortableConfig());

    clickSort(screen.getByRole("columnheader", { name: /joined/i }));

    expect(sortedRowNames()).toEqual(["Apple", "banana", "cherry"]);
  });

  it("sorts text columns case-insensitively on the raw value", async () => {
    await renderLocal(sortableConfig());

    clickSort(nameHeader());

    expect(sortedRowNames()).toEqual(["Apple", "banana", "cherry"]);
  });

  it("sorts array columns case-insensitively on the joined raw value", async () => {
    await renderLocal(sortableConfig());

    clickSort(screen.getByRole("columnheader", { name: /tags/i }));

    expect(sortedRowNames()).toEqual(["Apple", "banana", "cherry"]);
  });

  it("sorts image columns case-insensitively on the raw value", async () => {
    await renderLocal(sortableConfig());

    clickSort(screen.getByRole("columnheader", { name: /avatar/i }));

    expect(sortedRowNames()).toEqual(["Apple", "banana", "cherry"]);
  });

  it("sorts by the raw value, ignoring the column transform", async () => {
    const columns: TableConfig<SortableItem>["columns"] = {
      id: { type: "text", label: "Id" },
      name: {
        type: "text",
        label: "Name",
        sortable: "name",
        transform: (value) => String(value).split("").reverse().join(""),
      },
    };
    await renderLocal({
      dataSource: async () => ({ rows: sortableRows }),
      columns,
    });

    clickSort(screen.getByRole("columnheader", { name: /name/i }));

    expect(sortedRowNames()).toEqual(["2", "1", "3"]);
  });

  it("sorts empty values last in both directions", async () => {
    const rows: SortableItem[] = [
      { id: 1, name: "banana", score: 30, joined: "2023-01-15", tags: ["b"], avatar: "/b.png" },
      { id: 2, name: "Apple", score: 10, joined: "2022-06-10", tags: ["a"], avatar: "/a.png" },
      { id: 3, name: "cherry", score: null, joined: null, tags: [], avatar: null },
      { id: 4, name: "date", score: 20, joined: "2021-01-01", tags: ["c"], avatar: "/d.png" },
    ];
    await renderLocal(sortableConfig(rows));

    clickSort(scoreHeader());
    expect(sortedRowNames()).toEqual(["Apple", "date", "banana", "cherry"]);

    clickSort(scoreHeader());
    expect(sortedRowNames()).toEqual(["banana", "date", "Apple", "cherry"]);
  });

  it("keeps equal sort keys in their original order (stable) across asc and desc", async () => {
    const rows: SortableItem[] = [
      { id: 1, name: "banana", score: 5, joined: "2023-01-15", tags: ["b"], avatar: "/b.png" },
      { id: 2, name: "Apple", score: 5, joined: "2022-06-10", tags: ["a"], avatar: "/a.png" },
      { id: 3, name: "cherry", score: null, joined: null, tags: [], avatar: null },
      { id: 4, name: "date", score: 5, joined: "2021-01-01", tags: ["c"], avatar: "/d.png" },
    ];
    await renderLocal(sortableConfig(rows));

    clickSort(scoreHeader());
    expect(sortedRowNames()).toEqual(["banana", "Apple", "date", "cherry"]);

    clickSort(scoreHeader());
    expect(sortedRowNames()).toEqual(["banana", "Apple", "date", "cherry"]);

    clickSort(scoreHeader());
    expect(sortedRowNames()).toEqual(["banana", "Apple", "cherry", "date"]);

    clickSort(scoreHeader());
    expect(sortedRowNames()).toEqual(["banana", "Apple", "date", "cherry"]);
  });

  it("renders no sort control for a column without sortable", async () => {
    const columns: TableConfig<SortableItem>["columns"] = {
      name: { type: "text", label: "Name" },
      joined: { type: "date", label: "Joined" },
    };
    await renderLocal({
      dataSource: async () => ({ rows: sortableRows }),
      columns,
    });

    const header = screen.getByRole("columnheader", { name: "Name" });
    expect(header).not.toHaveAttribute("aria-sort");
    expect(within(header).queryByRole("button")).not.toBeInTheDocument();

    const joined = screen.getByRole("columnheader", { name: "Joined" });
    expect(within(joined).queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("Table local filter", () => {
  type FilterItem = {
    id: number;
    name: string;
    joined: string | Date | null;
    updated: string | null;
    tags: string[] | null;
    score: number | null;
    avatar: string | null;
  };

  const filterRows: FilterItem[] = [
    {
      id: 1,
      name: "Ada Lovelace",
      joined: "2023-06-12",
      updated: "2023-11-02T14:20",
      tags: ["design", "admin"],
      score: 1234.5,
      avatar: "/avatars/ada.png",
    },
    {
      id: 2,
      name: "Grace Hopper",
      joined: "2022-06-10",
      updated: "2022-08-15T09:00",
      tags: ["ops"],
      score: 100,
      avatar: "/avatars/grace.png",
    },
    {
      id: 3,
      name: "Alan Turing",
      joined: "2023-06-12",
      updated: "2024-01-01T00:00",
      tags: ["math", "crypto"],
      score: 10,
      avatar: "/avatars/alan.png",
    },
  ];

  const filterColumns: TableConfig<FilterItem>["columns"] = {
    name: { type: "text", label: "Name", filterable: "name" },
    joined: { type: "date", label: "Joined", filterable: "joined" },
    updated: { type: "datetime", label: "Updated", filterable: "updated" },
    tags: { type: "text", label: "Tags", filterable: "tags" },
    score: { type: "number", label: "Score", filterable: "score" },
    avatar: { type: "image", label: "Avatar", filterable: "avatar" },
  };

  function filterConfig(
    rows: FilterItem[] = filterRows,
    overrides: Partial<TableConfig<FilterItem>> = {},
  ): TableConfig<FilterItem> {
    return {
      dataSource: async () => ({ rows }),
      columns: filterColumns,
      ...overrides,
    };
  }

  const clickFilterTrigger = (name: string) =>
    fireEvent.click(screen.getByRole("button", { name: `Filter ${name}` }));

  it("renders no filter trigger for a column without filterable", async () => {
    await renderLocal(makeConfig(people));

    expect(
      screen.queryByRole("button", { name: /^Filter / }),
    ).not.toBeInTheDocument();
  });

  it("opens a labelled filter popover from the header trigger, closes on Escape, and returns focus", async () => {
    await renderLocal(filterConfig());

    const trigger = screen.getByRole("button", { name: "Filter Name" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-controls");

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const input = screen.getByLabelText("Filter by Name");
    expect(input).toHaveFocus();

    fireEvent.keyDown(input, { key: "Escape" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText("Filter by Name")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("renders a number input for number columns and a text input for every other type", async () => {
    await renderLocal(filterConfig());

    clickFilterTrigger("Score");
    expect(screen.getByLabelText("Filter by Score")).toHaveAttribute(
      "type",
      "number",
    );

    clickFilterTrigger("Joined");
    expect(screen.getByLabelText("Filter by Joined")).toHaveAttribute(
      "type",
      "text",
    );
    clickFilterTrigger("Tags");
    expect(screen.getByLabelText("Filter by Tags")).toHaveAttribute(
      "type",
      "text",
    );
    clickFilterTrigger("Updated");
    expect(screen.getByLabelText("Filter by Updated")).toHaveAttribute(
      "type",
      "text",
    );
  });

  it("matches text filters case-insensitively on containment and updates the summary", async () => {
    await renderLocal(filterConfig());

    clickFilterTrigger("Name");
    fireEvent.change(screen.getByLabelText("Filter by Name"), {
      target: { value: "LOVE" },
    });

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();
    expect(screen.queryByText("Alan Turing")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 1–1 of 1");
  });

  it("matches array filters case-insensitively on the joined value", async () => {
    await renderLocal(filterConfig());

    clickFilterTrigger("Tags");
    fireEvent.change(screen.getByLabelText("Filter by Tags"), {
      target: { value: "CRYPTO" },
    });

    expect(screen.getByText("Alan Turing")).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();
  });

  it("matches number filters exactly, never by prefix or containment", async () => {
    await renderLocal(filterConfig());

    clickFilterTrigger("Score");
    const input = screen.getByLabelText("Filter by Score");

    fireEvent.change(input, { target: { value: "10" } });
    expect(screen.getByText("Alan Turing")).toBeInTheDocument();
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "1234" } });
    expect(
      screen.getByText("No results match your filters"),
    ).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "1234.5" } });
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("matches date filters exactly on the date parts", async () => {
    await renderLocal(filterConfig());

    clickFilterTrigger("Joined");
    const input = screen.getByLabelText("Filter by Joined");

    fireEvent.change(input, { target: { value: "2023-06-12" } });
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Alan Turing")).toBeInTheDocument();
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "garbage" } });
    expect(
      screen.getByText("No results match your filters"),
    ).toBeInTheDocument();
  });

  it("matches datetime filters exactly on the date and time parts", async () => {
    await renderLocal(filterConfig());

    clickFilterTrigger("Updated");
    const input = screen.getByLabelText("Filter by Updated");

    fireEvent.change(input, { target: { value: "2023-11-02T14:20" } });
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();
    expect(screen.queryByText("Alan Turing")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "2023-11-02T14:20:30" } });
    expect(
      screen.getByText("No results match your filters"),
    ).toBeInTheDocument();
  });

  it("matches a Date-instance cell value to a date-only filter string", async () => {
    const rows: FilterItem[] = [
      {
        id: 1,
        name: "Ada",
        joined: new Date(2023, 5, 12),
        updated: "2023-11-02T14:20",
        tags: ["a"],
        score: 1,
        avatar: "/a.png",
      },
    ];
    await renderLocal(filterConfig(rows));

    clickFilterTrigger("Joined");
    fireEvent.change(screen.getByLabelText("Filter by Joined"), {
      target: { value: "2023-06-12" },
    });

    expect(screen.getByText("Ada")).toBeInTheDocument();
  });

  it("yields zero results for any filter value on a filterable image column", async () => {
    await renderLocal(filterConfig());

    clickFilterTrigger("Avatar");
    fireEvent.change(screen.getByLabelText("Filter by Avatar"), {
      target: { value: "/avatars/ada.png" },
    });

    expect(
      screen.getByText("No results match your filters"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
  });

  it("removes a column from the active filters when its input is cleared", async () => {
    await renderLocal(filterConfig());

    clickFilterTrigger("Name");
    const input = screen.getByLabelText("Filter by Name");
    fireEvent.change(input, { target: { value: "LOVE" } });
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: "" } });
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
  });

  it("combines filters across columns with AND semantics", async () => {
    await renderLocal(filterConfig());

    clickFilterTrigger("Name");
    fireEvent.change(screen.getByLabelText("Filter by Name"), {
      target: { value: "a" },
    });
    clickFilterTrigger("Score");
    fireEvent.change(screen.getByLabelText("Filter by Score"), {
      target: { value: "10" },
    });

    expect(screen.getByText("Alan Turing")).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(screen.queryByText("Grace Hopper")).not.toBeInTheDocument();
  });

  it("shows 'No results match your filters' with a Clear filters action that removes every filter", async () => {
    await renderLocal(filterConfig());

    clickFilterTrigger("Name");
    fireEvent.change(screen.getByLabelText("Filter by Name"), {
      target: { value: "zzz" },
    });

    expect(
      screen.getByText("No results match your filters"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(
      screen.queryByText("No results match your filters"),
    ).not.toBeInTheDocument();
  });

  it("closes an open filter popover when the user clicks anywhere outside it and its trigger", async () => {
    await renderLocal(filterConfig());

    const trigger = screen.getByRole("button", { name: "Filter Name" });
    fireEvent.click(trigger);
    expect(screen.getByLabelText("Filter by Name")).toBeInTheDocument();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByLabelText("Filter by Name")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles its own popover closed when the filter trigger is clicked again", async () => {
    await renderLocal(filterConfig());

    const trigger = screen.getByRole("button", { name: "Filter Name" });
    fireEvent.click(trigger);
    expect(screen.getByLabelText("Filter by Name")).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(screen.queryByLabelText("Filter by Name")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps only one filter popover open at a time across columns", async () => {
    await renderLocal(filterConfig());

    fireEvent.click(screen.getByRole("button", { name: "Filter Name" }));
    expect(screen.getByLabelText("Filter by Name")).toBeInTheDocument();

    const scoreTrigger = screen.getByRole("button", { name: "Filter Score" });
    fireEvent.pointerDown(scoreTrigger);
    fireEvent.click(scoreTrigger);

    expect(screen.queryByLabelText("Filter by Name")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Filter by Score")).toBeInTheDocument();
    expect(scoreTrigger).toHaveAttribute("aria-expanded", "true");
  });

  it("keeps the filter popover open while the user types in its input", async () => {
    await renderLocal(filterConfig());

    fireEvent.click(screen.getByRole("button", { name: "Filter Name" }));
    const input = screen.getByLabelText("Filter by Name");

    fireEvent.keyDown(input, { key: "a" });
    fireEvent.change(input, { target: { value: "LOVE" } });
    fireEvent.pointerDown(input);

    expect(screen.getByLabelText("Filter by Name")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
  });

  it("shows a dot on the filter trigger of a column with an active filter", async () => {
    await renderLocal(filterConfig());

    expect(hasActiveDot(filterTrigger("Name"))).toBe(false);

    clickFilterTrigger("Name");
    fireEvent.change(screen.getByLabelText("Filter by Name"), {
      target: { value: "LOVE" },
    });

    expect(hasActiveDot(filterTrigger("Name"))).toBe(true);
  });

  it("shows no dot on columns without an active filter", async () => {
    await renderLocal(filterConfig());

    expect(hasActiveDot(filterTrigger("Name"))).toBe(false);
    expect(hasActiveDot(filterTrigger("Score"))).toBe(false);

    clickFilterTrigger("Name");
    fireEvent.change(screen.getByLabelText("Filter by Name"), {
      target: { value: "LOVE" },
    });

    expect(hasActiveDot(filterTrigger("Name"))).toBe(true);
    expect(hasActiveDot(filterTrigger("Score"))).toBe(false);
  });

  it("renders no dot on non-filterable columns while a filterable sibling is active", async () => {
    const mixedColumns: TableConfig<FilterItem>["columns"] = {
      name: { type: "text", label: "Name", filterable: "name" },
      role: { type: "text", label: "Role" },
    };
    await renderLocal({
      dataSource: async () => ({ rows: filterRows }),
      columns: mixedColumns,
    });

    clickFilterTrigger("Name");
    fireEvent.change(screen.getByLabelText("Filter by Name"), {
      target: { value: "LOVE" },
    });

    expect(hasActiveDot(filterTrigger("Name"))).toBe(true);
    expect(
      screen.queryByRole("button", { name: "Filter Role" }),
    ).not.toBeInTheDocument();
  });

  it("removes the dot from the trigger when its filter input is cleared", async () => {
    await renderLocal(filterConfig());

    clickFilterTrigger("Name");
    const input = screen.getByLabelText("Filter by Name");
    fireEvent.change(input, { target: { value: "LOVE" } });
    expect(hasActiveDot(filterTrigger("Name"))).toBe(true);

    fireEvent.change(input, { target: { value: "" } });

    expect(hasActiveDot(filterTrigger("Name"))).toBe(false);
  });

  it("renders the dot as decorative and preserves the trigger's active tint", async () => {
    await renderLocal(filterConfig());

    clickFilterTrigger("Name");
    fireEvent.change(screen.getByLabelText("Filter by Name"), {
      target: { value: "LOVE" },
    });

    const trigger = filterTrigger("Name");
    expect(trigger).toHaveClass(
      "text-neutral-900",
      "dark:text-neutral-100",
    );

    const dot = trigger.querySelector(".active-filter-dot") as HTMLElement;
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveAttribute("aria-hidden", "true");
  });

  it("renders a summary strip above the table with a 'label: value' chip per active filter and a Clear all button", async () => {
    const { container } = await renderLocal(filterConfig());

    clickFilterTrigger("Name");
    fireEvent.change(screen.getByLabelText("Filter by Name"), {
      target: { value: "LOVE" },
    });
    clickFilterTrigger("Score");
    fireEvent.change(screen.getByLabelText("Filter by Score"), {
      target: { value: "10" },
    });

    const nameChip = screen.getByText("Name: LOVE");
    const scoreChip = screen.getByText("Score: 10");
    expect(nameChip).toBeInTheDocument();
    expect(scoreChip).toBeInTheDocument();

    const clearAll = screen.getByRole("button", { name: "Clear all" });
    expect(clearAll).toBeInTheDocument();

    const strip = nameChip.closest("div") as HTMLElement;
    expect(strip).toContainElement(scoreChip);
    expect(strip).toContainElement(clearAll);
    const table = container.querySelector("table") as HTMLElement;
    expect(strip.compareDocumentPosition(table)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("orders summary chips by column order, not the order filters were applied", async () => {
    await renderLocal(filterConfig());

    clickFilterTrigger("Score");
    fireEvent.change(screen.getByLabelText("Filter by Score"), {
      target: { value: "10" },
    });
    clickFilterTrigger("Name");
    fireEvent.change(screen.getByLabelText("Filter by Name"), {
      target: { value: "LOVE" },
    });

    const strip = screen
      .getByRole("button", { name: "Clear all" })
      .closest("div") as HTMLElement;
    const chipTexts = within(strip)
      .getAllByText(/\S+: /)
      .map((node) => node.textContent);
    expect(chipTexts).toEqual(["Name: LOVE", "Score: 10"]);
  });

  it("removes only the matching filter when a chip's remove button is clicked", async () => {
    await renderLocal(filterConfig());

    clickFilterTrigger("Name");
    fireEvent.change(screen.getByLabelText("Filter by Name"), {
      target: { value: "LOVE" },
    });
    clickFilterTrigger("Score");
    fireEvent.change(screen.getByLabelText("Filter by Score"), {
      target: { value: "10" },
    });

    expect(screen.getByText("Name: LOVE")).toBeInTheDocument();
    expect(screen.getByText("Score: 10")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove filter Name" }));

    expect(screen.queryByText("Name: LOVE")).not.toBeInTheDocument();
    expect(screen.getByText("Score: 10")).toBeInTheDocument();
    expect(screen.getByText("Alan Turing")).toBeInTheDocument();
    expect(screen.queryByText("Ada Lovelace")).not.toBeInTheDocument();
    expect(hasActiveDot(filterTrigger("Name"))).toBe(false);
    expect(hasActiveDot(filterTrigger("Score"))).toBe(true);
  });

  it("removes the strip entirely when the last active filter is removed from a chip", async () => {
    await renderLocal(filterConfig());

    clickFilterTrigger("Name");
    fireEvent.change(screen.getByLabelText("Filter by Name"), {
      target: { value: "LOVE" },
    });
    expect(screen.getByRole("button", { name: "Clear all" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Remove filter Name" }));

    expect(
      screen.queryByRole("button", { name: "Clear all" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Name: LOVE")).not.toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("Alan Turing")).toBeInTheDocument();
  });

  it("clears every filter when the Clear all button is clicked", async () => {
    await renderLocal(filterConfig());

    clickFilterTrigger("Name");
    fireEvent.change(screen.getByLabelText("Filter by Name"), {
      target: { value: "LOVE" },
    });
    clickFilterTrigger("Score");
    fireEvent.change(screen.getByLabelText("Filter by Score"), {
      target: { value: "10" },
    });

    expect(screen.getByText("Name: LOVE")).toBeInTheDocument();
    expect(screen.getByText("Score: 10")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));

    expect(screen.queryByText("Name: LOVE")).not.toBeInTheDocument();
    expect(screen.queryByText("Score: 10")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear all" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText("Alan Turing")).toBeInTheDocument();
    expect(hasActiveDot(filterTrigger("Name"))).toBe(false);
    expect(hasActiveDot(filterTrigger("Score"))).toBe(false);
  });

  it("hides the summary strip when filterSummary is false but keeps the trigger dots", async () => {
    await renderLocal(filterConfig(undefined, { filterSummary: false }));

    clickFilterTrigger("Name");
    fireEvent.change(screen.getByLabelText("Filter by Name"), {
      target: { value: "LOVE" },
    });

    expect(screen.queryByText("Name: LOVE")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Clear all" }),
    ).not.toBeInTheDocument();
    expect(hasActiveDot(filterTrigger("Name"))).toBe(true);
  });

  it("gives the chip remove and Clear all buttons accessible names and readable chip text", async () => {
    await renderLocal(filterConfig());

    clickFilterTrigger("Name");
    fireEvent.change(screen.getByLabelText("Filter by Name"), {
      target: { value: "LOVE" },
    });

    expect(screen.getByRole("button", { name: "Remove filter Name" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear all" })).toBeInTheDocument();
    expect(screen.getByText("Name: LOVE")).toBeInTheDocument();
  });

  it("renders no summary strip when the table first renders with no filters", async () => {
    await renderLocal(filterConfig());

    expect(
      screen.queryByRole("button", { name: "Clear all" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/^[^:]+: /)).not.toBeInTheDocument();
  });
});

describe("Table server mode", () => {
  type ServerRow = {
    id: number;
    name: string;
    score: number;
  };

  const serverRows: ServerRow[] = Array.from({ length: 25 }, (_, i) => ({
    id: i + 1,
    name: `Person ${i + 1}`,
    score: (i + 1) * 10,
  }));

  const serverColumns: TableConfig<ServerRow>["columns"] = {
    name: {
      type: "text",
      label: "Name",
      sortable: "name",
      filterable: "name",
    },
    score: {
      type: "number",
      label: "Score",
      sortable: "score_key",
      filterable: "score_filter",
    },
  };

  function serverConfig(
    dataSource: TableConfig<ServerRow>["dataSource"],
    overrides: Partial<TableConfig<ServerRow>> = {},
  ): TableConfig<ServerRow> {
    return { dataSource, columns: serverColumns, serverSide: true, ...overrides };
  }

  const pageOne: TableDataResponse<ServerRow> = {
    rows: serverRows.slice(0, 10),
    pagination: { total: 25, size: 10, page: 1, totalPages: 3 },
  };
  const pageTwo: TableDataResponse<ServerRow> = {
    rows: serverRows.slice(10, 20),
    pagination: { total: 25, size: 10, page: 2, totalPages: 3 },
  };
  const pageThree: TableDataResponse<ServerRow> = {
    rows: serverRows.slice(20, 25),
    pagination: { total: 25, size: 10, page: 3, totalPages: 3 },
  };

  it("fires dataSource on mount and immediately on page change, carrying pagination and filters", async () => {
    const dataSource = vi.fn(
      async (request: TableDataRequest): Promise<TableDataResponse<ServerRow>> => {
        const size = request.pagination?.size ?? 10;
        const page = request.pagination?.page ?? 1;
        return {
          rows: serverRows.slice((page - 1) * size, page * size),
          pagination: {
            total: serverRows.length,
            size,
            page,
            totalPages: Math.ceil(serverRows.length / size),
          },
        };
      },
    );

    render(<Table config={serverConfig(dataSource)} />);

    expect(dataSource).toHaveBeenCalledTimes(1);
    expect(dataSource).toHaveBeenLastCalledWith({
      pagination: { page: 1, size: 10 },
      filters: {},
    });

    await act(async () => {});
    expect(screen.getByText("Person 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    expect(dataSource).toHaveBeenCalledTimes(2);
    expect(dataSource).toHaveBeenLastCalledWith({
      pagination: { page: 2, size: 10 },
      filters: {},
    });

    await act(async () => {});
    expect(screen.getByText("Person 11")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 11–20 of 25");
  });

  it("fires immediately on sort change, resets the page to 1, and uses the sortable request key", async () => {
    const dataSource = vi.fn(
      async (request: TableDataRequest): Promise<TableDataResponse<ServerRow>> => ({
        rows: serverRows,
        pagination: {
          total: serverRows.length,
          size: 10,
          page: request.pagination?.page ?? 1,
          totalPages: 3,
        },
      }),
    );

    render(
      <Table config={serverConfig(dataSource, { pagination: { page: 3 } })} />,
    );
    await act(async () => {});
    dataSource.mockClear();

    const scoreHeader = screen.getByRole("columnheader", { name: /score/i });
    fireEvent.click(within(scoreHeader).getByRole("button", { name: "Score" }));

    expect(dataSource).toHaveBeenCalledTimes(1);
    expect(dataSource).toHaveBeenLastCalledWith({
      pagination: { page: 1, size: 10 },
      sort: { key: "score_key", direction: "ascending" },
      filters: {},
    });

    await act(async () => {});
  });

  it("debounces filter changes ~300ms, resets the page to 1 in the same request, and uses the filterable request key", async () => {
    vi.useFakeTimers();
    try {
      const dataSource = vi.fn(
        async (): Promise<TableDataResponse<ServerRow>> => ({
          rows: [],
          pagination: { total: 0, size: 10, page: 1, totalPages: 1 },
        }),
      );

      render(
        <Table config={serverConfig(dataSource, { pagination: { page: 3 } })} />,
      );
      await act(async () => {});
      dataSource.mockClear();

      fireEvent.click(screen.getByRole("button", { name: "Filter Score" }));
      fireEvent.change(screen.getByLabelText("Filter by Score"), {
        target: { value: "10" },
      });

      await act(async () => {
        vi.advanceTimersByTime(100);
      });
      expect(dataSource).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(200);
      });
      await act(async () => {});

      expect(dataSource).toHaveBeenCalledTimes(1);
      expect(dataSource).toHaveBeenLastCalledWith({
        pagination: { page: 1, size: 10 },
        filters: { score_filter: 10 },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps prior rows dimmed with a spinner in the status region while loading", async () => {
    const d1 = deferred<TableDataResponse<ServerRow>>();
    const d2 = deferred<TableDataResponse<ServerRow>>();
    const dataSource = vi
      .fn()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise);

    render(<Table config={serverConfig(dataSource)} />);

    await act(async () => {
      d1.resolve(pageOne);
    });
    expect(screen.getByText("Person 1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    const tbody = screen.getByText("Person 1").closest("tbody") as HTMLElement;
    expect(tbody).toHaveClass("opacity-50");
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");

    await act(async () => {
      d2.resolve(pageTwo);
    });

    const tbodyAfter = screen
      .getByText("Person 11")
      .closest("tbody") as HTMLElement;
    expect(tbodyAfter).not.toHaveClass("opacity-50");
    expect(screen.getByRole("status")).toHaveTextContent("Showing 11–20 of 25");
  });

  it("replaces the body with a neutral message and a Retry that re-fires the last request", async () => {
    const d1 = deferred<TableDataResponse<ServerRow>>();
    const d2 = deferred<TableDataResponse<ServerRow>>();
    const dataSource = vi
      .fn()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise);

    render(
      <Table config={serverConfig(dataSource, { pagination: { page: 2 } })} />,
    );

    await act(async () => {
      d1.reject(new Error("boom"));
    });

    expect(screen.getAllByText("Couldn't load data").length).toBeGreaterThan(0);
    expect(screen.getByRole("status")).toHaveTextContent("Couldn't load data");
    const retry = screen.getByRole("button", { name: "Retry" });
    expect(retry).toBeInTheDocument();

    fireEvent.click(retry);

    expect(dataSource).toHaveBeenCalledTimes(2);
    expect(dataSource).toHaveBeenLastCalledWith({
      pagination: { page: 2, size: 10 },
      filters: {},
    });

    await act(async () => {
      d2.resolve(pageTwo);
    });

    expect(screen.getByText("Person 11")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument();
  });

  it("drops out-of-order responses so only the latest request's result applies", async () => {
    const d1 = deferred<TableDataResponse<ServerRow>>();
    const d2 = deferred<TableDataResponse<ServerRow>>();
    const d3 = deferred<TableDataResponse<ServerRow>>();
    const dataSource = vi
      .fn()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise)
      .mockReturnValueOnce(d3.promise);

    render(<Table config={serverConfig(dataSource)} />);

    await act(async () => {
      d1.resolve(pageOne);
    });

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "3" }));

    await act(async () => {
      d3.resolve(pageThree);
    });
    expect(screen.getByText("Person 21")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 21–25 of 25");

    await act(async () => {
      d2.resolve(pageTwo);
    });

    expect(screen.getByText("Person 21")).toBeInTheDocument();
    expect(screen.queryByText("Person 11")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 21–25 of 25");
  });

  it("keeps the failure visible when an earlier request succeeds after a later one failed", async () => {
    const d1 = deferred<TableDataResponse<ServerRow>>();
    const d2 = deferred<TableDataResponse<ServerRow>>();
    const d3 = deferred<TableDataResponse<ServerRow>>();
    const dataSource = vi
      .fn()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise)
      .mockReturnValueOnce(d3.promise);

    render(<Table config={serverConfig(dataSource)} />);

    await act(async () => {
      d1.resolve(pageOne);
    });

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "3" }));

    await act(async () => {
      d3.reject(new Error("boom"));
    });
    expect(screen.getAllByText("Couldn't load data").length).toBeGreaterThan(0);

    await act(async () => {
      d2.resolve(pageTwo);
    });

    expect(screen.getAllByText("Couldn't load data").length).toBeGreaterThan(0);
    expect(screen.queryByText("Person 11")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("mirrors the response pagination in the pager without re-deriving or clamping", async () => {
    const dataSource = vi.fn(async () => ({
      rows: serverRows.slice(0, 3),
      pagination: { total: 42, size: 10, page: 3, totalPages: 5 },
    }));
    render(<Table config={serverConfig(dataSource)} />);
    await act(async () => {});

    expect(screen.getByRole("status")).toHaveTextContent("Showing 21–30 of 42");

    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(nav).getByRole("button", { name: "Previous" })).toBeEnabled();
    expect(within(nav).getByRole("button", { name: "Next" })).toBeEnabled();

    const current = within(nav)
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("3");
    expect(within(nav).getByRole("button", { name: "5" })).toBeInTheDocument();
  });

  it("falls back to default pagination when the response omits it", async () => {
    const dataSource = vi.fn(async () => ({
      rows: serverRows.slice(0, 3),
    }));
    render(
      <Table config={serverConfig(dataSource, { pagination: { size: 5 } })} />,
    );
    await act(async () => {});

    expect(screen.getByRole("status")).toHaveTextContent("Showing 1–3 of 3");

    const nav = screen.getByRole("navigation", { name: "Pagination" });
    const current = within(nav)
      .getAllByRole("button")
      .filter((button) => button.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("1");
    expect(within(nav).getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(within(nav).getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("keys the empty-state message to the last-confirmed request's filters, not live typing", async () => {
    vi.useFakeTimers();
    try {
      const dataSource = vi.fn(async () => ({
        rows: [],
        pagination: { total: 0, size: 10, page: 1, totalPages: 1 },
      }));
      render(<Table config={serverConfig(dataSource)} />);
      await act(async () => {});
      expect(screen.getByText("No data yet")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Filter Name" }));
      fireEvent.change(screen.getByLabelText("Filter by Name"), {
        target: { value: "zzz" },
      });

      expect(screen.getByText("No data yet")).toBeInTheDocument();
      expect(
        screen.queryByText("No results match your filters"),
      ).not.toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      await act(async () => {});

      expect(
        screen.getByText("No results match your filters"),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
      expect(
        screen.getByText("No results match your filters"),
      ).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      await act(async () => {});

      expect(screen.getByText("No data yet")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the trigger dot while a value is typed but not yet applied in the debounce window", async () => {
    vi.useFakeTimers();
    try {
      const dataSource = vi.fn(async () => ({
        rows: [],
        pagination: { total: 0, size: 10, page: 1, totalPages: 1 },
      }));
      render(<Table config={serverConfig(dataSource)} />);
      await act(async () => {});
      dataSource.mockClear();

      const nameTrigger = filterTrigger("Name");
      expect(hasActiveDot(nameTrigger)).toBe(false);

      fireEvent.click(screen.getByRole("button", { name: "Filter Name" }));
      fireEvent.change(screen.getByLabelText("Filter by Name"), {
        target: { value: "Ada" },
      });

      expect(hasActiveDot(nameTrigger)).toBe(true);
      expect(dataSource).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      await act(async () => {});
    } finally {
      vi.useRealTimers();
    }
  });

  it("removes the trigger dot in server mode once the filter is cleared", async () => {
    vi.useFakeTimers();
    try {
      const dataSource = vi.fn(async () => ({
        rows: [],
        pagination: { total: 0, size: 10, page: 1, totalPages: 1 },
      }));
      render(<Table config={serverConfig(dataSource)} />);
      await act(async () => {});
      dataSource.mockClear();

      const nameTrigger = filterTrigger("Name");
      fireEvent.click(screen.getByRole("button", { name: "Filter Name" }));
      const input = screen.getByLabelText("Filter by Name");
      fireEvent.change(input, { target: { value: "Ada" } });
      expect(hasActiveDot(nameTrigger)).toBe(true);

      fireEvent.change(input, { target: { value: "" } });

      expect(hasActiveDot(nameTrigger)).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the summary chip immediately while typing, before the debounce applies", async () => {
    vi.useFakeTimers();
    try {
      const dataSource = vi.fn(
        async (): Promise<TableDataResponse<ServerRow>> => ({
          rows: [],
          pagination: { total: 0, size: 10, page: 1, totalPages: 1 },
        }),
      );

      render(<Table config={serverConfig(dataSource)} />);
      await act(async () => {});
      dataSource.mockClear();

      expect(
        screen.queryByRole("button", { name: "Clear all" }),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Filter Name" }));
      fireEvent.change(screen.getByLabelText("Filter by Name"), {
        target: { value: "Ada" },
      });

      expect(screen.getByText("Name: Ada")).toBeInTheDocument();
      expect(dataSource).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      await act(async () => {});
    } finally {
      vi.useRealTimers();
    }
  });

  it("removing a chip filter in server mode debounces the request, resets to page 1, and keeps other filters", async () => {
    vi.useFakeTimers();
    try {
      const dataSource = vi.fn(
        async (
          request: TableDataRequest,
        ): Promise<TableDataResponse<ServerRow>> => {
          const size = request.pagination?.size ?? 10;
          const page = request.pagination?.page ?? 1;
          return {
            rows: serverRows.slice((page - 1) * size, page * size),
            pagination: {
              total: serverRows.length,
              size,
              page,
              totalPages: Math.ceil(serverRows.length / size),
            },
          };
        },
      );

      render(
        <Table config={serverConfig(dataSource, { pagination: { page: 3 } })} />,
      );
      await act(async () => {});
      dataSource.mockClear();

      fireEvent.click(screen.getByRole("button", { name: "Filter Name" }));
      fireEvent.change(screen.getByLabelText("Filter by Name"), {
        target: { value: "Ada" },
      });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      await act(async () => {});

      fireEvent.click(screen.getByRole("button", { name: "Filter Score" }));
      fireEvent.change(screen.getByLabelText("Filter by Score"), {
        target: { value: "10" },
      });
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      await act(async () => {});
      dataSource.mockClear();

      fireEvent.click(screen.getByRole("button", { name: "2" }));
      await act(async () => {});
      dataSource.mockClear();

      expect(
        screen.getByRole("button", { name: "Remove filter Score" }),
      ).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: "Remove filter Score" }),
      );

      expect(dataSource).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      await act(async () => {});

      expect(dataSource).toHaveBeenCalledTimes(1);
      expect(dataSource).toHaveBeenLastCalledWith({
        pagination: { page: 1, size: 10 },
        filters: { name: "Ada" },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders a Refresh button in the top-right of the header above the table", async () => {
    const dataSource = vi.fn(async () => pageOne);
    const { container } = render(
      <Table config={serverConfig(dataSource, { caption: "Server table" })} />,
    );
    await act(async () => {});

    const refresh = screen.getByRole("button", { name: "Refresh" });
    const header = refresh.closest("div") as HTMLElement;
    expect(header).toHaveClass("justify-between");
    expect(header).toHaveTextContent("Server table");
    expect(header).toContainElement(refresh);
    const table = container.querySelector("table") as HTMLElement;
    expect(header.compareDocumentPosition(table)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("renders the caption and Refresh button in a header above the table, not inside a native caption", async () => {
    const dataSource = vi.fn(async () => pageOne);
    const { container } = render(
      <Table config={serverConfig(dataSource, { caption: "Server table" })} />,
    );
    await act(async () => {});

    const table = container.querySelector("table") as HTMLElement;
    expect(table).toBeInTheDocument();
    expect(container.querySelector("caption")).not.toBeInTheDocument();

    const refresh = screen.getByRole("button", { name: "Refresh" });
    expect(table.contains(refresh)).toBe(false);

    const captionText = screen.getByText("Server table");
    expect(table.contains(captionText)).toBe(false);

    const header = captionText.closest("div") as HTMLElement;
    expect(header).not.toBeNull();
    expect(header.contains(refresh)).toBe(true);
    expect(header.compareDocumentPosition(table)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("disables the Refresh button while a request is in flight and enables it once resolved", async () => {
    const d = deferred<TableDataResponse<ServerRow>>();
    const dataSource = vi.fn(() => d.promise);
    render(<Table config={serverConfig(dataSource)} />);

    expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();

    await act(async () => {
      d.resolve(pageOne);
    });

    expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
  });

  it("re-fires the current request on Refresh click, keeping page, sort, and filters", async () => {
    vi.useFakeTimers();
    try {
      const dataSource = vi.fn(
        async (
          request: TableDataRequest,
        ): Promise<TableDataResponse<ServerRow>> => ({
          rows: serverRows.slice(0, 10),
          pagination: {
            total: serverRows.length,
            size: 10,
            page: request.pagination?.page ?? 1,
            totalPages: 3,
          },
        }),
      );

      render(<Table config={serverConfig(dataSource)} />);
      await act(async () => {});

      const scoreHeader = screen.getByRole("columnheader", { name: /score/i });
      fireEvent.click(within(scoreHeader).getByRole("button", { name: "Score" }));
      fireEvent.click(screen.getByRole("button", { name: "Filter Name" }));
      fireEvent.change(screen.getByLabelText("Filter by Name"), {
        target: { value: "Ada" },
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      await act(async () => {});
      fireEvent.click(screen.getByRole("button", { name: "2" }));
      await act(async () => {});
      dataSource.mockClear();

      fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

      expect(dataSource).toHaveBeenCalledTimes(1);
      expect(dataSource).toHaveBeenLastCalledWith({
        pagination: { page: 2, size: 10 },
        sort: { key: "score_key", direction: "ascending" },
        filters: { name: "Ada" },
      });

      await act(async () => {});
    } finally {
      vi.useRealTimers();
    }
  });

  it("re-fires the current request when the parent calls ref.refresh()", async () => {
    const dataSource = vi.fn(async () => pageOne);
    const ref = createRef<TableHandle>();
    render(<Table config={serverConfig(dataSource)} ref={ref} />);
    await act(async () => {});
    dataSource.mockClear();

    expect(ref.current).not.toBeNull();
    act(() => {
      ref.current?.refresh();
    });

    expect(dataSource).toHaveBeenCalledTimes(1);
    expect(dataSource).toHaveBeenLastCalledWith({
      pagination: { page: 1, size: 10 },
      filters: {},
    });

    await act(async () => {});
  });

  it("lets the Refresh button recover from an error exactly like Retry", async () => {
    const d1 = deferred<TableDataResponse<ServerRow>>();
    const d2 = deferred<TableDataResponse<ServerRow>>();
    const dataSource = vi
      .fn()
      .mockReturnValueOnce(d1.promise)
      .mockReturnValueOnce(d2.promise);

    render(<Table config={serverConfig(dataSource)} />);

    await act(async () => {
      d1.reject(new Error("boom"));
    });
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    expect(dataSource).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByRole("button", { name: "Retry" }),
    ).not.toBeInTheDocument();

    await act(async () => {
      d2.resolve(pageOne);
    });

    expect(screen.getByText("Person 1")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 1–10 of 25");
  });
});

describe("Table sortable/filterable string | boolean keys", () => {
  type KeyedRow = {
    name: string;
    score: number;
    role: string;
  };

  const keyedRow: KeyedRow = { name: "Ada", score: 10, role: "admin" };

  const keyedColumns: TableConfig<KeyedRow>["columns"] = {
    name: {
      type: "text",
      label: "Name",
      sortable: true,
      filterable: true,
    },
    score: {
      type: "number",
      label: "Score",
      sortable: "score_key",
      filterable: "score_filter",
    },
    role: {
      type: "text",
      label: "Role",
      sortable: false,
      filterable: false,
    },
  };

  function keyedConfig(
    dataSource: TableConfig<KeyedRow>["dataSource"],
  ): TableConfig<KeyedRow> {
    return { dataSource, columns: keyedColumns, serverSide: true };
  }

  const keyedResponse = (): TableDataResponse<KeyedRow> => ({
    rows: [keyedRow],
    pagination: { total: 1, size: 10, page: 1, totalPages: 1 },
  });

  it("maps sortable: true to the column's own key in the server-mode sort request", async () => {
    const dataSource = vi.fn(async (): Promise<TableDataResponse<KeyedRow>> => {
      return keyedResponse();
    });

    render(<Table config={keyedConfig(dataSource)} />);
    await act(async () => {});
    dataSource.mockClear();

    const nameHeader = screen.getByRole("columnheader", { name: "Name" });
    fireEvent.click(within(nameHeader).getByRole("button", { name: "Name" }));

    expect(dataSource).toHaveBeenCalledTimes(1);
    expect(dataSource).toHaveBeenLastCalledWith({
      pagination: { page: 1, size: 10 },
      sort: { key: "name", direction: "ascending" },
      filters: {},
    });

    await act(async () => {});
  });

  it("maps filterable: true to the column's own key in the server-mode filter request", async () => {
    vi.useFakeTimers();
    try {
      const dataSource = vi.fn(
        async (): Promise<TableDataResponse<KeyedRow>> => keyedResponse(),
      );

      render(<Table config={keyedConfig(dataSource)} />);
      await act(async () => {});
      dataSource.mockClear();

      fireEvent.click(screen.getByRole("button", { name: "Filter Name" }));
      fireEvent.change(screen.getByLabelText("Filter by Name"), {
        target: { value: "Ada" },
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      await act(async () => {});

      expect(dataSource).toHaveBeenCalledTimes(1);
      expect(dataSource).toHaveBeenLastCalledWith({
        pagination: { page: 1, size: 10 },
        filters: { name: "Ada" },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("maps string sortable/filterable to the custom request key, exactly as before", async () => {
    vi.useFakeTimers();
    try {
      const dataSource = vi.fn(
        async (): Promise<TableDataResponse<KeyedRow>> => keyedResponse(),
      );

      render(<Table config={keyedConfig(dataSource)} />);
      await act(async () => {});
      dataSource.mockClear();

      const scoreHeader = screen.getByRole("columnheader", { name: "Score" });
      fireEvent.click(within(scoreHeader).getByRole("button", { name: "Score" }));

      expect(dataSource).toHaveBeenCalledTimes(1);
      expect(dataSource).toHaveBeenLastCalledWith({
        pagination: { page: 1, size: 10 },
        sort: { key: "score_key", direction: "ascending" },
        filters: {},
      });

      await act(async () => {});

      fireEvent.click(within(scoreHeader).getByRole("button", { name: "Score" }));
      fireEvent.click(within(scoreHeader).getByRole("button", { name: "Score" }));
      await act(async () => {});
      dataSource.mockClear();

      fireEvent.click(screen.getByRole("button", { name: "Filter Score" }));
      fireEvent.change(screen.getByLabelText("Filter by Score"), {
        target: { value: "10" },
      });

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      await act(async () => {});

      expect(dataSource).toHaveBeenCalledTimes(1);
      expect(dataSource).toHaveBeenLastCalledWith({
        pagination: { page: 1, size: 10 },
        filters: { score_filter: 10 },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("renders no sort or filter control for sortable: false / filterable: false columns", async () => {
    const dataSource = vi.fn(
      async (): Promise<TableDataResponse<KeyedRow>> => keyedResponse(),
    );

    render(<Table config={keyedConfig(dataSource)} />);

    const roleHeader = screen.getByRole("columnheader", { name: "Role" });
    expect(roleHeader).not.toHaveAttribute("aria-sort");
    expect(within(roleHeader).queryByRole("button")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Filter Role" }),
    ).not.toBeInTheDocument();
  });
});

describe("Table option columns", () => {
  type StatusItem = {
    id: number;
    name: string;
    status: string | null;
    codes: string[] | null;
  };

  const STATUS_OPTIONS = [
    { label: "In Progress", value: "p" },
    { label: "Blocked", value: "b" },
    { label: "Shipped", value: "s" },
  ];

  const statusRows: StatusItem[] = [
    { id: 1, name: "Ada", status: "p", codes: ["p", "b"] },
    { id: 2, name: "Grace", status: "b", codes: ["s"] },
    { id: 3, name: "Alan", status: "x", codes: ["p"] },
    { id: 4, name: "Linus", status: null, codes: null },
  ];

  const statusColumns: TableConfig<StatusItem>["columns"] = {
    name: { type: "text", label: "Name", sortable: "name" },
    status: {
      type: "option",
      label: "Status",
      options: STATUS_OPTIONS,
      sortable: "status",
      filterable: "status",
    },
    codes: {
      type: "option",
      label: "Codes",
      options: STATUS_OPTIONS,
      sortable: "codes",
      filterable: "codes",
    },
  };

  function statusConfig(
    rows: StatusItem[] = statusRows,
    overrides: Partial<TableConfig<StatusItem>> = {},
  ): TableConfig<StatusItem> {
    return {
      dataSource: async () => ({ rows }),
      columns: statusColumns,
      ...overrides,
    };
  }

  const clickSort = (header: HTMLElement, name: string) =>
    fireEvent.click(within(header).getByRole("button", { name }));

  it("renders the matched option label instead of the raw coded value", async () => {
    await renderLocal(statusConfig([statusRows[0]]));

    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.queryByText("p")).not.toBeInTheDocument();
  });

  it("renders the raw value as its string form when no option matches", async () => {
    await renderLocal(statusConfig([statusRows[2]]));

    expect(screen.getByText("x")).toBeInTheDocument();
  });

  it("renders the muted em-dash for null/undefined option cells", async () => {
    await renderLocal(statusConfig([statusRows[3]]));

    const dashes = screen.getAllByText("—");
    expect(dashes).toHaveLength(2);
    dashes.forEach((dash) => expect(dash).toHaveClass("text-neutral-400"));
  });

  it("warns in dev and falls back to raw text when an option column has no options", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const columns: TableConfig<StatusItem>["columns"] = {
        name: { type: "text", label: "Name" },
        status: { type: "option", label: "Status" },
      };
      await renderLocal({
        dataSource: async () => ({ rows: [statusRows[0]] }),
        columns,
      });

      expect(screen.getByText("p")).toBeInTheDocument();
      expect(warnSpy).toHaveBeenCalledWith(
        'Table column of type "option" has no options; rendering raw values.',
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("maps each element of an array value through the options and joins them", async () => {
    await renderLocal(statusConfig([statusRows[0]]));

    expect(screen.getByText("In Progress, Blocked")).toBeInTheDocument();
  });

  it("sorts option columns by the displayed labels, ascending then descending", async () => {
    await renderLocal(statusConfig());

    const header = screen.getByRole("columnheader", { name: /status/i });
    const cellTexts = () => {
      const rows = screen.getAllByRole("row").slice(1);
      return rows.map(
        (row) => within(row).getAllByRole("cell")[1].textContent,
      );
    };

    clickSort(header, "Status");
    expect(cellTexts()).toEqual([
      "Blocked",
      "In Progress",
      "x",
      "—",
    ]);

    clickSort(header, "Status");
    expect(cellTexts()).toEqual([
      "x",
      "In Progress",
      "Blocked",
      "—",
    ]);
  });

  it("filters option columns case-insensitively against the displayed labels", async () => {
    await renderLocal(statusConfig());

    fireEvent.click(screen.getByRole("button", { name: "Filter Status" }));
    fireEvent.change(screen.getByLabelText("Filter by Status"), {
      target: { value: "PROGRESS" },
    });

    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.queryByText("Grace")).not.toBeInTheDocument();
    expect(screen.queryByText("Alan")).not.toBeInTheDocument();
  });

  it("sorts and filters array-valued option columns on their joined label text", async () => {
    await renderLocal(statusConfig());

    const codesHeader = screen.getByRole("columnheader", { name: /codes/i });
    clickSort(codesHeader, "Codes");
    const rows = screen.getAllByRole("row").slice(1);
    const codeTexts = rows.map(
      (row) => within(row).getAllByRole("cell")[2].textContent,
    );
    expect(codeTexts).toEqual([
      "In Progress",
      "In Progress, Blocked",
      "Shipped",
      "—",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Filter Codes" }));
    fireEvent.change(screen.getByLabelText("Filter by Codes"), {
      target: { value: "shipped" },
    });

    expect(screen.getByText("Grace")).toBeInTheDocument();
    expect(screen.queryByText("Ada")).not.toBeInTheDocument();
  });

  it("renders array values under a text column as comma-joined raw elements", async () => {
    const columns: TableConfig<StatusItem>["columns"] = {
      name: { type: "text", label: "Name" },
      codes: { type: "text", label: "Codes" },
    };
    await renderLocal({
      dataSource: async () => ({ rows: [statusRows[0]] }),
      columns,
    });

    expect(screen.getByText("p, b")).toBeInTheDocument();
  });
});

describe("Table filter Fields — select kind", () => {
  type StatusRow = {
    id: number;
    name: string;
    status: string;
  };

  const selectRows: StatusRow[] = [
    { id: 1, name: "Ada", status: "p" },
    { id: 2, name: "Grace", status: "b" },
  ];

  const SELECT_OPTIONS = [
    { label: "In Progress", value: "p" },
    { label: "Blocked", value: "b" },
  ];

  function selectColumns(
    filterable: TableConfig<StatusRow>["columns"]["status"]["filterable"],
  ): TableConfig<StatusRow>["columns"] {
    return { status: { type: "text", label: "Status", filterable } };
  }

  function openSelectFilter(columnLabel: string) {
    fireEvent.click(filterTrigger(columnLabel));
    fireEvent.click(
      screen.getByRole("button", { name: `Filter by ${columnLabel}` }),
    );
  }

  it("renders a SelectField in the popover and sends the picked option's scalar under the resolved key", async () => {
    vi.useFakeTimers();
    try {
      const dataSource = vi.fn(async () => ({ rows: selectRows }));
      render(
        <Table
          config={{
            dataSource,
            columns: selectColumns({
              kind: "select",
              options: SELECT_OPTIONS,
              key: "status_filter",
            }),
            serverSide: true,
          }}
        />,
      );
      await act(async () => {});
      dataSource.mockClear();

      openSelectFilter("Status");
      fireEvent.click(screen.getByRole("button", { name: "Blocked" }));

      expect(hasActiveDot(filterTrigger("Status"))).toBe(true);
      expect(screen.getByText("Status: Blocked")).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      await act(async () => {});

      expect(dataSource).toHaveBeenLastCalledWith(
        expect.objectContaining({ filters: { status_filter: "b" } }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("loads async filter options through the Field's own loader and sends the picked value", async () => {
    vi.useFakeTimers();
    try {
      const optionsDeferred = deferred<FieldOption<TableFilterScalar>[]>();
      const dataSource = vi.fn(async () => ({ rows: selectRows }));
      render(
        <Table
          config={{
            dataSource,
            columns: selectColumns({
              kind: "select",
              options: () => optionsDeferred.promise,
            }),
            serverSide: true,
          }}
        />,
      );
      await act(async () => {});
      dataSource.mockClear();

      fireEvent.click(filterTrigger("Status"));
      // Pending: the loader hasn't resolved, so no Options are offered yet.
      expect(
        screen.queryByRole("button", { name: "Blocked" }),
      ).not.toBeInTheDocument();

      await act(async () => {
        optionsDeferred.resolve(SELECT_OPTIONS);
      });
      fireEvent.click(
        screen.getByRole("button", { name: "Filter by Status" }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Blocked" }));

      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      await act(async () => {});

      expect(dataSource).toHaveBeenLastCalledWith(
        expect.objectContaining({ filters: { status: "b" } }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("upgrades filterable: true on an option column to a select while other columns keep the bare input", async () => {
    const columns: TableConfig<StatusRow>["columns"] = {
      status: {
        type: "option",
        label: "Status",
        options: SELECT_OPTIONS,
        filterable: true,
      },
      name: { type: "text", label: "Name", filterable: true },
    };
    await renderLocal({
      dataSource: async () => ({ rows: selectRows }),
      columns,
    });

    openSelectFilter("Status");
    fireEvent.click(screen.getByRole("button", { name: "Blocked" }));

    expect(screen.getByText("Status: Blocked")).toBeInTheDocument();
    expect(screen.getByText("Grace")).toBeInTheDocument();
    expect(screen.queryByText("Ada")).not.toBeInTheDocument();

    fireEvent.click(filterTrigger("Name"));
    expect(screen.getByLabelText("Filter by Name")).toBeInTheDocument();
  });

  it("removing the summary chip clears the select filter from the next request and the dot", async () => {
    vi.useFakeTimers();
    try {
      const dataSource = vi.fn(async () => ({ rows: selectRows }));
      render(
        <Table
          config={{
            dataSource,
            columns: selectColumns({
              kind: "select",
              options: SELECT_OPTIONS,
            }),
            serverSide: true,
          }}
        />,
      );
      await act(async () => {});

      openSelectFilter("Status");
      fireEvent.click(screen.getByRole("button", { name: "Blocked" }));
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      await act(async () => {});

      fireEvent.click(
        screen.getByRole("button", { name: "Remove filter Status" }),
      );
      await act(async () => {
        vi.advanceTimersByTime(300);
      });
      await act(async () => {});

      expect(hasActiveDot(filterTrigger("Status"))).toBe(false);
      expect(dataSource).toHaveBeenLastCalledWith(
        expect.objectContaining({ filters: {} }),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("Table filter Fields — input and date/datetime kinds", () => {
  type KindRow = {
    id: number;
    name: string;
    joined: string;
    updated: string;
    score: number;
  };

  const kindRows: KindRow[] = [
    { id: 1, name: "Ada", joined: "2024-03-15", updated: "2024-03-15T10:30:00", score: 10 },
  ];

  function serverTable(
    columns: TableConfig<KindRow>["columns"],
  ) {
    const dataSource = vi.fn(async () => ({ rows: kindRows }));
    render(
      <Table config={{ dataSource, columns, serverSide: true }} />,
    );
    return dataSource;
  }

  async function flushDebounce(dataSource: ReturnType<typeof serverTable>) {
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    await act(async () => {});
    return dataSource;
  }

  it("renders an InputField for kind input and sends the typed text under the resolved key", async () => {
    vi.useFakeTimers();
    try {
      const dataSource = serverTable({
        name: {
          type: "text",
          label: "Name",
          filterable: { kind: "input", key: "name_filter" },
        },
      });
      await act(async () => {});
      dataSource.mockClear();

      fireEvent.click(filterTrigger("Name"));
      fireEvent.change(screen.getByLabelText("Filter by Name"), {
        target: { value: "Ada" },
      });
      await flushDebounce(dataSource);

      expect(hasActiveDot(filterTrigger("Name"))).toBe(true);
      expect(dataSource).toHaveBeenLastCalledWith(
        expect.objectContaining({ filters: { name_filter: "Ada" } }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("an input filter with inputType number emits a numeric scalar", async () => {
    vi.useFakeTimers();
    try {
      const dataSource = serverTable({
        score: {
          type: "number",
          label: "Score",
          filterable: { kind: "input", inputType: "number" },
        },
      });
      await act(async () => {});
      dataSource.mockClear();

      fireEvent.click(filterTrigger("Score"));
      const input = screen.getByLabelText("Filter by Score");
      expect(input).toHaveAttribute("type", "number");
      fireEvent.change(input, { target: { value: "42" } });
      await flushDebounce(dataSource);

      expect(dataSource).toHaveBeenLastCalledWith(
        expect.objectContaining({ filters: { score: 42 } }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("a password input filter is unrepresentable at compile time", () => {
    const invalid: TableConfig<KindRow>["columns"]["name"]["filterable"] = {
      kind: "input",
      // @ts-expect-error password filters are not part of the Filter kind set
      inputType: "password",
    };
    expect(invalid).toBeDefined();
  });

  it("a date filter renders the Calendar kind in the popover and sends the committed value under the resolved key", async () => {
    vi.useFakeTimers();
    try {
      const dataSource = serverTable({
        joined: {
          type: "date",
          label: "Joined",
          filterable: { kind: "date", key: "joined_filter" },
        },
      });
      await act(async () => {});
      dataSource.mockClear();

      fireEvent.click(filterTrigger("Joined"));
      const popover = screen.getByRole("group");
      expect(
        within(popover).queryByRole("dialog", { name: "Choose date" }),
      ).not.toBeInTheDocument();

      fireEvent.click(
        within(popover).getByRole("button", { name: /Joined/ }),
      );
      fireEvent.mouseDown(
        within(popover).getByRole("gridcell", { name: /15,/ }),
      );
      fireEvent.mouseDown(
        within(popover).getByRole("button", { name: "Apply" }),
      );

      expect(hasActiveDot(filterTrigger("Joined"))).toBe(true);
      await flushDebounce(dataSource);

      expect(dataSource).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: {
            joined_filter: expect.stringMatching(/-15T00:00:00Z$/),
          },
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("a datetime filter sends its committed value as a scalar under the resolved key", async () => {
    vi.useFakeTimers();
    try {
      const dataSource = serverTable({
        updated: {
          type: "datetime",
          label: "Updated",
          filterable: { kind: "datetime" },
        },
      });
      await act(async () => {});
      dataSource.mockClear();

      fireEvent.click(filterTrigger("Updated"));
      const popover = screen.getByRole("group");
      fireEvent.click(
        within(popover).getByRole("button", { name: /Updated/ }),
      );
      fireEvent.mouseDown(
        within(popover).getByRole("gridcell", { name: /15,/ }),
      );
      fireEvent.mouseDown(
        within(popover).getByRole("button", { name: "Apply" }),
      );

      await flushDebounce(dataSource);

      expect(dataSource).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filters: {
            updated: expect.stringMatching(/-15T\d{2}:\d{2}:\d{2}Z$/),
          },
        }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("kind inference routes filterable: true text/number columns to the input Field and date columns to the Calendar kind", async () => {
    const columns: TableConfig<KindRow>["columns"] = {
      name: { type: "text", label: "Name", filterable: true },
      score: { type: "number", label: "Score", filterable: true },
      joined: { type: "date", label: "Joined", filterable: true },
    };
    await renderLocal({
      dataSource: async () => ({ rows: kindRows }),
      columns,
    });

    fireEvent.click(filterTrigger("Name"));
    expect(screen.getByLabelText("Filter by Name")).toHaveAttribute(
      "type",
      "text",
    );

    fireEvent.click(filterTrigger("Score"));
    expect(screen.getByLabelText("Filter by Score")).toHaveAttribute(
      "type",
      "number",
    );

    fireEvent.click(filterTrigger("Joined"));
    const popover = screen.getByRole("group");
    expect(
      within(popover).queryByRole("dialog", { name: "Choose date" }),
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(popover).getByRole("button", { name: /Joined/ }),
    );
    expect(
      within(popover).getByRole("dialog", { name: "Choose date" }),
    ).toBeInTheDocument();
  });

  it("clearing a date filter omits it from the next request and removes the dot", async () => {
    vi.useFakeTimers();
    try {
      const dataSource = serverTable({
        joined: {
          type: "date",
          label: "Joined",
          filterable: { kind: "date" },
        },
      });
      await act(async () => {});

      fireEvent.click(filterTrigger("Joined"));
      const popover = screen.getByRole("group");
      fireEvent.click(within(popover).getByRole("button", { name: /Joined/ }));
      fireEvent.mouseDown(
        within(popover).getByRole("gridcell", { name: /15,/ }),
      );
      fireEvent.mouseDown(
        within(popover).getByRole("button", { name: "Apply" }),
      );
      await flushDebounce(dataSource);

      fireEvent.click(
        screen.getByRole("button", { name: "Remove filter Joined" }),
      );
      await flushDebounce(dataSource);

      expect(hasActiveDot(filterTrigger("Joined"))).toBe(false);
      expect(dataSource).toHaveBeenLastCalledWith(
        expect.objectContaining({ filters: {} }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("clearing an input filter omits it from the next request and removes the dot", async () => {
    vi.useFakeTimers();
    try {
      const dataSource = serverTable({
        name: {
          type: "text",
          label: "Name",
          filterable: { kind: "input" },
        },
      });
      await act(async () => {});

      fireEvent.click(filterTrigger("Name"));
      fireEvent.change(screen.getByLabelText("Filter by Name"), {
        target: { value: "Ada" },
      });
      await flushDebounce(dataSource);

      fireEvent.click(
        screen.getByRole("button", { name: "Remove filter Name" }),
      );
      await flushDebounce(dataSource);

      expect(hasActiveDot(filterTrigger("Name"))).toBe(false);
      expect(dataSource).toHaveBeenLastCalledWith(
        expect.objectContaining({ filters: {} }),
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

