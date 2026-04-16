#!/usr/bin/env node
// Extract a view-only Google Drive PDF by scrolling the web viewer
// and capturing the per-page blob images into a jsPDF document.
//
// Port of apokaliptics/google-drive-extract (content.js) to headless Playwright.
//
// Usage: node extract-drive-pdf.js <drive_file_id> <output_pdf_path>

const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const FILE_ID = process.argv[2];
const OUTPUT_PATH = process.argv[3];

if (!FILE_ID || !OUTPUT_PATH) {
  console.error("Usage: node extract-drive-pdf.js <file_id> <output_pdf>");
  process.exit(1);
}

const VIEWER_URL = `https://drive.google.com/file/d/${FILE_ID}/view`;
const JSPDF_PATH = path.join(__dirname, "vendor", "jspdf.umd.min.js");

(async () => {
  console.log(`[1/5] Launching headless Chromium...`);
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const context = await browser.newContext({
    viewport: { width: 1400, height: 1800 },
    ignoreHTTPSErrors: true,
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  // Inject jsPDF before any page loads (bypasses Drive's Trusted Types CSP).
  const jspdfSrc = fs.readFileSync(JSPDF_PATH, "utf-8");
  await context.addInitScript({ content: jspdfSrc });

  const page = await context.newPage();

  console.log(`[2/5] Navigating to ${VIEWER_URL}`);
  await page.goto(VIEWER_URL, {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });

  // Let the viewer's JS finish initializing.
  await page.waitForTimeout(6000);

  // Wait for at least one page image to appear before we start.
  console.log(`[3/5] Waiting for first page to render...`);
  try {
    await page.waitForFunction(
      () =>
        Array.from(document.querySelectorAll("img")).some(
          (i) => /^blob:/i.test(i.src) && i.naturalWidth > 0
        ),
      null,
      { timeout: 60000 }
    );
  } catch (err) {
    const title = await page.title();
    const bodyText = (await page.evaluate(() => document.body.innerText || ""))
      .slice(0, 400);
    console.error(`Timed out waiting for viewer. Page title: "${title}"`);
    console.error(`Body excerpt: ${bodyText}`);
    await browser.close();
    process.exit(2);
  }

  console.log(`[4/5] Scrolling to capture all pages...`);

  // Run the capture logic in-page.
  const result = await page.evaluate(async () => {
    function collectBlobImages() {
      return Array.from(document.querySelectorAll("img"))
        .filter((img) => /^blob:/i.test(img.src))
        .filter((img) => img.naturalWidth > 0 && img.naturalHeight > 0);
    }

    function findScrollContainer() {
      for (const el of document.querySelectorAll("*")) {
        const s = getComputedStyle(el);
        if (
          (s.overflowY === "auto" || s.overflowY === "scroll") &&
          el.scrollHeight > el.clientHeight + 200 &&
          el.querySelector('img[src^="blob:"]')
        ) {
          return el;
        }
      }
      const doc = document.querySelector('[role="document"]');
      if (doc && doc.scrollHeight > doc.clientHeight) return doc;
      return document.scrollingElement || document.documentElement;
    }

    // Auto-scroll, waiting for new blob images to settle.
    await new Promise((resolve) => {
      let container = findScrollContainer();
      let lastCount = 0;
      let stableTime = 0;
      let elapsed = 0;
      const STEP = 500;
      const INTERVAL = 300;
      const STABLE_WAIT = 3000;
      const MAX_WAIT = 300000;

      const tick = () => {
        elapsed += INTERVAL;
        if (elapsed > MAX_WAIT) return resolve();
        if (!container || !container.isConnected) {
          container = findScrollContainer();
        }
        container.scrollTop += STEP;
        const count = collectBlobImages().length;
        const atBottom =
          container.scrollTop + container.clientHeight >=
          container.scrollHeight - 10;
        if (atBottom) {
          if (count === lastCount) stableTime += INTERVAL;
          else stableTime = 0;
          if (stableTime >= STABLE_WAIT && count > 0) return resolve();
        }
        lastCount = count;
        setTimeout(tick, INTERVAL);
      };
      tick();
    });

    const images = collectBlobImages();
    if (images.length === 0) return { error: "No page images found." };

    const { jsPDF } = window.jspdf;
    const first = images[0];
    const pdf = new jsPDF({
      orientation:
        first.naturalWidth > first.naturalHeight ? "landscape" : "portrait",
      unit: "px",
      format: [first.naturalWidth, first.naturalHeight],
      compress: true,
    });

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      const data = c.toDataURL("image/jpeg", 0.95);
      if (i > 0) pdf.addPage([w, h], w > h ? "landscape" : "portrait");
      pdf.addImage(data, "JPEG", 0, 0, w, h);
    }

    const b64 = pdf.output("datauristring").split(",")[1];

    // Best-effort filename
    let filename = "drive-download";
    for (const sel of [
      '[data-tooltip-unhoverable="true"]',
      ".uc-name-size a",
      '[role="heading"]',
    ]) {
      const el = document.querySelector(sel);
      if (el && el.textContent.trim()) {
        filename = el.textContent
          .trim()
          .replace(/\.pdf$/i, "")
          .replace(/[\\/:*?"<>|]/g, "_")
          .trim();
        break;
      }
    }
    return { pdfBase64: b64, pageCount: images.length, filename };
  });

  if (result.error) {
    console.error(`Error: ${result.error}`);
    await browser.close();
    process.exit(3);
  }

  console.log(
    `[5/5] Captured ${result.pageCount} page(s). Detected title: "${result.filename}"`
  );

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, Buffer.from(result.pdfBase64, "base64"));
  const sizeKB = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
  console.log(`Saved ${OUTPUT_PATH} (${sizeKB} KB)`);

  await browser.close();
})();
