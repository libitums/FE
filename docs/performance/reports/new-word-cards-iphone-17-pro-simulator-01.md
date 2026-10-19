# 새 단어 카드 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처를 돌리지 않았다. 카드 구간의 헤더가 회색 세션 헤더 상자(Card · 순번 · 막대 · 학습형 이름)에서 `×` · 칸 막대(카드 수만큼) · 캡션 한 줄로 바뀌고, 카드 안에서 예문 상자가 빠졌다. 카드 7장이면 칸 view 7개가 더해지고 예문 상자의 view · text 5~6개가 빠진다.
- 기능 PR: 새 단어 카드 — 카드는 레슨 카운터에 세지 않음 · 카드 구간에 가벼운 헤더 · 카드 본문 정리(예문 없음, `Got it` 하나) · 학습 지시문 heading-m. 사용자 결정 2026-10-19(ADR-0073).
- 대상 commit: 이 보고서와 같은 PR의 `feat/new-word-cards` 브랜치 HEAD
- 기기: 측정 기기 없음(번들 크기만) — 화면 확인은 실기 iPhone · Android에서 한다
- OS: 해당 없음(번들 산출물)
- Lynx SDK: 4.0.1
- 빌드: `pnpm build` 산출 `apps/mobile/dist/main.lynx.bundle`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-10-19

## 시나리오

- 번들 크기: 이 변경의 CI 설정 빌드를 `pnpm size:check`로 판정했다.

## 이 변경이 무엇을 건드렸나

- 순수 함수: 카운터 표 `catalogCountsInLessonCounter`와 `catalogActivityPositionOf`의 오프셋 · 전체(카드 제외), 카드 진행 값 `vocabCardRunProgress`.
- 화면: 학습 껍데기 헤더 자리 분리(`LearningShellHeader`) · 가벼운 헤더(`LearningRunHeader` · CSS) · 아래 버튼 자리(`actionButton`) · 단어 카드의 ui-lynx `Button`. 예문 렌더와 그 CSS가 빠졌다.
- 학습 지시문 글자 label-l(14/20) → heading-m(22/28) — CSS 값만 바뀌었다.
- 의존성 · 이미지 · 음원 · 네이티브는 바뀌지 않았다. 모션(전환 · 애니메이션)은 더하지 않았다.

## 분석 결과

| 번들 | 크기 |
| --- | ---: |
| main 기록 실측(에피소드 백그라운드 받기) — CI 설정 | 2,198,142 bytes |
| 이 변경 — CI 설정 | 2,202,092 bytes |
| 차이 | +3,950 bytes |
| 상한 | 2,200,000 → 2,204,000 bytes(kB 올림 + 1 kB, 사용자 사전 승인) |

## 제한 사항

- 번들만 쟀고 렌더는 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.
- 지시문이 22pt로 커져 긴 지시문(예: `Tap the syllables to spell the word.`)이 두 줄이 되면 작업 영역이 그만큼 줄어든다. 작은 화면(320×568)에서 작업 영역이 문턱(96) 아래로 줄면 껍데기가 지시문 · 무대 · 작업 영역을 한 스크롤로 합친다(`learning-shell-flow`) — 실기에서 본 적은 없다.

## 결론과 후속

- 실기에서 카드 구간 헤더 · 카드 뒤 첫 문제의 `Lesson 1 / N` · 지시문 줄바꿈을 [e2e](../../e2e/catalog-items.md) NW1 ~ NW7으로 확인한다.
