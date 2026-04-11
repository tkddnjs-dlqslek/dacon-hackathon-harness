# Frontend Conventions

## Stack
- Next.js 14+ (App Router)
- TypeScript strict
- Tailwind CSS
- Recharts (차트)

## File Structure
```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx              # 메인 대시보드
│   ├── portfolio/page.tsx
│   ├── compare/page.tsx       # ETF vs 직접투자 비교
│   └── sector/[id]/page.tsx
├── components/
│   ├── charts/               # 차트 컴포넌트
│   ├── cards/                # 메트릭 카드, 인사이트 카드
│   ├── layout/               # Header, Nav, Footer
│   └── ui/                   # 공통 UI (Button, Skeleton 등)
├── lib/
│   ├── analysis-engine.ts    # skills/data-analysis.md 구현
│   ├── chart-selector.ts     # skills/visualization.md 구현
│   ├── insight-generator.ts  # skills/insight-generation.md 구현
│   └── data-loader.ts        # 데이터 로딩/파싱
└── types/
    └── index.ts              # 공통 타입 정의
```

## Naming
- 컴포넌트: PascalCase (e.g., `SectorChart.tsx`)
- 유틸/lib: camelCase (e.g., `analysisEngine.ts`)
- CSS: Tailwind utility classes only

## Theme
- 다크모드 기본 (투자 대시보드 관행)
- 라이트모드 토글 지원
- 색상: `skills/visualization.md §2.1` 참조
