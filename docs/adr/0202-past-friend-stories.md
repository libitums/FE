# ADR-0202 — 지난 친구 스토리: 친구 하나의 최근 7일치를 10엽전으로 7일 동안 열기 (서버)

- 상태: **채택 — 서버 파일, 운영 미적용.** 마이그레이션 `20270111120000_past_stories.sql`. 앱 화면은 다음 PR.
- 날짜: 2026-11-26.
- **사용자 결정(2026-11-26)** — 「기본값대로 서버 PR부터 /change로」. 시안: 친구 스토리 시안 캔버스 40a · 40 · 41 · 42번과 주황 메모 「지난 친구 스토리」.
- 그 밖에 기본값으로 정한 것 — 「⟨기본값⟩」 표시.
- 이어받는 결정: [ADR-0178](0178-friend-stories.md)(친구 스토리 · 24시간 · 스위치) · [ADR-0116](0116-yeopjeon-reward.md)(엽전 = 서버 지갑) ·
  [ADR-0162](0162-suggested-friends.md) · 20261223(구독자는 이야기 인물을 모두 연다 — `has_all_characters`) · [ADR-0144](0144-subscriptions-revenuecat.md)(요금제 표) ·
  [ADR-0191](0191-my-stories-reactions-as-chat.md)(친구 = 말한 인물).

## 맥락

1. 친구 스토리는 올린 뒤 24시간 산다(`companion.stories.expires_at = posted_at + 24h`). 앱 읽기 `companion_friend_stories()`는 `expires_at > now`만 돌려주고,
   만료된 스토리에 답하면 `companion_claim_story_reply`가 `expired`를 돌려준다. 만료된 스토리는 표에 남아 있다.
2. 대화방에는 지난 스토리에 단 답의 인용 판이 남는다(시안 40a). 누르면 열 곳이 없다.
3. 엽전 차감은 서버 지갑 하나다. 같은 모양의 「한 번 사기」가 이미 둘 있다 — 먼저 만나기(`companion_unlock_early`, 20261213 · 20261223)와
   티켓 사기(`companion_buy_ticket`, 20261231 — 요청 id로 한 번).

## 결정

### D1. 무엇을 파나 — 친구 하나의 지난 스토리, 7일 동안
- **24시간 안 스토리는 지금처럼 무료**(`companion_friend_stories()` 그대로). 매일 열 이유를 지킨다.
- 「지난 스토리」 = 그 인물의 스토리 중 **보는 시각 기준 최근 7일 안에 올렸고**(`posted_at > now − 7일`) **이미 만료된 것**(`expires_at ≤ now`).
- 열기 단위는 **친구 하나**. 연 뒤 **7일** 동안 그 친구의 지난 스토리를 본다.
  - ⟨기본값⟩ 창은 **보는 시각 기준으로 굴러간다** — 연 순간의 묶음을 얼리지 않는다. 열려 있는 동안 새로 만료되는 스토리도 보이고, 8일 전이 된 스토리는 빠진다.
    「최근 7일치를 7일 동안」을 가장 단순하게 읽은 것이다. 얼린 묶음(연 순간의 id 목록)은 버렸다 — 표가 하나 더 늘고, 연 사람이 더 적게 본다.
- 값은 `companion.settings.past_story_price`(기본 **10**). 앱 업데이트 없이 운영에서 바꾼다. 7일 두 개(창 · 열림 기간)는 함수 안 상수다.

### D2. 누가 열 수 있나
- 스위치 `companion.settings.past_stories`: off(**마이그레이션 기본**) · testers · on — 판정은 다른 스토리 스위치와 같다(`companion.switch_on` →
  `raw_app_meta_data.duru_tester`). 친구 스토리 스위치(`stories_on`)도 켜져 있어야 한다.
- **친구만** — 내가 말한 대화(`conversations` + 내 메시지)가 있고, 켜진(`characters.active`), 숨기지 않은(`friend_hidden`) 인물. 내 스토리 반응 대상
  (ADR-0191, 20261228140000의 「친구 = 내가 말한 대화가 있는, 켜진, 숨기지 않은 인물」)과 같은 기준이다.
  - 서버는 이야기 인물 해금을 판정하지 않는다(20261213). 「만난 인물」에 가장 가까운 서버 사실이 「말한 적이 있다」이다. 먼저 만나기로 열었지만 아직 말하지 않은
    인물은 친구가 아니다 — 첫 인사(무료)를 받으면 친구가 된다.

### D3. 구독자는 무료 — `has_all_characters`
- 「모든 인물」 요금제(`companion.plans.all_characters` — 지금 **Chat Plus · Premium**)가 살아 있으면(`plan_active`) 무료. #540 「구독자는 이야기 인물을 모두 연다」
  (`companion.has_all_characters`, 20261223)와 **같은 함수**를 쓴다. 시안의 「Unlimited」는 이 둘이다.
  - 티켓 무제한(`unlimited_tickets`)만 있는 구독은 무료가 아니다(`all_characters = false`). 만료 · 끊긴 권한도 아니다.
  - 옛 `companion.entitlements`(운영자가 넣은 등급)는 보지 않는다 — 20261223과 같다.
- 구독자도 열기를 한 번 부른다 — **값 0 기록**(`paid_with = subscription`, 원장 없음). 구독이 끝나도 그 7일은 그대로다.

### D4. 열기 — 한 번 사기의 같은 길
- `companion.lock_wallet`으로 지갑을 잠근 뒤 판정한다. 순서: 같은 요청 id → 스위치 → 친구 → 지난 스토리 있음 → 이미 열림 → 구독 → 잔액.
- **같은 요청 id**(앱이 누를 때마다 새로 만듦)는 **같은 결과**: 기록 표의 `(user_id, request_id)` 유일. 같은 id가 다시 오면 그 기록으로 `opened`를 돌려준다
  (그 사이 스위치 · 친구 판정이 바뀌어도). 같은 id를 다른 인물에 쓰면 오류 `22023`.
- **이미 열려 있으면** `already` — 차감하지 않고 지금 열림의 시각을 돌려준다(연장하지 않는다 ⟨기본값⟩).
- **지난 스토리가 0개면** `empty` — 빈 것을 팔지 않는다 ⟨기본값⟩.
- **잔액이 모자라면** `insufficient`(+ `shortBy`) — 차감 · 기록 없음. 앱이 상점 시트를 연다.
- 차감: **구독분 → 지급분 → 구매분**(턴 예약 · 먼저 만나기 · 티켓과 같다). 원장 줄 `kind = 'spend'` · `reason = 'past_stories'` · `ref_id = 요청 id`.
  새 지갑 경로를 만들지 않았다.

### D5. 기록 · 권한
- 표 `companion.past_story_opens`(user, character, request_id, opened_at, expires_at = opened_at + 7일, paid_with coins | subscription, price, ledger_ref).
- RLS 켬 + 본인 읽기 정책(`user_id = auth.uid()`). 쓰기 권한은 아무 역할에도 주지 않는다(서버 역할 제외) — 함수만 쓴다.
  companion 스키마는 앱(authenticated)에 열려 있지 않다(다른 컴패니언 표와 같음). 앱은 RPC로만 읽는다.
- 앱 RPC 셋(authenticated, `auth.uid()` · `now()`): `companion_past_stories_status(character)` · `companion_open_past_stories(character, request_id)` ·
  `companion_list_past_stories(character)`. 판정은 시각을 받는 내부 함수 `companion.*_at(user, character, …, p_now)`가 한다(테스트가 시각을 옮긴다).
- 응답 모양은 [docs/specs/past-stories.md](../specs/past-stories.md).

### D6. 이벤트 · 기록
- 서버 이벤트 표는 두지 않는다. 산 기록은 원장(`past_stories`)과 열기 표가 말한다. 분석 이벤트(시트 노출 · 열기 · 부족)는 앱 PR에서 정한다(ADR-0029).

## 버린 대안

- **ADR-0178 개정** — 친구 스토리 ADR은 열린 앱 PR(대화방 스토리 판)이 고치는 중이라 새 ADR로 뺐다.
- **인물 단위가 아니라 전체 지난 스토리 한 번에** — 시안이 친구 프로필 시트에서 여는 흐름(41 · 42)이다.
- **구독 무료를 열기 없이 목록에서 바로** — 기록이 없으면 「무엇을 무료로 봤나」를 셀 수 없고, 구독이 끝나는 순간 보던 화면이 잠긴다. 한 번 눌러 0 기록을 남긴다.
- **이미 열렸을 때 다시 사면 7일 연장** — 실수로 두 번 사는 길이 생긴다.
- **새 지갑 함수 · 새 원장 종류** — 기존 `spend`로 충분하다.

## 대가

- 굴러가는 창이라, 연 직후 만료되는 스토리도 그 7일 안에 보인다(덤). 연 순간 보인 미리보기와 7일 뒤의 목록이 다를 수 있다.
- 「말한 적 있음」이 친구 기준이라, 앱에서 방은 열렸지만 아직 한 번도 말하지 않은 인물은 `not_friend`다. 앱은 그 경우 프로필 시트에 줄을 그리지 않는다.

## 운영 적용 (머지 뒤 사용자 승인으로)

1. 마이그레이션 `20270111120000_past_stories.sql` 적용(기록 버전 `20270111120000`). 기본 스위치 off라 적용만으로는 아무에게도 보이지 않는다.
2. 시험 계정에 켜기: `update companion.settings set past_stories = 'testers';` → 앱 PR 확인 뒤 `'on'`.
3. 값 바꾸기(필요하면): `update companion.settings set past_story_price = 10;`
