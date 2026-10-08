# Android 출시 설정 (Play Console 앱에 맞춤 · 16 KB 페이지)

Android 출시 설정이 Play Console에 등록된 앱에 맞게 바뀌었는지를 **Play가 기기에 내려주는 것과 같은 형태**(AAB → bundletool 분할 설치)로 확인한다.
바뀐 것: 패키지 `com.libitum.host` → `libitum.duru.android`(Java `namespace`는 `com.libitum.host` 그대로) · `compileSdk`/`targetSdk` 36 · `versionCode` 2 ·
Lynx 4.0.1 · Fresco 2.3.0의 64비트 `.so`를 16 KB 정렬로 다시 빌드한 AAR(`apps/android/vendor-maven`) · 빌드 게이트(`native-alignment.gradle`).
순수 판정(ELF 정렬 · 낡은 패키지 참조) · 설정 값 · 산출물 정렬 · 계측은 `devtools/android-bundle/*.test.mjs`와 `apps/android/test`가 이미 진다.
이 문서는 **실제 패키지를 실제 기기에 설치했을 때만 보이는 것**(호환성 대화상자 · 앱 기동 · 콜백 · 회귀)과, 마지막에 **사용자가 직접 하는 서명 · Play 업로드 · 실기 확인(R9)**을 진다.
항목 정본은 작업 `android-release-config`의 계약(`spec.md`)과 test-plan `e2e`(R1 ~ R9)다.

| 항목 | 누가 | 무엇 |
|---|---|---|
| R1 ~ R8 | 에뮬레이터 | 아래 「전제」 ~ 「R8」 |
| R9 | **사용자** | 「R9 — 사용자 몫」 (서명 키 · Play Console 계정 · 실기가 필요하다) |

## 지금까지 실행된 것과 실행되지 않은 것 (2026-10-05)

에뮬레이터 Pixel_8 AVD(API 37 · Google Play 이미지 · `PAGE_SIZE` 16384) 하나에서 두 번 돌렸다. R1 · R2 · R3(로드 · FCM) · R5 · R7 · 계측은 `0acc4db0`에서, Maestro 전부와 R4는 골든 · 주소창 단언을 고친 `c5d38608`에서 다시 돌린 결과다
(두 커밋 사이 제품 코드 변경은 없다. `c5d38608`에서는 AAB를 새로 만들어 정렬과 `dumpsys package` 값을 다시 확인했다). 결정과 그 근거는 [ADR-0046](../adr/0046-android-play-release.md)에 있다.

| 항목 | 상태 | 비고 |
|---|---|---|
| R1 ~ R5 · R8(`speech` 제외) · R7(관찰) | 에뮬레이터 통과 | AAB `checked 31, failures 0` · 대화상자 0(기동 세 번) · `versionCode=2` · `targetSdk=36` · Maestro `host` · `social` · `legal` · `small` · `audio` · `signed-in` · `completion` · `handwriting` · `review` · 푸시 통과. 계측은 41건 가운데 40건 통과. 남은 한 건 `ButtonAccessibilityTest`는 그 일괄 실행에서 **실행 조건이 빠져** 실패했고(제품 결함이 아니다 — R8), 조건을 맞춰 따로 돌린 실행에서 `OK (1 test)`였다. `9b15f548`에서 R8의 계측 ①(이 테스트를 뺀 일괄)은 `OK (40 tests)`, 계측 ②는 `OK (1 test)`였다. R7은 관찰 기록(선택 창이 떴다)이고 통과/실패가 아니다 |
| **x86_64 재빌드 `.so` 10개** | **미실행 — 확인되지 않았다** | 어느 기기 · 에뮬레이터에서도 실행된 적 없다(검증 에뮬레이터는 arm64-v8a). 정적 정렬 검사만 통과 |
| **R6** — API 26 ~ 32 뒤로가기 · 4 KB 페이지 기기 | **API 30 에뮬레이터 하나에서 실행 — 그 범위만 통과** | 2026-10-05, API 30(Android 11) · 4 KB 페이지(`getconf PAGE_SIZE` 4096) · arm64 `google_apis` 에뮬레이터 · 3버튼 · `114099e3`에서 실행했다(AAB 분할 설치). 통과: 재빌드한 `.so`의 로드(로드 오류 0)와 온보딩 · Fresco 그림, `onBackPressed()` 경로(B2 · B5 · B6 · B7(b)), 3버튼 하단 겹침 없음(스크린샷 육안 — 수치 대조는 하지 않았다), 설치된 분할 APK의 오디오 자산 29개(m4a 21 · mp3 8, 무압축)와 효과음 호출 logcat, 계측 일괄 `OK (40 tests)`. **남은 미확인**: API 26 ~ 29 · 31 ~ 32, 제스처 모드, B3 · B4 · B7(a) · B8 · B9, 소리 청음(에뮬레이터를 `-no-audio`로 띄웠다), API 30에서의 `ButtonAccessibilityTest` · `test-session-resume.sh` · `test-storage-restart.sh`, 실기 4 KB 기기. 상세는 아래 R6 「실행 기록」 |
| **R9** — 업로드 키 서명 · Play 재업로드 · 실기 | **미실행 — 확인되지 않았다** | 사용자 몫이다. **Play가 이 브랜치의 AAB(versionCode 2)를 받는지**, 실기에서 소리 · 그림 · 탭 바 · 16 KB 경고 없음은 아직 아무도 보지 않았다. ⟨2026-10-07⟩ 실기의 스플래시 20회(확인 목록 j — **출시 조건**)도 아직 아무도 하지 않았다 |
| **R8의 `speech`** | **미실행 — 확인되지 않았다** | 실행기가 인식 서비스가 없는 AOSP 이미지를 요구한다. 이 절차의 에뮬레이터는 Google Play 이미지다 |

**위 세 줄은 통과가 아니다.** 이 문서를 근거로 「출시 설정이 검증됐다」고 말할 수 있는 범위는 16 KB 에뮬레이터 하나의 R1 ~ R5 · R7 · R8까지다.

## 이 절차로 확인하지 못하는 것

- **Play가 업로드를 받아 주는가**: 대상 API 요건 · 16 KB 검사 · versionCode 중복 · 서명 키 일치는 Play Console만 판정한다. R9에서 사용자가 본다.
- **업로드 키 서명**: 이 절차(R1 ~ R8)는 디버그 키로 재서명한 AAB를 쓴다. 업로드 키(`~/duru-upload.jks`)와 Play 앱 서명 키는 다루지 않는다.
- **실기 CPU · GPU · 스피커**: 재빌드한 `.so`가 실기 SoC에서 로드되는지, 소리가 실제로 들리는지, 서사 배경이 실기에서 그려지는지. 에뮬레이터는 소프트웨어 렌더링이다.
- **실제 소셜 로그인 · 서버 푸시**: R4는 `duru://auth-callback?code=fake` 인텐트가 새 패키지에 닿는지만 본다. 실제 OAuth · 운영 서버 계정 · 서버가 보내는 FCM 푸시(토큰 발급까지만 R3이 본다)는 범위 밖이다.
- **Play 배포 분할 구성 전부**: `build-apks --connected-device`가 에뮬레이터 하나에 맞춘 분할만 만든다. 다른 ABI · 밀도 · 언어의 분할은 보지 않는다.
- **API 26 ~ 32 · 4 KB 기기 전부**: R6은 2026-10-05에 API 30 에뮬레이터 하나에서만 돌았다. API 26 ~ 29 · 31 ~ 32와 실기 4 KB 기기는 **확인되지 않은 것**이다. 다시 돌릴 때 해당 AVD가 없으면 R6은 「미실행」으로 남긴다.
- **TalkBack · 접근성 서비스를 켠 상태**, 사람 귀로 듣는 청음(R5의 소리는 `dumpsys audio`와 logcat으로 판정).
- **실기 TalkBack의 음성 출력 · 스와이프 초점 순서 · 완료 안내가 실제로 들리는지, 스위치 제어 · 음성 액세스**: 에뮬레이터에서 TalkBack 서비스가 붙은 상태의 노드 노출 · 접근성 클릭 · `TYPE_ANNOUNCEMENT` 이벤트까지만 계측으로 본다(R8의 `ButtonAccessibilityTest`). 온보딩 · 로그인 화면 밖은 TalkBack을 켠 채 보지 않았다.
- **옛 패키지와의 공존 중 소셜 로그인**: R7은 선택 창이 뜨는 것을 관찰만 한다(통과/실패 아님).

## 전제

1. **에뮬레이터 Pixel_8 AVD(API 37 · Google Play 이미지 · 16 KB 페이지)**. 전용 에뮬레이터를 쓴다(`pm clear` · 재설치를 한다).
2. JDK 17 이상, Android SDK(`platforms;android-36` · `build-tools;36.0.0` 설치), `ANDROID_HOME`, `python3`, `pnpm` 의존 설치 완료.
3. **`apps/android/app/google-services.json` — 추적하지 않는 파일이다**(`.gitignore`). 저장소에 없다. Firebase 콘솔(프로젝트 `duru-2eaed` → Android 앱 `libitum.duru.android`)에서 내려받은 파일을 둔다.
   사용자의 `~/Downloads/google-services.json`이 그 파일이면 `cp ~/Downloads/google-services.json apps/android/app/`. **워크트리마다 필요하다.**
   없으면 `bundleRelease`가 `Release build needs apps/android/app/google-services.json for libitum.duru.android …`로 멈춘다(의도된 게이트 — 이 메시지가 나오면 R1 ~ R8은 시작하지 않는다).
   파일에 `libitum.duru.android` client가 없으면 google-services 플러그인이 `No matching client found for package name`으로 멈춘다(옛 파일). 확인:
   ```sh
   python3 -c "import json;print([c['client_info']['android_client_info']['package_name'] for c in json.load(open('apps/android/app/google-services.json'))['client']])"
   # ['libitum.duru.android'] 가 나와야 한다
   ```
4. **bundletool** — `bundletool-all-<버전>.jar`(https://github.com/google/bundletool/releases). 선례 문서는 1.17.2를 썼다.
5. **16 KB 기기 확인**: `adb shell getconf PAGE_SIZE`가 **`16384`**여야 R1 ~ R5 · R7 · R8이 의미가 있다. `4096`이면 그 기기는 R6 용이다.
6. **옛 `com.libitum.host`를 지운다**(R7 전까지): 둘이 함께 설치되면 `duru://auth-callback`에 앱 선택 창이 떠 R4 · R8이 흔들린다.
   **R8에서 실제로 난 모양**(2026-10-07, API 37 — 옛 앱이 남아 있던 에뮬레이터): 계측 ①에서 `WebAuthenticationFlowTest#registeredDeepLinkCompletesActiveBrowserRequestOnce` 1건이 실패하고(47건 가운데 통과 43 · 건너뜀 3 · 실패 1),
   `SignedInScreenFixtureTest`가 선택 창과 겹쳐 `Process crashed`로 끝났다. **제품 회귀가 아니라 이 전제의 누락이다.** 그래서 R7을 돌았다면 그 절의 4번(제거)까지 끝내고 R8로 간다.
   지울 수 없는 기기면 `pm disable-user`로 옛 앱을 꺼 두고 끝난 뒤 `pm enable`로 되돌려도 된다 — 그렇게 끈 상태에서 그 1건은 `OK (1 test)`, 계측 ①은 `OK (47 tests)`였다.
7. **화면 설정은 구간마다 다르다 — 쓰고 나면 되돌린다.** 좌표는 이 문서에 쓰지 않는다 — 위치는 스크린샷(`shot`)으로 잡는다.

   | 구간 | `wm size` · `wm density` | 내비게이션 | 글자 배율 |
   |---|---|---|---|
   | R1 ~ R4(수동 절차) · R7 | 기본값(`wm size reset` · `wm density reset`) | 제스처(기본) | 1.0 |
   | R5 ② (참조 문서 [android-navigation-insets.md](android-navigation-insets.md)) | `390x844` · `160`으로 바꾸고 끝나면 reset | 3버튼 → 끝나면 제스처 | 1.0 |
   | R8 Maestro(R4의 Maestro `social` 포함) | **`host` · `social` · `legal`은 해상도를 바꾸지 않는다 — 돌리기 전에 직접 `390x844` · `160`으로 맞춘다**(아래). 나머지 실행기(`small` · `audio` · `signed-in` · `review` · `completion` · `handwriting` · `speech` · 푸시)는 스스로 바꾼다(`390x844` · `160`, `small` · `signed-in`은 `320x640` · `160`에 글자 배율 1.0 · 1.3). 끝나도 `390x844` · `160`에 남는다 | **3버튼이어야 한다**(골든이 3버튼 모드에서 찍혔다 — 제스처 모드면 하단 48px이 달라 임계 미달이 난다). 실행기는 이 모드를 바꾸지 않는다 | `host` · `social` · `legal`은 직접 1.0으로, 나머지는 실행기가 1.0으로 맞춘다 |

   **`pnpm test:e2e:android`의 첫 흐름 `host`는 `maestro … test e2e/android-host.yaml`을 직접 부를 뿐 `wm size`를 건드리지 않는다**(`social` · `legal`의 실행기도 같다).
   기본 해상도(1080x2400)에서 돌리면 `android-login-390x844` 골든 비교가 `Screenshot size mismatch … expected 390x844, actual 1080x2400`으로 실패한다 — 제품 회귀가 아니라 준비 누락이다. `host`(또는 `social` · `legal` 단독)를 돌리기 **전에**:

   ```sh
   A shell wm size 390x844
   A shell wm density 160
   A shell settings put system font_scale 1.0
   ```

   R8이 끝나면 `A shell wm size reset` · `A shell wm density reset` · `settings put system font_scale 1.0` · 제스처 모드(`cmd overlay enable com.android.internal.systemui.navbar.gestural`)로 되돌린다. 3버튼 전환과 확인(`settings get secure navigation_mode` = `0`)은 R5 ②의 방법과 같다.
8. **시각은 이력으로 판정한다.** 에뮬레이터가 바쁘면 `dumpsys`와 `screencap`이 수 초 걸린다. 소리는 `events`의 `player piid:<N> event:started|stopped` 줄과 logcat으로 본다. **API 30 에뮬레이터의 `dumpsys audio` 출력에는 이 이력이 없었다**(`AudioPlaybackConfiguration piid:… state:idle` 목록만 나왔다 — Android 버전에 따른 출력 형식 차이로 **추정**한다). 그 경우 logcat(`SoundEffectsModule.play.<id>` · `SoundEffectsModulefailed` 0)으로 판정한다.
9. **빌드한 SHA를 결과 표에 적는다**(`git rev-parse HEAD`).
10. **`adb` 호출은 함수 `A`로 한다**(아래 블록). 2026-10-05의 실행들은 문자열 변수 형태(`A="$ADB -s $E2E_UDID"; $A shell …`)를 bash에서 썼는데, 그 형태는 zsh(macOS 기본 셸)에서 `command not found`로 실패한다. 이 문서의 명령 블록은 그 뒤 함수 형태로 고쳐 적은 것이고 **고쳐 적은 형태는 `bash -n` · `zsh -n` 문법 검사만 했다 — 기기에서 다시 돌리지 않았다.** [시스템 뒤로가기](android-system-back.md) · [내비게이션 바](android-navigation-insets.md) · [효과음 · 대사 · 서사 배경](android-assets.md) 절차의 블록도 같다.

```sh
export E2E_UDID=emulator-5554          # adb devices 로 확인한 전용 에뮬레이터 ID
export ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
A() { "$ADB" -s "$E2E_UDID" "$@"; }   # 함수다 — `A shell …`로 부른다. 문자열 변수(`A="adb -s …"; A shell …`)는 zsh에서 command not found가 난다
export BUNDLETOOL_JAR=$HOME/tools/bundletool-all-1.17.2.jar     # 둔 자리에 맞춘다
export BT="${ANDROID_HOME:-$HOME/Library/Android/sdk}/build-tools/36.0.0"
export PKG=libitum.duru.android
export ACT=libitum.duru.android/com.libitum.host.MainActivity   # 완전한 클래스 이름. '/.MainActivity'는 없는 클래스다
export OUT=.agent-harness/work/android-release-config/artifacts/e2e && mkdir -p "$OUT"
shot() { A exec-out screencap -p > "$OUT/$1.png"; }
dumpui() { A shell uiautomator dump /sdcard/ui.xml >/dev/null && A exec-out cat /sdcard/ui.xml > "$OUT/$1.xml"; }

A shell getconf PAGE_SIZE            # 16384
A uninstall com.libitum.host         # 옛 앱이 없으면 Failure [DELETE_FAILED_INTERNAL_ERROR] — 무시
A uninstall $PKG                     # 이전 시도의 설치를 지운다(같은 디버그 키라 생략해도 덮어쓴다)
```

### AAB 만들고 분할 설치

`bundleRelease`의 산출물은 **서명이 없다**(계약 §4). bundletool이 디버그 키로 서명한다.

```sh
# 1) 번들 — 모의 값으로 만든다(실제 서버 주소가 번들에 들어가지 않게)
PUBLIC_SUPABASE_URL=https://example.invalid PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
# 2) AAB — 서명 없음. 16 KB 정렬 게이트(verifyReleaseBundleNativeAlignment)와 Firebase 검사가 이 단계에서 돈다
cd apps/android && ./gradlew clean bundleRelease && cd ../..
AAB=apps/android/app/build/outputs/bundle/release/app-release.aab
# 3) 연결된 기기에 맞는 분할로 .apks 만들기 — 디버그 키로 서명
rm -f "$OUT/release.apks"
java -jar "$BUNDLETOOL_JAR" build-apks --bundle="$AAB" --output="$OUT/release.apks" --connected-device --device-id="$E2E_UDID" \
  --ks ~/.android/debug.keystore --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android
# 4) 설치
java -jar "$BUNDLETOOL_JAR" install-apks --apks="$OUT/release.apks" --device-id="$E2E_UDID"
```

빌드가 `Native 16 KB page alignment check failed for …`로 실패하면 그 메시지를 결과 표에 적고 R1을 **실패**로 둔다(재빌드 AAR이 정렬을 못 맞췄다는 뜻 — 구현이 아니라 계약 §5로 되돌린다).
다른 실패(`Packaged host audio check failed …` 등)는 메시지를 적고 멈춘다.

### 로그인 뒤 화면 (R5에서만)

R5 ①②③은 로그인 뒤 화면이 필요하다. [Android 시스템 뒤로가기](android-system-back.md)의 「앱 구간 진입 (로그인 없이)」(`SignedInScreenFixtureTest` + 계측 APK + 로컬 번들 서버)을 따른다.
**패키지 · 러너만 다르다**: 앱 `libitum.duru.android`, 계측 `libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner`, 클래스는 `-e class com.libitum.host.SignedInScreenFixtureTest`(Java 클래스 이름은 그대로).
AAB 설치의 앱도 같은 디버그 키라 같은 패키지의 계측 APK를 붙일 수 있다.

## R1 — 16 KB 호환성 대화상자 없음 · 64비트 `.so` 정렬

**왜**: 수정 전 빌드는 16 KB 기기에서 프로세스가 새로 뜰 때마다 「Android App Compatibility」 대화상자를 띄웠다. 판정은 LOAD 정렬만이 아니라 `GNU_RELRO` 끝 정렬까지 본다(계약 §5.1).

1. **패키지 안 정렬(CLI, 기기 불필요)**:
   ```sh
   node devtools/android-bundle/elf-page-alignment.mjs "$AAB"
   # 기대: <aab>: checked 31, failures 0 — 종료 코드 0  (arm64-v8a 16 + x86_64 15. 아래 숫자가 다르면 결과 표에 적는다)
   unzip -Z1 "$AAB" | grep -E '^base/lib/(arm64-v8a|x86_64)/.*\.so$' | wc -l      # 위 checked와 같다
   unzip -Z1 "$AAB" | grep -c libwasm                                             # 0 (primjsWasm 제외)
   ```
   `checked 0` 또는 종료 코드 1이면 실패다. 재빌드 AAR 자체: `node devtools/android-bundle/elf-page-alignment.mjs $(find apps/android/vendor-maven -name '*.aar')` → 종료 코드 0.
   **산출물 테스트(Node, 기기 불필요)** — `pnpm verify`의 `*.test.mjs` 글롭 밖이라 따로 돌린다. 저장소 루트에서:
   ```sh
   pnpm bundle:android
   (cd apps/android && ANDROID_HOME=~/Library/Android/sdk ./gradlew clean \
     :app:testDebugUnitTest :app:assembleDebug :app:assembleBundled :app:bundleRelease :app:assembleDebugAndroidTest)
   node --test devtools/android-bundle/packaged-assets.artifacts.mjs                    # 4건
   ANDROID_HOME=~/Library/Android/sdk BUNDLETOOL_JAR="$BUNDLETOOL_JAR" \
     node --test devtools/android-bundle/native-alignment.artifacts.mjs                 # 6건
   ```
   **`:app:assembleDebugAndroidTest`를 빼면 `native-alignment`의 NA5가 `no .apk under apps/android/app/build/outputs/apk/androidTest/debug`로 실패한다**(2026-10-05에 실제로 그렇게 실패했고, 그 태스크를 돌린 뒤 6/6이었다 — 제품 회귀가 아니라 선행 빌드 누락이다).
   `BUNDLETOOL_JAR`가 없으면 bundletool이 필요한 NA4 · NA5 · NA6 일부를 건너뛴다. **마지막 NA6은 Gradle을 돌려 release AAB를 다시 만든다** — 끝난 뒤의 `$AAB`는 이 테스트가 만든 것이다. 명령의 정본은 두 파일의 머리말이다.
2. **AAB 설정**: `java -jar "$BUNDLETOOL_JAR" dump config --bundle="$AAB" | grep -E "PAGE_ALIGNMENT_16K|uncompressNativeLibraries"` → `PAGE_ALIGNMENT_16K` · `enabled: true`.
3. **기동 — 세 번**(① 새로 설치 직후 ② `pm clear` 뒤 ③ HOME 갔다 복귀 뒤):
   ```sh
   A logcat -c
   A shell am start -n $ACT
   sleep 3; shot r1-1-3s; dumpui r1-1-3s
   sleep 5; shot r1-1-8s; dumpui r1-1-8s
   grep -c -i -E "App Compatibility|16 KB|16KB|page size" "$OUT/r1-1-3s.xml" "$OUT/r1-1-8s.xml"   # 둘 다 0
   # ② — pm clear 뒤 3초 시점은 아직 스플래시다. 판정은 8초 시점(스플래시 뒤 온보딩)에서 한다
   A shell pm clear $PKG; A logcat -c; A shell am start -n $ACT; sleep 3; shot r1-2-3s; sleep 5; shot r1-2-8s; dumpui r1-2-8s
   grep -c -i -E "App Compatibility|16 KB|16KB|page size" "$OUT/r1-2-8s.xml"                      # 0
   # ③
   A shell input keyevent KEYCODE_HOME; sleep 2; A shell am start -n $ACT; sleep 3; shot r1-3-3s; dumpui r1-3-3s
   grep -c -i -E "App Compatibility|16 KB|16KB|page size" "$OUT/r1-3-3s.xml"                      # 0
   ```
4. **logcat**: `A logcat -d | grep -v ' F DEBUG ' | grep -i -E "page size|16 ?KB|elf.*align|app compat"` 한 줄도 없다.
   `grep -v ' F DEBUG '`를 빼면 앱과 무관한 `F DEBUG: Page size: 16384 bytes`(이 이미지의 UWB 벤더 서비스 tombstone)가 걸려 거짓 실패가 된다. 앱 pid로 거르면 시스템 대화상자 관련 줄이 빠지므로 pid로 거르지 않는다.

**통과**: 1·2 통과 + 세 시도 모두 `uiautomator dump`의 문구 0 + 스크린샷에 대화상자 없음 + 온보딩이 선다(②는 8초 시점 — 3초 스크린샷이 스플래시인 것은 정상이다).
**실패**: 어느 시도에서든 대화상자가 뜬다. 이것이 남으면 판정 규칙(계약 §5.1 · §6.1)이 모자란 것이다 — 구현을 바꾸지 말고 `specification`으로 되돌린다.
선례 문서들의 `Don't Show Again` 누르기는 **이 항목에서는 하지 않는다**(눌러서 닫히면 이 항목은 실패다).

## R2 — 패키지 · 버전 · targetSdk

```sh
A shell dumpsys package $PKG | grep -E "versionCode|versionName|targetSdk|minSdk|codePath|primaryCpuAbi"
A shell pm list packages | grep -E "libitum"                         # package:libitum.duru.android (옛 앱을 지웠다면 이것 하나)
A shell cmd package resolve-activity --brief $PKG | tail -1          # libitum.duru.android/com.libitum.host.MainActivity
A shell pm path $PKG                                                  # 분할 APK 목록 — base · split_config.arm64_v8a …
```

**기대**: `versionCode=2` · `versionName=0.1.0` · `targetSdk=36` · `minSdk=26` · 실행 컴포넌트가 `libitum.duru.android/com.libitum.host.MainActivity`.
arm64 분할에 `lib/arm64-v8a` 16개: `unzip -l "$OUT/release.apks" | grep arm64`로 분할 이름을 보고, `unzip -p "$OUT/release.apks" splits/base-arm64_v8a.apk > "$OUT/arm64.apk"; unzip -Z1 "$OUT/arm64.apk" | grep -c '^lib/arm64-v8a/.*\.so$'` → 16(분할 파일 이름이 다르면 `unzip -l` 출력에서 맞춘다).
universal APK로 `aapt2`를 쓸 수도 있다: `java -jar "$BUNDLETOOL_JAR" build-apks --bundle="$AAB" --mode=universal --output="$OUT/uni.apks" --ks ~/.android/debug.keystore --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android && unzip -p "$OUT/uni.apks" universal.apk > "$OUT/uni.apk" && "$BT/aapt2" dump badging "$OUT/uni.apk" | grep -E "^package:|targetSdkVersion|compileSdkVersion"`
→ `package: name='libitum.duru.android' versionCode='2' versionName='0.1.0'` · `targetSdkVersion:'36'`.

**통과**: 위 값 전부. 하나라도 다르면 실패.

## R3 — 앱 기동 · 라이브러리 로드 · FCM 토큰 · 푸시 흐름

1. **기동 · 로드 오류 없음**(R1 시도 ① 직후 logcat을 이어서):
   ```sh
   A logcat -d | grep -E "UnsatisfiedLinkError|dlopen failed|FATAL EXCEPTION|IncompatibleClassChangeError|java.lang.NoClassDefFoundError" ; echo "exit=$?"   # 한 줄도 없다(exit=1)
   A logcat -d | grep -i "Process $PKG.*died"                                                                                                          # 없다
   A shell pidof $PKG                                                                                                                                  # 프로세스가 살아 있다
   ```
   스크린샷에 온보딩 첫 화면이 보인다(온보딩 문구가 없는 화면이면 실패). **번들을 읽지 못한 화면은 흰색이 아니라 글자 없는 주황 한 면이다** — 창 배경이 주황으로 바뀌었다([ADR-0049](../adr/0049-android-launch-appearance.md) D6. 그 전에는 회백색 `#FAFAFA`였다).
   주황 위에 흰 손글씨 로고가 써지는 화면은 JS 스플래시다 — 실패가 아니고 몇 초 뒤 다시 찍는다. 주황 한 면이 온보딩으로 넘어가지 않으면 실패다.
2. **FCM 토큰**(새 Firebase 설정으로 실제 토큰이 나오는가). 같은 패키지 · 같은 디버그 키라 AAB 설치를 덮어쓴다 — **R1 · R2 · R5를 끝낸 뒤에** 돌린다:
   ```sh
   FCM_UDID=$E2E_UDID sh apps/android/test-live-fcm-token.sh        # 마지막 줄 OK (1 test)
   ```
   Google Play 이미지 에뮬레이터여야 한다(`FCM_UDID` 주석). `google-services.json`이 없으면 스크립트가 시작 전에 멈춘다.
3. **푸시 흐름**(권한 · 로컬 알림 탭 → 목적지): `E2E_UDID=$E2E_UDID pnpm test:e2e:android:push` — 두 Maestro 흐름 통과.

**통과**: 1 오류 0 · 2 `OK (1 test)` · 3 통과. 모두 새 패키지에서.

## R4 — 딥링크 콜백이 새 패키지에 닿는다

실제 소셜 로그인은 범위 밖이다. **인텐트가 새 앱에 닿고, 앱 선택 창이 없는지**만 본다.

**이 수동 절차도 AAB 설치 상태에서 한다.** `debug` 빌드(R3 FCM · 푸시, R5 픽스처, R8의 자체 설치 실행기)가 같은 패키지를 덮어쓴 뒤라면 로컬 번들이 없어(번들 서버도 없다) **글자 없는 주황 한 면**이 끝까지 남는다(ADR-0049 전에는 빈 흰 화면이었다. 스플래시가 길어진 것이 아니다 — [Android 실행 시 색과 적응형 아이콘](android-launch-appearance.md)의 L8) — 판정할 수 없다.
`A shell pm path $PKG`에 `split_config.*`가 보이지 않으면(`base.apk` 하나면 `debug` 설치다) 「AAB 만들고 분할 설치」 3 · 4로 AAB를 다시 설치하고 시작한다. 같은 패키지 · 같은 디버그 키라 덮어쓰면 된다.

```sh
A shell am force-stop $PKG
A logcat -c
A shell am start -a android.intent.action.VIEW -d "duru://auth-callback?code=fake" | tee "$OUT/r4-am.txt"
sleep 10; shot r4; dumpui r4     # force-stop 뒤의 콜드 스타트다 — 3 · 4초 시점은 아직 스플래시라 판정하지 않는다. 10초쯤 기다린다
A shell dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity"        # libitum.duru.android/com.libitum.host.MainActivity
grep -c -i -E "Open with|Choose an app|resolver" "$OUT/r4.xml"                                # 0 (옛 앱을 지웠을 때)
A shell cmd package query-activities --brief -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d "duru://auth-callback?code=fake"   # 한 개 — libitum.duru.android
```

Maestro 흐름도 돌린다: `E2E_UDID=$E2E_UDID pnpm test:e2e:android:social`(콜백 뒤 새 앱의 로그인 화면 오류 문구). 이 흐름은 R8의 `pnpm test:e2e:android`에도 들어 있어 R8에서 함께 돌려도 된다. 따로 돌리려면 전제 7의 R8 화면 설정(3버튼 · `390x844` · `160`)을 먼저 맞춘다 — 실행기가 해상도를 바꾸지 않는다.
이 스크립트는 **앱을 설치하지 않는다.** 모의 값으로 만든 번들이 든 앱이 이미 깔려 있어야 한다 — R1에서 설치한 AAB(「AAB 만들고 분할 설치」)가 그것이다. `debug` 빌드(R3 FCM · 푸시, R5 픽스처)가 덮어썼다면 로컬 번들이 없어 첫 단언에서 죽으므로 AAB를 다시 설치한다. 같은 패키지 · 같은 디버그 키라 덮어쓰면 된다.
화면 단언은 Custom Tab 주소창에 **도메인(`example.invalid`)** 이 보이는지로 하고, 선택한 `provider` · `redirect_to` · PKCE `code_challenge`는 스크립트가 logcat의 `capturedLink=https://example.invalid/auth/v1/authorize?provider=…&redirect_to=duru%3A%2F%2Fauth-callback&code_challenge=…` 줄로 판정한다(최신 Chrome은 주소창에 쿼리를 보이지 않는다). 이 줄을 남기지 않는 시스템 이미지에서는 실패한다.

**통과**: 최상위 Activity가 `libitum.duru.android/com.libitum.host.MainActivity` · 선택 창 문구 0 · `query-activities` 결과가 새 패키지 하나 · Maestro 통과.
수동 절차의 화면은 판정에 쓰지 않는다. 새로 설치한 앱에 `code=fake`를 보내면 **오류 문구 대신 온보딩이 보일 수 있다**(2026-10-05 실행에서 AAB 새 설치 + 10초 뒤 화면이 온보딩이었다). 오류 문구(`code=fake`는 교환에 실패한다)가 보이면 그것도 정상이다.
어느 쪽이든 수동 절차가 판정하는 것은 **최상위 Activity · 선택 창 없음 · `query-activities`** 셋이고, 콜백 뒤 로그인 화면의 오류 문구는 Maestro `social`이 단언한다.

## R5 — 앞선 세 작업 회귀 (Play 형태 설치에서)

설정 변경(targetSdk 36 · 패키지 · 재빌드 `.so`)이 이미 고친 것을 되돌리지 않았는지 **핵심만** 본다. 항목 · 통과 기준은 각 문서가 정본이다 — 여기서 되풀이하지 않는다.

| # | 무엇 | 어디서 | 이 절차에서 볼 것 |
|---|---|---|---|
| ① | 시스템 뒤로가기 | [android-system-back.md](android-system-back.md) | 맵에서 뒤로 → 앱이 백그라운드로 가고(종료 아님) 다시 열면 같은 화면. 시트를 열고 뒤로 → 시트만 닫힘. (targetSdk 36의 예측형 뒤로가기 — ADR-0043 재검토 조건) |
| ② | 3버튼 탭 바 · 상단 inset | [android-navigation-insets.md](android-navigation-insets.md) | 3버튼 내비게이션 모드(`cmd overlay enable com.android.internal.systemui.navbar.threebutton` 뒤 `settings get secure navigation_mode`가 `0` — 확인은 이 값으로 한다)의 탭 루트에서 하단 탭 바가 내비게이션 버튼과 겹치지 않고, 상단이 상태 표시줄 밑으로 들어가지 않는다(targetSdk 35의 edge-to-edge 강제). 참조 문서가 `wm size 390x844` · `wm density 160`을 쓰므로 이 구간만 그렇게 바꾸고(전제 7의 표) 끝나면 `wm size reset` · `wm density reset`과 함께 제스처 모드로 되돌린다 |
| ③ | 효과음 · 대사 · 서사 배경 | [android-assets.md](android-assets.md) | E2(온보딩 `Next`의 `button` 효과음: `player ... started` + logcat `SoundEffectsModule.play.button`, `SoundEffectsModulefailed` 0), E5(대사 재생), E6(서사 배경 그림이 보이고 움직임) |

①②③은 로그인 뒤 화면이 필요하면 「로그인 뒤 화면」 절의 픽스처로 들어간다(R3 FCM · 푸시 절차가 같은 패키지를 `debug` APK로 덮어썼다면 AAB를 다시 설치한다 — 「AAB 만들고 분할 설치」 3·4).

**통과**: 세 항목 모두 각 문서의 통과 기준 그대로. 하나라도 회귀하면 실패이고, 어느 문서 어느 항목인지 결과 표에 적는다.

## R6 — API 26 ~ 32 뒤로가기 · 4 KB 페이지 기기

**조건부 항목이다. 해당 AVD가 없으면 「미실행」으로 남기고 이유를 적는다(통과로 쓰지 않는다).**

- **API 26 ~ 32**: `onBackPressed()` 경로(API 33 이상은 `OnBackInvokedCallback`)다. targetSdk 36에서 이 경로가 실제로 도는지가 ADR-0043의 재검토 조건이다. 2026-10-05에 API 30에서 처음 실행됐다(아래 「실행 기록」).
- **4 KB 페이지 기기**: 재빌드한 `.so`는 16 KB 정렬이라 4 KB 기기에서도 로드되어야 한다. API 26 ~ 32 시스템 이미지는 모두 4 KB 페이지이므로 두 조건을 한 AVD로 본다.

```sh
# AVD 준비(없을 때) — Apple Silicon이면 arm64 이미지. x86_64 호스트면 x86_64 이미지
sdkmanager "system-images;android-30;google_apis;arm64-v8a"
avdmanager create avd -n Api30_4k -k "system-images;android-30;google_apis;arm64-v8a" -d pixel_6
emulator -avd Api30_4k &        # 부팅 뒤
export E2E_UDID=<adb devices 에서 새 ID>      # 꺾쇠 자리는 실제 ID로 바꾼다. A 함수는 호출할 때 E2E_UDID를 읽으므로 다시 정의하지 않는다
A shell getconf PAGE_SIZE      # 4096
A shell getprop ro.build.version.sdk    # 30
```

같은 AAB를 분할 설치한다(「AAB 만들고 분할 설치」 3·4, `--device-id`를 새 ID로 — 분할은 이 기기의 ABI · 밀도에 맞춰 다시 만든다).

1. 기동: `A shell am start -n $ACT`, 3초 · 8초 스크린샷 → 온보딩 화면(그림 포함)이 선다. logcat에 `UnsatisfiedLinkError` · `dlopen failed` · `FATAL EXCEPTION` 0.
2. 효과음: 온보딩 `Next` → `events`에 `started`, logcat `SoundEffectsModule.play.button`.
3. 뒤로가기(R5 ①과 같은 결과): 로그인 뒤 화면까지 들어가려면 「로그인 뒤 화면」 픽스처를 쓴다. 쌓인 화면(시트)에서 뒤로 → 한 단계만 닫힘, 맵에서 뒤로 → 앱이 백그라운드로(종료 아님):
   ```sh
   A shell input keyevent KEYCODE_BACK
   sleep 1; A shell dumpsys activity activities | grep -E "mResumedActivity|topResumedActivity"
   ```

**통과**: 1 · 2 · 3이 R5 ①③과 같은 결과. 4 KB 기기에서 로드 오류가 하나라도 있으면 실패.
**미실행 조건**: API 26 ~ 32 AVD 또는 시스템 이미지를 받을 수 없을 때. 「미실행 — 사유」로 적는다.

### 실행 기록 — 2026-10-05, API 30(Android 11) · 4 KB 페이지(`getconf PAGE_SIZE` 4096) · arm64 `google_apis` 에뮬레이터 · 3버튼 · `114099e3`

AVD는 pixel_5 · `system-images;android-30;google_apis;arm64-v8a`(Google Play 이미지가 아니다), `wm size 390x844` · `wm density 160` · 글자 배율 1.0, 에뮬레이터는 `-no-audio`로 띄웠다. AAB는 그 커밋에서 다시 만들어(`checked 31, failures 0`) bundletool로 분할 설치했다(`versionCode=2 minSdk=26 targetSdk=36`).

| 본 것 | 결과 | 근거 · 한계 |
|---|---|---|
| 재빌드 `.so`의 4 KB 로드 · 온보딩 · 그림 | 통과 | 기동 8초 시점에 온보딩 1단계와 점원 그림(Fresco 경로)이 섰다. `UnsatisfiedLinkError` · `dlopen failed` · `FATAL EXCEPTION` · `IncompatibleClassChangeError` · `NoClassDefFoundError` 0, 프로세스 생존 |
| `onBackPressed()` 경로 | 통과 — B2 · B5 · B6 · B7(b)만 | 온보딩 Step 3 → 2 → 1 → 떠남(`moveTaskToBack`, pid 유지). 픽스처로 들어간 알림 화면 → 뒤로 = 맵(0.7초 · 1.7초), 롤플레이 · 설정 탭 → 뒤로 = 여정, 맵 → 뒤로 = 런처(기록 남음 · pid 동일), 다시 열면 2초 뒤 맵 |
| 3버튼 하단 | 통과(스크린샷 육안) | 온보딩 `Next` · 탭 바가 시스템 바 위에 서고 겹치지 않는다. [내비게이션 바 절차](android-navigation-insets.md)의 수치 대조는 하지 않았다 |
| 오디오 자산 · 효과음 | **부분 통과** | 설치된 분할 `base-master.apk`에 m4a 21 · mp3 8, 무압축 아닌 것 0. 온보딩 `Next` → logcat `SoundEffectsModule.play.button`, `SoundEffectsModulefailed` 0. **소리는 `-no-audio`라 확인하지 못했다.** `events`의 `event:started` 이력은 이 API의 `dumpsys audio` 출력에 없어 판정에 쓰지 못했다(전제 8) |
| 계측 일괄(R8 ①, `debug` 빌드) | `OK (40 tests)` | `ButtonAccessibilityTest`(R8 ②) · `test-session-resume.sh` · `test-storage-restart.sh`는 이 AVD에서 돌리지 않았다 |

**이 실행으로 확인되지 않은 것**: API 26 ~ 29 · 31 ~ 32, 제스처 모드, B3 · B4 · B7(a) · B8 · B9, 소리 청음(에뮬레이터를 `-no-audio`로 띄웠다), API 30에서의 `ButtonAccessibilityTest` · `test-session-resume.sh` · `test-storage-restart.sh`, 실기 4 KB 기기. 그 밖에 Maestro 흐름 전부, TalkBack, x86_64 재빌드 `.so`(arm64 이미지다)도 이 AVD에서 돌리지 않았다.
API 35 이상의 4 KB 일반 이미지(`google_apis`, `_ps16k`가 붙지 않은 것)를 쓰면 4 KB 로드만 보고, 뒤로가기는 `OnBackInvokedCallback` 경로라 이 항목의 뒤로가기 판정에는 쓰지 않는다.

## R7 — 옛 패키지와 공존 (관찰 기록, 통과/실패 아님)

개발 기기에서만 일어나는 일이다. Play 사용자는 처음부터 새 패키지만 가진다.

1. 옛 앱을 설치한다: 옛 패키지는 HEAD `54b5198a` 이전 커밋의 debug APK다. 따로 받은 워크트리(`git worktree add --detach <경로> 54b5198a`)에서 `cd apps/android && ./gradlew assembleDebug` 후 `A install -r app/build/outputs/apk/debug/app-debug.apk`. 새 앱은 R1의 AAB 설치 그대로 둔다.
2. 아이콘 둘(`pm list packages | grep libitum`에 `com.libitum.host`와 `libitum.duru.android`) · 앱 데이터가 따로(새 앱은 로그인 전 온보딩).
3. `A shell am start -a android.intent.action.VIEW -d "duru://auth-callback?code=fake"` → 선택 창(「Open with」)이 뜬다. 스크린샷 `r7-chooser`를 남긴다.
4. 끝나면 `adb uninstall com.libitum.host`.

**기록할 것**: 선택 창이 뜬 여부와 스크린샷. 이 결과는 합격 판정에 쓰지 않는다(계약 §2.6).

## R8 — 이름을 바꾼 나머지 Maestro · 계측

실행 표면의 패키지 이름이 전부 바뀌었는지는 정적 검사(`pnpm test:android-bundle`)가 이미 본다. 여기서는 **기기에서 실제로 돌아가는지**를 본다.
**앱을 누가 설치하는지는 실행기마다 다르다.** 한 번에 하나씩, 에뮬레이터를 다른 용도로 쓰지 않는 상태에서:

| 실행기 | 앱 설치 | 앞서 있어야 하는 것 |
|---|---|---|
| `test:e2e:android`(`host` · `social` · `legal` · `small`) | **설치하지 않는다** — 이미 깔린 앱을 쓴다 | 모의 값 번들이 든 앱: R1의 AAB 설치(또는 `assembleBundled` 설치). `debug` 설치가 덮어썼으면 AAB를 다시 설치한다 |
| `audio` · `signed-in` · `review` · `completion` · `speech` · `handwriting` | 스스로 번들 → `assembleDebug` → 설치(`debug` + 계측 APK, 로컬 번들 서버) | 없음. 끝나면 `debug` 빌드가 AAB 설치를 덮어쓴 상태가 된다 |

그러므로 **설치하지 않는 네 개(`host` · `social` · `legal` · `small`)를 AAB 설치 상태에서 먼저 돌리고**, 스스로 설치하는 실행기를 그 뒤에 돌린다.
**반복할 때는 AAB를 다시 설치한다.** 스스로 설치하는 실행기가 한 번이라도 돌면 기기의 앱은 `debug` 빌드다. 그 상태에서 네 개를 다시(두 번째 반복 · 실패 뒤 재시도) 돌리려면 먼저 「AAB 만들고 분할 설치」 3 · 4로 AAB를 다시 설치한다 — 하지 않으면 로컬 번들이 없어 첫 단언에서 죽는다.
`adb`는 PATH에 있어야 한다(`small`은 `adb`를 이름으로 부른다): `export PATH="$ANDROID_HOME/platform-tools:$PATH"`. 화면 설정은 전제 7의 표대로 3버튼 모드 · `390x844` · `160`으로 맞춘 상태에서 시작한다(`host`는 해상도를 스스로 바꾸지 않는다).

```sh
export E2E_UDID=emulator-5554
A shell wm size 390x844; A shell wm density 160; A shell settings put system font_scale 1.0   # host · social · legal 은 스스로 맞추지 않는다
pnpm test:e2e:android            # host · social · legal · small  (설치하지 않음 — AAB 설치 상태에서)
pnpm test:e2e:android:audio
pnpm test:e2e:android:signed-in
pnpm test:e2e:android:review
pnpm test:e2e:android:completion
pnpm test:e2e:android:handwriting
pnpm test:e2e:android:speech     # AOSP 이미지가 있을 때만 — 아래 「speech」
A shell wm size reset; A shell wm density reset                                                # 끝난 뒤. 제스처 모드 복귀는 전제 7
```

**스크린샷 골든(`e2e/screenshots/*.png`)은 환경에 묶인다.** 화면 가장자리(상태 표시줄 높이 · 내비게이션 바)가 한 픽셀이라도 달라지면 임계(94 ~ 99.5%)를 못 맞춘다. 골든은 Pixel_8 AVD(API 37) · 3버튼 모드 · `390x844`/`160`(`small` · `signed-in`은 `320x640`/`160`) · 글자 배율 1.0(`signed-in`은 1.0 · 1.3)에서 찍은 것이다. 이 환경이 아니면(제스처 모드 · 다른 AVD) 실패해도 제품 회귀가 아니다. 가장자리나 레이아웃을 일부러 바꾼 작업(edge-to-edge · 탭 바 · 젬 칩 숨김 등)은 골든을 다시 찍어야 한다 — 방법은 아래 「골든 다시 찍기」.
**Chrome Custom Tab 주소창은 도메인만 보인다**(최신 Chrome). `legal`은 도메인(`gregarious-pharaoh-bb6.notion.site`)과 문서 제목(`DURU Term of Use` · `DURU Privacy Policy`)으로, `social`은 도메인(`example.invalid`)과 logcat `capturedLink`로 판정한다. URL 쿼리 · 경로를 주소창 문구로 읽는 단언을 새로 만들지 않는다.
**실패하면 `e2e/screenshots/<이름>_diff.png`가 저장소에 생긴다.** 증거로 옮기고 지워서 `git status`를 깨끗하게 둔다.

**`speech`는 Google Play 이미지에서 돌지 않는다.** 스크립트가 시작 전에 「AOSP emulator without a recognition service」를 요구해 중단한다. 이 절차의 에뮬레이터(Google Play 이미지 — R3 FCM이 요구)로는 `speech`를 **미실행**으로 두고 이유를 적는다. 돌리려면 AOSP(`google_apis`가 아닌 `default`) 이미지의 별도 AVD가 필요하다.

### 골든 다시 찍기

골든을 만드는 정해진 스크립트는 없다. Maestro는 기준 파일이 없으면 만들어 주지 않는다(`assertScreenshot requires a pre-existing reference screenshot`). 저장소가 쓰는 방법은 Maestro `takeScreenshot`이다 — `signed-in-settings` 흐름의 `takeScreenshot: signed-in-settings-${SCALE}`이 그 흔적이다.

1. 위 환경(3버튼 · 해상도 · 글자 배율)을 맞춘다. 흐름이 화면 비율(%) 좌표를 쓰므로 해상도가 다르면 안 된다.
2. 갱신할 흐름 yaml의 `- assertScreenshot: {path: screenshots/<이름>.png …}`를 임시로 `- takeScreenshot: <이름>`으로 바꾼다.
3. 해당 실행기를 돌린다. 이미지는 `~/.maestro/tests/<시각>/<흐름>/takeScreenshot/<이름>.png`에 생긴다(현재 디렉터리가 아니다).
4. 그 파일을 `e2e/screenshots/<이름>.png`로 복사하고(크기 `390x844` · `320x640` 유지), **yaml을 `assertScreenshot`으로 되돌린다.**
5. 이전 골든과 눈으로 비교해 가장자리 · 의도한 레이아웃 변경만 달라졌는지 본다. 콘텐츠가 달라졌으면 골든을 갱신하기 전에 제품 변경인지 회귀인지 가린다.

계측(기기에 `debug` 설치):

```sh
cd apps/android && ./gradlew assembleDebug assembleDebugAndroidTest && cd ../..
A install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
A install -r apps/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
# ① 일괄 — ButtonAccessibilityTest 는 전제가 달라 여기서 빼고 ②에서 따로 돌린다.
#    ConfigurationChangeTest 도 뺀다(에뮬레이터 전역 설정을 바꾸고 -e bundleUrl 이 필요하다 — 아래 ③)
#    StatusBarIconsHostTest 도 뺀다(-e bundleUrl 이 필요하고 야간 모드를 바꾼다 — 아래 ④)
#    SplashWordmarkHostTest 도 뺀다(-e bundleUrl 이 필요하다 — 아래 ⑤)
A shell am instrument -w \
  -e notClass com.libitum.host.SignedInScreenFixtureTest,com.libitum.host.SessionResumeTest,com.libitum.host.StorageRestartTest,com.libitum.host.ButtonAccessibilityTest,com.libitum.host.ConfigurationChangeTest,com.libitum.host.StatusBarIconsHostTest,com.libitum.host.SplashWordmarkHostTest \
  libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner
E2E_UDID=$E2E_UDID sh apps/android/test-session-resume.sh
E2E_UDID=$E2E_UDID sh apps/android/test-storage-restart.sh
```

**② `ButtonAccessibilityTest`는 따로 돌린다 — 번들을 서빙하고 TalkBack을 켠 상태에서.** 전제 둘과 명령 · 되돌리기는 [Android TalkBack 검증](android-talkback.md#계측-buttonaccessibilitytest의-전제와-실행)이 진다(여기에 되풀이하지 않는다). 기대 결과는 **`OK (1 test)`** 다.
이 테스트는 한때 이 문서에 「기준선에서도 실패하는 기존 실패 — 실패가 예상된 결과」로 적혀 있었다. **틀린 판정이었다.** 실패는 제품도 에뮬레이터 이미지도 아니고 실행 조건 둘이 빠져서 났다:
`-e bundleUrl`이 없으면 `debug` 빌드가 `http://10.0.2.2:3000/main.lynx.bundle`을 읽는데 번들이 서빙되지 않아 빈 화면에서 `Next accessibility node missing`으로 죽고(기준선 `54b5198a`가 같은 줄에서 실패한 이유도 같다),
번들을 줘도 TalkBack(터치 탐색)이 꺼져 있으면 Lynx 4.0.1이 평탄화된 요소의 가상 노드를 내지 않아 `onboarding dialogue accessibility node missing`으로 죽는다.
2026-10-05에 두 조건을 맞추자 `c5d38608` · API 37 · targetSdk 36 · 재빌드한 AAR의 `debug` 빌드에서 `OK (1 test)`였다. **이 테스트의 실패를 예상된 결과로 넘기지 않는다.**

**③ `ConfigurationChangeTest`(8건)도 따로 돌린다.** 이 클래스는 번들 서빙과 `-e bundleUrl`을 요구하고 야간 모드 · 화면 크기 · 밀도 · 글꼴 배율 · 회전 · 내비게이션 모드 오버레이 같은 에뮬레이터 전역 설정을 바꾼다.
`notClass`에서 빼고 ①을 돌리면 `Tests run: 47, Failures: 6`이 된다(2026-10-05, `396afb2b` · API 37 — 6건 모두 `precondition: instrumentation argument bundleUrl is missing`, 기존 40건은 통과. 그때 이 클래스는 7건이었고 일괄은 40건이었다 — 클래스가 8건, 일괄이 47건이 된 뒤의 수는 다시 재지 않았다. **이 `47`은 아래 ①의 지금 기대값 `OK (47 tests)`와 숫자만 같다** — 그때는 40 + 7이었고 실패 6건이 있었다).
실행법 · 통과 기준(API 37은 8 통과, API 30에서는 6 통과 + 2 건너뜀) · 되돌리기는 [Android 화면 방향과 구성 변경](android-orientation.md#계측-configurationchangetest--실행법)이 진다(여기에 되풀이하지 않는다).

**④ `StatusBarIconsHostTest`(8건)도 따로 돌린다.** `ConfigurationChangeTest`와 같은 이유다 — 번들 서빙과 `-e bundleUrl`을 요구하고(없으면 케이스마다 `precondition: instrumentation argument bundleUrl is missing`으로 실패한다) 시스템 야간 모드와 앱 저장소를 바꿨다 되돌린다.
`notClass`에 넣지 않고 ①을 돌렸을 때의 실측은 이 클래스가 7건이던 때의 것이다: 54건 가운데 통과 44 · 건너뜀 3 · **실패 7**(2026-10-06, `bc44c645` · API 37 — 7건 모두 이 클래스의 `bundleUrl` 전제 실패). 그 뒤 케이스 하나(HI8)가 더해져 8건이 됐고, 그 상태로 `notClass` 없이 돌린 수는 다시 재지 않았다.
실행법 · 통과 기준(`OK (8 tests)`) · 되돌리기는 [Android 호스트 README](../../apps/android/README.md#계측-statusbariconshosttest-실행)가 진다(여기에 되풀이하지 않는다).

**⑤ `SplashWordmarkHostTest`(7건)도 따로 돌린다.** 번들 서빙과 `-e bundleUrl`을 요구하고(없으면 `precondition: instrumentation argument bundleUrl is missing`으로 실패한다) 앱 저장소를 비웠다 되돌린다.
`notClass`에 넣지 않고 ①을 돌리면 `Tests run: 51, Failures: 3`이 된다(2026-10-07, `9bd6fd2c` · API 37 — HW1 · HW2 · HW4가 그 전제 실패이고 HW3은 인자가 없어 건너뛰어진다. 나머지 47건은 그대로다).
**이 51 · 3은 이 클래스가 4건이던 때의 실측이다.** 같은 날 뒤(`7ba0a828`) 늦은 도착 가드 HW5 · HW6 · HW7이 더해져 7건이 됐고, 그 상태로 `notClass` 없이 돌린 수는 다시 재지 않았다(셋 모두 `-e wordmarkDelayMs`가 없으면 전제 확인 전에 건너뛰므로 54건 · 실패 3 · 건너뜀이 셋 더 느는 것이 소스로 본 기대다 — 실측이 아니다).
일괄(①)에서 빼고 `-e bundleUrl`과 함께 따로 돌리는 클래스: `ButtonAccessibilityTest`(②) · `ConfigurationChangeTest`(③) · `StatusBarIconsHostTest`(④) · `SplashWordmarkHostTest`(⑤). (`SignedInScreenFixtureTest` · `SessionResumeTest`도 번들 URL을 받지만 각자의 절차 · 스크립트가 넘긴다.)
실행법 · 통과 기준(`OK (7 tests)` — HW3은 `-e wordmarkMissing true`와 워드마크를 지운 번들 서버가 없으면, HW5 · HW6 · HW7은 `-e wordmarkDelayMs`와 워드마크 응답을 늦추는 번들 서버가 없으면 건너뛴다. 건너뜀은 통과로 세지 않는다) · 되돌리기는 [Android 호스트 README](../../apps/android/README.md#계측-splashwordmarkhosttest-실행)가 진다(여기에 되풀이하지 않는다).
**7건이 된 뒤의 `OK (7 tests)`는 실측이다**: 지연 · 누락 인자 없이 `-e bundleUrl`만 준 클래스 전체 실행이 API 37 · API 30 모두 통과 3(HW1 · HW2 · HW4) + 건너뜀 4(HW3 · HW5 · HW6 · HW7)였다(2026-10-07, `5aff7932` — 에뮬레이터 한 대씩).

**통과**: 위 Maestro 전부 통과(`speech`는 AOSP 이미지가 없으면 미실행으로 이유를 적는다 — 통과로 쓰지 않는다) · 계측 ①은 **`OK (47 tests)`** · 계측 ②는 `OK (1 test)` · 두 스크립트 `OK`.
**`OK (N tests)`의 N은 건너뛴 테스트를 포함한 수다.** 계측 ①의 47은 **기기마다 나뉘는 수가 다르다 — API 37은 통과 44 + 건너뜀 3, API 30은 통과 43 + 건너뜀 4**다(둘 다 2026-10-07 `5aff7932`의 실측 — 아래).
API 37의 44 + 3은 이렇게 처음 셌다(2026-10-06, `dfbe03cb` · API 37 에뮬레이터(Pixel_8 AVD)에서 위 명령에 `-r`을 더해 코드를 센 결과 — `0`이 44개, `-4`가 3개, `-2` 없음. 그 앞의 기준선 43 = 통과 40 + 건너뜀 3은 `bc9a091e`에서 같은 방법으로 셌다).
`StatusBarIconsHostTest`를 `notClass`에 더한 위 명령에서도 **47 = 통과 44 + 건너뜀 3 그대로다**(2026-10-06, `bc44c645` · API 37에서 `OK (47 tests)`. 빼는 클래스의 케이스 수는 이 수에 들지 않는다 — 그 클래스가 7건에서 8건이 된 뒤 일괄을 다시 돌리지는 않았고, 소스의 `@Test`를 세면 전체 71 − 뺀 여섯 클래스 24 = 47로 맞는다).
`SplashWordmarkHostTest`를 `notClass`에 더한 위 명령에서도 **47 = 통과 44 + 건너뜀 3 그대로다**(2026-10-07, `9bd6fd2c` · API 37에서 `-r`로 센 결과 — `0`이 44개, `-4`가 3개, `-2` 없음. 소스의 `@Test`를 세면 전체 75 − 뺀 일곱 클래스 28 = 47로 맞는다).
그 뒤 `SplashWordmarkHostTest`가 4건에서 7건이 됐다(2026-10-07, `7ba0a828`). **빼는 클래스라 47은 그대로다** — 소스의 `@Test`를 다시 세면 전체 78 − 뺀 일곱 클래스 31(1 + 3 + 3 + 1 + 8 + 8 + 7) = 47로 맞는다(`ac343e11`).
**그 뒤 두 기기에서 다시 돌렸다**(2026-10-07, `5aff7932` — 위 명령에 `-r`, 에뮬레이터 한 대씩, 전제 6대로 옛 앱이 없는(끈) 상태): **API 37 `OK (47 tests)` = 통과 44 + 건너뜀 3 · API 30 `OK (47 tests)` = 통과 43 + 건너뜀 4.**
API 30에서 하나 더 건너뛰는 것은 `LaunchAppearanceTest#ic3_splashScreenAttributesResolveOnApi31Plus`다(API 31 이상의 스플래시 속성).
두 기기 공통으로 건너뛰는 셋은 `LiveFcmTokenTest`의 2건(`#bridgeReturnsARealFcmRegistration` · `#relayGetsNewTokenAfterDeleteToken` — `-e liveFcm true`가 없으면 건너뛴다)과 `SpeechRecognitionModuleTest#missingRecognizerSettlesWithoutOpeningMicrophone`(AOSP 이미지 전제)이다.
`PushTokenRefreshHostTest` 2건은 일괄에 들어가 통과한다(번들 · Firebase 없이 돈다 — [Android 푸시 호스트 E2E](android-push-notifications.md#계측-pushtokenrefreshhosttest--실행법)).
`LaunchAppearanceTest` 4건도 일괄에 들어가 API 37에서 통과한다(번들 · 전역 설정 변경 없이 돈다. API 30 이하에서는 스플래시 속성 1건이 건너뛰어져 건너뜀 수가 하나 는다 — [ADR-0049](../adr/0049-android-launch-appearance.md). API 30에서 통과 3 + 건너뜀 1로 실측됐다).
건너뜀 수가 API 37에서 3 · API 30에서 4가 아니면(이미지 종류에 따라 음성 인식 케이스가 돌 수 있다) `-r`로 다시 돌려 이름을 적는다.
이 수의 내력: `OK (40 tests)`(2026-10-05 `9b15f548` · API 37에서 위 명령의 내용 그대로 — 그때는 `$A` 문자열 변수 형태를 bash에서 썼다. `ConfigurationChangeTest`를 `notClass`에 더한 뒤의 명령으로 2026-10-05 `396afb2b` · 2026-10-06 `8e16f6b5` · `94097ecb` · `4f3b2927`에서도 같았다)
→ `OK (42 tests)`(2026-10-06 `704d56fc` — `PushTokenRefreshHostTest` 2건이 더해졌다) → `OK (43 tests)`(`bc9a091e` — `LiveFcmTokenTest`에 건너뛰는 케이스 1건이 더해졌다) → `OK (47 tests)`(2026-10-06 `dfbe03cb` — `LaunchAppearanceTest` 4건이 더해졌다) → `OK (47 tests)` 그대로(2026-10-06 `bc44c645` — `StatusBarIconsHostTest`가 더해졌으나 `notClass`로 뺀다) → `OK (47 tests)` 그대로(2026-10-07 `9bd6fd2c` — `SplashWordmarkHostTest`가 더해졌으나 `notClass`로 뺀다. 같은 날 `7ba0a828`에서 그 클래스가 7건이 됐으나 일괄의 기대값은 같다 — 소스로 센 수였다)
→ `OK (47 tests)` 실측(2026-10-07 `5aff7932` — API 37 통과 44 + 건너뜀 3 · API 30 통과 43 + 건너뜀 4).
**이 문서와 다른 절차 문서 · ADR의 날짜 붙은 `OK (40 tests)` · `OK (43 tests)` 기록은 그때의 결과다 — 지금의 기대값이 아니다.**
**`adb shell am instrument`는 테스트가 실패해도 종료 코드가 0이다.** 종료 코드로 판정하지 말고 출력 마지막의 `OK (N tests)`(실패면 `FAILURES!!!`)로 판정한다.
실패 · 건너뜀은 이름과 사유를 결과 표에 적는다(`pnpm test:e2e:android:social:live` · `:talkback`은 실제 계정 · TalkBack이 필요해 이 항목에 넣지 않는다).

## R9 — 사용자 몫: 서명 · Play 재업로드 · 실기 확인

**이 절차는 사용자가 직접 한다.** 업로드 키 · 비밀번호 · Play Console 계정 · 실기가 필요해 자동 실행하지 않는다. 비밀번호는 명령에 쓰지 않는다 — `jarsigner`가 묻는 입력창에 직접 친다.
앞의 R1 ~ R8이 통과한 커밋에서 한다.

### 1. 빌드

```sh
cd <저장소>                                   # 업로드할 커밋을 체크아웃한 상태. git rev-parse HEAD 를 결과 표에 적는다
cp ~/Downloads/google-services.json apps/android/app/       # 아직 없다면. libitum.duru.android client가 있는 파일
pnpm bundle:android                                          # 실제 서버 주소가 들어간 번들 — 모의 값(PUBLIC_SUPABASE_URL=…invalid)을 주지 않는다
cd apps/android && ./gradlew clean bundleRelease && cd ../..
ls -l apps/android/app/build/outputs/bundle/release/app-release.aab     # 서명 없는 AAB
```

실제 접속 값은 `apps/mobile/.env.local`(추적 안 함 — 루트 README)의 `PUBLIC_SUPABASE_URL` · `PUBLIC_SUPABASE_ANON_KEY`가 번들에 들어간다. 그 파일이 이 워크트리에 있는지 확인하고,
R1 ~ R8의 모의 값 인라인 지정은 그 명령 한 줄에만 적용되므로 셸에 남지 않는다. 그래도 `env | grep PUBLIC_SUPABASE`가 모의 값을 보이면 `unset` 한다. 번들 뒤 `grep -c example.invalid apps/mobile/dist/main.lynx.bundle`이 0인지로 모의 값이 안 섞였음을 확인한다.
빌드가 `Release build needs … google-services.json` 또는 `Native 16 KB page alignment check failed`로 멈추면 업로드하지 말고 메시지를 결과 표에 적어 되돌린다.

### 2. 업로드 키로 서명

```sh
jarsigner -keystore ~/duru-upload.jks \
  -signedjar apps/android/app/build/outputs/bundle/release/app-release-signed.aab \
  apps/android/app/build/outputs/bundle/release/app-release.aab \
  duru-upload
# Enter Passphrase for keystore: ← 입력창에 직접 입력한다(명령 · 셸 기록에 남기지 않는다)
```

### 3. 서명 확인

```sh
jarsigner -verify -verbose -certs apps/android/app/build/outputs/bundle/release/app-release-signed.aab | tail -5
# 기대: jar verified.   (경고 「chain not validated」 · 「not signed by alias in this keystore」 류는 업로드 키가 자체 서명이라 나올 수 있다 — 「jar verified」가 있으면 된다)
```

`jar is unsigned`이면 2를 다시 한다. 서명 알고리즘 · SHA-1 지문을 Play Console의 「앱 서명」 페이지에 등록된 **업로드 키 인증서 지문**과 대조한다
(`keytool -list -v -keystore ~/duru-upload.jks -alias duru-upload`). 지문이 다르면 업로드가 거절된다.

### 4. Play Console 비공개 테스트에 새 버전 업로드

1. Play Console → 앱 `libitum.duru.android` → **테스트 → 비공개 테스트** → 트랙 `duru-closed-test` → **새 버전 만들기**(새 트랙을 만들지 않는다 — 기존 트랙을 쓴다).
2. 서명한 `app-release-signed.aab`를 올린다.
3. 업로드 직후 **수락 확인**: 버전 코드 **2**로 표시되고(이미 올라간 versionCode 1과 다르다), 오류 · 경고 창에 다음이 **없어야 한다**:
   - 「버전 코드 2가 이미 사용되었습니다」 — 있으면 `build.gradle`의 versionCode를 올리고(계약 §4 수동 증가) 1부터 다시 한다.
   - 대상 API 수준 요건 위반 — targetSdk 36이므로 없어야 한다.
   - 16 KB 페이지 크기 호환성 오류 — 없어야 한다.
   - 서명 키 불일치 — 있으면 3의 지문 대조로 돌아간다.
4. 버전 이름은 `0.1.0` 그대로 둔다(결정 D3). 출시 노트를 적고 검토 후 출시한다. 테스터 목록은 기존 `duru-closed-test`의 것을 쓴다.

### 5. 테스터 기기에서 업데이트

1. 테스터 계정(Play Console 테스터 목록에 있는 계정)으로 로그인한 실기에서, 비공개 테스트 참여 링크 또는 Play 스토어에서 앱 `libitum.duru.android`를 열고 **업데이트**(처음이면 설치)한다.
   테스트 트랙 반영에 시간이 걸릴 수 있다. 업데이트 버튼이 안 보이면 Play 스토어 앱의 캐시를 지우고 다시 연다.
2. 설치 뒤 확인: 설정 → 앱 → Duru → 앱 정보의 버전 `0.1.0`. (`adb`가 가능하면 `adb shell dumpsys package libitum.duru.android | grep versionCode` → 2.)
3. 가능하면 **16 KB 개발자 옵션 기기**(Android 15 이상 Pixel · 설정 → 시스템 → 개발자 옵션 → 「16KB 페이지 크기로 부팅」)에서 본다. 그런 기기가 없으면 일반 기기로 하고 아래 표의 해당 줄에 「16 KB 기기 아님」을 적는다.

### 6. 확인 목록 (실기)

앱을 처음 연 직후부터 본다.

| # | 확인 | 어떻게 | 결과 |
|---|---|---|---|
| a | 16 KB 경고 없음 | 앱을 열 때 · 홈에 갔다 돌아올 때 「Android App Compatibility」 / 16 KB 호환성 대화상자가 뜨지 않는다(16 KB 기기) | |
| b | 소리: 버튼 | 온보딩 `Next` · 하단 탭 · 학습 버튼을 누르면 효과음이 난다(미디어 볼륨을 올린다) | |
| c | 소리: 정답 | 학습에서 정답을 고르면 정답 효과음이 난다 | |
| d | 소리: 벨 | 여정의 전화 · 메신저 장면에서 수신 벨이 난다 | |
| e | 소리: 대사 | 대사 오디오(기내 방송 · 직원 대사)가 재생된다 | |
| f | 그림: 서사 배경 | 서사 화면(프롤로그)의 배경이 단색이 아니라 그림으로 보이고 천천히 움직인다 | |
| g | 3버튼 탭 바 | 3버튼 내비게이션 모드(설정 → 시스템 → 제스처 → 3버튼 내비게이션)에서 하단 탭 바가 내비게이션 버튼과 겹치지 않는다 | |
| h | 뒤로가기 | 시트 · 쌓인 화면에서 뒤로 → 한 단계씩 닫힘. 맵(탭 루트)에서 뒤로 → 앱이 백그라운드로 가고 다시 열면 같은 화면(강제 종료 아님) | |
| i | 기동 · 충돌 | 로그인 화면 진입까지 앱이 꺼지지 않는다(수정 전 Fresco 3 시도에서 이 단계에서 충돌했다) | |
| j | **스플래시 워드마크 — 출시 조건** | 앱을 완전히 끝낸 뒤(설정 → 앱 → Duru → 강제 종료) 다시 여는 콜드 스타트를 **20회** 한다. 매 회 주황 화면 위에 흰 손글씨 워드마크가 그려지는지(약 2.4초 동안 써진 뒤 다음 화면으로 넘어간다), **워드마크 없이 빈 주황 화면이 약 4초 가다 넘어가는 실행**(쓰다 만 워드마크에서 넘어가는 것 포함)이 있는지 본다. 결과 칸에 `그런 실행 수 / 20`을 적는다 — 아래 「j의 횟수와 한계」 | |

이상이 있으면 증상 · 기기 모델 · Android 버전 · 페이지 크기를 적고(가능하면 `adb logcat` 발췌), 구현을 고치지 말고 작업 `android-release-config`로 되돌린다.

**j의 횟수와 한계.** j는 사용자가 2026-10-07에 **출시 조건**으로 정한 확인이다 — Play 내부 테스트 전에 실기의 릴리스 빌드에서 스플래시 길이를 재고 그 결과로 4초 안전 타이머를 고칠지 정한다([ADR-0051](../adr/0051-android-image-url-redirect.md) 「미확인 · 후속」 10 — U1).

- **왜 20회인가**: 계약이 실기에 권한 내장 번들 반복의 축약판이 20회이고(ADR-0051 「미확인 · 후속」 4), 에뮬레이터의 release AAB 스모크도 20회였다([스플래시 워드마크 절차](android-splash-wordmark.md)의 SW8). 손으로 할 수 있는 수준에 맞춘 수이고 통계로 정한 수가 아니다.
- **20회에 0건이어도 「없다」가 아니다**: 타이머로 닫힌 실행이 관찰된 비율은 약 0.5%였다(수정 후 1 / 218 — **API 30 에뮬레이터 · dev 빌드.** 실기 · release 빌드의 비율은 재지 않아 모른다). 참 비율이 그 정도라면 20회에 한 건도 안 나올 확률이 약 90%다(0.995^20 ≈ 0.90).
  20회 0건이 배제하는 것은 「약 14% 이상으로 자주 난다」까지다(단측 95% — 1 − 0.05^(1/20) ≈ 0.14). 0건이면 「20회에서 보이지 않았다」로 적고, 내부 테스트 기간에 같은 증상의 보고를 계속 받는다.
- **한 건이라도 있으면 ADR-0051 U1을 다시 연다**([보류 표](../adr/README.md#보류-표)의 「스플래시 4초 안전 타이머」 행). 기기 모델 · Android 버전 · 몇 번째 실행이었는지를 적는다.
- **눈으로는 길이를 ms로 잴 수 없다.** j가 보는 것은 「타이머로 닫히는 실행이 있는가」다. 길이의 분포를 수치로 남기려면 `adb`가 붙은 기기에서 스플래시 워드마크 절차의 「반복 실행기」를 `--build bundled --cold stop`으로 돌린다 — **실기 · Play 설치본에서 돌려 본 적은 없다**(에뮬레이터의 release AAB까지다).

**권고 — 상태바 아이콘 (출시 조건으로 정해지지 않았다).** [ADR-0050](../adr/0050-android-status-bar-icons.md) 「미확인 · 후속」 1 · 2 · 10이 실기에 넘긴 것이다. 하지 않아도 출시를 막지 않는다. 해당 기기가 없으면 「기기 없음」으로 적는다.

| # | 확인 | 어떻게 | 결과 |
|---|---|---|---|
| s1 | 전환 지연의 체감 | 밝은 화면(여정 맵)과 어두운 화면(에피소드 표지 · 서사 화면)을 오갈 때 상태바의 시계 · 아이콘 색이 화면과 함께 바뀌는지, 눈에 띄게 늦거나 잠깐 안 읽히는 순간이 있는지(API 30 에뮬레이터 실측은 다 바뀔 때까지 약 150 ~ 160 ms) | |
| s2 | 제조사 상태바 | Pixel이 아닌 기기(제조사 SystemUI)에서 s1을 본다. 연속 학습 모달이 뜨면 장식 운석이 상태바의 시계 · 아이콘과 겹치지 않는지도 본다(제조사마다 글리프의 자리가 다르다) | |
| s3 | Android 8 ~ 10 (API 26 ~ 29) | 그 버전의 기기에서 어두운 화면(에피소드 표지 · 서사 화면)에 들어가면 아이콘이 밝게 바뀌고 나오면 어둡게 돌아오는지 — 이 경로는 어느 기기 · 에뮬레이터에서도 실행된 적이 없다 | |
| s4 | Android 12 ~ 16 (API 31 ~ 36)의 어두운 아이콘 색 | 밝은 화면에서 일반 대화상자(설정의 로그아웃 확인창)를 연 채 스크린샷을 찍어 어두워진 띠 위의 시계가 읽히는지 본다. Android 버전과 스크린샷을 남긴다 — 이 범위는 재지 않았고(API 30 실측 3.81 · API 37 실측 7.37), 그 값은 사용자가 2026-10-07에 수용한 범위다(ADR-0050 U2). 결과가 그 결정을 다시 여는 것은 아니고 미측정 범위를 채운다 | |

## 결과 표

빌드한 SHA: `<git rev-parse HEAD>` · 날짜: `<YYYY-MM-DD>` · 기기: `<AVD 또는 실기 모델 · Android 버전 · PAGE_SIZE>`

| 항목 | 담당 | 결과 (통과 / 실패 / 미실행) | 근거(스크린샷 · 로그 파일) · 비고 |
|---|---|---|---|
| R1 16 KB 대화상자 없음 · `.so` 정렬 | 에뮬레이터 | | `r1-*.png` · `r1-*.xml` · CLI 출력(checked N, failures 0) |
| R2 패키지 · versionCode 2 · targetSdk 36 | 에뮬레이터 | | `dumpsys package` 발췌 |
| R3 기동 · 로드 오류 0 · FCM 토큰 · 푸시 | 에뮬레이터 | | logcat · `OK (1 test)` · Maestro push |
| R4 딥링크 콜백 | 에뮬레이터 | | `r4.png` · `r4-am.txt` · Maestro social |
| R5 회귀 ① 뒤로가기 ② 탭 바 ③ 소리 · 대사 · 배경 | 에뮬레이터 | | 각 선행 문서 항목 번호와 스크린샷 |
| R6 API 26 ~ 32 · 4 KB | 에뮬레이터(AVD 없으면 미실행) | | 돌린 API 수준 · `PAGE_SIZE` · 돌리지 않은 항목. 미실행이면 사유 |
| R7 옛 앱과 공존 | 에뮬레이터 | 관찰 기록 | 선택 창 여부 · `r7-chooser.png` |
| R8 나머지 Maestro · 계측 | 에뮬레이터 | | 실패 이름 · 계측 ① 실패 0 · 계측 ②(`ButtonAccessibilityTest`, TalkBack 켬) `OK (1 test)` |
| R9-1~3 빌드 · 서명 · 서명 확인 | 사용자 | | `jar verified.` 여부 · 지문 대조 |
| R9-4 Play 업로드 수락(versionCode 2) | 사용자 | | Play Console 화면 |
| R9-5~6 실기 업데이트 · 확인 목록 a ~ j | 사용자 | | 위 확인 목록 표. **j(스플래시 20회)는 출시 조건이다** — `그런 실행 수 / 20` · 기기 모델 · Android 버전 |
| R9-6 권고 s1 ~ s4 (상태바 아이콘) | 사용자 | | 권고 — 미실행이어도 출시를 막지 않는다. 본 기기의 모델 · Android 버전 |
