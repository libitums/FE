# Duru Android 최소 호스트

`apps/mobile`의 Lynx 번들을 Android `LynxView` 하나에서 실행한다. 지금은 이미지·HTTP
서비스, 입력·SVG·오버레이 요소와 `StorageModule`·`WebAuthenticationModule`을 제공한다. 네이티브 기능 전체의
iOS 동등성은 아직 없다([ADR-0038](../../docs/adr/0038-android-minimal-host.md)).

## 준비

- Android Studio, Android SDK Platform 35와 Build Tools 35.0.0
- JDK 17 (Gradle 8.11.1 · Android Gradle Plugin 8.9.2)
- 저장소의 [첫 설정](../../docs/conventions/workflow.md#첫-설정) 및 `pnpm install`

`apps/android`를 Android Studio에서 열거나 이 디렉터리에서 `./gradlew`를 실행한다.
프로젝트는 pnpm workspace 멤버가 아니다.

## HTTP 미리보기로 실행

저장소 루트에서 `pnpm bundle:android`로 번들을 만든 뒤 `pnpm preview`를 실행한다.
Android 에뮬레이터에서 `./gradlew assembleDebug`로 만든 APK를 설치한다. 기본 번들 URL은
`http://10.0.2.2:3000/main.lynx.bundle`이다. 출력된 포트가 다르거나 실기기를 쓰면
URL을 실행 인자로 지정한다. `/static/` 이미지는 같은 서버에서 읽는다.

```sh
adb shell am start -n com.libitum.host/.MainActivity \
  --es bundle-url http://10.0.2.2:3001/main.lynx.bundle
```

Debug에만 로컬 HTTP를 허용한다. 실제 포트는 `pnpm preview` 출력에서 확인한다.
`pnpm dev`의 HMR 번들은 WebSocket 호스트 지원이 필요한데 이 최소 호스트에는 없으므로
현재는 미리보기 서버를 사용한다. 화면 수정 후에는 번들을 다시 빌드하고 앱을 재실행한다.

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
`sh apps/android/test-web-auth-contract.sh`는 인증 URL·콜백 검증을, Android 계측
`WebAuthenticationModuleTest`는 난수와 잘못된 요청의 반환을 확인한다.
기기 절차는 [`docs/e2e/android-host.md`](../../docs/e2e/android-host.md)에 있다.

## Maestro E2E

Maestro CLI와 전용 Android API 35 에뮬레이터를 준비한다. 흐름은 **세로 390×844,
160 dpi, 글자 배율 1.0** 기준이다. 에뮬레이터 크기를 확인하고 필요하면
`adb shell wm size 390x844`로 맞춘다. 앱 상태를 지우므로 로그인된 기기에는 실행하지
않는다.

```sh
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
실제 제공자 계정으로 로그인하거나 세션을 갱신하지는 않는다. 결과와 남은 항목은
[호스트 흐름](../../docs/e2e/android-host.md)과
[소셜 로그인 흐름](../../docs/e2e/android-social-login.md)에 적는다.
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
Apple 계정 삭제의 재인증은 아직 iOS `AppleSignInModule`에 묶여 있어 Android에서는
완료할 수 없다.
