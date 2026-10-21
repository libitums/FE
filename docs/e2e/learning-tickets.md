# 학습 티켓 e2e (ADR-0075)

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
| LT11 | (2026-10-21, 시안 E4) 맵에서 새 레슨 `Start` | 머리 티켓 칩이 살짝 커지며 숫자 3 → 2, 칩 아래 「−1」이 떨어지며 사라진 뒤(약 0.6초) 학습이 열린다. 다시 하기는 움직임 없이 바로. 동작 줄이기에서는 숫자만 바뀌고 열린다 |

**Android R6 API30 2026-10-21: 결과** (LT11 · LT6 경로, 작업 트리 `83d0fa30` + 커밋 전 변경 — 재생 동안 머리를 띠 위로 올리는 `app-header-raised` · 「−1」 흰 알약 포함, Debug APK + 로컬 번들, 계측 픽스처 로그인) — 새 레슨 `Start`: 칩이 커지고(1.14, 잘림 없음) 숫자 3 → 2로 굴러가며 테두리가 주황으로 물들었다 걷히고, 흰 알약 「−1」이 띠 **위로** 떨어지며 옅어진 뒤 약 0.65초에 학습이 열렸다. 알약은 잘리지 않고 띠 위에서도 또렷하다(글자 #B94208 : 알약 5.46:1, 알약 : 띠 2.59:1). 재생 뒤 칩 탭(모달) · 말풍선 바깥 탭(닫힘)은 평소대로. 맵 복귀 칩 「2」. 다시 하기는 움직임 없이 다음 프레임에 열렸다. 0장 → `Get more tickets` → `Start lesson`도 칩 1 → 0 움직임 뒤 열렸다. 동작 줄이기 · iOS는 미실행. 증거 `evidence/android-ticket-drop-*.png`, 분석 [성능 기록](../performance/reports/ticket-drop-motion-android-r6-api30-01.md).
