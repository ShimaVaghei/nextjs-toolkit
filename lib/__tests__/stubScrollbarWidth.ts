// Shared test stub: simulates a scrollbar of the given width so scroll-lock
// code has something to measure in jsdom (which reports none on its own).
// Returns a restore function that puts the jsdom defaults back.
export function stubScrollbarWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1024,
  });
  Object.defineProperty(document.documentElement, "clientWidth", {
    configurable: true,
    value: 1024 - width,
  });
  return () => {
    // @ts-expect-error restore the jsdom defaults
    delete window.innerWidth;
    // @ts-expect-error restore the jsdom defaults
    delete document.documentElement.clientWidth;
  };
}
