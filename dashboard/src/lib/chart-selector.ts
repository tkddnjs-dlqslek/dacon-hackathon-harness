// 차트 자동 선택 엔진 — skills/visualization.md §1.2 구현

import type { ChartType } from "@/types";

interface DataDescriptor {
  hasTimeSeries: boolean;
  seriesCount: number;
  isComposition: boolean; // 누적 비중 데이터인지
  isMatrix: boolean;      // N×N 상관계수 등
  isDistribution: boolean;
  isCategorical: boolean;
  categoryCount: number;
  isRatio: boolean;       // 구성 비율 데이터인지
  isDualComparison: boolean; // A vs B 비교
}

export function selectChart(desc: DataDescriptor): ChartType {
  if (desc.hasTimeSeries) {
    if (desc.isDualComparison) return "DualLineChart";
    if (desc.seriesCount === 1) return "LineChart";
    if (desc.isComposition) return "StackedAreaChart";
    return "MultiLineChart";
  }
  if (desc.isMatrix) return "Heatmap";
  if (desc.isDistribution) return "Histogram";
  if (desc.isCategorical) {
    if (desc.isDualComparison) return "GroupedBarChart";
    return desc.categoryCount <= 8 ? "HorizontalBarChart" : "VerticalBarChart";
  }
  if (desc.isRatio) return "DonutChart";
  return "MetricCard";
}

// 데이터 특성을 자동 감지하여 descriptor 생성
export function describeData(options: {
  timeSeries?: boolean;
  series?: number;
  composition?: boolean;
  matrix?: boolean;
  distribution?: boolean;
  categories?: number;
  ratio?: boolean;
  dualCompare?: boolean;
}): DataDescriptor {
  return {
    hasTimeSeries: options.timeSeries ?? false,
    seriesCount: options.series ?? 1,
    isComposition: options.composition ?? false,
    isMatrix: options.matrix ?? false,
    isDistribution: options.distribution ?? false,
    isCategorical: (options.categories ?? 0) > 0,
    categoryCount: options.categories ?? 0,
    isRatio: options.ratio ?? false,
    isDualComparison: options.dualCompare ?? false,
  };
}
