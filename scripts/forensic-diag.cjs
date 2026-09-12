const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on("console", msg => console.log("CONSOLE:", msg.type(), msg.text().substring(0, 200)));
  page.on("pageerror", err => console.log("PAGE_ERROR:", err.message.substring(0, 300)));
  await page.goto("https://demo.mercenta.co.uk", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);
  const count = await page.locator("button").count();
  console.log("BUTTONS:", count);
  for (let i = 0; i < Math.min(count, 25); i++) {
    const t = (await page.locator("button").nth(i).textContent().catch(() => "") || "").trim();
    if (t) console.log("  btn", i, ":", t.substring(0, 80));
  }
  await browser.close();
})().catch(e => { console.error("FATAL:", e.message); process.exit(1); });
