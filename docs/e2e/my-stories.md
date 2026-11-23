# 내 스토리 e2e (ADR-0179)

기기에서 사람이 보는 절차다(러너 없음 — ADR-0013). 준비: 앱 설정의 소리를 끈다. 서버 절차(MS-E5 ~ E8)는 운영에 마이그레이션 `20261228140000`,
Edge Function `chat-send` · `companion-story-reactions`, pg_cron이 적용되고 `companion.settings.my_stories`(반응은 `story_reactions`)가 `testers`인 시험
계정이 필요하다 — **이 브랜치에서는 적용하지 않았다.** 적용 전에는 가짜 포트 탐침(친구 스토리 e2e 「탐침」과 같은 방식)으로 MS-E1 ~ E4의 화면만 본다.

| # | 절차 | 기대 |
| --- | --- | --- |
| MS-E1 | 메신저 탭(내 스토리 켬) | 스토리 줄 맨 앞 점선 주황 「+」(New). 친구 스토리가 없어도 줄이 선다 |
| MS-E2 | 처음 「+」 | 안내 상자 「Share a Korean word」 세 걸음 · 「Make my first story」 · 「Not now」. Not now 뒤 다시 「+」는 바로 만들기 |
| MS-E3 | 만들기 | 「New story」 · 닫기, 탭 「My words」 · 「Lesson cards」(사진 탭 없음). 단어 줄(체크 원 · 단어 · 로마자 · 뜻 · 레슨), 레슨 카드는 거르기 칩 · 예문. 아래 「Make a card with <단어>」 / 「Share the card」. 위 · 아래가 노치 · 홈 인디케이터에 가리지 않음 |
| MS-E4 | 올리기 | 내 스토리 보기: 주황 카드(MY WORD OF THE DAY · 단어 · 로마자 · 뜻 · 예문), 「Friends used your word」 아래 「Your friends will reply over the day.」. 줄에 「Your story」 |
| MS-E5 | (서버) 8 ~ 25분 뒤 · 몇 시간 뒤 다시 메신저 | 「Your story」 주황 고리, 열면 친구 반응(그 단어가 든 한국어 한두 줄 · 이름 · 뜻). 하루 상한(사람 3 · 전체 500)을 넘으면 더 오지 않음 |
| MS-E6 | 반응의 「Answer <이름>」 | 그 인물 방이 열리고 입력 줄 위 「You answered about your story」 띠, 보낸 글 위에 같은 카드. 캐릭터 답이 그 단어 · 자기 반응을 앎. 엽전은 보통 요금 |
| MS-E7 | ⋯ → Delete story → Delete | 보기가 닫히고 「Your story」가 사라짐. 그 방을 다시 열면 앞 인용이 「Deleted story」 |
| MS-E8 | 설정 › My stories | 보관 스위치 · 「N stories」 · 칸(LIVE · 날짜 · 반응 수) · 칸마다 지우기 · 「Delete all stories」(확인 상자). 스위치를 끄면 24시간 지난 칸이 사라짐. VoiceOver · TalkBack으로 칸 · 지우기 · 스위치가 이름과 함께 읽힘 |

**PR 2 확인 기록**: PR 본문 · 보고에 시뮬레이터 · `assembleBundled` 스크린샷 경로를 적는다. [성능 기록](../performance/reports/my-stories-01.md).
