# 무제한 티켓 표시(주황 칩 · 결과 알약 · 무제한 모달) — 미측정 — 01

## 실행 조건

- 상태: 미측정 — 렌더링 · 메모리 · 프레임 캡처를 돌리지 않았습니다.
- 기능 PR: 무제한(시험 계정) 티켓 칩을 주황 그라데이션 칩 + 그린 무한 기호 + 4.2초마다 도는 빛 훑기로 바꾸고, 결과 화면에 「No ticket used · Unlimited」 알약과 「Next lesson」 무한 태그를 세우며, 칩을 누르면 무제한 모달(시험 계정 판 결선 · 구독 판 UI만)을 엽니다([ADR-0115](../../adr/0115-unlimited-ticket-presentation.md)).
- 대상 commit: `feat/unlimited-ticket-premium` 커밋 전 작업 트리(기준 main 339b393b).
- 기기: 측정 기기 없음.
- OS: 해당 없음
- Lynx SDK: 4.0.1
- 빌드: `pnpm build`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-11-09

## 시나리오

- 번들 크기: `main.lynx.bundle` **3,998.9 kB**(상한 4,060.0 kB — 남은 여유 61.1 kB), image 4,304.6 / 11,520.0 kB, ui-lynx 557.8 / 559.0 kB(변경 없음).
- 런타임: 미측정. 시험 계정의 머리 칩에서 CSS 반복 애니메이션 하나(transform만, 4200 ms 주기)가 맵이 떠 있는 동안 돕니다. 일반 계정에는 새로 도는 것이 없습니다.

## 이 변경이 무엇을 건드렸나

- 새 모듈 — 무제한 상태 순수 함수 모듈 · `components/infinity-icon.ts` · `components/UnlimitedTicketChip.tsx` · `screens/lesson-complete/LessonCompleteUnlimitedLine.tsx` · `screens/tickets/UnlimitedTicketModal.tsx` · `screens/tickets/UnlimitedPassPeriod.tsx`, 새 CSS 셋(칩 · 칩 모션 · 모달).
- 고친 모듈 — `TopBar` · `StatChip`(`valueText` 삭제) · `LessonCompleteStats` · `LessonCompleteScreen` · `LessonCompleteNextActions` · `catalog-next-unit` · `AppHeader` · `AppSession` · 티켓 문구 계약과 다섯 언어 문구 · `tickets.css`.
- 서버 · 호스트 · ui-lynx · 토큰 패키지 변경 0.

## 분석 결과

렌더링 · 메모리 값은 **없습니다** — 재지 않았습니다.

## 해석

- 이 기록은 성능 판정이 아닙니다. 빛 훑기는 합성 단계에서 끝나는 transform 애니메이션이라 레이아웃을 다시 하지 않을 것으로 보지만, 기기에서 프레임을 재지 않았으므로 추론이고, 프레임 비용은 판정할 수 없습니다(미측정의 한계).
- 번들 여유가 61.1 kB로 줄었습니다. 이 PR 몫만 따로 재지 않았습니다(기준 main을 같은 조건으로 다시 짓지 않음).

## 결론과 후속

- 미측정입니다.
- 후속: 무제한 티켓 e2e(UT-E1) 첫 회차에서 시험 계정 맵의 스크롤 체감을 함께 봅니다.

## 개인정보 점검

- [x] 보고서에 로컬 절대 경로가 없습니다.
- [x] 화면 캡처나 사용자 입력값(계정 · 토큰 · 서명 키)을 싣지 않았습니다.
- [x] 미측정 기록을 기준선이나 성능 판정으로 표현하지 않았습니다.
