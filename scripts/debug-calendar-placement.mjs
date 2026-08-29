// [DEBUG-c4l1] Temporary real-browser feedback loop for calendar placement bug.
// Drives /field in headless Chrome: positions the date trigger near the
// viewport bottom, opens the calendar, and reports data-placement on the
// first and second open. Run: node scripts/debug-calendar-placement.mjs
import puppeteer from "puppeteer-core";

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const URL = "http://localhost:3111/field";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--window-size=1280,768"],
  defaultViewport: { width: 1280, height: 768 },
});
const page = await browser.newPage();
page.on("console", (m) => console.log("[page]", m.text()));
await page.goto(URL, { waitUntil: "networkidle0" });
await page.evaluate(() => {
  // [DEBUG-c4l1]
  window.addEventListener("scroll", () => {
    console.log("[DEBUG-c4l1] SCROLL EVENT scrollY=", window.scrollY,
      "active=", document.activeElement?.tagName,
      document.activeElement?.getAttribute("aria-label") || document.activeElement?.textContent?.slice(0, 30));
  }, { passive: true });
});

// The date-only demo field's trigger: the button with aria-expanded whose
// aria-controls points at a dialog labelled "Choose date"-style panel.
async function findTrigger() {
  return page.evaluateHandle(() => {
    const btns = [...document.querySelectorAll("button[aria-expanded][aria-controls]")];
    const dbg = btns.map((b) => b.getAttribute("aria-controls"));
    console.log("[DEBUG-c4l1] candidate controls:", JSON.stringify(dbg));
    return btns.find((b) => {
      const panel = document.getElementById(b.getAttribute("aria-controls"));
      return panel && /calendar/i.test(panel.id);
    });
  });
}

const trigger = await findTrigger();
if (!(await trigger.asElement())) {
  console.log("[DEBUG-c4l1] FAIL: trigger not found");
  await browser.close();
  process.exit(1);
}

async function openAndMeasure(label) {
  // Scroll so the trigger sits near the viewport bottom (no space below).
  await page.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    window.scrollTo(0, window.scrollY + rect.bottom - 740);
  }, trigger);
  await new Promise((r) => setTimeout(r, 100));

  const before = await page.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, vh: window.innerHeight };
  }, trigger);
  console.log(`[DEBUG-c4l1] ${label}: trigger rect`, before);

  await trigger.asElement().click();
  await new Promise((r) => setTimeout(r, 300));

  const state = await page.evaluate(() => {
    const panel = document.querySelector('[role="dialog"][data-placement]');
    if (!panel) return null;
    const r = panel.getBoundingClientRect();
    return {
      placement: panel.getAttribute("data-placement"),
      panelTop: r.top,
      panelBottom: r.bottom,
      panelHeight: r.height,
      overflowBelow: r.bottom > window.innerHeight,
    };
  });
  console.log(`[DEBUG-c4l1] ${label}:`, JSON.stringify(state));

  // Close for the next iteration (Escape).
  await page.keyboard.press("Escape");
  await new Promise((r) => setTimeout(r, 200));
  return state;
}

const first = await openAndMeasure("FIRST open ");
const second = await openAndMeasure("SECOND open");
const third = await openAndMeasure("THIRD open ");

console.log("[DEBUG-c4l1] SUMMARY first:", first && first.placement, "second:", second && second.placement, "third:", third && third.placement);

await browser.close();
