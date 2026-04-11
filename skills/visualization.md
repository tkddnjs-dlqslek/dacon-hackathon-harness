# visualization.md — 시각화 선택 규칙

## §1. 차트 유형 선택 기준

데이터의 특성에 따라 차트 유형을 자동 결정한다. 하드코딩된 매핑이 아닌 데이터 특성 기반 분기.

### 1.1 선택 매트릭스

| 데이터 특성 | 목적 | 차트 유형 | 비고 |
|------------|------|----------|------|
| 시계열 + 단일 종목 | 추세 확인 | Line Chart | 기본 |
| 시계열 + 다중 종목 | 비교 | Multi-line Chart | 최대 8개, 초과 시 범례 축소 |
| 시계열 + 누적 비중 | 구성 변화 | Stacked Area Chart | 포트폴리오 비중 변화 |
| 단일 값 비교 (N≤8) | 순위/비교 | Bar Chart (가로) | 정렬: 값 내림차순 |
| 단일 값 비교 (N>8) | 순위/비교 | Bar Chart (세로) | 스크롤 허용 |
| 구성 비율 | 비중 확인 | Donut Chart | 항목 ≤ 6개, 초과 시 "기타" 묶음 |
| 2변수 관계 | 상관관계 | Scatter Plot | 상관계수 표시 |
| N×N 관계 | 상관 매트릭스 | Heatmap | 색상: 발산형 (파랑↔빨강) |
| 분포 | 수익률 분포 | Histogram | bin 수: Sturges 규칙 |
| 단일 KPI | 핵심 수치 강조 | Metric Card | 전일/전월 대비 변화 표시 |
| 최대 낙폭 | 리스크 시각화 | Area Chart (음영) | 고점→저점 구간 강조 |
| A vs B 시계열 | 두 전략 비교 | Dual Line Chart | ETF vs 직접투자. 영역 차이 음영 표시 |
| A vs B 단일값 비교 | 지표별 비교 | Grouped Bar Chart | 같은 지표를 나란히 비교 |
| 비용 누적 비교 | 시간에 따른 비용 | Stacked Area (2계열) | ETF 보수 vs 거래비용 누적 |

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
