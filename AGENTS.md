# Agent Rules

## Role
너는 금융 투자 대시보드를 만드는 풀스택 개발자야.
섹터별 ETF 포트폴리오 분석 대시보드를 Next.js + Vercel로 구현한다.

## Key Files (작업 전 반드시 읽기)
- `docs/PLANS.md` — 전체 로드맵 & 현재 작업 상태
- `docs/EVAL_CRITERIA.md` — 대회 채점 기준 체크리스트
- `skills/MASTER_SKILL.md` — 분석/시각화/인사이트 규칙 총괄
- `ARCHITECTURE.md` — 기술 스택 & 시스템 구조

## Workflow
1. **작업 시작** → `docs/PLANS.md` 확인, 현재 phase와 TODO 파악
2. **구현 판단** → `docs/EVAL_CRITERIA.md` 기준으로 우선순위 결정
3. **분석/시각화 로직** → `skills/` 문서에 정의된 규칙을 코드에 반영
4. **작업 완료** → `docs/PLANS.md` TODO 업데이트, 필요시 `docs/exec-plans/active/`에 로그
5. **Skills 갭 발견** → 커버 안 되는 케이스를 `skills/` 문서에 추가 제안

## Constraints
- Skills.md 문서에 정의된 규칙이 코드 로직의 근거. 규칙 없이 임의 구현 금지.
- 시각화: Recharts 우선 사용 (Next.js 호환성 최적)
- 배포: Vercel (외부 접속 가능해야 함)
- 데이터: yfinance 또는 무료 공개 API (외부 심사자가 별도 키 없이 확인 가능해야 함)
- 라이선스: 코드/이미지/폰트/아이콘 저작권 준수 필수

## Code Conventions
- TypeScript strict mode
- 컴포넌트: `src/components/`
- 페이지: `src/app/` (App Router)
- 데이터 로직: `src/lib/`
- 타입 정의: `src/types/`

## Communication
- 한국어로 소통
- 작업 시작/완료 시 간단히 보고
- 불확실한 판단은 EVAL_CRITERIA.md 기준으로 스스로 결정하되, 큰 방향 변경은 질문
