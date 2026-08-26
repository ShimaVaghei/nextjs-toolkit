"use client";

import { useRef, useState } from "react";
import {
  CheckboxField,
  InputField,
  MultiSelectField,
  SelectField,
  TextareaField,
  type FieldCheckboxConfig,
  type FieldHandle,
  type FieldInputConfig,
  type FieldMultiSelectConfig,
  type FieldOption,
  type FieldSelectConfig,
  type FieldTextareaConfig,
} from "@/components/Field";

// Configs are plain data: each Field owns its value internally, so none of
// these carry live state or change callbacks. The per-kind config types pin
// each Field's value shape; choice kinds take theirs from the Options' T.
const nameConfig: FieldInputConfig = {
  inputType: "text",
  label: "Name",
  placeholder: "Jane Doe",
  hint: "Shown publicly on your profile.",
  validator: { required: true },
};

const emailConfig: FieldInputConfig = {
  inputType: "text",
  label: "Email",
  placeholder: "jane@example.com",
  hint: "Format checking is the declarative email rule — no hand-written regex.",
  validator: { required: true, email: true },
};

const passwordConfig: FieldInputConfig = {
  inputType: "password",
  label: "Password",
  hint: "Never shared.",
  validator: { minLength: 8 },
};

const bioConfig: FieldTextareaConfig = {
  label: "Bio",
  placeholder: "A sentence or two about you",
  hint: "A short introduction.",
  className: "max-w-md",
  validator: {
    required: { value: true, message: "Tell us a bit about yourself." },
    maxLength: 200,
  },
};

const ageConfig: FieldInputConfig = {
  inputType: "number",
  label: "Age",
  hint: "Whole years; empty or unparseable counts as not filled in.",
  validator: { min: { value: 0, message: "Age cannot be negative." }, max: 120 },
};

const consentConfig: FieldCheckboxConfig = {
  label: "I agree to the terms of service.",
  hint: "Required to continue — an unticked box counts as not filled in.",
  validator: {
    required: { value: true, message: "You must accept the terms." },
  },
};

const countryConfig: FieldSelectConfig<string> = {
  label: "Country",
  hint: "Static options behind the shared popup; the placeholder labels the closed control until you choose.",
  validator: { required: { value: true, message: "Choose a country." } },
  placeholder: "Choose a country",
  options: [
    { label: "France", value: "fr" },
    { label: "Japan", value: "jp" },
    { label: "United States", value: "us" },
    {
      label: "Antarctica — research programmes only",
      value: "aq",
      disabled: true,
    },
  ],
};

const tagsConfig: FieldMultiSelectConfig<string> = {
  label: "Tags",
  placeholder: "Pick some tags",
  hint: "Chips scroll horizontally inside a fixed-height control; removing one announces the change politely.",
  initialValue: ["research"],
  validator: { required: { value: true, message: "Pick at least one tag." } },
  options: [
    { label: "Design", value: "design" },
    { label: "Research", value: "research" },
    { label: "Engineering", value: "engineering" },
    { label: "Documentation", value: "docs" },
    { label: "Accessibility", value: "a11y" },
  ],
};

const legacyPlanConfig: FieldSelectConfig<string> = {
  label: "Plan",
  hint: "Holds the retired Starter plan selected by default (keepDisabledSelection); pick another to move off it.",
  initialValue: "starter",
  placeholder: "Choose a plan",
  options: [
    { label: "Starter (retired)", value: "starter", disabled: true },
    { label: "Growth", value: "growth" },
    { label: "Scale", value: "scale" },
  ],
};

/** A domain object handed over whole when its Option is chosen. */
type ReleaseTrain = { id: number; codename: string };

const RELEASE_TRAINS: FieldOption<ReleaseTrain>[] = [
  { label: "Kepler", value: { id: 1, codename: "kepler" } },
  { label: "Hopper", value: { id: 2, codename: "hopper" } },
  {
    label: "Lovelace (paused)",
    value: { id: 3, codename: "lovelace" },
    disabled: true,
  },
];

// Matching ties a held value to its Option by train id, so parent state can
// hold re-created copies of a domain object and still Match its Option.
const matchTrainById = (a: ReleaseTrain, b: ReleaseTrain) =>
  a.id === b.id;

const trainConfig: FieldSelectConfig<ReleaseTrain> = {
  label: "Release train",
  hint: "Options carry whole domain objects; matchValue Matches by id instead of reference, and only labels ever render.",
  placeholder: "Choose a train",
  validator: { required: { value: true, message: "Choose a release train." } },
  matchValue: matchTrainById,
  options: RELEASE_TRAINS,
};

const retiredTrainConfig: FieldSelectConfig<ReleaseTrain> = {
  label: "Retired train hold",
  hint: "The Initial value Matches no Option any more: a non-primitive Fallback renders the honest \"(unknown option)\" marker instead of leaking the object.",
  placeholder: "Choose a train",
  matchValue: matchTrainById,
  options: RELEASE_TRAINS,
  initialValue: { id: 99, codename: "soyuz" },
};

const REF_BUTTON_CLASS =
  "cursor-pointer rounded-md border border-neutral-300 bg-white px-2 py-1 font-medium " +
  "text-neutral-700 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500/30 " +
  "dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800";

export default function FieldDemoPage() {
  const [simulateRejection, setSimulateRejection] = useState(false);

  // Kept out of render state so mounted loaders are never re-fired by a
  // toggle; each attempt reads the ref when it settles, and Retry always sees
  // the latest position. One shared flag drives both async demo Fields.
  const loadRejectionRef = useRef(false);

  // The uncontrolled example's steering wheel: read and install values
  // imperatively without ever wiring a change callback.
  const nicknameRef = useRef<FieldHandle<string | number>>(null);
  const [readValue, setReadValue] = useState("(never read)");

  const readNickname = () => setReadValue(String(nicknameRef.current?.getValue()));

  const toggleSimulateRejection = (checked: boolean) => {
    loadRejectionRef.current = checked;
    setSimulateRejection(checked);
  };

  // One simulated API shape behind both async demo Fields; each call gets its
  // own loader closure, and the shared flag is read only when a load settles.
  const simulateOptionLoad = <T,>(
    delayMs: number,
    rejectionMessage: string,
    options: FieldOption<T>[],
  ) =>
    () =>
      new Promise<FieldOption<T>[]>((resolve, reject) => {
        window.setTimeout(() => {
          if (loadRejectionRef.current) {
            reject(new Error(rejectionMessage));
          } else {
            resolve(options);
          }
        }, delayMs);
      });

  const regionConfig: FieldSelectConfig<string> = {
    label: "Region",
    hint: "Options come from a simulated API; flip the toggle, then hit Retry to walk the failure path.",
    validator: { required: { value: true, message: "Choose a region." } },
    placeholder: "Choose a region",
    options: simulateOptionLoad(800, "Simulated region load rejection.", [
      { label: "Africa", value: "af" },
      { label: "Americas", value: "am" },
      { label: "Asia", value: "as" },
      { label: "Europe", value: "eu" },
      { label: "Oceania", value: "oc" },
    ]),
  };

  const teamsConfig: FieldMultiSelectConfig<string> = {
    label: "Teams",
    hint: "The same async contract on the multi-select kind: chips stay visible while Pending, and the popup only opens once options resolve.",
    className: "max-w-md",
    initialValue: ["platform"],
    validator: { required: { value: true, message: "Pick at least one team." } },
    options: simulateOptionLoad(1100, "Simulated teams load rejection.", [
      { label: "Platform", value: "platform" },
      { label: "Mobile", value: "mobile" },
      { label: "Data", value: "data" },
      { label: "Security", value: "security" },
      { label: "Archived incubator", value: "incubator", disabled: true },
    ]),
  };

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
          Field demo
        </h1>
      </header>

      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Uncontrolled
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            A fully working field with no change callback at all: the config
            carries no state wiring, edits live inside the Field, and the
            parent steers only through its ref — read the current value or
            install a new one, exactly as if the user had typed it.
          </p>
        </div>
        <InputField
          config={{
            label: "Nickname",
            hint: "No onValueChange anywhere; the Initial value seeds once at mount.",
            initialValue: "Ace",
            validator: { required: true },
          }}
          ref={nicknameRef}
        />
        <div className="flex items-center gap-3 text-sm text-neutral-600 dark:text-neutral-400">
          <button
            type="button"
            onClick={readNickname}
            className={REF_BUTTON_CLASS}
          >
            Read value
          </button>
          <button
            type="button"
            onClick={() => {
              nicknameRef.current?.setValue("");
              readNickname();
            }}
            className={REF_BUTTON_CLASS}
          >
            Clear via ref
          </button>
          <span>
            getValue(): <code className="font-mono">{readValue}</code>
          </span>
        </div>
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Input
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            One labeled control per Field, driven entirely by its config.
            Required fields stay quiet until first blur; leave one empty, tab
            away, and the error appears — then clears the moment you fix the
            value. Length and pattern rules behave the same way, and the
            number Field coerces edits before storing them.
          </p>
        </div>
        <InputField config={nameConfig} />
        <InputField config={emailConfig} />
        <InputField config={passwordConfig} />
        <InputField config={ageConfig} />
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Textarea
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            The same Touched lifecycle over a multi-line control; a custom
            required message comes straight from the Validator.
          </p>
        </div>
        <TextareaField config={bioConfig} />
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Select
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            The closed face is a disclosure trigger: it shows the placeholder
            while empty, then the chosen Option&rsquo;s label. Clicking it
            opens the same searchable popup the multi-select uses, where
            clicking anywhere in a row picks that Option and closes again.
            Antarctica is disabled — inert everywhere — yet stays legally
            selected if your state holds it; a value no option matches
            renders as an inert fallback instead.
          </p>
        </div>
        <SelectField config={countryConfig} />
        <SelectField config={legacyPlanConfig} />
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Object-valued select
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Option values are unbounded: hand the Field whole domain objects
            and get the exact chosen object back through the ref or observer —
            no string mapping layer. Users only ever see labels. Matching is
            reference identity by default; these Fields configure
            matchValue to compare train ids, so a re-created copy of a
            domain object still Matches its Option. A held value that
            Matches nothing stays visible but inert: primitives render their
            string form, anything else renders the generic &ldquo;(unknown
            option)&rdquo; marker — never{" "}
            <code className="font-mono">[object Object]</code> — with a
            dev-only warning naming the Field.
          </p>
        </div>
        <SelectField config={trainConfig} />
        <SelectField config={retiredTrainConfig} />
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Multi-select
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Selections render as removable chips in a fixed-height strip that
            scrolls horizontally. &ldquo;Show options&rdquo; opens a plain
            disclosure popup: a search box filters the rows above a group of
            native checkboxes. Opening lands focus on the search box, Escape
            returns it to the button, clicking outside closes quietly, and
            removing the focused chip hops focus to its neighbour.
          </p>
        </div>
        <MultiSelectField config={tagsConfig} />
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Async options
          </h2>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <input
              type="checkbox"
              checked={simulateRejection}
              onChange={(event) =>
                toggleSimulateRejection(event.target.checked)
              }
              className="h-4 w-4 accent-neutral-900 dark:accent-neutral-100"
            />
            Simulate load rejection
          </label>
        </div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Both choice kinds load their options from a simulated API and open
          the same searchable popup. The loader fires once on mount: each
          control stays disabled with a muted &ldquo;Loading
          options…&rdquo; status until its options arrive, the popup refuses
          to open until then, and any held selection stays visible the whole
          time — for the multi-select as chips. Turn on the simulation, then
          hit Retry to see the rejection; turn it off and hit Retry to
          recover.
        </p>
        <SelectField config={regionConfig} />
        <MultiSelectField config={teamsConfig} />
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Checkbox
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            The consent pattern: the label sits right of the box, and
            &ldquo;required&rdquo; means must-tick — leave it unticked, tab
            away to see the error, then tick it to clear instantly.
          </p>
        </div>
        <CheckboxField config={consentConfig} />
      </section>
    </div>
  );
}
