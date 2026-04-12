# visualization.md — 시각화 선택 규칙

## §1. 차트 유형 선택 기준

데이터의 특성에 따라 차트 유형을 자동 결정한다. 하드코딩된 매핑이 아닌 데이터 특성 기반 분기.

### 1.1 선택 매트릭스

| 데이터 특성 | 목적 | 차트 유형 | 구현 파일 | 상태 |
|------------|------|----------|----------|------|
| 시계열 + 단일 종목 | 추세 확인 | Line Chart | CumulativeReturnChart (seriesCount=1) | ✅ |
| 시계열 + 다중 종목 | 비교 | Multi-line Chart | CumulativeReturnChart.tsx | ✅ |
| 시계열 + 누적 비중 | 구성 변화 | Stacked Area Chart | — | Phase 3 |
| 단일 값 비교 | 순위/비교 | Bar Chart (가로/세로) | SectorBarChart.tsx | ✅ |
| 구성 비율 | 비중 확인 | Donut Chart | SectorDonutChart.tsx | ✅ |
| 2변수 관계 | 상관관계 | Scatter Plot | — | Phase 3 |
| N×N 관계 | 상관 매트릭스 | Heatmap | page.tsx (HTML table 기반) | ✅ |
| 분포 | 수익률 분포 | Histogram | — | Phase 3 |
| 단일 KPI | 핵심 수치 강조 | Metric Card | 인라인 JSX (각 페이지) | ✅ |
| 최대 낙폭 | 리스크 시각화 | Area Chart (음영) | — | Phase 3 |
| A vs B 시계열 | 두 전략 비교 | Dual Line Chart | DualLineChart.tsx | ✅ |
| A vs B 단일값 비교 | 지표별 비교 | Grouped Bar Chart | GroupedBarChart.tsx | ✅ |
| 비용 누적 비교 | 시간에 따른 비용 | Stacked Area (2계열) | — | Phase 3 |

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

## §2. 스타일 규칙

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

## §3. 반응형 규칙
| 화면 | 차트 열 수 | 차트 최소 높이 |
|------|-----------|--------------|
| Desktop (≥1024px) | 2열 그리드 | 300px |
| Tablet (768~1023px) | 2열 | 250px |
| Mobile (<768px) | 1열 | 200px |
