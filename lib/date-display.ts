export const DATE_DISPLAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export const DATETIME_DISPLAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
