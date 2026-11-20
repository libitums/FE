# Android 결제 수동 설정 목록 (ADR-0144 「Android 결제 준비」)

iOS 1.2.0과 같은 상품을 Google Play에서 같은 동작으로 팔기 위해 **사람이 콘솔에서 할 일**이다. 앱 코드는 준비돼 있다(2026-11-20).
비밀 값은 **이름만** 적는다 — 값은 저장소 · 대화 · 로그에 넣지 않는다. 공통 표(상품 · 요금제 · 서버)는 [구독 · 엽전 팩 스토어 준비](subscriptions-store-setup.md)가 정본이다.

> **출시 보류 중(2026-11-19 사용자 결정)**: 결제 스위치 `purchasesEnabled()`는 두 플랫폼 공용으로 켜져 있다. 아래 1 ~ 5가 끝나기 전에
> `revenuecat.properties`를 넣고 Android를 지으면 사기 단추가 살아 있는데 상품이 없어 실패한다. 그 전에 Android를 내야 하면
> **키 파일을 빼고 짓는다** — 구매 모듈이 등록되지 않아 요금제는 임시 추천 가격 · 「곧」 안내(미리보기)로 물러선다.

## 0. 매핑 — Play 상품 id(정함)

| 앱 · iOS 상품 id | Play 종류 | Play id | 기본 요금제(base plan) | RevenueCat Play 상품 id |
|---|---|---|---|---|
| `duru.tickets.monthly.v1` | 정기 결제 | 같음 | `base` · 자동 갱신 · 1개월 | `duru.tickets.monthly.v1:base` |
| `duru.tickets.yearly.v1` | 정기 결제 | 같음 | `base` · 자동 갱신 · 1년 | `duru.tickets.yearly.v1:base` |
| `duru.chatplus.monthly.v1` | 정기 결제 | 같음 | `base` · 자동 갱신 · 1개월 | `duru.chatplus.monthly.v1:base` |
| `duru.chatplus.yearly.v1` | 정기 결제 | 같음 | `base` · 자동 갱신 · 1년 | `duru.chatplus.yearly.v1:base` |
| `duru.premium.monthly.v1` | 정기 결제 | 같음 | `base` · 자동 갱신 · 1개월 | `duru.premium.monthly.v1:base` |
| `duru.premium.yearly.v1` | 정기 결제 | 같음 | `base` · 자동 갱신 · 1년 | `duru.premium.yearly.v1:base` |
| `duru.coins.500.v1` · `duru.coins.1200.v1` · `duru.coins.3000.v1` | 인앱 상품(일회성) | 같음 | — | 같음 |

- **정기 결제 하나에 기본 요금제 하나**다(ADR-0144 D4). 앱 · 서버는 RevenueCat이 보내는 `:base` 꼬리를 떼고 앞부분으로 찾는다
  (`native-purchase-bridge.ts` · `plan-change.ts` · `companion_apply_store_event`의 `split_part`). `duru.premium` 하나에 `monthly` · `yearly`
  기본 요금제 둘을 두는 안은 쓰지 않는다 — 앞부분이 같아져 앱이 기간을 잃고, 서버 `store_products` · iOS id 표를 다 바꿔야 한다.
- **기본 요금제 id는 꼭 `base`**(소문자). 다른 id를 써도 앱은 동작하지만 이 문서 · 시험 기대값과 어긋난다.
- **혜택(offer) · 무료 체험 · 도입가를 만들지 않는다.** 앱은 체험 고지 문장이 없고(ADR-0144 2단계 후속), 상품의 첫 단계 가격을 그대로 보인다.
- Play에는 구독 그룹이 없다. 다른 구독으로 바꾸면 **앱이 지금 Play 구독을 바꿀 대상으로 넘긴다**(`PurchasesPlanChange`, 아래 7). 콘솔 설정은 없다.

## 1. Play Console — 결제 프로필 · 권한

1. 결제 프로필(판매자 계정) · 세금 · 은행 활성 확인(Play Console › 설정 › 결제 프로필). 없으면 상품 저장이 막힌다.
2. 앱에 **결제 권한이 들어간 AAB가 한 번은 올라가 있어야** 상품을 만들 수 있다. `com.android.vending.BILLING`은 RevenueCat SDK가 끌어오는
   Play Billing 8.3 매니페스트에서 합쳐진다(2026-11-20 debug 합친 매니페스트에서 확인 — 앱 매니페스트에 따로 적지 않음).
   **RevenueCat SDK가 들어간 빌드(#490, 2026-11-18 이후 main)** 가 내부 테스트 트랙에 하나 있어야 한다 — 그 전 빌드에는 권한이 없다.
   키 파일 없이 지은 빌드여도 권한은 들어간다(권한은 SDK 의존성이 싣고, 키는 시작 여부만 정함).

## 2. Play Console — 인앱 상품 셋(수익 창출 › 제품 › 인앱 상품)

- id: `duru.coins.500.v1` · `duru.coins.1200.v1` · `duru.coins.3000.v1`. 이름(영어): 「Coin pouch」 등 iOS 표시 이름과 같게, 설명 한 줄.
- 가격: 아래 3의 표와 같은 값. 상태 **활성**.
- 소모 처리는 콘솔 설정이 아니다 — RevenueCat에서 상품 종류를 **Consumable**로 두면 SDK가 구매 뒤 소모한다(아래 5-3).

## 3. Play Console — 정기 결제 여섯(수익 창출 › 제품 › 정기 결제)

1. 정기 결제 만들기: id = 위 0의 표, 이름 = iOS 표시 이름(Unlimited Tickets · Chat Plus · Premium + 기간).
2. 각각 기본 요금제 `base`: 자동 갱신, 결제 기간 P1M / P1Y, **활성**.
3. **유예 기간 · 계정 보류**: 기본 요금제 설정의 「유예 기간」 · 「계정 보류」. 서버는 `BILLING_ISSUE`를 유예 만료까지 유지한다(ADR-0144 D3).
   iOS 「청구 유예 기간」(App Store Connect › 구독 그룹 › 청구 유예 기간)과 **같은 길이**로 맞춘다 — iOS 설정값은 문서에 없어 콘솔에서 읽어 온다.
   iOS가 꺼져 있으면 Play도 유예 0일(보수적). ⟶ 미결정 D-2.
4. 재구독 · 일시중지: 「일시중지」는 끈다(앱 · 서버가 PAUSE를 다루지 않음 — 웹훅은 기록만).
5. 가격(세금 포함 표시가). **App Store Connect의 지금 가격과 같은 값**을 넣는다 — 아래는 저장소에 적힌 값이고, ASC 화면이 최종 정본이다.

| 상품 | US(1판, `subscriptions-store-setup.md`) | VN | ID | PH | TH | MY |
|---|---|---|---|---|---|---|
| Tickets 월 | $3.99 | 49.000 ₫ | Rp29.000 | ₱99 | ฿79 | RM9.90 |
| Tickets 연 | $39.90 (표 $39.99) | 399.000 ₫ | Rp249.000 | ₱799 | ฿690 | RM89.90 |
| Chat Plus 월 | $6.99 | 99.000 ₫ | Rp65.000 | ₱199 | ฿139 | RM16.90 |
| Chat Plus 연 | $69.90 (표 $69.99) | 799.000 ₫ | Rp549.000 | ₱1,690 | ฿1,190 | RM149.90 |
| Premium 월 | $11.99 | 179.000 ₫ | Rp119.000 | ₱349 | ฿249 | RM27.90 |
| Premium 연 | $119.90 (표 $119.99) | 1.490.000 ₫ | Rp990.000 | ₱2,890 | ฿1,990 | RM239.90 |
| 엽전 500 | $4.99 | 79.000 ₫ | Rp49.000 | ₱169 | ฿99 | RM14.90 |
| 엽전 1,200 | $9.99 | 149.000 ₫ | Rp99.000 | ₱339 | ฿199 | RM29.90 |
| 엽전 3,000 | $19.99 | 299.000 ₫ | Rp199.000 | ₱679 | ฿399 | RM59.90 |

- 동남아 다섯 나라 값은 사용자가 승인한 시장가 표(ADR-0144 추가 2026-11-17, `apps/mobile/src/lib/provisional-prices.ts`)다. 그 밖의 나라는
  US 가격에서 Play 자동 환산을 쓰되, ASC가 나라별로 다르게 잡혀 있으면 ASC를 따른다.
- ⚠ **연간 US 값이 두 문서에서 다르다**(1판 표 $39.90 · $69.90 · $119.90 ↔ 임시 가격표 $39.99 · $69.99 · $119.99). ASC에 실제로 들어간 값을
  그대로 쓴다. ⟶ 미결정 D-1.

## 4. Play Console — 실시간 개발자 알림(RTDN) · 서비스 계정

RevenueCat 문서 「Google Play Store — Service Credentials」 · 「Google Real-Time Developer Notifications」 순서를 따른다.
1. Google Cloud(Play Console에 연결된 프로젝트)에서 **Google Play Android Developer API**와 **Cloud Pub/Sub API**를 켠다.
2. 서비스 계정 만들기(Cloud 역할은 RevenueCat 문서가 적은 그대로 — Pub/Sub 편집자 · 모니터링 뷰어, RTDN 주제를 RevenueCat이 만들고 읽는 데 쓰임)
   → JSON 키 만들기. **JSON은 RevenueCat 대시보드에만 올린다**(저장소 · 메신저 · 메일 금지). 키 파일은 올린 뒤 로컬에서 지운다.
3. Play Console › 사용자 및 권한 › 서비스 계정 초대 — 앱 권한: **앱 정보 보기 및 대량 보고서 다운로드(읽기 전용)**, **재무 데이터 · 주문 · 해지 설문 응답 보기**,
   **주문 및 정기 결제 관리**(그 밖은 주지 않음).
   권한이 퍼지는 데 최대 36시간 걸릴 수 있다 — 그 동안 RevenueCat 자격 증명 확인이 실패해도 정상.
4. RTDN: RevenueCat 대시보드(아래 5-1)가 Pub/Sub 주제 이름을 만들어 준다 → Play Console › 수익 창출 설정 › 실시간 개발자 알림에 그 주제를 넣고
   「테스트 알림 보내기」 → RevenueCat에 테스트 수신이 찍히는지.

## 5. RevenueCat

1. **Google Play 앱 추가**(같은 프로젝트, iOS 앱 옆): 패키지명 `libitum.duru.android`, 서비스 계정 JSON 올리기(4-2), RTDN 주제 연결(4-4).
2. **공개 SDK 키**: 그 앱의 API 키(`goog_`로 시작) — 앱 빌드 값(아래 6). Secret API 키(`sk_`)는 앱에 넣지 않는다(호스트가 `goog_` 아닌 키로는 SDK를 열지 않음).
3. **Products**: Play 상품 아홉 가져오기(0의 RevenueCat Play 상품 id). 엽전 팩 셋은 종류 **Consumable**.
4. **Entitlements**: iOS와 같게 — `unlimited_tickets` ← Tickets 둘 + Premium 둘, `chat_plus` ← Chat Plus 둘, `premium` ← Premium 둘.
5. **Offerings**: iOS와 같은 `default` offering에 같은 패키지 자리로 Play 상품을 붙인다(앱은 offering이 아니라 상품 id로 직접 읽지만,
   대시보드 · 페이월 도구의 일관을 위해 같게).
6. **Webhook · Airbridge 통합**: 프로젝트 단위라 iOS 때 설정이 그대로 Android 이벤트에도 쓰인다. 추가 일 없음 — 단, Airbridge 통합 화면에
   Android 앱이 따로 있으면 같은 Airbridge 앱 이름 · 토큰을 넣는다.
7. 샌드박스: Play 라이선스 테스터의 구매는 RevenueCat에서 sandbox로 온다. 운영 프로젝트의 `REVENUECAT_ACCEPT_SANDBOX`는 지금 켜져 있다(ADR-0144 결제 켬 ⚠).

## 6. 앱 빌드 값 — Android RevenueCat 키 파일

| 이름 | 어디에 | 무엇 |
|---|---|---|
| `REVENUECAT_API_KEY` | `apps/android/app/revenuecat.properties`(추적 안 함, `.gitignore` · `revenuecat.properties.example` 참고) → `BuildConfig.REVENUECAT_API_KEY` | RevenueCat Google Play 앱의 공개 SDK 키(`goog_…`). 비었거나 `goog_`가 아니면 SDK · 구매 모듈이 없다 |

- 정본은 메인 체크아웃 `~/Documents/GitHub/FE/apps/android/app/revenuecat.properties`. 새 작업 트리 · 릴리스 빌드는 거기서 복사한다
  (`/release-build` 값 파일 목록에 있음 — 짓기 전 줄 수 · `goog_` 접두 개수, 지은 뒤 dex 안 등장 횟수로만 확인하고 값은 출력하지 않는다).
- 번들 크기 측정은 키 파일 없이(CI와 같게) 한다.

## 7. 앱이 하는 일(코드 — 설정 없음)

- 구매: RevenueCat `getProducts`(상품 아홉) → `purchase`. 구독을 살 때 이 고객에게 **활성 Play 구독**이 있으면 그것을 바꿈으로 산다:
  위 수준(Premium)으로 · 같은 수준 같은 기간(Tickets ↔ Chat Plus)은 **곧바로**(`CHARGE_FULL_PRICE` — 새 가격을 지금 받고 남은 기간은 Play가 시간으로 얹음),
  아래 수준 · 기간 바꿈은 **다음 갱신**(`DEFERRED`). iOS 구독 그룹(ADR-0160 수준표)과 같은 시점이다. 고객 정보를 못 읽으면 사지 않는다(겹침 방지).
- 보류 결제(현금 · 편의점 등 — 동남아에서 흔함): 앱은 실패로 보이지 않고 조용히 끝낸다. 결제가 끝나면 RevenueCat → 웹훅이 지갑 · 권한을 바꾼다.
- 그 밖은 iOS와 같다 — 구매 뒤 60초 확인 대기(ADR-0163) · 엽전 팩 Airbridge Order Complete(거래 id = Play 주문 id `GPA.…`) · Airbridge 기기 id ·
  미뤄진 바꿈 칩(ADR-0144) · 복원 · Manage subscription → `https://play.google.com/store/account/subscriptions?sku=<구독 id>&package=libitum.duru.android`.

## 8. 라이선스 테스터 · 샌드박스 확인

1. Play Console › 설정 › **라이선스 테스트**: 시험할 Google 계정(Gmail)을 넣고 응답 「RESPOND_NORMALLY」. 내부 테스트 트랙 테스터 목록에도 같은 계정.
2. 기기의 Play 스토어 계정이 그 테스터 계정이어야 한다. 시험 결제 수단(「항상 승인되는 테스트 카드」 · 「느린 테스트 카드」)이 시트에 보인다.
   테스트 구독은 갱신이 빨라진다(월 = 5분, 연 = 30분, 최대 6번).
3. 빌드: `revenuecat.properties`를 넣은 bundled/릴리스 빌드(메모리 「Android release-like build」). 순서는 [e2e — Android 결제](e2e/android-purchases.md).
4. 통과하면 출시 보류를 푸는 것은 사용자 결정이다.

## 미결정(사용자)

- **D-1** 연간 US 가격: ASC 실제 값($39.90 계열 / $39.99 계열)을 확인해 Play에 같은 값.
- **D-2** 유예 기간 길이: iOS 「청구 유예 기간」 값에 맞춤(꺼져 있으면 0일).
- **D-3** 다른 스토어 구독: iOS에서 구독 중인 계정이 Android에서 다른 요금제를 사면 Play는 App Store 구독을 바꿀 수 없어 두 구독이 겹친다(iOS → Play도 같음).
  지금은 막지 않는다(iOS와 같은 동작). 막으려면 서버 권한에 스토어를 실어 앱이 「다른 스토어에서 관리」 안내를 보여야 한다.
- **D-4** 같은 수준 곧바로 바꿈의 정산: `CHARGE_FULL_PRICE`(지금 새 가격 · 남은 기간은 시간으로) ↔ `WITH_TIME_PRORATION`(지금 0원 · 남은 값만큼 새 요금제 기간).
  iOS(지금 새 가격 · 남은 값 환불)에 가까운 앞쪽을 골랐다.
