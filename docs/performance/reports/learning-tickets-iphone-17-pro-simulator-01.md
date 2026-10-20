# 학습 티켓 — iPhone 17 Pro 시뮬레이터 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처를 돌리지 않았다. 머리 칩 하나가 늘고, 칩 모달 · 티켓 없음 대화상자는 뜰 때만 선다. 둘이 떠 있는 동안 1초마다 다시 그리고(카운트다운), 닫혀 있으면 다음 한 장이 차는 순간에 한 번 다시 그린다.
- 기능 PR: 학습 티켓 — 최대 3장 · 1시간에 1장, 새 레슨이 한 장을 씀, 머리 칩 모달 · 말풍선 태그 · 결과 줄 · 티켓 없음 대화상자, 하루 1장 무료. 사용자 결정 2026-10-20(ADR-0074).
- 대상 commit: 이 보고서와 같은 PR의 `feat/learning-tickets` 브랜치 HEAD
- 기기: 측정 기기 없음(번들 크기만) — 화면 확인은 실기 iPhone · Android에서 한다
- OS: 해당 없음(번들 산출물)
- Lynx SDK: 4.0.1
- 빌드: `pnpm build` 산출 `apps/mobile/dist/main.lynx.bundle`(CI 설정, `.env.local` 없음), 판정은 `pnpm size:check`
- 측정 일시: 2026-10-20

## 시나리오

- 번들 크기: 같은 설정으로 main d937f3bf와 이 변경을 각각 빌드해 비교했다.

## 이 변경이 무엇을 건드렸나

- 순수 함수: 원장(`lib/learning-tickets.ts`) · 문지기(`app/ticket-gate.ts`) · 원형 카운트다운 SVG 문서(`screens/tickets/ticket-ring.ts`).
- 상태 · 결선: 진행 훅의 `tickets` · 티켓 훅(`app/use-learning-tickets.ts`) · 결선 감싸기(`app/ticket-wiring.ts`).
- 화면: `TicketStatModal` · `OutOfTicketsDialog` · `TicketMoreAction` · `tickets.css`, 머리 칩(`StatChip` tone `ticket`) · 말풍선 태그 · 결과 줄.
- 의존성 · 이미지 · 음원 · 네이티브는 바뀌지 않았다. 새 모션은 없다(모달은 지표 모달의 등장 클래스를 다시 쓴다).

## 분석 결과

| 번들 | 크기 |
| --- | ---: |
| main d937f3bf — CI 설정 | 2,239,927 bytes |
| 이 변경 — CI 설정 | 2,280,362 bytes |
| 차이 | +40,435 bytes |
| 상한 | 2,241,000 → 2,282,000 bytes(kB 올림 + 1 kB, 사용자 사전 승인) |

## 제한 사항

- 번들만 쟀고 렌더는 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.
- 원형 카운트다운은 매초 SVG 문서를 새로 짓는다(Lynx SVG에 획 애니메이션이 없다). 대화상자가 떠 있는 동안만이다 — 실기에서 프레임을 재지 않았다.

## 결론과 후속

- 실기에서 [e2e](../../e2e/learning-tickets.md) LT1 ~ LT10으로 화면 · 오프라인 · 이벤트를 확인한다.
