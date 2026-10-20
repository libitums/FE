# 에피소드 롤플레이 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처를 돌리지 않았다. 롤플레이 목록에 구획이 에피소드 수만큼 늘고(내장 셋), 롤플레이 화면은 연 동안만 선다.
- 기능 PR: 에피소드 롤플레이 — 본편 에피소드마다 롤플레이 하나(미리보기 → 표지 컷 → 최종 테스트 대사를 말로), 끝낸 에피소드만 열림, 진행 · 티켓 없음. 사용자 결정 2026-10-20(ADR-0076).
- 대상 commit: 이 보고서와 같은 PR의 `feat/roleplay-episodes` 브랜치 HEAD
- 기기: 측정 기기 없음(번들 크기만) — 화면 확인은 실기 iPhone · Android에서 한다
- OS: 해당 없음(번들 산출물)
- Lynx SDK: 4.0.1
- 빌드: `pnpm build` 산출 `apps/mobile/dist/main.lynx.bundle`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-10-20

## 시나리오

- 번들 크기: 같은 설정으로 main efbb118c와 이 변경을 각각 빌드해 비교했다.

## 이 변경이 무엇을 건드렸나

- 순수 함수: 판정 · 진행 · 컷 잇기(`screens/roleplay-story/roleplay-story.ts`), 모델 · 구획(`app/roleplay-story-model.ts` · `app/roleplay-sections.ts`).
- 화면: `RoleplayPreviewScreen` · `RoleplayTalkScreen` · `RoleplaySpeakControls` · `roleplay-story-screen.css`. 표지 컷은 기존 `CatalogCoverScreen`을 다시 쓴다.
- 결선: `roleplay-story-wiring.ts` · `RoleplayStoryFlow.tsx` · `render-roleplay-story.tsx`, 롤플레이 카드 둘째 줄.
- 의존성 · 이미지 · 음원 · 네이티브는 바뀌지 않았다. 새 모션은 없다(장면 그림 전환은 기존 `NarrativeBackground`).

## 분석 결과

| 번들 | 크기 |
| --- | ---: |
| main efbb118c — CI 설정 | 2,285,134 bytes |
| 이 변경 — CI 설정 | 2,323,604 bytes |
| 차이 | +38,470 bytes |
| 상한 | 2,287,000 → 2,325,000 bytes(kB 올림 + 1 kB, 사용자 사전 승인) |
| main 71ad8bb3(#284) 위로 다시 맞춘 뒤 | CI 2,328,207 — 같은 설정의 main 2,289,737 대비 +38,470(병합 전과 같음). 상한 2,290,000 → 2,330,000 |

## 제한 사항

- 번들만 쟀고 렌더는 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.
- 롤플레이 목록의 구획 계산은 렌더마다 최종 테스트 계획을 조회한다 — 계획 함수가 에피소드 · 프로필 참조로 메모하므로 다시 짓지 않는다(`catalogFinalPlanFor`).

## 결론과 후속

- 실기에서 [e2e](../../e2e/episode-roleplay.md) ER1 ~ ER10으로 화면 · 말하기 · 이벤트를 확인한다.
