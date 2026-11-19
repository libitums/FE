# 추천 친구 넷 · 「Get closer」 · 합산 체험 e2e (ADR-0164 앱 인계)

기기에서 사람이 보는 절차다. 시뮬레이터 · 기기 확인 전에 앱 설정에서 소리를 끈다. 서버 준비: 마이그레이션 20261216120000(추천 친구 · 합산 체험 ·
완화 수위) 적용, 함수 `chat-send` · `companion-greet` 배포, `companion.settings.friends_mode = testers`(기본). 친구 얼굴 그림은 콘텐츠 버킷
`content/images/profiles/<id>-casual.webp`(seoyeon · haejun · daeun · geonwoo) — 올리기 전에는 빈 얼굴(아바타 자리표시)이 정상이다.

계정 넷을 준비한다(운영 도구 · 플레이그라운드 `companion_operator_set_profile` · `companion_operator_set_adult_ack`):

- **A** 시험 계정(`duru_tester`), 생년 1990, 동의 없음
- **B** 시험 계정, 생년 없음(나이 모름)
- **C** 시험 계정, 생년 2012(미성년자)
- **D** 시험 계정이 아닌 회원

| # | 계정 | 절차 | 기대 |
| --- | --- | --- | --- |
| CF-E1 | D | 메신저 탭 | 추천 줄에 친구 넷이 없다(이야기 인물만, 또는 줄 없음). 오류 · 빈 칸 없음 |
| CF-E2 | A | 메신저 탭 | 줄 맨 앞에 차서연 · 권해준 · 송다은 · 임건우(서버 순서) — 이야기 인물보다 앞. See all → NEW FRIENDS 칸에 넷 |
| CF-E3 | A | 송다은을 누른다 | 시트: 이름 + NEW · 소개(bio) · 태그 「University student (Computer Science, 3rd year)」 · 「23 years old」 · 「INFP」 · 첫 말(한국어 두 줄 + 번역). 화면 언어를 ja로 바꾸면 소개 · 직업 · 「23歳」가 일본어 |
| CF-E4 | A | 송다은 `Start chatting` | 「Get closer」 시트 없이 곧바로 목록 맨 위 NEW, 첫 말 「안녕하세요! 송다은이에요.」 · 「어느 나라에서 왔어요? …」가 서버 대화에 저장(`companion-greet` trigger unlock). 「송다은 added to your chats」 |
| CF-E5 | A | 차서연 `Start chatting` | 프로필 시트가 닫히고 「Get closer with 차서연?」 시트(디자인 B1): 얼굴 · 본문 「She can be warmer…」 · 회색 칸 두 줄(방패 · 체크) · 주황 `Sounds good` · `Just friends for now`. 어느 언어에서도 로맨스 · 성인 · 18+ · 생년이라는 말이 없다 |
| CF-E6 | A | CF-E5에서 `Sounds good` | 방이 열리고 첫 말이 온다. 서버: `companion.profiles.adult_ack_at`이 채워짐, `companion_load_profile`의 `adultAck = true`. 이 방의 턴 meta `romanceTier = open`(플레이그라운드 `companion_inspect_memory` access) |
| CF-E7 | A | 권해준 `Start chatting` | 「Get closer」가 다시 서지 않는다(이미 동의 + 물은 표시) — 곧바로 추가 |
| CF-E8 | A′ | A를 운영자 함수로 동의를 끄고 앱 데이터를 지운 뒤 차서연 → `Just friends for now` | 동의 RPC가 나가지 않고 방이 열림. 서버 `adultAck = false` 그대로, 턴 meta `romanceTier = standard`. 앱을 다시 켜고 권해준을 추가해도 시트가 다시 서지 않음(계정마다 기기 표시) |
| CF-E9 | A | 「Get closer」에서 Android 뒤로 · 막 탭 | 시트만 닫히고 추가되지 않음. 다시 `Start chatting`하면 시트가 다시 선다 |
| CF-E10 | B | 차서연 `Start chatting` | 시트 없이 곧바로 추가, 생년을 넣으라는 안내도 없음. 턴 meta `standard` |
| CF-E11 | C | 메신저 탭 | 차서연 · 권해준이 줄 · 친구 찾기에 없고, 송다은 · 임건우만 선다 |
| CF-E12 | 무료 등급 계정(체험 20 남음) | 송다은 방에서 한 통 | 머리 「20 of 20 free messages left」 → 19, 엽전이 빠지지 않음. 덕수쌤 방으로 가면 같은 수(19) — 합산. 플레이그라운드 `trial_usage` 합 = 1 |
| CF-E13 | 무료 등급(체험 1 남음) | 아무 방에서 한 통 | 「Last free message」 띠 → 보낸 뒤 다 쓴 판(Keep chatting · Back to chats). 다른 인물 방으로 가면 판 없이 「3 coins per message」 · 엽전 보내기 |
| CF-E14 | 무료 등급(체험 0, 엽전 0) | 친구 추가 | 첫 말은 그대로 온다(첫 인사는 무료, ADR-0164 D3). 보내기는 엽전 상점 |
| CF-E15 | VoiceOver · TalkBack | CF-E5 시트 | 제목이 머리글(dialog), 회색 칸 두 줄이 각각 한 번 읽힘, 두 단추가 버튼. 시트가 떠 있는 동안 뒤 목록이 읽히지 않음 |

PostHog: CF-E3에서 `suggested_friend_opened { characterId: daeun, kind: general, from: row }`, CF-E4에서 `suggested_friend_added`, 첫 보내기에서
`chat_message_sent`(characterId) · 처음이면 `first_chat_message_sent`. 7일 내 재방문은 `chat_message_sent`의 사람 · 인물별 날짜로 본다(새 이벤트 없음).
Airbridge로는 나가지 않는다.

**미실행** — 이 브랜치(feat/companion-friends-app)는 vitest · 빌드까지만 확인했다. 시험 계정 · 서버 배포가 필요한 기기 확인이다.
