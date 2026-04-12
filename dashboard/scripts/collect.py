"""
멀티 에셋 데이터 수집 스크립트 — yfinance → JSON

지원 자산 클래스: equity_etf, bond, fx, commodity, crypto, index

사용법:
  pip install yfinance
  python scripts/collect.py
"""

import json
import os
from datetime import datetime, timezone

import yfinance as yf

# ── 자산 레지스트리 ───────────────────────────────────

ASSETS = {
    "equity_etf": {
        "XLK":  {"name": "Technology Select SPDR",       "sector": "Technology",       "currency": "USD"},
        "XLE":  {"name": "Energy Select SPDR",           "sector": "Energy",           "currency": "USD"},
        "XLV":  {"name": "Health Care Select SPDR",      "sector": "Healthcare",       "currency": "USD"},
        "XLF":  {"name": "Financial Select SPDR",        "sector": "Financials",       "currency": "USD"},
        "XLY":  {"name": "Consumer Discretionary SPDR",  "sector": "Consumer Disc.",   "currency": "USD"},
        "XLI":  {"name": "Industrial Select SPDR",       "sector": "Industrials",      "currency": "USD"},
        "XLRE": {"name": "Real Estate Select SPDR",      "sector": "Real Estate",      "currency": "USD"},
        "XLU":  {"name": "Utilities Select SPDR",        "sector": "Utilities",        "currency": "USD"},
        "XLP":  {"name": "Consumer Staples SPDR",        "sector": "Consumer Staples", "currency": "USD"},
        "XLB":  {"name": "Materials Select SPDR",        "sector": "Materials",        "currency": "USD"},
        "XLC":  {"name": "Communication Services SPDR",  "sector": "Communication",    "currency": "USD"},
        "SPY":  {"name": "SPDR S&P 500 ETF Trust",       "sector": "Benchmark",        "currency": "USD"},
    },
    "bond": {
        "^IRX": {"name": "13-Week T-Bill Rate",  "maturity": "3M",  "currency": "USD"},
        "^FVX": {"name": "5-Year Treasury Yield", "maturity": "5Y",  "currency": "USD"},
        "^TNX": {"name": "10-Year Treasury Yield","maturity": "10Y", "currency": "USD"},
        "^TYX": {"name": "30-Year Treasury Yield","maturity": "30Y", "currency": "USD"},
    },
    "fx": {
        "USDKRW=X": {"name": "USD/KRW", "base": "USD", "quote": "KRW", "currency": "KRW"},
        "EURUSD=X": {"name": "EUR/USD", "base": "EUR", "quote": "USD", "currency": "USD"},
        "USDJPY=X": {"name": "USD/JPY", "base": "USD", "quote": "JPY", "currency": "JPY"},
        "GBPUSD=X": {"name": "GBP/USD", "base": "GBP", "quote": "USD", "currency": "USD"},
    },
    "commodity": {
        "GLD": {"name": "SPDR Gold Shares",          "underlying": "Gold",   "currency": "USD"},
        "SLV": {"name": "iShares Silver Trust",      "underlying": "Silver", "currency": "USD"},
        "USO": {"name": "United States Oil Fund",    "underlying": "Oil",    "currency": "USD"},
    },
    "crypto": {
        "BTC-USD": {"name": "Bitcoin",  "currency": "USD"},
        "ETH-USD": {"name": "Ethereum", "currency": "USD"},
    },
    "index": {
        "^GSPC": {"name": "S&P 500",  "region": "US",    "currency": "USD"},
        "^IXIC": {"name": "Nasdaq",   "region": "US",    "currency": "USD"},
        "^DJI":  {"name": "Dow Jones","region": "US",    "currency": "USD"},
        "^KS11": {"name": "KOSPI",    "region": "KR",    "currency": "KRW"},
        "^N225": {"name": "Nikkei 225","region": "JP",   "currency": "JPY"},
    },
}

PERIOD = "2y"
TOP_N_HOLDINGS = 5

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data")

# ── 유틸 ──────────────────────────────────────────────

def ensure_dir(path: str):
    os.makedirs(path, exist_ok=True)


def ohlcv_to_records(df) -> list[dict]:
    records = []
    for date, row in df.iterrows():
        try:
            close = float(row["Close"])
            if close != close:  # NaN check
                continue
            records.append({
                "date": date.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 4),
                "high": round(float(row["High"]), 4),
                "low": round(float(row["Low"]), 4),
                "close": round(close, 4),
                "volume": int(row["Volume"]) if row["Volume"] == row["Volume"] else 0,
            })
        except (ValueError, KeyError):
            continue
    return records


def save_json(data, filename: str):
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  OK {filename} ({os.path.getsize(path) / 1024:.1f} KB)")


# ── 1. 멀티 에셋 가격 수집 ───────────────────────────

def collect_all_assets():
    print("\n[1/4] Multi-asset price collection...")
    result = []

    for asset_type, tickers in ASSETS.items():
        print(f"\n  -- {asset_type} --")
        ticker_list = list(tickers.keys())

        try:
            df = yf.download(ticker_list, period=PERIOD, progress=False, auto_adjust=False)
        except Exception as e:
            print(f"    WARN bulk download failed: {e}")
            continue

        for ticker in ticker_list:
            try:
                if len(ticker_list) > 1:
                    ticker_df = df.xs(ticker, level="Ticker", axis=1).dropna(how="all")
                else:
                    ticker_df = df.dropna(how="all")
                records = ohlcv_to_records(ticker_df)
                if len(records) < 30:
                    print(f"    WARN {ticker}: only {len(records)} rows, skipped")
                    continue

                meta = tickers[ticker]
                asset = {
                    "ticker": ticker,
                    "name": meta.get("name", ticker),
                    "assetType": asset_type,
                    "currency": meta.get("currency", "USD"),
                    "data": records,
                    "metadata": {k: v for k, v in meta.items() if k not in ("name", "currency")},
                }
                result.append(asset)
                print(f"    OK {ticker}: {len(records)} rows")
            except Exception as e:
                print(f"    WARN {ticker}: {e}")

    save_json(result, "assets.json")
    return result


# ── 2. ETF 메타데이터 (equity_etf 전용) ──────────────

def collect_etf_metadata(assets):
    print("\n[2/4] ETF metadata...")
    result = []

    etfs = [a for a in assets if a["assetType"] == "equity_etf" and a["ticker"] != "SPY"]

    for etf in etfs:
        ticker = etf["ticker"]
        try:
            tk = yf.Ticker(ticker)
            info = tk.info
            fd = tk.funds_data
            top = fd.top_holdings

            holdings = []
            for sym, row in top.head(10).iterrows():
                holdings.append({
                    "symbol": sym,
                    "name": row.get("Name", sym),
                    "weight": round(float(row["Holding Percent"]), 6),
                })

            sw = fd.sector_weightings

            result.append({
                "ticker": ticker,
                "name": info.get("shortName", ticker),
                "sector": etf["metadata"].get("sector", ""),
                "expenseRatio": info.get("netExpenseRatio", 0.0008),
                "topHoldings": holdings,
                "sectorWeightings": {k: round(v, 6) for k, v in sw.items()},
            })
            print(f"  OK {ticker}: {len(holdings)} holdings")
        except Exception as e:
            print(f"  WARN {ticker}: {e}")

    save_json(result, "etf-metadata.json")
    return result


# ── 3. 개별 종목 (ETF 구성종목) ──────────────────────

def collect_stock_prices(metadata):
    print("\n[3/4] Stock prices (ETF holdings)...")

    all_tickers = set()
    ticker_sector_map = {}
    for etf in metadata:
        for h in etf["topHoldings"][:TOP_N_HOLDINGS]:
            sym = h["symbol"]
            all_tickers.add(sym)
            ticker_sector_map[sym] = etf["sector"]

    tickers = sorted(all_tickers)
    print(f"  target: {len(tickers)} stocks")

    df = yf.download(tickers, period=PERIOD, progress=False, auto_adjust=False)

    result = []
    for ticker in tickers:
        try:
            ticker_df = df.xs(ticker, level="Ticker", axis=1).dropna(how="all")
            records = ohlcv_to_records(ticker_df)
            if len(records) >= 30:
                result.append({
                    "ticker": ticker,
                    "name": ticker,
                    "assetType": "equity_etf",
                    "currency": "USD",
                    "sector": ticker_sector_map.get(ticker, "Unknown"),
                    "data": records,
                })
        except Exception as e:
            print(f"  WARN {ticker}: {e}")

    print(f"  collected: {len(result)} stocks")
    save_json(result, "stocks.json")


# ── 4. 메타 ──────────────────────────────────────────

def save_meta():
    print("\n[4/4] Metadata...")
    now = datetime.now(timezone.utc).isoformat()

    summary = {
        "lastUpdated": now,
        "assetClasses": list(ASSETS.keys()),
        "totalAssets": sum(len(v) for v in ASSETS.values()),
        "period": PERIOD,
    }
    save_json(summary, "meta.json")


# ── main ─────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Multi-Asset Data Collection (yfinance)")
    print("=" * 60)
    print(f"Asset classes: {list(ASSETS.keys())}")
    print(f"Total tickers: {sum(len(v) for v in ASSETS.values())}")

    ensure_dir(OUTPUT_DIR)

    assets = collect_all_assets()
    metadata = collect_etf_metadata(assets)
    collect_stock_prices(metadata)
    save_meta()

    print("\n" + "=" * 60)
    print("Done!")
    print(f"  Output: {os.path.abspath(OUTPUT_DIR)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
