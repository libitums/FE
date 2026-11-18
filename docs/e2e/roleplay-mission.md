# 롤플레이 미션 e2e (ADR-0160 · 초안)

기기(iOS · Android)에서 사람이 보는 절차다. **미실행** — 2026-11-19 현재 테스트(unit · ui · integration)만 돌았다.
화면은 스위치 뒤다 — 운영 빌드에는 길이 없다. 개발 빌드에서 `ROLEPLAY_MISSION_READY`를 `true`로 바꾸거나 개발 미리보기에서
`setRoleplayMissionForTest({ enabled: true })`로 켠다. 출처는 가짜(6화 「커피 주문」 한 판, 엽전 정액 5 · 잔액 42)다.

준비: 본편 6편(커피 주문)을 끝낸 계정(또는 시험 계정). 1편은 끝내지 않은 상태. 마이크 · 음성 인식 권한은 처음 묻는 상태.

| # | 절차 | 기대 |
| --- | --- | --- |
| RM1 | 스위치를 끈 운영 설정으로 롤플레이 탭을 연다 | 지금 앱과 같다 — 구획마다 대본형 카드 하나, 미션 카드 없음 |
| RM2 | 스위치를 켜고 롤플레이 탭을 연다 | 6편 구획에 대본형 카드 뒤 `Order a coffee` 카드(`Mission · 4 goals · Best 73`). 1편 구획의 미션 카드는 자물쇠 |
| RM3 | 6편 미션 카드를 누른다 | 미리보기 — 장면 그림, `Order a coffee` · `Episode 6. · Mission · Best 73`, 알약 `with 카페 직원` · `10 turns` · `4 goals`, 안내 다이얼로그, 목표 넷(필수 둘), `5 Yeopjeon · You have 42`, `Start mission` |
| RM4 | 작은 기기(SE) · 가장 큰 글자로 RM3 | 목표 판만 스크롤되고 `Start mission`이 화면 안에 선다 |
| RM5 | `Start mission` | 대화 — 위 띠(장면 · 제목 · `10 turns left` · 목표 넷), 상대 말풍선 「반가워요. 뭐 드릴까요?」(번역), 입력 줄(`Hint · 3 left` · 마이크 · `Reply in Korean` · 보내기) |
| RM6 | 「아이스 아메리카노 한 잔 주세요.」를 쳐서 보낸다 | 입력 중 점 → 답 「네, 아이스 아메리카노 한 잔이요. 드시고 가세요?」, `Order a drink` 체크, `9 turns left` |
| RM7 | 마이크 → 권한 허용 → 「가지고 가요」라고 말한다 | `Listening…` 뒤 받아 적은 글이 그대로 내 말풍선으로 가고, 아래에 `MORE NATURAL` 교정 카드(「포장이요」), `Say for here or to go` 체크 |
| RM8 | `Hint · 3 left` | 힌트 카드 — 「카드로 할게요.」 · 로마자 · 뜻 · `Each hint takes 5 points.`, 단추는 `Hint · 2 left`. `Use this` → 입력 칸이 채워진다 |
| RM9 | 그대로 보낸다 | 마무리 대사 → `Mission complete!` → `Scoring your conversation…` → 리포트 — `Mission complete` · 점수 · `Your best: …`, 목표 3/4 · 표현 1/2 · 정확도 85 · `1 hint`, 고친 문장 · 다시 해 볼 표현 · 총평 |
| RM10 | `Play again` → `Start mission` → 상단 뒤로 단추 | 확인 「Quit this mission?」 — `Keep going`이면 머물고, `Quit`이면 리포트 없이 목록 |
| RM11 | 아무 목표도 못 이루고 열 번 보낸다 | 「죄송해요, …」 → `Out of turns` → 리포트 `Mission failed` |
| RM12 | 가짜 옵션 `grading: "fail-once"`로 한 판을 끝낸다 | `We couldn't score this` · `We gave back what you paid for this play.` · `Try again` → 리포트 |
| RM13 | 가짜 옵션 `start: "insufficient_credits"`로 시작 | 미리보기에 「You don't have enough Yeopjeon for this mission.」, 대화로 가지 않는다 |
| RM14 | VoiceOver · TalkBack으로 대화 | 목표 줄 「Order a drink, required, not done」 → 이루면 「…, done」, 입력 중 「카페 직원 is typing」, 그만두기 「Quit mission」 |
| RM15 | Android 상태 표시줄 | 미리보기 · 대화는 밝은 아이콘(짙은 장면 위), 리포트는 어두운 아이콘 |
