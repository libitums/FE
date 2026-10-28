# Story 시작 화면 · 전화 막간 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 캡처(`performance:capture`)를 돌리지 않았습니다.
- 기능 PR: Story 노드 바로 시작 · 시작 화면 Skip · Start · 분석 이벤트 · 전화 막간 화면 · 노드 아이콘 변경(이 보고서와 같은 PR)
- 대상 commit: `feat/content-level-manifest` 위의 `feat/story-call-screen`
- 기기: 기능 확인용 iPhone 17 Pro 시뮬레이터 Debug 실행만 — 성능 측정용 실행은 하지 않았습니다.
- OS: iOS 26.5(기능 확인만)
- Lynx SDK: 4.0.1
- 빌드: `pnpm verify`의 production 번들(`.env.local` 없음)

## 시나리오

- 없음. 전화 화면은 대사마다 한 줄을 다시 그리고 타이머 하나 · 1초 시계 하나를 겁니다.

## 이 변경이 무엇을 건드렸나

- episode-core `episode-content.interlude-call.ts`, 앱 `screens/story-intro/*` · `screens/story-call/*` · `CatalogStoryFlow` · `catalog-story-wiring.ts`(이벤트) · 맵 노드 아이콘 · 바로 시작, ui-lynx `SpecialUnit` `icon`.

## 분석 결과

| 번들 | 크기 |
| --- | --- |
| `main.lynx.bundle` | 2,911.1 kB / 상한 3,080.0 kB(`pnpm size:check` 통과, 앞 브랜치 2,872.3 kB 대비 +38.8 kB — 전화 아이콘 셋 · 대사 소리 포함) |
| `packages/ui-lynx/dist` | 554.3 kB / 상한 556.0 kB |

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- **미측정 기록입니다.** 측정 한계: 통화 화면의 대사 교체 · 1초 시계 갱신 · 시작 화면 진입의 프레임 시간 · 메모리를 재지 않아 영향은 아직 판정할 수 없습니다. 물결 애니메이션은 CSS뿐입니다.

## 결론과 후속

- 미측정이며 이 기록은 성능 판정이 아닙니다.
- 후속: 기기에서 통화 화면의 대사 교체 프레임을 재 봅니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
