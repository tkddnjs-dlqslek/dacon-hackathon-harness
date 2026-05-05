import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono, Noto_Sans_KR } from "next/font/google";
import Header from "@/components/layout/Header";
import WelcomeTour from "@/components/ui/WelcomeTour";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Multi-Asset Investment Analytics",
  description: "Skills 기반 범용 투자 데이터 분석 시스템 — 6개 자산 클래스 지원",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${inter.variable} ${ibmPlexMono.variable} ${notoSansKR.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}>
        <WelcomeTour />
        <Header />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6">
          {children}
        </main>
        <footer className="border-t px-6 py-3 text-center text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          Data: yfinance (API key not required)
        </footer>
      </body>
    </html>
  );
}
