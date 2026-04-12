"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const ASSET_CLASSES = [
  { label: "주식 / ETF", slug: "stocks", color: "#3B82F6" },
  { label: "채권 / 금리 (Bonds)", slug: "bonds", color: "#06B6D4" },
  { label: "외환 (FX)", slug: "fx", color: "#8B5CF6" },
  { label: "원자재 (Commodities)", slug: "commodities", color: "#F59E0B" },
  { label: "암호화폐 (Crypto)", slug: "crypto", color: "#F97316" },
  { label: "시장 지수 (Indices)", slug: "indices", color: "#6B7280" },
];

const SECTORS = [
  { label: "기술 (Technology)", slug: "technology" },
  { label: "에너지 (Energy)", slug: "energy" },
  { label: "헬스케어 (Healthcare)", slug: "healthcare" },
  { label: "금융 (Financials)", slug: "financials" },
  { label: "임의소비재 (Consumer Disc.)", slug: "consumer-disc" },
  { label: "산업재 (Industrials)", slug: "industrials" },
  { label: "부동산 (Real Estate)", slug: "real-estate" },
  { label: "유틸리티 (Utilities)", slug: "utilities" },
  { label: "필수소비재 (Consumer Staples)", slug: "consumer-staples" },
  { label: "소재 (Materials)", slug: "materials" },
  { label: "통신 (Communication)", slug: "communication" },
];

export default function Header() {
  const pathname = usePathname();
  const [sectorOpen, setSectorOpen] = useState(false);
  const [classOpen, setClassOpen] = useState(false);

  const isSector = pathname.startsWith("/sector");
  const isAssetClass = pathname.startsWith("/asset-class");

  return (
    <header className="border-b border-gray-800 bg-gray-950 px-4 py-3 md:px-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Link href="/" className="text-base font-bold text-white md:text-lg">
          멀티 에셋 투자 분석
        </Link>
        <nav className="flex flex-wrap items-center gap-1">
          <Link href="/" className={`rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === "/" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}>
            대시보드
          </Link>

          {/* 자산 클래스 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => { setClassOpen(!classOpen); setSectorOpen(false); }}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${isAssetClass ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}
            >
              자산 클래스 ▾
            </button>
            {classOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl">
                {ASSET_CLASSES.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/asset-class/${c.slug}`}
                    onClick={() => setClassOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${pathname === `/asset-class/${c.slug}` ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"}`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 섹터 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => { setSectorOpen(!sectorOpen); setClassOpen(false); }}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${isSector ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}
            >
              섹터 ▾
            </button>
            {sectorOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl">
                {SECTORS.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/sector/${s.slug}`}
                    onClick={() => setSectorOpen(false)}
                    className={`block px-4 py-2 text-sm transition-colors ${pathname === `/sector/${s.slug}` ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"}`}
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/portfolio" className={`rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === "/portfolio" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}>
            포트폴리오
          </Link>
          <Link href="/compare" className={`rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === "/compare" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}>
            ETF vs 직접
          </Link>
          <Link href="/multi-compare" className={`rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === "/multi-compare" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}>
            자산 비교
          </Link>
          <Link href="/search" className={`rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === "/search" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}>
            🔍 검색
          </Link>
        </nav>
      </div>
    </header>
  );
}
