# Duru Android 최소 호스트

`apps/mobile`의 Lynx 번들을 Android `LynxView` 하나에서 실행한다. 지금은 이미지·HTTP
서비스, 입력·SVG·오버레이 요소와 `StorageModule`만 제공한다. 네이티브 기능 전체의
iOS 동등성은 아직 없다([ADR-0037](../../docs/adr/0037-android-minimal-host.md)).

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
기기 절차는 [`docs/e2e/android-host.md`](../../docs/e2e/android-host.md)에 있다.
