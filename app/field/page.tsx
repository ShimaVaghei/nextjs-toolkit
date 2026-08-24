"use client";

import { useState } from "react";
import { Field, type FieldConfig } from "@/components/Field";

export default function FieldDemoPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bio, setBio] = useState("");

  const nameConfig: FieldConfig = {
    kind: "input",
    inputType: "text",
    label: "Name",
    hint: "Shown publicly on your profile.",
    value: name,
    onValueChange: setName,
    validator: { required: true },
  };

  const emailConfig: FieldConfig = {
    kind: "input",
    inputType: "email",
    label: "Email",
    value: email,
    onValueChange: setEmail,
    validator: { required: true },
  };

  const passwordConfig: FieldConfig = {
    kind: "input",
    inputType: "password",
    label: "Password",
    hint: "Never shared.",
    value: password,
    onValueChange: setPassword,
  };

  const bioConfig: FieldConfig = {
    kind: "textarea",
    label: "Bio",
    hint: "A short introduction.",
    className: "max-w-md",
    value: bio,
    onValueChange: setBio,
    validator: { required: { value: true, message: "Tell us a bit about yourself." } },
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
            value.
          </p>
        </div>
        <Field config={nameConfig} />
        <Field config={emailConfig} />
        <Field config={passwordConfig} />
        <Field config={bioConfig} />
      </section>
    </div>
  );
}
