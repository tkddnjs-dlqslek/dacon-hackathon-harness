"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const SECTORS = [
  { label: "Technology", slug: "technology" },
  { label: "Energy", slug: "energy" },
  { label: "Healthcare", slug: "healthcare" },
  { label: "Financials", slug: "financials" },
  { label: "Consumer Disc.", slug: "consumer-disc" },
  { label: "Industrials", slug: "industrials" },
  { label: "Real Estate", slug: "real-estate" },
  { label: "Utilities", slug: "utilities" },
  { label: "Consumer Staples", slug: "consumer-staples" },
  { label: "Materials", slug: "materials" },
  { label: "Communication", slug: "communication" },
];

export default function Header() {
  const pathname = usePathname();
  const [sectorOpen, setSectorOpen] = useState(false);

  const isSector = pathname.startsWith("/sector");

  return (
    <header className="border-b border-gray-800 bg-gray-950 px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="text-lg font-bold text-white">
          Sector ETF Dashboard
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/" className={`rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === "/" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}>
            Dashboard
          </Link>

          {/* 섹터 드롭다운 */}
          <div className="relative">
            <button
              onClick={() => setSectorOpen(!sectorOpen)}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${isSector ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}
            >
              Sectors ▾
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
            Portfolio
          </Link>
          <Link href="/compare" className={`rounded-md px-3 py-1.5 text-sm transition-colors ${pathname === "/compare" ? "bg-gray-800 text-white" : "text-gray-400 hover:text-white"}`}>
            Compare
          </Link>
        </nav>
      </div>
    </header>
  );
}
