# ADR-0045 — Android 호스트의 오디오 자산 결선 · 효과음 · 서사 배경의 그림 애니메이션 자리

- 상태: **채택** — 에뮬레이터(Pixel_8 AVD · API 37)에서 Play 배포 형태(AAB → bundletool 분할 설치)로 실행했다(2026-10-05).
  ⚠ 실기 청음 · TalkBack을 켠 상태 · 「애니메이션 제거」는 확인하지 않았다(「확인한 것과 확인하지 못한 것」).
- 날짜: 2026-10-05
- 다루는 축: Android 빌드가 호스트 오디오 자산(`apps/ios/Host/{audio,sfx}`)을 산출물에 넣는 방식과 빠졌을 때의 실패 ·
  Android `SoundEffectsModule`의 오디오 포커스 · Android Lynx에서 그림(`<image>`)에 애니메이션을 거는 자리
- 이어받는 결정: [ADR-0038](0038-android-minimal-host.md)(Android 최소 호스트 — 이 ADR은 그 「후속 구현」이다),
  [ADR-0017](0017-host-native-capabilities-and-audio.md) D3(`AudioPlaybackModule`), [iOS 효과음 계약](../specs/ios-sound-effects.md)(JS 계약의 정본).
  **바꾸는 결정은 없다** — JS 공개 API(`lib/sound-effects.ts` · `lib/audio.ts` · `NarrativeBackgroundProps`) · iOS 호스트 · keyframes 값이 그대로다.

## 맥락

Play Console 비공개 테스트에 올린 AAB를 실기에서 열자 효과음 · 대사 오디오 · 서사 배경 그림이 모두 빠져 있었다. 에뮬레이터에서 원인 셋을
따로 확정했다(작업 `android-assets`의 진단). 아래는 그 진단에서 드러난 **사실**이고, 결정이 이것들 위에 선다.

1. **이 변경 이전의 모든 Android 빌드(APK · AAB)에 오디오 자산이 0개였다.** `build.gradle`의
   `sourceSets.main.assets.srcDir(syncAudioAssets)`는 AGP 8.9.2의 레거시 `sourceSets` API라 `TaskProvider`를 넘겨도 디렉터리 경로만 해석하고
   `merge<V>Assets`에 태스크 의존을 걸지 않는다. 그래서 `syncAudioAssets`는 어떤 빌드에서도 실행되지 않았다(`--dry-run` 어디에도 없음).
   손으로 먼저 돌리면 AAB에 m4a 21개가 들어갔다 — 경로 등록은 살아 있고 의존만 빠져 있었다. 생성 폴더가 남은 기계에서만 우연히 들어간다.
   업로드 AAB(`main` `50c8ecbc`), 이 브랜치의 `bundleRelease` AAB와 `assembleBundled` APK 모두 `assets/audio/` 0개였다.
2. **그래서 기존 오디오 계측 테스트 4건은 깨끗한 빌드에서 한 번도 통과한 적이 없었다.** `AudioPlaybackModuleTest`의
   `pauseKeepsCompletionForResume` · `stoppingAudioDiscardsCompletion` · `replacingAudioDiscardsOldCompletion` ·
   `transientFocusLossPausesSpeechUntilFocusReturns`는 실제 m4a를 「재생 중」으로 만든 뒤 단언한다. 자산이 없으면 `openFd`가 실패하고
   컨트롤러가 곧바로 완료 콜백을 불러 「완료되면 안 된다」가 깨진다. `main`(`50c8ecbc`)에서 `clean` 뒤 같은 4건과 자산 열기
   `allCurrentContentIdsOpenAsUncompressedAudioAssets`가 실패했다. [Android 오디오 검증](../e2e/android-audio-playback.md)의 2026-10-02
   「계측 10건 통과」는 생성 폴더가 남은 기계였다는 것 말고는 설명이 없다(그 환경은 다시 관찰하지 않았다).
3. **재생 실패가 조용했다.** `AudioPlaybackController`는 `openFd` 실패를 로그 없이 「재생 완료」로 처리했고, 화면은 정상 진행되며 소리만 없었다.
   기존 Maestro(`devtools/android-maestro/run-audio-playback.sh`)는 logcat의 JS → 네이티브 **호출 수**만 세서 이 결함을 잡지 못했다.
4. **AAB 안의 항목은 AGP가 전부 deflate로 저장한다.** 기기에 설치되는 분할 APK에서 무압축(`STORED`)인지는 AAB의 `BundleConfig.pb`
   무압축 글롭(`compression.uncompressed_glob`)이 정한다. 대조 실험에서 m4a 21개가 `splits/base-master.apk`에 `Stored`로 들어갔다.
   AAB 파일을 열어 `Defl:N`를 보고 「압축됐다」고 판정하면 틀린다.
5. **효과음 모듈은 iOS에만 있었다.** JS 래퍼가 모듈이 없으면 조용히 무동작해, Android는 logcat
   `try to find module: SoundEffectsModulefailed.` 한 줄만 남겼다.
6. **Android Lynx 4.0.1은 `<image>`에 직접 건 `transform` 키프레임 애니메이션 아래에서 그림을 그리지 않는다.** 그림 로드는 성공한다(`bindload`
   수신). 서사 배경이 단색 `#1b1613`만 보였다. 분리 실험: easing 변수를 `ease`로 바꿔도, 로딩 투명도를 빼도 안 보였고, 그림의 drift만 빼면
   (부모 `<view>`의 투명도 reveal은 남긴 채) 보였다. 같은 키프레임을 **감싸는 `<view>`** 에 걸자 그림이 보이고 확대도 돌았다(spike, 날개 끝
   y 393 → 383 → 370). Lynx 내부 원인은 확인하지 않았다 — 증상과 우회 조건만 확정이다.

## 결정

### D1. 자산은 변형별 생성 소스 디렉터리로 결선한다 — AGP Variant API `addGeneratedSourceDirectory`

- 원본은 `apps/ios/Host/audio/*.m4a`(대사)와 `apps/ios/Host/sfx/*.mp3`(효과음) **하나**다. Android 쪽에 복사본을 커밋하지 않는다.
- `apps/android/app/build.gradle`의 `androidComponents.onVariants(selector().all())`가 변형마다 `sync<Variant>HostAudioAssets`
  (`SyncHostAudioAssets` — 입력 두 디렉터리, 출력 `DirectoryProperty`, `fs.sync`로 낡은 파일까지 지운다)를 등록하고
  `variant.sources.assets.addGeneratedSourceDirectory(sync, { it.outputDir })`로 넘긴다. 산출물 안에서는 `assets/audio/` · `assets/sfx/`다.
- 생성 디렉터리를 `Provider`로 넘기면 그 디렉터리를 읽는 **모든** 소비자(merge assets · lint · bundle)에 태스크 의존이 따라붙는다.
  맥락 1의 결함(경로만 등록)을 구조로 없앤다. 변형별 태스크라 출력 위치를 AGP가 정해 서로 겹치지 않는다.
- `androidResources.noCompress += ['m4a', 'mp3']`. `openFd`는 무압축 자산만 연다. mp3는 AAPT2 기본 목록에 있어도 bundletool 설정까지 명시로 고정한다.

### D2. 산출물 자체를 검사해 빠지면 빌드가 실패한다

`apps/android/app/packaged-assets.gradle`(`build.gradle`이 `apply from`)이 변형마다 두 태스크를 단다. 기대 목록은 **실행 시점에 원본 디렉터리에서**
만들고, 원본이 비면 그 자체로 실패한다(빈 집합끼리 같아 통과하는 것을 막는다).

| 태스크 | 검사 대상 | 걸리는 곳 | 판정 |
|---|---|---|---|
| `verify<V>ApkHostAudio` | 그 변형의 `*.apk` 전부, 접두 `assets/` | `assemble<V>` | `audio/` · `sfx/` 항목 이름 집합이 원본과 같다(빠짐 · 남는 것 모두 실패) · 전부 `ZipEntry.STORED` |
| `verify<V>BundleHostAudio` | 그 변형의 `.aab`, 접두 `base/assets/` | `bundle<V>` | 이름 집합이 원본과 같다 · 전부 `BundleConfig.pb`의 무압축 글롭에 걸린다(맥락 4 — 항목의 deflate는 실패가 아니다) |

- 실패 메시지는 `Packaged host audio check failed for <파일>: missing [..], unexpected [..], compressed [..]`다.
- 빌드 앞단의 `verifyBundledAssets`도 원본에 m4a · mp3가 하나 이상 있는지 본다(`Host audio sources missing in apps/ios/Host/{audio,sfx}.`).
- `pnpm verify`는 Gradle을 돌리지 않으므로 `devtools/android-bundle/gradle-wiring.test.mjs`(`pnpm test:android-bundle`)가 `build.gradle` 본문을 읽어
  결선이 레거시 `srcDir`로 되돌아가지 않았는지 단언한다. 실제 산출물 검사는 `devtools/android-bundle/packaged-assets.artifacts.mjs`
  (Gradle 산출물이 필요해 `*.test.mjs` 글롭 밖 — 파일 머리의 명령으로 따로 돈다)와 위 두 태스크가 진다.
- 재생 실패는 조용하지 않다(맥락 3): `AudioPlaybackController`가 태그 `AudioPlayback`, `SoundEffectsController`가 태그 `SoundEffects`로 `Log.w`를 남긴다.

### D3. Android 효과음은 `SoundPool` + 벨 `MediaPlayer`이고 오디오 포커스를 요청하지 않는다

- `SoundEffectsModule`(`play(id)` · `stopRing()`)을 iOS와 같은 이름 · 같은 id 8개로 등록한다. 판정은 Android 의존이 없는 `SoundEffectAsset` ·
  `SoundEffectsSession`(JUnit)이, 재생은 `SoundEffectsController`가 한다 — 짧은 효과음 7개는 `SoundPool`(maxStreams 7), 반복하는
  `ring_bell`은 `MediaPlayer` `setLooping(true)`. `MainActivity.onStop`이 전부 멈추고 복귀 시 다시 울리지 않는다(iOS와 같다).
- **효과음은 오디오 포커스를 요청 · 포기하지 않는다.** 대사(`AudioPlaybackController`)가 `AUDIOFOCUS_GAIN_TRANSIENT`를 쥐고
  `LOSS_TRANSIENT_CAN_DUCK`에 멈추므로, 같은 앱의 효과음이 포커스를 요청하면 **대사가 멈춘다.** iOS 계약의 「효과음은 대사를 멈추지 않는다」를
  지키는 길이 이것 하나다.
- 이 선택이 만드는 iOS와의 차이(포커스 · 무음 스위치 · TalkBack 덕킹 · TalkBack과 대사)와 iOS 대조표는
  [효과음 계약의 「Android 호스트 이관」](../specs/ios-sound-effects.md#android-호스트-이관-2026-10-05)이 진다. 넷 다 **고치지 않고 기록한** 차이다.

### D4. Android에서 그림이 움직여야 하면 애니메이션은 `<image>`가 아니라 감싸는 `<view>`에 건다

서사 배경(`apps/mobile/src/screens/episode-narrative/NarrativeBackground.tsx`)은 그림을 `<view class="narrative-background-motion…">`로 감싸고,
그림에 걸던 다섯 클래스를 상자로 옮겼다(`-image-<프로필>` → `-motion-<프로필>`, 선언 · keyframes 값은 그대로). 그림 요소의 클래스는 언제나
`narrative-background-image` 하나다.

**새 화면이 지킬 규칙**

1. **`<image>`를 선택하는 규칙에 `animation`을 선언하지 않는다.** 확대 · 이동 · 투명도 모두 — 투명도만 따로 검증되지 않았으므로 같이 옮긴다.
   그림을 inset 0 `<view>`로 감싸고 그 상자에 건다.
2. 상자는 그림과 같은 상자(inset 0)여야 한다. 그러면 원점(중심) · `translate` 퍼센트의 기준 · `aspectFill` 잘림 · 바깥 `overflow: hidden` 클리핑이
   그림에 직접 걸 때와 같아 iOS의 보이는 결과가 바뀌지 않는다. 상자에 `overflow` · `transform-origin`을 따로 두지 않는다.
3. 클래스 이름이 그림을 가리키지 않게 한다(`-motion-*`). 이름이 그림을 가리키면 다음 사람이 다시 그림에 건다.
4. `ui` 계층은 계산된 스타일을 보지 못한다(ADR-0006 D4). 새 자리는 [Android 서사 배경 절차](../e2e/android-assets.md)의 E6처럼 에뮬레이터 스크린샷으로 본다.
   서사 배경은 `NarrativeBackground.ui.test.tsx` NB1이 「그림 클래스에 걸리는 `animation` 규칙 0」을 지킨다.

2026-10-05 기준 `apps/mobile/src` · `packages/ui-lynx/src` 전수 점검에서 `<image>`에 애니메이션을 건 자리는 서사 배경 하나였다
(`animation:`을 선언한 나머지 — `ui-lynx` `dialog` · `bottom-sheet` · `overlay` · `visual-novel-dialog` — 는 `<view>` 대상이다).

## 버린 대안

| 대안 | 버린 이유 |
|---|---|
| `preBuild.dependsOn syncAudioAssets` + 레거시 `srcDir` | 동작은 하지만 의존이 `preBuild`를 거치는 소비자에만 걸린다. 생성 경로만 등록하는 같은 함정이 남는다 |
| mp3를 `res/raw`로 복사 | 경로가 자산 · 리소스 둘로 갈리고 같은 복사 · 의존 문제가 리소스 쪽에 반복된다 |
| `apps/android`에 mp3 · m4a 커밋 | 단일 출처(`apps/ios/Host`)가 깨진다 |
| AAB 항목에 `STORED`를 요구 | 맥락 4 — AAB는 항목을 전부 deflate로 저장한다. 무압축은 `BundleConfig` 글롭이 정한다(처음 계약이 이렇게 틀렸고 구현 단계에서 정정했다) |
| 효과음도 포커스를 쥔다 | 대사가 `CAN_DUCK` 손실로 멈춘다(D3) |
| drift를 frame `<view>`에 쉼표 다중 `animation`으로 합친다 | reveal과 drift의 시간이 달라 한 요소에 두 애니메이션이 겹치고, 이전 그림(departing)에는 frame이 없어 어차피 상자가 필요하다 |

## 대가

- **Android 빌드가 iOS 디렉터리를 읽는다.** `apps/ios/Host/{audio,sfx}`의 파일 이름이 바뀌면 Android 산출물 검사도 따라 바뀐다(원본에서 읽으므로 고칠 곳은 없다).
- **효과음이 다른 앱 음악 위에서 섞여 난다**(포커스 미요청 — iOS 기본 카테고리는 끊는다). 짧은 소리라 끊는 쪽이 더 나쁘다고 봤다.
- **수신 벨이 TalkBack 낭독 동안 낮아지지 않는다**, **대사가 TalkBack 낭독 때마다 멈췄다 이어진다** — 효과음 계약의 Android 절이 적는다. 후속 판단 대상이다.
- **서사 배경 마크업에 상자가 둘 늘었다**(새 그림 상자 · 이전 그림 상자). iOS 영향 측정은
  [성능 보고서](../performance/reports/android-assets-narrative-background-iphone-17-pro-simulator-01.md)에 있다.
- **D4의 규칙은 증상 기반이다.** Lynx가 왜 그리지 않는지 모르므로, SDK를 올리면 이 규칙이 필요 없어졌는지 다시 볼 근거가 없다.

## 확인한 것과 확인하지 못한 것

| 무엇 | 상태 | 증거 |
|---|---|---|
| 분할 APK(base-master)에 m4a 21 · mp3 8이 전부 `Stored` · bundled APK 29개 | 에뮬레이터 통과(수정 전 업로드 AAB 0개) | [절차 문서](../e2e/android-assets.md) E1 |
| 효과음 id 8개가 iOS와 같은 조작에서 플레이어를 시작 · 벨 반복과 `stopRing` · 백그라운드 정지 | 에뮬레이터 통과(`dumpsys audio` 플레이어 기록 · logcat) | 같은 문서 E2 · E3 · E4 · E8, 계측 `SoundEffectsModuleTest` |
| 대사가 끝까지 재생된다 · 완료 콜백은 재생 뒤 | 에뮬레이터 통과 · 계측 | 같은 문서 E5, `AudioPlaybackModuleTest` |
| 효과음이 대사를 멈추지 않는다 | 간접 근거만(포커스 로그 0 · 겹친 대사가 자연 종료). 긴 대사 위 직접 대조는 못 함 | 같은 문서 E3 |
| 서사 배경 S1 ~ S4가 Android에서 그려지고 움직인다 | 에뮬레이터 통과(단색 → 그림) | 같은 문서 E6 |
| iOS 서사 배경이 그대로 보이고 움직인다 | 시뮬레이터 눈 확인(로컬 playground, S1 ~ S5) — 수정 전 iOS 스크린샷은 없다 | 같은 문서 E7 |
| **실기 스피커 청음 · 무음/진동 모드 · 다른 앱 음악과 섞임** | **확인하지 못했다** | — |
| **TalkBack을 켠 상태(대사 · 수신 벨)와 「애니메이션 제거」** | **실행하지 않았다** | 같은 문서 T1 ~ T3(미실행) |
| **16 KB · 4 KB 페이지 실기, 실기 GPU** | **확인하지 못했다** | — |

## 재검토 조건

- **Lynx Android SDK를 4.0.1에서 올리면** → D4. 그림에 직접 건 `transform` 애니메이션이 그려지는지 한 번 실험한다(진단의 분리 실험을 그대로).
  그려져도 규칙은 iOS 결과가 같으므로 남겨도 되지만, 이 ADR의 「사실 6」은 갱신한다.
- **AGP를 9 이상으로 올리거나 `addGeneratedSourceDirectory`의 시그니처가 바뀌면** → D1. `gradle-wiring.test.mjs`가 먼저 빨개진다.
- **TalkBack 실기 확인에서 벨이 낭독을 알아듣기 어렵게 가린다고 판정되면** → D3. 벨만 `AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK`을 쥐는 안(짧은 효과음은 그대로)을 본다.
  벨이 우는 동안 같은 앱의 대사가 재생 중이면 그 대사가 멈추므로, 앞 화면 대사가 확실히 멈췄는지를 먼저 확인한다.
- **오디오 자산이 원격에서 오게 되면**(ADR 추적표 「오디오 자산의 출처·형식」) → D1 · D2. 검사 대상이 번들 자산이 아니게 된다.
