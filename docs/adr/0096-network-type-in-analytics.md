# ADR-0096 — 분석 이벤트에 연결 종류를 싣는다

- 상태: **채택 — 클라이언트 · 호스트.** 서버 변경 0. 받기 동작 변경 0. 새 권한 0.
- 날짜: 2026-11-04.
- **사용자 결정**(2026-11-04): 「평상시에 사용자들이 네트워크 상태가 어떤지 확인하고 싶다」, 「android, ios에서 기존 사용자들이 오류 발생 또는 문제가 없어야 한다」.
- 다루는 축: 이벤트 하나가 날 때의 연결 종류(Wi-Fi · 모바일 데이터 · 오프라인)와 요금 성격(요금 없음 · 요금제 · 데이터 절약)을 PostHog로 보내는 것. 콘텐츠 받기 정책([ADR-0095](0095-content-delivery-and-data-policy.md) D5 ~ D9)이 쓸 호스트 표면을 먼저 놓는 것이기도 하다.
  **다루지 않는 것**: 받기 정책 · 시트(ADR-0095 3단계), 오프라인 실행만 따로 세는 이벤트, 통신사 · IP · Wi-Fi 이름(보내지 않는다).

## 맥락

- PostHog에는 연결 종류가 없다. 앱이 보내지 않고, PostHog가 붙이는 위치 값은 나라(GeoIP)뿐이다. 스토어 콘솔도 이 값을 주지 않는다.
- 2026-11-02부터 스플래시 대기 중간값이 3초 → 47 ~ 181초로 늘었다(필리핀 · 인도 · 말레이시아). 받기 정책을 정하려면 이 사용자들이 평소 어떤 연결로 쓰는지 알아야 한다.
- 오프라인에서 난 이벤트도 대기열(`analytics.queue`)에 남았다가 연결되면 들어온다 — 이벤트가 날 때의 값을 실으면 오프라인 사용도 보인다.

## 결정

### D1. 호스트 모듈 `NetworkStatusModule.current()` — 동기, 문자열 하나

- 반환: `"<transport>:<cost>"`. 이벤트가 날 때마다 부르므로 상태를 JS에 쌓거나 구독하지 않는다.
  - transport: `wifi` · `cellular` · `ethernet` · `other` · `offline`
  - cost: `unmetered` · `metered` · `constrained` · `unknown`(오프라인)
- **Android**: `ConnectivityManager.getActiveNetwork()`가 없으면 `offline`. 능력(`NetworkCapabilities`)의 전송 수단으로 transport(Wi-Fi → 셀룰러 → 이더넷 순, 그 밖 `other` — VPN은 밑의 전송 수단이 같이 보인다). `NET_CAPABILITY_NOT_METERED`가 없으면 `metered`, 그중 데이터 절약 모드(`getRestrictBackgroundStatus() == ENABLED`)면 `constrained`. 권한 `ACCESS_NETWORK_STATE`는 이미 있다. API 24+(앱 minSdk 26).
- **iOS**: 앱 시작 때 `NWPathMonitor` 하나(`NetworkStatusMonitor.shared`)를 띄우고 마지막 경로를 잠금 아래 둔다. `.satisfied`가 아니면 `offline`. `usesInterfaceType`으로 transport, `isConstrained`(저데이터 모드) → `constrained`, `isExpensive` → `metered`. 첫 보고 전에는 `unknown`을 돌려준다. iOS 13+(앱 17.4). 권한 없음.
- 분류는 플랫폼 API와 떨어진 순수 함수(`NetworkStatusLabel`)가 하고 JUnit · HostTests가 잰다. 모듈은 예외를 잡아 `unknown:unknown`을 돌려준다 — 던지지 않는다.

### D2. 모든 PostHog 이벤트에 `network` · `networkCost`

- `createAnalyticsSession`이 sink에 넘기는 클라이언트가 capture마다 `current()`를 읽어 속성 둘을 더한다: `network`(transport 또는 `unknown`) · `networkCost`(cost 또는 `unknown`).
  - `register`(슈퍼 속성)를 쓰지 않는다 — `PostHogCore.register`는 비동기라 바로 뒤 capture에 실린다는 보장이 없다.
  - 이벤트 필드에 같은 이름이 없다(이벤트 45개 확인). 이벤트 이름 · 개수 · 기존 필드는 바뀌지 않는다.
- **모르면 `unknown`** — 모듈이 없거나(옛 호스트 · Explorer · 테스트) · `null`이거나 · 던지거나 · 형식이 다르면. 이벤트는 그대로 나간다.
- Airbridge 이벤트에는 싣지 않는다.

## 네이티브 모듈 입장 조건 (ADR-0017 D1)

1. **화면이 요구한다** — ADR-0095 D6(모바일 데이터에서 묻는 시트) · D7(오프라인 시트) · D9(모두 끝낸 뒤 시트)는 연결 종류 없이는 뜰 때를 정할 수 없다. 이 모듈이 그 표면이고, 이번 PR은 그 값을 먼저 재는 데 쓴다.
2. **스택 안에 대체 경로가 없다** — 훑은 자리: `@lynx-js/types@4.1.0`(연결 종류 API 없음. `NativeModules.NetworkingModule`은 `any`이고 HTTP 전송용), 설치된 iOS Pod(`NWPathMonitor` · `SCNetworkReachability` 0건), JS 런타임 전역(`lynx.fetch`뿐), 기존 호스트 신호 `contentSyncOpportunity`(「연결됨」 한 가지만 알리고 종류는 없음).
3. **사람이 판정할 수 있다** — [`docs/e2e/network-status.md`](../e2e/network-status.md): Wi-Fi · 셀룰러 · 비행기 모드를 바꾸며 PostHog 이벤트의 `network` 값을 본다.

## 기존 사용자 안전

| 경우 | 동작 |
|---|---|
| 새 JS + 옛 호스트(모듈 없음) | `unknown` · 이벤트 그대로 |
| 모듈이 던짐 · 이상한 값 | `unknown` · 이벤트 그대로(sink는 원래 예외를 삼킨다) |
| iOS 첫 경로 보고 전 | `unknown` |
| 권한 · 신고 | 새 권한 없음(Android `ACCESS_NETWORK_STATE` 기존, iOS 불필요) |
| 저장소 · 콘텐츠 · 받기 | 바꾸지 않는다 |

## 버린 대안

| 대안 | 버린 까닭 |
|---|---|
| 네이티브가 바뀔 때마다 전역 이벤트를 보내고 JS가 값을 들고 있기 | 상태 · 구독 · 시작 순서가 생긴다. 이벤트는 많아야 하루 수십 건이라 그때 읽는 편이 단순하다 |
| `register` 슈퍼 속성 | 비동기라 첫 이벤트에 빠질 수 있다 |
| 연결 바뀜 이벤트를 따로 | 이벤트 개수 · 카탈로그가 늘고, 「평소 상태」는 이미 나는 이벤트로 충분히 잰다 |
| 통신사 · 신호 세기 | 목적에 필요 없고 개인정보 신고 범위가 넓어진다 |

## 대가

1. 이벤트 하나마다 네이티브 호출이 하나 는다(동기 · 몇 마이크로초 수준의 시스템 조회).
2. 스토어 개인정보 신고를 다시 볼 일이 생긴다 — 아래 「출시 전 확인」.

## 출시 전 확인 (사용자)

- **App Store 개인정보**: 연결 종류는 `기타 진단 데이터 / OtherDiagnosticData`에 가깝다. 지금 신고에 없다 — 더할지 정한다.
- **Google Play 데이터 보안**: 「앱 정보 및 성능 → 진단」은 Sentry로 이미 「수집 · 사용자와 연결 아니오」다. PostHog 이벤트는 로그인 뒤 사용자와 연결되므로 「연결 예」로 바꿀지 정한다.

## 테스트 계획

- unit: `networkPropertiesFrom` — 정상 조합 · 모르는 transport/cost · 형식 오류 · 비문자열 → `unknown`. `readNetworkProperties` — 모듈 없음 · `NativeModules` null · 모듈 null · `current` 없음 · 던짐 · 정상.
- integration: `createAnalyticsSession`의 sink 이벤트가 `/batch/` 요청에 `network` · `networkCost`를 싣는다(모듈 정상 · 없음 · 던짐), 기존 필드 · `environment`는 그대로.
- 호스트: Android JUnit `NetworkStatusLabelTest`, iOS HostTests `NetworkStatusLabelTests`(분류표 전체). 두 플랫폼 빌드.
- e2e: Android 에뮬레이터(읽기 전용)에서 Wi-Fi · 셀룰러 · 비행기 모드 전환 시 `current()` 값. 옛 빌드 위에 덮어 설치해 실행 · 기존 데이터 유지. iOS 시뮬레이터 실행.

## 측정

- 사용자별 주 연결(`network`의 최빈값) 분포 · 나라별 분포 · 학습 이벤트(`episode_item_answered`) 중 `offline` · `metered` 비율. 출시 1 ~ 2주 뒤 ADR-0095 3단계 기본값(`ask`)을 이 값으로 다시 본다.
