const puppeteer = require("puppeteer");
const path = require("path");

const BASE = "http://localhost:3000";
const OUT = path.join(__dirname, "..", "deliverables", "screenshots");

const HIDE_OVERLAY = `
  nextjs-portal { display: none !important; }
  button[data-issues-count] { display: none !important; }
  [data-nextjs-dialog-overlay] { display: none !important; }
  #__next-build-watcher { display: none !important; }
`;

const PAGES = [
  { file: "01_main_dashboard.png",      url: "/",                    wait: 2500 },
  { file: "02_portfolio.png",           url: "/portfolio",           wait: 3500 },
  { file: "03_compare.png",             url: "/compare",             wait: 5000 },
  { file: "04_demo_vibecoding.png",     url: "/demo",                wait: 2000 },
  { file: "05_asset_class_equity.png",  url: "/asset-class/stocks",  wait: 2500 },
  { file: "06_multi_compare.png",       url: "/multi-compare",       wait: 2500 },
];

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 온보딩 팝업 억제: localStorage에 seen 키 미리 설정
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("welcome_tour_seen_v1", "1");
  });

  for (const p of PAGES) {
    console.log(`Capturing ${p.file} ...`);
    await page.goto(`${BASE}${p.url}`, { waitUntil: "load", timeout: 60000 });
    await page.addStyleTag({ content: HIDE_OVERLAY });
    await new Promise((r) => setTimeout(r, p.wait));
    await page.addStyleTag({ content: HIDE_OVERLAY });
    await page.screenshot({ path: path.join(OUT, p.file), fullPage: false });
    console.log(`  -> saved`);
  }

  await browser.close();
  console.log("Done.");
})();
