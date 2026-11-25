# ADR-0196 — Chat Plus 첫 구독 보너스: 유료 기간이 처음 시작될 때 엽전 100을 계정당 한 번

- 상태: **채택(같은 날 개정 1) — 앱 · 서버 파일 구현, 서버 마이그레이션 운영 적용 · 웹훅 함수 배포 전.** (`20270107120000_chat_plus_first_bonus.sql` 적용과
  `revenuecat-webhook` 배포는 사용자가 한다.)
- 날짜: 2026-11-25.
- **사용자 결정(2026-11-25)** — 「chat plus 구독자한텐 첫 구독 보너스로 100 엽전 주는걸로」. 배경: 첫날 무제한 티켓(ADR-0186 개정 2)은 구독자에게 주지 않게 됐고,
  Chat Plus는 무제한 티켓이 들지 않은 요금제다.
- 그 밖에 기본값으로 정한 것 — 「⟨기본값⟩」 표시.
- 이어받는 결정: [ADR-0144](0144-subscriptions-revenuecat.md)(웹훅 → `companion_apply_store_event` · 서버 지갑) · [ADR-0174](0174-signup-welcome-reward.md)(보상 모달 ·
  칩으로 날기 · 기기 기록) · [ADR-0175](0175-push-campaign-reward.md)(보상 틀 `RewardModal` · 지도 안내 순서) · [ADR-0163](0163-purchase-pending-state.md)(구매 뒤 권한 다시 읽기) ·
  [ADR-0029](0029-product-analytics-posthog.md)(이벤트).

## 맥락

1. 구독의 정본은 서버다. RevenueCat 웹훅(`revenuecat-webhook` → `_shared/revenuecat-event.ts`가 정규화)이 이벤트마다
   `public.companion_apply_store_event(p_event)`를 한 번 부르고, 이 함수가 상품 표(`companion.store_products` — Chat Plus는 `duru.chatplus.monthly.v1` ·
   `duru.chatplus.yearly.v1`, Play는 `…:base`)로 요금제를 찾아 권한 줄(`companion.plan_entitlements`)을 쓴다. 같은 이벤트 id는 `companion.store_events`가 거른다.
2. 엽전은 서버 지갑이고 한 번 지급은 `companion.grant_once(user, amount, reason, ref)` — 원장 `(reason, ref_id)` 유일 색인이 지킨다(ADR-0140 · 0174).
3. 지금까지 정규화 이벤트는 **체험인지 모른다.** RevenueCat은 `period_type`(TRIAL · INTRO · NORMAL · PROMOTIONAL · PREPAID)을 싣는데 읽지 않았다. 무료 체험을
   시작할 때도 `INITIAL_PURCHASE`(→ activate)가 온다. 체험이 유료로 넘어가면 `RENEWAL`(period_type NORMAL)이 온다.
4. 앱은 구매가 성공하면 권한(`companion_entitlements`)과 잔액을 60초 동안 다시 읽고(ADR-0163), 앱을 열 때 · 앞으로 올 때 · 만료 경계에도 권한을 다시 읽는다.
   웹훅이 그보다 늦거나 체험이 며칠 뒤 유료로 넘어가면, 지급은 앱이 모르는 사이에 일어난다.

## 결정

### D1. 언제 주나 — Chat Plus 유료 기간이 처음 시작될 때, 계정당 평생 한 번
- 조건(서버, `companion_apply_store_event` 안): 이벤트 action이 `activate`이고 **종류가 `INITIAL_PURCHASE` · `RENEWAL`** 이고 **`periodType`이 `NORMAL` · `INTRO` ·
  `PREPAID`**(돈을 낸 기간)이고 상품의 요금제가 `chat_plus`.
  - 체험(`TRIAL`) · 프로모션(`PROMOTIONAL`) · 기간 연장(`SUBSCRIPTION_EXTENDED`) · 임시 권한(`TEMPORARY_ENTITLEMENT_GRANT`)은 주지 않는다 — **체험만 하고 끊는 반복을
    막는다.** 체험이 유료로 넘어가는 `RENEWAL`에서 준다.
  - `periodType`이 없으면(**새 함수를 배포하기 전에 온 이벤트**) 주지 않는다 — 체험인지 모르는 이벤트에 주지 않는 쪽이 안전하다. 운영 적용 순서는 「운영 적용」 절.
- 한 번: `grant_once(uid, 금액, 'chat_plus_first_bonus', uid)` — ref = 사용자 id라 **해지 뒤 재구독 · 월 ↔ 연 바꿈 · 다른 상품 · 같은 이벤트 재전송**이 모두
  두 번째 행을 만들지 못한다.
- 늦게 온 이벤트(`stale` — 같은 권한에 더 늦은 이벤트가 이미 적힘)도 유료 시작이면 준다 — 권한 줄은 건드리지 않고 지급만. 돈을 낸 사실은 도착 순서와 상관없다.
- ⟨기본값⟩ **Chat Plus만.** Premium · Unlimited Tickets로 시작한 구독은 받지 않는다. Premium · Tickets 구독자였던 계정이 나중에 Chat Plus로 처음 유료 기간을 시작하면
  받는다(「Chat Plus 첫 구독」으로 읽었다 — 「어떤 구독이든 첫 구독」이면 이력 조회가 필요하다, 확인 필요 1).
- **환불돼도 회수하지 않는다.** 원장의 지급 행이 기록이다(`revoke` 행을 만들지 않음).
- 금액: `companion.settings.chat_plus_first_bonus`(기본 100, 0이면 끔 — `grant_once`가 0 이하를 주지 않는다). 앱 업데이트 없이 운영에서 바꾼다.
- 매달 엽전(Chat Plus 300, ADR-0144)과는 따로다 — 같은 activate에서 둘 다 들어온다(첫 달 400).
- 처리 결과(outcome)는 지금 값 그대로 둔다(`activated` 등) — 지급 여부는 원장과 알림 표가 말한다.

### D2. 정규화 이벤트에 `periodType`
- `_shared/revenuecat-event.ts`가 `event.period_type`을 `periodType`(문자열 · 없으면 null)으로 싣는다. 값을 거르지 않는다 — 판정은 DB가 한다(D1).
- 계약 `StoreEvent.periodType: string | null`. DB 함수는 `p_event->>'periodType'`만 읽는다.

### D3. 앱이 아는 방법 — 알림 표 + 별도 RPC 한 번(「이미 알렸나」를 서버가 쥔다)
- 지급하는 순간 `companion.subscription_bonus_notices(user_id, amount, granted_at, announced_at)`에 한 행(사용자 FK, 탈퇴하면 사라짐).
- `public.companion_claim_subscription_bonus()`(로그인 필수, `authenticated`만): 알리지 않은 행이 있으면 `announced_at`을 찍고
  `{ amount: N, reason: 'announced', wallet }`, 이미 알렸으면 `{ amount: 0, reason: 'already_announced' }`, 행이 없으면 `{ amount: 0, reason: 'none' }`.
  ~~지급하지 않는다~~ → 개정 1(아래 D6): 이미 구독 중인데 아직 안 받았으면 이 RPC가 먼저 지급한다.
- ⟨기본값⟩ 권한 응답(`companion_entitlements`)의 칸으로 두지 않은 까닭: 권한은 구매 뒤 60초 동안 · 만료 경계마다 다시 읽고(`sameEntitlements`가 견줌), 「본 것으로 표시」는
  쓰기라 읽기 RPC에 섞을 수 없다. 별도 RPC는 한 번에 「알림 꺼내기 + 표시」를 해 기기 둘 · 재설치에서도 모달이 한 번이다.
- **언제 묻나**: 로그인했고, 권한에 Chat Plus 또는 Premium 줄이 있고, 지도가 한가하고, 이 기기 기록이 아직 없을 때 — **권한 줄의 모양(요금제 · 만료)이 바뀔 때마다 한 번**.
  - 바로 산 경우: 권한 줄과 지급이 웹훅의 한 트랜잭션이라, 구매 뒤 다시 읽기(ADR-0163)가 권한을 받으면 지급도 이미 있다 — 상점을 닫고 지도로 오면 묻는다.
  - 체험: 체험 시작 때 물으면 `none`(기록 안 함). 며칠 뒤 유료로 넘어가면 RENEWAL이 만료를 늘려 **줄 모양이 바뀌므로** 다음 실행(앱을 열거나 앞으로 올 때 · 만료 경계의
    다시 읽기)에서 다시 묻는다 — 웹훅이 늦어도 다음 열 때 보인다.
  - Premium 줄도 묻는 까닭: Chat Plus로 받은 뒤 곧바로 Premium으로 올리고 나서야 앱을 연 사람도 보게.
- 기기 기록 `libitum.subscription-bonus.<uid>` = `{ amount, shown }`: 받으면 `{ N, false }`(모달 대기), Got it 뒤 `{ N, true }`, 서버가 `already_announced`면
  `{ 0, true }`. 기록이 있으면 다시 묻지 않는다(평생 한 번이라). `none`이면 적지 않는다(다음 바뀜에 다시 묻는다). 묻기 실패(오프라인 · RPC 없음)도 적지 않는다.

### D4. 모달 — 가입 보상 창과 같은 틀
- `RewardModal`(ADR-0175) 그대로: 위 알약 **「SUBSCRIBER GIFT」**(언어별), 제목 **「Welcome to Chat Plus!」**(요금제 이름은 스토어 상품명이라 모든 언어에서 영어 —
  `ui-copy-plans`와 같다), big-pouch + 엽전 여섯 톡 + `+0 → +100`(낭독 「+100 Yeopjeon」), 보조문, Got it → 머리 엽전 칩으로 날기 → 칩을 서버 잔액으로.
  새 그림 · 새 CSS 없음.
- 순서: 가입 보상 → 푸시 보상 → **구독 보너스** → 엽전 출시 → 업데이트 안내 → Letters 추천 → 알림 권한. 묻는 중 · 모달 대기 · 날기 동안 뒤 안내를 미룬다. 모달은 첫 유닛
  안내가 꺼진 뒤에 선다(푸시 보상과 같은 기준).

### D5. 분석 이벤트(ADR-0029 「D3 목적 구분」, 영역 `learning`)
- **`subscription_bonus_shown { plan: chat_plus, amount }`** — 서버가 알린 보너스 모달이 설 때 한 번. 지급 자체는 원장 `chat_plus_first_bonus`가 센다.

### D6. 개정 1 — 이미 구독 중인 사람은 앱에 돌아왔을 때 지급 · 알림 (2026-11-25 사용자 결정)
- 「이미 Chat Plus를 구독 중인 사람도 다음 갱신을 기다리지 않고 앱에 돌아왔을 때 모달로 알리면서 지급한다.」
- `companion_claim_subscription_bonus()`가 먼저 판정한다: 설정 금액 > 0 이고 호출한 사용자에게 **지금 활성 Chat Plus 권한**(`plan_active`)이 있으면
  `grant_once(uid, 금액, 'chat_plus_first_bonus', uid)` + 알림 행 → 이어서 지금처럼 알림을 꺼내 `announced`(+금액). 웹훅과 같은 reason · ref라
  **웹훅 · 앱 어느 쪽이 먼저여도 평생 한 번**(서버 CB-S13 · S14).
- 웹훅의 유료 시작 지급(D1)은 그대로 — 앱을 열지 않아도 받는다.
- **체험 처리**: 권한 표(`plan_entitlements`)에는 체험 칸이 없다. 대신 권한 줄의 마지막 이벤트(`source_event_id` → `store_events.payload.periodType`)가
  `TRIAL` · `PROMOTIONAL`이면 주지 않는다(CB-S16 — 유료로 넘어간 뒤 받는다). RevenueCat은 체험 중 취소 · 결제 문제 이벤트에도 `period_type`을 싣는다.
- 앱 · 모달 · 문구 · 묻는 조건(권한에 Chat Plus · Premium 줄)은 그대로. 「아직 안 받은 기존 구독자」는 첫 실행에서 묻게 되고 서버가 바로 준다.
- 대가: 아래 「대가」의 체험 줄.

## 버린 대안
1. **앱이 구매 성공을 보고 지급(claim이 지급)** — 앱은 체험인지 · 돈을 냈는지 모른다. 지급은 돈을 낸 사실(웹훅)에 둔다.
2. **권한 응답에 `bonus` 칸** — D3.
3. **체험 시작 때 지급** — 체험만 하고 끊고 새 계정으로 다시 체험하는 반복이 남는다. 사용자 브리프 「유료 기간이 시작될 때」.
4. **기기 기록만으로 한 번 보이기** — 재설치 · 두 기기에서 다시 뜬다. 서버 `announced_at`이 정본, 기기 기록은 요청을 아끼는 몫.
5. **`periodType`이 없으면 준다** — 배포 순서가 어긋나면 체험 시작에 준다. 안전한 쪽(주지 않음)을 골랐다.

## 대가
- 웹훅 경로는 함수를 배포하기 전까지 아무도 주지 않는다(`periodType` 없음). 개정 1 뒤로는 그 사이 유료 시작한 계정도 앱에 돌아오면 claim이 준다.
- ~~적용 전에 유료로 시작한 구독자는 다음 RENEWAL에 받는다~~ → 개정 1: 앱에 돌아오면 바로 받는다.
- **체험 구분의 빈틈(개정 1)**: 앱 경로의 체험 판정은 권한 줄의 마지막 이벤트의 `periodType`에 기댄다. **periodType을 싣는 웹훅 함수를 배포하기 전에 온 이벤트**로
  만들어진 권한(그 시절 체험을 시작한 사람 포함)은 체험인지 알 수 없어 체험 중이어도 받는다. 함수 배포 뒤 체험을 시작한 사람은 받지 않는다. 막으려면 권한 표에
  체험 칸을 두거나 RevenueCat REST로 확인해야 한다 — 이번에는 두지 않았다.
- 알림을 꺼낸 뒤 모달을 보기 전에 앱이 죽으면 기기 기록(`{ N, false }`)이 남아 다음 실행에 모달이 선다. 기록 쓰기까지 실패하면 그 기기에서는 모달 없이 잔액만 오른다.
- 탈퇴 뒤 같은 신원으로 새 계정을 만들고 다시 구독하면 또 받는다(원장 cascade). 돈을 내야 받는 보상이라 막지 않는다.

## 확인 필요
1. Premium · Unlimited Tickets를 먼저 구독했던 계정이 Chat Plus로 처음 유료 기간을 시작할 때도 줄까 — 지금은 준다(D1 기본값).
2. ~~적용 전부터 Chat Plus를 내던 구독자에게 소급할까~~ — 2026-11-25 사용자 결정으로 닫힘(D6: 앱에 돌아오면 지급).

## 운영 적용(사용자)
1. **먼저** `revenuecat-webhook` 함수를 배포한다(`periodType`을 싣는다 — 옛 DB 함수는 모르는 키를 무시한다).
2. 그다음 `20270107120000_chat_plus_first_bonus.sql`을 적용한다. 확인 질의:
   `select chat_plus_first_bonus from companion.settings;`(100) · `select count(*) from companion.subscription_bonus_notices;`(처음 0).
3. 끄기: `update companion.settings set chat_plus_first_bonus = 0;`(앱 변경 없이 — 지급이 없어 모달이 서지 않는다).
4. 샌드박스 확인은 개발 프로젝트(`REVENUECAT_ACCEPT_SANDBOX=true`)에서 — 운영 함수는 샌드박스 이벤트를 거른다.

## 테스트
- 서버 unit CB-W1 · W2(`revenuecat-event.unit.test.ts` — `periodType`).
- 서버 integration CB-S1 ~ S16(`chat-plus-first-bonus.integration.test.ts`, 임베디드 Postgres — S11 ~ S16은 개정 1).
- 앱 unit CB-U1 ~ U8, ui CB-UI1 · UI2, integration CB-I1 ~ I4.
- e2e [수동](../e2e/chat-plus-first-bonus.md).
