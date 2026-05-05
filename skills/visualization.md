# visualization.md — 시각화 선택 규칙

## 1. 차트 유형 선택 기준

데이터의 특성에 따라 차트 유형을 자동 결정한다. 하드코딩된 매핑이 아닌 데이터 특성 기반 분기.

### 1.1 선택 매트릭스 — 구현된 8가지

본 시스템은 8가지 데이터 특성을 7가지 차트 컴포넌트로 매핑한다. 일부 특성은 동일 컴포넌트의 props 분기로 처리(예: 시계열 단일/다중은 series 배열 길이로 자동 분기).

| 데이터 특성 | 목적 | 차트 유형 | 구현 파일 |
|------------|------|----------|----------|
| 시계열 + 단일 종목 | 추세 확인 | Line Chart | CumulativeReturnChart (seriesCount=1) |
| 시계열 + 다중 종목 | 비교 | Multi-line Chart | CumulativeReturnChart.tsx |
| 단일 값 비교 (N≤8) | 순위/비교 | Bar Chart (가로) | SectorBarChart.tsx |
| 구성 비율 | 비중 확인 | Donut Chart | SectorDonutChart.tsx |
| N×N 관계 | 상관 매트릭스 | Heatmap | page.tsx (HTML table 기반) |
| 단일 KPI | 핵심 수치 강조 | Metric Card | 인라인 JSX (각 페이지) |
| A vs B 시계열 | 두 전략 비교 | Dual Line Chart | DualLineChart.tsx |
| A vs B 단일값 비교 | 지표별 비교 | Grouped Bar Chart | GroupedBarChart.tsx |

### 1.2 확장 슬롯 (Phase 4 후보)

본 시스템은 다음 5가지 추가 차트 슬롯을 어댑터 패턴으로 미리 설계해두었다. `chart-selector.ts`의 분기만 추가하면 즉시 활성화 가능. 기본 라이브러리(Recharts)에서 이미 지원하므로 Skills 1줄 + 코드 30줄로 신규 차트 추가 가능.

| 데이터 특성 | 차트 유형 | 활성화 방법 |
|------------|----------|----------|
| 시계열 + 누적 비중 | Stacked Area Chart | Recharts `<AreaChart stacked>` |
| 2변수 관계 (수익 vs 위험) | Scatter Plot | Recharts `<ScatterChart>` — 효율 프론티어용 |
| 분포 (수익률 히스토그램) | Histogram | bucket 함수 + BarChart |
| 최대 낙폭 음영 | Area Chart (음영) | DualLineChart에 fillBetween 옵션 |
| 비용 누적 (2계열) | Stacked Area | Recharts `<AreaChart>` 2계열 |

→ 슬롯이 비어있는 이유: **현재 11페이지의 데이터 시나리오에서 사용처가 발견되지 않음.** 새 페이지·자산 클래스 추가 시 자연스럽게 활성화 예정.

### 1.2 자동 선택 로직 (의사코드)

```
function selectChart(data):
  if data.hasTimeSeries:
    if data.seriesCount == 1:
      return "LineChart"
    elif data.isComposition:
      return "StackedAreaChart"
    else:
      return "MultiLineChart"
  elif data.isMatrix:
    return "Heatmap"
  elif data.isDistribution:
    return "Histogram"
  elif data.isCategorical:
    if data.categoryCount <= 8:
      return "HorizontalBarChart"
    else:
      return "VerticalBarChart"
  elif data.isRatio:
    return "DonutChart"
  else:
    return "MetricCard"
```

---

## 2. 스타일 규칙

### 2.1 색상 팔레트

#### 자산 클래스 색상 (NEW v3)
6개 자산 클래스 간 일관성 유지:

| 자산 클래스 | 색상 | HEX |
|-----------|------|-----|
| equity_etf | 파랑 | `#3B82F6` |
| bond | 청록 | `#06B6D4` |
| fx | 보라 | `#8B5CF6` |
| commodity | 호박 | `#F59E0B` |
| crypto | 주황 | `#F97316` |
| index | 회색 | `#6B7280` |

#### 섹터 색상 (equity_etf 내부)
- **섹터 색상**: 11개 GICS 섹터별 고정 색상 할당 (일관성 유지)
  - Technology: `#3B82F6` (blue)
  - Energy: `#F59E0B` (amber)
  - Healthcare: `#10B981` (emerald)
  - Financials: `#8B5CF6` (violet)
  - Consumer Disc.: `#EC4899` (pink)
  - Industrials: `#6B7280` (gray)
  - Real Estate: `#F97316` (orange)
  - Utilities: `#06B6D4` (cyan)
  - Consumer Staples: `#84CC16` (lime)
  - Materials: `#A855F7` (purple)
  - Communication: `#F43F5E` (rose)
  - 기타/미분류: `#94A3B8` (slate)
- **수익률**: 양수 `#10B981`, 음수 `#EF4444`
- **배경**: 다크모드 `#0F172A`, 라이트모드 `#FFFFFF`

### 2.2 축/레이블
- Y축: 수익률은 `%` 포맷, 가격은 `$` 포맷, 소수점 2자리
- X축 (시계열): 기간에 따라 자동 간격 조정
  - 1M: 일별
  - 3M~1Y: 주별/월별
  - ALL: 월별/연별
- 차트 제목: 필수, 16px 이상
- 범례: 3개 이상 시리즈일 때 표시

### 2.3 인터랙션
- 호버 시 툴팁: 값 + 날짜 + 변화율
- 클릭 시 드릴다운 (해당 ETF 상세 페이지)
- 기간 필터: 버튼 그룹 (1M/3M/6M/1Y/YTD/ALL)

---

## 3. 반응형 규칙
| 화면 | 차트 열 수 | 차트 최소 높이 |
|------|-----------|--------------|
| Desktop (≥1024px) | 2열 그리드 | 300px |
| Tablet (768~1023px) | 2열 | 250px |
| Mobile (<768px) | 1열 | 200px |
