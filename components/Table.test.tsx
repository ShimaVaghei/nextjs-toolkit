import { describe, it, expect, vi, afterEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { Table, type TableConfig } from "./Table";

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
    dataSource: () => ({ rows }),
    columns,
    ...overrides,
  };
}

const currentPageButtons = () =>
  screen
    .getAllByRole("button")
    .filter((button) => button.getAttribute("aria-current") === "page");

afterEach(() => {
  cleanup();
});

describe("Table local mode", () => {
  it("renders the caption, all column headers, and the first page of rows as text cells", () => {
    render(<Table config={makeConfig(people, { caption: "People" })} />);

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

  it("renders a muted em-dash for empty cell values", () => {
    render(
      <Table
        config={makeConfig([
          { id: 1, name: "Ada", email: null, role: "admin" },
          { id: 2, name: "Grace", email: "grace@example.com", role: "user" },
        ])}
      />,
    );

    const dash = screen.getByText("—");
    expect(dash).toHaveClass("text-neutral-400");
    const row = screen.getByText("Ada").closest("tr") as HTMLElement;
    expect(within(row).getByText("—")).toBeInTheDocument();
    expect(screen.getByText("grace@example.com")).toBeInTheDocument();
  });

  it("announces the showing summary in a single polite role=status region", () => {
    render(<Table config={makeConfig(people)} />);

    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toHaveAttribute("aria-live", "polite");
    expect(statuses[0]).toHaveTextContent("Showing 1–10 of 25");
  });

  it("marks exactly one page button aria-current=page and natively disables prev/next at the ends", () => {
    render(<Table config={makeConfig(people)} />);

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

  it("navigating pages updates the rendered rows and the summary", () => {
    render(<Table config={makeConfig(people)} />);

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

  it("uses the optional pagination config for the initial page and size", () => {
    render(
      <Table config={makeConfig(people, { pagination: { page: 2, size: 5 } })} />,
    );

    expect(screen.getByText("Person 6")).toBeInTheDocument();
    expect(screen.getByText("Person 10")).toBeInTheDocument();
    expect(screen.queryByText("Person 5")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 6–10 of 25");

    const current = currentPageButtons();
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent("2");
  });

  it("clamps an out-of-range seeded page to the last page and navigates from there", () => {
    render(<Table config={makeConfig(people, { pagination: { page: 99 } })} />);

    expect(screen.getByText("Person 21")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Showing 21–25 of 25");

    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(nav).getByRole("button", { name: "Previous" })).toBeEnabled();
    expect(within(nav).getByRole("button", { name: "Next" })).toBeDisabled();

    fireEvent.click(within(nav).getByRole("button", { name: "Previous" }));
    expect(screen.getByRole("status")).toHaveTextContent("Showing 11–20 of 25");
    expect(screen.getByText("Person 11")).toBeInTheDocument();
  });

  it("calls dataSource exactly once and never again on pagination", () => {
    const dataSource = vi.fn(() => ({ rows: people }));
    render(<Table config={{ dataSource, columns }} />);

    expect(dataSource).toHaveBeenCalledTimes(1);
    expect(dataSource).toHaveBeenCalledWith({});

    fireEvent.click(screen.getByRole("button", { name: "2" }));
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));

    expect(dataSource).toHaveBeenCalledTimes(1);
  });

  it("renders 'No data yet' across a column-spanning row when there are no rows", () => {
    render(<Table config={makeConfig([])} />);

    const emptyCell = screen.getByText("No data yet").closest("td") as HTMLElement;
    expect(emptyCell).toHaveAttribute("colspan", "3");
    expect(screen.getByRole("status")).toHaveTextContent("Showing 0–0 of 0");
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
    tags: { type: "array", label: "Tags" },
    avatar: { type: "image", label: "Avatar" },
    score: { type: "number", label: "Score" },
  };

  function typeConfig(
    rows: Item[],
    overrides: Partial<TableConfig<Item>> = {},
  ): TableConfig<Item> {
    return {
      dataSource: () => ({ rows }),
      columns: typeColumns,
      ...overrides,
    };
  }

  it("renders date cells as Intl short dates inside a native <time dateTime>", () => {
    render(<Table config={typeConfig([itemRows[0]])} />);

    const dateTime = screen
      .getByText("Jun 12, 2023")
      .closest("time") as HTMLElement;
    expect(dateTime).toHaveAttribute("datetime", "2023-06-12");
  });

  it("renders datetime cells as Intl date + time inside a native <time dateTime>", () => {
    render(<Table config={typeConfig([itemRows[0]])} />);

    const dateTime = screen
      .getByText("Nov 2, 2023, 2:20 PM")
      .closest("time") as HTMLElement;
    expect(dateTime).toHaveAttribute("datetime", "2023-11-02T14:20");
  });

  it("accepts date strings and coerces them through the same date formatter", () => {
    const row = { ...itemRows[0], joined: "2023-06-12T12:00:00" };
    render(<Table config={typeConfig([row])} />);

    expect(screen.getByText("Jun 12, 2023")).toBeInTheDocument();
  });

  it("falls back to the raw string for an unparseable date value", () => {
    const row = { ...itemRows[0], joined: "garbage" };
    render(<Table config={typeConfig([row])} />);

    const text = screen.getByText("garbage");
    expect(text).toBeInTheDocument();
    expect(text.closest("time")).toBeNull();
  });

  it("renders array cells as a comma-joined string", () => {
    render(<Table config={typeConfig([itemRows[0]])} />);

    expect(screen.getByText("design, admin")).toBeInTheDocument();
  });

  it("renders image cells as a small rounded img with a name-derived alt", () => {
    render(<Table config={typeConfig([itemRows[0]])} />);

    const img = screen.getByRole("img", { name: "Ada thumbnail" });
    expect(img).toHaveAttribute("src", "/avatars/ada.png");
    expect(img).toHaveClass("h-10", "w-10", "rounded-lg", "shadow-sm");
  });

  it("renders image cells with an empty alt when the row has no name", () => {
    const { container } = render(
      <Table config={typeConfig([{ ...itemRows[0], name: "" }])} />,
    );

    const img = container.querySelector("img") as HTMLImageElement;
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("src", "/avatars/ada.png");
  });

  it("renders number cells as plain left-aligned raw strings", () => {
    render(<Table config={typeConfig([itemRows[0]])} />);

    const score = screen.getByText("1234.5");
    expect(score).toBeInTheDocument();
    expect(screen.queryByText("1,234.5")).not.toBeInTheDocument();
    const td = score.closest("td") as HTMLElement;
    expect(td).toHaveClass("text-left");
  });

  it("runs a column transform before type rendering", () => {
    const columns: TableConfig<Item>["columns"] = {
      joined: { type: "date", transform: () => new Date(2023, 5, 12) },
    };
    render(
      <Table
        config={{
          dataSource: () => ({ rows: [{ ...itemRows[0], joined: "garbage" }] }),
          columns,
        }}
      />,
    );

    expect(screen.getByText("Jun 12, 2023")).toBeInTheDocument();
    expect(screen.queryByText("garbage")).not.toBeInTheDocument();
  });

  it("renders the em-dash when a transform returns null", () => {
    const columns: TableConfig<Item>["columns"] = {
      name: { type: "text", transform: () => null },
    };
    render(
      <Table
        config={{
          dataSource: () => ({ rows: [{ ...itemRows[0], name: "Ada" }] }),
          columns,
        }}
      />,
    );

    const dash = screen.getByText("—");
    expect(dash).toHaveClass("text-neutral-400");
    expect(screen.queryByText("Ada")).not.toBeInTheDocument();
  });

  it("merges a static class and per-row dynamicClass onto the cell", () => {
    const columns: TableConfig<Item>["columns"] = {
      name: {
        type: "text",
        class: "font-medium",
        dynamicClass: (row) =>
          row.score != null && row.score > 100
            ? "text-emerald-600"
            : "text-red-600",
      },
    };
    render(
      <Table
        config={{
          dataSource: () => ({ rows: itemRows }),
          columns,
        }}
      />,
    );

    const adaCell = screen.getByText("Ada").closest("td") as HTMLElement;
    expect(adaCell).toHaveClass("font-medium", "text-emerald-600");
    const graceCell = screen.getByText("Grace").closest("td") as HTMLElement;
    expect(graceCell).toHaveClass("font-medium", "text-red-600");
  });

  it("drops hidden columns entirely", () => {
    const columns: TableConfig<Item>["columns"] = {
      name: { type: "text" },
      secret: { type: "text", hidden: true },
    };
    const row = { ...itemRows[0], secret: "s3cret" } as Item & {
      secret: string;
    };
    render(
      <Table
        config={{
          dataSource: () => ({ rows: [row] }),
          columns,
        }}
      />,
    );

    expect(screen.getAllByRole("columnheader")).toHaveLength(1);
    expect(screen.queryByRole("columnheader", { name: "secret" })).not.toBeInTheDocument();
    expect(screen.queryByText("s3cret")).not.toBeInTheDocument();
  });

  it("renders the muted em-dash for null/undefined values of every type", () => {
    render(<Table config={typeConfig([itemRows[1]])} />);

    const dashes = screen.getAllByText("—");
    expect(dashes).toHaveLength(5);
    dashes.forEach((dash) => expect(dash).toHaveClass("text-neutral-400"));
  });
});