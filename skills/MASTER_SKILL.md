# MASTER_SKILL.md — 투자 분석 대시보드 Skills 총괄

## 개요
이 문서는 섹터별 ETF 포트폴리오 분석 대시보드의 분석 규칙, 시각화 기준, 인사이트 생성 규칙을 정의한다.
모든 대시보드 로직은 이 Skills 문서를 근거로 구현된다.

## 데이터 소스
- **유일한 외부 의존**: yfinance (API 키 불필요, `pip install yfinance`)
- **ETF**: SPDR Select Sector 11종 (XLK, XLE, XLV, XLF, XLY, XLI, XLRE, XLU, XLP, XLB, XLC) + SPY 벤치마크
- **개별종목**: 각 ETF의 `funds_data.top_holdings` 상위 5종목
- **무위험수익률**: `^IRX` (13-Week T-Bill Rate)
- **fallback**: `data/` 폴더 정적 JSON — yfinance 장애 시 대시보드 동작 보장

## Skills 문서 구조

| 파일 | 역할 |
|------|------|
| `MASTER_SKILL.md` | 전체 흐름 오케스트레이션 |
| `data-analysis.md` | 투자 지표 계산 & 분석 규칙 |
| `visualization.md` | 데이터 특성별 시각화 유형 선택 규칙 |
| `insight-generation.md` | 조건 기반 인사이트 자동 생성 규칙 |
| `report-layout.md` | 대시보드 레이아웃 & 구성 흐름 |

## 전체 분석 흐름

```
1. 데이터 입력
   ├→ ETF 가격 데이터 (시계열) + 메타 정보 (섹터, 운용사, 보수율)
   └→ 섹터별 대표 개별 종목 가격 데이터 (ETF vs 직접투자 비교용)

2. 데이터 전처리 (data-analysis.md §1)
   └→ 결측치 처리, 수익률 계산, 정규화

3. 지표 계산 (data-analysis.md §2)
   └→ 수익률, 변동성, 샤프비율, 상관계수, 드로다운

4. ETF vs 개별종목 비교 분석 (data-analysis.md §4)
   └→ 동일 섹터의 ETF 매수 vs 개별 종목 직접 매수 시뮬레이션
   └→ 비용(보수율 vs 거래비용), 수익률, 변동성, 분산효과 비교

5. 시각화 매핑 (visualization.md)
   └→ 각 지표/데이터의 특성에 따라 차트 유형 자동 선택

6. 인사이트 생성 (insight-generation.md)
   └→ 지표 조건 기반으로 자동 코멘트 생성

7. 대시보드 렌더링 (report-layout.md)
   └→ 섹션 배치, 카드 구성, 인터랙션 규칙
```

## 범용성 원칙
- 특정 티커/섹터를 하드코딩하지 않는다.
- 모든 규칙은 데이터의 **특성**(시계열 여부, 값 범위, 데이터 타입)에 따라 분기한다.
- 새로운 ETF/섹터 데이터를 추가해도 Skills 규칙만으로 자동 대응한다.

## Skills → 코드 매핑 (v2)

| Skills 문서 | 구현 파일 | 구현률 |
|------------|----------|-------|
| `data-analysis.md` §1~§3 | `lib/analysis-engine.ts` | 100% — 결측치, 수익률, 변동성, 샤프, MDD, 베타, 상관행렬, 공분산, 리밸런싱 |
| `data-analysis.md` §4 | `lib/analysis-engine.ts` + `ComparePanel.tsx` | 90% — 시총비중만 Phase 3 |
| `visualization.md` §1 | `components/charts/` (5 파일) + 인라인 | 9/13 차트 구현 (4개 Phase 3) |
| `visualization.md` §2~§3 | `globals.css` + Tailwind | 100% — 색상, 다크모드, 반응형 |
| `insight-generation.md` §2~§5 | `lib/insight-generator.ts` | 100% — ETF/포트폴리오/섹터/비교 |
| `insight-generation.md` §6 | `lib/insight-generator.ts` | 100% — 우선순위 정렬 + top5 |
| `report-layout.md` §1 | `app/` 4개 페이지 | 100% — 메인/섹터/포트폴리오/비교 |

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| v1 | 2026-04-11 | 초안 — 5개 파일, 전체 규칙 정의 |
| v2 | 2026-04-12 | 구현 대조 갭 보완 — 차트 구현 상태 추적, §4.5 제약사항, 코드 매핑 테이블 |
