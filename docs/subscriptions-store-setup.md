# 구독 · 엽전 팩 스토어 준비 목록 (ADR-0144 2단계 전)

2단계(네이티브 다리 · 실제 구매)를 시작하기 전에 사람이 할 일입니다. 비밀 값은 **이름만** 적습니다 — 값은 저장소에 넣지 않습니다.
요금제 혜택 숫자는 서버 표(`companion.plans`)가 정본이라 여기서 정하지 않습니다. 가격은 스토어가 정본입니다.

## 1. 상품 (App Store Connect · Google Play Console)

| 상품 id | 종류 | 기간 | 가격(USD 기준) | 요금제(서버 `store_products.plan_id`) | RevenueCat entitlement |
|---|---|---|---|---|---|
| `duru.tickets.monthly.v1` | 자동 갱신 구독 | 1개월 | $3.99 | `unlimited_tickets` | `unlimited_tickets` |
| `duru.tickets.yearly.v1` | 자동 갱신 구독 | 1년 | $39.90 | `unlimited_tickets` | `unlimited_tickets` |
| `duru.chatplus.monthly.v1` | 자동 갱신 구독 | 1개월 | $6.99 | `chat_plus` | `chat_plus` |
| `duru.chatplus.yearly.v1` | 자동 갱신 구독 | 1년 | $69.90 | `chat_plus` | `chat_plus` |
| `duru.premium.monthly.v1` | 자동 갱신 구독 | 1개월 | $11.99 | `premium` | `premium` + `unlimited_tickets` |
| `duru.premium.yearly.v1` | 자동 갱신 구독 | 1년 | $119.90 | `premium` | `premium` + `unlimited_tickets` |
| `duru.coins.500.v1` | 소모성(consumable) | — | $4.99 | 엽전 500 | 없음 |
| `duru.coins.1200.v1` | 소모성 | — | $9.99 | 엽전 1,000 + 200 | 없음 |
| `duru.coins.3000.v1` | 소모성 | — | $19.99 | 엽전 2,000 + 1,000 | 없음 |

- **App Store**: 구독 그룹 하나(예: 「Duru Plans」)에 구독 여섯을 넣습니다. 그룹 안 순위(높은 것부터): Premium 연 · Premium 월 · Chat Plus 연 · Chat Plus 월 ·
  Tickets 연 · Tickets 월 — 그룹 안에서 업그레이드 · 다운그레이드가 됩니다. 엽전 팩 셋은 「소모품」.
  각 상품에 현지화 표시 이름(영어 이름 그대로 — Unlimited Tickets · Chat Plus · Premium) · 설명 · 심사용 스크린샷이 필요합니다.
- **Google Play**: 「정기 결제」 여섯 — **정기 결제 id = 위 상품 id**, 기본 요금제(base plan) 하나씩(id 예: `base`, 자동 갱신, 기간 1개월 / 1년).
  RevenueCat은 Play 구독을 `duru.premium.monthly.v1:base`처럼 보내고, 서버는 `:` 앞부분으로 찾습니다. 엽전 팩 셋은 「인앱 상품」(관리형, 소모 처리는 SDK).
- 가격을 바꿀 때는 같은 id로 스토어에서 바꿉니다. 기간 · 종류를 바꾸거나 기존 구독자를 옛 가격에 남기려면 `.v2` 새 id + 서버 `store_products` 행 추가
  (옛 행은 지우지 말고 `active = false`) — ADR-0144 D5.

## 2. RevenueCat
1. 프로젝트 만들기(권장: 운영 · 개발 두 프로젝트 — 개발은 샌드박스 전용). 앱 둘(iOS · Android) 연결.
   - iOS: App Store Connect 「In-App Purchase Key」(.p8) 올리기(StoreKit 2 · 서버 알림), 번들 id. App Store Server Notifications V2 URL을 RevenueCat이 주는 값으로.
   - Android: Play Console 서비스 계정 JSON(재무 데이터 보기 · 주문 관리 권한) 올리기, 패키지명. 실시간 개발자 알림(RTDN) Pub/Sub 주제 연결.
2. Products: 위 아홉 상품 가져오기.
3. Entitlements: `unlimited_tickets` · `chat_plus` · `premium` 만들고 위 표대로 상품을 붙입니다(Premium은 둘에).
4. Offerings: `default` 하나 — 패키지 `$rc_monthly` · `$rc_annual`을 요금제마다(또는 offering 메타데이터로 요금제 구분), 엽전 팩은 커스텀 패키지.
   **가상 화폐(Virtual Currency) 기능은 켜지 않습니다** — 엽전은 서버 지갑.
5. App user id: 앱이 로그인 직후 `logIn(<Supabase user id>)` — 익명 id로 산 것은 RevenueCat이 TRANSFER/alias로 붙이고 서버가 따라갑니다.
6. **Webhook**: URL `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`, 「Authorization header value」에 긴 무작위 문자열
   (예: `Bearer <무작위 48자>`) — 같은 문자열을 Supabase 비밀 `REVENUECAT_WEBHOOK_AUTH`에. 환경: 운영 프로젝트는 Production만(샌드박스도 와도 서버가 거름).
7. **Airbridge 통합**(Integrations → Airbridge): Airbridge 앱 이름 · 토큰을 넣고, 사용자 식별은 app user id(= Airbridge setUserID와 같은 Supabase id).
   샌드박스 이벤트 전송 선택지가 있으면 끄고, 없으면 Airbridge 쪽에서 환경(sandbox) 이벤트를 걸러 봅니다. 매출 이벤트 이름 매핑은 Airbridge 표준 이벤트로.
8. API 키: 앱용 **공개 SDK 키**(iOS · Android 각각) — 2단계 호스트 빌드 값. 서버는 RevenueCat REST 키가 필요 없습니다(웹훅만 받음).

## 3. 비밀 값 · 설정 자리(이름만)

| 이름 | 어디에 | 무엇 |
|---|---|---|
| `REVENUECAT_WEBHOOK_AUTH` | Supabase Edge Function 비밀(운영 · 개발 각각) | RevenueCat 웹훅의 Authorization 헤더 값과 같은 문자열 |
| `REVENUECAT_ACCEPT_SANDBOX` | Supabase Edge Function 비밀 | 개발(QA) 프로젝트만 `true`. 운영은 비워 둠 |
| RevenueCat 공개 SDK 키(iOS · Android) | 2단계 호스트 빌드 값(`.env.local` · 릴리스 값 파일) — 이름은 2단계에서 정함 | 앱이 SDK를 여는 키 |
| App Store In-App Purchase Key(.p8) · Issuer ID · Key ID | RevenueCat 대시보드만 | 영수증 · 서버 알림 |
| Play 서비스 계정 JSON | RevenueCat 대시보드만 | Play 영수증 · RTDN |
| Airbridge 앱 이름 · API 토큰 | RevenueCat 대시보드 Airbridge 통합 | 매출 이벤트 전달 |

## 4. 서버
1. `apps/supabase-functions/supabase/migrations/20261129120000_subscriptions.sql` 적용(개발 → 확인 → 운영). 운영 적용은 사용자 결정.
2. `supabase functions deploy revenuecat-webhook`(`config.toml`에 `verify_jwt = false` 있음) · 비밀 두 개 설정.
3. 연간 구독의 매달 엽전: `cron/subscriptions.sql`을 SQL 편집기에서 한 번 실행(하루 한 번 `companion_grant_due_plan_coins`).
4. RevenueCat 대시보드에서 「Send test event」 → 함수 로그 `revenuecat_webhook` · `companion.store_events`에 TEST 행(outcome `recorded`).

## 5. 2단계 앱 일(참고)
- iOS · Android 호스트에 RevenueCat SDK + `PurchaseBridge` 네이티브 모듈(`configure` · `offerings` · `purchase` · `restore`).
- `plansFeatureEnabled()` 켜기(또는 원격 플래그로 바꾸기) · 구매 이벤트 · 무제한 티켓 · 대화 등급을 앱에 반영(`companion_entitlements`).
- 엽전 상점(CoinShop) 팩 카드를 상품 id · 스토어 가격에 잇기.
