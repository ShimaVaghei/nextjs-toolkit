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