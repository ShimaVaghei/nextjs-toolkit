"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";

// ─── Modal demo page ────────────────────────────────────────────────────
//
// Manual seam only (not unit-tested), consistent with the Field and Table
// demos. Each section exercises one slice of the Modal contract: the
// controlled open flag, the single onClose channel (Cancel, Escape,
// backdrop), the configurable footer, the async submit lifecycle, and
// sizing with viewport clamping.

type SectionProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function Section({ title, description, children }: SectionProps) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
          {title}
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

function ModalButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-300"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function ModalDemoPage() {
  // One `open` flag per dialog, owned here — the Modal is fully controlled.
  const [defaultOpen, setDefaultOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [singleActionOpen, setSingleActionOpen] = useState(false);
  const [gatedOpen, setGatedOpen] = useState(false);
  const [asyncOpen, setAsyncOpen] = useState(false);
  const [sizedOpen, setSizedOpen] = useState(false);
  const [tallOpen, setTallOpen] = useState(false);

  // The gated demo's checkbox: Apply is disabled until it is ticked.
  const [termsAccepted, setTermsAccepted] = useState(false);

  // The async demo's caller-side outcome: the Modal has no error slot, so
  // the page itself reports resolve/reject next to the trigger.
  const [asyncOutcome, setAsyncOutcome] = useState<"idle" | "saved" | "failed">("idle");
  const [attempt, setAttempt] = useState(0);

  const runAsyncSubmit = () => {
    const current = attempt + 1;
    setAttempt(current);
    return new Promise<void>((resolve, reject) => {
      setTimeout(() => {
        // Every other attempt fails so both paths are reachable in the demo.
        if (current % 2 === 1) {
          setAsyncOutcome("failed");
          reject(new Error("simulated failure"));
        } else {
          setAsyncOutcome("saved");
          resolve();
        }
      }, 1500);
    });
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto mb-32">
      <header>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Modal demo
        </h1>
      </header>

      <Section
        title="Default dialog"
        description="A centered, portaled dialog with the default footer: Apply and Cancel. Body scroll locks while open; Cancel, Escape, and a backdrop click each route through the single onClose."
      >
        <ModalButton onClick={() => setDefaultOpen(true)}>Open default modal</ModalButton>
        <Modal
          config={{
            title: "Confirm action",
            open: defaultOpen,
            onClose: () => setDefaultOpen(false),
            onSubmit: () => setDefaultOpen(false),
          }}
        >
          <p>This is the modal body. Close it with Cancel, Escape, a backdrop click — or Apply.</p>
        </Modal>
      </Section>

      <Section
        title="Custom labels"
        description="submitText and cancelText override the footer labels without changing any behavior — both still funnel through the same close and submit channels."
      >
        <ModalButton onClick={() => setCustomOpen(true)}>Open custom-label modal</ModalButton>
        <Modal
          config={{
            title: "Delete project",
            open: customOpen,
            onClose: () => setCustomOpen(false),
            onSubmit: () => setCustomOpen(false),
            submitText: "Delete",
            cancelText: "Keep it",
          }}
        >
          <p>This dialog asks with the words its domain uses, not Apply/Cancel.</p>
        </Modal>
      </Section>

      <Section
        title="Single-action confirm"
        description="hideCancel collapses the footer to Apply alone — a confirm-only dialog. Escape and the backdrop still work."
      >
        <ModalButton onClick={() => setSingleActionOpen(true)}>Open single-action modal</ModalButton>
        <Modal
          config={{
            title: "Session expired",
            open: singleActionOpen,
            onClose: () => setSingleActionOpen(false),
            onSubmit: () => setSingleActionOpen(false),
            hideCancel: true,
          }}
        >
          <p>Sign in again to continue. There is only one thing to do here.</p>
        </Modal>
      </Section>

      <Section
        title="Disabled Apply"
        description="submitDisabled disables Apply without busy semantics — the gate-on-validation use. Tick the box inside to enable it."
      >
        <ModalButton onClick={() => setGatedOpen(true)}>Open gated modal</ModalButton>
        <Modal
          config={{
            title: "Accept the terms",
            open: gatedOpen,
            onClose: () => setGatedOpen(false),
            onSubmit: () => setGatedOpen(false),
            submitDisabled: !termsAccepted,
          }}
        >
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
            />
            I accept the terms (Apply stays disabled until you do)
          </label>
        </Modal>
      </Section>

      <Section
        title="Async submit"
        description="onSubmit may return a promise: while it is pending Apply is busy + disabled and the dialog stays open; on resolve it auto-closes; on reject it stays open with Apply back to idle. Every other attempt fails so both paths are easy to see — the outcome line is the caller's own handling, not a Modal feature."
      >
        <div className="flex items-center gap-4">
          <ModalButton onClick={() => setAsyncOpen(true)}>Open async modal</ModalButton>
          <span className="text-sm text-neutral-600 dark:text-neutral-400" role="status">
            {asyncOutcome === "idle" && "No submission yet."}
            {asyncOutcome === "saved" && "Saved (submit resolved — the modal closed itself)."}
            {asyncOutcome === "failed" && "Failed (submit rejected — the modal stayed open)."}
          </span>
        </div>
        <Modal
          config={{
            title: "Save draft",
            open: asyncOpen,
            onClose: () => setAsyncOpen(false),
            onSubmit: runAsyncSubmit,
          }}
        >
          <p>
            Click Apply and watch the button: busy and disabled for 1.5 seconds,
            then the dialog closes (resolved) or springs back open (rejected).
            Odd attempts fail.
          </p>
        </Modal>
      </Section>

      <Section
        title="Sized and clamped"
        description="width and height are honored literally but hard-clamped to the viewport (max-width 100vw, max-height 100vh) — even 800×600 on a 375px phone never overflows. The tall dialog shows the body scrolling internally while the header and footer stay fixed."
      >
        <div className="flex flex-wrap gap-4">
          <ModalButton onClick={() => setSizedOpen(true)}>Open 800×600 modal</ModalButton>
          <ModalButton onClick={() => setTallOpen(true)}>Open tall content modal</ModalButton>
        </div>
        <Modal
          config={{
            title: "Large dialog",
            open: sizedOpen,
            onClose: () => setSizedOpen(false),
            onSubmit: () => setSizedOpen(false),
            width: 800,
            height: 600,
          }}
        >
          <p>
            This panel asks for 800×600. On a small screen the clamp caps it to
            the viewport so Apply and Cancel always stay reachable.
          </p>
        </Modal>
        <Modal
          config={{
            title: "Tall content",
            open: tallOpen,
            onClose: () => setTallOpen(false),
            onSubmit: () => setTallOpen(false),
            height: 300,
          }}
        >
          {Array.from({ length: 20 }, (_, i) => (
            <p key={i} className="pb-2">
              Body paragraph {i + 1} of 20 — only this body region scrolls;
              the header above and the footer below stay fixed.
            </p>
          ))}
        </Modal>
      </Section>
    </div>
  );
}
