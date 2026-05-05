const puppeteer = require("puppeteer");
const path = require("path");

const BASE = "http://localhost:3000";
const OUT = path.join(__dirname, "deliverables", "screenshots");

const HIDE_OVERLAY = `
  nextjs-portal { display: none !important; }
  button[data-issues-count] { display: none !important; }
  [data-nextjs-dialog-overlay] { display: none !important; }
  #__next-build-watcher { display: none !important; }
`;

const PAGES = [
  { file: "01_main_dashboard.png",      url: "/",                  wait: 2500 },
  { file: "02_portfolio.png",           url: "/portfolio",         wait: 3500 },
  { file: "03_compare.png",             url: "/compare",           wait: 2500 },
  { file: "04_demo_vibecoding.png",     url: "/ask",               wait: 2000 },
  { file: "05_asset_class_equity.png",  url: "/assets?type=equity_etf", wait: 2500 },
  { file: "06_multi_compare.png",       url: "/compare",           wait: 2500 },
];

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  for (const p of PAGES) {
    console.log(`Capturing ${p.file} ...`);
    await page.goto(`${BASE}${p.url}`, { waitUntil: "networkidle2", timeout: 30000 });
    await page.addStyleTag({ content: HIDE_OVERLAY });
    await new Promise((r) => setTimeout(r, p.wait));
    await page.addStyleTag({ content: HIDE_OVERLAY }); // 동적 삽입 후 재적용
    await page.screenshot({ path: path.join(OUT, p.file), fullPage: false });
    console.log(`  -> saved`);
  }

  await browser.close();
  console.log("Done.");
})();
