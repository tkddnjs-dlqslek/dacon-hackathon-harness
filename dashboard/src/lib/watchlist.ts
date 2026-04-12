// 관심종목 — localStorage 기반 영속 저장

const STORAGE_KEY = "watchlist_v1";

export interface WatchlistItem {
  symbol: string;
  name: string;
  addedAt: string;
}

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToWatchlist(symbol: string, name: string): WatchlistItem[] {
  const list = getWatchlist();
  if (list.some((w) => w.symbol === symbol)) return list;
  const updated = [...list, { symbol, name, addedAt: new Date().toISOString() }];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function removeFromWatchlist(symbol: string): WatchlistItem[] {
  const list = getWatchlist().filter((w) => w.symbol !== symbol);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return list;
}

export function clearWatchlist() {
  localStorage.removeItem(STORAGE_KEY);
}
