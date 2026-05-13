// 페르소나 기반 사용자 여정 자동 테스트
// 3 페르소나(박정숙·이하은·김민준)가 핵심 작업을 완료할 수 있는지 검증
// 측정: 클릭 수, 소요 시간, 정보 도달 여부, 화면 막힘 지점, 콘솔 에러

const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:3000";
const OUT_DIR = path.join(__dirname, "..", "deliverables", "persona-test");
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const HIDE_OVERLAY = `
  nextjs-portal { display: none !important; }
  button[data-issues-count] { display: none !important; }
  [data-nextjs-dialog-overlay] { display: none !important; }
`;

// 헬퍼: 텍스트 포함 요소 클릭
async function clickByText(page, tag, text) {
  const clicked = await page.evaluate(
    (tag, text) => {
      const els = Array.from(document.querySelectorAll(tag));
      const target = els.find((e) => e.textContent && e.textContent.includes(text));
      if (target) { target.click(); return true; }
      return false;
    },
    tag,
    text
  );
  return clicked;
}

// 헬퍼: 페이지 안에 텍스트 존재?
async function hasText(page, text) {
  return await page.evaluate(
    (t) => document.body.innerText.includes(t),
    text
  );
}

async function setupPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem("welcome_tour_seen_v1", "1");
  });
  const errors = [];
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console.error: ${msg.text()}`);
  });
  return { page, errors };
}

async function snap(page, persona, step) {
  await page.addStyleTag({ content: HIDE_OVERLAY });
  const file = path.join(OUT_DIR, `${persona}_${step}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

// =========================================================
// 페르소나 1: 박정숙 (62세, 은퇴자) — "변동성 낮은 채권 찾기"
// =========================================================
async function testPark(browser) {
  const persona = "park";
  const { page, errors } = await setupPage(browser);
  const result = {
    persona: "박정숙 (62세, 은퇴자)",
    goal: "변동성 낮은 채권 자산 찾기",
    steps: [],
    bottlenecks: [],
    errors,
  };
  const startTime = Date.now();
  let clickCount = 0;

  // 1. 메인 진입 — 박정숙은 defensive 페르소나로 시작 (URL ?persona= 검증)
  await page.goto(`${BASE}/?persona=defensive`, { waitUntil: "load", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));
  result.steps.push({ step: "메인 진입 (defensive 페르소나)", elapsed: Date.now() - startTime });
  await snap(page, persona, "1_main");

  // 2. "처음이신가요?" 배너 + 페르소나 배너 확인
  const bannerVisible = await hasText(page, "처음이신가요?");
  if (!bannerVisible) result.bottlenecks.push("초보자용 진입 배너 없음");
  const personaVisible = await hasText(page, "안정형");
  if (!personaVisible) result.bottlenecks.push("defensive 페르소나 배너 누락");

  // 3. defensive 기본 활성: bond/commodity/equity_etf. 원자재·주식 끄기 → 채권만 남음
  const turnOff = ["주식 / ETF", "원자재"];
  for (const label of turnOff) {
    const ok = await clickByText(page, "button", label);
    if (ok) clickCount++;
    else result.bottlenecks.push(`"${label}" 칩 클릭 실패`);
    await new Promise((r) => setTimeout(r, 200));
  }
  await new Promise((r) => setTimeout(r, 800));
  result.steps.push({ step: "채권만 필터", clickCount, elapsed: Date.now() - startTime });
  await snap(page, persona, "2_filtered");

  // 4. 채권 자산이 표에 나오는지 확인
  const bondVisible = await hasText(page, "^TNX") || await hasText(page, "^IRX");
  if (!bondVisible) result.bottlenecks.push("필터 후 채권 자산 화면에 표시 안됨");

  // 5. 변동성 컬럼 클릭으로 정렬
  const sortClicked = await page.evaluate(() => {
    const ths = Array.from(document.querySelectorAll("th"));
    const target = ths.find((th) => th.textContent && th.textContent.includes("변동성"));
    if (target) { target.click(); return true; }
    return false;
  });
  if (sortClicked) clickCount++;
  else result.bottlenecks.push("변동성 정렬 헤더 클릭 실패");
  await new Promise((r) => setTimeout(r, 800));

  // 6. 채권/금리 자산 클래스 깊이 분석 페이지로 이동
  await page.goto(`${BASE}/asset-class/bonds`, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 2500));
  clickCount++;
  result.steps.push({ step: "채권 깊이 분석 진입", clickCount, elapsed: Date.now() - startTime });
  await snap(page, persona, "3_bond_detail");

  // 7. 핵심 정보 검증
  const checks = {
    "채권 헤더 표시": await hasText(page, "채권"),
    "현재 금리 지표": await hasText(page, "현재 금리") || await hasText(page, "금리"),
    "금리 변화 표시": await hasText(page, "bps") || await hasText(page, "금리 변화"),
    "지표 툴팁 안내": await hasText(page, "마우스를 올리면"),
  };
  for (const [k, v] of Object.entries(checks)) {
    if (!v) result.bottlenecks.push(`"${k}" 미발견`);
  }

  result.totalClicks = clickCount;
  result.totalElapsedMs = Date.now() - startTime;
  result.success = result.bottlenecks.length === 0;

  await page.close();
  return result;
}

// =========================================================
// 페르소나 2: 이하은 (24세, 코인) — "BTC와 알트코인 비교"
// =========================================================
async function testLee(browser) {
  const persona = "lee";
  const { page, errors } = await setupPage(browser);
  const result = {
    persona: "이하은 (24세, 코인)",
    goal: "BTC와 ETH/SOL 등 알트코인 모멘텀 비교",
    steps: [],
    bottlenecks: [],
    errors,
  };
  const startTime = Date.now();
  let clickCount = 0;

  // 1. 메인 진입
  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2000));
  result.steps.push({ step: "메인 진입", elapsed: Date.now() - startTime });

  // 2. 자산 비교 페이지로
  await page.goto(`${BASE}/multi-compare`, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 3000));
  clickCount++;
  result.steps.push({ step: "자산 비교 페이지", clickCount, elapsed: Date.now() - startTime });
  await snap(page, persona, "1_multi_compare");

  // 3. "암호화폐 톱5" 프리셋 클릭
  const presetClicked = await clickByText(page, "button", "암호화폐 톱5");
  if (presetClicked) clickCount++;
  else result.bottlenecks.push("암호화폐 톱5 프리셋 버튼 못 찾음");
  await new Promise((r) => setTimeout(r, 2500));
  result.steps.push({ step: "암호화폐 프리셋 적용", clickCount, elapsed: Date.now() - startTime });
  await snap(page, persona, "2_crypto_preset");

  // 4. BTC + ETH + SOL 모두 차트에 나오는지
  const cryptoChecks = {
    "BTC 표시": await hasText(page, "BTC-USD") || await hasText(page, "BTC"),
    "ETH 표시": await hasText(page, "ETH-USD") || await hasText(page, "ETH"),
    "SOL 표시": await hasText(page, "SOL-USD") || await hasText(page, "SOL"),
  };
  for (const [k, v] of Object.entries(cryptoChecks)) {
    if (!v) result.bottlenecks.push(`"${k}" 미발견`);
  }

  // 5. 누적 수익률 차트 영역 보이는지
  const chartVisible = await hasText(page, "누적 수익률") || await hasText(page, "수익률 비교");
  if (!chartVisible) result.bottlenecks.push("누적 수익률 차트 제목 미발견");

  // 6. /asset-class/crypto 진입 (깊이 분석)
  await page.goto(`${BASE}/asset-class/crypto`, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 2500));
  clickCount++;
  result.steps.push({ step: "암호화폐 깊이 분석", clickCount, elapsed: Date.now() - startTime });
  await snap(page, persona, "3_crypto_detail");

  const cryptoMetrics = {
    "BTC 상관계수 지표": await hasText(page, "BTC 상관") || await hasText(page, "btcCorr"),
    "주식 상관계수 지표": await hasText(page, "주식 상관"),
    "변동성 지표": await hasText(page, "변동성"),
  };
  for (const [k, v] of Object.entries(cryptoMetrics)) {
    if (!v) result.bottlenecks.push(`"${k}" 미발견`);
  }

  result.totalClicks = clickCount;
  result.totalElapsedMs = Date.now() - startTime;
  result.success = result.bottlenecks.length === 0;

  await page.close();
  return result;
}

// =========================================================
// 페르소나 3: 김민준 (33세, 서학개미) — "SPY 원화 실수익"
// =========================================================
async function testKim(browser) {
  const persona = "kim";
  const { page, errors } = await setupPage(browser);
  const result = {
    persona: "김민준 (33세, 서학개미)",
    goal: "SPY 등 미국 자산의 원화 환산 실질 수익 확인",
    steps: [],
    bottlenecks: [],
    errors,
  };
  const startTime = Date.now();
  let clickCount = 0;

  // 1. 메인 진입
  await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 2500));
  result.steps.push({ step: "메인 진입", elapsed: Date.now() - startTime });
  await snap(page, persona, "1_main");

  // 2. "시장 분석" 버튼 클릭
  const summaryClicked = await clickByText(page, "button", "시장 분석");
  if (summaryClicked) clickCount++;
  else result.bottlenecks.push('"시장 분석" 버튼 못 찾음');
  await new Promise((r) => setTimeout(r, 2000));
  result.steps.push({ step: "시장 분석 클릭", clickCount, elapsed: Date.now() - startTime });
  await snap(page, persona, "2_market_summary");

  // 3. 시장 분석 카드에 KRW 환산 정보 확인
  const krwChecks = {
    "원화 환산 또는 KRW 표시": await hasText(page, "원화 환산") || await hasText(page, "KRW"),
    "달러 강세/약세 표시": await hasText(page, "달러 강세") || await hasText(page, "달러 약세"),
    "regime 라벨": await hasText(page, "리스크 온") || await hasText(page, "중립") || await hasText(page, "리스크 오프"),
  };
  for (const [k, v] of Object.entries(krwChecks)) {
    if (!v) result.bottlenecks.push(`"${k}" 미발견`);
  }

  // 4. /asset-class/stocks (주식 깊이 분석)
  await page.goto(`${BASE}/asset-class/stocks`, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 2500));
  clickCount++;
  result.steps.push({ step: "주식/ETF 깊이 분석", clickCount, elapsed: Date.now() - startTime });
  await snap(page, persona, "3_stocks_detail");

  // 5. SPY 정보 + 베타·샤프 표시
  const stocksChecks = {
    "SPY 행 존재": await hasText(page, "SPY"),
    "샤프 비율 컬럼": await hasText(page, "샤프"),
    "베타 컬럼": await hasText(page, "베타"),
  };
  for (const [k, v] of Object.entries(stocksChecks)) {
    if (!v) result.bottlenecks.push(`"${k}" 미발견`);
  }

  // 6. /portfolio (포트폴리오 빌더)
  await page.goto(`${BASE}/portfolio`, { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 3000));
  clickCount++;
  result.steps.push({ step: "포트폴리오 빌더", clickCount, elapsed: Date.now() - startTime });
  await snap(page, persona, "4_portfolio");

  const portfolioChecks = {
    "비중 슬라이더": (await page.$$("input[type=range]")).length > 0,
    "균등 배분 버튼": await hasText(page, "균등 배분"),
    "링크 공유 버튼": await hasText(page, "링크 공유"),
  };
  for (const [k, v] of Object.entries(portfolioChecks)) {
    if (!v) result.bottlenecks.push(`"${k}" 미발견`);
  }

  result.totalClicks = clickCount;
  result.totalElapsedMs = Date.now() - startTime;
  result.success = result.bottlenecks.length === 0;

  await page.close();
  return result;
}

// =========================================================
// 메인 실행
// =========================================================
(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const all = [];

  console.log("[1/3] 박정숙 (안정형 은퇴자) 테스트...");
  all.push(await testPark(browser));

  console.log("[2/3] 이하은 (코인 투자자) 테스트...");
  all.push(await testLee(browser));

  console.log("[3/3] 김민준 (서학개미) 테스트...");
  all.push(await testKim(browser));

  await browser.close();

  // 리포트 생성
  const lines = ["# 페르소나 자동 테스트 리포트", ""];
  lines.push(`실행: ${new Date().toISOString()}`);
  lines.push("");
  for (const r of all) {
    lines.push(`## ${r.persona}`);
    lines.push(`- 목표: ${r.goal}`);
    lines.push(`- 총 클릭: ${r.totalClicks} · 소요 시간: ${(r.totalElapsedMs / 1000).toFixed(1)}초`);
    lines.push(`- 결과: ${r.success ? "성공" : "병목 발견"}`);
    lines.push("");
    lines.push("### 단계별");
    for (const s of r.steps) {
      lines.push(`- ${s.step} (${s.clickCount ?? "-"} clicks, ${(s.elapsed / 1000).toFixed(1)}s)`);
    }
    lines.push("");
    if (r.bottlenecks.length > 0) {
      lines.push("### 발견된 병목 / 누락");
      for (const b of r.bottlenecks) lines.push(`- ${b}`);
      lines.push("");
    }
    if (r.errors.length > 0) {
      lines.push("### 콘솔 에러");
      for (const e of r.errors.slice(0, 5)) lines.push(`- ${e}`);
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }
  const reportPath = path.join(OUT_DIR, "report.md");
  fs.writeFileSync(reportPath, lines.join("\n"));
  console.log(`\n리포트: ${reportPath}`);
  console.log(`스크린샷: ${OUT_DIR}`);

  // 요약
  console.log("\n=== 요약 ===");
  for (const r of all) {
    const emoji = r.success ? "✅" : "⚠️";
    console.log(`${emoji} ${r.persona}: ${r.totalClicks}클릭 / ${(r.totalElapsedMs / 1000).toFixed(1)}초 / 병목 ${r.bottlenecks.length}건`);
  }
})();
