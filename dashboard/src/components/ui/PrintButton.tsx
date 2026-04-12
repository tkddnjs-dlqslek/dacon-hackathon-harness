"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500 print:hidden"
    >
      🖨 인쇄
    </button>
  );
}
