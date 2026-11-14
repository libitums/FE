# ADR-0144 — 구독 · 엽전 팩: RevenueCat + 서버 정본 (1단계)

- 상태: **채택 — 1단계(서버 표 · 웹훅 · 앱 화면, 기능 플래그 꺼짐). 서버 마이그레이션 운영 적용 전. 2단계(네이티브 다리 · 스토어 상품) 대기.**
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
- 구매 · 복원이 도는 동안 화면에 진행 상태가 없음(#434 리뷰) — 1단계는 비활성 브리지가 곧바로 답해 문제가 없고, 실제 구매를 붙일 때 `use-plans`의 진행 상태를 그림 상태로 올려 단추를 막고 로딩을 보입니다.
