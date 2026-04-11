# Plans

## Current Phase: Phase 2 — 핵심 구현

## Phases Overview
| Phase | 내용 | 기한 |
|-------|------|------|
| 1 | 기획서 + Skills.md 초안 | ~4/30 |
| 2 | Skills.md 정교화 + 핵심 기능 구현 | ~5/7 |
| 3 | 대시보드 완성 + 배포 | ~5/14 |

---

## TODO

### Phase 1: 기획 & 설계
- [x] 데이터 소스 조사 & 확정 (yfinance, 대안 API 비교)
- [x] 섹터별 대표 ETF 목록 정의
- [x] Skills.md 초안 작성 (data-analysis, visualization, insight-generation)
- [x] 대시보드 와이어프레임 설계
- [x] 기획서 초안 작성

### Phase 2: 핵심 구현
- [x] Next.js 프로젝트 scaffolding
- [x] 데이터 수집 스크립트 (yfinance → JSON)
- [x] 분석 엔진 구현 (skills/data-analysis.md 기반)
- [x] 차트 컴포넌트 구현 (skills/visualization.md 기반)
- [x] 인사이트 자동 생성 로직 (skills/insight-generation.md 기반)
- [ ] 포트폴리오 구성 & 리밸런싱 시뮬레이션
- [ ] ETF vs 직접투자 비교 엔진 (skills/data-analysis.md §4 기반)
- [ ] ETF vs 직접투자 비교 페이지 (/compare)
- [ ] 개별종목 데이터 수집 (섹터별 상위 N개)
- [ ] Skills.md v2 — 테스트 후 갭 보완

### Phase 3: 완성 & 배포
- [ ] UI 디자인 완성 (반응형, 다크모드)
- [ ] 범용성 테스트: 다른 ETF 데이터셋으로 동작 확인
- [ ] Vercel 배포 & URL 확인
- [ ] Skills.md 최종본 정리
- [ ] 기획서 PDF 최종 제출
- [ ] GitHub repo 정리 (선택)

---

## In Progress
- [ ] 포트폴리오 구성 & 리밸런싱 시뮬레이션

## Done

### Phase 1 ✅
- [x] Harness 구조 설계
- [x] 기술 스택 확정 (Next.js + Recharts + Vercel)
- [x] 데이터 소스 조사 & 확정 — yfinance 단독, API 키 제로 정책 (2026-04-11)
- [x] 섹터별 대표 ETF 목록 정의 — SPDR 11개 섹터 + SPY 벤치마크 + 개별종목 Top5 확정 (2026-04-11)
- [x] Skills.md 초안 작성 — 5개 파일 완성, 데이터 소스 정합성 보완 (2026-04-11)
- [x] 대시보드 와이어프레임 설계 — 4페이지 상세 레이아웃 + 컴포넌트 매핑 + 인터랙션 흐름 (2026-04-11)
- [x] 기획서 초안 작성 — 8개 섹션, deliverables/proposal-draft.md (2026-04-11)

### Phase 2
- [x] Next.js 프로젝트 scaffolding — 4페이지 + lib 3개 + types, TypeScript 통과 (2026-04-11)
- [x] 데이터 수집 스크립트 — collect.py, 12 ETF + 55 종목 + 메타데이터 + ^IRX, 총 6MB (2026-04-11)
- [x] 분석 엔진 구현 — §1~§4 전체: 결측치/베타/상관행렬/공분산/리밸런싱/ETF vs 직접투자 + 메인 페이지 실데이터 연결, 빌드 통과 (2026-04-11)
- [x] 차트 컴포넌트 구현 — Recharts 5종(CumulativeReturn, SectorBar, SectorDonut, DualLine, GroupedBar) + 메인 페이지 연결 (2026-04-11)
- [x] 인사이트 자동 생성 — §2~§5 전체 구현, 메인+섹터 페이지 실데이터 연결, 섹터 상세 페이지 풀 리빌드 (2026-04-11)
