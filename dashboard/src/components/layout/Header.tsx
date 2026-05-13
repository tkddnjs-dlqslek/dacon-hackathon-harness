"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import ThemeSelector from "./ThemeSelector";

const ASSET_CLASSES = [
  { label: "주식 / ETF", slug: "stocks", color: "#3B82F6" },
  { label: "채권 / 금리", slug: "bonds", color: "#10B981" },
  { label: "외환 (FX)", slug: "fx", color: "#F59E0B" },
  { label: "원자재", slug: "commodities", color: "#F97316" },
  { label: "암호화폐", slug: "crypto", color: "#8B5CF6" },
  { label: "시장 지수", slug: "indices", color: "#6B7280" },
];

const SECTORS = [
  { label: "기술", slug: "technology" },
  { label: "에너지", slug: "energy" },
  { label: "헬스케어", slug: "healthcare" },
  { label: "금융", slug: "financials" },
  { label: "임의소비재", slug: "consumer-disc" },
  { label: "산업재", slug: "industrials" },
  { label: "부동산", slug: "real-estate" },
  { label: "유틸리티", slug: "utilities" },
  { label: "필수소비재", slug: "consumer-staples" },
  { label: "소재", slug: "materials" },
  { label: "통신", slug: "communication" },
];

export default function Header() {
  const pathname = usePathname();
  const [sectorOpen, setSectorOpen] = useState(false);
  const [classOpen, setClassOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const isSector = pathname.startsWith("/sector");
  const isAssetClass = pathname.startsWith("/asset-class");

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="border-b px-4 py-3 md:px-6" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
      <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-base font-bold md:text-lg" style={{ color: "var(--text-primary)" }}>
            멀티 에셋 투자 분석
          </Link>
          <ThemeSelector />
        </div>
        <nav className="flex flex-wrap items-center gap-1">
          <Link href="/demo" className={`rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === "/demo" ? "bg-purple-600 text-white" : "text-gray-600 hover:text-gray-900"}`}>
            🎯 둘러보기
          </Link>
          <Link href="/" className={`rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === "/" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"}`}>
            대시보드
          </Link>

          {/* 자산 클래스 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => { setClassOpen(!classOpen); setSectorOpen(false); }}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${isAssetClass ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"}`}
            >
              자산 클래스 ▾
            </button>
            {classOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-gray-200 bg-gray-50 py-1 shadow-xl">
                {ASSET_CLASSES.map((c) => (
                  <Link
                    key={c.slug}
                    href={`/asset-class/${c.slug}`}
                    onClick={() => setClassOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${pathname === `/asset-class/${c.slug}` ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
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
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${isSector ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"}`}
            >
              섹터 ▾
            </button>
            {sectorOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-gray-50 py-1 shadow-xl">
                {SECTORS.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/sector/${s.slug}`}
                    onClick={() => setSectorOpen(false)}
                    className={`block px-4 py-2 text-sm transition-colors ${pathname === `/sector/${s.slug}` ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}`}
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/portfolio" className={`rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === "/portfolio" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"}`}>
            포트폴리오
          </Link>
          <Link href="/compare" className={`rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === "/compare" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"}`}>
            ETF vs 직접
          </Link>
          <Link href="/multi-compare" className={`rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === "/multi-compare" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"}`}>
            자산 비교
          </Link>
          <Link href="/ask" className={`rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === "/ask" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"}`}>
            💬 질문
          </Link>
          <Link href="/search" className={`rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === "/search" ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"}`}>
            🔍 검색
          </Link>

          {/* 더보기 — 덜 자주 쓰는 기능 묶기 */}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${["/fundamentals", "/report"].includes(pathname) ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:text-gray-900"}`}
            >
              ··· 더보기
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full z-50 mt-1 w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-xl">
                <Link href="/fundamentals" onClick={() => setMoreOpen(false)}
                  className={`block px-4 py-2 text-sm transition-colors ${pathname === "/fundamentals" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}>
                  💰 재무제표
                </Link>
                <Link href="/report" onClick={() => setMoreOpen(false)}
                  className={`block px-4 py-2 text-sm transition-colors ${pathname === "/report" ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-50"}`}>
                  📊 리포트
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
