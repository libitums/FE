# Android 오디오 재생 검증

## 범위

`AudioPlaybackModule`은 기존 `apps/mobile/src/lib/audio.ts`의 `play(source, done)`,
`stop()`, `pause()`, `resume()`을 Android에 연결한다. Android 앱은 iOS의
`apps/ios/Host/audio/*.m4a` 21개를 APK 자산으로 동기화한다. `source`는 확장자와
경로가 없는 콘텐츠 ID이며 한 번에 하나만 재생한다.

⚠ **2026-10-05 전에는 이 동기화가 어떤 빌드에서도 실행되지 않았다.** `sourceSets.main.assets.srcDir(syncAudioAssets)`가
태스크 의존을 걸지 않아 `syncAudioAssets`가 태스크 그래프에 없었고, 생성 폴더가 남아 있던 기계에서만 자산이 우연히
들어갔다. 깨끗한 빌드의 APK · AAB에는 m4a가 0개였고, 재생은 `openFd` 실패를 로그 없이 「완료」로 처리해 화면만 진행됐다.
아래 계측 가운데 「재생 중」 상태를 만드는 4건(일시정지 · 중단 · 대체 · 일시적 포커스 손실)과 자산 열기 1건은 깨끗한
빌드에서 실패한다는 것이 `main`(`50c8ecbc`)에서 확인됐다 — 아래 2026-10-02 결과는 생성 폴더가 남은 환경이었다는 것 말고는
설명이 없다. 지금은 변형별 생성 소스로 결선되고 `assemble*` · `bundle*`이 산출물에 21개가 무압축으로 있는지 검사해
빠지면 빌드가 실패한다. 재생 실패는 logcat 태그 `AudioPlayback`의 `W`로 남는다. 결정과 근거는
[ADR-0045](../adr/0045-android-host-audio-assets.md), Play 배포 형태(AAB 분할 설치)의 확인은
[Android 효과음 · 대사 오디오 · 서사 배경](android-assets.md)의 E1 · E5다.

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
**Maestro는 호출 수만 센다** — logcat의 `AudioPlaybackModule.play…` 줄을 셀 뿐 플레이어가 실제로 생겼는지 보지 않는다. 자산이
없어도 통과하는 판정이라 위 결함을 잡지 못했다. 실제 재생은 위 계측과 `dumpsys audio`의 플레이어 기록(android-assets E5)이 진다.

## 결과

- 2026-10-02, Android 15 API 35 ARM 에뮬레이터, 390×844·160 dpi: 계측 10건과
  Maestro 1건 통과.
- 2026-10-05, Pixel_8 AVD API 37, 깨끗한 빌드(`clean`): 계측 11건(자산 열기 실패 시 경고 로그 1건 추가)과
  `SoundEffectsModuleTest` 5건이 통과. 포커스 손실 두 테스트는 고정 대기 대신 재생 시작을 기다린 뒤 손실을 보낸다.
- Maestro에서 맵 항목과 듣기 컨트롤은 화면에 표시됐으나 이 AOSP 에뮬레이터의
  Lynx 접근성 트리에는 나타나지 않았다. 그래서 맵과 컨트롤 탭은 고정 화면 크기의
  좌표를 쓰고, 화면은 기준 이미지로 비교한다. 이 현상은 별도 접근성 조사 대상이다.
- 실제 스피커에서 들리는 음질·음량과 오디오 포커스의 다른 앱 간 상호작용은
  자동 테스트로 판정하지 않았다. 실기에서 한 번 재생·중단을 들어 확인해야 한다.
