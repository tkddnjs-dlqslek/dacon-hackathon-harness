# 데이터 소스 정의

## 1차 데이터 소스: yfinance

### 섹터별 대표 ETF 후보
| 섹터 | 티커 | 이름 | 비고 |
|------|------|------|------|
| Technology | XLK | Technology Select Sector SPDR | |
| Energy | XLE | Energy Select Sector SPDR | |
| Healthcare | XLV | Health Care Select Sector SPDR | |
| Finance | XLF | Financial Select Sector SPDR | |
| Consumer Disc. | XLY | Consumer Discretionary SPDR | |
| Industrial | XLI | Industrial Select Sector SPDR | |
| Real Estate | XLRE | Real Estate Select Sector SPDR | |
| Utilities | XLU | Utilities Select Sector SPDR | |

> ⚠️ 위 목록은 초안. Claude Code가 데이터 소스 조사 후 확정할 것.

### 섹터별 대표 개별종목 후보 (ETF vs 직접투자 비교용)
| 섹터 | 대표 종목 예시 | 비고 |
|------|-------------|------|
| Technology | AAPL, MSFT, NVDA, GOOGL, META | XLK 상위 구성 종목 |
| Energy | XOM, CVX, COP, SLB, EOG | XLE 상위 구성 종목 |
| Healthcare | UNH, JNJ, LLY, ABBV, PFE | XLV 상위 구성 종목 |
| Finance | BRK-B, JPM, V, MA, BAC | XLF 상위 구성 종목 |

> ⚠️ 실제 구현 시 yfinance에서 각 ETF의 상위 구성 종목을 동적으로 가져오는 것이 이상적.
> fallback: 위 정적 목록 사용.

### 대안 데이터 소스 후보
Claude Code가 아래 대안을 조사하고 비교할 것:
- Alpha Vantage (무료 tier)
- FRED (연준 경제 데이터)
- Yahoo Finance RSS
- 공공 데이터: KRX, KOSPI ETF

### 데이터 수집 스크립트 요구사항
- Python + yfinance
- 출력: JSON 파일 (`data/` 폴더)
- 기간: 최소 2년치
- 자동 fallback: API 실패 시 정적 JSON 사용
