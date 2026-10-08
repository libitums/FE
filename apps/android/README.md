# Duru Android 최소 호스트

`apps/mobile`의 Lynx 번들을 Android `LynxView` 하나에서 실행한다. 지금은 이미지·HTTP
서비스, 입력·SVG·오버레이 요소와 `StorageModule`·`WebAuthenticationModule`·
`LegalDocumentModule`·`AudioPlaybackModule`·`SoundEffectsModule`·`CompletionAnnouncementModule`·
`SpeechRecognitionModule`·`HandwritingTraceModule`·`AppReviewModule`·`SystemBackModule`을
제공한다. 네이티브 기능 전체의
iOS 동등성은 아직 없다([ADR-0038](../../docs/adr/0038-android-minimal-host.md)).

## 시스템 뒤로가기

시스템 뒤로가기(제스처·3버튼)는 Activity를 바로 끝내지 않고 Lynx 화면에 먼저 묻는다
([ADR-0043](../../docs/adr/0043-android-system-back.md)). `MainActivity`가 누름마다
`systemBackPressed` 전역 이벤트를 보내고, JS가 `SystemBackModule.respond`로 답한다.

| 상황 | 동작 |
|---|---|
| 열린 확인창·시트·모달이 있다 | 그 층만 닫힌다 |
| 쌓인 화면 | 그 화면의 보이는 닫기를 누른 것과 같다 |
| 롤플레이·설정 탭 루트 | 여정 탭으로 간다 |
| 여정 맵, 뒤로 수단이 없는 화면 | 앱을 백그라운드로 보낸다(`moveTaskToBack`). 다시 열면 같은 화면이다 |
| JS가 500ms 안에 답하지 않는다 | 앱을 백그라운드로 보낸다 |
| JS가 아직 준비되지 않았다(번들 로드 전·로드 실패) | Activity를 끝낸다(`finish`) |

JS의 준비 신호(`SystemBackModule.ready`)는 에뮬레이터 실측에서 시작 뒤 약 2.2초에 왔다. 그 전의
뒤로가기는 앱을 끝낸다. 판정은 Android 의존이 없는 `SystemBackGate`가 하고 `MainActivity`는
실행만 한다. API 33 이상은 `OnBackInvokedCallback`, 26~32는 `onBackPressed()`를 쓴다.

3버튼 내비게이션에서 하단 탭 바가 시스템 내비게이션 버튼과 겹쳐 그려지던 문제는 해결됐다
([ADR-0044](../../docs/adr/0044-android-tappable-inset.md), 아래 「시스템 바와 safe area」).

## 시스템 바와 safe area

호스트는 LynxView를 시스템 바 뒤까지 전체 화면으로 그리고, inset이 바뀔 때마다 globalProps 두 키를
한 번의 `updateGlobalProps`로 넘긴다(`MainActivity.publishSafeAreaInsets`, 값이 같으면 보내지 않는다).

| 키 | 값 | 출처 |
|---|---|---|
| `safeAreaInsets` | `{ top, bottom, left, right }` dp — 가려지는 가장자리 | `systemBars() \| displayCutout()` |
| `tappableBottomInset` | dp — 시스템 바 가운데 **터치를 가로채는** 아래 높이. 3버튼에서만 0이 아니다(Pixel_8 48), 제스처는 0 | `tappableElement()`의 아래 값, `safeAreaInsets.bottom`을 넘지 않게 자른다 |

iOS 호스트는 `tappableBottomInset`을 보내지 않는다(JS가 0으로 읽는다). 앱 셸은 탭 루트에서 이 값만큼 아래를
비우고 탭 바 밑에 같은 색의 바닥 면을 덧댄다. 실행 중 모드를 바꾸면 재시작 없이 따라 바뀐다. 규칙과 근거는
[ADR-0044](../../docs/adr/0044-android-tappable-inset.md)에, 에뮬레이터 절차는
[Android 내비게이션 바와 하단 탭 바](../../docs/e2e/android-navigation-insets.md)에 있다.

## 준비

- Android Studio, Android SDK Platform 35와 Build Tools 35.0.0
- JDK 17 (Gradle 8.11.1 · Android Gradle Plugin 8.9.2)
- 저장소의 [첫 설정](../../docs/conventions/workflow.md#첫-설정) 및 `pnpm install`

`apps/android`를 Android Studio에서 열거나 이 디렉터리에서 `./gradlew`를 실행한다.
프로젝트는 pnpm workspace 멤버가 아니다.

## 개발 서버와 HMR

저장소 루트에서 `pnpm dev`를 실행하고 Android 에뮬레이터에 Debug APK를 설치한다.
기본 번들 URL은 `http://10.0.2.2:3000/main.lynx.bundle`이다. 개발 서버가 다른
포트를 선택하면 출력된 포트를 실행 인자로 지정한다. 실기기에서는 서버가 표시한 LAN
주소를 사용한다.

```sh
cd apps/android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.libitum.host/.MainActivity \
  --es bundle-url http://10.0.2.2:3001/main.lynx.bundle
```

Debug 호스트는 Rspeedy의 WebSocket 연결과 변경분 파일을 읽는다. `apps/mobile/src`를
수정하면 앱을 다시 실행하지 않고 화면에 반영된다. 로컬 HTTP는 Debug에만 허용한다.

## HTTP 미리보기로 실행

저장소 루트에서 `pnpm bundle:android`로 번들을 만든 뒤 `pnpm preview`를 실행한다.
Android 에뮬레이터에서 `./gradlew assembleDebug`로 만든 APK를 설치한다. 기본 번들 URL은
`http://10.0.2.2:3000/main.lynx.bundle`이다. 출력된 포트가 다르거나 실기기를 쓰면
URL을 실행 인자로 지정한다. `/static/` 이미지는 같은 서버에서 읽는다.

```sh
adb shell am start -n com.libitum.host/.MainActivity \
  --es bundle-url http://10.0.2.2:3001/main.lynx.bundle
```

실제 포트는 `pnpm preview` 출력에서 확인한다. 화면 수정 후에는 번들을 다시 빌드하고
앱을 재실행한다. 반복 개발에는 위의 `pnpm dev`를 사용한다.

## APK 자산으로 실행

저장소 루트에서 `pnpm bundle:android`를 실행한다. 이 명령은 UI package와 모바일
번들을 빌드한 뒤 `main.lynx.bundle` 및 `static/`을 Android assets로 복사한다.
`pnpm dev`가 같은 모바일 `dist`를 덮을 수 있으므로 복사를 따로 하지 않는다.

```sh
cd apps/android
./gradlew assembleBundled
adb install -r app/build/outputs/apk/bundled/app-bundled.apk
```

`bundled`는 로컬 검증용으로 Android 디버그 키로 서명한다. `assembleRelease`는 별도
서명 없이 배포용 산출물을 만들며, 이 단계에서 스토어 배포를 설정하지 않는다.
두 빌드 모두 복사된 Lynx 번들이 없으면 빌드를 중단한다.

## 확인

`PATH`에 JDK 17의 `javac`/`java`가 있을 때 `sh apps/android/test-host-paths.sh`를
저장소 루트에서 실행한다. 번들 복사는 `pnpm test:android-bundle`로 검증한다.
에뮬레이터를 실행한 상태에서 `apps/android/test-storage-restart.sh`를 실행하면
테스트용 세션의 저장·앱 프로세스 종료 후 복원·삭제 후 재시작을 확인한다. 실제
소셜 로그인과 서버의 토큰 갱신은 이 테스트에 포함되지 않는다.
전용 에뮬레이터에서 `E2E_UDID=<ID> sh apps/android/test-session-resume.sh`를
실행하면 모의 HTTPS 인증 응답으로 실제 Lynx 화면의 세션 갱신을 확인한다. 스크립트는
앱 데이터를 지우고 테스트용 설정으로 번들을 다시 빌드한 뒤, 서로 다른 앱 프로세스에서
세션 저장 → 갱신·여정 화면 → 재시작 후 재갱신·여정 화면 → 거부 시 세션 삭제·로그인
화면을 검증한다. 완료 후 일반 번들이 필요하면 `pnpm bundle:android`를 다시 실행한다.
`sh apps/android/test-web-auth-contract.sh`는 인증 URL·콜백 검증을, Android 계측
`WebAuthenticationModuleTest`는 난수와 잘못된 요청의 반환을 확인한다.
`LegalDocumentModuleTest`는 법률 문서 이름을 두 고정 HTTPS 주소로만 연결하는지 확인한다.
`AudioPlaybackModuleTest`는 공통 `.m4a` 자산 21개, 실제 재생 완료, 대체, 일시정지·재개,
중단·백그라운드 전환·오디오 포커스 손실과 복귀, 자산을 열지 못했을 때의 경고 로그를 확인한다.
`SoundEffectAssetTest`·`SoundEffectsSessionTest`(JUnit)는 효과음 id 8개와 `apps/ios/Host/sfx`의 1:1 대응, 로드 전 요청·벨
상태를, 계측 `SoundEffectsModuleTest`는 8개 자산 열기·벨 반복과 `stopRing`·`stopAll`을 확인한다.
오디오 자산(`apps/ios/Host/audio/*.m4a` 대사, `apps/ios/Host/sfx/*.mp3` 효과음)은 Android에 복사본을 두지 않는다. Gradle이 변형마다
`sync<Variant>HostAudioAssets`로 생성 소스 디렉터리에 옮겨 `assets/audio/`·`assets/sfx/`에 압축 없이 넣고, `assemble*`·`bundle*`이
`verify<Variant>ApkHostAudio`·`verify<Variant>BundleHostAudio`로 산출물을 검사해 원본과 다르거나 압축된 항목이 있으면 빌드를
실패시킨다. AAB 파일 안의 항목은 원래 전부 deflate로 보이며, 기기에 설치되는 분할 APK의 무압축은 AAB의 `BundleConfig` 무압축 글롭이
정한다. 2026-10-05 전의 결선은 태스크 의존을 걸지 않아 Android 빌드에 오디오가 0개였다
([ADR-0045](../../docs/adr/0045-android-host-audio-assets.md)). 결선이 되돌아가지 않았는지는 `pnpm test:android-bundle`이,
Gradle 산출물 자체는 `node --test devtools/android-bundle/packaged-assets.artifacts.mjs`(먼저 `./gradlew clean :app:assembleDebug
:app:assembleBundled :app:bundleRelease`)가 본다. 재생 실패는 logcat 태그 `AudioPlayback`(대사)·`SoundEffects`(효과음)의 `W`로 남는다.
효과음은 오디오 포커스를 요청하지 않고, 대사는 TalkBack 낭독 동안 멈췄다 이어진다 — iOS와의 차이는
[효과음 계약](../../docs/specs/ios-sound-effects.md#의도된-차이)에 있다. AAB 분할 설치로 소리·서사 배경 그림을 보는 에뮬레이터 절차는
[Android 효과음 · 대사 오디오 · 서사 배경](../../docs/e2e/android-assets.md)에 있다.
`CompletionAnnouncementModuleTest`는 완료 안내의 원문·콜백·실제 Android 접근성
공지 이벤트를 확인한다. 듣기 완료까지의 Maestro 절차는
[`docs/e2e/android-completion-announcement.md`](../../docs/e2e/android-completion-announcement.md)에 있다.
`SpeechRecognitionSessionTest`는 결과 한 번 반환과 입력 레벨 경계를,
`SpeechRecognitionModuleTest`는 권한·잘못된 인자·서비스 부재 페이로드를 확인한다.
말하기 화면의 마이크 권한 Maestro 절차는
[Android 음성 인식 검증](../../docs/e2e/android-speech-recognition.md)에 있다.
`HandwritingTraceMathTest`와 `HandwritingTraceModuleTest`는 안내 그림의 마스크 정렬,
팽창 판정, PNG와 채점 영역의 일치를 확인한다. 쓰기 화면의 터치·판정 Maestro 절차는
[Android 손글씨 검증](../../docs/e2e/android-handwriting-trace.md)에 있다.
`ReviewRequestGateTest`와 `AppReviewModuleTest`는 Play 리뷰 요청의 중복 방지,
`FakeReviewManager`를 통한 요청·실행 및 실패 후 재시도를 확인한다. 설문에서 호스트까지의
Maestro 절차는 [Android 평점 요청 검증](../../docs/e2e/android-app-review.md)에 있다.
`PushTokenCodecTest`와 `PushPermissionStateTest`는 FCM 저장 토큰과 권한 상태를,
`PushNotificationModuleTest`는 브리지·알림 채널·목적지 일회성 소비를 확인한다.
Maestro의 권한·설정·알림 탭 절차는
[Android 푸시 검증](../../docs/e2e/android-push-notifications.md)에 있다.
`SystemBackGateTest`는 시스템 뒤로가기의 판정을 확인한다. 준비 전 누름의 종료, 대기 중
재누름 무시, `handled`·`leave` 응답, 500ms 무응답과 모르는 응답의 처리가 대상이며
`./gradlew testDebugUnitTest`로 실행한다. 실제 Activity에서의 에뮬레이터 절차는
[Android 시스템 뒤로가기 검증](../../docs/e2e/android-system-back.md)에 있다.
`SafeAreaInsetsTest`는 가장자리 px → dp 변환과 `tappableBottomInset`(3버튼 48 · 제스처 0 ·
safe 아래 값으로 자르기 · 음수와 밀도 불명은 0)을 확인하며 같은 명령으로 실행한다. 3버튼 · 제스처 ·
실행 중 전환의 에뮬레이터 절차는 [Android 내비게이션 바와 하단 탭 바](../../docs/e2e/android-navigation-insets.md)에 있다.
기기 절차는 [`docs/e2e/android-host.md`](../../docs/e2e/android-host.md)에 있다.

## Maestro E2E

Maestro CLI와 전용 Android API 35 에뮬레이터를 준비한다. 흐름은 **세로 390×844,
160 dpi, 글자 배율 1.0** 기준이다. 에뮬레이터 크기를 확인하고 필요하면
아래처럼 맞춘다. 앱 상태를 지우므로 로그인된 기기에는 실행하지 않는다.

```sh
adb -s <전용 에뮬레이터 ID> shell wm size 390x844
adb -s <전용 에뮬레이터 ID> shell wm density 160
adb -s <전용 에뮬레이터 ID> shell settings put system font_scale 1.0

# 저장소 루트: 실제 제공자 설정 대신 모의 URL을 번들에 포함한다.
PUBLIC_SUPABASE_URL=https://example.invalid \
  PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
cd apps/android
./gradlew assembleBundled
adb -s <전용 에뮬레이터 ID> install -r app/build/outputs/apk/bundled/app-bundled.apk
cd ../..
E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android
```

`test:e2e:android:host`는 온보딩과 로그인 화면을, `test:e2e:android:social`은
Apple·Google·Facebook의 인증 URL·PKCE·모의 딥링크 복귀를 각각 확인한다.
`test:e2e:android:legal`은 로그인 화면의 두 법률 문서 링크가 정해진 주소를
Custom Tab으로 열고 뒤로가기로 앱에 복귀하는지 확인한다.
`E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:audio`는 모의 진행으로 듣기
화면을 열어 자동 재생·다시듣기·이탈 시 중단을 확인한다.
`E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:speech`는 모의 진행으로 말하기
화면을 열어 마이크 권한 요청과 인식 서비스가 없는 AOSP의 건너뛰기 안내를 확인한다.
`E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:handwriting`은 모의 진행으로
쓰기 화면을 열어 안내 PNG, 터치 획, 네이티브 판정과 결과 화면을 확인한다.
`E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:review`는 모의 완료 상태에서
에피소드 설문 5점을 골라 `AppReviewModule.requestReview` 호출 1회를 확인한다.
`E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:push`는 모의 로그인 상태에서
알림 권한 요청·시스템 설정·로컬 알림 탭 뒤 화면 이동을 확인한다.
`test:e2e:android:small`은 320×640에서 글자 배율 1.0·1.3을 각각 적용해
온보딩 세 단계의 고정 버튼과 소셜 로그인 화면을 비교한다. 실행 뒤 390×844·1.0으로
돌린다. 네 흐름은 버튼의 접근성 이름으로 선택한다. `test:e2e:android`는 이 네 명령을
순서대로 실행한다.
로그인 후 설정 화면의 320×640·글자 배율 1.0·1.3 및 법률 링크는
`E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:signed-in`으로 검사한다.
모의 세션과 계측 APK를 사용하는 이 흐름의 범위는
[설정 화면 검증](../../docs/e2e/android-signed-in-settings.md)에 적었다.
Google Play 이미지의 TalkBack 검증은 별도 명령
`E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:talkback`을 사용한다.
이 명령은 모의 인증 번들과 APK를 다시 빌드·설치한다. 관찰 결과와 남은 수동 검증은
[TalkBack 검증](../../docs/e2e/android-talkback.md)에 있다.
실제 제공자 계정으로 로그인하거나 세션을 갱신하지는 않는다. 결과와 남은 항목은
[호스트 흐름](../../docs/e2e/android-host.md)과
[소셜 로그인 흐름](../../docs/e2e/android-social-login.md)에 적는다.
실제 Supabase 설정과 Chrome이 있는 전용 Google Play 에뮬레이터에서는
`E2E_UDID=<ID> pnpm test:e2e:android:social:live`로 계정 입력 전 제공자 페이지까지
사전 검증한다. 현재 Apple은 서버의 OAuth secret 누락 오류로 실패한다.
모의 설정의 APK를 검증한 뒤 배포용 번들이 필요하면 실제 설정으로
`pnpm bundle:android`와 Gradle 빌드를 다시 실행한다.

## 소셜 로그인 설정

초기 심사 버전의 로그인 화면에는 Apple·Google·Facebook 버튼만 있다. 세 버튼 모두
Android에서는 Custom Tab의 Supabase OAuth + PKCE를 사용한다. 앱은
`duru://auth-callback` 딥링크를 받으며, 이 값을 Supabase Auth Redirect URLs에
허용해야 한다. Google·Facebook 제공자에는 Supabase의
`https://<project-ref>.supabase.co/auth/v1/callback`을 등록한다. Apple 웹 OAuth에는
Apple Services ID와 웹용 secret을 준비하고, Supabase Apple provider Client IDs에
Services ID를 맨 앞에 둔다. iOS 네이티브 App ID는 뒤에 둘 수 있다.
`PUBLIC_SUPABASE_URL`과 `PUBLIC_SUPABASE_ANON_KEY`를 번들 빌드 전에 주입한다.
설정과 계정이 없는 빌드에서는 실제 로그인·재시작 A3를 통과로 판정하지 않는다.
Apple 계정 삭제는 Android에서 웹 OAuth를 다시 열고 Supabase PKCE 교환 응답의
`provider_refresh_token`을 삭제 함수에 일회성으로 보낸다. 함수의
`APPLE_WEB_CLIENT_ID`가 Supabase Apple provider의 첫 번째 Services ID와 같아야 한다.
제공자 토큰이 없거나 재인증한 Supabase 사용자 ID가 다르면 삭제를 중단한다.
실제 Apple 왕복은 제공자 설정과 테스트 계정이 준비될 때까지 미검증이다.

## 푸시 알림 Firebase 설정

Android 호스트는 FCM SDK와 `duru-updates` 알림 채널을 포함한다. Firebase 프로젝트에 Android 앱 `com.libitum.host`를 등록한 뒤 받은 `google-services.json`을 `apps/android/app/`에 둔다. 이 로컬 파일은 Git에서 제외한다. 파일이 있으면 Gradle의 Google services 플러그인이 적용되고 SDK가 기본 Firebase 앱을 초기화한다. 파일이 없는 빌드는 권한·알림 화면 검증은 되지만 FCM 토큰을 반환하지 않아 서버 기기 등록은 하지 않는다.

서버에는 [FCM 전송 마이그레이션과 함수](../supabase-functions/README.md#android-fcm-확장-adr-0041)를 배포하고 `FIREBASE_SERVICE_ACCOUNT_JSON`을 Edge Function 시크릿으로 설정한다. 서비스 계정 키는 Android 앱이나 저장소에 넣지 않는다. 앱이 허용된 권한으로 열릴 때 현재 토큰을 읽어 기존 `register_push_device` RPC에 등록한다. FCM 토큰이 바뀌면 다음 앱 실행에서 다시 등록한다. 실제 원격 수신·백그라운드 탭은 서버 발송 인증이 준비될 때까지 미검증이다.

설정 파일의 `client_info.android_client_info.package_name`은 `com.libitum.host`여야 한다. Google Play 서비스를 포함한 전용 에뮬레이터에서 토큰 발급과 브리지 반환을 확인한다. 이 계측 테스트는 명시적으로 실행할 때만 네트워크를 사용하며 토큰 값을 출력하지 않는다.

```sh
ANDROID_HOME="$HOME/Library/Android/sdk" FCM_UDID=emulator-5554 ./apps/android/test-live-fcm-token.sh
```

2026-10-02에는 API 35 Google Play 에뮬레이터에서 1건 통과했다. 이 검증은 토큰 발급까지만 포함한다. 원격 발송과 알림 수신에는 같은 Firebase 프로젝트에 접근할 수 있는 서버 인증이 추가로 필요하다.
