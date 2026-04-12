// 재무제표 분석 페이지 (/fundamentals)
//
// 데이터 구조: 시계열이 아닌 단면(snapshot) 데이터
// data-schema.md "데이터 구조가 매번 다르고" 정면 데모

import { loadFundamentals } from "@/lib/load-server-data";
import FundamentalsClient from "@/components/fundamentals/FundamentalsClient";

export default async function FundamentalsPage() {
  const data = await loadFundamentals();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">재무제표 분석 (Fundamentals)</h1>
        <p className="mt-1 text-sm text-gray-500">
          {data.length}개 종목의 재무 단면 데이터 — PER, PBR, ROE, 시가총액, 배당수익률, 부채비율 등
        </p>
        <p className="mt-1 text-xs text-gray-600">
          ※ 이 페이지는 가격 시계열이 아닌 <span className="text-blue-400">단면(snapshot) 데이터</span>를 다룹니다.
          Skills 기반 시스템이 다른 형식의 데이터도 동일한 어댑터 패턴으로 처리할 수 있음을 보여줍니다.
        </p>
      </div>
      <FundamentalsClient data={data} />
    </div>
  );
}
