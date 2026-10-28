# 막간(INT) 이야기 유닛 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다.
- 기능 PR: 막간 스텝을 해석해 맵의 스페셜 Story 노드와 표지 컷 화면으로 그리고, 앱 콘텐츠 수준을 2로 올리는 변경(이 보고서와 같은 PR)
- 대상 commit: `main` 위의 `feat/content-level-manifest`
- 기기: 기능 확인용 iPhone 17 Pro 시뮬레이터 Debug 실행만 — 성능 측정용 실행은 하지 않았습니다.
- OS: iOS 26.5(기능 확인만)
- Lynx SDK: 4.0.1
- 빌드: `pnpm verify`의 production 번들(`.env.local` 없음)

## 시나리오

- 없음. 맵 구획 파생에 이야기 키 판정이 하나 늘고, 새 route가 기존 컷 화면을 다시 씁니다.

## 이 변경이 무엇을 건드렸나

- episode-core `episode-content.interlude.ts`(막간 정규화), 앱 `catalog-map-story.ts` · `catalog-story.ts` · `catalog-story-wiring.ts` · `render-catalog-story.tsx`, 맵 노드 · 레슨 번호 · 완료 키 · 티켓 판정.

## 분석 결과

| 번들 | 크기 |
| --- | --- |
| `main.lynx.bundle` | 2,837.2 kB / 상한 3,080.0 kB(`pnpm size:check` 통과) |

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** 측정 한계: 맵 렌더 · 컷 화면 진입 시간을 재지 않아 영향은 아직 판정할 수 없습니다. 맵 파생에 배열 판정이 몇 번 늘 뿐이라 작을 것으로 보지만 근거가 아닙니다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: 다음 기기 측정 때 맵 렌더 시간을 이전 보고서와 견줍니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
