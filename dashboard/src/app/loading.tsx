export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded bg-gray-800" />
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="min-w-[260px] rounded-lg border border-gray-800 bg-gray-900 p-4">
            <div className="h-4 w-16 rounded bg-gray-700" />
            <div className="mt-2 h-3 w-full rounded bg-gray-800" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="h-3 w-20 rounded bg-gray-700" />
              <div className="mt-2 h-8 w-24 rounded bg-gray-800" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="h-[280px] rounded bg-gray-800" />
        </div>
      </div>
      <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
        <div className="h-[300px] rounded bg-gray-800" />
      </div>
    </div>
  );
}
