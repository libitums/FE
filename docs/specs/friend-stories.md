# 친구 스토리 1단계 — 계약 · 계층별 테스트 계획 (ADR-0178)

결정은 [ADR-0178](../adr/0178-friend-stories.md)이 정본이다. 여기는 그 결정을 구현이 기댈 모양과 테스트 계획으로 고정한다.
PR 1 = 친구 스토리(보기 · 답장 · 안 만난 친구 · 스토리 줄 · 첫 답장 무료 · 알림). PR 2(내 단어 · 카드 스토리)는 이 문서에 절을 더한다.

## 1. 계약

### 1.1 앱

- 타입 · 포트 · 문구표 · props · test-id: `apps/mobile/src/screens/messenger-chat/friend-stories.contract.ts`.
- 순수 판정: `friend-stories.ts`
  - `liveStoriesOf(stories, now)` — `expiresAt > now`만.
  - `storyRowOf({ stories, rooms, suggested, seen, now })` → `StoryRow` — 친구(열린 방의 인물) · 안 만난 친구(추천 대상)를 각각 `byLatestStory` 순으로, 그 밖 추천.
    한 인물에 스토리가 둘 이상이면 가장 새 것 하나. 본 것은 `seen` 표시만(순서에 안 씀, D3 개정 ⟨2026-11-25⟩).
  - `story-order.ts` `storyOrderOf(row)` → 친구 · 안 만난 친구를 한 줄로 합친 칸 순서(최신 `postedAt` 내림차순, 같으면 인물 id 오름차순).
    줄과 `viewerItemsOf`(이어 보기 · 친구 열기의 다음 인물)가 함께 쓴다. `byLatestStory`는 그 비교.
  - `storyAgeOf(postedAt, now)` → `StoryAge`.
  - `viewerItemsOf(row, from, …)` — 줄 · 이어 보기 · 알림에서 연 보기의 장 목록과 시작 칸.
  - ~~`listStoryOf(row, characterId)` — 채팅 목록 줄의 「New story」~~ 없앰(ADR-0178 D3 개정 2, 2026-11-26).
  - `viewerStep(state, action)` — 보기의 칸 이동(next · prev · tick → 끝이면 close).
  - `seenRecordsWith(records, id, expiresAt, now)` — 본 것 표시(만료 지난 것 지움).
- 응답 풀기: `friend-stories-parse.ts` `friendStoriesFrom(body)` — 모양이 틀린 줄은 버리고, 몸이 틀리면 null.
- 대화 출처: `ChatSource.sendText(roomId, text, options?: { story?: ChatStoryQuote })`. 서버 방은 `story_id`를 실어 보낸다. 텍스트 메시지 `story?: ChatStoryQuote`.
- 넘김: `story-reply-handoff.ts` — 목록이 남기고 대화방이 마운트 때 한 번 꺼낸다(D5 개정 뒤에는 안 만난 친구 추가 → 인용 띠만).
- 보기에서 바로 답장(D5 개정): 순수 `story-inline-reply.ts` — `storyReplyGateOf`(첫 답장 무료 · 체험 · 엽전) · `storyReplyStatusOf`(보낸 글의 배달 상태) ·
  `canSendStoryReply`. 목록 훅 `use-story-inline-reply.ts`(관문 · 보냄 · 상태 구독), 보기 훅 `use-story-viewer-reply.ts`(입력 중 · 보내는 중 · 알림 · 키보드 높이),
  부품 `StoryReplyInput.tsx` · `StoryReplyArea.tsx`. 포트 `FriendStoriesPort.replyPlan`(체험 · 등급) · `keyboardHeightStore`.

### 1.2 서버 (파일만 — 운영 미적용)

- 마이그레이션 `20261228120000_friend_stories.sql`(표 · 함수 · 관문 패치 · `message_json.story`) · `20261228130000_friend_stories_pool.sql`(묶음 27줄,
  정본 `docs/content/friend-stories.json`).
- RPC: `companion_friend_stories()`(authenticated) · `companion_post_stories(now)` · `companion_claim_story_reply(…)` ·
  `companion_story_push_candidates(now, limit)`(서버 역할) · `companion_proactive_push_gate`(+`pushedToday`).
- chat-send 요청 선택 칸 `story_id`(uuid). Edge Function `companion-stories`. `send-push` companion-chat 목적지에 `story: true`.
- pg_cron `supabase/cron/friend-stories.sql`(매시 5분).

### 1.3 AI 생성 (ADR-0192) — 서버만, 화면은 아직 ⟨2026-11-24⟩

- 마이그레이션 `20270105120000_friend_story_generation.sql` · Edge Function `companion-story-studio`(주간 기획) · `companion-story-images`(그림 일꾼) ·
  예약 `supabase/cron/friend-story-images.sql`. 앱 계약(`companion_friend_stories()`의 모양)은 **바뀌지 않았다** — 승인된 초안이 묶음의 그날짜 줄이 된다.
- 운영 도구(ops-dashboard 「스토리 스튜디오」)가 서버 키로 부른다. 자세한 것은 함수 앱 README 「친구 스토리 — AI 생성」.

**화면이 따라올 것**(서버 스위치 `story_schedule = 'cadence'`를 켜기 전에):

| 무엇 | 지금 화면 | 바뀌는 것 |
| --- | --- | --- |
| 인물마다 늘 스토리가 하나 | 스토리 줄 · 목록 줄이 인물마다 살아 있는 스토리를 기대 | 차례가 아닌 날에는 그 인물의 스토리가 **없다**(덕수쌤 매일 · 윤경 주 1회 · 나머지는 사흘에 한 번). 응답에 없는 인물은 줄에서 빠지면 된다 |
| 단어 알약(「Save word」) | 묶음 스토리는 거의 다 단어가 있음 | 덕수쌤이 아닌 인물의 스토리는 대부분 `word: null` — 알약 없이 그린다. `word`에 `ko` 칸이 더 올 수 있다(모르는 칸은 무시) |
| 그림 | 가로 · 세로가 섞인 콘텐츠 그림 | 생성한 그림은 세로 2:3(1024x1536) webp, 경로는 `content/images/friend-stories/<인물>/…` — 지금 해석기 그대로. 셀카 · 남이 찍어 준 컷 · 인물 없는 컷(손까지)이 3 : 2 : 5로 섞인다 |
| 잠긴 인물의 스토리(ADR-0192 D7) | 추천 대상 · 열린 방의 인물만 줄에 섬 | 아직 만나지 않은 이야기 인물의 스토리도 줄에 서고, 답하려고 하면 해금 안내(ADR-0162의 잠긴 인물 시트)를 띄운다. 서버 읽기는 지금도 해금으로 거르지 않는다 |
| 한 줄의 길이 | 묶음은 20 ~ 30자 | 최대 60자(한두 문장). 로마자는 그만큼 길다 |

## 2. 계층별 테스트 계획

| 계층 | 적용 | 무엇 |
| --- | --- | --- |
| unit | 적용 | 순수 판정 · 응답 풀기 · 본 것 저장 · 보기 칸 이동 · 콘텐츠 정합(그림 경로 · 단어 ref가 에피소드에 있는가) · 이벤트 이름 수 · 문구 일곱 언어 |
| ui | 적용 | 스토리 줄 · 보기(내 친구 · 안 만난 친구) · 인용 카드 · 인용 띠 · 목록 화면이 스토리 유무로 줄을 바꿈 |
| integration | 적용 | 앱: 목록 → 보기 → 칩 → 대화방에 인용 + 서버 요청 `story_id`, 답장 칸 → 인용 띠 → 보냄, 안 만난 친구 추가 → 답장, 알림 목적지 `story: true`. 서버: SQL 통합 · chat-send · companion-stories 단위/통합 |
| e2e | 문서 절차 | `docs/e2e/friend-stories.md` — 기기에서 사람이 본다(러너 없음, ADR-0013). 시뮬레이터 · `assembleBundled` 확인은 가짜 출처 탐침 |

### 2.1 unit (앱)

- FS-U1 `liveStoriesOf`: 만료 경계(= now는 뺌).
- FS-U2 `storyRowOf`: 열린 방 인물 → friends(본 것과 상관없이 최근 순); 추천 대상 → unmet(최근 순), 스토리 없는 추천 → others; 방이 없는 인물 · 숨긴 인물은 없음.
- FS-U3 한 인물에 둘이면 최신 하나.
- FS-U4 `storyAgeOf`: 59초 now · 1분 · 59분 · 1시간 · 23시간.
- ~~FS-U5 `listStoryOf`~~ 없앰(D3 개정 2 — 목록 줄에 스토리를 띄우지 않음).
- FS-U6 `viewerStep`: next 끝 → close, prev 처음 → 그대로, tick = next.
- FS-U7 `seenRecordsWith`: 만료 지난 표시를 지우고 새 표시를 더함, 같은 id 덮어씀.
- FS-U8 `friendStoriesFrom`: 정상 · 칸 빠짐 버림 · 몸 틀림 null · 시각 문자열 → ms · 칩 3개 넘으면 앞 3개.
- FS-U9 콘텐츠 정합: 27줄 · id 유일 · 그림 경로가 에피소드 JSON에 있음 · 단어 ref가 그 에피소드 단어에 있음 · 뜻 일곱 언어.
- FS-U10 `viewerItemsOf`: 줄 친구 → 그 칸부터 친구 스토리 끝까지, 안 만난 친구 → 한 장, 이어 보기 → 처음부터, 알림 → 그 인물 한 장(없으면 null).
  친구 장 순서는 `storyOrderOf`의 친구 칸 순서와 같다(D3 개정).
- FS-U11 분석 이름 수(넷 추가) · Airbridge로 보내지 않음.
- FS-U12 본 것 저장(기기): 계정마다 열쇠, 망가진 값은 빈 표시.
- FS-U13 문구표 일곱 언어가 같은 칸을 가짐(문구 테스트 지원 함수).
- FS-U15 `storiesAfterLoad`(ADR-0178 「다시 읽기」): 읽으면 새 목록(빈 목록 포함), null이면 있던 목록, 첫 실패는 null. `STORY_RELOAD_MS` = 5분.
- FS-U16 결선 `subscribeReload` · `notifyFriendStoriesReload`: 알리면 건 리스너가 불리고, 뗀 뒤로는 불리지 않음.
- FS-U17 `storyOrderOf` · `byLatestStory`(`story-order.unit.test.ts`, D3 개정): 친구 · 안 만난 친구를 한 줄로 최신 순, 본 것은 순서에 안 씀, 같은 시각은 인물 id 순(입력 순서 무관),
  한 인물은 그 최신 스토리로, 스토리 없는 추천은 빠지고 입력을 바꾸지 않음.
- FS-U18 `storyReplyGateOf`: 무료 안내 → story-free(엽전 0이어도) · 관문 재료 없음 · 무제한 → open · 체험 남음/모름 → trial · 엽전 → pay(서버 방은 지갑에서 안 뺌) · 모자람 → short.
- FS-U19 `storyReplyStatusOf`: 방 없음 · 새 글 없음 · 다른 스토리 → failed, 가짜 출처 → sent, 앱 id → sending, 서버 id → sent, Not sent · 실패 줄 → failed(no-credits → coins), 입력 막힘 → failed.
- FS-U20 `canSendStoryReply`: 빈 글 · 공백 · 보내는 중이면 거짓.
- FS-U21 ~ U24 인물 묶음(D4 개정, `friend-stories.groups.unit.test.ts`): 인물마다 올린 시각 순 · 줄 칸은 최신 · 본 것은 다 봤을 때, 보기 장 목록 = 묶음 이어 붙임 · 안 본 첫 장부터,
  `viewerGroupOf`(묶음 시작 · 칸 수 · 자리), `viewerJump`(다음 인물 · 마지막이면 닫힘 · 이전 인물의 첫 장).
- FS-U25 `modelOfMetFriend`(`suggested-friends-ui.unit.test.ts`): 카탈로그 인물 → 소개 · 태그 · 첫 말 + 방 이름 · 얼굴, 없으면 이름 · 얼굴만, 상태 `added` · 제안 없음.
- FS-U26 ~ U32 인물 넘김 큐브(D4 개정 ⟨큐브⟩, `story-cube.unit.test.ts`): 손가락 방향(8px · 가로 우세) · 넘김 방향, 돈 몫(폭 비례 · 옆 인물 없으면 1/4), 두 면의 변환(축 · 각도 · 맞닿은 모서리 · 그늘),
  놓았을 때(48px · 반 · 0.5px/ms 같은 방향), 남은 몫의 시간, 옆 인물 면의 장(전환 중엔 방금 장), 쉬는 자리 = 다 돈 끝 값.

### 2.2 ui (앱)

- FS-UI1 줄: 제목 「Stories」(머리글) · Watch all · 스토리 있는 칸(친구 · 안 만난 친구 함께 최신 순 — 친구는 이름 · 경과, 본 것은 Seen, 안 만난 친구는 New) · 추천 · Find friends.
  구분 선 없음(D3 개정 — 고리 모양으로만 가름). 낭독 이름.
- FS-UI2 줄 탭 → 콜백(친구 · 안 만난 · 추천 · Watch all · Find friends).
- FS-UI3 보기(친구): 진행 칸 수 · 이름 · 경과 · 한 줄 · 로마자(끄면 없음) · 뜻(화면 언어) · 단어 알약(있을 때만, 저장 뒤 Saved) · 무료 안내(freeReply만) · 칩 · 답장 칸.
- FS-UI4 보기 이동: 다음 · 이전 탭, 6초 뒤 다음(가짜 타이머), 멈춤이면 넘어가지 않음, 모션 줄이기면 넘어가지 않음, 마지막 다음 → 닫힘, 칸마다 onShown.
- FS-UI5 보기(안 만난 친구): 칩 · 답장 칸 없음, NEW FRIEND · 소개 카드 · addable이면 「Add friend and reply」, locked면 「See how to meet」.
- FS-UI6 시스템 뒤로 = 닫기. covered면 낭독에서 가림.
- FS-UI7 목록 화면: 스토리 포트가 없거나 비면 「Meet new friends」 줄 그대로, 스토리가 있으면 스토리 줄. 안 본 스토리가 있어도 목록 줄은 평소 미리보기 · 누르면 그 방(D3 개정 2, 2026-11-26).
- FS-UI19 ~ UI24 보기 답장 칸(`StoryViewer.reply.ui.test.tsx`): 진짜 입력 · 자리표시 · 빈 글이면 보내기 꺼짐, 초점 = 멈춤 + 키보드 높이 위(+8) · 잰 높이 올림, 보내기(단추 · return) →
  onReply(글, typed) · 보내는 중 꺼짐 · 보내면 칸 비움 + Sent · Open chat · 알림 동안 이어 감(장 · 인물을 넘겨도 알림 남음, Open chat = 보낸 인물 — 2026-11-26) · 보내는 중 멈춤 · 무료 안내 걷힘, 칩 = 그 자리 보냄, 실패 = 글 남김 + 안내(coins), 뒤로 = 키보드 먼저 · 입력 중 탭 = 넘기지 않음.
- FS-UI25 ~ UI27 목록 + 보기 답장(`MessengerListScreen.story-reply.ui.test.tsx`): 첫 답장 무료(storyFree · 체험 그대로 · replied where viewer) → 둘째는 체험 한 통, 엽전 부족 → 보내지 않고 상점 · 안내, 무제한 → 관문 없음.
- FS-UI28 ~ UI31 인물 기준 보기(`StoryViewer.segments.ui.test.tsx`): 진행 막대 = 그 인물만, 왼쪽 탭은 이전 인물의 마지막 장, 가로 넘김(다음 · 이전 인물 · 짧은 움직임은 무시 · 마지막이면 닫힘), 인물 전환 방향(`data-turn`) · 모션 줄이기면 없음, 6초 넘김은 인물을 넘어 이어 감.
- FS-UI32 보기 위 아바타(`StoryViewer.ui.test.tsx`): 「<이름>'s profile」 버튼 · flatten false, 아바타 · 이름 탭 → `onProfile(그 장)`, 안 만난 친구도. 잠긴 안 만난 친구는 소개 카드만(「See how to meet」 없음).
- FS-UI33 목록 + 보기 + 프로필 시트(`MessengerListScreen.stories.ui.test.tsx` · `SuggestedFriendSheet.ui.test.tsx`): 친구 아바타 → 시트(소개 · Start chatting, 추가 없음) · 보기 covered로 멈춤 → Not now면 이어 감,
  Start chatting → 보기 닫힘(`closed` reason `profile`) · 그 방, 안 만난 친구 → 추천 시트(from `story_viewer`), `added` 모델은 NEW 배지 없음.
- FS-UI34 ~ UI41 인물 넘김 큐브(D4 개정 ⟨큐브⟩, `StoryViewer.cube.ui.test.tsx`): 면 셋(옆 면은 미리보기 · 가려짐 · 손 안 받음) · 끄는 동안 각도가 손가락을 따름 · 진행 막대 멈춤,
  반 넘게 → 넘어가 들어온 면 제자리 · 나간 면 이전 자리, 덜 밀고 천천히 → 되돌아옴 · 그 손가락의 탭 무시, 빠르게 → 넘어감, 옆 인물 없음 → 조금만 돌고 되돌아옴 · 마지막이면 닫힘,
  탭으로 인물이 바뀌면 한 번 돎(접혀 나가는 면 = 방금 장), 모션 줄이기면 돌지 않고 바로.
- FS-UI42 · UI43 큐브 손가락 자리(`StoryViewer.cube.ui.test.tsx`): 카드 · 단어 알약 · 칩 위에서 시작한 가로 끌기도 돌아 넘김, 알약 짧은 탭은 저장, 답장을 쓰는 중엔 돌지 않음.
- FS-UI8 내 말풍선 인용 카드: 캡션 · 그림 · 한 줄 · 경과. 대화방 인용 띠: 이름 · ×로 뗌 · 보낸 뒤 사라짐.
- FS-UI14 목록이 서 있는 동안 5분마다 다시 읽어 새 스토리가 줄에 섬, 목록을 내리면 타이머 멈춤(가짜 타이머).
- FS-UI15 포트의 다시 읽기 신호에 다시 읽음, 목록을 내리면 리스너를 뗌.
- FS-UI16 보기가 열려 있으면 다시 읽은 목록을 보류(줄 그대로), 닫은 뒤 반영.
- FS-UI17 다시 읽기 실패(null · 던짐)면 있던 줄을 지킴.
- FS-UI18 `useMessengerRefresh`: `contentSyncOpportunity`에 스토리 목록에도 다시 읽기를 알림.

### 2.3 integration (앱)

- FSI1 (D5 개정) 목록 → 친구 스토리 → 칩 → 보기에 남은 채 그 방에 인용과 함께 보냄 · 「Sent」 → Open chat → 방의 인용 카드.
- FSI10 (D4 개정) 한 인물의 스토리 둘 → 진행 막대 「Story 1 of 2」 → 다 보면 닫힘 · 둘 다 본 것.
- FSI11 보기 위 아바타 → 프로필 시트(보기 covered) → Start chatting → 보기 닫힘 · 그 방. 안 만난 친구 아바타 → 추천 시트, 보기는 남음.
- FSI2 (D5 개정) 답장 칸에 쓰고 보내기 → 보기에 남은 채 인용과 함께 보냄 · 칸이 빔.
- FSI3 안 만난 친구 스토리 → Add friend and reply → 방이 열리고(추가 길) 인용 띠.
- FSI4 → `chat-fixture-remote.story.integration.test.ts` FSI-R2(서버 기록의 `story`가 인용으로 다시 섬) · FSI-R1(재전송에도 `storyId`).
- FSI5 → `friend-story-push.unit.test.ts` FS-U14(목적지 `story: true`) · `MessengerListScreen.stories.ui.test.tsx` FS-UI7(알림 — 마운트 전 · 탭 유지 · 다시 읽기 · 없으면 방)
  · Android `PushTargetJsonTest`(불리언 `story` 옮김).
- FSI6 스토리 RPC 실패 · 손님 → 추천 줄 그대로, 오류 없음.
- FSI7 목록을 연 뒤 올라온 스토리: 다른 탭 → 채팅 탭으로 돌아오면 목록이 다시 마운트돼 다시 읽고 줄에 섬(마운트 읽기가 덮음을 고정).
- FSI8 목록을 연 뒤 올라온 스토리: 앱이 앞으로 오면(`contentSyncOpportunity`) 그 자리에서 다시 읽고 줄에 섬.
- FSI9 실제 앱 줄 순서 = 최신 순(친구 · 안 만난 친구 함께, 구분 선 없음), Watch all의 첫 장 · 다음 장이 같은 순서(D3 개정).

### 2.4 서버

- SQL 통합 `friend-stories.integration.test.ts`(FS1 ~): 올림 회전 · 멱등 · 시각 · 스위치, 읽기 거름 · freeReply, 무료 판정(한 번 · 재전송 멱등 · 동시 · 해제 뒤 다시 · 만료 · 없음 · 꺼짐),
  관문 통과 · 금액 0 · 체험 안 줄어듦, `message_json.story`, 알림 후보 규칙 · 선톡과 하루 합산, 권한. 묶음 = 정본 JSON(FSP1).
- 단위: chat-send `story_id` → claim → 지시, 요청 스키마 사본 일치, companion-stories 계획(off · testers · on · 대조군) · 기록 뒤 발송, send-push 목적지 `story`.

## 3. 시각 스펙(디자인 단계 산출 — 토큰만)

| 자리 | 시안 값 | 토큰 |
| --- | --- | --- |
| 안 본 고리 | 3px #F46B18 | `brand-primary` |
| 본 고리 | #D5D8DE | `gray-500` |
| 안 만난 고리 | 점선 brand | `brand-primary` · `border-style: dashed` |
| 경과 · Seen | 11px #555D6D | `fg-neutral-muted` · caption |
| New | 11px bold #B94208 | `fg-brand` |
| ~~구분 선~~ | 없앰(D3 개정 ⟨2026-11-25⟩) | — |
| ~~목록 미리보기 New story~~ | 없앰(D3 개정 2 ⟨2026-11-26⟩) | — |
| 보기 바탕 | #1A1C20 | `gray-950` |
| 위 · 아래 그늘 | 검정 55% → 0 · 0 → 70% | `black` + 그레이디언트(화면 지역 상수) |
| 진행 막대 | 3px · 흰 95% / 38% | `white` · 불투명도 지역 상수 |
| 한 줄 카드 | 흰 · 18 radius · s3 그림자 · −2° | `white` · `radius-lg` · `elevation-shadow-s3` |
| 단어 알약 | brand · 흰 글 · 40 높이 | `brand-primary` · `white` |
| 답장 칩 | 흰 테두리 55% · 바탕 #1A1C20 42% | `white` · `gray-950` + 불투명도 지역 상수 |
| 답장 칸 | 52 높이 · 흰 테두리 75% | 같음 |
| NEW FRIEND | brand 알약 · 11px 800 | `brand-primary` |
| 인용 카드 | #F3F4F6 · 16 radius · 그림 52 × 92 | `gray-200` · `radius-lg` |

- 크기는 기존 부품(`Avatar` lg/md, `Button`, `RoundButton`)과 간격 토큰. 큰 글자: 줄 이름은 말줄임, 보기 글은 줄바꿈.
- 모션: 진행 막대 채움 6초 선형(모션 줄이기면 없음), 그 밖 새 모션 없음(ADR-0053).

## 4. 접근성

- 줄 칸 = 버튼(이름 · 경과 · 본 것), 줄 제목 머리글. 보기 = dialog, 진행 = 「Story i of n」, 이전 · 다음 · 멈춤 · 닫기 버튼, 그림 낭독 「Photo from <이름>」, 한 줄은 글.
- 보기가 떠 있는 동안 뒤 목록 · 탭 바 숨김(ADR-0016 D9). 시스템 뒤로 = 닫기.
- 터치 높이 44 이상. 글자 대비: 흰 글은 어두운 그늘 위에만.

## 5. 문서 영향

- 새로: ADR-0178 · 이 문서 · `docs/e2e/friend-stories.md` · `docs/performance/reports/friend-stories-01.md` · `docs/content/friend-stories.json`.
- 고침: `docs/adr/README.md`(색인) · ADR-0162(추천 줄 자리 → 스토리 줄 · 「See all」 자리) · `docs/screens.md`(메신저 목록 · 보기 층) ·
  `docs/specs/ai-companion-api.md`(RPC · `story_id`) · `apps/supabase-functions/README.md`(배포 · 스위치).
