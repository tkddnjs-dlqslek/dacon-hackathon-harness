# data-schema.md — 통일 데이터 스키마 & 어댑터 프로토콜

## §1. 통일 내부 스키마

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

## §2. 어댑터 프로토콜

새로운 데이터 소스를 추가할 때 구현해야 할 인터페이스.

### 2.1 어댑터 시그니처

```typescript
interface DataAdapter {
  name: string;                              // "yfinance", "csv", "krx" 등
  supportedTypes: AssetType[];               // 이 어댑터가 처리 가능한 자산 타입
  fetch(tickers: string[], period: string): Promise<Asset[]>;
  validate(asset: Asset): ValidationResult;  // §4 데이터 품질 규칙 적용
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
| `yfinance` | 전체 6종 | 1차 소스, API 키 불필요 |
| `staticJson` | 전체 6종 | yfinance 장애 시 fallback |
| `csv` (계획) | 전체 6종 | 사용자 업로드 지원 (Phase 4) |

---

## §3. 자산 타입별 필수/선택 필드

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

## §4. 데이터 품질 규칙

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

## §5. 데이터 추가 가이드 (확장 시나리오)

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
