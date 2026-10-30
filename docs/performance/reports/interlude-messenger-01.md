# 문자 막간 메신저 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다.
- 기능 PR: 문자 막간을 시간 표시 화면 + 메신저(답장 바텀 시트 · 분기)로 그리는 변경(이 보고서와 같은 PR)
- 대상 commit: `main` 위의 `feat/content-level-manifest`
- 기기: 기능 확인용 iPhone 17 Pro 시뮬레이터 Debug 실행만 — 성능 측정용 실행은 하지 않았습니다.
- OS: iOS 26.5(기능 확인만)
- Lynx SDK: 4.0.1
- 빌드: `pnpm verify`의 production 번들(`.env.local` 없음)

## 시나리오

- 없음. 새 화면 하나가 메시지마다 다시 그려지고 타이머 하나를 겁니다.

## 이 변경이 무엇을 건드렸나

- episode-core `episode-content.interlude-chat.ts`, 앱 `screens/story-messenger/*`(순수 진행 계산 · 시계 훅 · 화면 · CSS), `catalog-story.ts` · `render-catalog-story.tsx`, 상태 표시줄 등록부.

## 분석 결과

| 번들 | 크기 |
| --- | --- |
| `main.lynx.bundle` | 2,867.4 kB / 상한 3,080.0 kB(`pnpm size:check` 통과, 막간 PR 2,837.2 kB 대비 +30.2 kB) |

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** 측정 한계: 메시지가 늘 때마다 기록 전체를 다시 계산(`storyChatProgressOf`, 턴 십여 개)하고 다시 그리지만 프레임 시간 · 메모리를 재지 않아 영향은 아직 판정할 수 없습니다. 입력 중 점 애니메이션은 CSS뿐입니다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: 기기에서 긴 대화(u04, 턴 13)의 스크롤 · 프레임을 재 봅니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
