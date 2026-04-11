"""
데이터 수집 스크립트 — yfinance → JSON (dashboard/public/data/)

사용법:
  pip install yfinance
  python scripts/collect.py

출력:
  public/data/etf-prices.json       # 11 ETF + SPY 일간 OHLCV
  public/data/stock-prices.json     # 섹터별 상위 5 개별종목 OHLCV
  public/data/etf-metadata.json     # holdings, sector_weightings, expense_ratio
  public/data/risk-free-rate.json   # ^IRX 최신 값
  public/data/last-updated.json     # 마지막 갱신 시각
"""

import json
import os
import sys
from datetime import datetime, timezone

import yfinance as yf

# ── 설정 ──────────────────────────────────────────────

SECTOR_ETFS = {
    "Technology": "XLK",
    "Energy": "XLE",
    "Healthcare": "XLV",
    "Financials": "XLF",
    "Consumer Disc.": "XLY",
    "Industrials": "XLI",
    "Real Estate": "XLRE",
    "Utilities": "XLU",
    "Consumer Staples": "XLP",
    "Materials": "XLB",
    "Communication": "XLC",
}

BENCHMARK = "SPY"
PERIOD = "2y"
TOP_N_HOLDINGS = 5

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data")

# ── 유틸 ──────────────────────────────────────────────

def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def ohlcv_to_records(df) -> list[dict]:
    """yfinance DataFrame → JSON-serializable records"""
    records = []
    for date, row in df.iterrows():
        records.append({
            "date": date.strftime("%Y-%m-%d"),
            "open": round(float(row["Open"]), 4),
            "high": round(float(row["High"]), 4),
            "low": round(float(row["Low"]), 4),
            "close": round(float(row["Close"]), 4),
            "volume": int(row["Volume"]),
        })
    return records


def save_json(data, filename: str):
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  OK {filename} ({os.path.getsize(path) / 1024:.1f} KB)")


# ── 1. ETF 가격 데이터 ───────────────────────────────

def collect_etf_prices():
    print("\n[1/5] ETF 가격 수집...")
    tickers = list(SECTOR_ETFS.values()) + [BENCHMARK]
    df = yf.download(tickers, period=PERIOD, progress=False)

    result = []
    for sector, ticker in {**SECTOR_ETFS, "Benchmark": BENCHMARK}.items():
        try:
            ticker_df = df.xs(ticker, level="Ticker", axis=1)
            records = ohlcv_to_records(ticker_df)
            result.append({
                "ticker": ticker,
                "name": ticker,  # 메타데이터에서 업데이트
                "sector": sector,
                "data": records,
            })
            print(f"  {ticker}: {len(records)}행")
        except Exception as e:
            print(f"  WARN {ticker}: {e}")

    save_json(result, "etf-prices.json")
    return result


# ── 2. ETF 메타데이터 ────────────────────────────────

def collect_etf_metadata():
    print("\n[2/5] ETF 메타데이터 수집...")
    result = []

    for sector, ticker in SECTOR_ETFS.items():
        try:
            tk = yf.Ticker(ticker)
            info = tk.info
            fd = tk.funds_data

            # top holdings
            top = fd.top_holdings
            holdings = []
            for sym, row in top.head(10).iterrows():
                holdings.append({
                    "symbol": sym,
                    "name": row.get("Name", sym),
                    "weight": round(float(row["Holding Percent"]), 6),
                })

            # sector weightings
            sw = fd.sector_weightings

            result.append({
                "ticker": ticker,
                "name": info.get("shortName", ticker),
                "sector": sector,
                "expenseRatio": info.get("netExpenseRatio", 0.0008),
                "topHoldings": holdings,
                "sectorWeightings": {k: round(v, 6) for k, v in sw.items()},
            })
            print(f"  {ticker}: {len(holdings)} holdings")
        except Exception as e:
            print(f"  WARN {ticker}: {e}")

    save_json(result, "etf-metadata.json")
    return result


# ── 3. 개별종목 가격 데이터 ──────────────────────────

def collect_stock_prices(metadata: list[dict]):
    print("\n[3/5] 개별종목 가격 수집...")

    # 메타데이터에서 상위 N개 종목 추출
    all_tickers = set()
    ticker_sector_map = {}
    for etf in metadata:
        for h in etf["topHoldings"][:TOP_N_HOLDINGS]:
            sym = h["symbol"]
            all_tickers.add(sym)
            ticker_sector_map[sym] = etf["sector"]

    tickers = sorted(all_tickers)
    print(f"  대상: {len(tickers)}개 종목")

    df = yf.download(tickers, period=PERIOD, progress=False)

    result = []
    for ticker in tickers:
        try:
            ticker_df = df.xs(ticker, level="Ticker", axis=1)
            records = ohlcv_to_records(ticker_df)
            result.append({
                "ticker": ticker,
                "name": ticker,
                "sector": ticker_sector_map.get(ticker, "Unknown"),
                "data": records,
            })
        except Exception as e:
            print(f"  WARN {ticker}: {e}")

    print(f"  수집 완료: {len(result)}개 종목")
    save_json(result, "stock-prices.json")


# ── 4. 무위험수익률 ─────────────────────────────────

def collect_risk_free_rate():
    print("\n[4/5] 무위험수익률 (^IRX) 수집...")
    try:
        tk = yf.Ticker("^IRX")
        hist = tk.history(period="5d")
        rate = float(hist["Close"].iloc[-1])
        save_json({"rate": round(rate, 4), "source": "^IRX (13-Week T-Bill)"}, "risk-free-rate.json")
        print(f"  현재: {rate:.2f}%")
    except Exception as e:
        print(f"  WARN fallback 4.0% 사용: {e}")
        save_json({"rate": 4.0, "source": "fallback"}, "risk-free-rate.json")


# ── 5. 갱신 시각 ────────────────────────────────────

def save_last_updated():
    now = datetime.now(timezone.utc).isoformat()
    save_json({"lastUpdated": now}, "last-updated.json")


# ── main ─────────────────────────────────────────────

def main():
    print("=" * 50)
    print("데이터 수집 시작 (yfinance → JSON)")
    print("=" * 50)

    ensure_dir(OUTPUT_DIR)

    etf_prices = collect_etf_prices()
    metadata = collect_etf_metadata()
    collect_stock_prices(metadata)
    collect_risk_free_rate()
    save_last_updated()

    # ETF 이름 업데이트 (메타데이터 → 가격 데이터)
    name_map = {m["ticker"]: m["name"] for m in metadata}
    for etf in etf_prices:
        if etf["ticker"] in name_map:
            etf["name"] = name_map[etf["ticker"]]
    save_json(etf_prices, "etf-prices.json")

    print("\n" + "=" * 50)
    print("Done!")
    print(f"   출력: {os.path.abspath(OUTPUT_DIR)}")
    print("=" * 50)


if __name__ == "__main__":
    main()
