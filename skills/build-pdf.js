// Skills.md 7개 파일 → 통합 PDF 변환
// md-to-pdf (puppeteer 기반) 사용 — 한글 + ASCII 박스 monospace 지원
//
// 출력: deliverables/Skills.md.pdf

const fs = require("fs");
const path = require("path");
// md-to-pdf는 dashboard/node_modules에 설치됨 (--no-save)
const { mdToPdf } = require(path.join(__dirname, "..", "dashboard", "node_modules", "md-to-pdf"));

const SKILLS_DIR = __dirname;
const OUT = path.join(__dirname, "..", "deliverables", "Skills.md.pdf");

// 통합 순서 (의존도 낮은 순 → 높은 순)
const FILES = [
  "MASTER_SKILL.md",     // 총괄
  "data-schema.md",      // 데이터 구조
  "data-analysis.md",    // 분석 규칙
  "visualization.md",    // 시각화 규칙
  "insight-generation.md", // 인사이트
  "report-layout.md",    // 페이지 레이아웃
  "code-mapping.md",     // Skills→코드 매핑
];

// 통합 마크다운 생성
function buildCombined() {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    "# MarketLens — Skills.md 통합 문서",
    "",
    `**참가팀:** 김상원 · **GitHub:** tkddnjs-dlqslek`,
    "",
    `**제출일:** ${today} · **버전:** v3.5`,
    "",
    "---",
    "",
    "## 목차",
    "",
  ];
  FILES.forEach((f, i) => {
    const id = f.replace(".md", "").toLowerCase();
    lines.push(`${i + 1}. [${f}](#${id})`);
  });
  lines.push("");
  lines.push("---");
  lines.push("");

  for (const f of FILES) {
    const content = fs.readFileSync(path.join(SKILLS_DIR, f), "utf-8");
    lines.push(`<div style="page-break-before: always"></div>`);
    lines.push("");
    lines.push(content);
    lines.push("");
  }
  return lines.join("\n");
}

// 한글·monospace 친화 CSS
const CSS = `
  @page { size: A4; margin: 18mm 16mm; }
  body {
    font-family: -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", "Segoe UI", sans-serif;
    font-size: 10.5pt;
    line-height: 1.55;
    color: #111;
  }
  h1 { font-size: 22pt; margin-top: 0; padding-bottom: 6px; border-bottom: 2px solid #111; }
  h2 { font-size: 16pt; margin-top: 1.4em; padding-bottom: 4px; border-bottom: 1px solid #ccc; }
  h3 { font-size: 13pt; margin-top: 1.2em; }
  h4 { font-size: 11pt; }
  code, pre {
    font-family: "Consolas", "D2Coding", "Cascadia Code", "Courier New", monospace;
    font-size: 9pt;
  }
  pre {
    background: #f5f5f5;
    padding: 8px 10px;
    border-radius: 4px;
    border: 1px solid #e5e5e5;
    overflow-x: auto;
    line-height: 1.35;
    white-space: pre;
  }
  code:not(pre code) {
    background: #f5f5f5;
    padding: 1px 4px;
    border-radius: 3px;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 8px 0;
    font-size: 9.5pt;
  }
  th, td {
    border: 1px solid #ccc;
    padding: 4px 8px;
    text-align: left;
    vertical-align: top;
  }
  th { background: #f0f0f0; font-weight: 600; }
  blockquote {
    border-left: 3px solid #888;
    padding: 2px 12px;
    margin: 8px 0;
    color: #555;
    background: #fafafa;
  }
  hr { border: none; border-top: 1px solid #ddd; margin: 1.4em 0; }
  a { color: #0366d6; text-decoration: none; }
`;

(async () => {
  const combinedMd = buildCombined();
  const tmpFile = path.join(__dirname, ".combined.tmp.md");
  fs.writeFileSync(tmpFile, combinedMd);

  console.log(`통합 MD 길이: ${combinedMd.length.toLocaleString()}자`);
  console.log("PDF 변환 중...");

  const pdf = await mdToPdf(
    { path: tmpFile },
    {
      dest: OUT,
      stylesheet_encoding: "utf-8",
      css: CSS,
      pdf_options: {
        format: "A4",
        margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
        printBackground: true,
        displayHeaderFooter: true,
        footerTemplate:
          '<div style="font-size:8pt;color:#888;width:100%;text-align:center;">MarketLens · Skills.md · 페이지 <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
        headerTemplate: '<div></div>',
      },
      launch_options: { headless: "new" },
    }
  );

  fs.unlinkSync(tmpFile);
  if (pdf) {
    const stats = fs.statSync(OUT);
    console.log(`완료: ${OUT}`);
    console.log(`크기: ${(stats.size / 1024).toFixed(1)} KB`);
  } else {
    console.error("PDF 생성 실패");
    process.exit(1);
  }
})();
