// 3 테마 × 11 페이지 × 3 페르소나 매트릭스 검증
// 콘솔 에러·HTTP 응답·텍스트 누락·렌더 깨짐 자동 탐지

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT_DIR = path.join(__dirname, "..", "deliverables", "matrix-test");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const HIDE_OVERLAY = `
  nextjs-portal { display: none !important; }
  button[data-issues-count] { display: none !important; }
  [data-nextjs-dialog-overlay] { display: none !important; }
`;

const THEMES = ["light", "bloomberg", "navy"];
const PERSONAS = ["global_investor", "crypto_hybrid", "defensive"];
const PAGES = [
  { route: "/", name: "main" },
  { route: "/demo", name: "demo" },
  { route: "/portfolio", name: "portfolio" },
  { route: "/compare", name: "compare" },
  { route: "/asset-class/stocks", name: "asset_stocks" },
  { route: "/asset-class/bonds", name: "asset_bonds" },
  { route: "/asset-class/crypto", name: "asset_crypto" },
  { route: "/multi-compare", name: "multi_compare" },
  { route: "/sector/technology", name: "sector_tech" },
  { route: "/ask", name: "ask" },
  { route: "/search", name: "search" },
  { route: "/fundamentals", name: "fundamentals" },
  { route: "/report", name: "report" },
];

async function runOne(browser, { theme, route, name }) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const errors = [];
  const consoleErrors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const txt = msg.text();
      // hydration mismatch는 분리해서 카운트
      if (txt.includes("hydrated") || txt.includes("hydration")) {
        consoleErrors.push("HYDRATION_MISMATCH");
      } else if (!txt.includes("Failed to load") && !txt.includes("X-Frame-Options")) {
        consoleErrors.push(txt.slice(0, 120));
      }
    }
  });

  await page.evaluateOnNewDocument((t) => {
    localStorage.setItem("welcome_tour_seen_v1", "1");
    localStorage.setItem("marketlens_theme_v1", t);
  }, theme);

  const result = { theme, route, name, ok: true, errors: [], httpStatus: 0 };
  try {
    const resp = await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 30000 });
    result.httpStatus = resp ? resp.status() : 0;
    await new Promise((r) => setTimeout(r, 1500));
    await page.addStyleTag({ content: HIDE_OVERLAY });

    // 페이지 본문에 한국어 텍스트가 있는지 (영어 ratio 검증)
    const innerText = await page.evaluate(() => document.body.innerText || "");
    const koreanRatio = (innerText.match(/[가-힣]/g) || []).length / Math.max(1, innerText.length);
    if (innerText.length > 100 && koreanRatio < 0.05) {
      result.errors.push("KOREAN_TEXT_LOW (다국어/누락 의심)");
    }

    // 일부 페이지 핵심 텍스트 검증
    const keyText = {};
    keyText["main"] = ["멀티 에셋", "자산 클래스"];
    keyText["demo"] = ["둘러보기"];
    keyText["portfolio"] = ["포트폴리오"];
    keyText["compare"] = ["ETF"];
    keyText["asset_stocks"] = ["주식"];
    keyText["asset_bonds"] = ["채권"];
    keyText["asset_crypto"] = ["암호화폐"];
    keyText["multi_compare"] = ["프리셋"];
    keyText["sector_tech"] = ["기술"];
    keyText["ask"] = ["자연어"];
    keyText["search"] = ["검색"];
    if (keyText[name]) {
      for (const kt of keyText[name]) {
        if (!innerText.includes(kt)) {
          result.errors.push(`MISSING_TEXT: "${kt}"`);
        }
      }
    }

    // 스크린샷
    const screenshot = path.join(OUT_DIR, `${theme}_${name}.png`);
    await page.screenshot({ path: screenshot, fullPage: false });

    if (result.httpStatus !== 200) result.errors.push(`HTTP_${result.httpStatus}`);
    if (consoleErrors.length > 0) result.errors.push(`CONSOLE: ${consoleErrors.slice(0, 3).join("; ")}`);
    if (errors.length > 0) result.errors.push(`PAGE_ERR: ${errors.slice(0, 2).join("; ")}`);
  } catch (e) {
    result.errors.push(`EXCEPTION: ${e instanceof Error ? e.message : "unknown"}`);
  } finally {
    await page.close();
  }
  result.ok = result.errors.length === 0;
  return result;
}

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const all = [];
  let i = 0;
  const total = THEMES.length * PAGES.length;

  for (const theme of THEMES) {
    for (const p of PAGES) {
      i++;
      process.stdout.write(`\r[${i}/${total}] ${theme} · ${p.name}...                `);
      const r = await runOne(browser, { theme, route: p.route, name: p.name });
      all.push(r);
    }
  }
  process.stdout.write("\n");

  await browser.close();

  // 리포트
  const passed = all.filter((r) => r.ok).length;
  const failed = all.length - passed;
  const lines = [
    "# 매트릭스 검증 리포트 (3 테마 × 13 페이지)",
    "",
    `실행: ${new Date().toISOString()}`,
    `총 ${all.length}개 조합 · 성공 ${passed} · 실패 ${failed}`,
    "",
    "## 테마별 요약",
    "",
  ];
  for (const theme of THEMES) {
    const sub = all.filter((r) => r.theme === theme);
    const ok = sub.filter((r) => r.ok).length;
    lines.push(`- **${theme}**: ${ok}/${sub.length} 통과`);
  }
  lines.push("");
  lines.push("## 실패 항목 상세");
  lines.push("");
  for (const r of all.filter((r) => !r.ok)) {
    lines.push(`### ${r.theme} · ${r.name} (${r.route})`);
    lines.push(`- HTTP ${r.httpStatus}`);
    for (const e of r.errors) lines.push(`- ${e}`);
    lines.push("");
  }

  const out = path.join(OUT_DIR, "report.md");
  fs.writeFileSync(out, lines.join("\n"));
  console.log(`\n리포트: ${out}`);
  console.log(`\n=== 결과 ===`);
  console.log(`총 ${all.length}개 · 성공 ${passed} · 실패 ${failed}`);
  for (const theme of THEMES) {
    const sub = all.filter((r) => r.theme === theme);
    const ok = sub.filter((r) => r.ok).length;
    console.log(`  ${theme}: ${ok}/${sub.length}`);
  }
})();
