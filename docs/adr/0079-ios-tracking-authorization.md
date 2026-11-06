# ADR-0079 — iOS 추적 허용(ATT)을 연다: Airbridge 일반판 SDK, 가입을 마친 뒤 여정 맵에 들어설 때 한 번 묻는다

- 상태: **채택 — iOS 호스트 · 클라이언트.** Android · 서버 변경 0.
  ⚠ **기기 확인은 일부다** — 2026-10-22 iPhone 13 mini · Release · 실제 값에서 맵 진입 때 요청 1회(콘솔)와 대화상자(사용자
  관찰)를 봤다. 진입 흐름 중 0회 · 다시 묻지 않음 · Real-time Logs의 Install · Open은 남았다
  ([e2e 시나리오 D](../e2e/airbridge-events.md#d--추적-허용att-대화상자-adr-0079)).
- 날짜: 2026-10-22.
- **사용자 결정**(2026-10-22): ATT를 **지금** 연다 · 묻는 때는 **가입을 마친 뒤 여정 맵에 들어설 때** · 문구는
  「Allow tracking so we can measure which ads helped you find Duru. We never sell your data.」 그대로.
- 대체하는 것: [ADR-0063](0063-airbridge-events.md) **D6**(restricted 변형 · ATT 없음 · IDFA 미수집)과 D13의 iOS SDK 매니페스트
  서술. 그 ADR의 「재검토 조건」 「ATT 팝업을 열기로 한 때 → 새 결정」이 발동했다. 나머지(값 주입 · 판정 · 매핑 · 모듈 등록 ·
  PostHog 독립 · Android 전부)는 그대로다.
- 다루지 않는 것: Android(광고 ID는 이미 일반판에서 설치 때 주어진다) · 대화상자 앞의 안내 화면(pre-prompt) · 거부한
  사용자에게 설정으로 보내기 · 추적 허용 여부의 측정 이벤트 · SKAN 전환값 설계(대시보드 몫).

근거 표시: **[코드]** 저장소 · **[조회]** 2026-10-22 배포물 · **[실측]** 이 저장소에서 빌드 · 테스트 · **[추정]** 관찰 없음.

## 맥락

1. **restricted 변형에는 IDFA · ATT 코드가 없다**(ADR-0063 D6). iOS 설치 귀속은 SKAdNetwork · Apple Ads · 비식별 매칭뿐이라
   Meta · TikTok의 iOS 성과가 거칠게 보인다.
2. **일반판 `airbridge-ios-sdk` 4.12.0**(CocoaPods trunk, 2026-10-22 최신) [조회]. 동적 xcframework, arm64 바이너리
   2,988,552 B(restricted 4.11.1은 2,909,200 B). AdSupport · AppTrackingTransparency · AdServices가 모두 **weak** 링크다.
   공개 API에 `Airbridge.trackingAuthorizationStatus()` · `Airbridge.requestTrackingAuthorization(completionHandler:)` ·
   `AirbridgeOptionBuilder.setAutoDetermineTrackingAuthorizationTimeout(second:)`가 있다.
3. **일반판 SDK 매니페스트**는 `NSPrivacyTracking = true` · 추적 도메인 **18개** · `DeviceID` tracking true를 선언한다 [조회].
4. **SDK는 설치 이벤트를 ATT 결정까지 기다린다** — 기본 30초 [조회 — Airbridge 문서]. 앱은 온보딩 · 로그인 · 프로필 ·
   언어 선택을 지난 뒤에야 맵에 들어서므로 30초면 대개 묻기 전에 끝나 IDFA 없이 설치가 나간다 [추정].
5. 시스템 대화상자는 **앱이 활성일 때만** 뜨고, 상태가 `notDetermined`가 아니면 다시 뜨지 않는다(Apple).

## 결정

### D1. iOS는 일반판 `airbridge-ios-sdk` 4.12.0 — 정확 버전, restricted와 함께 두지 않는다

`apps/ios/Podfile`의 한 줄을 `pod 'airbridge-ios-sdk', '4.12.0'`으로 바꿨다. lock에서 restricted가 빠졌다 [실측 — `pod install`].
정적 검사 I-S7이 「일반판 4.12.0 한 줄 · restricted 0」을 지킨다. Android는 이 결정 범위 밖이다 — 같은 날 ADR-0063 D1 적용 기록으로 4.12.0에 맞췄다.

### D2. 묻는 때 — 가입을 마친 뒤 여정 맵에 들어선 순간, 한 세션에 한 번

- JS: `AppSession`이 `useTrackingAuthorizationPrompt(진입 스택이 비었고 지금 화면이 journey-map)`을 부른다. 처음 참이 되는
  순간 `lib/tracking-authorization.ts`가 `NativeModules.AirbridgeEventsModule.requestTrackingAuthorization()`을 한 번 부른다.
  진입 흐름(온보딩 · 로그인 · 프로필 · 언어 선택) 중에는 부르지 않는다. 탭을 옮겼다 돌아와도 다시 부르지 않는다
  (`App.tracking-authorization.integration.test.tsx` TA1 ~ TA4).
- 기록 있는 계정이 바로 맵에 들어와도(ADR-0069) 같은 때 한 번 부른다 — 업데이트로 이 빌드를 처음 받은 기존 사용자도 한 번
  묻게 된다.
- 호스트: `AirbridgeEvents.requestTrackingAuthorizationIfUndetermined()` — SDK가 시작된 빌드에서만, 메인 큐에서,
  `trackingAuthorizationStatus() == .notDetermined`일 때만 SDK의 `requestTrackingAuthorization`을 부른다. 이미 정했으면
  아무것도 하지 않는다.
- 메서드가 없으면(Android · 값 없는 빌드) JS는 부르지 않고 아무 일도 없다. 호스트가 던져도 삼킨다(TR1 ~ TR3).
- 모듈을 새로 만들지 않고 `AirbridgeEventsModule`에 메서드를 더했다 — 묻는 이유가 Airbridge 측정 하나뿐이고, 값이 없어
  SDK가 서지 않은 빌드에서는 물을 까닭도 없다(모듈이 등록되지 않으니 자연히 묻지 않는다).

버린 대안: Airbridge 예제의 `didBecomeActiveNotification` 첫 활성(첫 실행 직후) — 가장 단순하지만 앱 가치를 보기 전이라
허용률이 낮다(사용자 결정으로 버림). 온보딩 끝 · 가입 화면 직전 — 같은 이유.

### D3. 설치 이벤트는 ATT 결정을 600초까지 기다린다

`setAutoDetermineTrackingAuthorizationTimeout(second: 600)`(`AirbridgeEvents.trackingAuthorizationTimeoutSeconds`, HostTests
N-I8). 온보딩 · 가입을 10분 안에 마치면 설치가 IDFA와 함께 나간다. 넘기면 IDFA 없이 나가고, 뒤의 이벤트는 허용 뒤
IDFA를 싣는다 [추정 — SDK 문서].
**대가**: 설치 이벤트가 최대 10분 늦게 보인다. 맵까지 오지 않고 떠난 사용자의 설치는 600초 뒤 또는 다음 실행에 나간다 [추정].
상한이 SDK에 있는지는 확인하지 못했다.

### D4. 문구 — `NSUserTrackingUsageDescription`

「Allow tracking so we can measure which ads helped you find Duru. We never sell your data.」(사용자 결정). `Info.plist`에만
한 번 둔다 — 빌드 설정 `INFOPLIST_KEY_`에 두 번 두지 않는다(I-S4). 앱 언어가 영어라 영어 한 줄이고, 지역화 문자열은 두지
않는다. 문구가 없으면 요청 순간 앱이 죽으므로 HostTests N-I9가 번들에서 읽어 본다.

### D5. 앱 프라이버시 매니페스트 — 추적한다로 바꾼다

`apps/ios/Host/PrivacyInfo.xcprivacy`의 `NSPrivacyTracking`을 `true`로, `DeviceID`의 tracking을 `true`로 바꿨다. 추적
도메인은 앱 매니페스트에 적지 않는다 — SDK 매니페스트가 18개를 선언하고, 앱이 SDK의 선언을 대신 적지 않는다는 원칙
([iOS 프라이버시](../ios-privacy.md#airbridge-sdk와-추적-선언))은 그대로다. 사용자가 허용하지 않으면 시스템이 그 도메인
연결을 막는다.

> ⟨2026-10-24⟩ **앱 매니페스트에도 추적 도메인 18개를 적는다.** 빌드 8 업로드가 ITMS-91064(「NSPrivacyTrackingDomains가
> 비어 있지 않은 경우 NSPrivacyTracking은 true여야 합니다」, 경로 `PrivacyInfo.xcprivacy` — 앱 매니페스트)로 거부됐다. 앱 매니페스트는
> `NSPrivacyTracking = true`에 도메인 키가 없었다. TN3181은 tracking true일 때 도메인 배열을 채우라고 한다. 그래서 SDK 매니페스트의
> 18개를 그대로 옮겼다 — 위 「앱이 SDK의 선언을 대신 적지 않는다」는 이 키에 한해 더는 따르지 않는다. SDK를 올리며 도메인이 바뀌면
> 두 곳을 함께 맞춘다.

## 대가

1. **App Store 개인정보 응답의 「추적」이 「예」가 된다** — 기기 ID(IDFA)를 광고 목적으로 매체 데이터와 잇는다. 공개
   개인정보처리방침의 「IDFA를 수집하지 않는다」 문장을 바꿔야 한다([iOS 프라이버시](../ios-privacy.md)).
2. **심사가 ATT를 본다** — 대화상자 앞에 허용을 유도하는 화면을 두지 않았고, 거부해도 기능이 같다.
3. iOS 앱이 SDK 바이너리 +79,352 B 커진다(arm64, 2,909,200 → 2,988,552).
4. 업데이트를 받은 기존 사용자에게도 맵에서 한 번 뜬다.

## 재검토 조건

- 허용률이 낮아 묻는 때를 바꾸고 싶을 때 → D2. 안내 화면(pre-prompt)은 새 결정이다.
- Android SDK를 4.12.x로 올릴 때 → 두 플랫폼 버전을 맞출지 함께 본다(ADR-0063 「재검토 조건」의 SDK 올리기 점검).
- 기기에서 600초 대기가 설치 이벤트를 잃게 하는 것이 보일 때 → D3.

## 적용 기록

결정을 바꾸지 않는다. 결정이 새 사례에 어떻게 걸렸는지만 적는다.

**2026-11-06 — App Store 심사 거절(Guideline 2.1, 1.0 (9), iOS 27.2 · iPhone 17 Pro Max): 「ATT 프레임워크를 쓰는데 권한 요청을 찾지 못했다」.**

- 심사 빌드에 D2의 코드는 들어 있다(`ae35307c` ⊂ 빌드 9 `fea1dff6`). 묻는 때는 D2 그대로 「가입 뒤 여정 맵 첫 진입」이다.
- **가장 유력한 원인 [추론]** — 재심사라 심사자는 첫 심사 때 만든 계정으로 **다시 로그인**했고, 기록 있는 계정은 바로 맵에 들어선다(ADR-0069).
  그 순간은 Apple 로그인 시트(`ASAuthorizationController` · `ASWebAuthenticationSession`)가 닫히는 중이라 앱이 **비활성**일 수 있고,
  iOS는 비활성 때의 `requestTrackingAuthorization`을 대화상자 없이 버리고 상태를 `notDetermined`로 둔다(맥락 5). JS는 한 세션에 한 번만 부르고(D2)
  호스트도 다시 묻지 않았으므로, 그 세션에서는 영영 뜨지 않았다. 다른 가능성: 심사 기기의 「앱이 추적을 요청하도록 허용」이 꺼져 있음(그러면
  코드로 할 것이 없고 녹화로 답한다) · 첫 심사 때 같은 기기에서 이미 답함.
- **호스트 보강(결정은 그대로)** — `AirbridgeEvents.requestTrackingAuthorizationIfUndetermined()`가 `UIApplication.shared.applicationState`를
  보고, 활성이 아니면 `didBecomeActiveNotification` 한 번을 기다렸다가 묻는다. 요청이 대화상자 없이 돌아와 상태가 `notDetermined`면 다음 활성화에
  다시 시도한다(상한 2회 — `trackingPromptMaxRetries`). 판정은 순수 함수 `trackingPromptStep(isStarted:isUndetermined:isActive:)`(HostTests N-I15).
  「앱이 추적을 요청하도록 허용」이 꺼진 기기는 요청 즉시 `denied`가 되어 재시도에 걸리지 않는다.
- **심사 답변** — Apple이 요구한 대로 실기 화면 녹화(새 설치 → 진입 흐름 → 맵 진입 때 대화상자 → 그 뒤 흐름)를 App Review Information의
  Notes에 붙인다. 절차는 [e2e 시나리오 D](../e2e/airbridge-events.md#d--추적-허용att-대화상자-adr-0079)의 D-6 · 「심사용 녹화」.
- 재검토 조건에 더한다: 같은 거절이 보강 뒤에도 오면 → D2의 「묻는 때」를 첫 활성(온보딩 첫 화면)으로 앞당기는 새 결정.
