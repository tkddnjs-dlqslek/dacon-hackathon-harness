import type { SortDirection } from "@/lib/use-sort";

export function SortIndicator({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) return <span className="text-gray-700">↕</span>;
  return <span className="text-gray-600">{direction === "asc" ? "↑" : "↓"}</span>;
}
