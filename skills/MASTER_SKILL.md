# MASTER_SKILL.md — 범용 투자 데이터 분석 시스템

## 1. 시스템 철학

이 시스템은 **"어떤 투자 데이터든 동일한 규칙으로 분석·시각화·해석"** 하는 범용 분석 엔진이다.

핵심 원칙:
1. **데이터 형식 추상화** — 입력 데이터(CSV, JSON, API)는 통일된 내부 스키마로 변환
2. **자산 타입 레지스트리** — 6개 자산군이 등록되어 있고, 각각의 분석 규칙을 가짐
3. **규칙 기반 자동화** — Skills.md가 모든 동작의 근거. 코드는 규칙을 단순 실행
4. **확장성** — 새 자산군 추가 시 어댑터 + 분석 프로파일만 등록

## 2. 지원 자산 타입 (Asset Type Registry)

| 코드 | 이름 | 데이터 예시 | 핵심 지표 |
|------|------|-----------|----------|
| `equity_etf` | 주식·ETF | XLK, AAPL, SPY | 수익률, 변동성, 샤프, MDD, 베타 |
| `bond` | 채권/금리 | ^IRX, ^TNX, ^TYX | 수익률, 듀레이션 (proxy), 변동성 |
| `fx` | 외환 | USDKRW=X, EURUSD=X | 환율 변동, 캐리, 변동성 |
| `commodity` | 원자재 | GLD, USO, SLV | 변동성, 콘탱고 (proxy), 상관관계 |
| `crypto` | 암호화폐 | BTC-USD, ETH-USD | 변동성, BTC 상관관계 |
| `index` | 시장 지수 | ^GSPC, ^IXIC, ^KS11 | 수익률, 변동성, 글로벌 상관 |

> 모든 자산은 동일한 OHLCV 시계열 형식으로 통일되며, 자산 타입에 따라 적용되는 분석 규칙이 달라진다.

## 3. Skills 문서 구조

| 파일 | 역할 |
|------|------|
| `MASTER_SKILL.md` | 시스템 철학, 자산 레지스트리, 전체 흐름 |
| `data-schema.md` | 통일 데이터 스키마, 어댑터 프로토콜, 데이터 품질 규칙 |
| `data-analysis.md` | 공통 지표 + 자산별 특화 지표 계산 규칙 |
| `visualization.md` | 데이터 특성별 차트 선택 + 자산 타입별 색상 |
| `insight-generation.md` | 자산별 인사이트 + 크로스 에셋 인사이트 |
| `report-layout.md` | 페이지 템플릿 + 멀티 에셋 레이아웃 |

## 4. 처리 파이프라인

```
[1] 입력 데이터 (다양한 소스)
       ├─ yfinance API (주식/ETF/채권/외환/원자재/암호화폐/지수)
       ├─ CSV 파일 (사용자 업로드)
       └─ JSON (정적 fallback)
            ↓
[2] 데이터 어댑터 (data-schema.md)
    └─ 통일 스키마로 변환: { ticker, assetType, sector?, data: OHLCV[] }
            ↓
[3] 자산 타입 분기
    └─ 각 자산의 assetType에 따라 적용 가능한 분석 프로파일 선택
            ↓
[4] 분석 엔진 (data-analysis.md)
    ├─ 공통: 수익률, 변동성, MDD
    ├─ 특화: 베타(equity), 듀레이션(bond), 캐리(fx) ...
    └─ 환율 조정: 해외 자산 수익률 → KRW 환산 실질 수익 (7절)
            ↓
[5] 페르소나 매핑 (8절 Persona Registry)
    └─ 사용자 페르소나에 따라 표시 우선순위·강조 지표·레이아웃 분기
            ↓
[6] 시각화 선택 (visualization.md)
    └─ 데이터 특성(시계열/분포/비교) 자동 감지 → 차트 유형 결정
            ↓
[7] 인사이트 생성 (insight-generation.md)
    ├─ 자산별 임계값 규칙
    ├─ 크로스 에셋: 상관관계 변화, 리스크 온/오프 신호
    └─ 페르소나별 맞춤 인사이트 (8절)
            ↓
[8] 레이아웃 (report-layout.md)
    └─ 멀티 에셋 대시보드 / 단일 자산 상세 / 비교 페이지
```

## 5. 범용성 보장 방법

| 원칙 | 구현 |
|------|------|
| 자산 타입 비의존 분석 | 수익률·변동성·MDD는 OHLCV만 있으면 모든 자산 적용 |
| 자산 타입 의존 분석 | `applicableTo: AssetType[]` 메타로 분기 |
| 새 데이터 소스 추가 | `data-schema.md`의 어댑터 프로토콜 구현 → 코드 수정 없이 등록 |
| 새 자산 타입 추가 | `MASTER_SKILL.md`에 등록 + 분석 프로파일 정의 |
| 새 차트 추가 | `visualization.md`의 선택 매트릭스에 행 추가 |

## 6. 데이터 소스: yfinance 단독

이 시스템은 **외부 API 키를 일체 요구하지 않는다**. yfinance가 6개 자산군 전부를 무료로 제공:

| 자산군 | yfinance 티커 예시 |
|--------|-------------------|
| equity_etf | XLK, AAPL, SPY |
| bond | ^IRX (3M T-Bill), ^TNX (10Y), ^TYX (30Y) |
| fx | USDKRW=X, EURUSD=X, USDJPY=X |
| commodity | GLD (gold), USO (oil), SLV (silver) |
| crypto | BTC-USD, ETH-USD |
| index | ^GSPC (S&P500), ^IXIC (Nasdaq), ^KS11 (KOSPI) |

심사자는 `pip install yfinance && python collect.py` 한 번으로 전체 데이터를 재현할 수 있다.

## 7. 데이터 다양성 보장

### 7.1 종목 간 다양성 (Cross-Asset Diversity)
6개 자산 클래스 × 글로벌 지역 커버로 상관관계가 낮은 자산군 확보:

| 자산 클래스 | 종목 수 | 지역 커버 |
|------------|--------|----------|
| equity_etf | 36 | 미국 11 섹터 ETF + S&P500 개별종목 |
| bond | 4 | 미국 국채 3M/5Y/10Y/30Y (만기 다양화) |
| fx | 8 | USD/KRW, EUR, JPY, GBP, CNY, AUD, CHF, CAD |
| commodity | 8 | 귀금속(금/은/백금) + 에너지(원유/천연가스) + 농산물 + 구리 |
| crypto | 10 | BTC/ETH + 스마트계약(SOL/ADA/AVAX) + 인프라(BNB/XRP) + 밈(DOGE) |
| index | 13 | 미국 4개 + 한국 2개 + 일본 + 홍콩 등 글로벌 |

### 7.2 종목 내 다양성 (Intra-Asset Diversity)
각 자산 클래스 내에서 성격이 다른 세부 자산으로 분산:
- **commodity**: 안전자산(금)·산업금속(구리)·에너지(원유/천연가스)·농산물(DBA)·광물(DBC)
- **crypto**: 디지털 금(BTC)·스마트계약 플랫폼(ETH/SOL)·결제(XRP/BNB)·밈(DOGE) — 각기 다른 상관관계
- **bond**: 단기(3M)·중기(5Y)·장기(10Y/30Y) — 듀레이션별 금리 민감도 차이
- **index**: 대형주(^GSPC)·기술주(^IXIC)·소형주(^RUT)·한국(^KS11/^KQ11)·아시아(^N225/^HSI)

## 8. 페르소나 레지스트리 (Persona Registry)

사용자의 투자 성향에 따라 같은 데이터에서 다른 뷰를 제공한다. 페르소나는 인사이트 우선순위, 강조 지표, 레이아웃 배치를 제어한다.

### 8.1 지원 페르소나

| 코드 | 이름 | 핵심 관심사 | 강조 자산 |
|------|------|-----------|---------|
| `global_investor` | 서학개미 (해외 ETF 투자자) | 환율 조정 실질 수익, USD/KRW 변동 | equity_etf, index, fx |
| `crypto_hybrid` | 디지털 에셋 투자자 | 변동성·리스크, BTC 상관관계 | crypto, equity_etf(tech) |
| `defensive` | 안정형 장기 투자자 | 인컴 수익, 방어력, 리밸런싱 | bond, commodity(GLD), equity_etf(배당) |

### 8.2 페르소나별 강조 지표

**global_investor:**
- 최우선 지표: 환율 조정 수익률 (KRW 환산), USD/KRW 변동률
- 환율 헤지 비용 추정 (환전 스프레드 0.5% 가정)
- 해외 자산 비중이 높을수록 환율 위험 경고

**crypto_hybrid:**
- 최우선 지표: 변동성, MDD, BTC 상관관계
- 크립토 레짐 신호: BTC 30일 수익률 기준 시장 사이클 판단
- 변동성 > 60% 시 경고, > 80% 시 위험 경고

**defensive:**
- 최우선 지표: 샤프 비율, MDD, 배당/인컴 수익률
- 일드 커브(^TNX - ^IRX) 역전 시 경기 침체 경고
- 포트폴리오 내 채권 비중 < 20% 시 분산 부족 경고

### 8.3 페르소나 선택 규칙
- 사용자가 URL 파라미터 `?persona=global_investor` 로 명시적 선택
- 미선택 시: 기본값 = `global_investor` (한국 대회 맥락)
- 페르소나 변경은 즉시 인사이트·레이아웃에 반영 (코드 재배포 불필요)

## 10. 변경 이력

| 버전 | 날짜 | 변경 |
|------|------|------|
| v1 | 2026-04-11 | 초안 — 단일 자산군(섹터 ETF) 가정 |
| v2 | 2026-04-12 | 구현 대조 갭 보완 |
| **v3** | **2026-04-12** | **범용 시스템 재설계 — 6개 자산군 지원, 데이터 어댑터 도입, 자산 타입 레지스트리 추가** |
