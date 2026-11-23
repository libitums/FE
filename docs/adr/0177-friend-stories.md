# ADR-0177: 친구 스토리 1단계 — 미리 만든 묶음 · 날마다 돌림 · 스토리마다 첫 답장 무료 · 알림은 선톡과 합쳐 하루 한 번

- 상태: **채택 — 앱 · 서버 파일, 운영 미적용**. 브랜치 `feat/friend-stories`(PR 1 — 친구 스토리).
- 날짜: 2026-11-23
- **사용자 결정** (2026-11-23, 시안 「친구 스토리」 확인 뒤 질문에 답함):
  - 범위 = 1단계. 사진 업로드 없음. 친구 스토리는 시안 1 ~ 4번(목록 스토리 줄 · 보기 · 답장 → 대화 · 안 만난 친구 스토리). 내 단어 · 카드 스토리는 PR 2.
  - 친구 스토리 내용 = **미리 만든 묶음** — 인물마다 사진 · 한국어 한 줄 · 단어를 콘텐츠로 미리 만들어 날마다 돌린다. 사진은 이미 있는 앱 · 버킷 그림이다
    (새로 그리거나 AI로 만들지 않는다).
  - 답장 비용 = **스토리마다 첫 답장 무료**. 이어지는 대화는 지금 메시지 요금 그대로.
  - 알림 = **하루 최대 1번, 선톡 푸시와 합산**(같은 쉬는 시간 규칙).
- 시안(정본): 캔버스 「친구 스토리 시안」 1 · 2 · 3 · 4번(Main · Viewer · Reply · Locked). 390 × 844 좌표는 베끼지 않고 토큰 · 기존 부품으로 옮겼다.
- 위: [ADR-0162](0162-suggested-friends.md)(추천 친구 줄 · 추가 · 먼저 만나기) · [ADR-0164](0164-companion-friends-pooled-trial-open-tier.md)(보이는 친구) ·
  [ADR-0137](0137-messenger-companion-server-source.md) · [ADR-0155](0155-chat-pricing-follows-server.md)(엽전 정본은 서버) ·
  [ADR-0127](0127-companion-push-target.md)(선톡 푸시) · [ADR-0130](0130-push-console-segment-campaigns.md)(자동 캠페인 쉬는 시간) ·
  [ADR-0169](0169-more-menu-letters-wordbook.md)(단어장) · [ADR-0029](0029-product-analytics-posthog.md)(이벤트 이름 규칙).

## 맥락

- 선톡은 하루 140 ~ 220통 나가지만 24시간 안 답은 1.6%다(ADR-0127 서버 쪽, 2026-11-22). 방을 다시 열 이유가 「캐릭터가 먼저 말 걸기」 하나뿐이다.
- 시안의 고리: 친구가 하루 한 번 스토리를 올리고(24시간 뒤 사라짐) → 채팅 목록 맨 위 주황 고리 → 한국어 한 줄 + 단어 하나 → 답장 한 번이 곧 대화.
- 안 만난 친구도 스토리를 올려 추천 줄(ADR-0162)의 「추가 · 먼저 만나기」 길로 잇는다.

## 결정

### D1. 스토리 묶음은 서버 표, 날마다 서버가 올린다

- **묶음(pool)** `companion.story_pool`: 한 줄 = 스토리 하나 — 인물 · 그림 경로(버킷 상대 경로, 이미 있는 그림) · 한국어 한 줄 · 로마자 ·
  뜻(언어별, en 필수) · 단어(`{episodeId, ref}` — 카탈로그 단어 카드의 `voca:` ref, 없으면 null) · 답장 칩(한국어 1 ~ 3개) · 켬.
  정본은 `docs/content/friend-stories.json`이고 마이그레이션이 그 내용을 싣는다(통합 테스트가 맞춘다 — 친구 페르소나와 같은 방식).
- **올림(post)** `companion.stories`: 인물마다 UTC 하루에 하나. `companion_post_stories(now)`(서버 역할, pg_cron 매시)가 그 인물의 올림 시각
  (UTC 01 ~ 10시, 인물 id 해시로 고정)이 지났고 오늘 올린 것이 없으면, **가장 적게 올린 묶음 줄**(같으면 id 순)을 올린다 — 순서대로 돌고 줄을 더해도 이어진다.
  `expires_at = posted_at + 24시간`. 그래서 인물마다 늘 하나가 살아 있고 하루에 한 번 바뀐다. 스위치가 off면 올리지 않는다.
- 버린 대안: **버킷 매니페스트 + 앱이 날짜로 고름** — 답장 무료 판정 · 푸시 · 대화 인용이 모두 서버에서 스토리 id를 알아야 해서 결국 서버 표가 필요하다.
  **앱 번들에 묶음** — 그림을 번들에 넣을 수 없다(번들 여유 약 355 kB, 천장 변경 금지 — ADR-0149).
- 그림은 버킷 `content/images/…`의 문화 카드 · 장면 그림을 쓴다(얼굴이 없는 사물 · 거리 위주). 앱은 인물 아바타와 같은 해석기로 주소를 만든다.

### D2. 앱 읽기 — `companion_friend_stories()` 하나, 못 읽으면 줄이 예전 추천 줄로

- authenticated RPC. 스위치(`settings.friend_stories`: off 기본 · testers · on) · 시험 계정 · 숨긴 친구(`friend_hidden`)를 거른 **살아 있는** 스토리
  `[{ id, characterId, postedAt, expiresAt, imagePath, line: { ko, roman, meaning }, word, replies, freeReply }]`(올린 시각 최근 순).
- 앱은 목록 화면 마운트마다 한 번 읽는다. 읽기 전 · 못 읽음 · 빈 목록 · 손님 · 가짜 출처 → 스토리 없음 → **추천 줄(ADR-0162) 그대로**. 배포 전에도 앱이 깨지지 않는다.
- 만료는 앱도 본다 — 그릴 때 `expiresAt <= now`인 스토리는 뺀다(오래 켜 둔 화면).

### D3. 스토리 줄 — 추천 줄 자리를 바꾼다

- 스토리가 하나라도 있으면 목록 맨 위 줄이 「Stories」 · 「Watch all」로 바뀐다. 순서:
  1. **내 친구(열린 방)의 스토리** — 안 본 것 먼저(주황 고리), 본 것(회색 고리 · 「Seen」), 각 묶음 안은 최근 순. 이름 아래 경과 시간(「2h」).
  2. 구분 선.
  3. **안 만난 친구의 스토리** — 점선 주황 고리 · 「New」. 추천 대상(ADR-0162 D1)인 인물만.
  4. 그 밖의 추천 친구 — 예전 추천 아바타 그대로(+ · 자물쇠 배지).
  5. 「Find friends」 동그라미 — 친구 찾기(ADR-0162 R5). 예전 「See all」 자리를 옮긴 것이다.
- 「+」(내 스토리 만들기)는 PR 2가 더한다.
- 「Watch all」 = 내 친구 스토리를 1번 순서대로 이어 보기(안 본 것이 있으면 그것부터).
- 채팅 목록 줄: 그 인물에 **안 본 스토리가 있고 안 읽은 메시지가 없으면** 아바타 주황 고리 + 미리보기 「New story · <한 줄>」(brand-strong).
  그 줄을 누르면 대화방이 아니라 스토리를 연다. 본 뒤에는 보통 줄로 돌아온다.
- 본 것 표시는 **기기 저장**(키 하나 `libitum.friendStories.seen` 안에 계정마다 `{ 스토리 id: 만료 시각 }`, 그 계정 칸에 쓸 때 지난 것은 지움 — 다른 계정 칸은 그 계정이 쓸 때 정리). 서버에 쓰지 않는다
  (보는 것마다 RPC를 늘리지 않고, 푸시 판정은 「답했는가」만 본다).

### D4. 보기 화면

- 목록 위 전체 화면 층(친구 찾기와 같은 floating 층, 시스템 뒤로 = 닫기). 진행 막대(이어 보기의 칸 수) · 아바타 · 이름 · 경과 시간 · 멈춤 · 닫기,
  그림 가득, 한국어 한 줄 카드(한 줄 · 로마자(로마자 설정을 따름) · 뜻), 단어 알약 「<단어> · <뜻> — Save word」, 답장 칩 · 답장 칸.
- 6초 뒤 다음 스토리, 마지막이면 닫힘. 왼쪽 1/3 탭 = 이전, 나머지 = 다음. 멈춤 단추 · 답장 칸을 누르면 멈춘다. 모션 줄이기(ADR-0053)면 진행 막대는 움직이지 않고
  다음으로 넘어가지 않는다(멈춘 상태로 시작 — 사용자가 넘긴다).
- 단어: 카탈로그(UI 언어)에 그 에피소드 · 단어가 있을 때만 알약이 선다. 「Save word」 = 단어장에 넣고 별표(`withStarred`) — 이미 있으면 「Saved」.
- **첫 답장 무료 표시**: 그 스토리에 아직 무료 답장을 쓰지 않았으면 칩 위에 「First reply is free」 한 줄. 서버 판정(D6)이 정본이고 이 줄은 안내다.
- 하트(좋아요) 단추는 두지 않는다 — 서버에 갈 곳이 없고 무료 답장을 하트로 쓰게 하지 않는다.

### D5. 답장 → 대화

- 칩을 누르면: 보기를 닫고 그 인물의 방을 열어 **그 말을 곧바로 보낸다**(스토리 인용과 함께). 답장 칸을 누르면: 방을 열고 입력 줄 위에
  「Replying to <이름>'s story」 인용 띠(× 로 뗌)를 붙여 다음에 보내는 글에 인용이 실린다.
- 보내는 글은 `story_id`를 싣는다(chat-send 요청 칸 추가, 계약 판은 그대로 — 선택 칸). 서버가 인용을 메시지와 함께 저장하고 기록 읽기가 돌려준다
  (`message_json.story = { id, characterId, line, imagePath, postedAt }`). 대화방의 내 말풍선 위에 「You replied to <이름>'s story」 + 그림 · 한 줄 카드.
- 캐릭터는 그 스토리에 답한다는 것을 안다 — chat-send가 이번 턴 지시(directive)에 「오늘 올린 스토리 "<한 줄>"에 학습자가 답하고 있다」를 싣는다(시스템 프롬프트 캐시를 깨지 않는다).

### D6. 첫 답장 무료 — 서버 판정, 계정 · 스토리마다 한 번

- `companion.story_replies(user_id, client_message_id, story_id, character_id, free, created_at)` — 키 (사용자, 클라이언트 메시지 id).
- chat-send가 `story_id`가 있으면 관문 **전에** `companion_claim_story_reply(user, story, character, client_message_id, now)`(서버 역할)를 부른다.
  지갑을 잠근 뒤(동시 요청 직렬화): 같은 메시지의 줄이 있으면 그 결과 그대로(재전송 멱등). 없으면 스토리가 살아 있고 그 사람이 그 스토리에 쓴 **무료 줄이
  없거나 그 턴이 실패(예약 해제)했으면** `free`(금액 0 예약을 먼저 둔다), 아니면 `used`, 만료면 `expired`, 없는 스토리 · 인물 불일치면 `not_found`, 스위치 off면 `off`.
  `free`가 아니어도 인용 줄은 남는다(대화에 인용은 서고 값은 보통).
- 금액 0 예약은 기존 멱등 규칙(같은 메시지의 예약이 있으면 그대로 씀, ADR-0144 구독 무료 턴과 같은 길)으로 `begin_turn`이 그대로 쓴다. 관문의 엽전 부족 판정
  (`turn_gate_base`, 구독 겉 함수)은 **그 메시지의 열린 예약이 있으면** 건너뛴다 — 지금 정의에서 그 줄만 바꾼다(ADR-0168 나이 하한과 같은 방식, 줄이 없으면 멈춤).
- 두 번 눌러도 한 번: 같은 메시지 id 재전송은 같은 줄, 다른 메시지 둘이 동시에 오면 지갑 잠금 뒤 하나만 `free`.
- 턴이 실패해 예약이 풀리면(해제) 그 스토리의 무료가 다시 산다 — 사용자가 다시 보내면 무료다.
- 체험(무료 등급 합산 체험)은 쓰지 않는다 — 금액 0 예약이라 체험 칸이 줄지 않는다.

### D7. 알림 — 선톡 푸시와 합쳐 하루 한 번

- Edge Function `companion-stories`(pg_cron 매시, 서버 키): ① `companion_post_stories(now)` ② `companion_story_push_candidates(now, limit)` ③ 사람마다 한 통.
- 스위치 `settings.story_push`(off 기본 · testers · on — 선톡 푸시와 같은 꼴). on이면 대조군 30%(기록만), 배정을 `push_campaign_sends`(묶음 「스토리」)에 먼저 남긴다.
  testers 단계도 묶음 「스토리 시험」으로 기록한다(대조군 없음) — 기록이 없으면 매시 다시 보내 하루 한 번을 지킬 수 없다.
- 대상: 푸시 기기가 있고, 그 인물의 방이 기기에 있다고 볼 수 있고(ADR-0127 `hasRoom` 규칙), 선톡 설정이 off가 아니며, 그 스토리에 답하지 않았고,
  스토리가 올린 지 6시간 안이고, 현지 시각(프로필 · 지역 · 학습 나라 시간대, 모르면 보내지 않음)이 09 ~ 21시인 사람. 사람마다 가장 새 스토리 하나.
- **하루 한 번 합산**: 스토리 알림은 현지 하루 시작 뒤 **어떤 묶음이든**(자동 캠페인 포함) 보낸(`group = 'sent'`) 줄이 있으면 보내지 않는다. 선톡 푸시는
  `companion_proactive_push_gate`가 더 돌려주는 `pushedToday`(묶음 「선톡」 · 「스토리」 · 「스토리 시험」)가 참이면 `daily_cap`으로 건너뛴다 — 선톡의 기존 동작을
  덜 바꾸려고 셈 범위를 그 셋으로 좁혔다. 현지 시간대를 모르면(스토리 알림은 이때 보내지 않음) 선톡 쪽은 UTC 하루로 센다.
- **대조군도 그날 선톡 푸시를 막는다**(검수 A2): 스토리 묶음(「스토리」 · 「스토리 시험」)은 대조군(`control`) 줄도 「오늘 이미 받음」으로 센다
  (`companion.pushed_today`). 대조군이 같은 날 선톡 푸시를 받으면 비교가 「스토리 알림 vs 없음」이 아니라 「스토리 알림 vs 선톡 알림」이 된다. 다른 묶음
  (선톡 · 자동 캠페인)의 대조군은 그대로 세지 않는다.
- **문구 A/B는 없다**: 받는 쪽 variant는 늘 `a`이고, 실험은 대조군 30%(알림 없음)만이다.
- 자동 캠페인의 72시간 쉬는 시간은 스토리 알림에 걸지 않는다(걸면 학습 캠페인 뒤 사흘 동안 스토리 알림이 막힌다). 스토리 · 선톡 줄이 같은 표에 남으므로
  반대 방향(스토리 알림 뒤 캠페인)은 캠페인의 72시간 판정이 그대로 막는다.
- 목적지 = `{ kind: "companion-chat", characterId, story: true }` — 옛 앱은 그 방을 열고(뒤로 맞음), 새 앱은 그 인물의 살아 있는 스토리를 연다(없으면 방).
- 미리보기: 제목 = 인물 이름(`persona.name`), 본문 = 받는 사람 나라의 언어(검수 B1 — 후보가 학습 프로필 나라, 없으면 마지막 지역을 싣고 예고 캠페인과
  같은 표 `storyLanguageFor`로 고른다: 말레이시아 → 인도네시아어, 미얀마 → 미얀마어, 모르면 영어) + 한국어 한 줄(번역하지 않음, 40자를 넘으면 39자 + …).
  en 「posted a story — …」 · es 「publicó una historia — …」 · id 「membagikan cerita — …」 · ja 「ストーリーを投稿しました — …」 · vi 「vừa đăng tin — …」 ·
  th 「โพสต์สตอรี่ใหม่ — …」 · my 「စတိုရီအသစ် တင်လိုက်ပါပြီ — …」. 기록 줄의 `lang`도 그 언어. 목적지에 variant는 싣지 않는다.
- 기록 줄은 인물 · 스토리를 남긴다(검수 A15): `push_campaign_sends.character_id` · `story_id`(새 칸, null 허용 — 다른 묶음은 null). 대조군 줄도 남긴다.

### D8. 제품 이벤트 다섯(ADR-0029 「D3 목적 구분」, 감사 2026-11-23 개정)

- `friend_story_row_viewed { count, unseen }` — **줄 단위.** 스토리 줄이 실제로 그려졌을 때 목록 마운트당 한 번. 판정은 목록 화면 한 곳
  (`use-row-impressions.ts`): 첫 입장 안내로 줄 자리가 숨으면 내지 않고, 스토리 첫 읽기가 끝나기 전에는 추천 줄 노출(`suggested_friend_viewed`)도
  세지 않는다(곧 스토리 줄로 바뀔 수 있어서). 스토리 줄이 추천 줄을 대신하면 `suggested_friend_viewed`는 나지 않는다.
- `friend_story_viewed { characterId, met: boolean, from: row | list | watch_all | push, index, total }` — **장 단위.** 보기에서 한 장이 설 때마다
  (`index` = 몇째 장, 1부터 · `total` = 그 보기의 장 수, 10진 문자열).
- `friend_story_closed { shown, total, skipped, reason: completed | closed | back | replied }` — 보기가 닫힐 때 한 번. `shown` = 선 장 수,
  `skipped` = 다음 장으로 넘긴 탭 수(마지막 장에서 끝내는 탭은 세지 않음), `reason` = 끝까지 넘김 · 닫기 단추 · 시스템 뒤로 · 칩/답장 칸/Add friend and reply로 대화방.
- `friend_story_replied { characterId, via: chip | typed, free: boolean }` — 인용이 실린 글을 보낼 때(무료 여부는 앱이 본 `freeReply`, 정본은 서버).
  무료로 보낸 글의 `chat_message_sent`에는 `storyFree: true`(앱 힌트 — 정본은 서버 `companion.story_replies.free`).
- `friend_story_word_saved { characterId }`.
- 알림을 눌러 연 `push_notification_opened { target: companion-chat }`에는 스토리 알림일 때 `story: true`.
- PostHog만(Airbridge로 보내지 않음). 안 만난 친구는 기존 `suggested_friend_opened` · `suggested_friend_added`를 쓰고 `from`으로 연 곳을 가른다 —
  스토리 줄의 추천 아바타 `story_row`, 보기의 Add friend and reply `story_viewer`. `met` · `free`는 불리언(초안이라 데이터 단절 없음).

## 대가

- 운영 적용 전에는 아무것도 바뀌지 않는다 — 마이그레이션 둘 · Edge Function 둘(`chat-send` · `companion-stories`, `send-push` 목적지 하나) · pg_cron · 스위치 둘.
- 본 것 표시가 기기에만 있어 다른 기기에서는 다시 「안 봄」이다.
- 올림 시각이 UTC로 고정이라 현지 시각에 따라 「2h」가 새벽 스토리일 수 있다. 알림은 현지 09 ~ 21시만.
- 무료 답장 안내 줄은 읽은 때의 값이다 — 다른 기기에서 이미 썼으면 서버가 `used`로 보통 값을 받는다(안내와 다를 수 있음).
- 콘텐츠 27개(인물 아홉 × 셋) — 인물마다 사흘에 한 번 같은 스토리가 돈다. 늘리려면 정본 JSON + 묶음 표에 줄을 더한다(마이그레이션 또는 운영 SQL).
- 그림 27장 중 15장은 랜딩 사본으로 눈으로 확인했고, 12장(문화 카드 그림)은 카드 설명으로만 골랐다(정본 JSON `imageChecked: false`) — 운영 적용 전에 사람이 본다.
- 무료 판정 뒤 관문이 막으면(예: 연령 차단) 금액 0 예약이 남아 기존 정리 작업이 10분 뒤 푼다 — 그동안 그 스토리의 `freeReply`는 거짓으로 보인다.
- 올림은 친구 출시 스위치(`friends_mode`)와 무관하게 켜진 인물이면 올리고, 숨김은 읽기(`friend_hidden`)에서 한다.

## 독립 리뷰 반영 ⟨2026-11-23⟩

- **Android 호스트**가 알림 목적지의 불리언 `story: true`를 JS로 옮긴다(`PushNotificationController.targetFromJson`) — 전에는 문자열 칸만 옮겨 Android에서는 방이 열렸다.
  이 변경은 **새 Android 빌드**에 실려야 효과가 있다. iOS는 목적지 사전을 그대로 넘긴다(불리언이 JS에 `true`로 오는지는 기기 e2e FS-E11).
- 알림 후보는 스토리 스위치(`friend_stories`)도 본다 — 스토리를 끄거나 시험 계정만이면 알림도 끊긴다. 스토리 묶음(「스토리」 · 「스토리 시험」)은 **대조군까지**
  현지 하루 한 줄이다(대조군이 매시 다시 기록되지 않게).
- 무료 표시 답장(칩 · 입력)도 `chat_message_sent { paid: false, cost: 0 }`을 낸다. 무료가 아닌 칩은 보통 보내기 관문(체험 · 엽전 · 상점 안내)을 거친다. 무료 인용 띠가
  붙어 있어도 답장 보기(아이디어)는 보통 관문이다.
- 목록이 이미 서 있을 때 알림이 오면 스토리를 다시 읽은 뒤 연다.
- 알려 둠: `send-push`가 기기 없음으로 `sent: 0`이어도 배정 줄(`sent`)은 남아 그날 다른 알림이 하루 상한에 걸린다 — 기록을 먼저 남기는 기존 규칙(선톡 · 캠페인)과 같다.

## 접근성 점검 반영 ⟨2026-11-23⟩

- 낭독 순서는 닫기 · 멈춤 → 이름(「<이름>'s story, Story i of n」 — 열 때 초점이 감) → 사진 · 한 줄 · 단어 → 답장 → 이전/다음(맨 뒤, 층은 아래). 장이 바뀌면 알린다.
- 멈춤은 안 만난 친구에도 선다(자동 넘김을 멈출 길, WCAG 2.2.1). **남은 것**: 스크린리더가 켜졌을 때 자동 넘김을 끄려면 호스트가 그 값을 넘겨야 한다 — 레포에 길이 없어 후속.
- 흰 글 대비: 위 그늘을 머리 줄 아래까지 검정 60%로 고르게 · 무료 안내는 어두운 알약 · 단어 알약 · NEW FRIEND 바탕은 `brand-strong`(흰 글 약 5.5:1) · 칩 터치 높이 44.
- 한 줄 카드 · 단어 알약은 답장 묶음 위 흐름에 둬 큰 글자에서도 겹치지 않는다. 저장한 단어 알약은 버튼이 아니다. 목록 줄 낭독에 「Opens the story」.

## 스스로 정한 기본값(사용자가 바꿀 수 있음)

- 스토리 데이터 = 서버 표(D1) · 하루 한 번 UTC 01 ~ 10시(인물마다 고정) · 24시간 만료 · 가장 적게 올린 줄부터 · 본 것 = 기기 저장(D3).
- 줄 순서(D3) · 추천 친구는 스토리 줄 뒤에 그대로 · 「See all」 → 줄 끝 「Find friends」 · 목록 줄의 New story는 안 읽은 메시지가 없을 때만.
- 답장 칸 = 대화방 입력 줄 위 인용 띠(보기 안에 키보드를 띄우지 않음) · 하트 없음 · 「First reply is free」 안내 · 6초 넘김 · 모션 줄이기면 자동 넘김 없음(D4 · D5).
- 무료 판정의 범위(D6) · 알림 대상과 셈 범위(D7) · 이벤트 넷(D8).

## 확인

- unit: `friend-stories.unit.test.ts`(FS-U1 ~ U7 · U10) · `friend-stories-parse.unit.test.ts`(FS-U8) · `friend-stories-content.unit.test.ts`(FS-U9) ·
  `friend-story-seen-store.unit.test.ts`(FS-U12) · `ui-copy-chat-stories.unit.test.ts`(FS-U13) · `friend-story-push.unit.test.ts`(FS-U14) ·
  `companion-api.stories.unit.test.ts`(SA-S1 · S2) · `companion-parse.story.unit.test.ts`(SS-S1) · `friend-stories-wiring.unit.test.ts`(SW-S1 ~ S5) ·
  분석 이름 수(AN1 104 · AB3 77/74).
- ui: `FriendStoriesRow` · `StoryViewer` · `StoryQuote` · `MessengerListScreen.stories` · `MessengerChatScreen.story`(FS-UI1 ~ UI9).
- integration: `App.friend-stories.integration.test.tsx`(FSI1 · FSI2 · FSI3 · FSI6) · `chat-fixture-remote.story.integration.test.ts`(FSI-R1 · R2).
- 서버: SQL `friend-stories.integration.test.ts`(FS1 ~ FS19) · `friend-stories-pool.integration.test.ts`(FSP1 · FSP2) · `companion-proactive-push`(PG1 `pushedToday` · PP9) ·
  chat-send(CSS1 ~ CSS3) · `companion-stories-handler`(SH1 ~ SH4) · send-push(SP1) · 계약 패키지(CS3e).
- e2e: [docs/e2e/friend-stories.md](../e2e/friend-stories.md)(기기 절차). 계약 · 테스트 계획: [docs/specs/friend-stories.md](../specs/friend-stories.md).
