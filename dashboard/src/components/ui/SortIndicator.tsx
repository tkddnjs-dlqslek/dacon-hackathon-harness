import type { SortDirection } from "@/lib/use-sort";

export function SortIndicator({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <span className="text-gray-700">↕</span>;
  return <span className="text-blue-400">{direction === "asc" ? "↑" : "↓"}</span>;
}
