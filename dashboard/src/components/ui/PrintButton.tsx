"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded bg-gray-900 text-white px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 print:hidden"
    >
      🖨 인쇄
    </button>
  );
}
