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

### 1.2 서버 (파일만 — 운영 미적용)

- 마이그레이션 `20261228140000_my_stories.sql` · Edge Function `companion-story-reactions` · `chat-send`(`story_id`가 내 스토리면 `mine`) ·
  예약 `cron/my-stories.sql`. 자세한 칸 · 상한은 `apps/supabase-functions/README.md` 「내 스토리」.

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
| integration(서버) | MS1 ~ MS14 | 올리기 · 상한(지워지지 않는 장부) · 스위치 · 예약 · claim(겹친 호출 · 오래된 claim 정리) · 지우기 cascade · Deleted story · 정리 · mine 판정 · 단어 칸 길이 |
| unit(서버) | RH1 ~ RH6 · RP1 ~ RP4 · RP3b · SS1 ~ SS2 | 반응 함수 · 지시 · 단어 어간 · chat-send mine 지시 |
| e2e | MS-E1 ~ E8 | [e2e](../e2e/my-stories.md) |
