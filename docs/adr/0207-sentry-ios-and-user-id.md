# ADR-0207: Sentry — iOS 연결 · 두 플랫폼 이벤트에 내부 사용자 id

- 상태: **채택 — 앱 · 호스트(iOS · Android), PR(머지 전)**. 운영 변경 없음(DSN 값 파일은 사용자가 만든다).
- 날짜: 2026-11-27
- **사용자 결정**: 「응 한 PR로 진행」(2026-11-27) — iOS Sentry 연결(Android와 같은 범위) + 두 플랫폼 이벤트에 내부 사용자 id.
- 이어받는 결정: [ADR-0061](0061-crash-reporting-sentry.md)(Android 수집 · 한 깔때기 · 지우기 규칙 · DSN 없으면 시작 안 함) ·
  [ADR-0017](0017-host-native-capabilities-and-audio.md) D1(호스트 모듈 입장 조건) · [ADR-0029](0029-product-analytics-posthog.md) D8(로그인 뒤 식별) ·
  [ADR-0012](0012-native-host-app-minimal.md) D4(SDK 정확 버전).
- **부분 개정**: ADR-0061 **D10**(「사용자 식별자를 붙이지 않는다」 — 내부 사용자 id **하나만** 붙인다, D3) · **D3**(「새 호스트 모듈을 열지 않는다」 —
  사용자 id는 `lynx.reportError`로 실을 수 없어 모듈 하나를 연다, D3) · 제목의 「Android 호스트가」(iOS도 보낸다, D1).

## 맥락

- Sentry 조직 `libitum`(US). 프로젝트 `duru-android` · `duru-apple-ios` · `duru-javascript-astro`.
- **iOS는 90일 동안 이벤트 0건**이었다 — `apps/ios`에 Sentry SDK가 없었다.
- Android 이벤트에는 user가 없어(ADR-0061 D10) 이슈의 「Users Impacted」가 늘 0이다. 몇 명이 겪는지 알 수 없다.

## 결정

### D1. iOS도 Android와 같은 범위를 보낸다

- 범위: 크래시(Mach 예외 · 신호 · `NSException`) · 앱 멈춤(App Hang, 2초) · **Lynx JS 오류**. Watchdog 종료(OOM 추정) · 성능 추적 · 리플레이 · 로그 · 메트릭은 끈다.
- **Lynx JS 오류 다리**: `LynxViewLifecycle.lynxView(_:didRecieveError:)`(Android `LynxViewClient.onReceivedError`의 짝)를 `CrashLynxErrorClient`가 받아
  `CrashReporting.onLynxError(code:level:text:)`로 넘긴다. 받는 코드 · 파싱 · 지우기 · 상한 · 이벤트 모양은 **Android와 같다**(ADR-0061 D1 · D4 · D11):
  200번대 `js-background` · 1100번대 `js-main-thread` · warn 버림 · 스크롤 보정(code 4) 버림 · `mechanism{type: lynx, handled: true}` · 태그 `lynx.source` · 지문 넷 ·
  `contexts.lynx.stack` · 프로세스당 20건. Swift 이식은 `CrashScrub.swift` · `CrashReportPayload.swift`.
- **release · dist · environment**: release `libitum.duru.ios@<CFBundleShortVersionString>+<CFBundleVersion>`(Android `libitum.duru.android@<versionName>+<versionCode>`와 같은 꼴) ·
  dist = 빌드 번호 · environment = `SentryEnvironment`(xcconfig 기본 `release` — Android `release` 빌드와 같은 값). 로컬 확인은 local 파일에서 `development`로 바꾼다.
- **Debug 구성은 DSN이 있어도 시작하지 않는다**(`#if DEBUG`) — Android `debug`가 늘 `""`인 것과 같다(ADR-0061 D7).

### D2. 설치는 CocoaPods `Sentry` 9.19.1 — 저장소 관례

- 다른 호스트 SDK(Lynx · Airbridge · RevenueCat)가 모두 CocoaPods 정확 버전이라 같은 길로 넣는다. `pod install`이 다시 쓴 pbxproj는 되돌리고,
  새 Swift 파일 다섯 · xcconfig 둘의 참조만 손으로 더했다.
- ⚠ **Sentry는 9.19.1(2026-07-01) 뒤로 CocoaPods에 새 판을 올리지 않는다**(GitHub 최신 9.36.0, 2026-11-26). 9.20.0의 「한 종류가 rate limit이면 다른 종류까지 버리던 문제」
  수정 등은 받지 못한다. 더 새 판이 필요해지면 **SPM으로 옮긴다**(재검토 조건 1).

### D3. 사용자 id — 내부 id 하나, PostHog distinct id와 같은 값

- 값: 액세스 토큰의 `sub`(Supabase 사용자 UUID). **PostHog `identify`와 같은 값**이다 — Sentry 이슈의 사용자를 PostHog 사람으로 바로 찾을 수 있다.
  이메일 · 이름 · 사용자 이름 · IP는 싣지 않는다. UUID 꼴(8-4-4-4-12 16진수, 소문자로 맞춤)이 아니면 싣지 않고 **앞 id를 지운다**.
- 경로(두 플랫폼 같음): JS `storeSignedInSession`(부팅 갱신 · 소셜 · 코드 검증 · 손님 → 로그인 넷이 모두 지난다) → `setCrashUser(id)` →
  호스트 모듈 `CrashReportingModule.setUser(id)` → `CrashUser`(메모리). 로그아웃 · 계정 삭제 성공(`account-wiring` `leave`)은 `clearUser()`.
  분석 클라이언트가 없거나(PostHog 키 없음) 시험 계정이어도 넘긴다 — 오류 수집은 시험 계정 거름(ADR-0085 D4) 밖이다.
- **손님(비회원)은 서버 id가 없어 user가 없다**(ADR-0111 — 손님 구간은 식별 0).
- **싣는 자리는 `beforeSend` 하나다.** 모든 이벤트(JS 예외 · 크래시 · ANR/App Hang · tombstone)의 user를 **그 순간 호스트가 든 id 하나로 다시 세운다** —
  SDK가 넣은 설치 id(iOS `setUserIdIfNoUserSet` · Android 설치 id)와 IP 자리는 남지 않는다. `Sentry.setUser`(scope)는 부르지 않는다 — scope 쪽은 디스크에 남아
  다음 실행에 옮겨지는 길이 있어 지우기를 한 자리로 모으기 위해서다.
- 판정: JS vitest(`crash-user.unit.test.ts` CU1 ~ CU5 · `store-session.unit.test.ts` SS2 · `account-wiring.crash-user.unit.test.ts` AW-C1 ~ C3),
  Android JUnit(`CrashUserTest` u1 ~ u6), iOS HostTests(`CrashReportingTests` CR4 ~ CR7).

#### ADR-0017 D1 판정 — `CrashReportingModule`(메서드 `setUser(id)` · `clearUser()`, 응답 없음)

| 조건 | 판정 |
|---|---|
| 1. 화면 목록이 요구한다 | 화면이 아니다 — 운영 요구(사용자 결정 2026-11-27, 「Users Impacted」). `SystemBackModule` · `AirbridgeEventsModule`과 같은 「어느 화면도 아니다」 행 |
| 2. 스택 안에 대체 경로가 0개 | **통과** — `lynx.reportError`는 오류 하나를 넘길 뿐 상태를 남기지 못하고, 런타임이 올리는 오류(JS를 거치지 않는 것)와 네이티브 크래시에는 JS가 끼어들 자리가 없다. globalProps는 호스트 → JS 한 방향이다 |
| 3. `docs/e2e/`에 적을 수 있다 | [크래시 리포팅 e2e](../e2e/crash-reporting.md)의 사용자 id 항목 |

### D4. 개인정보 — Android 설정과 맞춘다

- iOS 옵션: `sendDefaultPii = false` · breadcrumb 0(`maxBreadcrumbs 0` · `beforeBreadcrumb`가 전부 버림 · 자동 breadcrumb 끔) · 스크린샷 · 뷰 계층 끔 ·
  리플레이 표본 0 · 성능 추적 · 네트워크 추적 · 실패 요청 수집(`enableCaptureFailedRequests` — URL이 실린다) · 스위즐링 · MetricKit · 로그 · 메트릭 끔.
- `beforeSend`(iOS `CrashEventPolicy`)가 지운다: breadcrumb · `serverName` · `request` · `contexts.device`의 `id` · `name` · `boot_time` · **`contexts.app.device_app_hash`**(기기 · 앱마다 고정 값) ·
  예외 값 · 메시지 본문은 사전 상한 → 지우기 → 300자 · 메시지 `params` · 스택 프레임 · `debug_meta`의 **설치 컨테이너 UUID**(`/Application/<UUID>/` → `/Application/[install]/` — Android 설치 경로 규칙의 짝).
- ⚠ **iOS 세션의 `did`에는 SDK의 설치 id가 실린다** — Cocoa SDK는 세션 `distinctId`를 끄는 옵션이 없다(`SentryHub`가 `SentryInstallation` 값을 그대로 쓴다).
  Android는 `setDistinctId(null)`로 끈다. 설치 id는 SDK가 앱 캐시에 만든 무작위 UUID(IDFA · IDFV 아님, 재설치하면 바뀐다)다.
  **세션(크래시 없는 세션 비율)을 살리는 쪽을 기본값으로 골랐다** — 끄려면 `enableAutoSessionTracking = false` 한 줄이고 그러면 iOS 릴리스 건강 지표가 없다(사용자 확인 필요 1).

### D5. DSN은 저장소 밖 — Airbridge · RevenueCat과 같은 값 파일

- 추적: `Config/Sentry.xcconfig`(`SENTRY_DSN =` 빈 값, `SENTRY_ENVIRONMENT = release`, `#include? "Sentry.local.xcconfig"`) · `Sentry.local.xcconfig.example`.
  추적 안 함: `apps/ios/Config/Sentry.local.xcconfig`(.gitignore). `Info.plist`의 `SentryDSN` · `SentryEnvironment`가 받는다.
- xcconfig는 `//`를 주석으로 읽는다 — DSN은 `https:/$()/<key>@<host>/<id>`로 적는다(예시 파일에 적었다).
- DSN 꼴 검사는 Android와 같은 정규식(`^https://[A-Za-z0-9]+@[A-Za-z0-9.-]+/[0-9]+$`). 틀리거나 비면 SDK를 한 줄도 부르지 않고 오류도 내지 않는다.
  호스트 모듈은 DSN과 무관하게 등록한다 — id만 잡아 두고 보내지 않는다.

### D6. dSYM은 Archive 뒤 손으로 올린다 — 토큰을 저장소 · 빌드 단계에 두지 않는다

`/release-build`의 iOS 단계에 `sentry-cli debug-files upload --org libitum --project duru-apple-ios <xcarchive>/dSYMs`(토큰은 사용자 셸의 `SENTRY_AUTH_TOKEN`)를 적었다.
빌드 단계(Run Script)는 더하지 않았다 — Android 매핑 업로드(ADR-0061 D8)가 인증 값이 다 있을 때만 도는 것과 같은 태도이고, 토큰이 없는 빌드를 막지 않는다.

## 확인한 것과 확인하지 못한 것

**red → green** [실측 — 2026-11-27, 에이전트 실행]

| 계층 | red(스캐폴드 — 아무것도 하지 않는 껍데기) | green |
|---|---|---|
| JS vitest | 3 파일 7건 실패(CU1 ~ CU3 · SS2 둘 · AW-C1 · C2 — 기대값 불일치) | 3 파일 15건 + 기존 account-wiring 포함 20건 통과 · LR1(`lynx-runtime-apis`) 통과 · 새 JS에 금지 API 0 · `clearTimeout` 없음 |
| Android JUnit | `CrashUserTest` 6건 중 4건 실패(u5 · u6은 스캐폴드가 user를 비워 통과 — 「사용자 없음」 쪽은 기존 동작) | 호스트 JUnit 331건 실패 0 · 결선 검사(`pnpm test:android-bundle`) 149건 — 모듈 수 18 → 19 갱신(GW-S6 · HS2) |
| iOS HostTests | `CrashReportingTests` 9건 중 7건 · `CrashReportPayloadTests` 5건 중 1건 실패(CP2는 테스트 기대값이 Android와 달랐다 — 메인 스레드 접두를 뗀 뒤 trim하는 Android 규칙에 맞춰 테스트를 고쳤다) | 새 14건 통과. 전체 180건 중 실패 3건은 `ImageServiceTests` 하나(작업 트리에 `pnpm bundle:host` 산출 이미지가 없음 — 이 변경과 무관) |

**기기** [실측 — iPhone 17 시뮬레이터, Debug, DSN 없음]: 앱이 그대로 뜨고 로그에 `[DuruCrash] disabled (no DSN or debug build)` 한 줄 — SDK가 서지 않았다.

**확인하지 못한 것** [미확인]: DSN을 넣은 iOS 빌드의 실제 전송(값 파일이 아직 없다) · iOS에서 Lynx 오류의 `summaryMessage` 실제 모양(Android 실측 꼴 — JSON `rawError` · 평문 — 둘 다 받게 이식했다) ·
Android 에뮬레이터에서 user id가 이벤트에 붙는 것(로그인한 계정이 필요하다 — e2e C3 ~ C5) · 대시보드의 「Users Impacted」.

**앱 크기** [실측 — Release `generic/platform=iOS`, 서명 없음, 링크 맵]: Host 실행 파일 43.95 MB 가운데 Sentry가 **약 2.6 MB**(2,645 KiB), 새 Swift 넷이 38 KiB.
App Store 내려받기 크기는 압축 뒤라 더 작다 [추론]. JS 번들은 5,761.5 kB / 천장 6,180 kB.

## 대가

1. 사용자 id를 붙이면서 오류 데이터가 **사용자와 연결된다** — 개인정보 처리방침 · 스토어 응답이 바뀐다(아래 「사용자 확인 필요」 2 · 3).
2. 로그인 전(스플래시의 세션 갱신 전)에 난 크래시 · 다음 실행에 보내지는 크래시(iOS 크래시 보고는 다음 실행 때 나간다, Android tombstone · ANR v2)는
   **보내는 순간** 호스트가 든 id를 싣는다 — 부팅 갱신이 끝나기 전이면 user가 없다. 크래시가 난 실행의 사용자와 다를 수도 있다(같은 기기에서 계정을 바꾼 경우).
3. iOS 세션 `did`에 SDK 설치 id(D4).
4. Sentry 9.19.1에 묶인다(D2).

## 사용자 확인 필요

1. iOS 세션 — 설치 id가 든 세션을 살릴지(지금), 끌지(D4).
2. ~~개인정보 처리방침(`apps/landing/src/legal/privacy-*-providers.ts`)의 Sentry 행이 「Error reports on Android」 · 사용자 id 없음으로 적혀 있다 — iOS · 사용자 id를 더해야 한다.~~
   ⟨2026-11-27 — **반영**, 사용자 결정 「지금」⟩ 문서 PR(`docs/privacy-sentry-user-id`)이 en · ko 처리방침의 Sentry 행과 「오류 보고」 절(iOS · 회원의 내부 사용자 id · 이름 · 이메일 · IP 없음 · iOS 세션의 무작위 설치 id)을 고치고 시행일을 2026-11-27로 올렸다.
   `docs/android-data-safety.md` · `docs/ios-privacy.md`도 같은 PR에서 맞췄다.
3. App Store 「앱 개인정보」 · Play 「데이터 보안」의 비정상 종료 로그 · 진단을 **사용자와 연결: 예**로 바꿔야 한다.
   ⟨2026-11-27⟩ 바꿀 칸 목록은 위 문서 PR 본문과 두 문서에 적었다. **양식 변경은 사용자가 한다 — 아직 바꾸지 않았다.** 다음 스토어 빌드(DSN이 든 빌드) 제출 전에 바꾼다.
4. Sentry 프로젝트 설정 「IP 주소 저장 안 함」(Data Scrubbing → Prevent Storing of IP Addresses)을 두 프로젝트에서 켰는지.

## 재검토 조건

1. Sentry 9.19.1에 없는 수정이 필요해질 때 → SPM으로 옮긴다.
2. 손님에게도 기기 밖 id가 생길 때(서버 손님 계정) → D3의 손님 행을 다시 본다.
