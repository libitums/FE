# ADR-0063 — 광고 측정 전송을 Meta SDK에서 Airbridge(MMP) SDK로 바꾼다 (iOS는 restricted 변형 · 값이 없으면 `initializeSDK`를 부르지 않는다 · 매핑은 JS 한 곳 · PostHog와 독립 · ATT 없음)

- 상태: **제안** — 구현과 `pnpm verify` 안의 계층, 두 호스트의 빌드 · 호스트 테스트, 값 없는 빌드와 가짜 값 빌드의 기기 확인
  (두 플랫폼, 로그인 화면까지)이 끝났다.
  ⚠ **기본값 열일곱이 사용자 확인 전이다**(「사용자 확인 필요」). 확인되기 전까지 `채택`으로 올리지 않는다.
  ⚠ **실제 앱 이름 · App SDK Token으로 Airbridge가 이벤트를 받는 것은 한 번도 보지 않았다**(「확인하지 못한 것」 1).
  ⚠ **Android dex 가드의 한도를 4,000,000 → 4,300,000 bytes로 올렸다 — 사용자 승인(2026-10-13)**(D14).
  ⚠ **정렬 가드 NA3의 64비트 `.so` 기대를 31 → 33으로 고쳤다**(`libairbridgelib.so` — 정렬 실패 0)(D14).
- 날짜: 2026-10-13
- 다루는 축: **광고 측정 전송** — [ADR-0057](0057-meta-app-events.md)에서 넘겨받는다. 어느 SDK를 어느 버전 · 어느 변형으로
  넣는가, 어느 저장소에서 받는가, 값을 어디서 받는가, 값이 없을 때 무엇을 하지 않는가, SDK의 자동 진입로, 어느 제품 이벤트가
  어느 Airbridge 이벤트가 되는가, 호스트 모듈의 모양, PostHog 전송과의 관계, iOS 추적 허용(ATT) · 광고 식별자 ·
  `SKAdNetworkItems`, Android 광고 ID 권한, R8과 출시 산출물 가드, iOS 프라이버시 매니페스트.
  **다루지 않는 것**: ATT 팝업과 IDFA 수집 · 딥링크 · 지연 딥링크(`handleDeferredDeeplink` · Associated Domains) · 랜딩 웹 ·
  서버 이벤트 · 결제 · 인앱 구매 추적 · 삭제 추적 · 사용자 식별(`setUserID` 등) · Meta Install Referrer · SDK Signature ·
  커스텀 도메인 · 새 제품 이벤트 · Airbridge 대시보드의 매체 연동과 스토어 콘솔 수정(사용자 몫 —
  [운영 안내](../airbridge-events.md)).
- 대체한 것: **[ADR-0057](0057-meta-app-events.md) 전체**(상태 `대체됨`). 그 문서의 결정 가운데 **D1(아티팩트) · D2의 이름 ·
  D4(자동 진입로) · D5(자동 이벤트 · 광고 식별자 플래그) · D6(이벤트 이름) · D13(`SKAdNetworkItems` · SDK 매니페스트)이 바뀌고**,
  D2의 구조 · D3 · D7 · D8 · D9 · D10 · D11 · D12는 이름만 바뀐 채 이어 받는다(아래 각 D에 「0057 Dn 유지」로 적는다).
- 적용 기록(결정을 바꾸지 않는다):
  [ADR-0029](0029-product-analytics-posthog.md) D2 — 「보낼 곳이 하나라도 있다」의 다른 한쪽이 Meta 로거에서 Airbridge
  tracker로 바뀌었다(그 문서의 D2에 주).
  [ADR-0017](0017-host-native-capabilities-and-audio.md) D1 · D2 — 호스트 모듈 `MetaAppEventsModule`이
  `AirbridgeEventsModule`로 바뀌었다(개수는 그대로, [호스트 모듈 표](README.md#호스트-모듈-표)).
  [ADR-0052](0052-android-release-shrinking.md) D5 — 산출물 가드 A1(`.so` 개수) · A3(dex 한도) · A4(호스트 모듈 수)의 숫자가
  바뀌었다(D14, 그 문서의 「적용 기록」).
- 받은 적용 기록(결정을 바꾸지 않는다):
  2026-10-22 D1 — Android `io.airbridge:sdk-android` 4.11.3 → **4.12.0**(정확 버전, 대시보드 안내 버전에 맞춤). 에뮬레이터 `bundled` ·
  실제 값에서 `initializeSDK` · 모듈 생성 확인. release dex 4,740,008 → 4,758,464 bytes(+18,456), 64비트 `.so` 33 그대로.
  ⚠ 산출물 가드 A3(dex < 4,300,000)는 **main에서 이미** 넘어 있었다(4.11.3에서 4,740,008) — `pnpm verify` 밖의 검사라 드러나지
  않았다. A4(호스트 모듈 12)도 main에서 13이다(`ContentFileModule`). 한도는 고치지 않았다 — 사용자 판단.
  2026-10-18 [ADR-0069](0069-returning-learner-login.md) D6 — 가입 완료가 기록 있는 계정의 재로그인 · 재설치에서 더 나지 않는다(「사용자 확인 필요」 5에 주).

**왜 새 번호인가** — 0057은 이미 main에 들어가 그 위에 코드 · 문서 · 스토어 고지 절차가 지어졌다. 그 결정 여럿(아티팩트 ·
이벤트 이름 · 자동 진입로 · iOS 설정)이 한꺼번에 바뀌므로 ADR README의 규칙대로 새 번호로 묶고 옛 것을 `대체됨`으로 둔다.
이 회차의 계약 문서는 저장소에 남지 않으므로 근거가 남을 자리가 여기다.

근거 표시: **[코드]** 저장소에서 읽음 · **[조회]** 2026-10-13에 배포물 · 공식 문서를 직접 받아 확인 · **[실측]** 이 저장소에서
빌드 · 실행해 관찰 · **[추정]** 조회 결과에서 끌어낸 판단이고 관찰하지 않음.

## 맥락

사용자 결정(2026-10-13, 다시 묻지 않는다): 광고 매체 **Meta · Google Ads · TikTok Ads · Apple Ads(Search Ads)** 넷 · MMP
**Airbridge**(사용자 가입 완료) · **Meta SDK를 빼고 Airbridge만**. 0057에서 이어지는 결정도 그대로다 — 플랫폼 iOS + Android ·
보낼 것은 설치 + 가입 완료 · 레슨(유닛) 완료 · iOS ATT 팝업 없음 · 값은 사용자가 나중에 직접 넣는다. 목적은 네 매체에서
「어느 광고가 실제 설치 · 가입 · 레슨 완료를 만들었는지」를 매체 간 중복 없이 한 곳에서 보고, 각 매체가 그 결과로 광고를
최적화하게 하는 것이다. 매체 SDK를 매체마다 넣는 대신 MMP 하나가 매체 연동을 대시보드에서 맡는다.

이 저장소의 사실(0057 「맥락」 1 ~ 6은 그대로 맞다 — 완료 이벤트가 셋뿐 · 「가입 완료」는 재로그인에도 남 · sink 호출부의
`sink?.(event)` · Podfile에 `use_frameworks!` 없음 · 가드가 못 박은 숫자들).

1. **SDK 배포물** [조회].
   - Android `io.airbridge:sdk-android` `4.11.3`(2026-09-03). **Maven Central에 없고** `https://sdk-download.airbridge.io/maven`에만
     있다. AAR 994,124 B · 의존 `kotlin-stdlib-jdk7` · `kotlinx-coroutines-android` · `play-services-appset`.
     **네이티브 `libairbridgelib.so`가 ABI마다 하나** 있다(9 ~ 13 KB, 16 KB 정렬 문제 0).
     AAR 매니페스트가 병합하는 것: `INTERNET` · `ACCESS_NETWORK_STATE` · `BIND_GET_INSTALL_REFERRER_SERVICE` · `AD_ID`,
     `<queries>` 패키지 `com.facebook.katana` · `com.instagram.android`, provider `AirbridgeLifecycleProvider`.
     **소비자 R8 규칙에 `-keep class com.facebook.** { *; }`가 있다**(D14).
   - iOS `airbridge-ios-sdk-restricted` `4.11.1`(CocoaPods trunk 최신). 미리 빌드한 **동적** `Airbridge.xcframework`, 하한 iOS 12.0,
     arm64 바이너리 2,909,200 B. **IDFA · ATT를 빼고 만든 공식 변형**이다 — `otool -L`에 AdSupport · AppTrackingTransparency 링크가
     없고 `advertisingIdentifier` 문자열이 0이다. AdServices(Apple Ads)는 weak 링크로 있다. SDK 프라이버시 매니페스트는
     `NSPrivacyTracking = false` · 추적 도메인 0이다(D13).
   - Airbridge는 SDK가 스스로 시작하는 진입로가 없다 — `Airbridge.initializeSDK`를 불러야만 시작한다(문서 · 공개 API).
2. **Apple 문서상 `SKAdNetworkItems`는 광고되는 앱의 설정이 아니다** [조회]. 「광고되는 앱은 install validation에 아무 설정도
   필요 없다」 — 그 키는 광고를 **보여 주는** 앱의 것이다. Duru는 광고를 띄우지 않는다. 0057 D5가 그 키에 Meta 식별자 둘을 적은
   근거는 틀렸다(D13).
3. 번들 상한 1,722,000 bytes에 0057 뒤 여유가 71 bytes였다 [코드].

## 결정

### D1. 최소 아티팩트를 정확 버전으로 — 0057 D1 유지, 아티팩트만 바뀐다

iOS `pod 'airbridge-ios-sdk-restricted', '4.11.1'` 한 줄(Host 타깃), Android `implementation 'io.airbridge:sdk-android:4.11.3'`
한 줄이다. `FBSDKCoreKit` · `facebook-core` 줄은 지웠고, `pod install`이 lock에서 `FBSDKCoreKit` · `FBSDKCoreKit_Basics` ·
`FBAEMKit`을 지웠다 [실측]. 범위 표기는 쓰지 않는다([ADR-0012](0012-native-host-app-minimal.md) D4 ·
[ADR-0013](0013-dependencies-and-version-notation.md)). 일반판 `airbridge-ios-sdk`와 restricted를 함께 설치하지 않는다(Airbridge
문서의 요구).

`use_frameworks!` 없이 동적 xcframework가 링크 · embed 되고 `import Airbridge`가 Host · HostTests 둘에서 된다 [실측]. 0057이 넣은
`[CP] Embed Pods Frameworks` 단계는 그대로 쓴다.

⚠ Airbridge 문서는 「CocoaPods trunk가 읽기 전용이 되어 새 버전은 Airbridge의 GitHub CocoaPods Spec 저장소
(`github.com/ab180/airbridge-cocoapods-specs`)에 올린다」고 한다. 2026-10-13에는 trunk에 4.11.1이 있고 그 저장소의 최신은
4.10.1이라 trunk로 충분했다 [조회]. **다음 버전을 올릴 때 trunk에 없으면 `:source => 'https://github.com/ab180/airbridge-cocoapods-specs.git'`가 필요하다.**

### D2. Airbridge 저장소는 그룹 하나만 — `exclusiveContent`

`apps/android/settings.gradle`의 `dependencyResolutionManagement.repositories`에 vendor-maven 블록 **바로 뒤**, `google()` 앞에
`exclusiveContent` 블록 하나를 더했다 — 저장소 `https://sdk-download.airbridge.io/maven`, 필터 `includeGroup('io.airbridge')`.
그 저장소에서는 `io.airbridge`만 받고, `io.airbridge`는 그 저장소에서만 받는다.

- 이유: 제3자 저장소가 다른 아티팩트를 가로채지 못하게 하고(공급망), `io.airbridge`가 다른 저장소에서 섞여 오지 않게 한다.
  `FAIL_ON_PROJECT_REPOS`라 앱 `build.gradle`에는 둘 수 없다.
- 첫 `exclusiveContent`는 여전히 vendor-maven 블록이라 정적 검사 RC4(`release-config.integration.test.mjs`)는 고치지 않았다.

### D3. 값 주입 — 0057 D2의 구조 유지, 이름 · 키만

| 플랫폼 | 값 파일(추적 안 함) | 추적하는 것 | 어디로 들어가나 |
|---|---|---|---|
| iOS | `apps/ios/Config/Airbridge.local.xcconfig` | `Config/Airbridge.xcconfig`(빈 기본값 둘 + `#include? "Airbridge.local.xcconfig"`) · `Config/Airbridge.local.xcconfig.example`(빈 값) | 프로젝트 수준 Debug · Release의 `baseConfigurationReference` → `Info.plist`의 `AirbridgeAppName = $(AIRBRIDGE_APP_NAME)` · `AirbridgeSDKToken = $(AIRBRIDGE_SDK_TOKEN)` |
| Android | `apps/android/app/airbridge.properties` | `app/airbridge.properties.example`(빈 값) | `app/build.gradle`이 파일이 **있으면** 읽어 `buildConfigField` 둘에, 없으면 빈 문자열 |

- 키는 두 플랫폼 모두 `AIRBRIDGE_APP_NAME` · `AIRBRIDGE_SDK_TOKEN`이다. 받는 곳은 대시보드 [Settings] > [Tokens]의 App Name과
  **App SDK Token**(Web SDK Token · API Token이 아니다).
- `Info.plist`의 두 키는 SDK가 읽는 키가 아니다 — Airbridge는 옵션 객체로만 값을 받는다. 호스트 코드만 읽는다.
- release 빌드가 값 없이도 실패하지 않는다(0057 D2 유지). Android에서 `manifestPlaceholders` · `resValue`를 쓰지 않는다.
- **`.gitignore`**: 두 로컬 경로를 직접 적고, 그 위에 넓은 줄 둘 — `apps/ios/Config/*.local.xcconfig` ·
  `apps/android/app/*.properties`. 이미 `Meta.local.xcconfig` · `meta.properties`를 만들어 둔 사람의 파일이 Meta 줄을 지우는
  순간 추적 후보로 떠서 실수로 커밋되는 것을 막는다. 두 패턴에 걸리는 추적 파일은 0개다(`.example`은 확장자가 달라 걸리지
  않는다).

### D4. 「초기화하지 않음」 — 0057 D3 유지, 규칙만 바뀐다

두 값을 trim한 뒤 **App Name이 `^[A-Za-z0-9_-]+$`이고 SDK 토큰이 `^\S+$`**일 때만 설정이 선다(`AirbridgeEventsConfig.from`,
두 플랫폼 같은 규칙). 하나라도 어기면 `nil`/`null`이고, 그러면

1. `Airbridge.initializeSDK` 호출이 0이다.
2. `AirbridgeEventsModule`을 **등록하지 않는다.**
3. JS의 tracker 해석이 `null`이고 sink는 손대지 않은 그대로다.

App Name 규칙이 토큰보다 좁은 이유: 대시보드 고유 ID라 공백 · 점 · 비ASCII가 들어갈 자리가 없다고 보았다 [추정 — Airbridge
문서에 형식 규칙이 없다]. 틀린 값이면 SDK가 조용히 켜지지 않으므로 운영 안내가 「값을 넣었는데 이벤트가 안 오면 형식부터」라고
적는다. 모듈의 `trackEvent`도 시작되지 않았으면 아무것도 하지 않는다(이중 방어).

### D5. 자동 진입로 — 0057 D4를 바꾼다

- **iOS**: 닫을 것이 없다. `initializeSDK`를 부르지 않으면 시작하지 않는다. 프레임워크는 링크 · 로드만 된다.
- **Android**: SDK의 `AirbridgeLifecycleProvider`는 **제거하지 않는다.** 이 provider의 `onCreate`는 Activity 수명주기를 SDK 내부
  채널로 넘기는 콜백 등록뿐이고 초기화 · 네트워크가 없다 [조회 — 바이트코드]. 빼면 `initializeSDK` 뒤 앱 실행(Open) · 세션
  이벤트가 끊길 수 있는데 그 대체 경로를 확인하지 못했다. 0057이 `FacebookInitProvider`를 `tools:node="remove"`로 뺀 것과
  다르다 — 그것은 **스스로 초기화하는** provider였다.
  **대가: 값이 없는 빌드에서도** 프로세스 시작 때 Airbridge 클래스 일부가 로드되고 수명주기 콜백 하나가 등록된다. 요청은 0이다
  [실측 — e2e A: logcat `initializeSDK` 0건 · 앱 UID 소켓 0].
- 자동 추적(`setAutoStartTrackingEnabled`)은 기본값(켬) 그대로다 — 값이 있는 빌드에서 설치 · 실행을 SDK가 잰다.
- **Android는 `setTrackMetaDeferredAppLinkEnabled(false)`를 부른다**(딥링크는 범위 밖). 그 밖의 옵션은 기본값이다.
  ⚠ **그래도 값이 있는 빌드는 시작 직후 지연 딥링크 조회 요청을 낸다** — iOS는 `tracking-link.airbridge.io`로의 연결, Android는
  logcat `Failed on fetching deferred-deeplink`(가짜 토큰이라 실패)로 관찰했다 [실측 — e2e B]. 이 조회를 끄는 옵션은 확인하지
  못했다(Android의 `setTrackMetaDeferredAppLinkEnabled(false)`는 Meta 지연 앱 링크만 끈다). 사용자가 보는 팝업은 없었다 — iOS
  붙여넣기 허용 팝업도 뜨지 않았다(e2e A · B).

### D6. iOS는 restricted 변형 — 「IDFA 미수집」을 SDK 선택으로 지킨다

- 근거: 사용자 결정 「ATT 팝업 없음 · IDFA 미수집」을 **코드 설정이 아니라 바이너리가** 보장한다(맥락 1 — AdSupport · ATT 링크
  없음, IDFA 문자열 0). 덧붙여 ① SDK 매니페스트가 `NSPrivacyTracking = false` · 추적 도메인 0이라 0057의 「앱은 추적 안 함 ·
  SDK는 추적함」 엇갈림이 사라지고 ② ATT 상태를 읽는 코드가 없어 일반판 문서의 「설치 이벤트를 위해 ATT 결정을 30초 기다린다」가
  걸릴 자리가 없다 — 가짜 값 빌드에서 Airbridge 연결이 실행 0.5초 안에 열렸다 [실측 — e2e B-3].
- 잃는 것: 나중에 ATT를 열어도 IDFA를 받지 못한다 — pod 이름 한 줄을 일반판으로 바꿔야 한다. Apple Ads(AdServices) ·
  SKAdNetwork · IDFV는 그대로다.
- `setTrackingBlocklist` · `setAutoDetermineTrackingAuthorizationTimeout`는 부르지 않는다(restricted에서 의미가 없다).

### D7. 이벤트 매핑 — 0057 D6을 Airbridge 표준 이벤트로

| 기존 제품 이벤트 | 조건 | Airbridge 카테고리 | 시맨틱 속성 |
|---|---|---|---|
| `entry_completed` | — | `airbridge.user.signup`(`AirbridgeCategory.SIGN_UP`) | 없음 |
| `messenger_unit_completed` | `entrySource === "journey"` | `airbridge.achieveLevel`(`ACHIEVE_LEVEL`) | `level` = `unitId` · `label` = `"messenger"` |
| `visual_novel_unit_completed` | `entrySource === "journey"` | `airbridge.achieveLevel` | `level` = `unitId` · `label` = `"visual_novel"` |
| 위 둘 | `entrySource === "roleplay"` | 보내지 않는다 | — |
| 그 밖의 이름 전부(27개) | — | 보내지 않는다 | — |

- 정본은 `apps/mobile/src/lib/airbridge-events.ts`의 `airbridgeEventFrom`과 타입 계약 `lib/airbridge-events.contract.ts`다. 이
  표가 코드와 다르면 코드가 옳다.
- `achieveLevel`: 0057이 고른 Meta `fb_mobile_level_achieved`와 같은 뜻의 Airbridge 표준이라 매체 쪽 매핑(Meta의 Achieve Level
  등)이 그대로 이어진다. `completeTutorial`은 「한 번 끝나는 튜토리얼」이라 유닛이 여럿인 구조와 맞지 않는다.
- 콘텐츠 종류는 `label`에 싣는다 — Airbridge 리포트의 GroupBy 축이라 대시보드에서 바로 나눠 볼 수 있다(`type`은 리포트 축이
  아니다).
- 커스텀 속성 · `action` · `value`를 쓰지 않는다. 사용자 ID · 이메일 · 전화번호 · 로그인 수단을 싣지 않고 `setUserID` ·
  `setUserEmail` · `setUserPhone`을 부르지 않는다.
- 와이어 값 넷(`airbridge.user.signup` · `airbridge.achieveLevel` · `level` · `label`)은 두 SDK의 상수와 같다 [실측 — Android JUnit
  `AirbridgeEventNamesTest`, iOS `AirbridgeEventsTests`의 N-I4]. SDK를 올려 상수가 바뀌면 이 두 테스트가 선다.
- 설치 · 앱 실행 · 세션은 앱이 내지 않는다 — SDK 자동 이벤트이고 이름은 SDK 소유다.

### D8. JS는 모듈 셋 — 0057 D7 유지, 이름만

`lib/airbridge-events.contract.ts`(타입만) · `lib/airbridge-events.ts`(순수 — 매핑 `airbridgeEventFrom`과 sink 합성
`withAirbridgeEvents`) · `lib/airbridge-events-module.ts`(**첫 줄 `import "background-only"`** — `NativeModules` 해석과 진입점
조립 `productEventSinks`). 0057의 셋을 `git mv`로 옮겨 이력을 이었다. 진입점 `app/index.tsx`의 결선 한 줄은 import 경로만 바뀌었다.

### D9. Airbridge 전달은 PostHog와 독립이다 — 0057 D8 유지

tracker가 있으면 `entryEventSink` · `messengerEventSink` · `visualNovelEventSink` 셋만 새 함수가 되고, ① 원래 sink ② tracker를
각각 `try`로 감싼다. **PostHog 키가 없어도 Airbridge는 동작한다.** `analytics.contract.ts` · `messenger.contract.ts` ·
`index.tsx`의 주석이 「Airbridge tracker」 · ADR-0063을 가리키도록 고쳐졌다.

### D10. Android `AD_ID` 권한은 포함한다 — 0057 D9 유지, 근거 갱신

- 일반판 `sdk-android`가 `AD_ID`를 병합으로 넣는다. 앱 매니페스트의 명시 한 줄은 유지했다(주석만 Airbridge로).
- 근거(갱신): Airbridge가 Meta · TikTok에 Android 설치를 귀속시키는 결정적 신호가 GAID다. Google Ads는 Play 설치 리퍼러로도
  잡히지만, Meta는 Meta Install Referrer(이번 범위 밖)가 없으면 GAID 매칭에 기댄다. 사용자에게 뜨는 팝업이 없다.
- 병합 매니페스트의 변화 [실측 — `bundled` 변형]: `ACCESS_ADSERVICES_*` 넷과 Facebook 로그인 토큰용 receiver 둘이 **빠졌다**
  (facebook-core가 넣던 것). `AD_ID` · `BIND_GET_INSTALL_REFERRER_SERVICE`는 **남는다**(Airbridge가 다시 넣는다). **새 권한은
  0이다.** `<queries>` 패키지 둘(`com.facebook.katana` · `com.instagram.android` — Meta On-Device Attribution용, 이름을 지정한
  조회라 Play의 「모든 패키지 조회」 정책 대상이 아니다)과 provider 하나(D5)가 새로 들어왔다.
- 앱 매니페스트에서 `FacebookInitProvider` 제거 선언 · `com.facebook.sdk.*` 메타데이터 둘 · 쓰는 곳이 없어진 `xmlns:tools`를
  지웠다.
- 뒤집는 법: 아티팩트를 `io.airbridge:sdk-android-restricted:4.11.3`(매니페스트에서 `AD_ID`만 빠진 변형)으로 바꾸고 앱 매니페스트의
  줄을 `tools:node="remove"`로. `host-airbridge-events.integration.test.mjs`의 I-S1이 서므로 함께 고친다.

### D11. 호스트 모듈은 메서드 하나 — 0057 D10 유지, 이름 · 모양만

`AirbridgeEventsModule.trackEvent(category: string, semanticAttributes: { [key: string]: string }): void` — SDK 메서드 이름과 같게
했다. 카테고리 허용 목록은 JS 매핑 하나뿐이다. 호스트는 받은 맵에서 **문자열 값만** 골라 SDK의 시맨틱 속성으로 넘기고, 맵이
비면 속성 없는 오버로드를 부른다. 응답 · 콜백이 없다. SDK를 직접 부르는 호스트 코드는 플랫폼마다 파일 하나
(`AirbridgeEvents.swift` · `AirbridgeEvents.java`)다.

[ADR-0017](0017-host-native-capabilities-and-audio.md) D1의 입장 조건을 그대로 통과시킨 모듈이 아니라는 0057 D10의 단서가 그대로
남는다 — 요구한 것이 화면이 아니라 광고 측정이다.

0057 리뷰가 남긴 「iOS SDK의 ObjC 예외를 Swift가 잡지 못한다」는 위험은 줄었다 — Airbridge는 Swift 모듈이고 `trackEvent`가
`throws`가 아니다. 다만 SDK 안의 실패는 여전히 어디에도 드러나지 않는다(「대가」).

### D12. Android 모듈 등록은 `AirbridgeEvents.configure(builder)` — 0057 D11 유지

`MainActivity`의 한 줄이 `AirbridgeEvents.configure(builder);`가 됐다. `registerModule` 호출은 `AirbridgeEvents.java` 안에 있고
`started()`일 때만 부른다. 그래서 HS2(`MainActivity`의 호출 11개)가 수정 없이 통과한다 — 가드의 숫자를 비켜 가는 방식이라는
0057의 단서가 그대로다(「사용자 확인 필요」 9).

iOS의 조건부 등록(`if AirbridgeEvents.isStarted { config.register(AirbridgeEventsModule.self) }`)은 이번에 정적 검사 I-S9와 런타임
테스트 N-I7이 지킨다(0057 리뷰의 남은 항목).

### D13. iOS `Info.plist` · 프라이버시 — 0057 D5 · D13을 바꾼다

- `Info.plist`에서 지웠다: `FacebookAppID` · `FacebookClientToken` · `FacebookDisplayName` · `FacebookAutoLogAppEventsEnabled` ·
  `FacebookAdvertiserIDCollectionEnabled` · **`SKAdNetworkItems` 전체**. 더했다: `AirbridgeAppName` · `AirbridgeSDKToken`(D3).
  `NSUserTrackingUsageDescription` 없음은 그대로다(plist · `INFOPLIST_KEY_*` 둘 다 — I-S4 · N-I6이 지킨다).
- **`SKAdNetworkItems`를 지운 이유 — 0057 D5의 근거 정정**: 그 키는 광고를 띄우는 앱(source app)의 설정이고 광고되는 앱에는
  필요 없다(맥락 2). Duru는 광고를 띄우지 않는다. 0057이 적은 두 식별자(`v9wttpbfk9` · `n38lu8286q`)는 Meta 개발자 문서에서도
  Audience Network(퍼블리셔) 절에 있다 — 값은 맞았고 무해했지만 이 앱에 둘 이유가 없었다. Airbridge 문서도 이 키를 요구하지
  않는다. SKAN 귀속은 SDK가 전환값을 갱신하는 것으로 충분하다(대시보드의 App Auth · 전환값 규칙이 전제 — 운영 안내).
- `NSAdvertisingAttributionReportEndpoint`(SKAN 포스트백 사본 수신)는 넣지 않는다 — 받을 서버가 없다.
- 앱 `PrivacyInfo.xcprivacy`는 **고치지 않았다** — `NSPrivacyTracking = false`와 0057이 더한 `DeveloperAdvertising` 목적(DeviceID ·
  ProductInteraction)은 Airbridge로도 그대로 맞다(광고 성과 측정).
- SDK 매니페스트는 SDK가 싣는다(restricted — tracking `false` · 추적 도메인 0 · DeviceID 등 다섯 항목 모두 `Tracking false`).
  자세한 대조는 [iOS 프라이버시 문서](../ios-privacy.md#airbridge-sdk와-추적-선언).
- AdServices는 pod의 `weak_frameworks`가 링크한다. 손으로 더한 것은 없다.

### D14. R8 규칙은 더하지 않는다 — 0057 D12 유지. 대신 출시 산출물 가드의 숫자가 바뀌었다

`proguard-rules.pro`는 9줄 그대로다(I4). 호스트 모듈은 Lynx AAR의 keep이, SDK는 자기 소비자 규칙이 지킨다. `:app:bundleRelease` ·
`:app:assembleBundled`(R8)가 규칙 추가 없이 통과했고 `Missing classes`는 없었다 [실측].

**새 대가: Airbridge의 소비자 규칙 `-keep class com.facebook.** { *; }`가 Fresco · SoLoader(같은 `com.facebook` 패키지) 전체를
축소에서 뺀다.** facebook-core의 소비자 규칙에는 그런 전체 keep이 없었다. 소비자 규칙을 앱에서 무효로 만들 수단은 AGP 8.9.2에서
확인하지 못했다. 그 결과 release AAB의 dex가 **3,211,016 → 4,116,320 bytes**(main 대비 +905,304)가 되어 가드 A3의 한도
4,000,000을 넘었다 [실측]. 구현을 멈추고 보고했고, **사용자가 한도를 4,300,000으로 올리는 것을 승인했다(2026-10-13).**

`devtools/android-bundle/release-shrink.artifacts.mjs`([ADR-0052](0052-android-release-shrinking.md) D5)에서 바뀐 숫자:

| 가드 | 전 | 지금 | 이유 |
|---|---|---|---|
| A1 release AAB의 ABI별 `.so` 개수 | 16 · 16 · 16 · 15 | **17 · 17 · 17 · 16** | `libairbridgelib.so`가 ABI마다 하나 |
| A3 dex 한도 | 4,000,000 | **4,300,000** | 위 — 사용자 승인 |
| A4 `@LynxMethod` 호스트 모듈 수 | 11 | **12** | **0057(#242)부터 틀려 있던 숫자다.** `MetaAppEventsModule`이 더해진 때 12가 됐어야 했다. 이 가드는 `pnpm verify` 밖이라(AAB가 필요하다) CI가 잡지 못했고, 이번에 처음 돌려 드러났다 |

다시 빌드한 산출물에서 A1 ~ A6 · A8이 통과했다. A7(기기별 다운로드 < 18,000,000)은 `BUNDLETOOL_JAR`가 없어 가드로는 건너뛰었고
(건너뜀은 통과로 세지 않는다), 구현 단계가 bundletool로 따로 잰 arm64 다운로드는 **17,077,710 → 17,359,578**(+281,868)이다 [실측].
같은 이유로 `native-alignment.artifacts.mjs` NA3의 64비트 `.so` 기대 개수를 **31 → 33**으로 고쳤다(arm64-v8a 17 + x86_64 16).
문서 단계가 NA3만 돌려 `checked 33, expected 31`(정렬 실패 0)을 찾았고, 숫자를 고친 뒤 같은 산출물에서 NA3이 통과했다 [실측].
이 가드도 `pnpm verify` 밖이다(A1 · A4와 같은 이유로 CI가 못 잡는다).

### D15. 이름은 공급자 이름으로 — `airbridge-events`

중립 이름(`ad-events` · `AdEventsModule`)을 쓰지 않는다. 경계를 넘는 값이 **Airbridge 고유**다(`airbridge.user.signup` 같은
카테고리 문자열, 시맨틱 속성 이름). 이름이 중립이면 「공급자를 바꿔도 JS는 그대로」라는 틀린 기대를 준다 — 이번 교체에서도 매핑
표 전체가 바뀌었다.

### D16. iOS 시작 자리 — `didFinishLaunching`의 첫 문장

`AppDelegate.application(_:didFinishLaunchingWithOptions:)`의 **첫 문장**이
`if let config = AirbridgeEventsConfig.fromBundle() { AirbridgeEvents.start(config) }`다. Airbridge 문서가 「맨 위」를 요구한다.
Android는 `DuruApplication.onCreate`의 끝(0057 자리)에서 `AirbridgeEvents.start(this, AirbridgeEventsConfig.from(...))`를 부른다.
I-S9가 iOS의 자리를 지킨다.

### 측정 — 무엇이 Airbridge에 찍히는가

| 알고 싶은 것 | Airbridge 이벤트 | 속성 | 발생 시점 | 내는 쪽 |
|---|---|---|---|---|
| 설치 | SDK 자동 「Install」 | SDK가 붙임 | 설치 뒤 첫 실행에서 `initializeSDK` | SDK |
| 앱 실행 | SDK 자동 「Open」 · 세션 | SDK가 붙임 | 전경 진입 · 세션 시작 | SDK |
| 가입 완료 | `airbridge.user.signup` | 없음 | 진입 흐름의 「여정 시작하기」(`entry_completed`와 같은 순간) | JS → `trackEvent` |
| 레슨 완료 | `airbridge.achieveLevel` | `level`(유닛 ID) · `label`(`messenger` \| `visual_novel`) | 여정의 메신저 유닛을 처음 끝낸 순간 · 여정의 비주얼 노벨 유닛이 끝난 순간 | JS → `trackEvent` |

매체별 귀속 · 설치당 비용은 Airbridge가 매체 연동과 비용 연동으로 계산한다 — 앱이 따로 내는 것은 없다. 그 연동은 사용자 몫이고
순서는 [운영 안내 「대시보드에서 할 일」](../airbridge-events.md#airbridge-대시보드에서-할-일)이 진다.

**할 일(저장소 밖)** — GitHub wiki 「[이벤트 사전](https://github.com/libitums/FE/wiki/Analytics-Events)」의 세 이벤트에 붙은
「Meta로도 전달」을 「Airbridge로 전달」과 카테고리 · 속성으로 바꾼다. [ADR-0029](0029-product-analytics-posthog.md) D1의 「같은
PR에서 wiki를 고친다」 규약이고 PR 작성자가 손으로 한다. 이 문서를 쓰는 시점에는 하지 않았다.

## 사용자 확인 필요

⚠ 아래 열일곱은 계약 단계가 고른 기본값이다. **아직 하나도 확인받지 않았다**(dex 한도는 따로 승인받았다 — D14). 확인되기
전까지 이 ADR은 `제안`이다.

1. ⚠ **iOS는 restricted SDK**(D6) — IDFA 코드가 아예 없다. 나중에 ATT를 열려면 pod 교체가 필요하다. 대안: 일반판 +
   `setTrackingBlocklist([.idfa])`(SDK 매니페스트가 tracking `true`를 선언하게 된다).
2. ⚠ **Android `AD_ID` 포함**(D10, 일반판). 대안: `sdk-android-restricted`(GAID 없음 — Meta · TikTok 귀속 약화). Play Console
   「광고 ID」 선언은 계속 「사용함」.
3. ⚠ 가입 완료 = `airbridge.user.signup`, 레슨 완료 = `airbridge.achieveLevel` + `level` · `label`(D7). 대안: `completeTutorial` ·
   커스텀 카테고리.
4. ⚠ 롤플레이(연습) 출처의 완료는 보내지 않는다(D7, 0057에서 이어짐).
5. ⚠ **가입 완료가 재로그인 · 재설치 뒤 로그인에도 난다**(0057에서 이어짐) — 한 번만 보내려면 저장소 키가 하나 필요하다.
   ⟨2026-10-18 적용 기록⟩ **서버 기록이 있는 계정은 더 나지 않는다** — 그 계정의 재로그인 · 재설치 뒤 로그인은 언어 선택 · 여정 입장을
   건너뛰고 맵에 들어가 `entry_completed`(→ `airbridge.user.signup`)가 나지 않는다([ADR-0069](0069-returning-learner-login.md) D6). 기록 없는 계정
   (처음 가입 · 기록 전에 떠난 계정)은 지금처럼 난다. **해석 단절은 2026-10-18 이 변경부터**다 — 가입 완료 수가 줄어 보이는 것은 정의 변경이다.
   새 이벤트 `entry_returning_learner_entered`는 Airbridge로 보내지 않는다(매핑 `null`). 저장소 키는 여전히 두지 않았다.
6. ⚠ 개인 식별 정보 미전송 · **`setUserID` 등 사용자 식별 기능 미사용**(D7) — 사용자가 명시한 것이 아니라 ATT 미사용 결정과
   같은 방향이라 고른 추론이다.
7. ⚠ **「레슨 완료」가 사용자당 최대 2회다**(0057에서 이어짐) — 넓히려면 새 제품 이벤트가 필요하다.
8. ⚠ PostHog 키가 없어도 Airbridge는 독립적으로 동작한다(D9).
9. ⚠ Android 모듈 등록을 `configure(builder)`로 돌려 HS2를 비켜 간다(D12). 대안: `MainActivity`에 직접 등록하고 HS2를 12로.
10. ⚠ release 빌드가 값 없이도 실패하지 않는다(D3). 대안: 스토어에 올릴 release는 값이 없으면 막는다.
11. ⚠ **`SKAdNetworkItems` 제거**(D13 — 0057 근거 정정).
12. ⚠ **Meta Install Referrer(Android) 미설정** — Meta 앱 ID와 대시보드 복호화 키가 필요하다. 넣으면 Android Meta 귀속이
    좋아지지만 앱 코드에 값이 하나 더 생긴다(범위 확장).
13. ⚠ **Android `AirbridgeLifecycleProvider` 유지**(D5) — 값이 없어도 프로세스 시작 때 수명주기 콜백 하나가 등록된다(요청은 0).
14. ⚠ `.gitignore` 넓은 패턴 둘(D3).
15. ⚠ **기존 가드의 숫자 수정** — A1(`.so` +1/ABI) · A4(11 → 12, 원래 틀려 있던 숫자)(D14). A3 한도 상향은 승인받았다.
16. ⚠ 번들 상한은 바꾸지 않았다 — 실측이 넘지 않았다(「실측」). 여유는 57 bytes다.
17. ⚠ App Name 형식 규칙 `^[A-Za-z0-9_-]+$`(D4) — 문서에 형식이 없어 고른 것이다. 실제 이름이 걸리면 규칙을 고친다.

## 실측 (2026-10-13)

| 항목 | 값 |
|---|---|
| `main.lynx.bundle` | 1,721,943 bytes — main(0057 뒤) 1,721,929 대비 **+14**. 상한 1,722,000(수정하지 않음)까지 **여유 57 bytes**. 최신 main(`e1e2ada2`)에 다시 얹은 뒤에는 1,903,483 / 1,905,000(여유 1,517 — 상한은 그 사이 main이 올렸다) |
| 번들 안 문자열 | `AirbridgeEventsModule` 1회 · `MetaAppEventsModule` 0회 · `airbridge.user.signup` 1회 · `airbridge.achieveLevel` 2회 · `fb_mobile` 0회 |
| iOS Release 시뮬레이터 `.app` | **50,512 KB**(값 없는 빌드). 0057 기록 63,064 KB · 0057 이전 기록 53,260 KB(「확인하지 못한 것」 7). Airbridge arm64 바이너리 2,909,200 B · 프레임워크 디렉터리 3,772 KB(구현 단계 측정). 시뮬레이터 `.app` 안의 `Frameworks/Airbridge.framework`는 5,732 KB다(시뮬레이터 슬라이스 — 문서 단계에서 같은 빌드를 다시 잼) |
| Android `app-bundled.apk` | 58,760,520 bytes — 구현 단계가 같은 조건으로 잰 main 대비 **+327,817**(0057이 PR 브랜치에서 적은 58,432,327과는 다른 빌드다) |
| release AAB dex | 3,211,016 → **4,116,320** bytes(한도 4,300,000 — D14) |
| 기기 다운로드(arm64, bundletool) | 17,077,710 → **17,359,578** bytes(한도 18,000,000) |
| release AAB `base/lib/` | 17 · 17 · 17 · 16 — 64비트 `.so` 33개, 16 KB 정렬 실패 0(`elf-page-alignment.mjs`) |
| 자동 테스트 | unit 1,914 · integration 537 · `pnpm test:android-bundle` 136(정적 검사 I-S1 ~ I-S9 포함) · iOS HostTests 73(skip 0) · Android JVM 19 클래스 80건 실패 0 · 계측 `AirbridgeEventsHostTest` 값 없음 / 가짜 값 둘 다 `OK (1 test)` · release-shrink A1 ~ A6 · A8 통과(A7 건너뜀) |
| 값 없는 빌드의 기기 확인(e2e A) | iOS 시뮬레이터(iOS 26.5, Release) · Android 에뮬레이터(Pixel_8 · API 37, `bundled`) — 실행 · 로그인 화면 · 재시작 정상, 새 팝업 0, Airbridge 연결 0, SDK 미시작, 크래시 0. 로그인 뒤 흐름은 수행하지 않았다 — [e2e 「A 결과 기록」](../e2e/airbridge-events.md#a-결과-기록) |
| 가짜 값 빌드(e2e B) | 두 플랫폼 SDK 시작 · `*.airbridge.io` 연결 관찰(iOS 실행 0.5초 안, ATT 대기 없음 · Android `initializeSDK` + `invalid SDK token` 응답), 새 팝업 0, 크래시 · ANR 0. 이벤트 전달(B-6)은 로그인이 필요해 미수행 — [e2e 「B 결과 기록」](../e2e/airbridge-events.md#b-결과-기록) |

성능 기록은 [Airbridge 앱 이벤트 번들 · 앱 용량](../performance/reports/airbridge-events-iphone-17-pro-simulator-01.md)에 있다
(번들 · 용량만, 실행 시간은 미측정).

## 확인하지 못한 것

1. **실제 App Name · App SDK Token으로 Airbridge가 이벤트를 받는 것.** Install · Open · 가입 완료 · 레슨 완료가 Real-time Logs에
   찍히는지, 매체별 설치 수 · 설치당 비용이 보이는지 한 번도 보지 않았다. 사용자가 값을 넣은 뒤
   [e2e 시나리오 C](../e2e/airbridge-events.md)로 본다.
2. **로그인 뒤 구간.** 가입 완료 · 유닛 완료에서 이벤트가 호스트 모듈을 지나 SDK까지 닿는 것을 기기에서 보지 않았다(e2e A · B 모두
   로그인 화면까지). JS → 모듈은 integration이, 모듈 → SDK의 이름 상수는 네이티브 테스트가 진다.
3. **값 없는 빌드의 「요청 0건」은 좁은 관찰이다.** 시뮬레이터 · 에뮬레이터 각 한 대, 실행부터 로그인 화면 · 재시작까지. 소켓은
   순간 관찰이고 Android는 누적 통계(netstats)를 쓰지 못했다 — logcat · 계측 · 순간 소켓의 조합이다. 실기는 보지 않았다.
4. **지연 딥링크 조회를 끄는 방법.** 값이 있는 빌드는 시작 때 그 요청을 낸다(D5). 딥링크를 쓰지 않는 앱이 이 요청을 막을 옵션이
   있는지 Airbridge 문서 · API에서 찾지 못했다.
5. **의존 해석의 최종 버전**(`kotlin-stdlib*` · `kotlinx-coroutines-*` · `play-services-*`). 빌드 · R8은 통과했으나
   `:app:dependencies`의 해석 결과를 기록하지 않았다.
6. **ADR-0046의 「64비트 `.so` 31개」 서술.** NA3은 33으로 고쳤고(D14) ADR-0052에는 적용 기록을 달았지만, ADR-0046 본문의
   그때 숫자는 역사 기록이라 고치지 않았다.
7. **iOS 앱 용량 비교의 조건.** Release 시뮬레이터 `.app` 50,512 KB가 0057 이전 기록 53,260 KB보다 **작다.** SDK가 하나 더 있는데
   작아진 까닭을 확인하지 않았다 — 두 값이 같은 조건(번들 · 빌드 설정 · 시점)의 빌드인지 대조하지 않았다. 기기용(App Store 슬라이스)
   크기도 재지 않았다.
8. **App Store · Play 심사 결과.** restricted SDK와 「추적 안 함」 응답의 조합, `AD_ID` 권한과 Play 선언의 조합이 통과하는지 모른다.
9. **인앱 구매 자동 추적의 기본값.** 젬 구매 화면이 코드에 있다(제품에서 열리지 않고 호스트에 결제 코드도 없다). 값이 있는 빌드에서
   SDK가 결제 관련 이벤트를 싣는지 보지 않았다.
10. **App Name 형식**(D4) — 실제 이름이 규칙에 맞는지 모른다.
11. **동적 프레임워크와 SDK 초기화가 앱 시작 시간에 주는 영향.** 재지 않았다.
12. **SDK가 Archive에 싣는 프라이버시 매니페스트**를 서명한 Archive · Privacy Report로 보지 않았다(배포물의 값만 읽었다).

## 버린 대안

| 대안 | 버린 이유 |
|---|---|
| Meta SDK를 두고 Airbridge를 함께 | 사용자 결정 「A — Meta SDK를 빼고 Airbridge만」. 두 SDK가 같은 설치를 각자 보내 매체 간 중복이 생긴다 |
| iOS 일반판 + `setTrackingBlocklist([.idfa])` | IDFA 미수집을 코드 한 줄이 지키게 된다. SDK 매니페스트가 tracking `true` · 추적 도메인 15개를 선언해 0057의 엇갈림이 남는다(D6) |
| Android `sdk-android-restricted` | GAID가 없으면 Meta · TikTok 귀속이 거칠어진다(D10). 대안으로 남겨 두었다(「사용자 확인 필요」 2) |
| `AirbridgeLifecycleProvider`를 `tools:node="remove"`로 | 초기화 · 네트워크를 하지 않는 provider다. 빼면 Open · 세션 이벤트의 대체 경로를 확인할 수 없다(D5) |
| `setAutoStartTrackingEnabled(false)` · `setSDKEnabled(false)`로 「값 없음」 표현 | 「값이 없으면 `initializeSDK` 자체를 부르지 않는다」가 더 강한 차단이다. 꺼진 채 초기화된 SDK도 SDK다 |
| 중립 이름(`ad-events`) | 경계를 넘는 값이 Airbridge 고유다(D15) |
| `io.airbridge`를 `google()` · `mavenCentral()` 뒤 일반 `maven {}`으로 | 제3자 저장소가 모든 그룹의 해석 후보가 된다(D2) |
| dex 가드를 그대로 두고 Fresco keep을 앱에서 되돌리기 | 소비자 규칙을 무효로 만들 수단을 AGP 8.9.2에서 찾지 못했다. 상한 상향을 사용자가 승인했다(D14) |

## 대가

1. **값이 없는 빌드에도 SDK가 실린다.** iOS 동적 프레임워크 하나(arm64 약 2.9 MB)가 실행 때 로드되고, Android에는 AAR ·
   `libairbridgelib.so` 넷 · 수명주기 provider · `<queries>` 둘 · `AD_ID` 권한이 값과 무관하게 실린다.
2. **Android 출시 dex가 약 0.9 MB 커졌다** — SDK 몫보다 Fresco · SoLoader가 축소되지 않은 몫이 크다(D14). 가드 한도 여유는
   183,680 bytes다.
3. **스토어 고지가 코드보다 먼저 바뀌어야 한다.** Play의 광고 ID 선언 · 데이터 보안 양식(공유 대상 Airbridge), App Store의 개인정보
   응답이 사용자 손에 있다.
4. **「레슨 완료」가 사용자당 최대 2회 · 「가입 완료」가 진입 흐름 완주다**(0057에서 이어짐).
5. **iOS는 IDFA 없이 센다** — 그리고 restricted라 나중에 ATT를 열어도 pod 교체가 필요하다.
6. **값이 있는 빌드는 쓰지 않는 지연 딥링크 조회를 낸다**(D5).
7. **값이 두 파일에 따로 있다.** 한쪽만 넣으면 그 플랫폼만 보낸다 — 빌드는 알려 주지 않는다. 형식이 틀리면 조용히 꺼진다.
8. **HS2가 Android 모듈 수를 더는 말하지 않는다**(D12).
9. **전달 실패는 어디에도 남지 않는다.** JS는 예외를 삼키고 호스트는 SDK에 맡긴다(의도).
10. **번들 상한 여유가 57 bytes다.**
11. **매체 연동이 앱 밖(대시보드)에 있다.** 앱 코드로는 연동이 맞는지 알 수 없다.

## 재검토 조건

- **「사용자 확인 필요」의 항목이 답을 받은 때** → 제자리에서 고치고 `채택`으로 올린다.
- **실제 값으로 첫 수신을 확인한 때**(e2e 시나리오 C) → 「확인하지 못한 것」 1 · 2 · 9 · 10을 결과로 바꾼다.
- **ATT 팝업을 열기로 한 때** → D6 · D13. pod을 일반판으로 바꾸고 `NSUserTrackingUsageDescription` · SDK 매니페스트의 tracking
  선언이 함께 바뀐다. 새 결정이다.
- **딥링크 · 지연 딥링크를 쓰기로 한 때** → D5. Associated Domains · URL scheme이 들어오고 지연 딥링크 조회가 「쓰는 요청」이 된다.
- **Meta Install Referrer를 넣기로 한 때** → D3에 세 번째 값이 생긴다.
- **Airbridge SDK를 올릴 때** → 와이어 이름 테스트 · 병합 매니페스트 · 소비자 R8 규칙(`com.facebook.**` keep이 그대로인지) · dex ·
  `.so` 개수 · SDK 프라이버시 매니페스트 · CocoaPods 배포 경로(D1)를 다시 본다.
- **Fresco를 올리거나 걷어 낼 때** → D14. dex 한도를 다시 잰다.
- **App Store 또는 Play 심사가 이 변경을 이유로 거절한 때** → D10 · D13.
- **`size:check`가 실패한 때** → 실측으로 상한을 올리고 「사용자 확인 필요」 16을 닫는다.
