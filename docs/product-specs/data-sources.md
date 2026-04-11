# 데이터 소스 정의

> **상태**: ✅ 조사 완료 & 확정 (2026-04-11)

---

## 확정 데이터 소스 스택

> **설계 원칙**: 심사자가 별도 API 키 없이 `pip install yfinance` 한 줄로 전체 재현 가능

| 용도 | 소스 | API 키 | 이유 |
|------|------|--------|------|
| **가격 데이터** | yfinance | 불필요 | 무료·빠름, 2년+ 이력, 일괄 다운로드 |
| **ETF 구성종목** | yfinance `funds_data.top_holdings` | 불필요 | 상위 10 종목 + 비중 실시간 제공 |
| **무위험수익률** | yfinance `^IRX` (13-Week T-Bill) | 불필요 | FRED 대체 — 샤프 비율 계산용 |
| **시장 지표** | yfinance `^GSPC`, `^VIX` | 불필요 | 벤치마크, 변동성 지수 |
| **배당 데이터** | yfinance `Ticker.dividends` | 불필요 | ETF 분배금 이력 |
| **fallback** | 정적 JSON (`data/`) | 불필요 | yfinance 장애 시 대시보드 동작 보장 |

### 외부 API 키 의존성: 없음 (0개)

yfinance가 모든 데이터를 커버하므로 FRED 등 키 필요 API는 사용하지 않는다.
심사자는 `pip install yfinance && python collect.py` 만으로 전체 데이터를 재현할 수 있다.

### 조사한 대안 API

| API | 무료 한도 | API 키 | 기각 이유 |
|-----|----------|--------|----------|
| Alpha Vantage | 25 req/day | 필요 | 요청 한도 부족 + 키 필요 |
| FRED | 무제한 | 필요 | yfinance `^IRX`로 대체 가능 |
| Twelve Data | 800 req/day | 필요 | yfinance 무제한이므로 불필요 |
| FMP | 250 req/day | 필요 | ETF holdings도 yfinance로 충분 |
| Polygon.io | 5 req/min | 필요 | holdings 유료 + 키 필요 |

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

### 무위험수익률 & 매크로 (yfinance 단독 커버)

| 티커 | 이름 | 용도 | 실측 결과 |
|------|------|------|----------|
| `^IRX` | 13-Week T-Bill Rate (CBOE) | 무위험수익률 → 샤프 비율 | ✅ 251행, 최신 3.59% |
| `^TNX` | 10-Year Treasury Yield | 장기 금리 참고 | ✅ 251행, 최신 4.32% |
| `^GSPC` | S&P 500 Index | 시장 벤치마크 | ✅ |
| `^VIX` | VIX | 시장 변동성 지수 | ✅ |
| `GLD` | SPDR Gold Trust | 대체 자산 비교 (선택) | ✅ |

> FRED의 DTB3(T-Bill)을 `^IRX`로 완전 대체. API 키 의존성 제거.

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

### 재현 가이드 (심사자용)

```bash
pip install yfinance
python collect.py          # → data/ 폴더에 JSON 생성
npm install && npm run dev # → http://localhost:3000
```

외부 API 키, 환경변수, 별도 계정 등록 일체 불필요.
