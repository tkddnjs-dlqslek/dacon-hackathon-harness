// 데모 가이드 페이지 — 심사자가 5분 만에 모든 기능을 둘러볼 수 있는 안내

import Link from "next/link";

const FEATURES = [
  {
    n: 1,
    icon: "📊",
    title: "메인 대시보드",
    href: "/",
    summary: "6개 자산 클래스를 한 화면에서 — 멀티 에셋의 정수",
    highlights: [
      "자산 클래스 토글 필터 (주식·채권·외환·원자재·암호화폐·지수)",
      "자산 클래스별 평균 성과 막대 그래프",
      "크로스 에셋 상관관계 매트릭스 (주식 ↔ 채권 ↔ 금 ↔ 비트코인)",
      "기간 필터: 1개월~전체",
      "정렬 가능 통합 자산 테이블 (컬럼 클릭)",
      "S&P 500 유니버스 검색 가능 테이블 (513개)",
    ],
    tryThis: "Asset Classes 칩에서 \"채권\"만 켜고 \"암호화폐\"는 끄세요. 모든 차트가 실시간으로 갱신됩니다.",
  },
  {
    n: 2,
    icon: "🔍",
    title: "자산 클래스 깊이 분석",
    href: "/asset-class/bonds",
    summary: "자산 종류에 따라 표시되는 지표가 자동으로 달라지는 데모",
    highlights: [
      "주식: 가격, 베타, 샤프",
      "채권: 현재 금리(%), 금리 변화(bps)",
      "외환: 환율, 52주 범위",
      "원자재: 인플레이션 헤지 점수",
      "암호화폐: BTC 상관관계",
    ],
    tryThis: "/asset-class/bonds 와 /asset-class/stocks 를 비교해보세요. 같은 시스템이 다른 지표를 자동 표시합니다.",
  },
  {
    n: 3,
    icon: "💬",
    title: "자연어 질문 (NLQ)",
    href: "/ask",
    summary: "한국어로 질문하면 즉시 답합니다 — 외부 API 키 불필요",
    highlights: [
      "예시 1: \"기술주 중 변동성 가장 낮은 5개\"",
      "예시 2: \"비트코인과 상관관계 가장 높은 자산\"",
      "예시 3: \"한국 주식 톱5\"",
      "예시 4: \"변동성 30% 이상인 자산\"",
      "패턴 매칭 엔진 (자산 클래스, 지표, 임계값, 정렬 자동 추출)",
    ],
    tryThis: "예시 칩 하나를 클릭하면 즉시 답변이 나옵니다.",
  },
  {
    n: 4,
    icon: "🔎",
    title: "실시간 종목 검색 + 관심종목",
    href: "/search",
    summary: "전 세계 어떤 종목이든 사전 수집 없이 즉시 분석",
    highlights: [
      "yahoo-finance2 어댑터 (실시간 OHLCV)",
      "Yahoo Search API 자동완성",
      "관심종목 localStorage 저장",
      "추가 즉시 차트 + 지표 계산",
    ],
    tryThis: "검색창에 \"AAPL\", \"삼성전자\", 또는 \"BTC-USD\" 입력 → 검색 결과 클릭 → 즉시 분석",
  },
  {
    n: 5,
    icon: "⚙️",
    title: "포트폴리오 + 효율적 프론티어",
    href: "/portfolio",
    summary: "11개 ETF 비중 조정 + URL 공유 + 1000개 몬테카를로 시뮬레이션",
    highlights: [
      "슬라이더 (합계 100% 자동 유지)",
      "실시간 백테스트 (vs S&P 500)",
      "리밸런싱 5단계 비교",
      "🔗 URL 공유 (비중을 URL에 인코딩)",
      "효율적 프론티어 산점도 (1000개 랜덤 포트폴리오)",
      "최대 샤프 / 최소 변동성 / 최대 수익 자동 추출",
    ],
    tryThis: "슬라이더를 움직인 후 🔗 링크 공유 버튼을 누르세요. URL이 클립보드에 복사됩니다.",
  },
  {
    n: 6,
    icon: "🆚",
    title: "자산 비교 빌더",
    href: "/multi-compare",
    summary: "자산 클래스를 가로질러 자유 비교 — 비트코인 vs 금 vs S&P 500",
    highlights: [
      "7개 프리셋 (\"주식 vs 채권 vs 금\", \"한국 시총 톱5\" 등)",
      "검색으로 임의 종목 추가 (최대 8개)",
      "누적 수익률 + 지표 표 + 상관관계",
    ],
    tryThis: "프리셋 \"비트코인 vs 금 vs S&P 500\"을 클릭하세요.",
  },
  {
    n: 7,
    icon: "💰",
    title: "재무제표 분석 (Fundamentals)",
    href: "/fundamentals",
    summary: "단면(snapshot) 데이터 — 시계열과 다른 형식의 데이터 처리 데모",
    highlights: [
      "PER, PBR, ROE, 시가총액, 배당수익률, 부채비율 등",
      "S&P 500 + 한국 시총 톱20 = 약 520개 종목",
      "PER vs ROE 산점도 (가치 vs 수익성)",
      "스크리닝 프리셋 (저PER, 고ROE, 가치주, 배당주, 성장주)",
      "Skills 시스템이 시계열이 아닌 데이터도 동일 패턴으로 처리",
    ],
    tryThis: "프리셋 \"가치주 (PER<15 + PBR<2)\"를 클릭하세요. PER vs ROE 산점도로 좋은 종목을 한눈에.",
  },
  {
    n: 8,
    icon: "📊",
    title: "자동 시장 리포트",
    href: "/report",
    summary: "지난 1년 시장 요약 보고서 자동 생성",
    highlights: [
      "시장 레짐 판단 (리스크 온 / 오프 / 전환)",
      "자산 클래스별 성과 랭킹",
      "TOP 5 상승 / 하락",
      "변동성 최고 / 최저",
      "크로스 에셋 상관관계 + 해석",
      "🖨 인쇄 가능 (1페이지 디자인)",
    ],
    tryThis: "스크롤하며 시장 요약을 확인하고, 우측 상단 인쇄 버튼으로 PDF 출력해보세요.",
  },
];

const ARCHITECTURE = [
  {
    title: "Skills.md 6개 파일",
    items: [
      "MASTER_SKILL.md — 전체 흐름 + 6개 자산군 레지스트리",
      "data-schema.md — 통일 OHLCV 스키마 + 어댑터 프로토콜",
      "data-analysis.md — 공통 지표 + 자산 타입별 특화 지표",
      "visualization.md — 데이터 특성별 차트 자동 선택",
      "insight-generation.md — 30+ 조건 → 메시지 규칙",
      "report-layout.md — 페이지 구성 흐름",
    ],
  },
  {
    title: "데이터 어댑터 (lib/adapters/)",
    items: [
      "yfinance.ts — Python collect.py + JSON 결합",
      "csv.ts — 사용자 업로드 CSV 파싱",
      "yahoo-finance2 — 실시간 검색 (TypeScript 네이티브)",
      "DataAdapter 인터페이스로 새 어댑터 등록 가능",
    ],
  },
  {
    title: "데이터 규모",
    items: [
      "Detail tier (풀 OHLCV): 79개 자산",
      "Universe tier (사전 계산): 513개 (S&P 500 + ETF)",
      "Fundamentals: 513개 (재무 단면)",
      "ETF Holdings: 55개 종목",
      "총 ~600개 + 실시간 검색 무한 확장",
    ],
  },
];

export default function DemoPage() {
  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <header className="rounded-lg border border-blue-900/40 bg-gradient-to-br from-gray-900 to-blue-950 p-8">
        <h1 className="text-3xl font-bold">5분 만에 둘러보기</h1>
        <p className="mt-2 text-gray-300">
          심사자를 위한 주요 기능 가이드 — 8개 페이지를 차례로 둘러볼 수 있습니다.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <div className="rounded bg-gray-900/50 p-3">
            <p className="text-xs text-gray-400">자산 클래스</p>
            <p className="font-mono text-lg">6개</p>
          </div>
          <div className="rounded bg-gray-900/50 p-3">
            <p className="text-xs text-gray-400">분석 대상 자산</p>
            <p className="font-mono text-lg">~600개</p>
          </div>
          <div className="rounded bg-gray-900/50 p-3">
            <p className="text-xs text-gray-400">페이지</p>
            <p className="font-mono text-lg">11개</p>
          </div>
          <div className="rounded bg-gray-900/50 p-3">
            <p className="text-xs text-gray-400">외부 API 키</p>
            <p className="font-mono text-lg text-green-400">0개</p>
          </div>
        </div>
      </header>

      {/* 기능 8개 */}
      <section>
        <h2 className="mb-4 text-xl font-bold">핵심 기능 둘러보기</h2>
        <div className="space-y-4">
          {FEATURES.map((f) => (
            <div key={f.n} className="rounded-lg border border-gray-800 bg-gray-900 p-5 hover:border-blue-700 transition-colors">
              <div className="flex items-start gap-4">
                <div className="text-3xl">{f.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">STEP {f.n}</span>
                    <h3 className="text-lg font-bold">{f.title}</h3>
                  </div>
                  <p className="mt-1 text-sm text-gray-400">{f.summary}</p>
                  <ul className="mt-3 list-disc list-inside space-y-1 text-xs text-gray-300">
                    {f.highlights.map((h, i) => <li key={i}>{h}</li>)}
                  </ul>
                  <div className="mt-3 rounded border border-yellow-900/40 bg-yellow-950/30 p-2 text-xs text-yellow-300">
                    <span className="font-bold">👉 해보세요:</span> {f.tryThis}
                  </div>
                </div>
                <Link href={f.href} className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500">
                  열기 →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 아키텍처 */}
      <section>
        <h2 className="mb-4 text-xl font-bold">시스템 아키텍처</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {ARCHITECTURE.map((a) => (
            <div key={a.title} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <h3 className="mb-2 font-semibold text-blue-400">{a.title}</h3>
              <ul className="space-y-1 text-xs text-gray-300">
                {a.items.map((item, i) => <li key={i}>• {item}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 차별화 포인트 */}
      <section className="rounded-lg border border-purple-900/40 bg-gradient-to-br from-gray-900 to-purple-950 p-6">
        <h2 className="mb-4 text-xl font-bold">차별화 포인트</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[
            { t: "범용성", d: "단일 자산군이 아닌 6개 자산 클래스 + 어댑터로 무한 확장" },
            { t: "Skills 자동 분기", d: "자산 종류에 따라 표시 지표가 자동으로 달라짐 (베타/금리/환율/캐리)" },
            { t: "다른 형식 데이터", d: "OHLCV 시계열 + 재무 단면(snapshot) 동일 시스템에서 처리" },
            { t: "API 키 제로", d: "심사자가 별도 등록 없이 pip install yfinance 한 줄로 재현" },
            { t: "한국어 NLQ", d: "한국어 질문 → 즉시 답변 (패턴 매칭 엔진)" },
            { t: "실시간 검색", d: "사전 수집 없이 어떤 종목이든 즉석 분석" },
            { t: "포트폴리오 URL 공유", d: "비중을 URL로 인코딩, 카톡 링크로 공유" },
            { t: "효율적 프론티어", d: "1000개 몬테카를로 시뮬레이션 + 최적 포트폴리오 자동 추출" },
          ].map((x, i) => (
            <div key={i} className="rounded bg-gray-900/50 p-3">
              <p className="font-bold text-purple-300">{x.t}</p>
              <p className="text-xs text-gray-400">{x.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="rounded-lg border border-gray-800 bg-gray-950 p-4 text-center text-xs text-gray-500">
        모든 기능은 yfinance 단일 무료 데이터 소스로 동작합니다 · 외부 API 키 불필요
      </footer>
    </div>
  );
}
