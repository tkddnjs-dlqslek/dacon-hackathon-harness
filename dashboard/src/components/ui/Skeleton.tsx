// 로딩 스켈레톤 - 통일된 컴포넌트

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-800 ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-8 w-24" />
    </div>
  );
}

export function SkeletonChart({ height = 300 }: { height?: number }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <Skeleton className="mb-3 h-5 w-40" />
      <Skeleton className={`w-full`} />
      <div style={{ height }} className="animate-pulse rounded bg-gray-800" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <Skeleton className="mb-4 h-5 w-32" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <SkeletonChart />
      <SkeletonTable />
    </div>
  );
}
