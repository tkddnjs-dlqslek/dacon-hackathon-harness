import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/layout/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sector ETF Dashboard",
  description: "섹터별 ETF 포트폴리오 분석 대시보드 — Skills 기반 자동 생성",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-gray-950 text-gray-100">
        <Header />
        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">
          {children}
        </main>
        <footer className="border-t border-gray-800 px-6 py-3 text-center text-xs text-gray-500">
          Data: yfinance (API key not required)
        </footer>
      </body>
    </html>
  );
}
