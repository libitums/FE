# Android 오디오 재생 검증

> ⟨2026-10-21 — [ADR-0081](../adr/0081-tutorial-as-catalog-episode.md) D12 · D13⟩ **Maestro 흐름(`e2e/android-audio-playback.yaml` · `devtools/android-maestro/run-audio-playback.sh` · 루트 `test:e2e:android:audio`)은 지웠다** — 그 흐름이 열던 옛 튜토리얼 듣기 화면(`Listen to a Hello`)이 없다. 내장 음성은 **3개**(호스트 테스트 고정물 `greeting-1` · `ordering-2` · `tutorial-cabin-announcement`)만 남았고 제품이 쓰는 내장 음성은 0이다 — 아래 「21개」는 그때의 값이다. 계측(`AudioPlaybackModuleTest` — 목록은 그 셋) · 원격 재생 AP-R1 · AP-R2는 그대로 실행할 수 있다. 카탈로그 음성의 청음은 [에피소드 음성 e2e](episode-audio.md)가 진다.

> ⟨2026-10-22 — [ADR-0081](../adr/0081-item-audio-and-slow-playback.md)⟩ **메서드가 다섯이다** — `playAtRate(source, rate, done)`가 더해졌다(학습 듣기 문항의 「천천히」 0.85). 아래 「범위」의 넷과 같은 해석 · 대체 · `done` 한 번이고, `start()` 직후 `setPlaybackParams(speed, pitch 1)`로 음높이를 지킨다(1.0이면 부르지 않는다).
> 계측 AP-S1 ~ AP-S6 · JVM `AudioPlaybackRateTest`가 더해졌고, 아래 「원격 재생」의 AP-R1 「10초 안에」는 **40초**로 고쳤다(아래 「결과」 2026-10-21). 학습 문항의 에뮬레이터 청음은 [학습 문항 음성 e2e](item-audio.md) EU2다.

## 범위

`AudioPlaybackModule`은 기존 `apps/mobile/src/lib/audio.ts`의 `play(source, done)`,
`stop()`, `pause()`, `resume()`을 Android에 연결한다. Android 앱은 iOS의
`apps/ios/Host/audio/*.m4a` 21개를 APK 자산으로 동기화한다. `source`는 확장자와
경로가 없는 콘텐츠 ID이며 한 번에 하나만 재생한다.
⟨2026-10-14⟩ **`source`가 `https` 스킴에 호스트가 있는 절대 URL이면 원격이다** — `AudioRemoteSource`가 판정하고
`MediaPlayer.setDataSource(url)` → 같은 리스너 · `prepareAsync`로 재생한다(카탈로그 에피소드 음성, [ADR-0060](../adr/0060-episode-voice-remote-audio.md) D3).
그 밖의 `source`는 지금처럼 자산 경로로 간다. 원격 실패(닿지 않음 · 404 · 형식)는 `done` 한 번이다.

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
  libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner
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

원격 재생(2026-10-14 추가): JVM unit `AudioRemoteSourceTest`(원격 판정 — `testDebugUnitTest`에 포함)와 위 계측 클래스에 더한 두 건 —
**AP-R1** 닿지 않는 https(`https://127.0.0.1:9/a.m4a`)의 `done`이 10초 안에 정확히 1회 · **AP-R2** 같은 주소로 `play` 직후 `stop`이면 `done` 0회이고
다음 번들 `play`의 `done`은 정상 1회. 에뮬레이터에서 카탈로그 컷 · 최종 테스트를 듣는 절차는 [에피소드 음성 e2e](episode-audio.md)의 S1 ~ S4 · S9다.

속도 재생(2026-10-21 추가): JVM unit `AudioPlaybackRateTest`(정규화 — NaN · 무한 · 0.5 미만 · 2.0 초과는 1)와 같은 계측 클래스의 여섯 묶음 —
**AP-S1** 0.85가 1.0보다 길고(≥ 1.1배) `done` 한 번 · **AP-S2** 0.85 중 `stop`이면 `done` 0회, 1.0 재생이 0.85를 대체하면 옛 `done` 버림 · **AP-S3** 일시정지한 0.85는 `resume` 전까지 저절로 재생되지 않고 재개 뒤 끝남 ·
**AP-S4** 일시적 포커스 손실 동안 멈췄다가 복귀 뒤 0.85로 이어 끝남 · **AP-S5** 받아 둔 파일(`file://`)의 0.85 · 닿지 않는 https의 0.85가 `done` 한 번 · **AP-S6** 플레이어를 놓으면 기억한 속도가 1로 돌아가고 1.0 재생의 대체는 1.0으로 난다.
속도 설정이 실패하면 logcat `AudioPlayback`에 `W` `Cannot set playback speed`가 남고 1.0으로 계속한다.

## 결과

- 2026-10-02, Android 15 API 35 ARM 에뮬레이터, 390×844·160 dpi: 계측 10건과
  Maestro 1건 통과.
- 2026-10-05, Pixel_8 AVD API 37, 깨끗한 빌드(`clean`): 계측 11건(자산 열기 실패 시 경고 로그 1건 추가)과
  `SoundEffectsModuleTest` 5건이 통과. 포커스 손실 두 테스트는 고정 대기 대신 재생 시작을 기다린 뒤 손실을 보낸다.
- Maestro에서 맵 항목과 듣기 컨트롤은 화면에 표시됐으나 이 AOSP 에뮬레이터의
  Lynx 접근성 트리에는 나타나지 않았다. 그래서 맵과 컨트롤 탭은 고정 화면 크기의
  좌표를 쓰고, 화면은 기준 이미지로 비교한다. 이 현상은 별도 접근성 조사 대상이다.
- 2026-10-14 원격 재생: JVM unit(`AudioRemoteSourceTest`)은 통과했다. **계측 AP-R1 · AP-R2와 에뮬레이터 청음은 실행하지 않았다.**
- 2026-10-21, `feat/audio-slow-playback`(rebase 전 `962f6767`), API 35 에뮬레이터(`emulator-5556`), 러너 `libitum.duru.android.test`: JVM unit 통과 · 계측 `AudioPlaybackModuleTest` **22건 통과**(AP-R1 · AP-R2 · AP-S1 ~ AP-S6 포함 — 원격 둘이 처음 실제로 돌았다).
  같은 클래스의 앞 회차(`48ef6a1f`)에서 셋이 낡은 기대로 실패했다 — 자산 열기 실패의 로그 문구(ap2)와 닿지 않는 https의 대기(AP-R1 · AP-S5 — **MediaPlayer가 거부된 연결을 약 3초 간격으로 약 30초 다시 시도한 뒤** `done`이 온다). 기대를 고쳤다(대기 10 → 40초). 앱 쪽 흐름은 소리 결과를 읽지 않아 그 30초 동안 화면은 멈추지 않는다([ADR-0060](../adr/0060-episode-voice-remote-audio.md) D7).
  **에뮬레이터 청음(0.85의 음높이 · 일시정지 재개)은 하지 않았다** — [학습 문항 음성 e2e](item-audio.md) EU2.
- 실제 스피커에서 들리는 음질·음량과 오디오 포커스의 다른 앱 간 상호작용은
  자동 테스트로 판정하지 않았다. 실기에서 한 번 재생·중단을 들어 확인해야 한다.
