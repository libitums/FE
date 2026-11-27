# ADR-0209: 광고 보고 티켓 1장 — 「Out of tickets」에만 · 서버 검증(SSV) 뒤 지급 · 하루 2회 · 실험 플래그

- 상태: **채택 — 서버 파일(PR `feat/ad-ticket-server`), 운영 미적용 · 함수 미배포**. 앱은 다음 PR(`feat/ad-ticket-app`) — 이 ADR의 D7 ~ D9가 앱 몫이다.
- 날짜: 2026-11-27
- **사용자 결정(2026-11-27)**: 시안 「광고 보고 티켓 시안」 A1 ~ A5를 보고 「1단계 티켓 추가만 시안 화면 만들고 진행」. 규칙은 시안 메모 「rules」의 분석 권고 기본값 그대로.
- 이어받는 결정: [ADR-0075](0075-learning-tickets.md)(티켓 원장은 앱 · 엽전으로 1장 · 「Out of tickets」 E6m) ·
  [ADR-0186](0186-first-day-unlimited-tickets.md)(첫날 무제한 · 구독자 제외) · [ADR-0144](0144-subscriptions-revenuecat.md)(구독 권한의 서버 정본) ·
  [ADR-0116](0116-yeopjeon-reward.md)(엽전) · [ADR-0029](0029-product-analytics-posthog.md)(이벤트 · 플래그) · [ADR-0017](0017-host-native-capabilities-and-audio.md)(호스트 모듈).

## 맥락

- 처음 티켓이 떨어진 회원의 53%가 1시간 안에 떠난다. 세션의 11.5%가 돈 벽(티켓 · 엽전)에서 끝난다.
- 「Out of tickets」의 선택지는 기다리기 · 엽전 20 · 구독 셋이다 — 엽전이 없고 구독할 생각이 없는 사람에게는 기다리기밖에 없다.
- 구독 4건이 모두 Unlimited Tickets다. 무료로 티켓을 얻는 길이 생기면 구독을 잠식할 수 있다 → **실험으로만 켠다**.

## 결정

### D1. 자리 — 「Out of tickets」 대화상자에만

레슨 · 말하기 · 결제 · 축하 화면에는 두지 않는다. 대화상자 선택지 맨 위(광고 · 무료) → 엽전 20 → Go unlimited → Back to map(시안 A1).

### D2. 보상 — 끝까지 본 광고 1번 = 티켓 1장, 서버 검증 뒤

- AdMob 보상형(rewarded) 광고. Google의 **서버 측 확인(SSV) 콜백**이 온 뒤에만 지급한다 — 기기의 「보상 받음」 신호만으로는 주지 않는다.
- 엽전 보상은 없다(1단계).
- 티켓 원장은 여전히 앱(진행 스냅숏)이다(ADR-0075 D2 · D3). 서버는 「이 요청은 1장을 받을 자격이 확인됐다」(`granted`)를 기록하고, 앱이 그것을
  읽은 뒤 엽전 구매와 같은 길(`addBoughtTicket`)로 1장을 더한다.

### D3. 상한 — 하루 2회, 서버가 판정

- `companion.settings.ad_ticket_daily_cap`(기본 2). 지급된(`granted`) 요청만 센다 — 광고가 없거나(no fill) 끝까지 보지 않으면 세지 않는다.
- 「하루」는 앱이 보낸 UTC 오프셋(분)의 자정부터다. 기기 원장의 하루(기기 지역 날짜)와 같다. Android PrimJS에 `Intl`이 없어 IANA 시간대 대신
  `Date#getTimezoneOffset`의 분을 쓴다. 범위(−840 ~ 840) 밖은 0(UTC). **지난 48시간 안에 시작한 요청이 있으면 그 오프셋으로 고정**한다 —
  요청마다 오프셋을 바꿔 날짜 셋에 걸쳐 상한을 한꺼번에 앞당기지 못하게(리뷰). 48시간 쉬면 새 오프셋을 받는다.

### D4. 대상 — 비구독 회원, 계정 생성 24시간 뒤

- 로그인(익명 아님) · 계정 생성 뒤 24시간 지남(첫날 무제한 기간에는 티켓이 필요 없다) · **활성 구독이 하나도 없음**(요금제 종류 무관, ADR-0186 D6과 같은 판정).
- 비회원은 지금처럼 「Sign in」. 구독자에게는 버튼이 없다.
- 판정 `companion.ad_ticket_block(user, now)` → `off` · `anonymous` · `new_account` · `subscribed` 또는 null(받을 수 있음). 시작 · 지급 · 상태가 같은 판정을 쓴다.

### D5. 서버 계약

마이그레이션 `20270117120000_ad_ticket.sql`, Edge Function `admob-ssv`.

| 이름 | 누가 | 하는 일 |
|---|---|---|
| `ad_ticket_status(p_utc_offset_min, p_request_id?, p_platform?)` | 앱(로그인) | `{enabled, eligible, reason, cap, used, left, request: {id, status, reason} \| null, unitId}` — 남의 요청은 null, `unitId`는 D10 |
| `ad_ticket_start(p_utc_offset_min)` | 앱(로그인) | `ok`(`requestId`) · `blocked`(`reason`) · `limit`. 요청 id는 24시간 산다. 하루 시작 20번까지 |
| `ad_ticket_grant(p_user_id, p_request_id, p_transaction_id, p_ad_unit)` | `admob-ssv`(service_role)만 | `granted` · `duplicate` · `unknown_request` · `expired` · `already_granted` · `off` · `anonymous` · `new_account` · `subscribed` · `limit` |

- 앱은 광고를 띄울 때 SSV 옵션에 `user_id` = Supabase 사용자 id, `custom_data` = `requestId`를 싣는다.
- **멱등**: 거래 id(`transaction_id`)마다 한 번(`companion.ad_ticket_transactions`, 거절도 기록) · 요청 하나에 지급 한 번. 같은 사용자의 콜백은
  advisory lock으로 한 줄로 세워 상한을 함께 넘지 않는다.
- 요청 id가 그 사용자 것이 아니면 `unknown_request` — 위조 콜백이 남의 이름으로 와도 지급하지 않는다(서명 자체도 Google 키다).
- `admob-ssv`: GET 쿼리 → key_id의 Google 공개키(`gstatic.com/admob/reward/verifier-keys.json`, 24시간 캐시, 모르는 key_id면 1분에 한 번 다시 읽음) →
  ECDSA P-256 / SHA-256 서명 확인(DER → r‖s) → RPC 한 번. 상태: DB가 판정한 모든 결과 200 · 쿼리 모양(값 200자 넘음 포함) 400 · 서명 401 ·
  받지 않는 광고 단위 403 · 환경 · 키 목록 · 모르는 key_id(키 교체 직후) · DB 실패 500(Google이 다시 보낸다). 키 목록 읽기가 실패하면 낡은 키를 쓴다.
  로그에 사용자 id · 거래 id · 서명을 싣지 않는다.
- **광고 단위 목록 `ADMOB_AD_UNIT_IDS`는 필수**다(없으면 500 `misconfigured`). Google SSV 공개키는 모든 AdMob 게시자가 함께 쓰므로 서명만으로는
  우리 광고 단위의 콜백임이 증명되지 않는다 — 남의 광고 단위 SSV URL을 우리 주소로 돌려 티켓을 받는 길을 막는다(리뷰).

- **광고 단위 ID는 서버가 내린다(D10).**

### D6. 실험 — 플래그와 스위치가 둘 다 켜져야

- 앱: PostHog 피처 플래그 **`ad-ticket`**, 회원(distinct id) 단위 50/50. **기본 꺼짐**(플래그를 만들지 않았거나 못 읽으면 꺼짐).
- 서버: `companion.settings.ad_ticket_enabled`(**기본 false**). 끄면 진행 중인 요청의 콜백도 `off`로 거절한다 — 즉시 멈추는 스위치다.
- 기간 3주. **멈춤 조건**(하나라도 닿으면 스위치를 끈다): 실험군의 구독 전환율 하락 · 엽전 팩 전환율 하락 · 신규 D1 리텐션 −2%p.
- 주 지표: 티켓이 떨어진 회원의 1시간 안 이탈(53%) · 레슨 시작 수 · 광고 시청 완료율. 이벤트는 앱 PR(D9).

### D7. 앱(다음 PR) — 상태 기계 A1 ~ A5

A1 제안(오늘 남은 N) → A2 불러오는 중(버튼 안에서만, 8초 넘으면 A5) → 광고 → A3 받음(서버 지급 확인 뒤 링 1 · Start lesson) · A4 오늘 다 씀(흐리게 ·
back tomorrow) · A5 광고 없음(횟수 차감 없음, 안내 한 줄, 1분 뒤 버튼 다시). SSV가 늦으면 상태를 다시 읽는다(간격 · 상한 · 시간 초과).

### D8. 광고 네트워크 · 개인정보

- Google Mobile Ads SDK(AdMob). 계정 · 앱 ID · 광고 단위 ID는 사용자가 만든다. 저장소에는 Google 공식 **테스트 ID**만 둔다. **앱 ID만** gitignore된
  값 파일(iOS xcconfig · Android properties — Airbridge · RevenueCat과 같은 방식)에서 읽는다. 광고 단위 ID는 서버가 내린다(D10).
- **비개인화 광고**로 시작한다(새 ATT 요청 없음 — 이미 있는 ATT 결과를 따른다). iOS `SKAdNetworkItems`(AdMob 권장 목록).

### D9. 측정

`ad_ticket_offer_shown` · `ad_ticket_started` · `ad_ticket_completed` · `ad_ticket_failed`(이유) · `ad_ticket_granted` — PostHog만(앱 PR).

### D10. 광고 단위 ID는 서버 설정에서 — 앱 빌드 없이 켠다 (사용자 결정 2026-11-27 「진행」)

- 다음 빌드에는 진짜 AdMob **앱 ID만** 넣어 둔다. 그 뒤 켜기 · 바꾸기는 서버 설정 · 스위치 · PostHog 플래그만으로 — 앱을 다시 짓지 않는다.
- 자리: `companion.settings.ad_ticket_unit_ios` · `ad_ticket_unit_android`(기본 null, `ca-app-pub-숫자/숫자` 꼴만 — 앱 ID(`~`) · 빈 값은 표가 거절).
  **비밀(Edge 환경)이 아니라 설정 칸으로 고른 까닭**: 광고 단위 ID는 비밀이 아니다 — 보통의 광고 앱은 바이너리에 그대로 싣고, 알아도 우리 계정으로 광고를
  요청할 뿐 돈이나 지급을 만들 수 없다(지급은 SSV 서명 + `ADMOB_AD_UNIT_IDS` + 요청 id가 막는다). 그리고 상태 RPC(SQL)가 읽어야 하는데 SQL은 Edge 비밀을
  읽지 못한다. 칸은 RLS로 앱에 열리지 않고 상태 RPC만 내린다.
- `ad_ticket_status(…, p_platform)` → `unitId`: 스위치 off · 대상 아님 · 값 없음 · 모르는 플랫폼(`ios` · `android` 밖)이면 null. 앱은 null이면 광고 줄을 그리지 않는다.
- SSV 검증용 `ADMOB_AD_UNIT_IDS`(숫자만, Edge 비밀)는 그대로 따로다 — 같은 단위의 `/` 뒤 숫자를 넣는다.
- 검사: SQL AT12(플랫폼별 · off · 대상 아님 · 값 없음 · 옛 호출) · AT13(칸 꼴).

## 버린 대안

| 대안 | 버린 까닭 |
|---|---|
| 기기의 「보상 받음」 콜백만 믿고 지급 | 기기 · 네트워크 조작으로 무한 지급. SSV는 Google 서명이라 앱이 만들 수 없다 |
| 서버가 티켓 원장을 들고 지급 | 원장은 앱 진행 스냅숏이다(ADR-0075 D3). 원장을 옮기는 것은 이 작업 범위를 넘는다 — 엽전 구매와 같은 「서버 확인 → 앱 1장」 |
| 엽전(예: 5)을 보상으로 | 1단계는 티켓 벽만 본다. 엽전 경제(ADR-0116)를 함께 흔들면 실험 해석이 어렵다 |
| 하루 상한 없이 · 3회 이상 | 구독 잠식 위험(구독 4건 모두 Unlimited Tickets). 2회는 시작값이고 설정으로 바꾼다 |
| 레슨 결과 · 축하 화면에도 광고 | 학습 흐름을 끊고 잠식 범위가 커진다. 벽(티켓 0장)에서만 |
| IANA 시간대 · 프로필 `timezone`으로 하루 | Android PrimJS에 `Intl`이 없고, 프로필 시간대는 대부분 비어 있다 |
| 플래그 하나(PostHog)만 | 서버가 막지 못하면 앱 버전이 남아 있는 동안 끌 수 없다. 서버 스위치가 즉시 멈춤 |
| 광고 단위 ID를 앱 값 파일에 | 켜고 바꿀 때마다 앱 빌드 · 심사가 필요하다(D10, 사용자 결정 2026-11-27) |
| 광고 단위 ID를 Edge 비밀에 | SQL 상태 RPC가 읽지 못하고, 비밀로 지킬 값이 아니다(D10) |
| 엽전 20 아래에 광고 | 시안 메모의 기본(위) — 무료가 먼저 보여야 이탈을 줄인다. 주황 채움은 Start lesson만 |

## 대가 · 한계

- 서버가 지급을 확인한 뒤 앱이 원장에 쓰기 전에 앱이 꺼지면 1장을 잃는다(엽전 구매와 같은 한계 — ADR-0075 적용 기록 2026-11-23).
- 하루 경계는 앱이 보낸 오프셋이다(48시간 고정). 첫 요청 때 오프셋을 꾸미면 경계를 몇 시간 옮길 수 있을 뿐 하루 상한은 그대로다.
- 광고 SDK가 앱 크기를 키운다(앱 PR이 잰다).
- 개인정보 처리방침 · 스토어 Data safety / 개인정보 라벨에 광고 SDK를 더해야 한다(앱 PR 보고 목록).

## 운영 적용 (사용자 승인 뒤) — 앱 빌드는 앱 ID를 넣는 한 번뿐

1. AdMob 계정 · 앱(iOS · Android) 둘 → **앱 ID 둘**을 값 파일(iOS `apps/ios/Config/AdMob.local.xcconfig` `ADMOB_APP_ID` · Android
   `apps/android/app/admob.properties` `ADMOB_APP_ID`)에 넣고 다음 스토어 빌드에 싣는다(/release-build가 샘플 앱 ID 0건을 확인).
2. 보상형 광고 단위 둘 → 각 단위의 「서버 측 확인」 URL = `https://<project>.supabase.co/functions/v1/admob-ssv`.
3. `20270117120000_ad_ticket.sql` 적용(열린 PR #661 `20270114…` · #664 `20270115120000` · #667 `20270116120000` 뒤 — 적용 전 운영 버전과 중복 없음 확인).
4. `supabase functions deploy admob-ssv` · 비밀(**필수**) `ADMOB_AD_UNIT_IDS`(쉼표, 두 단위의 `/` 뒤 숫자).
5. 광고 단위 ID 둘을 서버 설정에:
   `update companion.settings set ad_ticket_unit_ios = 'ca-app-pub-…/…', ad_ticket_unit_android = 'ca-app-pub-…/…';`
6. AdMob 콘솔의 「확인」 테스트 콜백 로그 확인 → 테스트 계정(스위치를 켜기 전엔 시험 프로젝트)으로 끝까지 본 광고 1번이 `granted`인지 확인.
7. 앱 ID가 든 빌드가 퍼진 뒤 PostHog 플래그 `ad-ticket` 50/50 → `update companion.settings set ad_ticket_enabled = true;`.
8. 멈춤: `update companion.settings set ad_ticket_enabled = false;`(광고 줄이 사라지고 진행 중 콜백도 거절). 단위 교체는 5를 다시.
