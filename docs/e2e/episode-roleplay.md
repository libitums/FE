# 에피소드 롤플레이 e2e (ADR-0076)

기기(iOS · Android)에서 사람이 보는 절차다. **미실행** — 2026-10-20 현재 테스트(unit · ui · integration)만 돌았다.

준비: 본편 1편(물 사기)을 최종 테스트까지 끝낸 계정, 2편은 끝내지 않은 상태. 마이크 · 음성 인식 권한은 처음 묻는 상태.

| # | 절차 | 기대 |
| --- | --- | --- |
| ER1 | 롤플레이 탭을 연다 | 튜토리얼 구획 아래 `Episode 1. Buying Water.` · `Episode 2.` · `Episode 3.` 구획. 1편 카드는 열림(제목 `Buying Water` · `Roleplay · 3 lines`), 2 · 3편은 자물쇠 |
| ER2 | 2편 카드를 누른다 | 아무 일도 없다 |
| ER3 | 1편 카드를 누른다 | 미리보기 — 계산대 그림, `Episode 1.` · `Roleplay · Buying Water`, 알약 `with 편의점 점원` · `3 lines`, 안내 다이얼로그, `Start roleplay` |
| ER4 | `Start roleplay` → 표지 컷을 넘긴다 | 표지 컷 다섯(「봉투 드릴까요?」 컷은 없다) 뒤 대화 — 점원 다이얼로그 「봉투 드릴까요?」 · `Line 1 / 3` · 소리 한 번 · 마이크 · `Show hint` · `Can't speak now`(배경 면 없음) |
| ER5 | 마이크 → 권한 허용 → 「아니요, 괜찮아요」라고 말한다 | 듣는 중 `Stop`, 끝나면 `Me` 독백 다이얼로그(주황 테두리) 「아니요, 괜찮아요.」 · `Great` · `Next` |
| ER6 | 다음 턴에서 틀리게 말한다 → `Try again` → 맞게 말한다 | `Not quite` · 들은 문장 · `Answer: …`, 다시 하기 뒤 `Great` |
| ER7 | 마지막 턴 → `See results` | 결과 화면(레슨과 같음, 티켓 줄 없음) → `Back to list`로 목록. 여정 맵 진행 · 트로피 · 티켓 칩이 그대로 |
| ER8 | 2편을 끝내고 2편 롤플레이를 한다(프로필 이름 Emma) | 대답 「Emma(으)로 예약했어요」에서 인식기가 이름을 다르게 적어도(「엠마로 예약했어요」) `Great` |
| ER9 | 음성 인식 권한을 거부한 상태에서 마이크 | 안내 「Speaking isn't available right now. You can skip this line.」, `Can't speak now`로 넘김 — 결과에서 그 줄은 판정에 들지 않는다 |
| ER10 | PostHog | `roleplay_story_opened`(episodeId) · `roleplay_story_completed`(episodeId · correctCount · judgedCount · skippedCount) 도착 |
