# ADR-0194 내 스토리 — 단어 · 레슨 카드 · 친구 반응(LLM, 비용 상한) · 보관과 지우기

- 상태: 채택 — 앱 · 서버 파일, **운영 미적용**(마이그레이션 · Edge Function · 예약 · 스위치는 사용자 승인 뒤)
- ⟨2026-11-25⟩ 번호를 0179에서 0194로 바꿨다(0179는 스냅샷 v2m). 서버 · 계약은 서버 PR(`hyesungKomet/stories-server`)로 먼저 들어가고, 앱 화면은 PR #565에 남아 메신저 담당이 이어 간다.
- **일부 대체됨** ⟨2026-11-24⟩: D4(반응을 스토리에만 둠 · 인물 최대 셋 · 8분 ~ 7시간 · 단어 필수 · 알림 없음 · Answer 인용 띠) · D5의 상한 값(사람 3 · 전체 500)과 하루 올리기 규칙 · D6의 「지우면 반응도 지움」은 [ADR-0191](0191-my-stories-reactions-as-chat.md)이 대체한다. D1 ~ D3 · D7과 D5의 장부 · 스위치 · 검사 · 번역 모델은 그대로다.
- 날짜: 2026-11-23
- 관련: [ADR-0178](0178-friend-stories.md)(친구 스토리 — 이 ADR은 그 위에 쌓는다) · [ADR-0169](0169-more-menu-letters-wordbook.md)(단어장) ·
  [ADR-0091](0091-vietnamese-localization.md)(UI 언어 카탈로그) · [ADR-0155](0155-chat-pricing-follows-server.md)(메시지 요금) ·
  [ADR-0029](0029-product-analytics-posthog.md)(이벤트 이름) · [ADR-0149](0149-bundle-size-ceiling-and-report.md)(번들 천장)

## 맥락

사용자 결정(2026-11-23 「PR 2도 진행」): 친구 스토리 1단계 위에 **내 스토리**를 단어 · 카드로만 연다(시안 11 · 12 · 15번 + 8 처음 안내 · 9 지우기 ·
10 설정 › My stories). 사진 탭 · 사진 위 얹기(5 · 13 · 14번)는 만들지 않는다. 만들기는 스토리 줄 맨 앞 「+」 하나만 있는 동그라미(시안 1번 최신판).
친구 반응은 LLM 글이고 **붙인 단어를 꼭 넣는다**. 반응은 몇 분 ~ 몇 시간에 걸쳐 도착한다. 비용은 사람마다 · 전체 하루 상한을 서버 스위치 뒤에 둔다
(off · testers · on, 기본 off). 친구에게는 24시간, 내 보관함에는 지울 때까지(설정 스위치). 지우면 반응도 지우고 대화 인용은 「Deleted story」.

## 결정

### D1. 데이터 — 서버 표 셋, 앱은 RPC로만

- `companion.my_stories`(사용자 · `client_id` 하나 — 두 번 눌러도 하나 · 종류 word/card · 단어 `{episodeId, ref}` · 한국어 · 로마자 · 뜻(올린 사람 화면 언어) ·
  예문 · 24시간) · `my_story_reactions`(스토리 cascade · 인물 · `due_at` · scheduled → claimed → done/failed/skipped) · `my_story_replies`(대화 인용,
  스토리를 지우면 null). RLS 켬, 앱 직접 접근 없음.
- 앱 RPC: `companion_my_stories()` → `{ enabled, keep, stories }` · `companion_post_my_story(…)` → `ok | off | daily_limit | invalid` ·
  `companion_delete_my_story(id | null = 모두)` · `companion_set_keep_my_stories(bool)`. 함수가 없는 서버(적용 전)는 404 → 읽기 null → 「+」가 서지 않는다.
- 단어 · 예문은 **올릴 때의 글**을 저장한다(카탈로그 ref도 함께) — 반응 프롬프트 · 보관함이 카탈로그를 다시 읽지 않는다.

### D2. 올릴 거리 — 「My words」 · 「Lesson cards」 두 탭

> ⟨개정 2026-11-25, 사용자 결정⟩ **레슨 카드는 앱이 올리지 않는다** — 만들기는 단어장 단어만(「Add a word」 시트, 탭 · 거르기 칩 없음). 서버에 있는
> `kind: "card"` 스토리(옛 것 · 보관함)는 지금처럼 그린다. 아래는 그 전 결정의 기록이다(적용 기록 「레슨 카드 올리기 없앰」).

- My words: 단어장 기록(ADR-0169)을 UI 언어 카탈로그로 푼 단어 — 별 단 것 먼저, 그다음 처음 본 날 최근 순.
- Lesson cards: 단어장에 기록이 하나라도 있는(=배운) 레슨의 단어 카드 중 **예문이 있는 것**, 에피소드 순서 · 에피소드 거르기 칩.
- 단어 카드는 「Make a card with <단어>」, 레슨 카드는 「Share the card」. 사진 탭은 없다.

### D3. 줄 · 보기 · 처음 안내

- 스토리 줄 맨 앞에 「+」(점선 brand 원, 「New」). 살아 있는 내 스토리가 있으면 바로 뒤 「Your story」 — 안 본 반응이 있으면 주황 고리. 내 스토리가 켜져
  있으면 친구 스토리가 없어도 줄이 선다.
- 처음 「+」는 안내(시안 8번을 단어 · 카드로 바꾼 세 걸음) — 보이는 순간 계정마다 기기에 「봤음」을 남긴다(Not now여도 다시 서지 않는다).
- 내 스토리 보기: 카드(brand-strong 면 흰 글) · 경과 · 종류, 「Friends used your word」 반응 줄(얼굴 · 글 · 이름 · 뜻 · 「Answer <이름>」), 반응이 없으면
  「Your friends will reply over the day.」, 24시간이 지났으면 「Friends saw this for 24 hours. Only you see it now.」. ⋯ 메뉴의 Delete story.
- 반응을 연 순간 그 반응들을 본 것으로(친구 스토리 본 것 저장과 같은 기기 저장 — id가 겹치지 않는다).

### D4. 반응 — LLM, 단어 필수, 시간차 도착

- 올릴 때 반응을 **예약**한다: 이 사람이 말한(내 메시지가 있는) 대화의 인물 최대 셋, 마지막으로 말한 순. 도착 시각은 8 ~ 25분 · 45 ~ 150분 · 3 ~ 7시간 뒤
  (스토리 · 인물 해시로 결정적).
- Edge Function `companion-story-reactions`(10분마다): 정리 → claim 12 → 사람마다(동시 넷) 선톡 맥락 + 반응 지시(단어를 꼭 넣고 한두 줄) → 답 →
  말에 단어가 없으면 **출력 검사 전에** failed(다시 부르지 않음) → 출력 검사 → 올린 사람 언어로 뜻 번역 → 저장(사용량 요약을 meta에). 단어 판정: 이름씨는
  그대로, 용언은 활용형도 받는다 — 앞 음절은 초성 · 모음, 끝 음절은 초성(배워 · 몰라 · 기다려), 한 음절 어간은 모음(줄어든 꼴 포함)이 맞고 바로 뒤에 한글이
  붙어야 한다(갔어 · 봤어 · 추워 · 들어 — 조사 「가」에는 걸리지 않음). 시간 예산 60초(시작 판정)를 넘으면 남은 줄은 모델 없이 failed — 그 줄도 그날 상한에 센다(모델을 부르지 않았어도, 보수적으로), 끊겨 30분 넘게 claimed로 남은
  줄은 다음 claim이 failed로 정리한다.
- 반응은 내 스토리 보기에만 선다(대화방 메시지로 넣지 않는다). 「Answer」는 그 인물의 방을 열고 입력 줄 위에 「You answered about your story」 인용 띠를
  붙인다 — 그 글은 **보통 메시지 요금**(친구 스토리의 첫 답장 무료와 다르다). 서버는 같은 `story_id` 칸으로 받고, 내 스토리면 `mine`으로 판정해 인용을 남기고
  지시에 「단어 · 인물이 단 반응」을 싣는다.
- 반응 알림(푸시)은 보내지 않는다(이번 단계) — 하루 한 번 알림 예산은 선톡 · 친구 스토리가 쓴다.

### D5. 비용 상한(서버 스위치 뒤)

- 스위치: `my_stories`(올리기 · 읽기 · 지우기) · `story_reactions`(반응 예약 · 만들기). 둘 다 off · testers · on, 기본 **off**.
- 상한(UTC 하루): 사람마다 올리기 `my_story_daily` = 3 · 사람마다 반응 `story_reaction_user_daily` = 3 · 전체 반응 `story_reaction_global_daily` = 500.
  반응 상한은 **claim 수**로 센다 — 모델 호출이 실패해도 센다(비용을 쓴 것으로). 사람 상한을 넘는 반응은 skipped, 전체 상한에 닿으면 다음 회차로 미루고
  올린 지 24시간이 지나면 skipped.
- 수는 **지워지지 않는 장부**(`my_story_usage` 사람 · 날마다 올리기 · claim, `my_story_usage_global` 날마다 claim)에 쌓는다 — 스토리를 지우거나 보관 끔
  정리로 지워져도 그날 쓴 양은 줄지 않는다(지우고 다시 올리기로 상한을 우회할 수 없다). claim은 그날 전체 장부 줄을 잠가 겹친 호출을 줄 세운다.
- 반응 하나 = 모델 호출 셋(답 · 출력 검사 · 번역). **사용자 결정(2026-11-23) — 검사 · 번역은 Haiku**: 반응 함수만 출력 검사 · 번역을 `claude-haiku-5-5`로 부르고(`_shared/companion-reaction-env.ts`, 바꿀 때 `COMPANION_REACTION_CHECK_MODEL` · `COMPANION_REACTION_TRANSLATION_MODEL`), 답은 컴패니언 답변 모델(`COMPANION_MODEL`, 기본 `claude-opus-5-5`) 그대로 — chat-send · 선톡은 바뀌지 않는다. 추정(캐시 없이): 답 입력 약 2.8k · 출력 약 300 (Opus 5.5 $4 / $20 per MTok) ≈ $0.0172, 검사 약 1.2k / 50 ≈ $0.00015, 번역 약 0.8k / 60 ≈ $0.00011(Haiku 5.5 $0.10 / $0.50) — **성공한 반응 하나 약 $0.0175, 단어가 없어 버린 반응 약 $0.0172**(답만). 상한이 다 차면 사람 하루 최대 약 $0.052(3개), 전체 하루 최대 약 $8.7(500개), 30일 약 $262.
- 건너뛰거나 실패한 반응에는 `skip_reason`(감사 A14): 사람 상한 `cap_user` · 24시간 지남 `expired` · 반응 스위치 꺼짐 `switch_off` · 끊겨 30분 넘은 claimed `stale` · 단어 없음 `no_word` · 시간 예산 `budget` · 그 밖 핸들러 결과(`not_allowed` · `blocked` · `empty_reply` · `failed` …). claim은 `{ rows, skippedCap, globalCapped }`을 돌려주고 반응 함수의 결과 · 로그에 `skipped_cap` · `global_capped`가 실린다.

### D6. 보관 · 지우기

- 친구(AI 인물)에게는 24시간만 「보인다」(반응 예약도 24시간 안). 내 보관함(설정 › My stories)에는 지울 때까지 남는다 — 스위치 「Keep my stories after
  24 hours」(기본 켬). 끄면 읽기는 살아 있는 것만, 서버 정리가 24시간 지난 것을 지운다.
- 지우기는 하나 · 모두, 확인 상자(되돌릴 수 없음 · 대화에는 「Deleted story」가 남는다). 반응은 cascade로 함께 지워지고, 대화 인용(`my_story_replies`)은
  `my_story_id`가 null → 기록 읽기의 `story`가 `{ kind: deleted }` → 앱 「Deleted story」.
- 설정 › My stories 줄은 이번 실행에 읽은 서버가 켜져 있을 때만 선다(목록을 한 번 연 뒤) — 서버 적용 전에는 줄이 없다.

### D7. 이벤트(ADR-0029, PostHog만)

이름 아홉(감사 2026-11-23 개정). 단어 · 예문은 싣지 않는다. 불리언은 불리언(초안이라 데이터 단절 없음).

- `my_story_create_opened { first: boolean }` — 「+」를 누름(처음 안내가 섰는가).
- `my_story_guide_closed { choice: start | later }` — 처음 안내를 닫음.
- `my_story_posted { kind }` · `my_story_post_failed { reason: off | daily_limit | failed }` — 올림 성공 · 실패.
- `my_story_viewed { reactions, unseen, from: row | archive | posted }` — 내 스토리를 엶(`unseen` = 그때 처음 본 반응 수). 보관함에서 열어도
  반응을 본 것으로 둔다.
- `my_story_answered { characterId }` — 반응의 Answer로 대화방에 감.
- `my_story_replied { characterId }` — 내 스토리 인용이 실린 글을 보냄. 친구 스토리의 `friend_story_replied`와 따로 센다.
- `my_story_deleted { scope: one | all, from: viewer | archive }` — `viewer` = 스토리 줄의 「Your story」에서 연 보기, `archive` = 설정 ›
  My stories(그 안에서 연 보기 포함).
- `my_story_keep_toggled { keep: boolean }` — 보관 스위치 저장이 끝난 뒤.
- 스토리 줄 노출 `friend_story_row_viewed`에 `mine: boolean`(줄 맨 앞 「+」가 섰는가) — 친구 스토리가 0개인 「+」만 있는 줄도 센다.
- 올리기 · 지우기 확인은 두 번 탭해도 요청 · 이벤트가 한 번(ref 가드).

## 대가

- 번들 +126 kB(로컬 5,603.8 → 5,729.7 kB, 천장 5,850.0 kB) — 남은 여유 약 120 kB. 화면 다섯 · CSS · 일곱 언어 문구표가 몫이다.
- 반응 비용의 대부분은 답(Opus)이다 — 검사 · 번역을 Haiku로 옮겨 약 $0.027 → $0.0175. 더 줄이려면 답 모델을 바꿔야 하는데 반응 글의 말투 · 품질과
  맞바꾼다(이번에는 답 모델을 그대로 둠).
- 단어가 안 들어간 반응은 버려 친구가 셋보다 적게 반응할 수 있다(다시 부르지 않는 대가).
- 단어 판정은 품사를 모른다 — 「바다」처럼 「다」로 끝나는 이름씨도 용언으로 보아 한 음절 어간(「바」)이 「바로」 · 「바빠」에 걸릴 수 있다(거짓 통과 —
  단어 없는 반응이 드물게 남을 뿐 비용은 늘지 않는다). 카드에 품사가 생기면 그것으로 가른다.
- 시간 예산으로 모델을 부르지 않고 끝낸 줄도 그날 상한에 센다(되돌리지 않음 — 상한을 넘지 않는 쪽으로 보수적).

## 스스로 정한 기본값

- 반응 인물 최대 3 · 시간차 8 ~ 25분 / 45 ~ 150분 / 3 ~ 7시간 · 사람 하루 올리기 3 · 사람 하루 반응 3 · 전체 하루 반응 500 · 예약 10분마다 · claim 12 · 동시 4 · 시간 예산 60초 ·
  claimed 30분 뒤 failed.
- 처음 안내는 보인 순간 봤음(Not now 포함). 레슨 카드는 단어장 기록이 있는 레슨 · 예문 있는 카드만. 반응 알림 없음. Answer 글은 보통 요금.
- 보관 스위치 기본 켬. 설정 줄은 서버가 켜져 있다고 읽은 실행에만.
- 화면 언어 문구의 Settings 이름은 각 언어 셸 문구(Ajustes · Pengaturan · 設定 · Cài đặt · ตั้งค่า · ဆက်တင်)를 따랐다.

## 확인

- 앱: `my-stories*.unit.test.ts`(MS-U1 ~ U12) · `companion-api.my-stories.unit.test.ts`(MS-S1 ~ S4) · `MessengerListScreen.my-stories.ui.test.tsx`
  (MS-UI1 ~ UI7) · `StoryQuote.my-stories.ui.test.tsx`(MS-UI8) · `MyStoriesScreen.ui.test.tsx`(MS-UI9 ~ UI12) · `SettingsScreen.my-stories.ui.test.tsx`(MS-UI13) ·
  `App.my-stories.integration.test.tsx`(MSI1 ~ MSI2).
- 서버: `my-stories.integration.test.ts`(MS1 ~ MS14) · `companion-reactions-handler.unit.test.ts`(RH1 ~ RH6) · `companion-reaction-prompt.unit.test.ts`
  (RP1 ~ RP4 · RP3b) · `chat-send-story.unit.test.ts`(SS1 ~ SS2).
- 기기: [e2e](../e2e/my-stories.md).

## 적용 기록

### ⟨2026-11-25⟩ 레슨 카드 올리기 없앰

사용자 결정(2026-11-25, 시안 27 X2Editor · 28 X3AddSheet). **앱은 `card`를 올리지 않는다.**

- 편집 오른쪽 도구의 Cards, 넣기 시트의 Lesson cards 탭 · 에피소드 거르기 칩, 레슨 카드 고를 거리(`my-stories-choices`의 cards ·
  `visibleCardsOf` · `LessonCardGroup`)를 지웠다. 시트 제목은 「Add a word」, 편집 안내는 「Add a word to share it.」, 처음 안내 첫 걸음은
  「Pick a word — From your saved words.」(여덟 언어). 안 쓰게 된 문구 키(탭 · 칩 · 카드 빈 안내 · 옛 만들기 화면 문구)도 지웠다.
- 앱의 올릴 거리 타입은 `kind: "word"`만 갖는다. 보기 쪽(`card` 스토리 그리기 · 「Lesson card」 꼬리표 · 보관함)과 계약 · 이벤트 값
  (`my_story_posted.kind`의 `card`)은 그대로 두고, 앱에서 `card` 값이 더는 나오지 않는다. 서버 `kinds` 기본값(`["word", "card"]`)도 읽기만 한다.
- 넣기 시트의 검색 칸(시안 28)은 이번 범위 밖이다.

### ⟨2026-11-25⟩ 앱 v2 — 서버 #588(ADR-0191) 반영 + 덕수쌤 퀴즈(서버 반영 예상)

사용자 결정(2026-11-25 「반영을 예상하고 화면 진행」, 시안 16 ~ 23 · 메모 `v2-what` · `v3-rules`). PR #565의 앱 작업을 main 위로 다시 올린
초안 PR(앱만)이 대신한다. 화면 · 계약 · 테스트는 [spec §1.5](../specs/my-stories.md).

- D3의 「Answer <이름>」 · 「You answered about your story」 띠 · 「Your friends will reply over the day.」와 D7의 `my_story_answered` ·
  `my_story_replied`는 [ADR-0191](0191-my-stories-reactions-as-chat.md)에 맞춰 바뀌었다 — 반응마다 **「Open chat」**(그 인물 방) ·
  `my_story_chat_opened { characterId, message }`, 막 올린 뒤 「Friends usually reply within an hour.」, Seen by, 올리기 창, 지우기 문구
  「Your card and the N replies on it will be removed. Messages in your chats stay …」. 이벤트 이름은 아홉 → 여덟.
- 앱 계약은 `@libitums/companion-contract` my-stories의 타입을 `import type`으로 잇는다(번들에 zod 없음, ADR-0132). 사진 · 확인 중 스토리는
  건너뛴다(사진 화면은 다음 단계).
- 문구는 여덟 언어(en · es · id · ja · my · th · vi · zh-TW — zh-TW 표를 새로 만듦, 원어민 검수 필요).

#### 서버에 요청하는 모양 — 덕수쌤 스토리 퀴즈(시안 21 ~ 23)

앱은 아래 칸을 **선택 칸**으로 읽는다. 칸이 없으면 퀴즈 표시가 하나도 없다(지금 서버에서 회귀 0). 엽전 차감 · 무료 판정 · 정답 판정 ·
친밀도는 서버 몫이고 앱은 표시만 한다.

1. **기록 읽기(`companion_list_messages`)의 메시지에 `meta`를 싣는다** — `companion.message_json`에 공개 칸만 골라 담은 객체, 없으면 `null`
   (내부 칸 `replacedBy` · 사용량 · 모델 이름은 싣지 않는다):

   ```json
   { "meta": { "angle": "quiz", "myStoryId": "<uuid>", "quiz": { … } } }
   ```

2. **퀴즈 반응** — 덕수쌤(`duksu`)의 반응 메시지(`role` assistant · `origin` `story_reaction`)에 지금처럼 `meta.angle = "quiz"` ·
   `meta.myStoryId`(20261228140000이 이미 저장), 그리고 **무료 답 신호 `meta.quiz.freeAnswer = true`**:

   ```json
   { "meta": { "angle": "quiz", "myStoryId": "<uuid>", "quiz": { "freeAnswer": true } } }
   ```

   **앱은 `freeAnswer === true`일 때만** 「Quiz answer is free」를 띄우고 보내기 관문을 건너뜁니다. 지금 서버(#592, 2026-11-25 main)는 퀴즈 각도를
   덕수쌤에게만 배정할 뿐(첫째 자리 word · quiz 또는 둘째 자리 question · quiz · together) 무료 답 · 정답 판정이 없어 실제로 엽전을
   받으므로, `angle`만 있는 반응은 퀴즈 표시 없이 보통 반응으로 다룹니다. 퀴즈 반응이 첫째 · 둘째 어느 자리로 오든 앱은 위치를 가정하지 않습니다
   (대화 기록 순서대로 마지막 퀴즈 반응 뒤의 내 글만 봄).
3. **내 답** — 퀴즈 반응 뒤 내 다음 글이 무료로 받아들여졌으면 그 user 메시지의 `meta.quiz`:

   ```json
   { "quiz": { "free": true, "attempt": 1, "result": "hint" } }
   ```

   - `free`: `true`일 때만 앱이 퀴즈 답으로 본다(엽전을 낸 글은 칸을 두지 않거나 `false`).
   - `attempt`: `1`(퀴즈 반응 뒤 첫 답) · `2`(힌트 뒤 마지막 답). 다른 값은 무시.
   - `result`: 판정이 끝나면 `"correct"`(그 단어 · 활용형이 들어 있음) · `"hint"`(1번째 틀림 — 다음 한 통 무료) · `"revealed"`(2번째 틀림 —
     정답 공개, 끝). 그 턴 안에서 정해 기록에 남긴다. 모르는 값 · 없음 = 아직 판정 전(앱은 「다음 답 무료」를 끈다).
4. **음성 선물은 없다**(사용자 결정 2026-11-25) — `meta.quiz.gift` · 무료 음성 줄을 요청하지 않고, 앱도 읽지 않는다. 맞힌 뒤 앱은 「Correct! You and {name} got closer」만 그린다.
5. 앱의 「다음 답 무료」 판정(`story-quiz.ts` `quizFreeOf`): 퀴즈 반응 뒤 내 글이 없으면 1번 무료, 내 1번 답의 `result`가 `hint`이면 2번(마지막)
   무료, 그 밖(판정 전 · `correct` · `revealed` · 퀴즈 표시 없는 내 글)은 무료 아님. 이 동안 앱은 보내기 관문(체험 · 엽전)을 건너뛰고
   `chat_message_sent { paid: false, cost: "0" }`만 낸다 — **서버도 같은 규칙으로 차감하지 않아야** 앱의 엽전 표시와 어긋나지 않는다.
6. 무료 퀴즈 답의 턴이 끝나면 앱이 기록을 한 번 다시 읽는다(판정만 — 음성은 다시 묻지 않음, SSE에는 퀴즈 칸이 없어도 된다).

#### 서버에 요청하는 모양 — 스토리 만들기: 시작 고르기 + 바탕 위 얹기(시안 26 ~ 28, 사용자 결정 2026-11-25)

앱은 아래를 **선택 칸**으로 읽습니다. 칸이 없으면 지금 서버(word · card)처럼 동작합니다(회귀 0).

1. **`companion_my_stories` 응답에 `kinds`** — 이 사람이 지금 올릴 수 있는 종류:

   ```json
   { "enabled": true, "keep": true, "stories": [], "window": { … }, "kinds": ["word", "card", "text"] }
   ```

   - 값: `"word"` · `"card"` · `"text"` · `"photo"`. 모르는 값은 버립니다. **칸이 없으면 `["word", "card"]`**.
   - `text`가 있어야 앱이 Aa(바탕 위 글 상자 — 교정 없음)와 스티커 여럿(최대 8 — `MY_STORY_OVERLAY_MAX`)을 켭니다. 없으면 바탕 위 스티커 **하나**, 글 없이 그 하나만 있을
     때 지금의 `companion_post_my_story`(word · card)로 올립니다.
   - `photo`가 있어도 이 앱 판은 사진 업로드 · 검수 화면이 없어 Camera · 최근 사진을 아직 그리지 않습니다(다음 단계).
2. **글 스토리 올리기 — `POST /functions/v1/companion-my-story`**, 사진 `post`와 같은 action에서 `image_path` 대신 `background`:

   ```json
   {
     "action": "post",
     "client_id": "<uuid>",
     "background": "orange",
     "ko": "오늘 처음 김치찌개 만들었어",
     "overlays": [
       { "kind": "text", "ko": "오늘 처음 김치찌개 만들었어", "roman": "oneul cheoeum gimchijjigae mandeureosseo",
         "color": "brown", "x": 0.5, "y": 0.3, "scale": 0.8, "rotation": 0 },
       { "kind": "word", "ko": "찌개", "roman": "jjigae", "meaning": "stew",
         "word": { "episodeId": "u05", "ref": "voca:jjigae" },
         "x": 0.5, "y": 0.55, "scale": 1, "rotation": -4 }
     ],
     "lang": "en",
     "tz_offset_min": 540
   }
   ```

   - `background`: `"orange"` · `"green"` · `"blue"` · `"purple"`(색 값은 앱이 정함).
   - `ko`: 한국어 한 줄. 글 없이 스티커만이면 빈 글(`""`) — 그때 overlays가 1개 이상.
   - **교정은 없습니다**(사용자 결정 2026-11-25) — `ko`는 사용자가 쓴 글 그대로이고, 앱은 `companion-my-story` `draft`를 부르지 않습니다. 요청에
     `meaning` · `original`을 싣지 않습니다. **뜻 줄(`meaning`)은 서버가 반응을 만들 때 채우거나 비워 둡니다**(앱은 없으면 뜻 줄을 그리지 않음).
   - `overlays`: 계약 `myStoryOverlaySchema` 그대로(위치 · 크기는 0 ~ 1 비율, 가운데 기준, 회전은 도), 최대 8 — **글 상자(Aa)도 하나의 overlay**
     (`kind: "text"`, `ko` · **앱이 만든 `roman`(`romanizeKorean`)**, 그리고 서버에 요청하는 새 선택 칸 **`color`: `"brown"` · `"black"` · `"white"` · `"orange"`**). 글 상자를
     키우고 줄이면 글자도 같은 비율로 바뀌며 그 값은 `scale`에 그대로 실립니다(줄바꿈은 다시 흐르지 않음). 요청의 `ko`는 그 글 상자의 글과 같습니다.
   - **검수는 이 올리기 요청 안에서만** 합니다. 막힌 글 = `{ "result": "text_blocked" }` → 앱은 「This text can't be shared. Try different words.」
     위기 신호 = `{ "result": "crisis", "resources": [{ "name", "phone"?, "url"?, "hours"? }] }`(대화 턴의 `crisis`와 같은 기관 모양) → 앱은 올리지 않고
     기존 위기 안내 카드(ADR-0125 `ChatCrisisCard`)를 Share 위에 띄웁니다.
   - 응답은 `myStoryResponseSchema`(`result` · `story` · `window`). 앱이 가르는 `result`: `ok`(+ `story`) · `window_used`(+ `window`) ·
     `daily_limit` · `off` · `text_blocked` · `crisis`(+ `resources`). 그 밖은 실패로 봅니다.
   - 창 · 24시간 상한은 다른 스토리와 같이 셉니다. 사진과 달리 연령 제한은 두지 않는 것으로 가정했습니다(사용자 메모 「미성년 제한 없음(사진만)」).
3. **읽기의 글 스토리** — `companion_my_stories`의 스토리:

   ```json
   { "id": "<uuid>", "kind": "text", "word": null, "ko": "…", "roman": "", "meaning": "…", "example": null,
     "background": "orange", "overlays": [ … ], "postedAt": "…", "expiresAt": "…", "reactions": [], "seenBy": [] }
   ```

   `background`가 없거나 모르는 값이면 앱은 `orange`로 그립니다. 반응 · Seen · 창은 다른 스토리와 같습니다.
4. **Aa(시안 29 · 30)** — 바탕 위 점선 상자에서 바로 쓰고(글자색 넷 · Done) Done이면 상자가 바탕 위 요소가 되며 Share가 바로 켜집니다. 상자는 스티커와 같은
   변환(끌기 · 두 손가락 · 모서리 손잡이)으로 크기를 바꾸면 글자도 같은 비율로 바뀌고, 다시 누르면 고쳐 씁니다.

#### 스스로 정한 것

- Open chat은 방을 열기만 하고 `messageId`로 스크롤하지 않는다 — 방 로그는 늘 끝으로 따라가고 반응은 최근 메시지다.
- 친구 0명 판정은 앱 근사(열린 방 중 대화가 있는 방이 하나도 없음). 서버 판정(내가 보낸 메시지가 있는 대화)과 다를 수 있다.
- 창 시트의 칸 경계(4 · 12 · 18시)는 서버 기본값을 앱에 고정했다 — 서버가 `my_story_rules`로 바꾸면 시트의 시각만 어긋난다(창 판정은 서버).
  지난 칸의 「올렸음」은 스토리 목록(24시간 안은 늘 있음)으로 본다.
- 퀴즈 표시는 덕수쌤으로 거르지 않는다 — 서버가 퀴즈 각도를 덕수쌤에게만 주므로 무료 신호(`quiz.freeAnswer`)가 있는 메시지면 그린다.
- 위기 신호(`crisis`)는 `my_story_post_failed { reason: "crisis" }`로 남긴다(이벤트 이유 값 하나 추가).
- 글 스토리 보기의 글 상자는 `roman`(앱이 만든 것)을 작은 줄로, `meaning`은 서버가 채웠을 때만 그린다.
