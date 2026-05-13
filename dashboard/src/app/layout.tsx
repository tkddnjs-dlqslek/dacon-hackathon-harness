import type { Metadata } from "next";
import { IBM_Plex_Mono, Noto_Sans_KR } from "next/font/google";
import Header from "@/components/layout/Header";
import WelcomeTour from "@/components/ui/WelcomeTour";
import "./globals.css";

// 한글 메인 — Noto Sans KR
const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  preload: false,
});

// 숫자·티커 monospace — IBM Plex Mono (Bloomberg 표 정렬 스타일)
const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "MarketLens — Skills 기반 멀티에셋 투자 분석",
  description: "Skills.md 규칙으로 자동 생성되는 범용 투자 대시보드 — 6개 자산 클래스 79+ 종목, 외부 API 키 0개",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${ibmPlexMono.variable} ${notoSansKR.variable} h-full antialiased`}
    >
      <head>
        {/* Pretendard CDN — 한국어 모던 산세리프 */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        <WelcomeTour />
        <Header />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6">
          {children}
        </main>
        <footer className="border-t px-6 py-3 text-center text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          MarketLens · Data: yfinance (API key not required) · 2026
        </footer>
      </body>
    </html>
  );
}
