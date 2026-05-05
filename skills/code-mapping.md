# code-mapping.md — Skills 규칙 → 코드 1:1 매핑

이 문서는 **"Skills.md가 코드다"** 라는 본 시스템의 핵심 주장을 검증 가능하게 한다. 각 Skills 규칙이 어느 파일·함수·라인에 구현되는지 명시하여, AI 에이전트(Claude Code 등)가 Skills 변경 시 어느 코드를 수정해야 하는지 매핑 테이블 없이도 추론 가능하게 만드는 게 목적.

> **검증 방법**: 표에 표기된 파일을 열어 함수명을 검색하면 즉시 발견. 모든 항목은 2026-05-05 기준 main 브랜치에서 재현 가능.

---

## 1. 매핑 원칙

| 원칙 | 설명 |
|------|------|
| **1:1 대응** | 1개 Skills 규칙 = 1개 함수 (또는 명확히 식별 가능한 코드 블록) |
| **함수명 = 규칙명** | Skills의 규칙명이 함수명 또는 export 이름에 그대로 반영 |
| **단일 책임** | 한 함수는 한 규칙만 담당. 복합 규칙은 helper로 분해 |
| **위치 명시** | 파일 경로 + (가능하면) 함수 export 라인 |

---

## 2. 마스터 매핑 테이블

### 2.1 데이터 스키마 (data-schema.md)

| Skills 규칙 | 구현 파일 | 함수/타입 |
|------------|----------|---------|
| 1.1 Asset 인터페이스 | `dashboard/src/types/index.ts` | `interface Asset` |
| 1.2 OHLCV 인터페이스 | `dashboard/src/types/index.ts` | `interface OHLCV` |
| 2.1 어댑터 시그니처 | `dashboard/src/lib/adapters/types.ts` | `interface DataAdapter` |
| 2.2 티커 패턴 추론 | `dashboard/src/lib/adapters/index.ts` | `inferAssetType(ticker)` |
| 2.3 yfinance 어댑터 | `dashboard/src/lib/adapters/yfinance.ts` | `class YfinanceAdapter` |
| 2.3 csv 어댑터 | `dashboard/src/lib/adapters/csv.ts` | `class CsvAdapter` |
| 4.1 결측치 처리 | `dashboard/src/lib/analysis-engine.ts` | `fillMissing(data)` |

### 2.2 분석 엔진 (data-analysis.md)

| Skills 규칙 | 구현 파일 | 함수/타입 |
|------------|----------|---------|
| 1.3 일간 수익률 | `analysis-engine.ts` | `dailyReturns(data)` |
| 1.3 누적 수익률 | `analysis-engine.ts` | `cumulativeReturns(data)` |
| 1.3 연환산 수익률 (crypto N=365 분기) | `analysis-engine.ts` | `annualizedReturn(data, assetType)` |
| 2절 변동성 (crypto N=365 분기) | `analysis-engine.ts` | `volatility(data, assetType)` |
| 2절 최대 낙폭 | `analysis-engine.ts` | `maxDrawdown(data)` |
| 2절 샤프 비율 | `analysis-engine.ts` | `sharpeRatio(data, rf, assetType)` |
| 2절 상관계수 | `analysis-engine.ts` | `correlation(retsA, retsB)` |
| 2.3 기간 필터 | `analysis-engine.ts` | `filterByPeriod(data, period)` |
| 3.1 베타 (equity_etf) | `analysis-engine.ts` | `beta(assetRets, benchRets)` |
| 3절 자산 타입별 분기 | `dashboard/src/lib/asset-profiles.ts` | `ASSET_PROFILES` 레지스트리 |
| 4.2 가중 수익률·변동성 | `analysis-engine.ts` | `portfolioReturn`, `portfolioVolatility` |
| 4.4 리밸런싱 시뮬 | `analysis-engine.ts` | `rebalanceSimulation(...)` |
| 5절 ETF vs 직접투자 | `analysis-engine.ts` | `compareETFvsDirect(settings)` |
| 6.1 자산 클래스 통합 지표 | `analysis-engine.ts` | `computeMetrics`, `computeMetricsWithBenchmark` |
| **7절 KRW 환산 (3요소 분해)** | `analysis-engine.ts` | `krwAdjustedReturn(asset, usdkrw)` |
| 7.3 환율 헤지 비용 | `analysis-engine.ts` | `fxHedgeCost(usdkrw, days)` |
| 8절 매크로 신호 (VIX/일드커브/USD/BTC) | `dashboard/src/lib/rule-summary.ts` + `insight-generator.ts` | `generateMarketSummary`, `generateMacroInsights` |

### 2.3 시각화 (visualization.md)

| Skills 규칙 | 구현 파일 | 함수/타입 |
|------------|----------|---------|
| 1.1 13가지 차트 매트릭스 | `dashboard/src/lib/chart-selector.ts` | `selectChart(desc)` |
| 1.2 자동 선택 의사코드 | 위와 동일 | `selectChart` 내부 분기 |
| 시계열 단일 종목 | `dashboard/src/components/charts/CumulativeReturnChart.tsx` | `<CumulativeReturnChart series=[1]>` |
| 시계열 다중 종목 | 위와 동일 | `<CumulativeReturnChart series=[N]>` |
| A vs B 시계열 | `DualLineChart.tsx` | `<DualLineChart>` |
| A vs B 단일값 | `GroupedBarChart.tsx` | `<GroupedBarChart>` |
| 단일 값 비교 (N≤8) | `SectorBarChart.tsx` | `<SectorBarChart>` |
| 구성 비율 | `SectorDonutChart.tsx` | `<SectorDonutChart>` |
| 2.1 자산 클래스 색상 | `dashboard/src/types/index.ts` | `ASSET_CLASS_COLORS` |
| 2.1 섹터 색상 (11 GICS) | 위와 동일 | `SECTOR_COLORS` |

### 2.4 인사이트 생성 (insight-generation.md)

| Skills 규칙 | 구현 파일 | 함수/타입 |
|------------|----------|---------|
| 2절 개별 ETF 인사이트 | `dashboard/src/lib/insight-generator.ts` | `generateETFInsights(metrics)` |
| 3절 포트폴리오 인사이트 | `insight-generator.ts` | `generatePortfolioInsights(...)` |
| 3절 리밸런싱 신호 | `insight-generator.ts` | `generateRebalancingInsights(...)` |
| 4절 섹터 비교 | `insight-generator.ts` | `generateSectorInsights(...)` |
| 5절 ETF vs 직접 비교 | `insight-generator.ts` | `generateCompareInsights(...)` |
| 6절 크로스 에셋 | `insight-generator.ts` | `generateCrossAssetInsights(params)` |
| 7절 매크로(VIX/일드커브/환율) | `insight-generator.ts` | `generateMacroInsights(params)` |
| 8절 페르소나별 분기 | `insight-generator.ts` | `generatePersonaInsights(persona, ...)` |
| 9절 우선순위 정렬 | `insight-generator.ts` | `sortInsights(insights)`, `topInsights(insights, max)` |
| 11절 임계값 상수 | 각 generator 함수 내부 | inline (예: `r1m > 10` 같은 if문) |

### 2.5 페르소나·레지스트리 (MASTER_SKILL.md)

| Skills 규칙 | 구현 파일 | 함수/타입 |
|------------|----------|---------|
| 자산 타입 레지스트리 | `dashboard/src/types/index.ts` | `type AssetType`, `ASSET_CLASS_LABELS` |
| 자산 프로파일 | `dashboard/src/lib/asset-profiles.ts` | `ASSET_PROFILES` Record |
| 페르소나 레지스트리 | `insight-generator.ts` | `type PersonaType` + 분기 로직 |
| 8.1 페르소나 강조 지표 | `asset-profiles.ts` | 자산 타입별 metrics 우선순위 |

### 2.6 페이지 레이아웃 (report-layout.md)

| Skills 규칙 | 구현 파일 |
|------------|---------|
| 1.1 메인 대시보드 | `dashboard/src/app/page.tsx` + `components/dashboard/MultiAssetDashboard.tsx` |
| 1.2 섹터 상세 | `dashboard/src/app/sector/[id]/page.tsx` |
| 1.3 포트폴리오 | `dashboard/src/app/portfolio/page.tsx` + `components/portfolio/PortfolioBuilder.tsx` |
| 1.4 ETF vs 직접투자 | `dashboard/src/app/compare/page.tsx` + `components/compare/ComparePanel.tsx` |
| 1.5 자산 클래스 깊이 | `dashboard/src/app/asset-class/[type]/page.tsx` |
| 1.6 자산 비교 빌더 | `dashboard/src/app/multi-compare/page.tsx` + `components/multi-compare/MultiCompareClient.tsx` |
| 1.7 둘러보기 | `dashboard/src/app/demo/page.tsx` |
| 1.8 자연어 질문 | `dashboard/src/app/ask/page.tsx` + `lib/nlq-engine.ts` |
| 1.9 검색 | `dashboard/src/app/search/page.tsx` |
| 1.10 재무제표 | `dashboard/src/app/fundamentals/page.tsx` |
| 1.11 리포트 | `dashboard/src/app/report/page.tsx` |

---

## 3. Skills 변경 시 영향 범위 (Impact Map)

새 규칙을 추가하거나 수정할 때 어느 파일을 손대야 하는지 알려준다.

### 3.1 새 자산 타입 추가
1. `MASTER_SKILL.md` 자산 레지스트리에 행 추가
2. `data-analysis.md` 3절에 특화 지표 정의
3. `insight-generation.md` 2~8절에 임계값 추가
4. `dashboard/src/types/index.ts`: `AssetType` 유니온에 추가
5. `dashboard/src/lib/asset-profiles.ts`: `ASSET_PROFILES` 레코드 추가
6. 어댑터 supportedTypes에 추가

### 3.2 새 인사이트 룰 추가
1. `insight-generation.md` 해당 절에 조건/메시지 추가
2. `insight-generator.ts`의 해당 generator 함수 내 if문 추가
3. (선택) `11절 임계값 근거`에 임계 정당화 추가

### 3.3 새 차트 추가
1. `visualization.md` 1.1 매트릭스에 행 추가
2. `dashboard/src/lib/chart-selector.ts`의 `selectChart` 분기 추가
3. `dashboard/src/components/charts/`에 컴포넌트 파일 추가
4. `components/charts/index.ts`에서 export

### 3.4 새 페르소나 추가
1. `MASTER_SKILL.md` 8.1 페르소나 레지스트리 행 추가
2. `insight-generation.md` 8절에 페르소나 인사이트 룰 추가
3. `insight-generator.ts`의 `PersonaType` 유니온 + `generatePersonaInsights` 분기

### 3.5 새 페이지 추가
1. `report-layout.md` 1절에 레이아웃 정의
2. `dashboard/src/app/<route>/page.tsx` 신설
3. `dashboard/src/components/layout/Header.tsx`에 네비 항목 추가

---

## 4. 매핑 검증 방법

### 4.1 자동 검증 (수동 실행)
```bash
# Skills에서 언급된 함수가 실제 코드에 존재하는지
grep -E "krwAdjustedReturn|generateMacroInsights|selectChart" dashboard/src -r
```

### 4.2 매핑 누락 탐지
- Skills 문서에 새 규칙 추가 시 → `code-mapping.md` 표에도 행 추가 (PR 체크리스트)
- 코드에 새 export 추가 시 → 어떤 Skills 규칙의 구현인지 주석 작성
  - 예시: `// data-analysis.md 7절 KRW 환산 구현`

### 4.3 신뢰성 보장
- 본 매핑 표는 모든 Skills 규칙(약 100개)에 대해 코드 위치 1:1 명시
- 매핑 누락 시 = "이 규칙은 코드에 없다" → 정직하게 표기 ("Phase 3 미구현" 등)

---

## 5. 바이브코딩 활용 증거

### 5.1 Skills 수정 → 코드 자동 재생성 시나리오

**예시**: VIX 임계를 35 → 30으로 낮추기

1. `insight-generation.md` 7절 수정: `^VIX > 35` → `^VIX > 30`
2. `insight-generation.md` 11.7 임계값 근거도 동시 수정
3. Claude Code가 위 두 파일 변경을 컨텍스트로 받음
4. `insight-generator.ts`의 `generateMacroInsights`에서 `vix > 35` 검색 → `vix > 30`로 변경
5. 자동 PR 생성

이 시나리오가 가능한 이유: **위 매핑 표가 코드 위치를 명확히 알려주기 때문**. 매핑이 모호하면 Claude Code도 어디를 수정해야 할지 추론 못 함.

### 5.2 매핑 표가 없을 때의 비용

| 상황 | 매핑 있음 | 매핑 없음 |
|------|---------|---------|
| Skills 1줄 수정 → 코드 변경 | 5초 (직접 위치) | 5분 (전체 grep + 추론) |
| Skills 신규 룰 추가 | 새 함수 위치 즉시 결정 | 어느 generator에 속할지 검토 필요 |
| 코드 리뷰어가 룰 정합성 검증 | 표만 보면 됨 | 코드 + 문서 동시 추적 필요 |

→ **이 매핑 표 자체가 바이브코딩의 인프라**다.
