# ADR-0110 — 분석 이벤트에 앱 버전을 싣는다 · 버전별 사용자 구분

- 상태: **채택 — 클라이언트.** 네이티브 변경 0(호스트는 [ADR-0086](0086-app-version-and-forced-update.md) D1로 값을 이미 준다). 화면 코드 변경 0. 서버 · 저장 · 상태 변경 0. 새 이벤트 0 · 새 권한 0. ⚠ **iOS 값 · 사람 속성은 기기 미확인** — 아래 「기기 확인 상태」.
- 날짜: 2026-11-06.
- **사용자 결정**(2026-11-06): 「버전 태그별로 사용자 구분지을 수 있게 포스트호그에 설정못할까」 → 답(PostHog 설정만으로는 불가 · 앱이 보내야 함 · 추천 구성 셋 — 모든 이벤트에 속성 · 사람 속성 `$set` · 배포 뒤 코호트) → 「/change 로 진행」.
- 다루는 축: PostHog에서 사용자를 **앱 버전(플랫폼 · 버전 · 빌드)별로 가르는 수단** — 모든 이벤트에 실리는 속성 셋(D1), 사람 속성과 그 갱신 시점(D2), 값을 읽는 자리와 모듈(D3).
  **다루지 않는 것**: 네이티브(iOS · Android) 변경 — 새 모듈 · 새 메서드 0, PostHog 대시보드 · 코호트 · 인사이트 만들기(배포 뒤 운영자 몫), Airbridge · Sentry에 버전 싣기(Sentry는 `release` 태그 · `contexts.app`으로 이미 있다), 강제 업데이트 정책 · 설정 화면의 버전 표시 변경(ADR-0086 그대로), 과거 이벤트 소급(불가), 버전별 분석 자체(이 결정은 측정 수단만 놓는다).

## 맥락

- PostHog에 앱 버전 · OS 속성이 **없다.** SDK가 붙이는 `$lib_version`은 `@posthog/core`의 버전이지 앱 버전이 아니고, [ADR-0029](0029-product-analytics-posthog.md) 「대가」 4가 「기기 · OS 속성 없음 — 플랫폼 비교를 못 한다」를 적어 둔 상태였다.
- Android 1.2.0 배포 뒤의 분석은 `network` 속성 **유무**를 대리 지표로 썼다([ADR-0096](0096-network-type-in-analytics.md)이 그 빌드에 들어갔으므로 속성이 있으면 새 빌드) — Android만 되고 iOS는 안 되며, 다음 빌드부터는 쓸 수 없는 방법이다.
- 앱은 호스트가 globalProps `appVersion = { platform, name, build }`로 주는 값을 **이미 읽어** 설정 화면에 `Version 1.2.0 (12)`로 표시하고 강제 업데이트를 판정한다(ADR-0086 D1 ~ D3, `lib/app-version.ts`의 `appVersionFrom`). ADR-0086은 「버전을 분석 사용자 속성으로 싣기」를 다루지 않는 것으로 남겨 두었다 — 이 ADR이 그 자리를 채운다.
- 이벤트마다 속성을 더하는 선례는 ADR-0096 D2(`network` · `networkCost`, `posthog-client.ts`의 `createAnalyticsSession`)다. 같은 자리 · 같은 규칙으로 간다.

## 결정

### D1. 모든 PostHog 이벤트에 `platform` · `appVersion` · `appBuild`

| 속성 | 값 | 예 | 모르면 |
|---|---|---|---|
| `platform` | globalProps `appVersion.platform` | `android` · `ios` | `unknown` |
| `appVersion` | `appVersion.name` — iOS `CFBundleShortVersionString` · Android `versionName` | `1.2.0` | `unknown` |
| `appBuild` | `String(appVersion.build)` — iOS `CFBundleVersion` · Android `versionCode` | `12`(build 0은 `0`) | `unknown` |

- 분석 속성 타입이 문자열 · 불리언뿐이라(ADR-0029 · `AnalyticsPropertyValue`) 빌드 번호는 **문자열**이다.
- **모르면 셋 모두 `unknown`** — globalProps가 없거나(`lynx` 없음 · `__globalProps` 없음 · Explorer · 테스트) `appVersion` 모양이 틀리거나 읽기가 던지면. 부분 unknown은 없다(`appVersionFrom`이 전부 아니면 `null`이라서). 「속성이 없는 것」과 「모름」을 구분하는 규칙은 `network`와 같다 — 속성이 **없는** 이벤트는 이 결정 이전 빌드의 것이다.
- **펼침 순서가 계약이다 — 자동 속성이 앞, 이벤트 필드가 뒤.** capture 본문은 `{ ...버전 셋, ...네트워크 둘, ...이벤트 필드 }`이고 **이벤트 필드가 이긴다.** 이벤트 이름 46개 가운데 `app_update_required_shown`(ADR-0086 D6)이 `platform` 필드를 이미 갖기 때문이다 — 같은 globalProps에서 온 같은 값이지만, 「자동 속성이 이벤트 필드를 덮지 않는다」가 깨지지 않는 규칙이다. ADR-0096 때는 겹치는 필드가 없어 순서에 뜻이 없었고, 이번에 규칙으로 고정한다.
- 이벤트 이름 · 개수(46) · 기존 필드 · `environment` · `network` · `networkCost`는 바뀌지 않는다. Airbridge 이벤트에는 싣지 않는다.

### D2. 사람 속성 — `identify`의 `$set`으로 같은 셋, 마지막 값이 이긴다

- 어댑터가 `client.identify(userId, { $set: { platform, appVersion, appBuild } })`를 보낸다. **모르면(`unknown`) `$set`을 보내지 않는다** — 버전을 모르는 호스트(Explorer · 개발 호스트)의 로그인이 그 사용자의 실제 값을 `unknown`으로 덮어쓰지 않게(⟨2026-11-06 리뷰⟩). 사람 속성의 **`appBuild`는 숫자**다 — 코호트가 빌드 번호를 크기로 비교할 수 있게(`appBuild < 13`). 이벤트 속성의 `appBuild`는 계약(`string | boolean`)대로 문자열이고, 둘은 PostHog에서 별개 정의다. `$set` 객체는 **어댑터 안에서만** 만들어지고 `AnalyticsUser.identify(userId)` · `AnalyticsCaptureClient.identify(distinctId)` 시그니처는 그대로다 — 계약 타입 파일 둘 · `entry-wiring.ts` 변경 0. 두 식별 표면(sink용 · `user`)이 같은 함수를 지나 경로가 하나다.
- **갱신 시점 = `storeSession`이 불리는 세 자리** — 소셜 로그인 성공 · 전화 코드 검증 성공 · **부팅 때 세션 갱신 성공**(ADR-0029 D8 ⟨2026-09-29⟩). 즉 온라인으로 앱을 켤 때마다 `identify`가 한 번 나므로, **앱을 업데이트한 뒤 재로그인 없이** 첫 온라인 실행에서 사람 속성이 새 값으로 바뀐다. 영속 속성이 메모리뿐이라 실행마다 첫 식별은 `$identify` + `$set` 경로이고, 같은 실행 안의 재식별은 값이 바뀌었을 때만 `$set` 이벤트로 간다(SDK가 같은 값의 중복 `$set`은 보내지 않는다) — 어느 쪽이든 마지막 값이 이긴다(`$set_once`를 쓰지 않는다).
- `reset` 뒤에는 D13 속성과 함께 버전 셋을 등록 속성으로 다시 건다(D3). capture마다 읽는 펼침은 그대로다. 다음 로그인의 `identify`가 다시 `$set`을 싣는다.
- **알려진 한계**
  - **오프라인으로 켠 실행**은 세션 갱신이 없어 `identify`가 없고 사람 속성은 지난 값이다. 그 실행의 **이벤트**는 대기열에 남아 새 버전 속성으로 들어오므로 이벤트 기준 분석은 정확하다. 다음 온라인 실행이 사람 속성을 따라잡는다.
  - **식별 전 익명 사용자**(온보딩 · 로그인 화면)에는 사람 속성이 없다(`personProfiles: "identified_only"`, ADR-0029 D8). 이벤트 속성으로는 보인다.
  - 세션 갱신 **실패**(토큰 만료 → 재로그인) 경로에서는 `storeSession`이 불리지 않는다 — 재로그인 성공이 다시 `identify`다.

### D3. 읽는 자리 — background에서 `lynx.__globalProps`, `appVersionFrom` 재사용, 캐시 없음

- 새 순수 모듈 `lib/app-version-properties.ts`: `appVersionPropertiesFrom(AppVersion | null)` → 문자열 셋, `readAppVersionProperties()` → `lynx.__globalProps`를 읽어 `appVersionFrom`에 넘기고 변환. 전체가 `try` 안이라 **던지지 않는다.** `background-only` import는 없다(순수 모듈) — 지금 import하는 곳은 `posthog-client.ts` 하나.
- `lynx`는 **맨 식별자**로 읽는다(`globalThis.lynx`는 기기에서 없다 — `resolveAnalyticsTransport`와 같은 이유, ADR-0029 D10). `__globalProps`는 ReactLynx `useGlobalProps`가 읽는 바로 그 값이다.
- **`appVersionFrom`을 재사용하고 자체 파싱을 두지 않는다.** 설정 화면의 `Version <name> (<build>)`와 PostHog의 `appVersion` · `appBuild`는 한 값의 두 표현이라 운영자가 1:1로 대조할 수 있다 — 화면에 줄이 없으면 속성은 `unknown`이다. `Reflect.get` 금지(ADR-0086 · Android 메인 스레드 함정)는 같은 함수를 쓰므로 자동으로 승계된다.
- **capture마다 펼치는 것이 정본이다** — `register`(슈퍼 속성)는 비동기라 바로 뒤 capture에 실린다는 보장이 없다(ADR-0096 D2와 같은 이유). 다만 버전 셋은 실행 중 바뀌지 않는 값이라 **등록 속성으로도 건다**(세션 생성 때와 `reset` 뒤) — SDK가 스스로 만드는 `$identify` · `$set` 이벤트에도 셋이 실리게 하기 위해서다(⟨2026-11-06 리뷰⟩). **캐시 없음** — 부를 때마다 읽는다. 값은 실행 중 바뀌지 않지만 캐시는 무효화 규칙과 테스트 격리 문제를 만들고 이득은 객체 읽기 하나다.
- `app-version.ts`에 합치지 않는다 — 그 파일은 화면 문구 함수(`appVersionLabel`)를 갖고, 분석 속성은 다른 소비자다. `network-status.ts`처럼 「해석 + 조회」 한 파일이 선례다.

## 기존 사용자 안전

| 경우 | 동작 |
|---|---|
| 옛 JS + 어떤 호스트 | 변화 없음 — 이벤트에 속성 셋이 **없다**(= 그 빌드 이전으로 읽는다) |
| 새 JS + globalProps 없는 호스트(옛 Explorer · 테스트) | 셋 모두 `unknown` · 이벤트 그대로 |
| `__globalProps` getter · `appVersion` 모양이 던지거나 틀림 | 셋 모두 `unknown` · 이벤트 그대로(sink는 원래 예외를 삼킨다 — ADR-0029 D11) |
| 식별 전 익명 사용자 | 이벤트 속성만 · 사람 속성 없음 |
| 버전을 모르는 호스트(Explorer · 개발 호스트)에서 로그인 | `$set` 없음 — 실제 기기의 사람 속성을 `unknown`으로 덮지 않는다 |
| 오프라인으로 켠 실행 | 이벤트는 새 값 · 사람 속성은 지난 값(다음 온라인 실행이 따라잡음) |
| 권한 · 스토어 신고 · 저장 · 콘텐츠 | 변경 없음 — 아래 「개인정보」 |

## 버린 대안

| 대안 | 버린 까닭 |
|---|---|
| `register` 슈퍼 속성**만** | 비동기라 첫 이벤트에 빠질 수 있다(ADR-0096과 같은 판단). 그래서 capture마다 펼치는 것을 정본으로 두고, 등록은 SDK 내부 이벤트(`$identify` · `$set`)를 위한 보조로만 쓴다 |
| (B) 매 이벤트에 `$set` 동봉 | 「업데이트 뒤 재로그인 없이 반영」은 (A)의 부팅 세션 갱신이 이미 충족한다. 남는 것은 이벤트마다 약 60 B · PostHog 쪽 이벤트당 사람 갱신 처리 · capture 경로에 객체 값이 들어가 `AnalyticsPropertyValue`(`string \| boolean`)와 어긋남뿐. 익명 이벤트의 `$set`은 `identified_only`라 서버가 버린다 — 바이트만 쓴다 |
| (C) identify `$set` + 매 이벤트 `$set` 둘 다 | (B)의 비용에 (A) 위의 이득 0 |
| `$set_once` | 「마지막 값이 이긴다」 요구와 반대 |
| 호스트가 PostHog 속성을 직접 더하기(네이티브 변경) | 호스트는 globalProps로 값을 이미 준다. JS가 읽으면 두 플랫폼에 같은 코드 하나고 네이티브 변경 0 |
| PostHog 쪽 설정(앱이 보내지 않고 PostHog가 붙이기) | PostHog는 앱 버전을 알 길이 없다 — `$lib_version`은 SDK 버전, GeoIP는 나라뿐. 사용자 발화의 전제가 여기서 깨진다 |
| 버전 바뀜 이벤트를 따로 | 이벤트 개수 · 카탈로그가 늘고, 「어느 버전이 썼나」는 이미 나는 이벤트로 충분히 잰다 |

## 대가

1. 이벤트 하나마다 동기 객체 읽기가 하나 늘고(네이티브 호출 0), 본문에 약 60 B가 더 실린다(`"platform":"android","appVersion":"1.2.0","appBuild":"12"` — 57자). `identify`마다 `$set` 약 60 B. 번들 +0.3 kB — [성능 보고서](../performance/reports/app-version-analytics-01.md)(미측정 — 번들만).
2. **두 플랫폼의 버전 체계가 다르다** — 이 결정 시점에 Android는 `1.2.0 (12)`, iOS는 `1.0.0 (13)`이다. 값을 그대로 싣고 바꾸지 않으므로 분석에서 버전을 가를 때는 **`platform`과 함께** 봐야 한다. 체계를 맞출지는 릴리스 작업의 몫(재검토 조건 (a)).
3. 식별 전 익명 구간 · 오프라인 실행의 사람 속성은 이벤트 속성보다 늦다(D2 「알려진 한계」). 사람 기준 분석은 이 지연을 전제로 읽는다.

## 개인정보

- 앱 버전 · 플랫폼은 개인 식별 정보가 아니다 — 같은 빌드를 쓰는 사용자 전체가 같은 값이고 기기 · 사람을 가리지 않는다. 식별자 · 추적 수단으로 쓰이지 않으며 사용자 ID는 기존 `identify`의 값 그대로다(새 식별자 0). `$set`에 가는 값은 이 셋뿐이다.
- 같은 값이 Sentry로 이미 나간다 — `contexts.app.app_version` · `app_build`([Android 데이터 보안 문서](../android-data-safety.md)의 「이벤트에 실리는 키」 표). PostHog에 같은 값을 더하는 것은 새 데이터 유형이 아니다.
- **App Store 개인정보 · Play 데이터 보안 신고 변경 없음.** Apple 데이터 유형 표의 어느 항목도 아니고(기기 ID · 진단 데이터 아님), Play의 「앱 정보 및 성능 → 진단」에 이미 들어 있는 값이다. ADR-0096이 남긴 ⚠(연결 종류 신고 여부 · 「진단 → 연결 예」)는 이 결정과 무관하게 그대로 남는다.

## 측정

요구사항의 측정 — 배포 1 ~ 2주 뒤 PostHog에서:

1. **`appVersion` 분포** — 버전별 활성 사용자. `unknown` 비율이 옛 Explorer · 테스트 환경 비율과 맞는지, 속성이 **없는** 이벤트 비율이 옛 빌드 잔존(ADR-0086 D6의 `app_update_required_shown` 비율)과 맞는지.
2. **버전별 퍼널**(온보딩 → 로그인 화면 → 로그인 성공 → 파이널 테스트)을 대리 지표(`network` 유무)로 본 결과와 대조한다 — 둘이 같은 그림이면 대리 지표는 은퇴한다.
3. 사람 속성 `appVersion`이 옛 버전에 머무는 사용자 비율(오프라인 실행만 하는 사용자) — 재검토 조건 (c)의 입력.

새 이벤트는 없다 — 측정 수단은 위 속성 셋이다. 코호트(「appVersion = 최신」) · 버전별 대시보드는 배포 뒤 운영자가 만든다(범위 밖).

## 테스트 계획

[ADR-0006](0006-command-interface-and-test-layers.md)의 계층 판정: unit required · ui **not-applicable**(바뀌는 `.tsx` 0 — 속성은 DOM · 접근성 트리에 흔적이 없다) · integration required · e2e required(수동) · 호스트 없음(네이티브 변경 0).

- unit(`lib/app-version-properties.unit.test.ts`, AV-U1 ~ U9): 변환(ios · android) · `null` → unknown 셋 · build 0 → `"0"` · 큰 정수 · `lynx` stub 정상 · unknown 아홉 갈래(`lynx` 없음 · `__globalProps` 없음 · null · 문자열 · `appVersion` 없음 · 문자열 · 모르는 platform · 문자열 build · 빈 name) · getter 던짐 둘 · 부분 unknown 없음 · 캐시 없음 · `Reflect.get` 스파이. **결과 17/17.** red 증명: 스캐폴드(unknown만 반환) 위에서 5건 단언 실패 · 12건 통과(unknown 갈래 — import · 컴파일 실패 아님).
- integration(`lib/posthog-client.app-version.integration.test.ts`, AV-I1 ~ I11): `/batch/` 본문에 셋 + 기존 필드 · `environment` · `network` 그대로, unknown 세 갈래, getter 던짐에도 sink 비던짐, **이벤트 필드 우선**(`app_update_required_shown.platform`이 stub 값과 달라도 이벤트 값), `reset` 뒤 그대로, `$identify`의 `$set`에 셋, 다른 버전으로 재식별 → `$set` 이벤트의 새 값. **결과 9/9.** red 증명: 결선 전 9/9 단언 실패. 인접 회귀(`posthog-client.network.integration` · `posthog-client.unit` · `App.analytics.integration` · `App.entry.integration`) 5 파일 125/125 그대로 green.
- 회귀(모바일 전체): unit 319 파일 4689/4689 · ui 241 파일 2104/2104 · integration 81 파일 737/737.
- 빌드 · 번들: `pnpm --filter mobile build`(CI 설정) 성공 — `background-only` 규칙 통과. `size:check` 통과 — `main.lynx.bundle` 3,903.3 kB(상한 4,060.0 kB, 같은 날 직전 측정 3,903.0 → +0.3 kB) — [성능 보고서](../performance/reports/app-version-analytics-01.md).
- 수용 기준 5(화면 · 네이티브 diff 0): `screens/**` · `components/**` · `apps/ios` · `apps/android` 변경 0.
- e2e(수동): [`docs/e2e/app-version-analytics.md`](../e2e/app-version-analytics.md) AV-E1 ~ E4.

## 기기 확인 상태 (2026-11-06)

⚠ **iOS 값과 사람 속성은 미확인이다.** 아래 둘은 에이전트 실행이고 사람이 확인하지 않았다.

- **AV-E1 통과** — Pixel_8 AVD(읽기 전용) · `bundled` 1.2.0 (12) · 운영 키. `episode_update_splash_closed` · `entry_screen_viewed`(onboarding · login) 세 건 모두 `platform = android` · `appVersion = 1.2.0` · `appBuild = 12`이고 `network = wifi` · `networkCost = unmetered` · `environment = production`은 그대로. 크래시 0. background의 `lynx.__globalProps`가 호스트 값을 담는다는 가정은 이것으로 Android에서 확인됐다.
- **AV-E3 통과** — 같은 30분 안 옛 빌드 사용자 9명의 이벤트 164건에는 세 속성이 **없다**(`unknown` 0건). 「속성 없음 = 그 빌드 이전」 읽기가 성립한다.
- **미실행**: AV-E2(iOS — 시뮬레이터에서 PostHog 이벤트가 만들어지지 않는 기존 현상 · [network-status.md](../e2e/network-status.md) 2026-11-04 기록 — 실기 · TestFlight 회차에서), AV-E4(사람 속성 — 테스트 계정 로그인 필요). 둘 다 계약을 바꾸지 않는다.

## 출시 전 확인 (사용자)

- **GitHub wiki 「Analytics-Events」**(저장소 밖 — 이 PR이 고치지 못한다): 「공통 속성」 절에 `platform` · `appVersion` · `appBuild`(모르면 `unknown` · 이벤트 필드가 이김 · 이 빌드 이전 이벤트에는 없음), 사람 속성 절에 같은 셋 + 갱신 시점(로그인 · 부팅 세션 갱신).
- 배포 뒤 PostHog 코호트 · 버전별 대시보드(범위 밖 · 운영자).

## 재검토 조건

- (a) **두 플랫폼의 버전 체계를 맞출 때**(iOS `MARKETING_VERSION`을 Android `versionName`과 같은 줄에 올릴 때) — 값은 그대로 실리므로 코드 변경은 없지만, 그 전 이벤트의 `appVersion`은 플랫폼별로 다른 체계라는 사실을 측정 1에 적는다.
- (b) **이벤트 필드에 `appVersion` · `appBuild` 이름을 쓰려는 화면이 생기면** — 이벤트 필드가 이기므로 자동 속성이 가려진다. 이름을 바꾸게 한다(`platform`은 이미 `app_update_required_shown`이 같은 값으로 쓰고 있어 예외).
- (c) **사람 속성이 옛 버전에 머무는 사용자가 유의미하게 보이면**(측정 3 — 오프라인 실행만 하는 사용자) — 버린 대안 (B)를 다시 본다.
- (d) **코호트를 만들 때** — 「appVersion = 최신」 코호트는 `platform`별로 따로 만든다(대가 2).
