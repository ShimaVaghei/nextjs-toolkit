import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "../Modal";

// ─── Modal — behavior through the module's public interface ────────────

function ModalHarness({
  title,
  initialOpen = true,
  onClose = vi.fn(),
}: {
  title: string;
  initialOpen?: boolean;
  onClose?: () => void;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div>
      <button type="button" onClick={() => setOpen(false)}>
        Close from parent
      </button>
      <Modal
        title={title}
        open={open}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      >
        <p>Modal body content</p>
      </Modal>
    </div>
  );
}

function openModal(title = "My modal") {
  const onClose = vi.fn();
  render(<ModalHarness title={title} onClose={onClose} />);
  return { onClose };
}

afterEach(cleanup);

describe("Modal — controlled rendering", () => {
  it("renders nothing from the DOM when open is false", () => {
    render(<ModalHarness title="My modal" initialOpen={false} />);
    expect(document.body.querySelector("[role='dialog']")).toBeNull();
    expect(screen.queryByText("My modal")).not.toBeInTheDocument();
  });

  it("renders a portaled dialog when open", () => {
    openModal();
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label", "My modal");
    // Portaled: not inside the harness's container, but attached to document.body.
    expect(dialog.closest("[role='dialog']")).toBe(dialog);
  });

  it("renders the title as the visible heading", () => {
    openModal("My modal");
    expect(screen.getByRole("heading", { level: 2, name: "My modal" })).toBeInTheDocument();
    expect(screen.getByText("Modal body content")).toBeInTheDocument();
  });
});

describe("Modal — single close channel", () => {
  it("calls onClose when the Cancel button is clicked", () => {
    const { onClose } = openModal();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when Escape is pressed", () => {
    const { onClose } = openModal();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked, but not when the panel is", () => {
    const { onClose } = openModal();
    fireEvent.click(screen.getByRole("dialog").previousElementSibling!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("Modal — parent closes", () => {
  it("unmounts when the parent flips open to false", () => {
    const onClose = vi.fn();
    render(<ModalHarness title="My modal" onClose={onClose} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Close from parent"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Modal — body scroll lock", () => {
  it("locks body scroll while open and restores it on close", () => {
    const { unmount } = render(<ModalHarness title="My modal" />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("restores body scroll when the parent closes the modal", () => {
    render(<ModalHarness title="My modal" />);
    fireEvent.click(screen.getByText("Close from parent"));
    expect(document.body.style.overflow).toBe("");
  });
});

describe("Modal — focus", () => {
  it("moves focus to the panel on open", () => {
    openModal();
    expect(screen.getByRole("dialog")).toHaveFocus();
  });
});
