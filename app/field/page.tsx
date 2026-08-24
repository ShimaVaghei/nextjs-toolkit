"use client";

import { useState } from "react";
import { Field, type FieldConfig } from "@/components/Field";

export default function FieldDemoPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [consent, setConsent] = useState(false);
  const [country, setCountry] = useState("");
  const [legacyPlan, setLegacyPlan] = useState("starter");

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
