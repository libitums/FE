# ADR-0144 — 구독 · 엽전 팩: RevenueCat + 서버 정본 (1단계)

- 상태: **채택 — 1단계(서버 표 · 웹훅 · 앱 화면) · 결제 전 미리보기(2026-11-17) · 2단계 네이티브 다리(2026-11-18, 결제 플래그 꺼짐).
  스토어 상품 · RevenueCat 설정 · 웹훅 배포 · 샌드박스 확인 뒤 `purchasesEnabled()`를 켠다.**
- 날짜: 2026-11-14.
- **사용자 결정(2026-11-14)**
  - 스토어 결제(iOS StoreKit · Google Play Billing) · 영수증 검증 · 권한 · 웹훅 · Airbridge 연동은 **RevenueCat**. 엽전 잔액과 요금제 등급의 정본은
    **우리 서버**. RevenueCat 가상 화폐 기능은 쓰지 않는다. RevenueCat app user id = Supabase user id(PostHog identify · Airbridge setUserID와 같은 id).
  - 요금제는 **1판**이고 앱 업데이트 없이 바꿀 수 있어야 한다 — 혜택은 서버 표, 앱은 읽기만. 상품 id에 판 접미사.
  - 1판(월, 연간 = ×10 · 2개월 무료): Unlimited Tickets $3.99(레슨 티켓 무제한, 학습만) · Chat Plus $6.99(하루 무료 대화 30 · 매달 +300 엽전 · 모든 인물) ·
    Premium $11.99(티켓 무제한 + 대화 무제한(공정 사용 하루 200) + 매달 +800 엽전). 엽전 팩 500 $4.99 · 1,200(1,000 + 200) $9.99 · 3,000(2,000 + 1,000) $19.99.
  - 자리: 시안 [N1XiHjnx7E243xFAu4wwU2](https://claude.ai/artifact/N1XiHjnx7E243xFAu4wwU2) 「요금제」 탭 — 티켓 다 씀 대화상자 → Unlimited Tickets,
    메신저 무료 다 씀 판 → Chat Plus + Premium, 설정 → Plans 비교(Premium BEST). 축하 순간에는 결제를 붙이지 않는다.
- 이어받는 결정: [ADR-0115](0115-unlimited-ticket-presentation.md)(무제한 티켓 — 학습 전용) · [ADR-0117](0117-messenger-chat-turns-coins-new-friend.md)(무료 3통 · 엽전 보내기) ·
  [ADR-0140](0140-yeopjeon-launch.md)(서버 지갑 · `grant_once`) · [ADR-0029](0029-product-analytics-posthog.md)(제품 이벤트 D3).

## 맥락
엽전(ADR-0140)과 무료 대화 수(ADR-0117)가 서버 · 앱에 자리 잡았고, 유료화의 남은 조각은 「스토어에서 돈을 받아 등급 · 엽전으로 바꾸는 길」이다.
Lynx용 결제 SDK는 없다. 스토어 두 곳의 영수증 검증 · 갱신 · 환불 · 유예 · 이전(계정 바꿈)을 직접 짓는 것은 이 팀 크기에 비해 크다.

## 결정

### D1. RevenueCat을 쓴다 — 버린 안
| 안 | 버린 까닭 |
|---|---|
| StoreKit 2 · Play Billing 직접 + 서버 영수증 검증 | App Store Server API · Play Developer API · 알림 V2 · RTDN을 각각 짓고 지켜야 한다. 유예 · 환불 · 가족 공유 · 가격 인상 동의 같은 경계가 많다 |
| Adapty | 기능은 비슷하지만 Airbridge 직접 연동 · 문서 · 커뮤니티가 RevenueCat보다 얇다. 바꿀 까닭이 없다 |
| Qonversion | 같은 이유 + 웹훅 · 통합 선택지가 좁다 |
- 대가: 매출 일정 비율의 수수료(무료 구간 위), 외부 의존 하나. 정본을 우리 DB에 두므로 RevenueCat을 바꾸거나 빼도 등급 · 엽전은 그대로다(웹훅 어댑터만 바뀐다).

### D2. 정본은 서버 — 갈라 맡기
| 무엇 | 정본 | 비고 |
|---|---|---|
| 결제 · 영수증 · 갱신 · 환불 판단 | RevenueCat(스토어) | 우리는 웹훅으로 결과만 받는다 |
| 대화 등급(free · chat_plus · premium) · 학습 권한(unlimited_tickets) | `companion.plan_entitlements` | RevenueCat entitlement는 **읽지 않는다** — 상품 id → 요금제는 우리 표 |
| 혜택 숫자 | `companion.plans` | 운영에서 행을 고치면 관문 · 차감 · 앱 화면이 바로 따른다 |
| 엽전 잔액 | `companion.credit_wallets` · 원장 | 가상 화폐 기능 안 씀. 매달 엽전 = grant 버킷, 팩 = paid 버킷 |
| 가격 표시 | 스토어(RevenueCat offerings) | 서버 · 앱은 가격을 들지 않는다(지역 · 통화 · 세금) |

### D3. 웹훅 흐름(`revenuecat-webhook`)
RevenueCat → Edge Function(`verify_jwt = false`, `Authorization` 헤더 = `REVENUECAT_WEBHOOK_AUTH`, 고정 시간 비교) → 본문 정규화(`revenuecat-event.ts`,
원문 · 구독자 속성은 넘기지 않음) → `public.companion_apply_store_event(p_event)` 한 번(service_role) → 200 `{outcome}`.
DB가 실패하면 500 — RevenueCat이 다시 보낸다. 같은 이벤트 id는 `companion.store_events`가 거른다(`duplicate`).
| 종류 | 처리 |
|---|---|
| INITIAL_PURCHASE · RENEWAL · SUBSCRIPTION_EXTENDED · TEMPORARY_ENTITLEMENT_GRANT | 권한 활성(만료 · 기간 시작 = 구매 시각) + 그 기간의 매달 엽전 |
| CANCELLATION | 자동 갱신 끔 — **만료까지 유지** |
| CANCELLATION(사유 CUSTOMER_SUPPORT) · REFUND | 환불: 구독은 바로 끊음(revoked), 팩은 잔액이 되면 회수 · 모자라면 기록만(`refund_unrecovered`) |
| UNCANCELLATION | 다시 active |
| BILLING_ISSUE | 유예 만료까지 유지(`grace_period_expiration_at`) |
| EXPIRATION | 끊음 |
| NON_RENEWING_PURCHASE | 엽전 팩 → paid 버킷, 거래 id로 한 번(`rc:<transaction_id>`) |
| PRODUCT_CHANGE | 바꿀 상품만 적음 — 권한은 뒤이은 구매 · 갱신 이벤트가 바꾼다 |
| TRANSFER | 권한을 새 사용자로 옮김(겹치면 늦은 만료) |
| TEST · 그 밖 | 기록만 |
- 사용자: app_user_id · original_app_user_id · aliases 중 `auth.users`에 있는 첫 uuid. 익명 id(`$RCAnonymousID`)뿐이면 `unknown_user`(기록만).
- 순서: 권한 행의 마지막 이벤트 시각보다 이른 이벤트는 `stale`로 버린다(웹훅은 순서를 보장하지 않는다).
- 샌드박스: `REVENUECAT_ACCEPT_SANDBOX=true`인 프로젝트(개발 · QA)만 반영하고, 운영은 DB 없이 200 `sandbox_ignored`.

### D4. 상품 id · 권한 id
- 구독 `duru.<plan>.<period>.v<판>` — `duru.tickets.monthly.v1` · `duru.tickets.yearly.v1` · `duru.chatplus.monthly.v1` · `duru.chatplus.yearly.v1` ·
  `duru.premium.monthly.v1` · `duru.premium.yearly.v1`. 팩 `duru.coins.<총량>.v<판>` — `duru.coins.500.v1` · `duru.coins.1200.v1` · `duru.coins.3000.v1`.
- Play 구독은 RevenueCat이 `구독id:기본요금제id`로 보내므로 서버가 `:` 앞부분으로도 찾는다(Play 구독 id = 위 id, 기본 요금제 하나).
- RevenueCat entitlement id(대시보드 · SDK 표시용): `unlimited_tickets` · `chat_plus` · `premium`(= `companion.plans.id`). Premium 상품은
  `premium`과 `unlimited_tickets` 둘에 붙인다(SDK가 앱 안에서 바로 보이게 — 정본은 여전히 서버).

### D5. 요금제를 나중에 바꾸는 규칙
- **혜택(무료 수 · 상한 · 매달 엽전 · 티켓 · BEST · 순서)**: `companion.plans` 행을 고친다. 앱 업데이트 없음, 기존 구독자에게도 바로 적용.
- **가격**: 스토어 콘솔에서 같은 상품 id의 가격을 바꾼다(스토어의 가격 인상 동의 규칙을 따름). 서버 · 앱 변경 없음.
- **새 상품 id(`.v2`)**: 기간 · 종류가 바뀌거나, 기존 구독자를 옛 가격에 두고 새 가입만 다르게 받고 싶을 때. `companion.store_products`에 행을 더하고
  RevenueCat Offering을 새 id로 바꾼다. **옛 id의 행은 지우지 않는다**(`active = false`로 앱에서만 숨김) — 옛 구독자의 갱신이 계속 온다.
- **새 요금제**: plans 행 + 상품 행 + 앱 문구(이름)가 필요하다. 앱은 모르는 요금제 id를 버리므로(문구 없음) 앱 업데이트 전까지 보이지 않는다.

### D6. 관문 · 차감이 표를 읽는다(`20261129120000_subscriptions.sql`)
- 옛 `companion_turn_gate` · `companion_begin_turn`을 `companion.turn_gate_base` · `companion.begin_turn_base`로 옮기고 같은 이름의 얇은 겉을 씌운다.
  **무료 사용자와 옛 `companion.entitlements`(플레이그라운드 premium)는 base 그대로** — 지금과 같다.
- 구독 등급(활성 권한 중 가장 높은 chat_rank): 체험 · 잔액 관문을 건너뛰어 모든 인물. 그날(UTC) 요금제 무료 턴(`credit_holds.plan_free`)이 남았으면 0 예약,
  다 쓰면 엽전(단가 그대로). `daily_message_cap`(Premium 200)에 닿으면 `usage_time_limit {limit: 'fair_use'}`(앱이 이미 아는 거절 코드).
- **무료 등급의 하루 3통은 지금 앱(기기) 셈이다**(ADR-0117). 서버는 값만 `companion_plans().free.dailyFreeMessages`로 내준다. 서버로 옮기는 것은 후속
  (앱 원장 `turn-ledger`가 이 값을 읽고, 서버가 무료 턴을 세게 바꾸는 일 — 바꾸면 지금의 「무료 3통 뒤 서버 차감」 동작이 달라져 따로 결정).
- 매달 엽전: 기간 시작부터 달마다 한 번(`grant_once(..., 'plan_coins', '<uid>:<권한>:<기간 시작>:<달>')`). 월간은 갱신마다 새 기간, 연간은 달마다 —
  웹훅 때 지급하고, 연간의 다음 달 몫은 `companion_grant_due_plan_coins(now())`(pg_cron 하루 한 번, 운영 설정은 2단계)가 준다.

### D7. 앱(1단계 — 네이티브 SDK 없음)
- `lib/plans-api.ts`(`companion_plans` · `companion_entitlements`, 던지지 않음) · `screens/plans/plans-model.ts`(자리별 요금제 · 혜택 줄 · 가격 · 처음 고름) ·
  `lib/purchase-bridge.ts`(2단계 네이티브 모듈 계약 `configure · offerings · purchase · restore` + **꺼진 구현** — 「아직 안 됨」).
- 설정 → Plans(route `plans`) · 티켓 다 씀 대화상자의 무제한 티켓 카드(「Go unlimited」 첫 동작 + 「Compare plans」) · 메신저 무료 다 씀 판의 Chat Plus · Premium 카드.
  1단계에서 맥락 단추는 모두 그 요금제를 강조한 Plans 화면을 연다(구매는 Plans 화면 한 곳).
- **기능 플래그 `plansFeatureEnabled()` = false** — 운영 사용자에게는 줄 · 카드 · RPC가 모두 없다. 2단계에서 켠다.
- 이벤트: `plans_viewed {placement, view: offer | compare}` · `plan_selected {plan, period, placement}`. 브리프의 `{surface}`는 `placement`로 둔다 —
  `surface`는 D3 공통 속성(learning · chat)이라 값이 섞이면 대시보드가 깨진다(tickets · settings → learning, messenger → chat). 구매 이벤트는 2단계(RevenueCat → Airbridge가 매출 이벤트를 보냄).

## 위험 · 대가
1. **Lynx SDK 없음** — 2단계에서 iOS · Android 호스트가 RevenueCat SDK를 들고 `PurchaseBridge` 네 동작을 네이티브 모듈로 연다. 결제 시트 · 복원 · 오류 표시를 기기에서 확인해야 한다.
2. **샌드박스 이벤트가 Airbridge를 더럽힘** — 운영 웹훅은 샌드박스를 거르지만 RevenueCat → Airbridge 통합은 별도다. 통합 설정에서 샌드박스 전송을 끄거나(가능하면),
   Airbridge에서 환경으로 거른다. 개발 RevenueCat 프로젝트를 따로 두는 것도 방법(store-setup 문서).
3. **환불 · 회수** — 엽전 팩을 쓴 뒤 환불하면 회수하지 못하고 기록만 남는다(`refund_unrecovered`). 남용이 보이면 다음 판에서 잔액 음수 · 차단을 따로 정한다.
   구독 환불은 바로 끊지만 이미 준 매달 엽전은 회수하지 않는다.
4. **PRODUCT_CHANGE 해석** — 업그레이드가 곧바로 새 상품의 구매 · 갱신 이벤트로 오는지 스토어마다 다르다. 2단계 샌드박스에서 확인하고 필요하면 처리 표를 고친다.
5. **연간 매달 엽전은 크론이 있어야** 다음 달 몫이 들어온다(웹훅은 연 1회). 크론 등록 전에는 갱신 · 앱 재구매 때만 따라잡는다.
6. 옛 `companion.entitlements`는 그대로 둔다(플레이그라운드). 구독 권한과 둘 다 있으면 구독 쪽이 이긴다.
7. 웹훅 함수는 원문을 저장하지 않는다(구독자 속성 · 이메일 등 개인정보) — 디버깅은 RevenueCat 대시보드의 이벤트 기록으로 한다.

## 2단계로 넘긴 리뷰 지적
- 구매 · 복원이 도는 동안 화면에 진행 상태가 없음(#434 리뷰) — **2단계에서 처리**: `use-plan-request`가 도는 요청(`purchase` · `restore`)을 그림
  상태로 올려 누른 단추는 로딩, 다른 단추는 막힘. 엽전 상점의 사기 단추도 결제 시트가 떠 있는 동안 로딩이고 다시 누름을 무시한다.

## 추가 (2026-11-17) — 결제 전 미리보기 · 임시 추천 가격 · 구매 의향 [사용자]

- 결정: 「일단 추천 방안으로 표시하고 아직 준비 중으로 뜨지만 결제 욕구도 있는지 이벤트 트래킹」. 2단계(네이티브 구매 다리) 전에 요금제를 보인다.
- **플래그 켬**: `plansFeatureEnabled()` = true. 로그인 사용자에게 설정 → Plans 줄 · 티켓 다 씀 대화상자 카드 · 메신저 무료(체험) 다 씀 판 카드가 선다.
  손님은 여전히 없음(요금제 RPC가 로그인을 요구하고 구매도 계정에 붙는다 — 손님은 메신저 · 설정에서 가입 권유를 먼저 본다). 실제 결제를 여는
  것은 구매 다리(`PurchaseBridge.available`)이고 꺼진 다리 그대로다 — Continue · Restore는 「Payments are coming soon — we'll let you know when they're
  ready.」(5개 언어) 안내 한 줄.
- **임시 추천 가격**(`lib/provisional-prices.ts`, 한 표): 스토어 가격(offerings)이 없을 때만 보인다 — 스토어에 닿으면(목록이 null 아님) 언제나 스토어가
  이기고, 목록에 상품이 없으면 가격을 비운다. 나라는 **학습자 프로필의 나라**(`countryCode`, 새 권한 없음) — VN · ID · PH · TH · MY는 그 나라 통화,
  그 밖 · 모름은 미국 달러. 값은 사용자가 승인한 동남아 시장가 표(2026-11-17 가격 조사), 미국은 1판 그대로. 연간은 지역마다 배수가 달라(동남아 ×8)
  「Yearly: save N%」를 고른 요금제의 임시 가격으로 센다(스토어 가격이면 「Yearly: pay less per month」). 엽전 상점도 같은 표로 팩 가격을 보인다
  (상품 id `duru.coins.500/1200/3000.v1`). 엽전 100 팩은 상품 · 그림 · 문구가 없어 넣지 않았다. 2단계가 붙으면 표를 지운다.
- **구매 의향 이벤트** `purchase_intent { placement: settings | tickets | messenger | coin_shop, kind: plan | pack, product, period: monthly | yearly | once,
  price, currency, country, preview }` — 요금제 Continue · 엽전 팩 사기를 누를 때. `price`는 보인 임시 가격의 금액(10진 문자열, 스토어 가격이면 빈 문자열),
  `country`는 가격 지역, `preview` = 결제를 열지 못하고 안내로 끝남. 엽전 상점은 요금제 결선 밖(머리 엽전 칩 · 채팅방 겹침)이라 결선이 적은 지역 · sink를
  `lib/purchase-intent.ts`에서 읽는다(2단계에서 지움). `plans_viewed` · `plan_selected`는 그대로.
- 부팅 세션 갱신과 겹치지 않게: 요금제 표 읽기는 세션이 갱신 필요 상태면 1초씩(최대 30번) 기다린다 — 겹치면 같은 refresh 토큰으로 갱신을 두 번 보낸다(IA7).
- 대가: 운영의 로그인 사용자가 로그인마다 `companion_plans` RPC를 한 번 부른다. 화면의 가격은 스토어 가격이 아니다(세금 포함 추정 표시가) — 2단계 전까지
  구매가 없으므로 청구와 어긋날 일은 없다. 플래그 하나로 다시 끌 수 있다.

## 2단계 (2026-11-18) — 네이티브 구매 다리 [사용자: 「엽전 팩 + 구독 둘 다」 · RevenueCat 유지]

- **SDK · 버전(정확 고정, ADR-0012 D4)**: iOS pod `RevenueCat` 5.99.2(StoreKit 2) · Android `com.revenuecat.purchases:purchases` 10.30.1
  (Play Billing 8.3.0 — Play의 Billing 8 요구 충족). 11.x 줄은 나온 지 3주가 안 되어 쓰지 않았다.
- **키(공개 SDK 키, 비밀 아님 · 그래도 추적 안 함)**: iOS `apps/ios/Config/RevenueCat.local.xcconfig`의 `REVENUECAT_API_KEY`
  → `RevenueCat.xcconfig` → Info.plist `RevenueCatAPIKey`. 프로젝트 기본 xcconfig는 새 `Config/Host.xcconfig`(Airbridge · RevenueCat 둘을 모음)다.
  Android `apps/android/app/revenuecat.properties` → `BuildConfig.REVENUECAT_API_KEY`. 둘 다 `/release-build` 값 파일 목록에 있다.
  **키가 비면 SDK를 한 줄도 부르지 않고 `PurchasesModule`도 등록하지 않는다** — 앱은 1단계 미리보기와 같다.
- **호스트 모듈 `PurchasesModule`(iOS · Android 같은 모양)**: `configure(userId)`(logIn) · `signOut`(logOut, 익명이면 그냥 ok) ·
  `offerings`(D4 상품 아홉의 스토어 가격 글 · 금액 · 통화 — offering이 아니라 상품 id로 직접 읽음) · `storefront`(스토어 나라) ·
  `purchase(productId)` · `restore`. 답은 콜백 하나 `{status, …}`. Android 구독 id는 `id:base`로 나가고 JS가 앞부분만 쓴다. iOS 스토어 나라는 세 글자라
  JS가 가격 지역 다섯 나라 · 미국만 두 글자로 맞춘다.
- **결제 스위치는 하나**: `lib/plans-flag.ts`의 `purchasesEnabled()` — **지금 false**. 꺼진 동안에도 키가 있으면 스토어 가격 · 나라는 읽어 보인다
  (가격 표시가 임시 추천 가격 → 스토어 값). 구매 · 복원 단추는 「곧」 안내 + 구매 의향(`preview: true`).
- **구매 뒤**: 등급 · 엽전 정본은 서버(웹훅)라, 성공(`purchased` · `restored`) 뒤 `companion_entitlements` · `companion_get_wallet`을 2초 × 5번
  다시 읽어 바뀌면 멈춘다(`lib/purchase-refresh.ts`). 잔액은 머리 엽전 칩(엽전 출시 결선의 서버 잔액)으로, 권한은 `PlansWiring.entitlements`로 간다.
  권한은 결제를 열 수 있을 때만 읽는다(결제 전에는 로그인마다 RPC를 늘리지 않음). 웹훅이 10초 안에 안 닿으면 다음 화면 진입 · 실행이 따라잡는다.
- **엽전 상점**: 결선 밖이라 `purchase-intent`의 구매 맥락(`purchasePack`)으로 같은 다리 · 같은 서버 따라잡기를 쓴다. 실패 · 취소는 안내 없이 끝난다
  (스토어 시트가 결제 오류를 스스로 보임). 결제를 열 수 없으면 지금처럼 「결제 준비 중」.
- ~~**아직 아님(후속)**: `PlansWiring.entitlements`를 화면에 쓰기(「지금 요금제」 표시 · 무제한 티켓을 서버 권한으로) — 이번에는 상태만 둔다.~~
  → 아래 「2단계 후속」에서 붙음.
  RevenueCat SDK의 실행 시 offerings 미리 받기는 대시보드에 offering이 없으면 오류 로그를 남긴다(동작에는 영향 없음).

## 2단계 후속 (2026-11-18) — 구독 고지 · 구독 관리 · 서버 권한 화면 반영 · 엽전 실패 안내 [사용자: 「③ 1 ~ 4 진행」]

- **구독 고지(App Store 심사 지침 3.1.2 · Play 구독 정책)**: 요금제 화면의 구매 단추 아래 `PlanTerms` — 고른 요금제 이름 · 가격과 기간(카드와 같은 글:
  스토어 가격, 없으면 임시 추천 가격 · 「스토어에서」) · 결제 계정(App Store · Google Play, 모르면 일반 이름) · 자동 갱신 · 24시간 전 해지 · 해지 자리,
  이용약관 · 개인정보처리방침 링크(`LegalDocumentModule` — 설정과 같은 주소). 다섯 언어(`ui-copy-plans-terms.ts`), th · my는 영어(ADR-0158).
  무료 체험이 없어 체험 문장은 두지 않는다 — 생기면 더한다. 구독 구매가 시작되는 자리는 요금제 화면 하나다(맥락 카드는 이 화면을 연다).
  「Restore purchases」는 이미 요금제 화면에 있다.
- **구독 관리**: 새 호스트 메서드 없이 `ExternalLinkModule`(https만)로 스토어 화면을 연다 — iOS `https://apps.apple.com/account/subscriptions`,
  Android `https://play.google.com/store/account/subscriptions?sku=<구독 id>&package=libitum.duru.android`(`lib/manage-subscription.ts`).
  자리: 머리 무제한 모달(ADR-0115)의 「Manage subscription」 · 곧 끝남의 「Keep unlimited」(갱신을 다시 켜는 곳이 스토어), 요금제 화면의 지금 요금제.
- **서버 권한을 화면에(D2)**: `lib/plan-access.ts`가 권한을 모듈 값으로 들고(요금제 결선이 렌더마다 맞춤 — `tester-access.ts`와 같은 방식),
  - 티켓: `ticketsUnlimited()` = 시험 계정 ∨ 권한 `unlimitedTickets` → 티켓 비용 0 · 머리 칩 무제한 · 결과 화면 남은 장수 줄 없음 · 다음 유닛 ∞ 태그.
    **잠금(유닛 열림)은 그대로** — 시험 계정만 푼다.
  - 대화: `chatUnlimited()` = 시험 계정 ∨ 등급 premium → 앱 관문 열림. **Chat Plus는 지금처럼 free 관문**이다 — 하루 무료 30통은 서버가 세고 앱은 남은 수를
    모른다(차감은 서버가 맞게 함). 앱 표시를 맞추려면 서버가 남은 무료 수를 지갑에 실어야 한다(후속).
  - 무제한 모달: 티켓 무제한 권한의 만료 · 갱신으로 구독 판(시작 시각은 서버가 주지 않아 기간 30 · 365일만큼 앞으로 셈 — 「since」 날짜뿐).
  - 요금제 화면: 지금 요금제 카드에 「Current plan」 배지, 그 요금제를 고르면 계속 대신 「Manage subscription」, 다른 요금제를 고른 동안에는 고지 아래 링크.
  - 결제를 열 수 없으면(지금 운영) 권한을 읽지 않아 모두 지금과 같다(RPC 늘지 않음).
- **엽전 상점 실패 안내**: 결제가 `failed`면(취소 아님) 사기 단추 아래 한 줄(막지 않음, 다시 사면 걷힘). 스토어 시트의 오류는 그대로 스토어가 보인다.

## 구독 입구 (2026-11-18) — [ADR-0160](0160-subscription-entry-one-shop.md)

- 요금제의 입구가 하나의 상점(엽전 | Plans 탭) · 머리 둘째 줄 칩 · 티켓 모달 줄로 넓어졌다. 설정 → Plans만 화면으로 남는다.
- 구독 중 Plans(지금 카드 · 올림/내림 CTA · Manage subscription 위치)와 긴 통화 배치는 ADR-0160 D4 · D5가 정한다. 위 「지금 요금제 카드를 고르면 계속 대신 Manage subscription」은 ADR-0160 D4로 바뀌었다.

## 결제 켬 (2026-11-19)

- `purchasesEnabled()`를 켰다. 유료 앱 계약 · 은행 · 세금 양식이 활성화된 뒤 iPhone 13 mini 샌드박스에서 엽전 500 · 3,000 팩과 Unlimited Tickets 월간을
  사서, RevenueCat 웹훅이 결제 확정 2~4초 뒤 서버 지갑(`coins_granted`) · 권한(`activated`)을 바꾸고 앱이 다음 다시 읽기에서 반영하는 것을 확인했다.
- ⚠ **운영 프로젝트에 `REVENUECAT_ACCEPT_SANDBOX=true`가 켜져 있다**(위 「운영은 `sandbox_ignored`」와 다름). 샌드박스 구매가 운영 계정에 권한 · 엽전을
  준다 — 심사관 구매(샌드박스)가 반영되어야 해서 심사가 끝날 때까지 켜 두고, 출시 뒤 끌지는 사용자 결정으로 남긴다.
- 구독 성공 알림 창은 결제 시트가 `purchased`로 끝난 뒤에 연다(`armOnPurchased`) — 단추를 누를 때 열면 시트 승인 시간(실측 11초)이 12초 창을 먹었다.

## Airbridge 기기 id (2026-11-19) — 구매 이벤트를 광고 클릭에 잇기 [사용자: RevenueCat → Airbridge → Meta 구매 최적화]

- **왜**: RevenueCat 대시보드의 Airbridge 서버 연동은 이미 켜져 있다(구매 · 갱신 · 환불을 RevenueCat이 Airbridge로 보냄). 그 서버 이벤트를 Airbridge가
  설치 · 광고 클릭에 귀속하려면 RevenueCat 고객에 **Airbridge 기기 id(`$airbridgeDeviceId`)**가 있어야 한다. 호스트가 이를 넘기지 않아 Meta 앱 캠페인이
  구매로 최적화할 신호가 기기에 붙지 않았다.
- **무엇(iOS · Android 같은 모양, 새 `PurchasesAttribution`)**: Airbridge SDK의 `fetchDeviceUUID`(비동기 — 부르는 스레드를 막지 않음)로 기기 id를 받아
  `setAirbridgeDeviceID(id)` → `collectDeviceIdentifiers()`(RevenueCat 문서 순서. iOS는 `Purchases.shared.attribution`, Android는 `Purchases.getSharedInstance()`).
  SDK 5.99.2 · 10.30.1 · Airbridge 4.12.0의 공개 API를 소스 · 바이트코드로 확인했다.
  - 부르는 때: ① 앱 시작(두 SDK 시작 직후 — 익명 · 비회원 고객) ② `PurchasesModule.configure`의 `logIn` 성공 뒤(기존 계정으로 들어오면 익명 때 값이
    따라오지 않는다 — RevenueCat app user id = Supabase user id = Airbridge `setUserID`). ③ iOS만: 추적 허용(ATT) 대화상자에 **허용**으로 답한 뒤
    `collectDeviceIdentifiers()`를 한 번 더(`$idfa` 갱신 — RevenueCat 문서 권고).
  - **조건(순수 판정 `shouldLink`)**: RevenueCat 키로 SDK가 섰고 **그리고** Airbridge 값으로 SDK가 섰고 **그리고** 이 기기에서 추적을 멈추지 않았을 때
    (시험 계정 — ADR-0085 D4의 `trackingStopped` 표시)만. 하나라도 아니면 두 SDK를 한 줄도 부르지 않는다 — 값 없이 나간 출시 빌드도 그대로 동작한다.
    기기 id가 비거나 공백이 섞이면(`deviceId`) 걸지 않는다. Android는 SDK 호출을 `RuntimeException | LinkageError`로 감싼다.
  - **ATT**: 이 경로는 대화상자를 띄우지 않는다. RevenueCat은 `ASIdentifierManager`를 읽기만 해서, 허용하지 않은 기기에는 IDFA가 실리지 않는다
    (IDFV · IP는 실린다 — 아래 개인정보).
- **이중 집계 없음**: 앱의 Airbridge SDK는 구매 이벤트를 보내지 않는다 — `startInAppPurchaseTracking` · `trackStoreInAppPurchaseEvent`를 부르지 않고,
  JS 매핑(ADR-0063 D7)에도 구매 카테고리가 없다. 구매는 **RevenueCat 서버 연동 하나만** 보낸다. 앱에서 구매 이벤트를 더하려면 이 줄을 먼저 고친다.
- **개인정보**: RevenueCat이 고객 속성으로 Airbridge 기기 id · IDFV · IP(iOS, 허용 시 IDFA) · 광고 ID · IP(Android)를 받아 Airbridge로 넘긴다. App Store
  응답의 「기기 ID — 개발자 광고 · 추적 예」(ADR-0079)에 이미 들어 있는 범위다. 처리방침의 수탁자 목록에 RevenueCat의 광고 측정 전달을 적을지는
  사용자 확인([iOS 프라이버시](../ios-privacy.md) 「RevenueCat → Airbridge」).
- **확인 남음(기기)**: 새 사용자로 샌드박스 구매 → RevenueCat 고객 화면 속성에 `$airbridgeDeviceId`(· `$idfv` · `$ip`)가 보이고, Airbridge 실시간 로그에
  RevenueCat 발 구매 이벤트가 그 기기로 찍히는지. 샌드박스 이벤트 전송 여부는 위 「위험 · 대가」 2.

## 미뤄진 바꿈 · 만료 경계 (2026-11-19) — 샌드박스 Premium → Unlimited Tickets 내림 [버그]

- **증상**: 같은 구독 그룹 안 내림 · 같은 수준 바꿈은 스토어가 지금 기간 끝으로 미룬다. 웹훅(PRODUCT_CHANGE)은 지금 줄의 `pending_product_id`에
  다음 상품을 적고, 다음 요금제 줄은 기간 끝에 시작하는 활성 줄로 먼저 생긴다. 앱은 ① 미뤄졌다는 것을 몰라 아무 안내가 없었고(구독 성공 알림이
  「Unlimited Tickets is on」을 띄울 수 있었음), ② 권한을 화면 진입 · 구매 뒤에만 읽어 만료를 넘긴 세션의 머리 칩이 PREMIUM에 남았다.
- **서버**: `companion_entitlements()`가 줄마다 `pendingProductId`(없으면 null)를 더 싣는다(`20261214120000_companion_entitlements_pending.sql`).
  다른 키 · 거르기 · 권한은 그대로라 옛 앱은 무시한다. 앱은 키가 없거나 틀려도 줄을 버리지 않는다(옛 서버).
- **앱 — 안내**: 지금 요금제 줄의 pending을 권한 줄(먼저 생긴 다음 요금제 줄) · 요금표 상품에서 요금제로 읽는다(`scheduledChangeOf`). 올림은 곧바로
  바뀌어 지금 요금제가 이미 새 것이라 걸리지 않는다. Plans 지금 카드 한 줄이 「Current plan · Tickets ∞ from Dec 18」, 구독 성공 알림이
  「Unlimited Tickets starts Dec 18 / You keep Premium until then」(다섯 언어).
- **앱 — 경계 다시 읽기**: 가장 가까운 활성 만료 + 2초(서버 `now()` 거르기 · 시각 차)에 한 번, 앱이 앞으로 올 때(`contentSyncOpportunity`) 한 번
  권한을 다시 읽는다(`use-server-entitlements.ts`). 실패(null)면 지금 값을 둔다. 타이머 상한(2^31 - 1 ms)으로 자른다. 결제를 열 수 없으면 읽지 않는다.
- **디자인**: 새 토큰 · 요소 · CSS 없음. 지금 카드의 기존 한 줄(`plans-card-*-current`, 「renews 날짜」 자리)과 토스트의 두 줄 틀(제목 · 본문)을
  그대로 쓰고 글만 바꾼다. 요금제 글은 칩과 같은 짧은 이름(`planShort`, 「Tickets ∞」)이라 긴 언어에서도 카드 한 줄을 크게 넘기지 않는다.
- 구매 뒤 따라잡기는 pending만 바뀌어도 「바뀜」으로 보고 멈춘다(`sameEntitlements`).
- **올림 뒤 내림(2026-11-19 07:53 기기 확인)**: Tickets → Premium 올림 뒤 Premium → Tickets 내림은 Tickets 줄이 올림 전부터 활성이라 「새로 생긴
  요금제」가 없어 알림이 뜨지 않았다. 알림은 새 요금제 줄이 없어도 지금 요금제에 미뤄진 바꿈이 새로 생기면 뜬다(`planActivationOf`). 지금보다 위 등급으로의
  pending(곧바로 바뀌는 올림의 흔적)은 미뤄진 바꿈으로 보지 않는다.
- **서버 — 곧바로 바뀐 옛 줄**: 올림의 PRODUCT_CHANGE를 pending으로만 적어 옛 Tickets 줄이 원래 만료까지 활성 · pending=Premium으로 남았다. RevenueCat
  PRODUCT_CHANGE의 `expiration_at_ms`는 옛 상품의 만료다 — 곧바로 바뀌면 바뀐 시각, 미뤄지면 기간 끝(운영 store_events 10건으로 확인). 그 값으로 줄의 만료를
  앞당기기만 한다(`20261215120000_companion_product_change_expiry.sql`, `companion_apply_store_event`의 한 줄).
- **남은 것**: 미뤄진 바꿈의 대상 카드에 다시 사는 CTA(「Switch to … from 날짜」)가 그대로 보인다 — 스토어가 같은 바꿈을 다시 받는지는 확인하지 않았다.
