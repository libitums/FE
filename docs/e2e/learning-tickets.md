# 학습 티켓 e2e (ADR-0074)

기기(iOS · Android)에서 사람이 보는 절차다. **미실행** — 2026-10-20 현재 테스트(unit · ui · integration · SQL)만 돌았다.

준비: 진행이 있는 계정(튜토리얼 표지를 끝낸 상태 이상). 원격 DB 마이그레이션 `20261020120000_learning_progress_tickets.sql` 적용 여부를 적는다.

| # | 절차 | 기대 |
| --- | --- | --- |
| LT1 | 여정 맵을 연다 | 머리에 연속 · 트로피 다음 티켓 칩 「3」(숫자만) |
| LT2 | 끝내지 않은 레슨 말풍선을 연다 / 끝낸 레슨 말풍선을 연다 | 새 레슨의 `Start`에 티켓 「1」 태그, 끝낸 레슨에는 없다 |
| LT3 | 새 레슨을 시작하고 나가기로 맵에 돌아온다 | 칩 「2」. 칩을 누르면 모달 — 「2 tickets left」, 「Next ticket in 0:59:5x」, 왼쪽 칸이 조금 찬 충전 중 · 오른쪽 두 칸 Ready, 1초마다 줄어든다 |
| LT4 | 레슨을 끝까지 한다 | 결과 화면 보상 카드 아래 「N tickets left」 |
| LT5 | 새 레슨을 세 번 시작한 뒤 네 번째 | 가운데 「Out of tickets」 대화상자 · 원형 카운트다운 · 레슨은 열리지 않음 · `Back to map`으로 닫힘 |
| LT6 | LT5에서 `Get more tickets` | 「Here's a free ticket for today!」 안내, 버튼 자리에 `Start lesson` → 누르면 그 레슨이 열리고 칩 0 |
| LT7 | 같은 날 다시 `Get more tickets`(모달 · 대화상자) | 「…coming soon.」 안내만, 칩 그대로 |
| LT8 | 비행기 모드에서 앱을 다시 켜고 새 레슨 시작 | 칩이 줄고, 연결 뒤 서버 `learning_progress.progress.tickets`에 실린다(SQL로 확인) |
| LT9 | 동작 줄이기 · VoiceOver | 모달 숫자가 페이드로만 서고, 칩 「N tickets left」 · 칸 줄 · 원형 카운트다운이 한 문장으로 읽힌다 |
| LT10 | PostHog | `tickets_ran_out` · `ticket_more_tapped`(surface · granted) 도착 |
