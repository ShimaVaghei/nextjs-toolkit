import { createRef, act } from "react";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import {
  CheckboxField,
  InputField,
  MultiSelectField,
  SelectField,
  TextareaField,
  DateField,
  DateTimeField,
  DateRangeField,
  DateTimeRangeField,
  NumberRangeField,
  type FieldCheckboxConfig,
  type FieldDateConfig,
  type FieldDateTimeConfig,
  type FieldDateRangeConfig,
  type FieldDateTimeRangeConfig,
  type FieldDateRangeValue,
  type FieldHandle,
  type FieldInputConfig,
  type FieldMultiSelectConfig,
  type FieldNumberRangeConfig,
  type FieldNumberRangeValue,
  type FieldOption,
  type FieldSelectConfig,
  type FieldTextareaConfig,
  type FieldValue,
} from "../Field";

export const DEFAULT_REQUIRED_MESSAGE = "This field is required.";

export function makeConfig(
  overrides: Partial<FieldInputConfig> = {},
): FieldInputConfig {
  return { label: "Name", validator: { required: true }, ...overrides };
}

export function InputHarness({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldInputConfig>;
  onChangeSpy?: (value: string | number) => void;
  handleRef?: React.Ref<FieldHandle<string | number>>;
}) {
  return (
    <InputField
      ref={handleRef}
      config={{
        label: "Name",
        validator: { required: true },
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

export function TextareaHarness({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldTextareaConfig>;
  onChangeSpy?: (value: string) => void;
  handleRef?: React.Ref<FieldHandle<string>>;
}) {
  return (
    <TextareaField
      ref={handleRef}
      config={{
        label: "Name",
        validator: { required: true },
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

export function CheckboxHarness({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldCheckboxConfig>;
  onChangeSpy?: (value: boolean) => void;
  handleRef?: React.Ref<FieldHandle<boolean>>;
}) {
  return (
    <CheckboxField
      ref={handleRef}
      config={{
        label: "Name",
        validator: { required: true },
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

export function SelectHarness<T>({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldSelectConfig<T>>;
  onChangeSpy?: (value: T) => void;
  handleRef?: React.Ref<FieldHandle<T>>;
}) {
  return (
    <SelectField
      ref={handleRef}
      config={{
        label: "Name",
        validator: { required: true },
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

export function MultiSelectHarness<T>({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldMultiSelectConfig<T>>;
  onChangeSpy?: (value: T[]) => void;
  handleRef?: React.Ref<FieldHandle<T[]>>;
}) {
  return (
    <MultiSelectField
      ref={handleRef}
      config={{
        label: "Name",
        validator: { required: true },
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

export function describedIds(control: HTMLElement): string[] {
  return (control.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .filter(Boolean);
}

export function hintParagraph(control: HTMLElement): HTMLElement | null {
  const ids = describedIds(control);
  return ids.length > 0 ? document.getElementById(ids[0]) : null;
}

export function errorParagraph(control: HTMLElement): HTMLElement | null {
  const ids = describedIds(control);
  return ids.length > 1 ? document.getElementById(ids[ids.length - 1]) : null;
}

export function labelFor(control: HTMLElement): HTMLLabelElement | null {
  return document.querySelector(
    `label[for="${control.id}"]`,
  ) as HTMLLabelElement | null;
}

export const requiredControl = (label: string) =>
  screen.getByRole("textbox", { name: `${label} (required)` });

export function SeededRerenderer({
  initialValue,
}: {
  initialValue?: string | number;
}) {
  return (
    <InputField
      config={makeConfig({
        validator: undefined,
        ...(initialValue === undefined ? {} : { initialValue }),
      })}
    />
  );
}

export function fireRawChange(control: HTMLElement, raw: string) {
  const input = control as HTMLInputElement;
  const originalType = input.type;
  input.type = "text";
  fireEvent.change(input, { target: { value: raw } });
  input.type = originalType;
}

export const COUNTRY_OPTIONS = [
  { label: "France", value: "fr" },
  { label: "Japan", value: "jp" },
];

export const selectTrigger = (name: string) =>
  screen.getByRole("button", { name }) as HTMLButtonElement;

export const SELECT_OVERRIDES: Partial<FieldSelectConfig<string>> = {
  label: "Country",
  validator: undefined,
  options: COUNTRY_OPTIONS,
};

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

export const REGION_OPTIONS: FieldOption[] = [
  { label: "Africa", value: "af" },
  { label: "Europe", value: "eu" },
];

export const TAG_OPTIONS: FieldOption<string>[] = [
  { label: "Design", value: "design" },
  { label: "Research", value: "research" },
  { label: "Engineering", value: "engineering" },
];

export function tagOverrides(): Partial<FieldMultiSelectConfig<string>> {
  return {
    label: "Tags",
    validator: undefined,
    options: TAG_OPTIONS,
  };
}

export function chipTagOverrides(): Partial<FieldMultiSelectConfig<string>> {
  return { ...tagOverrides(), selectionDisplay: "chips" };
}

export function politeRegion(): HTMLElement {
  return document.querySelector('[aria-live="polite"]') as HTMLElement;
}

export type Train = { id: number; codename: string };

export const KEPLER: Train = { id: 1, codename: "kepler" };
export const HOPPER: Train = { id: 2, codename: "hopper" };
export const LOVELACE: Train = { id: 3, codename: "lovelace" };

export const TRAIN_OPTIONS: FieldOption<Train>[] = [
  { label: "Kepler", value: KEPLER },
  { label: "Hopper", value: HOPPER },
  { label: "Lovelace", value: LOVELACE, disabled: true },
];

export const matchById = (a: Train, b: Train) => a.id === b.id;

export function trainOverrides(): Partial<FieldSelectConfig<Train>> {
  return {
    label: "Release train",
    validator: undefined,
    placeholder: "Choose a train",
    options: TRAIN_OPTIONS,
  };
}

export function DateHarness({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldDateConfig>;
  onChangeSpy?: (value: string) => void;
  handleRef?: React.Ref<FieldHandle<string>>;
}) {
  return (
    <DateField
      ref={handleRef}
      config={{
        label: "Birthday",
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

export function DateTimeHarness({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldDateTimeConfig>;
  onChangeSpy?: (value: string) => void;
  handleRef?: React.Ref<FieldHandle<string>>;
}) {
  return (
    <DateTimeField
      ref={handleRef}
      config={{
        label: "Appointment",
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

export function DateRangeHarness({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldDateRangeConfig>;
  onChangeSpy?: (value: FieldDateRangeValue) => void;
  handleRef?: React.Ref<FieldHandle<FieldDateRangeValue>>;
}) {
  return (
    <DateRangeField
      ref={handleRef}
      config={{
        label: "Booking",
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

export function DateTimeRangeHarness({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldDateTimeRangeConfig>;
  onChangeSpy?: (value: FieldDateRangeValue) => void;
  handleRef?: React.Ref<FieldHandle<FieldDateRangeValue>>;
}) {
  return (
    <DateTimeRangeField
      ref={handleRef}
      config={{
        label: "Window",
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

export function NumberRangeHarness({
  overrides = {},
  onChangeSpy,
  handleRef,
}: {
  overrides?: Partial<FieldNumberRangeConfig>;
  onChangeSpy?: (value: FieldNumberRangeValue) => void;
  handleRef?: React.Ref<FieldHandle<FieldNumberRangeValue>>;
}) {
  return (
    <NumberRangeField
      ref={handleRef}
      config={{
        label: "Quantity",
        onValueChange: onChangeSpy,
        ...overrides,
      }}
    />
  );
}

export {
  render,
  screen,
  fireEvent,
  cleanup,
  within,
  createRef,
  act,
};
