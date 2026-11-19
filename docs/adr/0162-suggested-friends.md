# ADR-0162: 추천 친구 줄 · 친구 찾기 — 인물 카탈로그 포트 · 엽전 먼저 만나기

- 상태: **채택** (2026-11-19)
- 날짜: 2026-11-19
- **사용자 결정** (2026-11-19): 캔버스 「추천 친구 라인 시안」(R1 ~ R6)을 디자인 먼저(UI) · 서버는 뒤로 만든다. 일반 인물이 많이 늘어날 것을
  전제로 인물 모델과 출처를 일반화하고, 기본값은 이 ADR이 정한다.
- 위: [ADR-0137](0137-messenger-companion-server-source.md)(서버 인물 · 방 열기) · [ADR-0141](0141-companion-unlock-episode-complete.md)(에피소드 완료 해금) ·
  [ADR-0152](0152-companion-romance-refusal-charge-unlock-message.md)(해금 선톡) · [ADR-0116](0116-yeopjeon-reward.md)(엽전).
- 다루는 축: 메신저 목록의 추천 줄 · 프로필 시트 · 친구 찾기 화면, 인물 카탈로그의 모양과 출처, 추가 · 먼저 만나기의 서버 경계, 제품 이벤트.

## 맥락

- 채팅 목록은 열린 방만 보였다. 잠긴 인물은 「해금되면 생긴다」(2026-11-13 결정)였고, 아직 못 만난 인물 · 이야기 밖 인물을 만날 입구가 없었다.
- 인물 표(`companion-roster.ts`)는 이야기 인물 다섯의 이름 · 아바타 · 해금 에피소드 · 첫 말만 가졌다. 서버(`companion.characters`)는 인물마다 페르소나를
  가지지만 목록 API · 해금 판정이 없다 — 해금은 앱이 `unlockCharacter` + 해금 저장으로 하고, 서버 방은 `companion-greet`(trigger `unlock`)로 첫 인사를 저장한다.
- 엽전을 쓰는 서버 RPC는 턴 · 사진 · 음성 안에만 있다(`companion_begin_turn` 등). 「엽전 100으로 먼저 만나기」를 처리할 RPC가 없다.

## 결정

### D1. 줄 순서 — 새 일반 → 열린 이야기 → 먼저 만나기 이야기 → 잠긴 이야기
- 추천 대상은 **대화 출처에 방이 있고 그 방이 열리지 않은 인물**이다. 방이 열린(목록에 있는) 인물은 줄에 없다. 방이 없는 인물은 열 길이 없어 서지 않는다.
- 묶음 안은 카탈로그 순서(안정 정렬). 순수 판정은 `suggested-friends.ts`(`suggestedFriendsOf`).
- 상태: `addable` = 일반 인물 · 해금 규칙이 없는 인물 · 해금 에피소드를 끝낸 인물(`metEpisode`, 포트가 주면), `locked` = 그 밖.

### D2. 줄 최대 8명 — 넘치면 See all
- `SUGGESTED_ROW_MAX = 8`. 가로 스크롤 한 화면 반 정도이고, 나머지는 「See all」 → 친구 찾기가 보인다. See all은 추천 수와 상관없이 줄이 있을 때 늘 선다.

### D3. 추천이 0이면 줄을 숨긴다
- 빈 줄 · 빈 상태 문구를 두지 않는다. 손님(가입 안내) · 빈 목록 분기에도 줄이 없다.

### D4. 인물 카탈로그 = 포트 하나 — 오늘은 앱 표, 내일은 서버 목록
- `friend-catalog.contract.ts`의 `FriendProfile`: id · name · avatarPath · **kind(`story` | `general`)** · 해금 규칙(`unlockEpisodeId` · `unlockEpisode`, null = 없음) ·
  **intro**(`LocalizedLine` — en 필수, es · id · ja · vi 선택, 없는 언어는 en) · **tags** · **category** · 첫 말(`sheetOpening` ko/en) · **earlyAccess**(`{ price, endsAt | null }`).
  `CompanionCharacter`는 여기에 목록 미리보기 첫 줄(`firstLine`)을 더한 것이다. 오늘의 다섯은 `kind: story`, 제안 없음, 카테고리 없음 — 해금 동작은 그대로다.
- 소개 · 태그 · 카테고리 이름은 **인물 데이터**다(이름처럼) — 화면 문구표(ui-copy)가 아니라 카탈로그가 언어별로 싣는다. 화면 문구는 ui-copy 다섯 언어.
- `SuggestedFriendsPort { catalog(), add(id), earlyAccess | null, metEpisode? }`. 결선 `app/suggested-friends-wiring.ts`.
- **일반 인물의 방**: 서버 씨앗(`companionSeed`)이 일반 인물을 **에피소드 없는 잠긴 방**(`unlockEpisode: 0`)으로 심는다. 목록은 잠긴 방을 보이지 않으므로 화면 변화가 없고,
  「Start chatting」은 해금과 같은 길로 연다. 일반 인물을 늘릴 때는 서버 `companion.characters`에 같은 id의 행(페르소나 · `unlockLines`)이 있어야 한다 —
  없으면 첫 인사가 `character_not_found`로 실패한다(앱 방은 열리고 서버 인사만 빠짐).

### D5. 추가는 실제, 먼저 만나기(엽전 100)는 서버 RPC — 2026-11-19 적용
- **추가**(`add`) = `source.unlockCharacter(id)`(잠긴 방 열기 · NEW 줄 · 서버 방이면 `companion-greet` trigger `unlock`으로 첫 인사) + 해금 저장(`messengerUnlockStore().add`).
  서버가 해금을 판정하지 않으므로 「방 열고 인사」가 곧 추가다 — 새 서버 코드가 필요 없다.
- **먼저 만나기** — 마이그레이션 `20261213120000_companion_early_access.sql`(**사용자 승인 · 2026-11-19 운영 적용**, schema_migrations 20261213120000):
  - 표 `companion.early_access_offers`(인물 · 값 · 끝 시각 · 켬) · `companion.early_access_unlocks`(사용자 · 인물마다 한 번) — 둘 다 RLS 켬(직접 읽기 없음).
  - `companion_early_access_offers()` → 켜진 제안 `[{ characterId, price, endsAt | null }]`.
  - `companion_unlock_early(p_character_id)` → `unlocked | already | short(shortBy) | no_offer` + 지갑. 지갑을 **먼저 잠근 뒤** already를 본다(두 번 눌러도 한 번만
    빠짐). 구독분 → 지급분 → 구매분 순서로 빼고 원장에 `kind = 'spend'`, `reason = 'early_access'`. 원장 kind 검사는 운영의 `'revoke'`를 남기고 `'spend'`를 더했다.
  - 두 RPC 모두 authenticated만. **제안 값(사용자 결정 2026-11-19)**: 정윤경 · 미나 · 한도윤 · 서재민 넷 모두 100엽전, 마감 없음.
- 앱: `ChatRemote.earlyAccess`(`companion-api.ts`)가 두 RPC를 부르고 `early-access-parse.ts`가 응답을 푼다. 진입점(`index.tsx`)이 `setEarlyAccessRemote`로 같은 서버
  포트 공장을 끼우고(처음 쓸 때 만듦), 목록 화면이 마운트마다 제안을 한 번 읽어 카탈로그 인물의 `earlyAccess`에 얹는다(`catalogWithOffers`).
  - 「Chat now · 100」 → `companion_unlock_early` → `unlocked` · `already`: 돌려받은 지갑 잔액으로 머리 엽전 칩을 맞추고 **기존 추가 길**(방 열기 · 첫 인사 · 해금 저장).
    `short`: 시트를 닫고 엽전 상점. `no_offer` · 오류: **시트를 그대로 두고** 실패 줄(「Couldn't add <이름>. Try again.」).
  - 손님 · 가짜 출처는 제안 목록이 비어 단추가 서지 않는다.
- 제안 원본 `docs/specs/suggested-friends-early-access.md`는 이 마이그레이션으로 대체됐다(.sql 제안 파일은 지웠다).
- **가짜 카운트다운 금지**: 배지는 끝 시각(`endsAt`)이 있을 때만 「LIMITED · 2d 14h」, 없으면 「LIMITED」만 — 지금 제안은 모두 마감이 없어 「LIMITED」다.

### D6. 화면
- R1 줄: 목록 스크롤 안 맨 위(머리 아래), 제목 「Meet new friends」 · 「See all」, Avatar lg + 고리(추가 가능 = 브랜드 · 「+」 배지, 잠김 = 회색 · 자물쇠 배지).
  ⟨2026-11-19 사용자 결정⟩ 줄 아바타 아래 「EARLY · 100」 꼬리표는 뺐다 — 먼저 만나기 제안은 시트(R4) · 친구 찾기(R5)에서만 보인다. 낭독 라벨은 제안을 그대로 알린다.
- R2 · R6 시트: 새 친구 시트와 같은 판(막 · 끌어내림 · 시스템 뒤로 = Not now, 큰 글자는 본문 스크롤, 아래 여백 = 시스템 바 몫 — ADR-0044 D3).
  Avatar xl · 이름(일반 인물은 NEW) · 소개 · 태그 · 첫 말(ko + en) · 「Start chatting」 · 「Not now」.
- R3: 추가 뒤 시트가 닫히고, 방이 목록 맨 위 NEW 줄(첫 인사 미리보기 — 기존 흐름), 아바타가 줄에서 빠지고, 「<이름> added to your chats」 3초 토스트(낭독 한 번).
- R4: 「You'll meet in Episode N」 · 안내 줄 「Finish the story to swap numbers — <이름> texts first.」 · (먼저 만나기가 켜졌을 때만) 「Chat now · 100」 + LIMITED +
  「Launch special · meet <이름> early」 · 「Not now」. 「Continue the story」는 없다.
- R5 친구 찾기: 전체 화면 층(뒤로 화살표 · 시스템 뒤로), 칩 All · From your story · 일반 인물이 쓰는 카테고리, FROM YOUR STORY(Chat → 🪙 → 잠김 회차 → Added) ·
  NEW FRIENDS(Chat → Added), 꼬리 「More friends are on the way」. 층 순서는 친구 찾기(floating) < 시트(sheet) < 토스트(toast).

### D7. 제품 이벤트 넷(ADR-0029 「D3 목적 구분」)
- `suggested_friend_viewed { count }` — 줄이 처음 보일 때 목록 마운트당 한 번.
- `suggested_friend_added { characterId, kind, from: row | directory, via: free | early }`.
- `early_access_tapped { characterId, price, from }` — 「Chat now」를 누름(결제 전 의향).
- `early_access_completed { characterId, outcome: unlocked | short | failed }` — RPC가 끝난 뒤 한 번(`chat_media_completed`와 같은 모양, 2026-11-19 추가).
- 분석 이름 68 → **72**, Airbridge 이름 63 → 67 · 매핑 없는 표 61 → 65(넷 다 Airbridge로 보내지 않음).

## 버린 대안

- **잠긴 방 대신 새 접근 종류(`hidden`)**: `ChatRoomAccess`를 넓히면 잠김을 보는 모든 분기가 바뀐다. 일반 인물의 방은 「에피소드 0으로 잠김」으로 같은 길을 탄다.
- **먼저 만나기를 앱 지갑에서 빼고 방을 열기**: 엽전 정본은 서버 지갑이다(ADR-0155). 앱만 빼면 서버와 어긋나고 되돌릴 길이 없다 — 서버 RPC로 뺀다.
- **친구 찾기를 탭 스택 route로**: nav 상태 · 뒤로 규칙이 늘어난다. 목록 화면 위 층(엽전 상점과 같은 방식)으로 충분하다.
- **카운트다운 자리값**: 데이터가 없는 시각을 보이면 가짜 긴급성이다 — 금지.

## 대가

- 오늘 카탈로그에는 일반 인물이 없어 운영 화면의 줄은 「아직 못 만난 이야기 인물(잠김)」만 보인다. 일반 인물은 데이터를 넣어야 선다.
- `metEpisode`를 결선이 주지 않는다 — 에피소드를 끝내면 해금이 곧바로 방을 열기 때문(ADR-0141 · 진도 보정)에 「끝냈지만 아직 안 연 이야기 인물」은 오늘 경로에서 생기지 않는다.
- 소개 문구 다섯 언어는 인물 데이터에 손으로 적었다 — 서버 목록이 생기면 거기로 옮긴다.
- 「2026-11-13 잠긴 방은 미리 보이지 않는다」는 **목록 줄**에 대해서는 그대로이고, 추천 줄 · 친구 찾기는 잠긴 이야기 인물을 보인다(이 ADR이 대체하는 범위).

## 확인

- unit: `suggested-friends.unit.test.ts`(SF-U1 ~ U7 · CS-U1) · `friend-directory.unit.test.ts`(FD-U1 ~ U3) · 분석 이름 수(AN1 · AB3).
- ui: `SuggestedFriendsRow` · `SuggestedFriendSheet` · `FriendDirectoryScreen` · `MessengerListScreen.suggested`.
- integration: `App.suggested-friends.integration.test.tsx`(SFI1 ~ SFI4) · SQL `companion-early-access.integration.test.ts`(EA1 ~ EA6).
- e2e: [docs/e2e/suggested-friends.md](../e2e/suggested-friends.md)(기기 절차, 미실행).

## 추가 ⟨2026-11-19⟩ 인물 프로필 — 추천 친구 넷 · 서버 보임 · 사실 줄 · 목소리 견본 · 방 머리 · 성인 확인

이 ADR의 결정(D1 ~ D7)을 바꾸지 않고 넓힌다. 서버 쪽은 [ADR-0163](0163-companion-friends-pooled-trial-open-tier.md)(「앱 인계」)이 정했다.

- **일반 인물 넷이 카탈로그에 든다**(D4 그대로): 차서연 · 권해준 · 송다은 · 임건우(`companion-friends-roster.ts` → `COMPANION_CHARACTERS` 뒤).
  `kind: general` · 해금 규칙 없음 · 카테고리 없음 · 제안 없음, 방은 에피소드 없는 잠긴 방(0). 첫 말(`sheetOpening` · `firstLine`) = `firstMessage`
  첫 줄, 소개 = `bio.en` + es · id · ja · vi 번역, 태그 셋(직업 · 취향, 다섯 언어). 그림 `content/images/profiles/<id>-casual.webp`(사람이 올림 — 없으면
  아바타 자리값). 정본은 `docs/content/companion-friends.json`이고 단위 테스트 CF-U1 ~ U5가 맞춘다. ui-copy 검사 허용 선언에 `GENERAL_FRIENDS`를 더했다.
- **서버 보임 = 교집합**: 포트 `visibleFriends`(`companion_friends`)가 준 목록과 카탈로그 둘 다에 있는 일반 인물만 줄 · 친구 찾기에 선다
  (`friend-visibility.ts`). 받기 전 · RPC 없음(404) · 오류 · 오프라인 · 서버 포트 없음(손님 · 가짜 출처)이면 일반 인물이 없다. 이야기 인물은 상관없다.
  포트에 칸이 없으면(옛 결선 · 화면 테스트) 거르지 않는다 — 운영 결선은 늘 칸을 둔다. 목록은 마운트마다 한 번 읽는다(제안과 같은 `usePortLoad`).
- **사실 줄 · 목소리 견본**: `FriendProfile.profile = { age, job, mbti, voiceSamplePath }`. 넷은 JSON, 이야기 다섯의 MBTI는 `storyProfiles`, 나이 · 직업은
  duru-curation 스토리 바이블(덕수쌤 「30대」 → `"30s"`, 미나 「25~26」 → `"25-26"`). 견본은 넷만 `content/audio/companion/<id>-intro.mp3`, 다섯은 null.
  시트는 이름 아래 사실 줄(있는 조각만 — `profileFactsOf`), 본문 아래 견본 단추(주소가 있을 때만)와 AI 표시(방 고지 `aiDisclosure`와 같은 말).
  잠긴 이야기 인물은 사실 줄 · 견본이 없다(이야기를 앞질러 알리지 않게). 견본은 말풍선 음성과 같은 `lib/audio.ts`로 튼다 — 정적 주소를 그대로 받아
  접점을 넓히지 않았다. 누를 때만 틀고, 시트가 닫히면 멈추고, 못 틀면 조용한 한 줄(`voice-sample.ts` 상태 기계). 서버 호출 · 엽전이 없다.
- **방 머리 → 읽기 전용 프로필**: 새 단추 없이 머리 제목(인물 이름)을 누르면 같은 시트를 `mode: profile`로 연다(열린 방이면 아홉 모두,
  `roomProfileModelOf`). 첫 말 · 추가 · 먼저 만나기 단추가 없고 닫기만. 방 겹침 `profile`이라 뒤로가기 · 낭독 가림은 `useChatRoom`이 맡는다(시트는
  뒤로가기를 등록하지 않음). 제목은 버튼으로 읽힌다(「<이름>, view profile」). 닫힌 뒤 초점은 지금은 플랫폼에 맡긴다.
- **성인 확인**(ADR-0163 D4): 일반 · 서버 수위 open · 생년상 성인(올해 − 생년 ≥ 18, 서버 `age_band`와 같은 선) · 프로필 `adultAck`가 참이 아님 — 넷이
  모두 맞을 때만 추가 앞에 한 번 확인 창(앱의 `Dialog`). 확인은 `companion_ack_adult`를 부르고(추가를 막지 않음), 취소도 추가한다. 나이 모름은 창도
  안내도 없다. 판정은 `adult-ack.ts`(진리표 120칸 테스트 AA-U2). 동의는 그때 프로필을 한 번 더 읽어 본다(`companion_load_profile.adultAck`).
- **이벤트**: `friend_profile_opened { characterId, source: row | directory | room }` · `friend_voice_sample_played { characterId }` — 이름 72 → 74
  ([ADR-0029](0029-product-analytics-posthog.md) 2026-11-19 기록).
- **확인**: unit CF-U1 ~ U5 · FV-U1 ~ U6 · AA-U1 ~ U3 · FP-U1 ~ U6 · VS-U1 ~ U7 · FE-U1 ~ U2 · FR-P1 ~ P4 · SW-U4 ~ U6(이 기계에서 돌림). ui SS5 ~ SS8 ·
  MC-UI2(제목 누름) · AA-UI1 ~ UI2 · MP1 ~ MP4 · MCP1 ~ MCP3, integration SFI1 ~ SFI4(보이는 친구 끼움)는 **돌리지 못했다**.
- **이 기계에서 확인하지 못한 것**: 사내 패키지 인증이 없어 앱 typecheck · ui · integration 테스트 · 빌드 · 번들 크기 · 화면 · 기기 소리 재생을 하지 못했다
  (순수 모듈만 vitest · tsc로 봤다). 성능 보고서는 미측정(`docs/performance/reports/friend-profile-01.md`).
- **대가**: 호스트 재생 모듈은 「불러오기 실패」를 따로 알리지 않는다 — 파일이 없을 때 완료 콜백이 곧바로 오면 단추는 「끝남」으로 보일 수 있다
  (`unavailable`은 모듈이 없을 때만). 다른 소리가 호스트를 가져가도 견본 단추는 그 사실을 모른다(시트가 떠 있는 동안 다른 재생 입구는 없다).
