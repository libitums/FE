# 학습 티켓 — 「Get 1 ticket」을 엽전으로 — 01

## 실행 조건

- 상태: 미측정 — 번들만. 렌더링 · 메모리 캡처를 돌리지 않았다. 화면 변경은 버튼 안 값 알약(엽전 그림 + 숫자)과 안내 한 줄의 문구뿐이고, 사는 일은 탭 뒤 서버 요청 하나다.
- 기능 변경: 머리 칩 모달 · 티켓 없음 대화상자의 「Get more tickets」(하루 한 장 무료)를 「Get 1 ticket」(엽전 20으로 1장)으로 바꿨다([ADR-0075](../../adr/0075-learning-tickets.md) 2026-11-23 적용 기록).
- 대상 commit: `feat/tickets-buy-with-coins` 브랜치 HEAD
- 기기: 렌더 측정 기기 없음(번들 크기만)
- OS: 해당 없음(번들 산출물)
- Lynx SDK: 4.0.1
- 빌드: `pnpm verify`의 `apps/mobile/dist/main.lynx.bundle`(`.env.local` 없음)
- 측정 일시: 2026-11-23

## 시나리오

- 번들 천장 검사(`pnpm size:check`)만 돌렸다. main 대비 증감은 PR의 번들 크기 보고(CI)가 단다.

## 이 변경이 무엇을 건드렸나

- 새 모듈 `lib/ticket-purchase-api.ts`(RPC 클라이언트 · 요청 id) · `app/ticket-purchase-flow.ts`(한 번의 흐름) · `app/server-balance-report.ts`(잔액 알림 잎 모듈), `TicketMoreAction`의 값 알약 · 결과 안내, 7개 언어 문구.
- 서버: RPC `companion_buy_ticket` 하나(마이그레이션). 탭마다 요청 한 번.

## 분석 결과

| 번들 | 크기 | 천장 |
| --- | ---: | ---: |
| 이 변경 (`.env.local` 없음) | 5,524.0 kB | 5,850.0 kB |

## 제한 사항

- 렌더 성능은 미측정이다 — 이 수치는 성능 통과의 근거가 아니다.

## 결론과 후속

- 배포 뒤 `ticket_more_tapped`의 `result` 분포(`short` 비율)를 보고 값(20)을 다시 본다.
