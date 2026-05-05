// PDF 첫 페이지 + 중간 페이지 미리보기 PNG 생성
const path = require("path");
const fs = require("fs");
const puppeteer = require(path.join(__dirname, "..", "dashboard", "node_modules", "puppeteer"));

const PDF = "file:///" + path.join(__dirname, "..", "deliverables", "Skills.md.pdf").replace(/\\/g, "/");
const OUT_DIR = path.join(__dirname, "..", "deliverables", "pdf-preview");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1700 });

  await page.goto(PDF, { waitUntil: "load", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 3000));

  await page.screenshot({
    path: path.join(OUT_DIR, "page_1.png"),
    fullPage: false,
  });
  console.log("page_1.png 저장");

  await browser.close();
})();
