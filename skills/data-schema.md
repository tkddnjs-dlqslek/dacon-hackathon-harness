# data-schema.md — 통일 데이터 스키마 & 어댑터 프로토콜

## 0. 데이터 형식 구분

이 시스템은 두 가지 데이터 형식을 동시에 처리한다:

| 형식 | 설명 | 예시 자산 | 처리 위치 |
|------|------|----------|----------|
| **시계열 (Time Series)** | OHLCV 일간 가격 데이터 | 주식, 채권, 외환, 원자재, 암호화폐, 지수 | `loadAllAssets()` → `Asset[]` |
| **단면 (Snapshot)** | 특정 시점의 재무 지표 | 재무제표 (PER, PBR, ROE, EPS) | `loadFundamentals()` → `FundamentalAsset[]` |

> **핵심**: 두 형식은 데이터 구조가 완전히 다르지만 같은 Skills 기반 시스템이 처리한다.
> 시계열은 시각화/분석 엔진을, 단면은 스크리닝/필터 엔진을 사용하며, 둘 다 어댑터 패턴으로 표준화된다.

---

## 1. 통일 내부 스키마

모든 입력 데이터는 다음 형식으로 변환되어 분석 엔진에 전달된다.

### 1.1 자산 객체 (Asset)

```typescript
interface Asset {
  ticker: string;          // 고유 식별자
  name: string;            // 표시 이름
  assetType: AssetType;    // 6개 중 하나
  sector?: string;         // equity_etf 전용
  currency: string;        // USD, KRW, ...
  data: OHLCV[];           // 시계열 데이터
  metadata?: {
    expenseRatio?: number;     // ETF 전용
    couponRate?: number;       // bond 전용
    underlyingAsset?: string;  // commodity 전용
    [key: string]: unknown;
  };
}

type AssetType = "equity_etf" | "bond" | "fx" | "commodity" | "crypto" | "index";
```

### 1.2 시계열 포인트 (OHLCV)

```typescript
interface OHLCV {
  date: string;   // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number; // FX/bond는 0 가능
}
```

> **불변 규칙**: 모든 자산 타입이 동일한 OHLCV 형식을 따른다. 분석 엔진은 자산 타입을 모르고도 기본 지표(수익률, 변동성, MDD)를 계산할 수 있다.

---

## 2. 어댑터 프로토콜

새로운 데이터 소스를 추가할 때 구현해야 할 인터페이스.

### 2.1 어댑터 시그니처

```typescript
interface DataAdapter {
  name: string;                              // "yfinance", "csv", "krx" 등
  supportedTypes: AssetType[];               // 이 어댑터가 처리 가능한 자산 타입
  fetch(tickers: string[], period: string): Promise<Asset[]>;
  validate(asset: Asset): ValidationResult;  // 4절 데이터 품질 규칙 적용
}
```

### 2.2 어댑터 등록 규칙

- 어댑터는 자산 타입을 **자동 추론**하거나 **티커 패턴**으로 결정한다.
- 추론 규칙 예시:
  - `^` 시작 → `index` 또는 `bond` (패턴 추가 분기)
  - `=X` 끝 → `fx`
  - `-USD` 끝 → `crypto`
  - `^IRX/^TNX/^TYX/^FVX` → `bond` (override)
  - 그 외 → `equity_etf`

### 2.3 현재 등록된 어댑터

| 어댑터 | 지원 자산 타입 | 비고 |
|--------|--------------|------|
| `yfinance` | 전체 6종 | 1차 소스, API 키 불필요 (`lib/adapters/yfinance.ts`) |
| `csv` | 전체 6종 | 사용자 업로드 / 정적 fallback (`lib/adapters/csv.ts`) |

---

## 3. 자산 타입별 필수/선택 필드

| 필드 | equity_etf | bond | fx | commodity | crypto | index |
|------|:---------:|:----:|:--:|:---------:|:------:|:-----:|
| ticker | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| name | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| OHLCV.close | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| OHLCV.volume | ✅ | ⬜ | ⬜ | ✅ | ✅ | ⬜ |
| sector | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| metadata.expenseRatio | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| metadata.couponRate | ⬜ | 🔵 | ⬜ | ⬜ | ⬜ | ⬜ |
| currency | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

✅ 필수 / 🔵 권장 / ⬜ 선택

---

## 4. 데이터 품질 규칙

### 4.1 결측치 처리

| 상황 | 처리 |
|------|------|
| close 결측 1~2일 | forward fill (전일 종가) |
| close 결측 3일 이상 | 해당 구간 제외 + UI 경고 |
| 거래량 결측 | 0으로 대체 |
| 데이터 30일 미만 | "분석 불가" 표시 |

### 4.2 이상치 검증

- 단일 일간 변동률 > 50% → 분할/병합 의심, 로그에 경고
- 0 또는 음수 가격 → 자동 제외 (FX 제외)

### 4.3 시간대 처리

- 모든 날짜는 UTC 기준 YYYY-MM-DD로 정규화
- 거래소가 다른 자산을 비교할 때는 거래일 교집합 사용

---

## 5. 데이터 추가 가이드 (확장 시나리오)

### 5.1 새 자산 추가 (기존 어댑터 활용)

`scripts/collect.py`의 ASSETS 딕셔너리에 한 줄 추가:
```python
ASSETS["equity_etf"]["NEW_TICKER"] = {"name": "...", "sector": "..."}
```

### 5.2 새 어댑터 추가

1. `lib/adapters/` 폴더에 `xxx.ts` 생성
2. `DataAdapter` 인터페이스 구현
3. `lib/adapters/index.ts`에 등록
4. **코드 수정 끝**. 분석 엔진/UI는 자동 대응

### 5.3 새 자산 타입 추가

1. `MASTER_SKILL.md`의 자산 레지스트리에 추가
2. `data-analysis.md`에 특화 지표 정의 (선택)
3. `insight-generation.md`에 임계값 규칙 추가 (선택)
4. 어댑터의 `supportedTypes`에 추가

---

## 6. Walkthrough — 새 자산 클래스 "REIT" 추가하기

본 시스템의 범용성을 구체적으로 증명하기 위해 가상의 새 자산 클래스 추가 시나리오를 단계별로 설명한다. 이 walkthrough를 따라하면 약 30분 안에 새 자산 타입이 시스템 전체에 통합된다.

### 6.1 시나리오
부동산 투자 신탁(REIT)을 별도 자산 클래스로 추가하고 싶다. REIT은 주식·ETF의 일종이지만 다음 특성으로 별도 분류 가치가 있다:
- 배당수익률(dividend yield) 중심 — 가격 수익률만 봐선 부족
- 금리에 민감 — bond와 상관도 높음
- 인플레 헤지 효과 — commodity와 유사

### 6.2 단계별 작업

**Step 1: MASTER_SKILL.md 자산 레지스트리에 행 추가**
```markdown
| `reit` | 부동산 신탁 | VNQ, IYR, SCHH | 배당수익률, 금리민감도, 가격수익률 |
```

**Step 2: data-schema.md 3절(필드 표)에 컬럼 추가**
```
| metadata.dividendYield | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | 🔵 |
```
(reit 열 추가, dividendYield 권장)

**Step 3: data-analysis.md 3절에 특화 지표 추가**
```markdown
### 3.7 reit (부동산 신탁)

| 지표 | 공식/방법 | 비고 |
|------|----------|------|
| 배당수익률 | metadata.dividendYield | yfinance에서 기본 제공 |
| 금리 민감도 | ^TNX 대비 베타 (회귀) | 채권과 회귀 |
| 인플레 헤지 점수 | -상관(reit, 주식) | commodity와 유사 |
```

**Step 4: insight-generation.md 2절에 인사이트 룰 추가**
```markdown
### REIT 전용 (assetType=reit)
| 조건 | 등급 | 메시지 |
|------|------|-------|
| 배당수익률 > 5% | 🟢 | `{ticker} 배당수익률 {value}%로 인컴 우수` |
| ^TNX 대비 베타 > 1.5 | 🟡 | `{ticker} 금리 민감도 베타 {value} - 금리 상승 시 가격 하락 위험` |
```

**Step 5: insight-generation.md 11절에 임계값 근거 추가**
```markdown
### 11.12 REIT 임계 (2절)
| 임계 | 근거 |
|------|------|
| 배당수익률 > 5% | NAREIT 평균 4.0%(2010-2024), 5%는 상위 30% |
| 금리 베타 > 1.5 | VNQ historical 베타 1.2, 1.5는 평균보다 25% 높음 |
```

**Step 6: 코드 변경 (자동화 후보)**
```typescript
// dashboard/src/types/index.ts
export type AssetType =
  | "equity_etf" | "bond" | "fx" | "commodity" | "crypto" | "index"
  | "reit"; // 추가

export const ASSET_CLASS_LABELS: Record<AssetType, string> = {
  equity_etf: "주식 / ETF",
  bond: "채권 / 금리",
  fx: "외환",
  commodity: "원자재",
  crypto: "암호화폐",
  index: "시장 지수",
  reit: "부동산 신탁", // 추가
};

export const ASSET_CLASS_COLORS: Record<AssetType, string> = {
  // ... 기존
  reit: "#A855F7", // 보라색
};
```

```typescript
// dashboard/src/lib/asset-profiles.ts
export const ASSET_PROFILES: Record<AssetType, AssetProfile> = {
  // ... 기존 6개
  reit: {
    type: "reit",
    label: "부동산 신탁",
    description: "REIT — 부동산 투자 신탁. 배당과 금리 민감도 중심.",
    valueMode: "price",
    valueLabel: "가격",
    valueUnit: "$",
    metrics: [
      ...COMMON_METRICS,
      { key: "dividendYield", label: "배당수익률", applicable: true, unit: "%" },
      { key: "rateBeta", label: "금리 베타", applicable: true, unit: "ratio" },
    ],
  },
};
```

```typescript
// dashboard/src/lib/adapters/index.ts
export function inferAssetTypeFromTicker(ticker: string): AssetType {
  if (REIT_TICKERS.has(ticker)) return "reit"; // 추가
  // ... 기존 로직
}
```

**Step 7: 데이터 수집 (collect.py)**
```python
ASSETS["reit"] = {
    "VNQ": {"name": "Vanguard Real Estate ETF"},
    "IYR": {"name": "iShares U.S. Real Estate ETF"},
    "SCHH": {"name": "Schwab U.S. REIT ETF"},
}
```

**Step 8: 검증**
- `/asset-class/reit` 페이지 자동 생성 (Next.js dynamic route)
- 메인 대시보드 자산 클래스 칩에 "부동산 신탁" 추가됨
- 인사이트 생성기가 reit 자산도 평가
- 차트 색상이 보라색으로 일관성 유지

### 6.3 작업 분해 표

| 단계 | 작업 | 위치 | 라인 수 | 예상 시간 |
|------|------|------|--------|---------|
| 1 | MASTER_SKILL.md 행 추가 | Skills | 1줄 | 1분 |
| 2 | data-schema.md 컬럼 추가 | Skills | 1줄 | 1분 |
| 3 | data-analysis.md 3.7절 신설 | Skills | 10줄 | 5분 |
| 4 | insight-generation.md 룰 추가 | Skills | 6줄 | 5분 |
| 5 | insight-generation.md 임계 근거 | Skills | 4줄 | 5분 |
| 6 | TypeScript 타입·레지스트리 | Code | 15줄 | 5분 |
| 7 | collect.py 자산 추가 | Code | 5줄 | 2분 |
| 8 | dev 서버 확인 | - | - | 5분 |

**총합: 약 30분, Skills 21줄 + Code 20줄.** 새 자산 클래스가 시스템 전체에 통합됨.

### 6.4 자동화 가능성

위 8단계 중 1~5단계(Skills 수정)만 사람이 한다면, 6~7단계(코드 수정)는 Claude Code가 `code-mapping.md`의 매핑 표를 보고 자동 생성 가능. 즉:

- **사람**: Skills 5분 작성
- **AI**: 25분 작업을 자동으로 수행 (타입 추가, 레지스트리 등록, 데이터 수집 스크립트 수정)

이것이 본 시스템이 주장하는 **"바이브코딩 = 문서가 코드를 만든다"** 의 구체적 증거다.

### 6.5 다른 확장 시나리오

같은 패턴으로 다음 자산 클래스도 추가 가능:
- **ESG 점수**: 새 단면(snapshot) 데이터 형식 + ESG 점수 어댑터
- **Private Equity Index**: index 타입 확장 + 분기별 평가가
- **Carbon Credit**: commodity 변형 + 정책 의존성 인사이트
- **NFT Floor Price**: crypto 변형 + 유동성 지표 추가
