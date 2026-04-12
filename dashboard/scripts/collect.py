"""
멀티 에셋 데이터 수집 - 2단계 구조

[Detail tier]
- assets.json: 대표 자산(~50)의 풀 OHLCV
- 차트/깊이 분석 페이지용

[Universe tier]
- universe.json: 600+ 자산의 사전 계산 지표 (시계열 없음)
- 메인 대시보드 테이블/스크리닝용
- S&P 500 전 종목 포함

사용법:
  pip install yfinance pandas
  python scripts/collect.py
"""

import json
import math
import os
from datetime import datetime, timezone

import pandas as pd
import yfinance as yf

# ── 1. Detail tier 자산 (풀 OHLCV) ────────────────────

DETAIL_ASSETS = {
    "equity_etf": {
        # 11 sector SPDRs + benchmarks
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
        # popular index ETFs
        "QQQ":  {"name": "Invesco QQQ (Nasdaq 100)",     "sector": "Benchmark",        "currency": "USD"},
        "DIA":  {"name": "SPDR Dow Jones",               "sector": "Benchmark",        "currency": "USD"},
        "IWM":  {"name": "iShares Russell 2000",         "sector": "Benchmark",        "currency": "USD"},
        "VTI":  {"name": "Vanguard Total Stock Market",  "sector": "Benchmark",        "currency": "USD"},
    },
    "bond": {
        "^IRX": {"name": "13-Week T-Bill Rate",   "maturity": "3M",  "currency": "USD"},
        "^FVX": {"name": "5-Year Treasury Yield", "maturity": "5Y",  "currency": "USD"},
        "^TNX": {"name": "10-Year Treasury Yield","maturity": "10Y", "currency": "USD"},
        "^TYX": {"name": "30-Year Treasury Yield","maturity": "30Y", "currency": "USD"},
    },
    "fx": {
        "USDKRW=X": {"name": "USD/KRW", "currency": "KRW"},
        "EURUSD=X": {"name": "EUR/USD", "currency": "USD"},
        "USDJPY=X": {"name": "USD/JPY", "currency": "JPY"},
        "GBPUSD=X": {"name": "GBP/USD", "currency": "USD"},
        "USDCNY=X": {"name": "USD/CNY", "currency": "CNY"},
        "AUDUSD=X": {"name": "AUD/USD", "currency": "USD"},
        "USDCHF=X": {"name": "USD/CHF", "currency": "CHF"},
        "USDCAD=X": {"name": "USD/CAD", "currency": "CAD"},
    },
    "commodity": {
        "GLD":  {"name": "SPDR Gold Shares",        "underlying": "Gold",         "currency": "USD"},
        "SLV":  {"name": "iShares Silver Trust",    "underlying": "Silver",       "currency": "USD"},
        "USO":  {"name": "United States Oil Fund",  "underlying": "Oil",          "currency": "USD"},
        "UNG":  {"name": "United States Nat Gas",   "underlying": "Natural Gas",  "currency": "USD"},
        "DBA":  {"name": "Invesco Agriculture Fund","underlying": "Agriculture",  "currency": "USD"},
        "DBC":  {"name": "Invesco Commodity Index", "underlying": "Mixed",        "currency": "USD"},
        "PPLT": {"name": "Aberdeen Platinum Trust", "underlying": "Platinum",     "currency": "USD"},
        "CPER": {"name": "United States Copper",    "underlying": "Copper",       "currency": "USD"},
    },
    "crypto": {
        "BTC-USD":  {"name": "Bitcoin",       "currency": "USD"},
        "ETH-USD":  {"name": "Ethereum",      "currency": "USD"},
        "BNB-USD":  {"name": "BNB",           "currency": "USD"},
        "XRP-USD":  {"name": "Ripple",        "currency": "USD"},
        "SOL-USD":  {"name": "Solana",        "currency": "USD"},
        "ADA-USD":  {"name": "Cardano",       "currency": "USD"},
        "DOGE-USD": {"name": "Dogecoin",      "currency": "USD"},
        "AVAX-USD": {"name": "Avalanche",     "currency": "USD"},
        "DOT-USD":  {"name": "Polkadot",      "currency": "USD"},
        "LINK-USD": {"name": "Chainlink",     "currency": "USD"},
    },
    "index": {
        "^GSPC":  {"name": "S&P 500",       "region": "US",    "currency": "USD"},
        "^IXIC":  {"name": "Nasdaq",        "region": "US",    "currency": "USD"},
        "^DJI":   {"name": "Dow Jones",     "region": "US",    "currency": "USD"},
        "^RUT":   {"name": "Russell 2000",  "region": "US",    "currency": "USD"},
        "^KS11":  {"name": "KOSPI",         "region": "KR",    "currency": "KRW"},
        "^N225":  {"name": "Nikkei 225",    "region": "JP",    "currency": "JPY"},
        "^HSI":   {"name": "Hang Seng",     "region": "HK",    "currency": "HKD"},
        "^FTSE":  {"name": "FTSE 100",      "region": "UK",    "currency": "GBP"},
        "^GDAXI": {"name": "DAX",           "region": "DE",    "currency": "EUR"},
        "^FCHI":  {"name": "CAC 40",        "region": "FR",    "currency": "EUR"},
        "^STOXX50E": {"name": "Euro Stoxx 50", "region": "EU", "currency": "EUR"},
        "^VIX":   {"name": "VIX",           "region": "US",    "currency": "USD"},
    },
}

# ── 2. Universe tier (S&P 500 + 추가 인기 종목) ───────

# S&P 500은 동적으로 가져옴 (Wikipedia)
# 동적 fetch 실패 시 fallback 정적 리스트 (50개 정도)
SP500_FALLBACK = [
    "MMM","AOS","ABT","ABBV","ACN","ADBE","AMD","AES","AFL","A","APD","ABNB","AKAM","ALB","ARE","ALGN","ALLE","LNT","ALL","GOOGL","GOOG","MO","AMZN","AMCR","AEE","AEP","AXP","AIG","AMT","AWK","AMP","AME","AMGN","APH","ADI","ANSS","AON","APA","APO","AAPL","AMAT","APTV","ACGL","ADM","ANET","AJG","AIZ","T","ATO","ADSK","ADP","AZO","AVB","AVY","AXON","BKR","BALL","BAC","BAX","BDX","BRK-B","BBY","TECH","BIIB","BLK","BX","BK","BA","BKNG","BSX","BMY","AVGO","BR","BRO","BF-B","BLDR","BG","BXP","CHRW","CDNS","CZR","CPT","CPB","COF","CAH","KMX","CCL","CARR","CAT","CBOE","CBRE","CDW","COR","CNC","CNP","CF","CRL","SCHW","CHTR","CVX","CMG","CB","CHD","CI","CINF","CTAS","CSCO","C","CFG","CLX","CME","CMS","KO","CTSH","COIN","CL","CMCSA","CAG","COP","ED","STZ","CEG","COO","CPRT","GLW","CPAY","CTVA","CSGP","COST","CTRA","CRWD","CCI","CSX","CMI","CVS","DHR","DRI","DVA","DAY","DECK","DE","DELL","DAL","DVN","DXCM","FANG","DLR","DFS","DG","DLTR","D","DPZ","DASH","DOV","DOW","DHI","DTE","DUK","DD","EMN","ETN","EBAY","ECL","EIX","EW","EA","ELV","EMR","ENPH","ETR","EOG","EPAM","EQT","EFX","EQIX","EQR","ERIE","ESS","EL","EG","EVRG","ES","EXC","EXE","EXPE","EXPD","EXR","XOM","FFIV","FDS","FICO","FAST","FRT","FDX","FIS","FITB","FSLR","FE","FI","F","FTNT","FTV","FOXA","FOX","BEN","FCX","GRMN","IT","GE","GEHC","GEV","GEN","GNRC","GD","GIS","GM","GPC","GILD","GPN","GL","GDDY","GS","HAL","HIG","HAS","HCA","DOC","HSIC","HSY","HES","HPE","HLT","HOLX","HD","HON","HRL","HST","HWM","HPQ","HUBB","HUM","HBAN","HII","IBM","IEX","IDXX","ITW","INCY","IR","PODD","INTC","ICE","IFF","IP","IPG","INTU","ISRG","IVZ","INVH","IQV","IRM","JBHT","JBL","JKHY","J","JNJ","JCI","JPM","K","KVUE","KDP","KEY","KEYS","KMB","KIM","KMI","KKR","KLAC","KHC","KR","LHX","LH","LRCX","LW","LVS","LDOS","LEN","LII","LLY","LIN","LYV","LKQ","LMT","L","LOW","LULU","LYB","MTB","MPC","MKTX","MAR","MMC","MLM","MAS","MA","MTCH","MKC","MCD","MCK","MDT","MRK","META","MET","MTD","MGM","MCHP","MU","MSFT","MAA","MRNA","MHK","MOH","TAP","MDLZ","MPWR","MNST","MCO","MS","MOS","MSI","MSCI","NDAQ","NTAP","NFLX","NEM","NWSA","NWS","NEE","NKE","NI","NDSN","NSC","NTRS","NOC","NCLH","NRG","NUE","NVDA","NVR","NXPI","ORLY","OXY","ODFL","OMC","ON","OKE","ORCL","OTIS","PCAR","PKG","PLTR","PANW","PARA","PH","PAYX","PAYC","PYPL","PNR","PEP","PFE","PCG","PM","PSX","PNW","PNC","POOL","PPG","PPL","PFG","PG","PGR","PLD","PRU","PEG","PTC","PSA","PHM","PWR","QCOM","DGX","RL","RJF","RTX","O","REG","REGN","RF","RSG","RMD","RVTY","ROK","ROL","ROP","ROST","RCL","SPGI","CRM","SBAC","SLB","STX","SRE","NOW","SHW","SPG","SWKS","SJM","SW","SNA","SOLV","SO","LUV","SWK","SBUX","STT","STLD","STE","SYK","SMCI","SYF","SNPS","SYY","TMUS","TROW","TTWO","TPR","TRGP","TGT","TEL","TDY","TFX","TER","TSLA","TXN","TPL","TXT","TMO","TJX","TKO","TSCO","TT","TDG","TRV","TRMB","TFC","TYL","TSN","USB","UBER","UDR","ULTA","UNP","UAL","UPS","URI","UNH","UHS","VLO","VTR","VLTO","VRSN","VRSK","VZ","VRTX","VTRS","V","VST","VMC","WRB","GWW","WAB","WBA","WMT","DIS","WBD","WM","WAT","WEC","WFC","WELL","WST","WDC","WY","WSM","WMB","WTW","WDAY","WYNN","XEL","XYL","YUM","ZBRA","ZBH","ZTS",
]

UNIVERSE_EXTRA_ETFS = [
    "VOO","IVV","VEA","VWO","EFA","EEM","AGG","BND","TLT","IEF",
    "SHY","LQD","HYG","JNK","TIP","MBB","XLK","XLE","XLV","XLF",
]

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
            if close != close:
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


def closes_only(df) -> dict:
    """Universe tier용 - 날짜별 close만"""
    dates, closes = [], []
    for date, row in df.iterrows():
        try:
            close = float(row["Close"])
            if close != close:
                continue
            dates.append(date.strftime("%Y-%m-%d"))
            closes.append(round(close, 4))
        except (ValueError, KeyError):
            continue
    return {"dates": dates, "closes": closes}


def calc_metrics(closes: list[float]) -> dict:
    """사전 계산 지표 - Universe용"""
    if len(closes) < 30:
        return {}
    n = len(closes)
    ret = closes[-1] / closes[0] - 1
    ann_ret = (1 + ret) ** (252 / n) - 1

    drs = [closes[i] / closes[i-1] - 1 for i in range(1, n)]
    mean = sum(drs) / len(drs)
    var = sum((r - mean) ** 2 for r in drs) / (len(drs) - 1)
    vol = math.sqrt(var) * math.sqrt(252)

    peak = closes[0]
    mdd = 0.0
    for c in closes:
        if c > peak:
            peak = c
        dd = (c - peak) / peak
        if dd < mdd:
            mdd = dd

    sharpe = 0.0 if vol == 0 else (ann_ret - 0.04) / vol

    return {
        "return1Y": round(ret, 4),
        "annReturn": round(ann_ret, 4),
        "volatility": round(vol, 4),
        "sharpe": round(sharpe, 4),
        "mdd": round(mdd, 4),
        "currentPrice": round(closes[-1], 4),
        "dataPoints": n,
    }


def save_json(data, filename: str):
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"  OK {filename} ({os.path.getsize(path) / 1024:.1f} KB)")


def save_json_compact(data, filename: str):
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  OK {filename} ({os.path.getsize(path) / 1024:.1f} KB)")


# ── 1. Detail tier 수집 ──────────────────────────────

def collect_detail_assets():
    print("\n[1/5] Detail tier - full OHLCV...")
    result = []

    for asset_type, tickers in DETAIL_ASSETS.items():
        print(f"\n  -- {asset_type} ({len(tickers)} tickers) --")
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
                    continue

                meta = tickers[ticker]
                result.append({
                    "ticker": ticker,
                    "name": meta.get("name", ticker),
                    "assetType": asset_type,
                    "currency": meta.get("currency", "USD"),
                    "data": records,
                    "metadata": {k: v for k, v in meta.items() if k not in ("name", "currency")},
                })
            except Exception as e:
                print(f"    WARN {ticker}: {e}")
        print(f"    -> {len([r for r in result if r['assetType'] == asset_type])} assets")

    save_json(result, "assets.json")
    return result


# ── 2. ETF 메타데이터 ────────────────────────────────

def collect_etf_metadata(assets):
    print("\n[2/5] ETF metadata...")
    result = []
    spdr_etfs = [a for a in assets if a["assetType"] == "equity_etf"
                 and a["ticker"] not in ("SPY", "QQQ", "DIA", "IWM", "VTI")]

    for etf in spdr_etfs:
        ticker = etf["ticker"]
        try:
            tk = yf.Ticker(ticker)
            info = tk.info
            fd = tk.funds_data
            top = fd.top_holdings

            holdings = [{
                "symbol": sym,
                "name": row.get("Name", sym),
                "weight": round(float(row["Holding Percent"]), 6),
            } for sym, row in top.head(10).iterrows()]

            sw = fd.sector_weightings

            result.append({
                "ticker": ticker,
                "name": info.get("shortName", ticker),
                "sector": etf["metadata"].get("sector", ""),
                "expenseRatio": info.get("netExpenseRatio", 0.0008),
                "topHoldings": holdings,
                "sectorWeightings": {k: round(v, 6) for k, v in sw.items()},
            })
        except Exception as e:
            print(f"  WARN {ticker}: {e}")

    save_json(result, "etf-metadata.json")
    return result


# ── 3. Universe tier - S&P 500 + 인기 ETF ────────────

def get_sp500_tickers() -> list[str]:
    """Wikipedia에서 S&P 500 리스트 가져오기 (실패 시 fallback)"""
    try:
        df = pd.read_html("https://en.wikipedia.org/wiki/List_of_S%26P_500_companies")[0]
        tickers = df["Symbol"].tolist()
        # yfinance는 BRK.B 같은 점을 BRK-B로 표기
        tickers = [t.replace(".", "-") for t in tickers]
        print(f"  Fetched {len(tickers)} S&P 500 tickers from Wikipedia")
        return tickers
    except Exception as e:
        print(f"  WARN Wikipedia fetch failed ({e}), using fallback ({len(SP500_FALLBACK)} tickers)")
        return SP500_FALLBACK


def collect_universe():
    print("\n[3/5] Universe tier - pre-computed metrics...")
    sp500 = get_sp500_tickers()
    all_tickers = sorted(set(sp500 + UNIVERSE_EXTRA_ETFS))

    print(f"  target: {len(all_tickers)} tickers")

    # 배치 다운로드 (큰 리스트는 yfinance가 자동 분할)
    df = yf.download(all_tickers, period=PERIOD, progress=False, auto_adjust=False, threads=True)

    universe = []
    for ticker in all_tickers:
        try:
            if len(all_tickers) > 1:
                close_series = df["Close"][ticker].dropna()
            else:
                close_series = df["Close"].dropna()
            closes = close_series.tolist()
            if len(closes) < 30:
                continue
            metrics = calc_metrics(closes)
            if not metrics:
                continue

            universe.append({
                "ticker": ticker,
                "name": ticker,  # name은 별도 추가 안 함 (속도)
                "assetType": "equity_etf",
                "metrics": metrics,
            })
        except Exception:
            continue

    print(f"  collected: {len(universe)} assets")
    save_json_compact(universe, "universe.json")
    return universe


# ── 4. 개별 종목 (ETF 구성종목) ──────────────────────

def collect_holdings_stocks(metadata):
    print("\n[4/5] ETF holdings stocks (full OHLCV)...")
    all_tickers = set()
    ticker_sector_map = {}
    for etf in metadata:
        for h in etf["topHoldings"][:TOP_N_HOLDINGS]:
            sym = h["symbol"]
            all_tickers.add(sym)
            ticker_sector_map[sym] = etf["sector"]

    tickers = sorted(all_tickers)
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
        except Exception:
            continue

    print(f"  collected: {len(result)} stocks")
    save_json(result, "stocks.json")


# ── 5. 메타 ──────────────────────────────────────────

def save_meta(detail_count, universe_count):
    print("\n[5/5] Metadata...")
    summary = {
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
        "tiers": {
            "detail": {
                "count": detail_count,
                "format": "full OHLCV",
                "purpose": "charts, deep analysis pages",
            },
            "universe": {
                "count": universe_count,
                "format": "pre-computed metrics only",
                "purpose": "screening, bulk tables, S&P 500 coverage",
            },
        },
        "assetClasses": list(DETAIL_ASSETS.keys()),
        "totalAssets": detail_count + universe_count,
        "period": PERIOD,
    }
    save_json(summary, "meta.json")


# ── main ─────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Multi-Asset Data Collection (yfinance)")
    print("Two-tier: detail (~80) + universe (~520)")
    print("=" * 60)

    ensure_dir(OUTPUT_DIR)

    detail = collect_detail_assets()
    metadata = collect_etf_metadata(detail)
    universe = collect_universe()
    collect_holdings_stocks(metadata)
    save_meta(len(detail), len(universe))

    print("\n" + "=" * 60)
    print(f"Done! detail={len(detail)} universe={len(universe)} total={len(detail) + len(universe)}")
    print(f"Output: {os.path.abspath(OUTPUT_DIR)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
