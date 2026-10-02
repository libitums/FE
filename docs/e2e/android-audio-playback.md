# Android 오디오 재생 검증

## 범위

`AudioPlaybackModule`은 기존 `apps/mobile/src/lib/audio.ts`의 `play(source, done)`,
`stop()`, `pause()`, `resume()`을 Android에 연결한다. Android 앱은 iOS의
`apps/ios/Host/audio/*.m4a` 21개를 APK 자산으로 동기화한다. `source`는 확장자와
경로가 없는 콘텐츠 ID이며 한 번에 하나만 재생한다.

## 실행

JDK 17, Android SDK 35, API 35 전용 에뮬레이터를 준비한다.

```sh
cd apps/android
./gradlew :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb shell am instrument -w -e class com.libitum.host.AudioPlaybackModuleTest \
  com.libitum.host.test/androidx.test.runner.AndroidJUnitRunner
cd ../..
E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:audio
```

계측 테스트는 모든 자산의 `openFd` 성공, 재생 완료 한 번, 잘못된 ID의 완료,
대체된 재생의 콜백 폐기, 일시정지 후 이어듣기, 중단, 백그라운드 전환을 확인한다.
오디오 포커스를 일시적으로 잃으면 발화를 멈췄다가 포커스 복귀 시 잇고, 영구 손실
시에는 재생을 끝내 화면 조작을 초기화하는지도 확인한다.
Maestro는 모의 로그인과 진행을 주입해 `Listen to a Hello` 화면을 연다. 화면
스냅샷을 비교하고 자동 재생 1회·다시듣기 2회·학습 이탈 중단이 Lynx에서
Android 모듈로 호출됐는지 로그로 확인한다. 테스트는 앱 데이터를 지운다.

## 결과

- 2026-10-02, Android 15 API 35 ARM 에뮬레이터, 390×844·160 dpi: 계측 10건과
  Maestro 1건 통과.
- Maestro에서 맵 항목과 듣기 컨트롤은 화면에 표시됐으나 이 AOSP 에뮬레이터의
  Lynx 접근성 트리에는 나타나지 않았다. 그래서 맵과 컨트롤 탭은 고정 화면 크기의
  좌표를 쓰고, 화면은 기준 이미지로 비교한다. 이 현상은 별도 접근성 조사 대상이다.
- 실제 스피커에서 들리는 음질·음량과 오디오 포커스의 다른 앱 간 상호작용은
  자동 테스트로 판정하지 않았다. 실기에서 한 번 재생·중단을 들어 확인해야 한다.
