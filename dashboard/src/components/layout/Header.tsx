"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "대시보드", href: "/" },
  { label: "섹터", href: "/sector/technology" },
  { label: "포트폴리오", href: "/portfolio" },
  { label: "ETF vs 직접투자", href: "/compare" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="border-b border-gray-800 bg-gray-950 px-6 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <Link href="/" className="text-lg font-bold text-white">
          Sector ETF Dashboard
        </Link>
        <nav className="flex gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? "bg-gray-800 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
