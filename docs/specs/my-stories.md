# 내 스토리 — 계약 · 계층별 테스트 계획 (ADR-0194)

결정은 [ADR-0194](../adr/0194-my-stories.md)이 정본이다. 친구 스토리([spec](friend-stories.md)) 위에 쌓는다(PR 2). 사진은 없다.

## 1. 계약

### 1.1 앱

- 타입 · 포트 · props · test-id: `apps/mobile/src/screens/messenger-chat/my-stories.contract.ts`, 문구표 `my-stories-copy.contract.ts`
  (`UiCopy.messengerChat.myStories`, 일곱 언어 `lib/ui-copy-<lang>-my-stories.ts`).
- 순수 판정 `my-stories.ts`: `mineRingOf(state, seen, now)`(「Your story」 — 꺼짐 null, 살아 있는 가장 새 스토리 · 안 본 반응) · `unseenReactionIdsOf` ·
  `archiveOf(state, now)`(최신 먼저, 보관 끄면 살아 있는 것만) · `dayOf(at, now)`(today · 월/일) · `draftOf(choice, clientId, lang)` ·
  `myQuoteOf(story, characterId)`(kind mine 인용). 레슨 카드 거르기(`visibleCardsOf`)는 없앴다(2026-11-25 — 앱은 card를 올리지 않음).
- 고를 거리 `app/my-stories-choices.ts` `myStoryChoicesOf(book, catalog, today)` — 단어장(별 먼저 → 처음 본 날 최근) · 배운 레슨의 예문 있는 카드.
- 응답 풀기 `my-stories-parse.ts`: `myStoriesFrom` · `myStoryPostFrom` · `myStoryWindowOf`. 인용 `friend-stories-parse.ts` `storyQuoteOf` — `kind: mine | deleted`.
  ⟨2026-11-25 앱 v2⟩ 서버 모양의 정본은 `@libitums/companion-contract` my-stories — 앱 계약(`my-stories.contract.ts`)은 그 타입을 `import type`으로
  잇고(번들에 zod 없음) 시각만 epoch ms로 푼다. 사진(`photo`) · 확인 중(`checking`) 스토리는 건너뛴다.
- 원격 `lib/companion-my-stories-api.ts`(`ChatRemote.myStories` — list · post · remove · setKeep). 결선 `app/my-stories-wiring.ts`(`FriendStoriesPort.mine`).
- 화면: 줄 `MyStoryRowFaces`(「+」 · 「Your story」) · 처음 안내 `MyStoryGuide` · 만들기 `MyStoryComposer` · 보기 `MyStoryViewer`(+ `MyStoryOpen` 지우기 확인) ·
  설정 › My stories `MyStoriesScreen`(route `my-stories`). 상태 `use-my-stories.tsx`(목록).
- 대화 인용 `ChatStoryQuote.kind?: friend | mine | deleted` — 카드의 캡션 「You answered about your story」(내 글) · 「Replied to your story」(인물의 반응,
  ⟨2026-11-25⟩) · 「Deleted story」. 「Answer」 인용 띠는 없앴다(띠는 친구 스토리만).

### 1.2 서버 (파일만 — 운영 미적용) — ADR-0191로 고쳐 씀 ⟨2026-11-24⟩

- 마이그레이션 `20261228140000_my_stories.sql` · Edge Function `companion-story-reactions`(매분) · `chat-send`(스토리 맥락 · `story_id`가 내 스토리면
  `mine`) · 예약 `cron/my-stories.sql`. 자세한 칸 · 상한 · 규칙 수치는 `apps/supabase-functions/README.md` 「내 스토리」.
- 앱 RPC의 모양은 `packages/companion-contract/src/my-stories.ts`가 정본이다(ADR-0191 D12).
- **반응은 그 인물 방의 채팅 메시지다**(origin `story_reaction`). `companion_my_stories`의 `reactions`는 그 메시지를 모은 목록이고 모양은 그대로다
  (+ `messageId`).

### 1.3 서버가 바뀌어 화면이 따라올 것 (ADR-0191 D12)

| 무엇 | 서버 | 화면 |
| --- | --- | --- |
| 올리기 창 | `companion_post_my_story` 결과에 `window_used`(+ `window.nextAt`) · 읽기에 `window { slot, day, nextAt, used }` · 인자 `p_tz_offset_min`(기기 UTC 차이, 분) | 「+」의 창 상태(지금 열림 · 다음 창 시각) · `window_used` 안내. 지금 앱은 모르는 결과를 `failed`로 본다 |
| Seen by | 읽기의 스토리마다 `seenBy [{ characterId, at }]`(시각이 된 인물만, 스위치 끄면 빈 목록) | 「Seen by N」 |
| 반응이 대화방에 옴 | 인물 메시지(`assistant`)의 `story`가 `{ kind: mine }` · 지우면 `{ kind: deleted }` | 대화방의 「Replied to your story」 카드(시안 7) · 「Deleted story」 |
| 답하기 | 방에 와 있는 메시지에 그냥 답한다(보통 요금). `story_id`를 실은 답(인용 띠)도 계속 받는다 | 「Answer」는 방을 열기만 해도 된다 — 인용 띠는 없어도 된다 |
| 도착 시각 | 첫 답 1 ~ 5분 · 둘째 60분 안, 최대 둘 | 「Your friends will reply over the day」 문구 |
| 반응 알림 | 푸시 목적지 `{ kind: "companion-chat", characterId }` | 새 처리 없음(선톡 푸시와 같은 목적지) |
| 지우기 | 스토리 위 답 목록은 사라지고 대화방의 반응 글은 남는다 | 지우기 확인 문구 |

### 1.4 사진 스토리 (ADR-0191 D11) — ⟨2026-11-25⟩ 앱은 ADR-0199

- 계약: `packages/companion-contract/src/my-stories.ts`의 `myStoryRequestSchema` · `myStoryResponseSchema` · `myStoryOverlaySchema`. 서버 설명은
  `apps/supabase-functions/README.md` 「내 스토리 — 사진」.
- 앱의 흐름: ① (선택) 교정 `POST companion-my-story { action: "draft", text }` → ② 사진을 비공개 버킷 `my-story-photos/<user_id>/<파일>`에 올림
  (자기 토큰, 성인 · 스위치가 켜진 사람만) → ③ `{ action: "post", client_id, image_path, ko, overlays?, original?, lang, tz_offset_min? }` →
  `ok`(스토리의 `status`가 `checking`이면 「확인 중」) · `rejected`(+ `rejection.id` — 「다시 확인 요청」은 RPC `companion_request_story_review`) ·
  `window_used` · `text_blocked` · `age` · `check_limit` …
- 읽기(`companion_my_stories`)의 스토리에 `status` · `imagePath` · `overlays` · `lineOriginal` · `edits`가 더해졌다. 사진 스토리는 `word`가 null이다
  — **지금 앱의 풀기(`my-stories-parse.ts`)는 `word`를 꼭 요구하므로 사진 스토리가 오면 그 줄을 버린다.** 사진 화면과 함께 고친다.
- 화면이 그릴 상태: 올리는 중(앱 안) → 확인 중(`checking`) → 게시됨(`live`) / 거절. 글 고치기는 `{ action: "edit" }`(스토리당 3번).
- ⟨2026-11-25 — [ADR-0199](../adr/0199-my-story-photo-app.md)⟩ 앱이 사진을 그린다: 풀기가 사진 · 확인 중 스토리를 읽고(`status` · `imagePath`), 교정 ①은
  쓰지 않는다(Aa 글 상자 그대로 — 글 스토리와 같음), 글 고치기(`edit`)는 이번 범위 밖. 계약 · 테스트는 ADR-0199 「확인」. 호스트 `StoryPhotoModule`.

### 1.5 앱 v2 — 서버 #588 반영 + 덕수쌤 퀴즈 ⟨2026-11-25⟩ (시안 16 ~ 23)

| 무엇 | 앱 |
| --- | --- |
| 반응 목록(16) | 「N friends replied」(0이면 「No replies yet」) · 오른쪽 Seen by(방이 있는 인물 얼굴 최대 넷 + 서버 수) · 반응마다 얼굴 · 이름 · 경과 / 말 / 「뜻」 / **Open chat ›**(brand.primary 알약) → `openReactionChat` = 그 인물 방(`messageId`로 스크롤은 하지 않음 — 방은 끝으로 따라감) · 맨 아래 「Replies are saved in each friend's chat.」 |
| 막 올린 뒤(17) | 답 0 · 살아 있음: 「Friends usually reply within an hour.」 + 본문. 답할 친구가 없으면(`hasFriendsOf` — 열린 방 중 대화가 있는 방 0) 「Add a friend to get replies」 + Find friends(친구 찾기 화면, 목록에서만) |
| 올리기 창(18) | 읽기 · 올리기에 `p_tz_offset_min`(`tzOffsetMinOf` = −getTimezoneOffset). 창을 썼고 다음 창 전이면(`nextOpenOf`) 「+」 자리가 시계 + 시각 · 「Next story」, 누르면 창 시트(`windowSheetOf` — 아침 4–12 · 낮 12–18 · 밤 18–4, 지난 칸 shared/missed · 지금 shared/open · 다음 upcoming). 결과 `window_used`는 만들기에 「…The next one opens at 6 PM.」, `daily_limit`은 하루 안내 |
| 지우기(19) | 「Your card and the N replies on it will be removed. Messages in your chats stay, with a “Deleted story” note. You can't undo this.」 |
| 대화방(20) | 기록의 인물 메시지(origin `story_reaction`)의 `story`를 첫 말풍선에 싣고 그 위 인용 카드(「Replied to your story」 · 단어 · 경과), 지우면 「Deleted story」. 목록 미리보기는 반응 글 |
| 처음 안내 | 둘째 걸음 「Friends reply within the hour — Their replies show up in each friend's chat.」(「Tap Answer」 · 「over the day」 없음) |
| 반응 푸시 | 목적지 `{ kind: "companion-chat", characterId }`(story 없음) = 그 방 — 기존 경로 그대로(MS-U22) |
| 덕수쌤 퀴즈(21 ~ 23) | **서버 반영 예상** — `companion-parse.ts` `quizMarkOf`가 기록 `meta`의 선택 칸을 `ChatQuizMark`로 푼다(ADR-0194 적용 기록 「서버에 요청하는 모양」). 무료 표시 · 관문 건너뛰기는 **서버가 명시적으로 무료라고 알릴 때만**(퀴즈 반응 `meta.quiz.freeAnswer === true`, 내 답 `meta.quiz.free === true`) — `meta.angle === "quiz"`만이면(지금 서버 #592) 보통 반응. 퀴즈 반응의 자리(첫째 · 둘째)는 가정하지 않음. `quizFreeOf`가 「다음 답 무료」면 입력 칸 위 「Quiz answer is free」 · 보내기 단추 엽전 없음 · 앱 관문(체험 · 엽전) 건너뜀. 내 답 아래 「Free · quiz answer」 · 「Free · last try」, 맞힘이면 가운데 「Correct! You and {name} got closer」(음성 선물은 없앰 — 사용자 결정 2026-11-25). 무료 답 턴이 끝나면 기록을 다시 읽는다(판정만). 칸이 없으면 퀴즈 표시 0 |
| 이벤트 | `my_story_chat_opened { characterId, message }`(옛 answered · replied 대신) · `my_story_post_failed.reason`에 `window_used` |

### 1.6 스토리 만들기 — 시작 고르기 + 바탕 위 얹기 ⟨2026-11-25⟩ (시안 26 ~ 28)

| 무엇 | 앱 |
| --- | --- |
| 시작(26) | 「+」(처음이면 안내 뒤) → 시트 「New story」: Background(색 바탕). Camera · 최근 사진은 `kinds`에 photo가 있고 사진 길이 있을 때만 — 이 판은 숨김 |
| 편집(27) | 전체 화면 층 `MyStoryEditor`: 뒤로 · 바탕색 넷(Orange · Green · Blue · Purple) · 오른쪽 도구 Aa(글 서버만) · Words(Cards는 2026-11-25에 뺌) · 바탕 위 스티커(끌기 · 두 손가락 크기 0.5 ~ 3 · 회전 · 고르면 ×) · 아래 안내 · Share with friends(올릴 길이 없으면 꺼짐) |
| Aa(29 · 30) | `MyStoryTextEntry`: 바탕이 어두워지고 가운데 점선 상자에서 휴대폰 키보드로 바로 씀(80자) · 위에 글자색 넷 · Done. Done이면 `MyStoryTextBox`가 바탕 위 요소(끌기 · 두 손가락 · 모서리 손잡이로 크기 — 글자도 같은 비율 · 다시 누르면 고쳐 쓰기)가 되고 Share가 바로 켜짐. **교정 없음**(사용자 결정 2026-11-25) — 쓴 글 그대로 올리고 검수는 올리기 요청 안에서 서버가: `text_blocked` → 안내, `crisis` → 위기 안내 카드(`ChatCrisisCard`). 글 상자 overlay에 앱이 만든 로마자(`romanizeKorean`) · 글자색(`typedText` · `textOverlayOf` · `resizeSticker`) |
| 넣기(28) | `MyStoryAddSheet` 「Add a word」: 단어장 단어 칸 격자만(탭 · 거르기 칩 없음 — 레슨 카드는 올리지 않음), 누르면 스티커로 놓고 닫힘. 검색 칸은 범위 밖 |
| 판정 | `my-story-editor.ts` — `editorCapsOf(kinds)`(text → Aa · 스티커 8, 없으면 1, 단어 도구는 word 또는 text, 옛 단어 RPC는 word가 있을 때만 — #598) · `placeSticker` · `moveSticker` · `pinchSticker` · `editorShareOf`(word를 받는 서버에서 글 없이 스티커 하나 → 단어 RPC, 그 밖의 글 서버 → 색 바탕 스토리) |
| 서버 계약 | 서버 PR #598(ADR-0191 D13 · D14 · D15)에 맞춤 — `kinds`(text · photo) · 색 바탕 올리기(`action: post` + `background`, `client_region`) · 결과 `check_limit` · `invalid` · 읽기의 `kind: text`(`background` · `overlays` · 글 없는 단어만 스토리) · 퀴즈 답 `skipped`. 대조표는 ADR-0194 적용 기록 |
| 보기 | 글 스토리는 바탕색 카드 + 한 줄 · 「뜻」 + 얹은 단어(제자리) |

## 2. 테스트 계획

| 계층 | id | 무엇 |
| --- | --- | --- |
| unit | MS-U1 ~ U6 | 고리 · 보관함 · 날짜 · 올리기 요청 · 인용 · 카드 거르기 (`my-stories.unit.test.ts`) |
| unit | MS-U7 ~ U9 | 응답 · 올리기 결과 · 인용 kind 풀기 (`my-stories-parse.unit.test.ts`) |
| unit | MS-U10 | 일곱 언어 문구 (`ui-copy-my-stories.unit.test.ts`) |
| unit | MS-U11 ~ U12 | 고를 거리 (`my-stories-choices.unit.test.ts`) |
| unit | MS-S1 ~ S4 | RPC 경로 · 인자 · 실패 (`companion-api.my-stories.unit.test.ts`) |
| ui | MS-UI1 ~ UI7 | 목록: 「+」 · 처음 안내 · 만들기(단어 · 카드 · 상한 안내) · Your story · 답하기 · 지우기 · 닫기 |
| ui | MS-UI8 | 인용 카드 · 띠 kind |
| ui | MS-UI9 ~ UI12 | 설정 › My stories: 칸 · 보관 스위치 · 하나 · 모두 지우기 · 답하기 |
| ui | MS-UI13 | 설정 줄 |
| unit | MS-U13 ~ U19 · MS-U22 | v2: 읽기(messageId · seenBy · 창 · photo/checking 건너뜀) · 올리기 결과(window_used) · UTC 차이 · 「+」 자리 · 창 시트 · 친구 0명 · 퀴즈 무료 판정 · 반응 푸시 목적지 (`my-stories-v2.unit.test.ts` · `push-target.unit.test.ts`) |
| unit | MS-U20 ~ U21 | 기록의 반응 인용 · 퀴즈 meta 풀기 (`story-quiz-parse.unit.test.ts`) |
| ui | MS-UI22 ~ UI26 | 목록 v2: 반응 목록(Open chat · Seen by · 저장 안내) · 막 올린 뒤 · 친구 0명 · 창 「+」 · 창 시트 · window_used · 지우기 문구 (`MessengerListScreen.my-stories-v2.ui.test.tsx`) |
| ui | MS-UI27 ~ UI30 | 대화방: 반응 인용 · 지운 스토리 · 미리보기 · 퀴즈 띠 · 무료 보내기 · 맞힘 · 틀림 (`MessengerChatScreen.my-stories.ui.test.tsx`) |
| integration | MSI1 ~ MSI3 | 실제 App: Your story → Open chat → 그 방(띠 없음) · 읽기에 UTC 차이 · 못 읽으면 「+」 없음 · 창을 쓴 「+」 → 창 시트 |
| unit | MS-U30 ~ U31 | 글 상자 · 모서리 손잡이 (`my-story-editor.unit.test.ts`) |
| unit | MS-U23 ~ U29 | 만들기: 도구 · 스티커 놓기 · 끌기/두 손가락 · 올릴 길 · kinds/글 스토리 풀기 · 교정 없음(뜻 · 원래 글 안 실음, 로마자) · crisis 결과 (`my-story-editor.unit.test.ts`) |
| ui | MS-UI31 ~ UI37 | 시작 시트 · 지금 서버 편집 · 스티커 × · 두 손가락 · 글 서버 Aa(바탕 위 상자 · 글자색 · Done) → 글 스토리 · crisis → 위기 카드 · text_blocked · 포트가 던져도 다시 Share (`MyStoryEditor.ui.test.tsx`) |
| unit | MS-U40 ~ U44 | #598 계약 — 도구 · 올릴 길(새/옛 서버) · kinds · check_limit · invalid · 단어만 색 바탕 스토리 읽기 · 퀴즈 skipped · 요청 몸(`client_region`) (`my-stories-598.unit.test.ts`) |
| ui | MS-UI38 | 새 서버: Aa · Words, 단어 하나도 색 바탕 스토리, check_limit 안내 (`MyStoryEditor.ui.test.tsx`) |
| integration | MSI6 | 실제 App: kinds에 text → Aa → Done → Share가 함수 결선으로 글 스토리, 없으면 Aa 없음 |
| integration | MSI4 ~ MSI5 | 기록 JSON → 풀기 → 서버 모드 출처 → 방: 무료 신호 있음(무료 답 → 다시 읽기 → 판정 표시) / 각도 quiz만(#592 — 보통 엽전 관문) (`story-quiz.integration.test.tsx`) |
| integration(서버) | MS1 ~ MS17 | 스위치 · 올리기(창 · 24시간 상한) · 창 계산 · 답할 인물(가중 무작위 · 각도 · 시각) · Seen · claim(상한 · 대화 중 미룸 · 겹친 호출 · 오래된 claim) · 끝내기(인물 방의 메시지) · 지우기(메시지는 남음) · 정리 · mine 판정 · 푸시 문 · 스토리 맥락 |
| unit(서버) | RH1 ~ RH10 · RP1 ~ RP4 · RE1 ~ RE3 · SS1 ~ SS5 · MC1 ~ MC2 | 반응 함수(저장 · 푸시 · 칩) · 지시(각도) · 모델 환경 · chat-send mine 지시 · 스토리 맥락 · 계약 모양 |
| e2e | MS-E1 ~ E8 | [e2e](../e2e/my-stories.md) |
