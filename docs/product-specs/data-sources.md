# 데이터 소스 정의

> **상태**: ✅ 조사 완료 & 확정 (2026-04-11)

---

## 확정 데이터 소스 스택

| 용도 | 소스 | 이유 |
|------|------|------|
| **가격 데이터 (1차)** | yfinance | 무료·무키·빠름, 2년+ 이력, 일괄 다운로드 지원 |
| **ETF 구성종목** | yfinance `funds_data.top_holdings` | 실시간 상위 10 종목 + 비중 제공 확인 완료 |
| **보조 (매크로)** | FRED | 무위험수익률(T-Bill), 인플레이션 등 매크로 지표 |
| **가격 데이터 (fallback)** | 정적 JSON (`data/`) | yfinance 장애 시 대시보드 동작 보장 |

### 기각된 대안

| API | 기각 이유 |
|-----|----------|
| Alpha Vantage | 무료 25 req/day — 8 ETF + 40 종목 커버 불가 |
| Twelve Data | 800 req/day 충분하나, yfinance가 무제한이므로 불필요 |
| FMP | ETF holdings 제공하지만 yfinance로 충분 |
| Polygon.io | 무료 tier 5 req/min, holdings는 유료 |

---

## yfinance 검증 결과 (2026-04-11 실측)

### 가격 데이터

| 항목 | 결과 |
|------|------|
| 8 ETF 2년치 일괄 다운로드 | ✅ 501행, **0.93초** |
| 개별종목 3개 2년치 | ✅ 501행, 0.82초 |
| 제공 컬럼 | Close, Open, High, Low, Volume |
| 날짜 범위 | 2024-04-11 ~ 2026-04-10 |

### ETF 메타데이터

| 항목 | 결과 |
|------|------|
| `funds_data.top_holdings` | ✅ 상위 10종목 + 비중(%) |
| `funds_data.sector_weightings` | ✅ 11개 섹터 비중 |
| `funds_data.asset_classes` | ✅ 주식/채권/현금 비중 |
| `info.netExpenseRatio` | ✅ 보수율 (전 ETF 0.08~0.09%) |

### 알려진 리스크

- yfinance는 비공식 스크래핑 — Yahoo 측 변경 시 일시 장애 가능
- **대응**: `data/` 폴더에 정적 JSON fallback 유지, 주 1회 갱신

---

## 섹터별 대표 ETF (확정)

> SPDR Select Sector 시리즈 — 전 종목 동일 보수율 0.08%, S&P 500 섹터 분류 기반

| # | 섹터 | 티커 | 이름 | 상위 5 구성종목 |
|---|------|------|------|----------------|
| 1 | Technology | XLK | Technology Select Sector SPDR | NVDA, AAPL, MSFT, AVGO, MU |
| 2 | Energy | XLE | Energy Select Sector SPDR | XOM, CVX, COP, EOG, SLB |
| 3 | Healthcare | XLV | Health Care Select Sector SPDR | LLY, JNJ, ABBV, MRK, UNH |
| 4 | Financials | XLF | Financial Select Sector SPDR | BRK-B, JPM, V, MA, BAC |
| 5 | Consumer Disc. | XLY | Consumer Discretionary SPDR | AMZN, TSLA, HD, MCD, TJX |
| 6 | Industrials | XLI | Industrial Select Sector SPDR | CAT, GE, RTX, GEV, BA |
| 7 | Real Estate | XLRE | Real Estate Select Sector SPDR | WELL, PLD, EQIX, AMT, DLR |
| 8 | Utilities | XLU | Utilities Select Sector SPDR | NEE, SO, DUK, CEG, AEP |
| 9 | Consumer Staples | XLP | Consumer Staples Select SPDR | WMT, COST, PG, ... |
| 10 | Materials | XLB | Materials Select Sector SPDR | LIN, NEM, FCX, ... |
| 11 | Communication | XLC | Communication Services SPDR | META, GOOGL, GOOG, ... |

### 벤치마크

| 티커 | 이름 | 보수율 | 용도 |
|------|------|--------|------|
| SPY | SPDR S&P 500 ETF Trust | 0.0945% | 시장 벤치마크, 베타 계산 기준 |

---

## 섹터별 대표 개별종목 (ETF vs 직접투자 비교용)

> yfinance `funds_data.top_holdings`에서 동적으로 가져오되, fallback용 정적 목록도 유지

| 섹터 | 상위 5 종목 (시총 순) | 출처 |
|------|---------------------|------|
| Technology | NVDA, AAPL, MSFT, AVGO, MU | XLK top_holdings |
| Energy | XOM, CVX, COP, EOG, SLB | XLE top_holdings |
| Healthcare | LLY, JNJ, ABBV, MRK, UNH | XLV top_holdings |
| Financials | BRK-B, JPM, V, MA, BAC | XLF top_holdings |
| Consumer Disc. | AMZN, TSLA, HD, MCD, TJX | XLY top_holdings |
| Industrials | CAT, GE, RTX, GEV, BA | XLI top_holdings |
| Real Estate | WELL, PLD, EQIX, AMT, DLR | XLRE top_holdings |
| Utilities | NEE, SO, DUK, CEG, AEP | XLU top_holdings |

---

## 데이터 수집 스크립트 요구사항

- **언어**: Python + yfinance
- **출력**: JSON 파일 (`data/` 폴더)
- **기간**: 최소 2년치 (501 거래일)
- **자동 fallback**: API 실패 시 정적 JSON 사용
- **갱신 주기**: 주 1회 또는 수동 트리거
- **일괄 다운로드**: `yf.download(tickers, period='2y')` — 11 ETF + SPY 한 번에

### 수집 데이터 구조

```
data/
├── etf-prices.json       # 11 ETF + SPY 일간 OHLCV
├── stock-prices.json     # 섹터별 상위 5 개별종목 일간 OHLCV
├── etf-metadata.json     # holdings, sector_weightings, expense_ratio
└── last-updated.json     # 마지막 갱신 시각
```

### FRED 데이터 (보조)

| 시리즈 ID | 이름 | 용도 |
|-----------|------|------|
| DTB3 | 3-Month T-Bill Rate | 무위험수익률 (샤프 비율 계산) |
| CPIAUCSL | CPI (선택) | 실질 수익률 계산 |
