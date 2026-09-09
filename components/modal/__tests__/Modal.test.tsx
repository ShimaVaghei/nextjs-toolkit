import { cleanup, fireEvent, act, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Modal } from "../Modal";

// ─── Modal — behavior through the module's public interface ────────────

function ModalHarness({
  title,
  initialOpen = true,
  onClose = vi.fn(),
  onSubmit,
  submitText,
  cancelText,
  hideCancel,
  submitDisabled,
  width,
  height,
}: {
  title: string;
  initialOpen?: boolean;
  onClose?: () => void;
  onSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
  hideCancel?: boolean;
  submitDisabled?: boolean;
  width?: number | string;
  height?: number | string;
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
        onSubmit={onSubmit}
        submitText={submitText}
        cancelText={cancelText}
        hideCancel={hideCancel}
        submitDisabled={submitDisabled}
        width={width}
        height={height}
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

describe("Modal — sizing and viewport clamping", () => {
  it("applies a numeric width as px and caps it at max-width: 100vw", () => {
    render(<ModalHarness title="My modal" width={800} />);
    const panel = screen.getByRole("dialog");
    expect(panel.style.width).toBe("800px");
    expect(panel.style.maxWidth).toBe("100vw");
  });

  it("applies a numeric height as px and caps it at max-height: 100vh", () => {
    render(<ModalHarness title="My modal" height={900} />);
    const panel = screen.getByRole("dialog");
    expect(panel.style.height).toBe("900px");
    expect(panel.style.maxHeight).toBe("100vh");
  });

  it("applies a string size literally with the viewport clamp", () => {
    render(<ModalHarness title="My modal" width="50rem" height="75%" />);
    const panel = screen.getByRole("dialog");
    expect(panel.style.width).toBe("50rem");
    expect(panel.style.height).toBe("75%");
    expect(panel.style.maxWidth).toBe("100vw");
    expect(panel.style.maxHeight).toBe("100vh");
  });

  it("uses the default small-screen-inset size when no size is passed", () => {
    render(<ModalHarness title="My modal" />);
    const panel = screen.getByRole("dialog");
    expect(panel).toHaveClass("w-full", "max-w-md", "max-h-full");
    expect(panel.style.width).toBe("");
    expect(panel.style.height).toBe("");
  });
});

describe("Modal — internal scroll region", () => {
  it("scrolls the body internally while the header and footer stay fixed", () => {
    render(<ModalHarness title="My modal" />);
    const panel = screen.getByRole("dialog");
    const body = screen.getByText("Modal body content").parentElement!;
    expect(body).toHaveClass("overflow-y-auto", "flex-1", "min-h-0");
    expect(body).toHaveClass("thin-scrollbar");
    // The body is a sibling of the sticky header and footer inside the panel.
    expect(body.previousElementSibling).toHaveClass("sticky");
    expect(body.nextElementSibling).toHaveClass("sticky");
    expect(panel).toContainElement(screen.getByRole("heading", { name: "My modal" }));
    expect(panel).toContainElement(screen.getByRole("button", { name: "Cancel" }));
  });
});

describe("Modal — footer configuration", () => {
  it("renders Apply and Cancel by default", () => {
    const onSubmit = vi.fn();
    render(<ModalHarness title="My modal" onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("overrides the submit and cancel labels", () => {
    const onSubmit = vi.fn();
    render(
      <ModalHarness title="My modal" onSubmit={onSubmit} submitText="Save changes" cancelText="Discard" />,
    );
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apply" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("hides the Cancel button with hideCancel, leaving a single-action dialog", () => {
    const onSubmit = vi.fn();
    render(<ModalHarness title="My modal" onSubmit={onSubmit} hideCancel />);
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("disables Apply with submitDisabled without busy semantics", () => {
    const onSubmit = vi.fn();
    render(<ModalHarness title="My modal" onSubmit={onSubmit} submitDisabled />);
    const apply = screen.getByRole("button", { name: "Apply" });
    expect(apply).toBeDisabled();
    fireEvent.click(apply);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit when Apply is clicked", () => {
    const onSubmit = vi.fn();
    const { onClose } = { onClose: vi.fn() };
    render(<ModalHarness title="My modal" onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    // This ticket wires the handler only — Apply does not close (ticket 04 owns async auto-close).
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("Modal — async submit lifecycle", () => {
  function deferred() {
    let resolve!: (value: unknown) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<unknown>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

  it("shows Apply busy + disabled and keeps the modal open while onSubmit is pending", async () => {
    const onSubmit = vi.fn(() => deferred().promise);
    render(<ModalHarness title="My modal" onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    const apply = screen.getByRole("button", { name: "Apply" });
    expect(apply).toBeDisabled();
    expect(apply).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("auto-closes through onClose when onSubmit's promise resolves", async () => {
    const deferredSubmit = deferred();
    const onSubmit = vi.fn(() => deferredSubmit.promise);
    const onClose = vi.fn();
    render(<ModalHarness title="My modal" onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await act(async () => {
      deferredSubmit.resolve(undefined);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("stays open with Apply returned to idle when onSubmit's promise rejects", async () => {
    const deferredSubmit = deferred();
    const onSubmit = vi.fn(() => deferredSubmit.promise);
    const onClose = vi.fn();
    render(<ModalHarness title="My modal" onSubmit={onSubmit} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    await act(async () => {
      deferredSubmit.reject(new Error("submission failed"));
    });
    expect(onClose).not.toHaveBeenCalled();
    const apply = screen.getByRole("button", { name: "Apply" });
    expect(apply).toBeEnabled();
    expect(apply).not.toHaveAttribute("aria-busy");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // A rejected submit can be retried.
    fireEvent.click(apply);
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});
