# 기획서: 섹터 ETF 포트폴리오 분석 대시보드

> Skills 기반 투자 데이터 시각화 — 데이터 특성에 따라 분석·차트·인사이트가 자동 생성되는 대시보드

---

## 1. 프로젝트 개요

### 1.1 문제 정의

투자자가 섹터별 ETF 성과를 비교하고 포트폴리오를 구성할 때, 다음과 같은 반복 작업이 발생한다:
- 여러 ETF의 수익률·변동성·상관관계를 수동으로 계산
- 데이터 특성에 맞는 차트 유형을 매번 선택
- 포트폴리오 리밸런싱 효과를 시뮬레이션
- ETF 매수 vs 개별종목 직접투자의 비용·수익 비교

이 프로젝트는 **Skills.md에 정의된 규칙**에 따라 위 작업을 자동화하는 대시보드를 구축한다.

### 1.2 핵심 가치

| 가치 | 설명 |
|------|------|
| **범용성** | 특정 ETF를 하드코딩하지 않음. 데이터 특성(시계열/분포/비교 등)에 따라 분석·시각화가 자동 분기 |
| **규칙 기반 자동화** | Skills.md 5개 문서의 규칙이 코드로 1:1 매핑. 규칙 수정 → 대시보드 자동 반영 |
| **재현 가능성** | yfinance 단독 사용, API 키 불필요. `pip install yfinance` 한 줄로 전체 데이터 수집 가능 |

### 1.3 대상 사용자

- 섹터 로테이션 전략에 관심 있는 개인 투자자
- ETF vs 직접투자를 비교하려는 초중급 투자자
- 포트폴리오 비중 조정과 리밸런싱 효과를 시뮬레이션하려는 사용자

---

## 2. Skills.md 설계

### 2.1 Skills 구조

5개의 Skills 문서가 대시보드의 모든 로직을 정의한다:

```
MASTER_SKILL.md          ← 전체 흐름 오케스트레이션
├── data-analysis.md     ← 투자 지표 계산 & 분석 규칙 (4개 섹션)
├── visualization.md     ← 데이터 특성별 시각화 선택 규칙 (3개 섹션)
├── insight-generation.md ← 조건 기반 인사이트 자동 생성 (6개 섹션)
└── report-layout.md     ← 대시보드 레이아웃 & 구성 흐름 (3개 섹션)
```

### 2.2 핵심 규칙 예시

**데이터 분석 규칙** (`data-analysis.md`)
- 수익률 계산: 일간·누적·연환산 수익률 공식 정의
- 위험 지표: 변동성(σ×√252), 샤프 비율, MDD, 베타
- 무위험수익률: yfinance `^IRX`(13-Week T-Bill) 실시간 참조
- ETF vs 직접투자: 보수율·거래비용·리밸런싱 비용 시뮬레이션 규칙

**시각화 선택 규칙** (`visualization.md`)
- 13가지 데이터 특성 → 차트 유형 자동 매핑 (선택 매트릭스)
- 의사코드로 자동 선택 로직 정의
- 11개 GICS 섹터별 고정 색상 팔레트

**인사이트 생성 규칙** (`insight-generation.md`)
- 조건 → 등급 → 메시지 템플릿 형태로 30+ 규칙 정의
- 우선순위: 경고 > 주의 > 긍정 > 정보
- 개별 ETF / 포트폴리오 / 섹터 비교 / ETF vs 직접투자 4개 카테고리

### 2.3 범용성 보장 방법

| 원칙 | 구현 방법 |
|------|----------|
| 티커 하드코딩 금지 | 데이터 입력에서 티커 목록을 동적 추출 |
| 데이터 특성 기반 분기 | `selectChart(data)` — 시계열/분포/비교 등 특성 자동 감지 |
| 새 ETF 추가 대응 | JSON에 새 데이터 추가만으로 분석·시각화·인사이트 자동 생성 |
| 결측치 자동 처리 | forward fill(1~2일), 구간 제외(3일+), 경고 표시(30일 미만) |

---

## 3. 대시보드 기능 명세

### 3.1 페이지 구성 (4개)

| 페이지 | URL | 핵심 기능 |
|--------|-----|----------|
| 메인 대시보드 | `/` | 시장 개요, 섹터 비중, 누적 수익률, 상관관계 히트맵, 리밸런싱 |
| 섹터 상세 | `/sector/[id]` | 섹터 드릴다운, ETF + 구성종목 비교, 수익률 분포 |
| 포트폴리오 | `/portfolio` | ETF 비중 조정, 백테스트, 리밸런싱 시뮬레이션 |
| ETF vs 직접투자 | `/compare` | 동일 섹터 ETF vs Top N 종목 비교, 비용·수익·변동성 분석 |

### 3.2 메인 대시보드 상세

```
A. 인사이트 요약 배너 (최대 5개, 우선순위 정렬)
B. 시장 요약 KPI (총수익률, 변동성, 샤프, MDD)
C. 섹터 비중 (Donut Chart)
D. 포트폴리오 누적 수익률 (Multi-Line, 기간 필터)
E. 섹터별 수익률 랭킹 (Horizontal Bar)
F. ETF 성과 테이블 (Sparkline 포함)
G. 섹터 간 상관관계 (11×11 Heatmap)
H. 리밸런싱 시뮬레이션 (비중 슬라이더 + Dual Line)
```

### 3.3 ETF vs 직접투자 비교 상세

이 기능은 동일 섹터에 투자할 때 ETF를 사는 것과 개별 종목을 직접 골라 사는 것의 차이를 분석한다.

**사용자 조정 가능 파라미터:**
- 섹터 선택 (11개)
- 종목 수 (Top 3 / 5 / 10 / 20)
- 비중 방식 (균등 / 시가총액)
- 리밸런싱 주기 (없음 / 월간 / 분기)
- 투자 기간 (1Y / 3Y / 5Y)
- 초기 투자금, 거래 수수료

**비교 지표:**
- 누적 수익률 차이 (Dual Line Chart, 차이 영역 음영)
- 총 비용 비교 (ETF 보수 vs 거래비용, Stacked Area)
- 변동성·MDD·샤프 비율 비교 (Grouped Bar)

### 3.4 인터랙션

| 인터랙션 | 동작 |
|---------|------|
| 기간 필터 클릭 | 데이터 필터 → 지표 재계산 → 차트 리렌더 → 인사이트 재생성 |
| 포트폴리오 비중 슬라이더 | 합계 100% 자동 조정 → 백테스트 재실행 → KPI·차트·인사이트 동시 갱신 |
| 히트맵/바차트 섹터 클릭 | `/sector/[id]`로 드릴다운 |
| ETF vs 직접투자 설정 변경 | 시뮬레이션 재실행 → 전체 비교 갱신 |

---

## 4. 기술 아키텍처

### 4.1 기술 스택

| Layer | 선택 | 이유 |
|-------|------|------|
| Framework | Next.js 14+ (App Router) | SSR/SSG, API Routes, Vercel 최적 |
| Language | TypeScript | 타입 안정성 |
| Styling | Tailwind CSS | 빠른 UI 구축, 다크모드 지원 |
| Charts | Recharts | React 네이티브, 선언적 API |
| Data | yfinance (Python) → JSON | 무료, API 키 불필요 |
| Deploy | Vercel | 무료 tier, 외부 접속 가능 |

### 4.2 데이터 파이프라인

```
yfinance (Python)
  ├── 11 Sector ETF + SPY 가격 데이터 (2년치)
  ├── 섹터별 상위 5 개별종목 가격 데이터
  ├── ETF 메타데이터 (holdings, sector_weightings, expense_ratio)
  └── ^IRX (무위험수익률)
      ↓
  data/ (정적 JSON)
      ↓
  Next.js API Routes → analysis-engine.ts → chart-selector.ts → insight-generator.ts
      ↓
  대시보드 UI
```

### 4.3 Skills → 코드 매핑

| Skills 문서 | 구현 파일 | 역할 |
|------------|----------|------|
| `data-analysis.md` | `lib/analysis-engine.ts` | 지표 계산, 포트폴리오 분석, ETF vs 직접투자 시뮬레이션 |
| `visualization.md` | `lib/chart-selector.ts` | 데이터 특성 감지 → 차트 유형 자동 선택 |
| `insight-generation.md` | `lib/insight-generator.ts` | 조건 평가 → 인사이트 메시지 생성 |
| `report-layout.md` | `app/` 페이지 컴포넌트 | 섹션 배치, 반응형 그리드, 인터랙션 |

---

## 5. 데이터 소스

### 5.1 유일한 외부 의존: yfinance

| 항목 | 상세 |
|------|------|
| 라이브러리 | `yfinance` (Python, pip install) |
| API 키 | **불필요** |
| 데이터 범위 | 2년+ 일간 OHLCV |
| 실측 성능 | 11 ETF 일괄 다운로드 0.93초 |
| ETF 구성종목 | `funds_data.top_holdings` — 상위 10 종목 + 비중 |
| 무위험수익률 | `^IRX` (13-Week T-Bill Rate) |
| fallback | `data/` 폴더 정적 JSON — API 장애 시 대시보드 동작 보장 |

### 5.2 ETF 유니버스 (11 + 1)

SPDR Select Sector 시리즈 (보수율 전 종목 0.08%) + SPY 벤치마크

| 섹터 | 티커 | 상위 구성종목 |
|------|------|-------------|
| Technology | XLK | NVDA, AAPL, MSFT, AVGO, MU |
| Energy | XLE | XOM, CVX, COP, EOG, SLB |
| Healthcare | XLV | LLY, JNJ, ABBV, MRK, UNH |
| Financials | XLF | BRK-B, JPM, V, MA, BAC |
| Consumer Disc. | XLY | AMZN, TSLA, HD, MCD, TJX |
| Industrials | XLI | CAT, GE, RTX, GEV, BA |
| Real Estate | XLRE | WELL, PLD, EQIX, AMT, DLR |
| Utilities | XLU | NEE, SO, DUK, CEG, AEP |
| Consumer Staples | XLP | WMT, COST, PG |
| Materials | XLB | LIN, NEM, FCX |
| Communication | XLC | META, GOOGL, GOOG |
| **벤치마크** | **SPY** | S&P 500 ETF Trust |

### 5.3 심사자 재현 가이드

```bash
pip install yfinance
python collect.py          # → data/ 폴더에 JSON 생성
npm install && npm run dev # → http://localhost:3000
```

외부 API 키, 환경변수, 별도 계정 등록 일체 불필요.

---

## 6. 차별화 포인트

### 6.1 ETF vs 직접투자 비교 시뮬레이터

대부분의 투자 대시보드는 ETF 성과만 보여준다. 이 대시보드는 "동일 섹터에서 ETF를 살 것인가, 개별 종목을 직접 골라 살 것인가"를 비용·수익·리스크 관점에서 정량 비교한다.

### 6.2 완전 규칙 기반 자동 생성

- 차트 유형: 데이터 특성(시계열/분포/비교 등)에 따라 13가지 중 자동 선택
- 인사이트: 30+ 조건 규칙으로 경고/주의/긍정/정보 자동 생성
- 새 ETF 데이터를 넣어도 Skills 규칙만으로 대시보드가 자동 대응

### 6.3 제로 의존성 재현

yfinance 단독 사용 — 심사자가 API 키 없이 `pip install yfinance` 한 줄로 전체 재현 가능.

---

## 7. 일정

| 단계 | 내용 | 기한 |
|------|------|------|
| Phase 1 | 기획서 + Skills.md 초안 | ~4/30 |
| Phase 2 | Skills.md 정교화 + 핵심 기능 구현 | ~5/7 |
| Phase 3 | 대시보드 완성 + 배포 | ~5/14 |

---

## 8. 제출물

| 제출물 | 형식 | 기한 |
|--------|------|------|
| 기획서 | PDF | ~4/30 |
| Skills.md | .md 또는 .zip | ~5/7 |
| 웹 링크 | Vercel 배포 URL | ~5/14 |
