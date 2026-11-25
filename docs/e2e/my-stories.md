# 내 스토리 e2e (ADR-0194 · ADR-0191)

기기에서 사람이 보는 절차다(러너 없음 — ADR-0013). 준비: 앱 설정의 소리를 끈다. 서버 절차(MS-E5 ~ E8)는 운영에 마이그레이션 `20261228140000`,
Edge Function `chat-send` · `companion-story-reactions`, pg_cron이 적용되고 `companion.settings.my_stories`(반응은 `story_reactions`)가 `testers`인 시험
계정이 필요하다 — **이 브랜치에서는 적용하지 않았다.** 적용 전에는 가짜 포트 탐침(친구 스토리 e2e 「탐침」과 같은 방식)으로 MS-E1 ~ E4의 화면만 본다.

| # | 절차 | 기대 |
| --- | --- | --- |
| MS-E1 | 메신저 탭(내 스토리 켬) | 스토리 줄 맨 앞 점선 주황 「+」(New). 친구 스토리가 없어도 줄이 선다 |
| MS-E2 | 처음 「+」 | 안내 상자 「Share a Korean word」 세 걸음 · 「Make my first story」 · 「Not now」. Not now 뒤 다시 「+」는 바로 만들기 |
| MS-E3a | 「+」 → Background | 시트 「New story」에 Background만(사진 꺼짐). 편집: 바탕색 넷 · Words(Aa 없음 — 지금 서버, Cards 없음) · 「Add a word to share it.」 · Share 꺼짐. Words → 「Add a word」 시트(단어장 단어만, 탭 없음)에서 칸을 누르면 스티커가 놓이고 끌기 · 두 손가락 크기/회전 · ×. Share → 그 단어 스토리 |
| MS-E3b | (서버가 kinds에 text를 싣은 뒤) Aa | 바탕이 어두워지고 가운데 점선 상자 · 위에 글자색 넷 · Done · 「Korean or English — we'll help」 · 휴대폰 키보드. Done → 상자가 바탕 위 요소(끌기 · 두 손가락 · 모서리 손잡이 — 글자도 같은 비율, 다시 누르면 고쳐 쓰기), 교정 카드 없이 Share 바로 켜짐. Share → 글 스토리(막힌 글이면 안내, 위기 신호면 위기 안내 카드) |
| MS-E3 | (옛) 만들기 | 없앰 — 만들기는 MS-E3a(바탕 위 편집 · 「Add a word」 시트)로 바뀌었고, 레슨 카드는 올리지 않는다(2026-11-25) |
| MS-E4 | 올리기 | 내 스토리 보기: 주황 카드(MY WORD OF THE DAY · 단어 · 로마자 · 뜻 · 예문), 「No replies yet」 아래 「Friends usually reply within an hour.」(답할 친구가 없으면 「Add a friend to get replies」 + Find friends). 줄에 「Your story」, 「+」 자리는 시계 + 다음 창 시각(누르면 아침 · 낮 · 밤 시트) |
| MS-E5 | (서버) 1 ~ 5분 · 60분 안에 다시 메신저 | 「Your story」 주황 고리, 열면 「N friends replied」 · Seen by · 반응(말 · 「뜻」 · Open chat) · 「Replies are saved in each friend's chat.」. 반응 푸시를 누르면 그 인물 방 |
| MS-E6 | 반응의 「Open chat」 | 그 인물 방이 열리고 반응 메시지 위 「Replied to your story」 카드. 인용 띠 없음, 답은 보통 요금 |
| MS-E7 | ⋯ → Delete story → Delete | 확인 문구 「Your card and the N replies on it will be removed. Messages in your chats stay …」. 보기가 닫히고 「Your story」가 사라짐. 그 방의 반응 메시지는 남고 카드가 「Deleted story」 |
| MS-E9 | (서버가 `meta.quiz.freeAnswer`를 싣은 뒤) 덕수쌤 퀴즈 반응 → 답 — 각도만 quiz면 퀴즈 표시 없이 보통 엽전 관문 | 입력 칸 위 「Quiz answer is free」 · 엽전 없이 보냄 · 내 답 아래 「Free · quiz answer」, 맞히면 「Correct! …」(음성 선물 없음), 틀리면 힌트 뒤 「Free · last try」 |
| MS-E8 | 설정 › My stories | 보관 스위치 · 「N stories」 · 칸(LIVE · 날짜 · 반응 수) · 칸마다 지우기 · 「Delete all stories」(확인 상자). 스위치를 끄면 24시간 지난 칸이 사라짐. VoiceOver · TalkBack으로 칸 · 지우기 · 스위치가 이름과 함께 읽힘 |

**확인 기록**: PR 본문 · 보고에 시뮬레이터 · `assembleBundled` 스크린샷 경로를 적는다. [성능 기록](../performance/reports/my-stories-01.md) · [v2](../performance/reports/my-stories-02.md).
