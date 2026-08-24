"use client";

import { useRef, useState } from "react";
import { Field, type FieldConfig } from "@/components/Field";

export default function FieldDemoPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [consent, setConsent] = useState(false);
  const [country, setCountry] = useState("");
  const [tags, setTags] = useState<string[]>(["research"]);
  const [legacyPlan, setLegacyPlan] = useState("starter");
  const [region, setRegion] = useState("");
  const [simulateRejection, setSimulateRejection] = useState(false);

  // Kept out of render state so the mounted loader is never re-fired by a
  // toggle; each attempt reads the ref when it settles, and Retry always sees
  // the latest position.
  const regionRejectionRef = useRef(false);

  const nameConfig: FieldConfig = {
    kind: "input",
    inputType: "text",
    label: "Name",
    hint: "Shown publicly on your profile.",
    value: name,
    onValueChange: (value) => setName(String(value)),
    validator: { required: true },
  };

  const emailConfig: FieldConfig = {
    kind: "input",
    inputType: "email",
    label: "Email",
    value: email,
    onValueChange: (value) => setEmail(String(value)),
    validator: { required: true, regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  };

  const passwordConfig: FieldConfig = {
    kind: "input",
    inputType: "password",
    label: "Password",
    hint: "Never shared.",
    value: password,
    onValueChange: (value) => setPassword(String(value)),
    validator: { minLength: 8 },
  };

  const bioConfig: FieldConfig = {
    kind: "textarea",
    label: "Bio",
    hint: "A short introduction.",
    className: "max-w-md",
    value: bio,
    onValueChange: (value) => setBio(String(value)),
    validator: {
      required: { value: true, message: "Tell us a bit about yourself." },
      maxLength: 200,
    },
  };

  const ageConfig: FieldConfig = {
    kind: "input",
    inputType: "number",
    label: "Age",
    hint: "Whole years; empty or unparseable counts as not filled in.",
    value: age,
    onValueChange: (value) => setAge(typeof value === "number" ? value : ""),
    validator: { min: { value: 0, message: "Age cannot be negative." }, max: 120 },
  };

  const consentConfig: FieldConfig = {
    kind: "checkbox",
    label: "I agree to the terms of service.",
    hint: "Required to continue — an unticked box counts as not filled in.",
    value: consent,
    onValueChange: (value) => setConsent(value === true),
    validator: {
      required: { value: true, message: "You must accept the terms." },
    },
  };

  const countryConfig: FieldConfig = {
    kind: "select",
    label: "Country",
    hint: "Static options; the placeholder drops out of the dropdown once a value is chosen.",
    value: country,
    onValueChange: (value) => setCountry(String(value)),
    validator: { required: { value: true, message: "Choose a country." } },
    placeholder: "Choose a country",
    options: [
      { label: "France", value: "fr" },
      { label: "Japan", value: "jp" },
      { label: "United States", value: "us" },
      { label: "Antarctica — research programmes only", value: "aq", disabled: true },
    ],
  };

  const tagsConfig: FieldConfig = {
    kind: "multi-select",
    label: "Tags",
    hint: "Chips scroll horizontally inside a fixed-height control; removing one announces the change politely.",
    value: tags,
    onValueChange: (value) => setTags(Array.isArray(value) ? value : []),
    validator: { required: { value: true, message: "Pick at least one tag." } },
    options: [
      { label: "Design", value: "design" },
      { label: "Research", value: "research" },
      { label: "Engineering", value: "engineering" },
      { label: "Documentation", value: "docs" },
      { label: "Accessibility", value: "a11y" },
    ],
  };

  const legacyPlanConfig: FieldConfig = {
    kind: "select",
    label: "Plan",
    hint: "Holds the retired Starter plan selected by default (keepDisabledSelection); pick another to move off it.",
    value: legacyPlan,
    onValueChange: (value) => setLegacyPlan(String(value)),
    placeholder: "Choose a plan",
    options: [
      { label: "Starter (retired)", value: "starter", disabled: true },
      { label: "Growth", value: "growth" },
      { label: "Scale", value: "scale" },
    ],
  };

  const regionConfig: FieldConfig = {
    kind: "select",
    label: "Region",
    hint: "Options come from a simulated API; flip the toggle, then hit Retry to walk the failure path.",
    value: region,
    onValueChange: (value) => setRegion(String(value)),
    validator: { required: { value: true, message: "Choose a region." } },
    placeholder: "Choose a region",
    options: () =>
      new Promise((resolve, reject) => {
        window.setTimeout(() => {
          if (regionRejectionRef.current) {
            reject(new Error("Simulated region load rejection."));
          } else {
            resolve([
              { label: "Africa", value: "af" },
              { label: "Americas", value: "am" },
              { label: "Asia", value: "as" },
              { label: "Europe", value: "eu" },
              { label: "Oceania", value: "oc" },
            ]);
          }
        }, 800);
      }),
  };

  const toggleSimulateRejection = (checked: boolean) => {
    regionRejectionRef.current = checked;
    setSimulateRejection(checked);
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
            Input &amp; textarea
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            One labeled control per Field, driven entirely by its config.
            Required fields stay quiet until first blur; leave one empty, tab
            away, and the error appears — then clears the moment you fix the
            value. Length and pattern rules behave the same way.
          </p>
        </div>
        <Field config={nameConfig} />
        <Field config={emailConfig} />
        <Field config={passwordConfig} />
        <Field config={bioConfig} />
        <Field config={ageConfig} />
      </section>

      <section className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Select
          </h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Static options behind the usual config. The placeholder is a ghost
            option: it labels the closed control while empty and drops out of
            the dropdown once you choose. Antarctica is disabled yet stays
            legally selected if your state holds it; a value no option matches
            renders as a raw-value fallback instead.
          </p>
        </div>
        <Field config={countryConfig} />
        <Field config={legacyPlanConfig} />
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
        <Field config={tagsConfig} />
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
          The loader fires once on mount: the control stays disabled with a
          muted &ldquo;Loading options…&rdquo; status until the options
          arrive. Turn on the simulation, then hit Retry to see the rejection;
          turn it off and hit Retry to recover. A held selection stays visible
          the whole time.
        </p>
        <Field config={regionConfig} />
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
        <Field config={consentConfig} />
      </section>
    </div>
  );
}
