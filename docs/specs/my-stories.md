# 내 스토리 — 계약 · 계층별 테스트 계획 (ADR-0179)

결정은 [ADR-0179](../adr/0179-my-stories.md)이 정본이다. 친구 스토리([spec](friend-stories.md)) 위에 쌓는다(PR 2). 사진은 없다.

## 1. 계약

### 1.1 앱

- 타입 · 포트 · props · test-id: `apps/mobile/src/screens/messenger-chat/my-stories.contract.ts`, 문구표 `my-stories-copy.contract.ts`
  (`UiCopy.messengerChat.myStories`, 일곱 언어 `lib/ui-copy-<lang>-my-stories.ts`).
- 순수 판정 `my-stories.ts`: `mineRingOf(state, seen, now)`(「Your story」 — 꺼짐 null, 살아 있는 가장 새 스토리 · 안 본 반응) · `unseenReactionIdsOf` ·
  `archiveOf(state, now)`(최신 먼저, 보관 끄면 살아 있는 것만) · `dayOf(at, now)`(today · 월/일) · `draftOf(choice, clientId, lang)` ·
  `myQuoteOf(story, characterId)`(kind mine 인용) · `visibleCardsOf(groups, episodeId | null)`.
- 고를 거리 `app/my-stories-choices.ts` `myStoryChoicesOf(book, catalog, today)` — 단어장(별 먼저 → 처음 본 날 최근) · 배운 레슨의 예문 있는 카드.
- 응답 풀기 `my-stories-parse.ts`: `myStoriesFrom` · `myStoryPostFrom`. 인용 `friend-stories-parse.ts` `storyQuoteOf` — `kind: mine | deleted`.
- 원격 `lib/companion-my-stories-api.ts`(`ChatRemote.myStories` — list · post · remove · setKeep). 결선 `app/my-stories-wiring.ts`(`FriendStoriesPort.mine`).
- 화면: 줄 `MyStoryRowFaces`(「+」 · 「Your story」) · 처음 안내 `MyStoryGuide` · 만들기 `MyStoryComposer` · 보기 `MyStoryViewer`(+ `MyStoryOpen` 지우기 확인) ·
  설정 › My stories `MyStoriesScreen`(route `my-stories`). 상태 `use-my-stories.tsx`(목록).
- 대화 인용 `ChatStoryQuote.kind?: friend | mine | deleted` — 카드 · 띠의 캡션 「You answered about your story」 · 「Deleted story」.

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

### 1.4 사진 스토리 (ADR-0191 D11) — 서버만, 화면은 아직

- 계약: `packages/companion-contract/src/my-stories.ts`의 `myStoryRequestSchema` · `myStoryResponseSchema` · `myStoryOverlaySchema`. 서버 설명은
  `apps/supabase-functions/README.md` 「내 스토리 — 사진」.
- 앱의 흐름: ① (선택) 교정 `POST companion-my-story { action: "draft", text }` → ② 사진을 비공개 버킷 `my-story-photos/<user_id>/<파일>`에 올림
  (자기 토큰, 성인 · 스위치가 켜진 사람만) → ③ `{ action: "post", client_id, image_path, ko, overlays?, original?, lang, tz_offset_min? }` →
  `ok`(스토리의 `status`가 `checking`이면 「확인 중」) · `rejected`(+ `rejection.id` — 「다시 확인 요청」은 RPC `companion_request_story_review`) ·
  `window_used` · `text_blocked` · `age` · `check_limit` …
- 읽기(`companion_my_stories`)의 스토리에 `status` · `imagePath` · `overlays` · `lineOriginal` · `edits`가 더해졌다. 사진 스토리는 `word`가 null이다
  — **지금 앱의 풀기(`my-stories-parse.ts`)는 `word`를 꼭 요구하므로 사진 스토리가 오면 그 줄을 버린다.** 사진 화면과 함께 고친다.
- 화면이 그릴 상태: 올리는 중(앱 안) → 확인 중(`checking`) → 게시됨(`live`) / 거절. 글 고치기는 `{ action: "edit" }`(스토리당 3번).

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
| integration | MSI1 ~ MSI2 | 실제 App: Your story → Answer → 방 인용 띠 → 보낸 글에 인용 · 못 읽으면 「+」 없음 |
| integration(서버) | MS1 ~ MS17 | 스위치 · 올리기(창 · 24시간 상한) · 창 계산 · 답할 인물(가중 무작위 · 각도 · 시각) · Seen · claim(상한 · 대화 중 미룸 · 겹친 호출 · 오래된 claim) · 끝내기(인물 방의 메시지) · 지우기(메시지는 남음) · 정리 · mine 판정 · 푸시 문 · 스토리 맥락 |
| unit(서버) | RH1 ~ RH10 · RP1 ~ RP4 · RE1 ~ RE3 · SS1 ~ SS5 · MC1 ~ MC2 | 반응 함수(저장 · 푸시 · 칩) · 지시(각도) · 모델 환경 · chat-send mine 지시 · 스토리 맥락 · 계약 모양 |
| e2e | MS-E1 ~ E8 | [e2e](../e2e/my-stories.md) |
