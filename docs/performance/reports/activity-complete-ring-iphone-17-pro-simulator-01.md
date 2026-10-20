# 활동 완료 카드 링 + 체크 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 · 프레임 캡처를 돌리지 않았다. 완료 카드의 요소가 늘었고(링 트랙 · 반쪽 창 둘 · 도는 판 둘 · 호 둘 · 안쪽 원 · 칩 · 타일 둘) 표준 움직임에서 keyframe 애니메이션 여섯 개(링 둘 · 원 · 체크 · 올라옴 둘)가 한 번 돈다.
- 기능 PR: PERFECT LESSON 앞 완료 카드 시안 A — 168 표식의 링이 한 바퀴 차오르고(두 반쪽 회전 마스크) 안쪽 원 · 체크 · 제목 · 숫자 타일이 차례로 선다. 폭죽 · XP 없음, 바탕 그대로(사용자 결정 2026-10-19).
- 대상 commit: 이 보고서와 같은 PR의 `feat/activity-complete-ring` 브랜치 HEAD
- 기기: 측정 기기 없음(번들 크기만) — 화면 확인은 실기 iPhone · Android에서 한다
- OS: 해당 없음(번들 산출물)
- Lynx SDK: 4.0.1
- 빌드: `pnpm build` 산출 `apps/mobile/dist/main.lynx.bundle`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-10-19

## 시나리오

- 번들 크기: 이 변경과 main `6739e505`를 같은 CI 설정으로 빌드해 `pnpm size:check`로 판정했다.

## 이 변경이 무엇을 건드렸나

- `LearningActivityComplete` 재구성과 그 CSS(규칙 · keyframes 넷), 순수 모듈 `learning-activity-complete.ts`.
- `LessonPosition`의 선택 필드 둘(`activityCount` · `ordinal`) — 카탈로그 계획 · `render-catalog`가 채운다. 레슨 순번 헬퍼 `catalogLessonOrdinalOf`.
- 일곱 학습형 화면이 완료 카드에 `lesson`을 넘긴다(한 줄씩). 문구 셋(`completedActivities` · `completionStats`).
- 움직이는 속성은 `transform` · `opacity`뿐이다(레이아웃 속성 애니메이션 없음). 동작 줄이기에서는 애니메이션이 없다.
- 의존성 · 이미지 · 음원 · 네이티브는 바뀌지 않았다.

## 분석 결과

| 번들 | 크기 |
| --- | ---: |
| main `6739e505` — CI 설정 | 2,195,122 bytes |
| 이 변경 — CI 설정 | 2,207,905 bytes(+12,783) |
| 상한 | 2,197,000 → 2,209,000 bytes(kB 올림 + 1 kB) |

## 제한 사항

- 번들만 쟀고 렌더는 미측정이다 — 이 수치는 성능 통과의 근거가 아니다. 중첩 `overflow: hidden` 창 안의 회전이 두 플랫폼에서 끊김 없이 그려지는지, 링 이음매에 틈이 보이는지는 실기에서만 판정된다.

## 결론과 후속

- 실기에서 [완료 화면 e2e](../../e2e/learning-completion.md) 「시안 A」 AC-1 ~ AC-6과 [동작 줄이기 e2e](../../e2e/motion-reduced.md) M-I9 · M-A9를 돌린다. 링이 도는 1.6초 동안 프레임 저하가 보이면 이 보고서의 다음 회차로 렌더 캡처를 남긴다.
