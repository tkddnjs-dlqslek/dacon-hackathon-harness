"use client";

// 첫 방문 가이드 투어 — localStorage로 1회만 표시

import { useState, useEffect } from "react";

const STORAGE_KEY = "welcome_tour_seen_v1";

const STEPS = [
  {
    title: "👋 멀티 에셋 투자 분석에 오신 것을 환영합니다",
    content: "Skills.md 규칙 기반으로 자동 동작하는 범용 투자 분석 시스템입니다. 6개 자산 클래스(주식·채권·외환·원자재·암호화폐·지수)를 한 화면에서 다룹니다.",
  },
  {
    title: "📊 메인 대시보드",
    content: "자산 클래스 필터, 크로스 에셋 상관관계, S&P 500 유니버스 등을 한눈에 봅니다. 우측 상단 기간 버튼으로 1개월~전체까지 조정 가능합니다.",
  },
  {
    title: "💬 자연어 질문",
    content: "\"기술주 중 변동성 가장 낮은 5개\" 같은 한국어 질문에 즉시 답합니다. 패턴 매칭 엔진으로 외부 API 키 불필요.",
  },
  {
    title: "🔍 종목 검색",
    content: "전 세계 어떤 종목이든 검색 → 관심종목 추가 → 즉시 분석. yahoo-finance2 실시간 어댑터로 사전 수집 없이 동작합니다.",
  },
  {
    title: "📊 리포트",
    content: "지난 1년 시장 요약 보고서를 자동 생성합니다. 시장 레짐 판단, 톱5 상승/하락, 위험 자산 분석까지.",
  },
];

export default function WelcomeTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setOpen(true);
  }, []);

  const close = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else close();
  };

  const prev = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs text-gray-500">{step + 1} / {STEPS.length}</span>
          <button onClick={close} className="text-xs text-gray-500 hover:text-white">건너뛰기</button>
        </div>
        <h2 className="text-xl font-bold text-white">{current.title}</h2>
        <p className="mt-3 text-sm text-gray-300 leading-relaxed">{current.content}</p>
        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === step ? "bg-blue-500 w-4" : "bg-gray-700"} transition-all`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <button onClick={prev} className="rounded bg-gray-800 px-4 py-1.5 text-sm text-gray-300 hover:text-white">
                이전
              </button>
            )}
            <button onClick={next} className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-500">
              {isLast ? "시작하기" : "다음"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
