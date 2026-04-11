# Architecture

## Tech Stack
| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 14+ (App Router) | SSR/SSG, API Routes, Vercel 최적 |
| Language | TypeScript | 타입 안정성 |
| Styling | Tailwind CSS | 빠른 UI 구축 |
| Charts | Recharts | React 네이티브, 선언적 API |
| Data Fetching | yfinance (Python) → JSON | 무료, 키 불필요 |
| State | React hooks + Context | 단순한 상태 관리 |
| Deploy | Vercel | 무료 tier, 외부 접속 가능 |

## System Architecture

```
┌─────────────────────────────────────┐
│           Vercel (Production)        │
├─────────────────────────────────────┤
│                                     │
│  Next.js App                        │
│  ├── /app (pages)                   │
│  │   ├── / (Dashboard Home)         │
│  │   ├── /portfolio                 │
│  │   ├── /compare                  │
│  │   └── /sector/[id]              │
│  │                                  │
│  ├── /api (API Routes)              │
│  │   ├── /api/etf-data             │
│  │   ├── /api/analysis             │
│  │   └── /api/portfolio            │
│  │                                  │
│  └── /lib (Business Logic)          │
│      ├── data-loader.ts            │
│      ├── analysis-engine.ts  ←── skills/ 규칙 반영
│      ├── insight-generator.ts ←── skills/ 규칙 반영
│      └── chart-selector.ts   ←── skills/ 규칙 반영
│                                     │
├─────────────────────────────────────┤
│  Data Layer                         │
│  ├── /data/etfs.json (정적 ETF 메타)│
│  ├── /data/sectors.json             │
│  └── API: yfinance or fallback JSON │
└─────────────────────────────────────┘
```

## Data Flow
1. **데이터 수집**: yfinance Python 스크립트로 ETF 데이터 수집 → JSON 저장
2. **데이터 로딩**: Next.js API Route에서 JSON 읽기 또는 런타임 fetch
3. **분석 엔진**: `skills/data-analysis.md` 규칙 기반으로 지표 계산
4. **차트 선택**: `skills/visualization.md` 규칙에 따라 데이터 특성별 차트 유형 결정
5. **인사이트 생성**: `skills/insight-generation.md` 규칙으로 자동 코멘트 생성
6. **렌더링**: 대시보드 UI에 차트 + 인사이트 표시

## Key Design Decisions
- **정적 JSON fallback**: yfinance API 실패 시에도 대시보드가 동작하도록 정적 데이터 보유
- **Skills 규칙 → 코드 매핑**: analysis-engine.ts, chart-selector.ts, insight-generator.ts가 skills/ 문서의 규칙을 1:1로 구현
- **섹터 기반 구조**: 섹터(Tech/Energy/Healthcare 등)가 1차 분류 축, ETF가 2차
