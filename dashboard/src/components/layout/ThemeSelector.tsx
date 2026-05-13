"use client";

// 3 테마 셀렉터 — 라이트 채도 / Bloomberg 다크 / Navy 다크
// localStorage 영속 + html[data-theme] 속성 토글
// 우상단에 작은 칩으로 배치

import { useEffect, useState } from "react";

type Theme = "light" | "bloomberg" | "navy";

const THEMES: { id: Theme; label: string; emoji: string; description: string }[] = [
  { id: "light", label: "라이트", emoji: "☀", description: "기본 라이트 테마 (채도 강화)" },
  { id: "bloomberg", label: "Bloomberg", emoji: "▮", description: "Bloomberg Terminal 풍 다크" },
  { id: "navy", label: "Navy", emoji: "◆", description: "금융 클래식 네이비 + 골드" },
];

const STORAGE_KEY = "marketlens_theme_v1";

function applyTheme(theme: Theme) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export default function ThemeSelector() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = (typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEY)
      : null) as Theme | null;
    const initial: Theme = saved && ["light", "bloomberg", "navy"].includes(saved) ? saved : "light";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const handleChange = (next: Theme) => {
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="flex items-center gap-1" role="group" aria-label="테마 선택">
      {THEMES.map((t) => (
        <button
          key={t.id}
          onClick={() => handleChange(t.id)}
          data-active={theme === t.id}
          title={t.description}
          className="theme-chip"
          aria-pressed={theme === t.id}
        >
          <span aria-hidden>{t.emoji}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}
