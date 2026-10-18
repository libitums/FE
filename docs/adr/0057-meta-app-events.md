# ADR-0057 — 광고 측정용 앱 이벤트를 Meta SDK로 보낸다 (값이 없으면 SDK를 부르지 않는다 · 매핑은 JS 한 곳 · PostHog와 독립 · ATT 없음)

- 상태: **대체됨** — [ADR-0063](0063-airbridge-events.md)(2026-10-13, Meta SDK 제거 · Airbridge로 교체)
- 날짜: 2026-10-13

> **이 결정은 더 이상 유효하지 않다.** 사용자가 광고 매체 넷(Meta · Google Ads · TikTok Ads · Apple Ads)을 MMP 하나로 보기로
> 하고 Meta SDK를 빼기로 했다(2026-10-13). 아티팩트 · 이벤트 이름 · 자동 진입로 · iOS 설정(D1 · D2의 이름 · D4 · D5 · D6 · D13)이
> 바뀌었고, 값 주입의 구조 · 「초기화하지 않음」 판정 · JS 모듈 셋 · PostHog와의 독립 · Android `AD_ID` · 메서드 하나인 호스트
> 모듈 · `configure(builder)` 등록 · R8 무수정(D2의 구조 · D3 · D7 ~ D12)은 이름만 바뀐 채 ADR-0063로 이어진다.
> **정정 한 줄**: D5가 `SKAdNetworkItems`에 Meta 식별자 둘을 적은 근거(「iOS의 설치는 SKAdNetwork로 센다」)는 틀렸다 — 그 키는
> 광고를 띄우는 앱의 설정이고 광고되는 앱에는 필요 없다(Apple 문서). ADR-0063 D13이 키를 지웠다.
> 운영 안내 · e2e 절차는 `docs/airbridge-events.md` · `docs/e2e/airbridge-events.md`로 옮겨 Airbridge 내용으로 다시 썼다 —
> 아래 본문의 그 두 문서 링크(와 iOS 프라이버시 문서의 절 링크)는 깨지지 않도록 새 자리를 가리키게 고쳤고, Meta 때의 내용은
> Git 이력에 있다. 아래는 기록으로 남긴다.
- 다루는 축: **광고 측정 전송** (새 축 — 기존 ADR의 `다루는 축`이 덮지 않는다). 어느 SDK를 어느 버전으로 넣는가, 앱 ID ·
  클라이언트 토큰을 어디서 받는가, 값이 없을 때 무엇을 하지 않는가, SDK의 자동 진입로, 어느 제품 이벤트가 어느 Meta
  이벤트가 되는가, 호스트 모듈의 모양, PostHog 전송과의 관계, iOS 추적 허용(ATT)과 광고 식별자, Android 광고 ID 권한,
  R8 규칙, iOS 프라이버시 매니페스트.
  **다루지 않는 것**: ATT 팝업과 IDFA 수집 · 지연 딥링크 · 랜딩 웹 픽셀 · 서버 Conversions API · 결제 이벤트 · Facebook
  로그인의 네이티브화(지금의 Supabase OAuth 유지 — [ADR-0028](0028-social-oauth-web-authentication.md)) · 고급 매칭 ·
  새 제품 이벤트 · 스토어 콘솔의 개인정보 고지 수정(사용자 몫 — [운영 안내](../airbridge-events.md)).
- 적용 기록(결정을 바꾸지 않는다):
  [ADR-0029](0029-product-analytics-posthog.md) D2 — sink가 `null`이 아닌 조건이 「PostHog 클라이언트가 있다」에서
  「보낼 곳이 하나라도 있다」로 넓어졌다(D8, 그 문서의 D2에 주).
  [ADR-0017](0017-host-native-capabilities-and-audio.md) D1 · D2 — 호스트 모듈이 하나 늘었고, 입장 조건의 「어느 화면이
  요구했나」에 맞지 않는 채로 연 예외다(D10, [호스트 모듈 표](README.md#호스트-모듈-표)).
  [ADR-0052](0052-android-release-shrinking.md) — 프로젝트 R8 규칙은 그대로다(D12).

**왜 새 번호인가** — 없던 축을 처음 정한다(ADR-0010 D10). 제품 분석(ADR-0029)은 「우리가 읽을 수치」이고 이 축은 「광고
매체가 최적화에 쓸 신호」다 — 받는 쪽 · 설정이 사는 자리 · 스토어 고지가 다 다르다. 이 회차의 계약 문서는 저장소에
남지 않으므로 근거가 남을 자리가 여기다.

근거 표시: **[코드]** 저장소에서 읽음 · **[조회]** 2026-10-13에 레지스트리 · 배포물을 직접 받아 확인 · **[실측]** 이
저장소에서 빌드 · 실행해 관찰 · **[기억]** SDK 동작에 대한 사전 지식이고 이 저장소에서 확인하지 못한 것.

## 맥락

사용자 결정(2026-10-13, 다시 묻지 않는다): 플랫폼 **iOS + Android** · 보낼 것은 **설치 + 핵심 이벤트 몇 개(가입 완료 ·
레슨(유닛) 완료 정도)** · iOS **ATT 팝업을 띄우지 않는다** · Meta 앱 ID · 클라이언트 토큰은 **사용자가 나중에 직접
넣는다**. 목적은 Meta 앱 설치 광고를 설치 · 가입 · 레슨 완료 기준으로 최적화하고 광고별 성과를 보는 것이다.

이 저장소의 사실.

1. **완료 이벤트는 셋뿐이다** [코드]. `entry_completed`(진입 흐름의 끝, 「여정 시작하기」) · `messenger_unit_completed` ·
   `visual_novel_unit_completed`. 뒤 둘은 여정 출처와 롤플레이 출처가 있고, 유닛 ID 타입은 각각 값이 하나다
   (`appointment-confirmation` · `cafe-arrival-visual-novel`). **표준 학습 유닛(단어 고르기 · 듣기 · 말하기 · 쓰기 등) ·
   전화 유닛 · 카탈로그 레슨에는 완료 분석 이벤트가 없다.**
2. 여정 출처의 메신저 완료는 처음 한 번만 나고, 롤플레이 출처는 회차마다 난다 [코드].
3. `entry_completed`는 로그아웃 뒤 다시 로그인해도 같은 흐름을 지나므로 **재로그인에도 난다.** 신규 가입과 구분할
   정보가 이벤트에 없다 [코드].
   ⟨2026-10-18 적용 기록⟩ **이 사실은 더 이상 전부 참이 아니다** — 서버 기록이 있는 계정의 재로그인 · 재설치 뒤 로그인은
   언어 선택 · 여정 입장을 건너뛰고 맵에 들어가 `entry_completed`가 나지 않는다([ADR-0069](0069-returning-learner-login.md) D6).
   기록 없는 계정은 지금처럼 난다. 이 문서는 `대체됨`이라 결정은 고치지 않고, 이어받은 쪽의 기록은 ADR-0063이 진다.
4. sink 호출부는 전부 `sink?.(event)` 꼴이고 sink의 `null` 여부로 화면이 갈리는 자리가 없다 [코드].
5. iOS `Podfile`에 `use_frameworks!`가 없다. 타깃 넷의 `baseConfigurationReference`는 Pods xcconfig가 쓰고 있고
   프로젝트 수준 Debug · Release에는 비어 있었다 [코드].
6. Android 호스트에는 가드가 못 박은 숫자가 있다 — `MainActivity`의 `registerModule(` 호출 11개
   (`host-status-bar-icons.integration.test.mjs` HS2) · `proguard-rules.pro`의 규칙 9줄(`release-shrink.integration.test.mjs`
   I4) · vendor-maven 모듈 9개(`release-config.integration.test.mjs` RC4) [코드].
7. **SDK 배포물** [조회].
   - Android `com.facebook.android:facebook-core` `18.3.0`. 네이티브 `.so` 없음(16 KB 정렬 검사 대상 아님) · AAR 하한
     `minSdkVersion 15` · 소비자 R8 규칙 포함. AAR 매니페스트가 병합으로 넣는 것: 광고 ID 권한 · `ACCESS_ADSERVICES_*`
     넷 · **자동 초기화 provider `com.facebook.internal.FacebookInitProvider`** · 비공개 receiver 둘.
   - iOS `FBSDKCoreKit` `18.1.1`. 미리 빌드한 동적 xcframework 셋(`FBSDKCoreKit` · `FBSDKCoreKit_Basics` · `FBAEMKit`),
     하한 iOS 12.0. **`FBSDKCoreKit`의 프라이버시 매니페스트는 `NSPrivacyTracking = true` ·
     `NSPrivacyTrackingDomains = [ep1.facebook.com]`을 선언한다**(D13).

## 결정

### D1. 필요한 최소 아티팩트만 정확 버전으로

iOS는 `pod 'FBSDKCoreKit', '18.1.1'` 한 줄, Android는 `implementation 'com.facebook.android:facebook-core:18.3.0'` 한
줄이다. 로그인 · 공유 · 게임 pod과 `facebook-android-sdk` 우산 아티팩트는 넣지 않는다. 범위 표기는 쓰지 않는다
([ADR-0012](0012-native-host-app-minimal.md) D4 · [ADR-0013](0013-dependencies-and-version-notation.md)). 전이 의존은
lock과 Gradle 해석이 고정한다.

해석 결과 [실측]: iOS `FBSDKCoreKit_Basics` · `FBAEMKit` 18.1.1(`use_frameworks!` 없이 링크 · embed 됨). Android
`facebook-bolts` 18.3.0 · `installreferrer` 2.2 · `legacy-support-core-utils` 1.0.0, 그리고 `core-ktx` 1.15.0 ·
`kotlin-stdlib` 2.0.21 · `play-services-basement` 18.9.0으로 올라가 해석됐고 충돌은 없었다. `settings.gradle`의
vendor-maven 필터는 손대지 않았다 — `com.facebook.android` 그룹은 `mavenCentral()`에서 받는다.

### D2. 값은 플랫폼마다 그 플랫폼의 관용 파일 하나로 — 추적하지 않는다

키 이름은 두 플랫폼 모두 `META_APP_ID` · `META_CLIENT_TOKEN`이다.

| 플랫폼 | 값 파일(추적 안 함) | 추적하는 것 | 어디로 들어가나 |
|---|---|---|---|
| iOS | `apps/ios/Config/Meta.local.xcconfig` | `Config/Meta.xcconfig`(빈 기본값 둘 + `#include? "Meta.local.xcconfig"`) · `Config/Meta.local.xcconfig.example` | 프로젝트 수준 Debug · Release의 `baseConfigurationReference` → `Info.plist`의 `FacebookAppID = $(META_APP_ID)` · `FacebookClientToken = $(META_CLIENT_TOKEN)` |
| Android | `apps/android/app/meta.properties` | `app/meta.properties.example` | `app/build.gradle`이 파일이 **있으면** 읽어 `buildConfigField` 둘에, 없으면 빈 문자열 |

- 두 로컬 파일은 `.gitignore`에 있다. 예시 파일은 **빈 값**으로 추적한다.
- Android에서 `manifestPlaceholders` · `resValue`를 쓰지 않는다. 값이 매니페스트에 실리지 않아야 「값 없음 = SDK가 읽을
  것이 없음」이 한 곳(D3의 코드)에서만 판정된다. 그래서 매니페스트에 `com.facebook.sdk.ApplicationId` · `ClientToken`
  메타데이터가 없다.
- iOS에서 프로젝트 수준을 쓰는 이유: 타깃 수준은 Pods xcconfig가 이미 쓰고 있고 `pod install`은 프로젝트 수준을
  건드리지 않는다.
- 값을 파일 하나로 합치지 않는다. xcconfig와 properties는 주석 문법이 달라(`//` 대 `#`) 한 파일을 둘이 읽게 하면 주석
  한 줄에 한쪽 빌드가 깨진다.
- **release 빌드가 값 없이도 실패하지 않는다.** `google-services.json`의 `verifyReleaseFirebaseConfig` 같은 관문을 두지
  않았다 — 요구사항이 「비어 있으면 지금과 똑같이 동작」이다.

### D3. 「초기화하지 않음」은 호스트의 순수 함수 하나가 판정한다

두 플랫폼 같은 규칙이다. 두 값을 trim한 뒤 **앱 ID가 `^[0-9]+$`이고 클라이언트 토큰이 `^\S+$`** 일 때만 설정이 선다
(`MetaAppEventsConfig.from`). 하나라도 어기면 `nil`/`null`이고, 그러면

1. SDK 초기화 호출이 0이다 — iOS `ApplicationDelegate.shared.application(_:didFinishLaunchingWithOptions:)`, Android
   `FacebookSdk.sdkInitialize`를 부르지 않는다.
2. `MetaAppEventsModule`을 **등록하지 않는다.**
3. 그래서 JS의 logger 해석이 `null`이고 sink는 손대지 않은 그대로다.

「키가 없으면 sink는 `null` — no-op으로 가장하지 않는다」([ADR-0029](0029-product-analytics-posthog.md) D2)를 호스트까지
잇는다. 모듈 안의 `logEvent`도 시작되지 않았으면 아무것도 하지 않는다(이중 방어).

### D4. SDK 자동 진입로를 닫고 손으로만 연다

- **Android**: AAR이 병합하는 `FacebookInitProvider`를 앱 매니페스트에서 `tools:node="remove"`로 뺀다. 프로세스 시작 때
  SDK를 스스로 초기화하는 자동 진입로다. 병합 매니페스트에 이 provider가 0건이고 [실측], 값 없는 빌드의 계측에서
  `FacebookSdk.isInitialized()`가 거짓이다 [실측].
- `com.facebook.sdk.AutoInitEnabled` 메타데이터는 선언하지 않는다(SDK 기본값). 자동 진입로는 provider 제거로 닫았고,
  손으로 부른 `setApplicationId` → `setClientToken` → `sdkInitialize` 한 번이 초기화한다. ⚠ 그 한 번으로 자동 이벤트
  추적까지 서는지는 [기억]이고 기기에서 보지 않았다(「확인하지 못한 것」 3).
- **iOS**: `ApplicationDelegate`를 부르지 않으면 SDK가 시작하지 않는다. 값 없는 Release 빌드에서 프레임워크 셋이 로드된
  채 Host 프로세스의 소켓이 0이었다 [실측 — 시뮬레이터 한 대, 한계는 「확인하지 못한 것」 2].

### D5. 자동 이벤트는 켠다, 광고 식별자는 플랫폼마다 다르다

| 플래그 | iOS (`Info.plist`) | Android (매니페스트 `meta-data`) | 이유 |
|---|---|---|---|
| 자동 앱 이벤트 | `FacebookAutoLogAppEventsEnabled = true` | `com.facebook.sdk.AutoLogAppEventsEnabled = true` | 설치 · 앱 실행은 SDK 자동 이벤트로 잰다 |
| 광고 식별자 수집 | `FacebookAdvertiserIDCollectionEnabled = false` | `com.facebook.sdk.AdvertiserIDCollectionEnabled = true` | iOS는 IDFA 미수집(사용자 결정). Android는 D9 |
| 자동 초기화 | 해당 키 없음 | 선언하지 않음 + provider 제거 | D4 |
| 표시 이름 | `FacebookDisplayName = Duru` | — | SDK 설정 관례 [기억] |
| 추적 문구 | `NSUserTrackingUsageDescription` **없음**(plist · `INFOPLIST_KEY_*` 둘 다) | — | ATT를 요청하지 않는다 |

iOS에는 URL scheme(`fb<앱 ID>`) · `LSApplicationQueriesSchemes`도 두지 않는다 — Facebook 로그인 · 공유 · 딥링크를 쓰지
않는다. 가짜 값 빌드에서 URL scheme이 없다는 이유로 SDK가 예외를 내지 않았다 [실측]. `SKAdNetworkItems`에는 Meta 식별자
둘(`v9wttpbfk9.skadnetwork` · `n38lu8286q.skadnetwork`)을 적는다 — iOS의 설치는 IDFA가 아니라 SKAdNetwork · 집계
측정으로 센다. ⚠ 이 두 값은 Meta 공식 문서와 대조하지 못했다(「확인하지 못한 것」 5).

### D6. 이벤트 매핑 — 순수 함수 하나, 표 하나

| 기존 제품 이벤트 | 조건 | Meta 이벤트 | 파라미터 |
|---|---|---|---|
| `entry_completed` | — | `fb_mobile_complete_registration` | 없음 |
| `messenger_unit_completed` | `entrySource === "journey"` | `fb_mobile_level_achieved` | `fb_level` = `unitId` · `fb_content_type` = `"messenger"` |
| `visual_novel_unit_completed` | `entrySource === "journey"` | `fb_mobile_level_achieved` | `fb_level` = `unitId` · `fb_content_type` = `"visual_novel"` |
| 위 둘 | `entrySource === "roleplay"` | 보내지 않는다 | — |
| 그 밖의 이름 전부(27개) | — | 보내지 않는다 | — |

- 정본은 `apps/mobile/src/lib/meta-events.ts`의 `metaAppEventFrom`과 타입 계약 `lib/meta-events.contract.ts`다. 이 표가
  코드와 다르면 코드가 옳다.
- 레슨 완료에 `fb_mobile_level_achieved`(Achieve Level)를 고른 이유: 표준 이벤트라 광고 최적화 목표로 바로 고를 수 있고
  「단계 하나를 끝냈다」는 뜻이 유닛 완료와 맞는다. `fb_mobile_tutorial_completion`은 「한 번 끝나는 튜토리얼」이라 유닛이
  여럿인 구조와 어긋난다.
- 롤플레이 출처를 빼는 이유: 회차마다 중복 없이 나서 같은 사용자가 수를 부풀린다.
- 파라미터에는 **콘텐츠 식별자만** 싣는다. 사용자 ID · 이메일 · 전화번호 · 로그인 수단(`fb_registration_method`)을 싣지
  않고 고급 매칭(`setUserData`) · Meta `userID` 설정도 하지 않는다.
- 와이어 이름 넷(`fb_mobile_complete_registration` · `fb_mobile_level_achieved` · `fb_level` · `fb_content_type`)은 두 SDK의
  상수와 같다 [실측 — Android JUnit `MetaAppEventNamesTest`, iOS `MetaAppEventsTests`의 N-I4]. SDK를 올려 상수가 바뀌면 이
  두 테스트가 선다.
- 설치 · 앱 실행은 앱이 내지 않는다 — SDK 자동 이벤트이고 이름은 SDK 소유다.

### D7. JS는 모듈 셋 — 타입 · 순수 · background 전용

| 파일 | 성질 | 하는 것 |
|---|---|---|
| `lib/meta-events.contract.ts` | 타입만 | Meta 이벤트 모양 · 호스트 모듈 모양 · 함수 시그니처 |
| `lib/meta-events.ts` | 순수 · SDK도 `NativeModules`도 모른다 | 매핑(`metaAppEventFrom`)과 sink 합성(`withMetaAppEvents`) |
| `lib/meta-app-events-module.ts` | **첫 줄 `import "background-only"`** | `NativeModules`에서 호스트 모듈을 찾는 유일한 자리 · 진입점 조립(`productEventSinks`) |

진입점 `app/index.tsx`가 `__BACKGROUND__ ? productEventSinks(analytics.sinks) : analytics.sinks`로 한 번 감싼다. 메인
스레드 그래프가 셋째 모듈에 닿으면 빌드가 깨진다([ADR-0029](0029-product-analytics-posthog.md) D3과 같은 경계).
logger는 시작 때 한 번 해석한다 — 모듈 등록 여부는 프로세스 동안 바뀌지 않는다.

### D8. Meta 전달은 PostHog와 독립이다

- logger가 있으면 `entryEventSink` · `messengerEventSink` · `visualNovelEventSink` **셋만** 새 함수가 된다. 나머지 넷은
  받은 값 그대로다(`null`이면 `null`). logger가 없으면 일곱 다 받은 그대로다.
- 새 함수는 ① 원래 sink가 `null`이 아니면 부르고 ② 매핑이 있으면 logger를 부른다. **①과 ②를 각각 `try`로 감싼다** —
  어느 쪽 예외도 다른 쪽과 화면을 막지 않는다. 이벤트 한 건에 logger 호출은 0 또는 1회다.
- **PostHog 키가 없어도 Meta는 동작한다.** 두 설정의 자리가 다르다(PostHog는 번들 환경 변수, Meta는 호스트 빌드 설정).
  하나를 다른 하나의 전제로 묶으면 「Meta 값만 넣은 빌드」가 조용히 아무것도 안 보낸다.
- 그 결과 sink가 `null`이 아닌 조건이 「PostHog 클라이언트가 있다」에서 **「보낼 곳이 하나라도 있다」**로 넓어졌다.
  타입 · 화면 동작은 그대로다(맥락 4). `lib/analytics.contract.ts` · `screens/messenger/messenger.contract.ts`의 sink 주석이
  그 뜻으로 고쳐졌다.

### D9. Android `AD_ID` 권한은 포함한다

- 근거: 재려는 것이 「광고별 설치 수 · 설치당 비용」이다. Android의 Meta 설치 귀속은 광고 ID에 크게 기대고 [기억],
  사용자에게 뜨는 팝업이 없다 — iOS에서 내린 결정은 「팝업을 띄우지 않음」이었고 그 조건을 Android에서는 권한을 넣은 채로
  지킬 수 있다.
- **대가: 값이 없는 빌드에도 권한은 매니페스트에 실린다.** Play Console의 「광고 ID」 선언과 데이터 보안 양식을 고치지
  않고 올리면 Play가 거절할 수 있다. 순서는 [운영 안내](../airbridge-events.md#스토어-고지에서-바뀌는-것)가 진다.
- 권한은 AAR 병합으로 이미 들어오지만, 결정이 추적되는 파일에 보이도록 앱 매니페스트에 **명시적으로 한 줄** 적는다.
- 병합 매니페스트에 이 변경으로 새로 실린 권한 [실측 — `bundled` 변형의 병합 보고서]:
  `com.google.android.gms.permission.AD_ID`(앱 명시 + SDK) · SDK의 `ACCESS_ADSERVICES_ATTRIBUTION` ·
  `ACCESS_ADSERVICES_AD_ID` · `ACCESS_ADSERVICES_CUSTOM_AUDIENCE` · `ACCESS_ADSERVICES_TOPICS` · 전이 의존
  `installreferrer`의 `com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE`. 전부 설치 때 주어지는
  권한이고 대화상자가 없다. `ACCESS_ADSERVICES_*` 넷은 SDK 병합 그대로 둔다 — 빼면 SDK가 검증한 구성에서 벗어난다.
  (`ACCESS_NETWORK_STATE` · `WAKE_LOCK`은 이 변경 전부터 `firebase-messaging`이 넣던 것이다.)
- SDK의 비공개 BroadcastReceiver 둘(`CurrentAccessTokenExpirationBroadcastReceiver` ·
  `AuthenticationTokenManager$CurrentAuthenticationTokenChangedBroadcastReceiver`)도 병합된다 [실측]. 로그인 토큰용이고 이
  앱은 Facebook 로그인 SDK를 쓰지 않는다 — 빼지 않았다.
- 이 권한은 [ADR-0026](0026-permission-entry-conditions-and-denial-handling.md) D2의 권한 표가 세는 대상이 아니다 — 그
  표는 사용자에게 묻는 권한의 입장 조건과 거부 처방을 진다.
- 뒤집는 법: 매니페스트의 `AD_ID` 줄을 `tools:node="remove"`로 바꾸고 `AdvertiserIDCollectionEnabled`를 `false`로.
  그러면 `host-meta-app-events.integration.test.mjs`의 I-S1(권한 한 줄)이 서므로 함께 고친다.

### D10. 호스트 모듈은 메서드 하나 — 이름과 문자열 파라미터만 넘긴다

`MetaAppEventsModule.logEvent(name: string, parameters: { [key: string]: string }): void`. 이벤트 이름을 호스트에 두지
않는다 — 허용 목록은 JS 순수 매핑 하나뿐이라 매핑 표가 한 곳에만 있다. 모듈은 받은 맵에서 **문자열 값만** 골라 SDK에
넘기고 그 밖의 타입은 버린다. 응답 · 콜백이 없다. 이름이 비었거나 SDK가 시작되지 않았으면 아무것도 하지 않는다.

⚠ **[ADR-0017](0017-host-native-capabilities-and-audio.md) D1의 입장 조건을 그대로 통과시킨 모듈이 아니다.** 그 조건은
「어느 화면이 요구했나」로 시작하는데, 이 모듈을 요구한 것은 화면이 아니라 광고 측정이다. JS만으로 Meta에 보낼 대체
경로(서버 Conversions API · Graph API 직접 호출)는 범위 밖으로 두었고 훑어 비교하지 않았다. 조건 문면은 고치지 않는다.
SDK를 직접 부르는 호스트 코드는 플랫폼마다 파일 하나(`MetaAppEvents.swift` · `MetaAppEvents.java`)에 모은다.

### D11. Android 모듈 등록은 `MainActivity`의 `registerModule(` 줄을 늘리지 않는다

`MainActivity.onCreate`에 `MetaAppEvents.configure(builder);` 한 줄을 `DebugSupport.configure(builder);` 옆에 둔다.
`registerModule` 호출은 `MetaAppEvents.java` 안에 있고 `started()`일 때만 부른다. 그래서 HS2(호출 11개)가 수정 없이
통과한다.

HS2의 본뜻은 「상태바 작업이 모듈을 더하지 않았다」이고 11은 그때의 개수다 — 이 작업은 모듈을 정당하게 하나 더한다.
조건부 등록(D3)이 설정 판정과 한 파일에 모이는 이점도 있다. ⚠ **그래도 가드의 숫자를 비켜 가는 것이다** — `MainActivity`만
세는 HS2는 이제 Android 호스트의 모듈 수를 말하지 않는다(「사용자 확인 필요」 10).

### D12. R8 규칙은 더하지 않는다

`proguard-rules.pro`는 9줄 그대로다. `facebook-core`가 소비자 규칙을 싣고, 호스트 모듈은 Lynx AAR의
`-keep class * extends com.lynx.jsbridge.LynxModule { *; }`가 지킨다([ADR-0052](0052-android-release-shrinking.md)).
`:app:assembleBundled`(R8)가 규칙 추가 없이 통과했다 [실측]. `Missing classes`가 나는 날에는 규칙을 먼저 더하지 않는다 —
I4 수정과 ADR-0052 정정이 따르는 사용자 승인 사항이다.

### D13. iOS 프라이버시 매니페스트 — 앱 선언은 「추적 안 함」을 유지하고 목적을 하나 더한다

- 앱의 `PrivacyInfo.xcprivacy`: `NSPrivacyTracking = false` 유지. `ProductInteraction` · `DeviceID`의 목적에
  `NSPrivacyCollectedDataTypePurposeDeveloperAdvertising`을 더했다(자사 광고의 성과 측정). 각 항목의 `Tracking`은 `false`
  그대로다.
- **SDK가 싣는 매니페스트는 손대지 않는다.** `FBSDKCoreKit`의 것은 `NSPrivacyTracking = true` · 추적 도메인
  `ep1.facebook.com` · `DeviceID`를 tracking `true`(목적 `ThirdPartyAdvertising`)로 선언한다 [조회]. 앱과 SDK의 선언이
  어긋나 보이는 것이 이 결정의 가장 약한 자리다 — 근거와 한계는 [iOS 프라이버시 문서](../ios-privacy.md#airbridge-sdk와-추적-선언)가
  진다. App Store의 「추적」 응답은 사용자 판단이다(「사용자 확인 필요」 7).

### 측정 — 무엇이 Meta에 찍히는가

| 알고 싶은 것 | Meta 이벤트 | 속성 | 발생 시점 | 내는 쪽 |
|---|---|---|---|---|
| 설치 | SDK 자동 「앱 설치」 | SDK가 붙임 | 설치 뒤 첫 실행에서 SDK 시작 | SDK(자동) |
| 앱 실행 | SDK 자동 「앱 활성화」 | SDK가 붙임 | 앱이 전경으로 올 때 | SDK(자동) |
| 가입 완료 | `fb_mobile_complete_registration` | 없음 | 진입 흐름의 「여정 시작하기」(`entry_completed`와 같은 순간) | JS → `logEvent` |
| 레슨 완료 | `fb_mobile_level_achieved` | `fb_level`(유닛 ID) · `fb_content_type`(`messenger` \| `visual_novel`) | 여정의 메신저 유닛을 처음 끝낸 순간 · 여정의 비주얼 노벨 유닛이 끝난 순간 | JS → `logEvent` |

「광고별 설치 수 · 설치당 비용」은 Meta 광고 관리자가 위 이벤트로 계산한다 — 앱이 따로 내는 것은 없다.

**할 일(저장소 밖)** — GitHub wiki 「[이벤트 사전](https://github.com/libitums/FE/wiki/Analytics-Events)」의 세 이벤트
(`entry_completed` · `messenger_unit_completed` · `visual_novel_unit_completed`)에 「Meta로도 전달」과 Meta 이름을 표시한다.
ADR-0029 D1의 「같은 PR에서 wiki를 고친다」 규약이고 PR 작성자가 손으로 한다. 이 문서를 쓰는 시점에는 하지 않았다.

## 사용자 확인 필요

⚠ 아래 열둘은 사용자가 자리에 없는 동안 고른 기본값이다. **아직 하나도 확인받지 않았다.** 확인되기 전까지 이 ADR은
`제안`이다.

1. ⚠ **「레슨 완료」의 범위가 좁다**(D6 · 맥락 1). 기존 이벤트만으로는 여정의 메신저 유닛 하나 · 비주얼 노벨 유닛
   하나뿐이라 **사용자당 최대 2회**다. 표준 학습 유닛 · 전화 유닛 · 카탈로그 레슨은 완료 이벤트가 아예 없어 Meta로 갈
   것이 없다. 넓히려면 새 제품 이벤트가 필요하고, 그것은 「새 화면 이벤트를 만들지 않는다」는 요구사항을 바꾸는 일이다
   (PostHog · wiki 사전도 함께 바뀐다).
2. ⚠ 레슨 완료의 Meta 이름 `fb_mobile_level_achieved`(D6). 대안: `fb_mobile_tutorial_completion` · 커스텀 이름.
3. ⚠ 롤플레이(연습) 출처의 완료는 보내지 않는다(D6). 대안: 보낸다(회차마다 중복).
4. ⚠ **가입 완료 = `entry_completed`**(D6 · 맥락 3). 재로그인 · 재설치 뒤 로그인에도 난다 — 신규 가입과 구분할 정보가
   이벤트에 없다. 한 번만 보내려면 저장소 키가 하나 필요하고 이번에는 두지 않았다.
5. ⚠ **Android `AD_ID` 권한 포함**(D9). Play Console 선언을 사용자가 고쳐야 한다. 대안: 제거(귀속 정확도 하락).
6. ⚠ 개인 식별 정보 미전송(D6) — 사용자 ID · 이메일 · 전화번호 · 로그인 수단 없음, 고급 매칭 없음. 사용자가 명시한
   것이 아니라 ATT 미사용 결정과 같은 방향이라 고른 추론이다.
7. ⚠ **iOS 앱 프라이버시 매니페스트는 `NSPrivacyTracking = false` 유지 + `DeveloperAdvertising` 목적 추가**(D13). SDK 자체
   매니페스트는 tracking `true`를 선언한다. App Store 「추적」 응답은 사용자 판단이다.
8. ⚠ PostHog 키가 없어도 Meta는 독립적으로 동작한다(D8).
9. ⚠ **번들 상한에 여유가 71 bytes 남았다**(「실측」). 상한은 올리지 않았다 — 넘지 않았기 때문이다. 다음 JS 변경이 거의
   틀림없이 넘는다. 미리 올릴지, 그때 실측으로 올릴지.
10. ⚠ Android 모듈 등록을 `MetaAppEvents.configure(builder)`로 돌려 HS2(모듈 11개 가드)를 수정 없이 통과시킨다(D11).
    대안: `MainActivity`에 직접 등록하고 HS2의 숫자를 12로 고친다(기존 테스트 수정).
11. ⚠ 값 파일은 플랫폼마다 하나씩이다 — 같은 값을 두 번 적는다(D2).
12. ⚠ release 빌드가 값 없이도 실패하지 않는다(D2). 대안: Play · App Store에 올릴 release는 값이 없으면 막는다.

## 실측 (2026-10-13)

| 항목 | 값 |
|---|---|
| `main.lynx.bundle` | 1,721,929 bytes — 변경 전 1,720,937 대비 **+992**. 상한 1,722,000(`devtools/bundle-size/budget.json`, 수정하지 않음)까지 **여유 71 bytes** |
| 번들 안 `MetaAppEventsModule` 문자열 | 1회. 번들이 바이너리라 어느 스레드 구간인지는 가르지 못했다 — 메인 스레드에 새지 않았다는 근거는 `background-only` 모듈을 낀 빌드가 성공한 것이다 |
| iOS Release 시뮬레이터 `.app` | 53,260 → 63,064 KB(**+9,804 KB**). 프레임워크 `FBSDKCoreKit` 8,128 · `FBAEMKit` 1,160 · `FBSDKCoreKit_Basics` 316 KB, 호스트 바이너리 +200 KB |
| Android `app-bundled.apk` | 58,432,327 bytes. **변경 전 값을 재지 않아 증감은 모른다** |
| 자동 테스트 | unit 1,913 · integration 537 · `pnpm test:android-bundle` 134(정적 검사 I-S1 ~ I-S7 포함) · iOS HostTests 70(그중 `MetaAppEventsTests` 12, skip 0) · Android JVM 19 클래스 실패 0 · 계측 `MetaAppEventsHostTest` `OK (3 tests)` |
| 값 없는 빌드의 기기 확인 | iOS 시뮬레이터 · Android 에뮬레이터 각 한 대에서 실행 · 재시작 · 로그인 화면까지, 새 시스템 팝업 없음, 앱에서 나간 연결 0. 로그인 뒤 흐름은 수행하지 않았다 — [Meta 앱 이벤트 e2e](../e2e/airbridge-events.md) 「A 결과 기록」 |
| 가짜 값(`123` / `abc`) 빌드 | iOS: SDK 시작 · URL scheme 없이 예외 없음 · `ep2.facebook.com/v26.0/123/server_domain_infos` 요청 관찰(구현 중 확인이고 e2e 시나리오 B의 정식 실행이 아니다). Android: 빌드와 `BuildConfig` 반영까지만 — 기기에서 실행하지 않았다 |

성능 기록은 [Meta 앱 이벤트 번들 · 앱 용량](../performance/reports/meta-app-events-iphone-17-pro-simulator-01.md)에 있다
(번들 · 용량만, 실행 시간은 미측정).

## 확인하지 못한 것

1. **실제 앱 ID · 클라이언트 토큰으로 Meta가 이벤트를 받는 것.** 설치 · 가입 완료 · 레슨 완료가 Meta 이벤트 관리자에
   찍히는지, 광고 관리자에서 설치 수 · 설치당 비용이 보이는지는 한 번도 보지 않았다. 사용자가 값을 넣은 뒤
   [e2e 시나리오 C](../e2e/airbridge-events.md)로 본다.
2. **값 없는 빌드의 「요청 0건」은 좁은 관찰이다.** 시뮬레이터 · 에뮬레이터 각 한 대, 실행부터 로그인 화면 · 재시작까지다.
   로그인 이후(가입 완료 · 유닛 완료)는 사람 손이 필요해 수행하지 않았다. iOS에서는 그 실행의 앱이 다른 외부 요청도 내지
   않아(번들 환경 변수가 없는 워크트리였던 것으로 추정) 앱 자체의 대조 요청이 없다 — 관찰 도구가 동작한다는 것은 맥의 다른
   연결로만 확인했다. 변경 전 빌드와 화면을 나란히 비교하지 않았다. 실기에서는 보지 않았다.
3. **값이 있는 빌드의 Android 기기 실행.** `sdkInitialize` 한 번으로 초기화와 자동 이벤트 추적이 서는지, `started()`가
   참이 되고 모듈이 등록되는지를 기기에서 보지 않았다(e2e 시나리오 B 미실행). iOS의 가짜 값 확인도 시작 · 요청 한 건까지이고
   이벤트 전달(`logEvent` → SDK)의 기기 관찰은 없다.
4. **App Store · Play 심사 결과.** 앱 매니페스트 `NSPrivacyTracking = false`와 SDK 매니페스트 tracking `true`의 조합,
   `AD_ID` 권한과 Play 선언의 조합이 심사를 통과하는지 모른다.
5. **SKAdNetwork 식별자 둘이 Meta의 현재 값인지.** 서드파티 연동 문서 여럿과는 일치하나(보조 출처) **Meta 공식 문서와
   대조하지 못했다.**
6. **iOS가 ATT 미요청 앱에서 SDK의 추적 도메인(`ep1.facebook.com`) 접속을 막는지** [기억]. 관찰한 것은 가짜 값 빌드가
   `ep2.facebook.com`으로 낸 요청 한 건뿐이다.
7. **Android 11+에서 Meta 설치 리퍼러 조회에 `<queries>` 선언이 필요한지.** 실제 값으로 수신을 볼 때 함께 본다.
8. **자동 앱 이벤트가 인앱 구매를 싣는지.** 젬 구매 화면이 코드에 있다(지금은 제품에서 열리지 않고, 호스트에 결제
   코드 — StoreKit 결제 · Play Billing — 도 없다). 결제 이벤트는 범위 밖이므로 운영 안내가 Meta 대시보드의 자동 인앱 구매
   로깅을 끄라고 적었지만, 켜 둔 때의 실제 동작은 보지 않았다.
9. **기기용(App Store 슬라이스) iOS 앱 용량 · 변경 전 Android APK 크기 · 동적 프레임워크 셋이 앱 시작 시간에 주는
   영향.** 재지 않았다.
10. Play Console의 오래된 SDK 경고 여부(전이 의존 `legacy-support-core-utils` 1.0.0 등).

## 버린 대안

| 대안 | 버린 이유 |
|---|---|
| `facebook-android-sdk` 우산 아티팩트 · 로그인 · 공유 pod | 앱 이벤트만 쓴다. 쓰지 않는 UI · 권한 · 용량이 딸려 온다(D1) |
| 값이 없을 때 no-op 모듈을 등록 | 「보낼 곳 없음」이 타입(`null`)이 아니라 조용한 무동작이 된다. 기존 sink 규약이 금지한다(D3) |
| Android에서 값을 `manifestPlaceholders`로 | SDK가 매니페스트에서 값을 스스로 읽을 수 있게 되어 「초기화하지 않음」의 판정 자리가 둘이 된다(D2) |
| `AutoInitEnabled = false` 메타데이터로 자동 초기화 끄기 | 손으로 부른 초기화가 끝까지 가지 않을 수 있다 [기억]. provider를 빼는 쪽이 닫히는 자리가 분명하다(D4) |
| 이벤트 이름 허용 목록을 호스트에도 | 매핑 표가 세 곳(JS · Swift · Java)이 된다(D10) |
| Meta 전달을 PostHog 클라이언트가 있을 때만 | 「Meta 값만 넣은 빌드」가 조용히 아무것도 안 보낸다(D8) |
| `MainActivity`에 직접 등록하고 HS2를 12로 | 기존 테스트를 고쳐야 한다. 대안으로 남겨 두었다(「사용자 확인 필요」 10) |
| 값 파일 하나를 두 플랫폼이 함께 읽기 | 주석 문법이 달라 한쪽 빌드가 깨진다(D2) |

## 대가

1. **값이 없는 빌드에도 SDK가 실린다.** iOS 앱이 약 9.8 MB(시뮬레이터 Release 기준) 커지고 동적 프레임워크 셋이 실행 때
   로드된다. Android에는 `AD_ID` 등 권한 여섯이 값과 무관하게 매니페스트에 실린다.
2. **스토어 고지가 코드보다 먼저 바뀌어야 한다.** Play의 광고 ID 선언 · 데이터 보안 양식, App Store의 개인정보 응답이
   사용자 손에 있고 저장소가 강제하지 못한다.
3. **「레슨 완료」가 사용자당 최대 2회다.** 광고 최적화 신호로는 얇다(「사용자 확인 필요」 1).
4. **「가입 완료」가 가입이 아니라 진입 흐름 완주다.** 재로그인마다 난다(「사용자 확인 필요」 4).
   ⟨2026-10-18 적용 기록⟩ 기록 있는 계정의 재로그인에서는 더 나지 않는다(맥락 3의 주 · [ADR-0069](0069-returning-learner-login.md)).
5. **iOS는 IDFA 없이 센다.** SKAdNetwork · 집계 측정에 기대므로 귀속이 늦고 거칠다. ATT를 여는 것은 후속 결정이다.
6. **앱과 SDK의 프라이버시 선언이 어긋나 보인다**(D13).
7. **값이 두 파일에 따로 있다.** 한쪽만 넣으면 그 플랫폼만 보낸다 — 빌드는 알려 주지 않는다.
8. **HS2가 Android 모듈 수를 더는 말하지 않는다**(D11).
9. **전달 실패는 어디에도 남지 않는다.** JS는 예외를 삼키고 호스트는 SDK에 맡긴다. 화면에도 로그에도 드러나지 않는다(의도).
10. **번들 상한 여유가 71 bytes다.** 다음 변경이 상한을 다시 올려야 할 가능성이 높다.

## 재검토 조건

- **「사용자 확인 필요」의 열두 항목이 답을 받은 때** → 제자리에서 고치고 `채택`으로 올린다.
- **실제 값으로 첫 수신을 확인한 때**(e2e 시나리오 C) → 「확인하지 못한 것」 1 · 3 · 7 · 8을 결과로 바꾼다.
- **표준 학습 유닛 · 카탈로그 레슨에 완료 이벤트가 생긴 때** → D6의 표에 행을 더할지 본다.
- **ATT 팝업을 열기로 한 때** → D5 · D13. `NSUserTrackingUsageDescription` · `FacebookAdvertiserIDCollectionEnabled` ·
  앱 매니페스트의 tracking 선언을 함께 바꾼다. 새 결정이다.
- **Facebook 로그인을 네이티브 SDK로 바꾸기로 한 때** → D1 · D5. URL scheme과 로그인 pod이 들어오고
  [ADR-0028](0028-social-oauth-web-authentication.md) D4와 부딪힌다.
- **`FBSDKCoreKit` · `facebook-core` 버전을 올릴 때** → 와이어 이름 테스트 · 병합 매니페스트의 권한과 provider · SDK
  프라이버시 매니페스트 · R8 통과 · 앱 용량을 다시 본다.
- **App Store 또는 Play 심사가 이 변경을 이유로 거절한 때** → D9 · D13.
- **`size:check`가 실패한 때** → 실측으로 상한을 올리고 「사용자 확인 필요」 9를 닫는다.
