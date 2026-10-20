# 가입 직후 이름 · 나라 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처를 돌리지 않았다. 새 화면 둘은 가입 직후 한 번만 지나고, ② 나라는 199줄을 한 번에 그린다(설정의 나라 고르기와 같은 양).
- 기능 PR: 가입 직후 ① 이름 · ② 나라 — 온보딩 넷째 스텝 · 에피소드 전 묻기 제거, 이름 미리 채움(소셜 표시 이름 · 무작위 40개) · 나라 전체 목록(첫 글자 묶음 · A–Z 막대). 사용자 결정 2026-10-20(ADR-0059 D7 적용 기록).
- 대상 commit: 이 보고서와 같은 PR의 `feat/learner-profile-after-signup` 브랜치 HEAD
- 기기: 측정 기기 없음(번들 크기만) — 화면 확인은 실기 iPhone · Android에서 한다
- OS: 해당 없음(번들 산출물)
- Lynx SDK: 4.0.1
- 빌드: `pnpm build` 산출 `apps/mobile/dist/main.lynx.bundle`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-10-20

## 시나리오

- 번들 크기: 같은 설정으로 main 71ad8bb3(#284)과 이 변경을 각각 빌드해 비교했다.

## 이 변경이 무엇을 건드렸나

- 순수 함수: 소셜 표시 이름 읽기(`lib/auth-user-id.ts` `authDisplayNameFrom`) · 무작위 이름 고르기(`lib/learner-profile.ts` `pickLearnerName`) · 나라 첫 글자 묶음(`lib/learner-profile-form.ts`).
- 자산: `content/learner-profile.json`에 `randomNames` 40개(백그라운드 전용 모듈이 읽는다).
- 화면: `LearnerNameScreen` · `LearnerCountryScreen` · `learner-signup-screen.css` · `EntryStepBar`(언어 선택에도 붙음).
- 걷은 것: 온보딩 넷째 스텝 양식 · `LearnerProfileGateScreen` · 가드 결선 · 건너뜀 이벤트.
- 의존성 · 이미지 · 음원 · 네이티브는 바뀌지 않았다. 새 모션은 없다.

## 분석 결과

| 번들 | 크기 |
| --- | ---: |
| main 71ad8bb3 — CI 설정 | 2,289,737 bytes |
| 이 변경 — CI 설정 | 2,309,010 bytes |
| 차이 | +19,273 bytes |
| 상한 | 2,290,000 → 2,311,000 bytes(kB 올림 + 1 kB, 사용자 사전 승인) |
| main d7a2a9a3(#285) 위로 다시 맞춘 뒤 | CI 2,347,549 — 같은 설정의 main 2,328,279 대비 +19,270(병합 전 +19,273과 3 bytes 차). 상한 2,330,000 → 2,349,000 |

## 제한 사항

- 번들만 쟀고 렌더는 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.
- ② 나라는 199줄을 가상화 없이 그린다(설정의 나라 고르기와 같다 — ADR-0059 「미확인 · 후속」 6). A–Z 막대의 `scrollIntoView`가 실기에서 매끄러운지는 보지 않았다.

## 결론과 후속

- 실기에서 [e2e](../../e2e/learner-profile.md) S1 ~ S10으로 화면 · 미리 채움 · 뒤로 · 저장을 확인한다.
