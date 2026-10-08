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
| **R9** — 업로드 키 서명 · Play 재업로드 · 실기 | **미실행 — 확인되지 않았다** | 사용자 몫이다. **Play가 이 브랜치의 AAB(versionCode 2)를 받는지**, 실기에서 소리 · 그림 · 탭 바 · 16 KB 경고 없음은 아직 아무도 보지 않았다. ⟨2026-10-07⟩ 실기의 스플래시 20회(확인 목록 j — **출시 조건**)도 아직 아무도 하지 않았다. ⟨2026-10-08⟩ ABI 유지 · 축소 결정(확인 목록 k — **프로덕션 출시 전 출시 조건**)도 아직 내리지 않았다 |
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

R5 ①②③은 로그인 뒤 화면이 필요하다.

> **낡은 절차 — release AAB 설치에 계측 픽스처를 붙이는 방법은 minify(작업 `android-abi-minify`) 뒤에는 성립하지 않는다.**
> 아래 취소선 절차는 R8 축소 이전에만 통했다. 축소된 release AAB 설치에 계측 APK(`SignedInScreenFixtureTest`)를 붙이면 **러너가 `NoClassDefFoundError: kotlin.jvm.internal.Intrinsics`로 죽는다**(계약 단계의 실측. 원인은 **추정**이다 — 앱이 쓰지 않는 Kotlin 클래스를 R8이 지웠고 계측 APK는 앱에 있다고 가정한다).
>
> ~~[Android 시스템 뒤로가기](android-system-back.md)의 「앱 구간 진입 (로그인 없이)」(`SignedInScreenFixtureTest` + 계측 APK + 로컬 번들 서버)을 AAB 설치에 붙인다. 패키지 · 러너만 다르다: 앱 `libitum.duru.android`, 계측 `libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner`, 클래스는 `-e class com.libitum.host.SignedInScreenFixtureTest`. AAB 설치의 앱도 같은 디버그 키라 같은 패키지의 계측 APK를 붙일 수 있다.~~
>
> **대체 경로 둘** — 어느 쪽도 「출시할 바로 그 바이너리」에서 로그인 뒤 화면을 본 것이 아니다:
>
> | 경로 | 무엇을 본다 | 한계 |
> |---|---|---|
> | **debug 빌드의 계측**(R8 절의 계측 ① · ②, 시스템 뒤로가기 문서의 절차 — `assembleDebug` + 계측 APK) | 로그인 뒤 화면의 **제품 동작**(뒤로가기 · 탭 바 · 효과음). debug 변형은 축소하지 않는다(해시 동일 실측 — R8 절) | **축소의 영향은 보지 못한다** — 축소되지 않은 빌드이기 때문이다 |
> | **S 절의 탐침 빌드**(S.8 · 부록 — 일회용 사본의 `ProbeSignedIn`을 넣은 축소된 release AAB) | 축소된 앱이 로그인 뒤 경로에서 도는지(오류 판정 · 호출 줄 · 상태바) | **dex가 출시 바이너리와 같지 않다**(탐침이 Lynx HTTP 클래스를 더 쓴다). HTTP는 기기 안 대역이 받는다 |
>
> 그러므로 R5의 ① 뒤로가기(맵에서 백그라운드로 · 시트만 닫힘) · ② 탭 바 · ③ 소리는 **debug 계측 경로로 본 값**이고, 축소와 관련해서는 S 절의 E3 · E5가 본 범위만이 진짜 판정이다. 나머지는 R9 확인 목록의 「minify」 묶음으로 간다.

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
     node --test devtools/android-bundle/release-shrink.artifacts.mjs                   # 8건(A1 ~ A8 — 작업 android-abi-minify)
   ANDROID_HOME=~/Library/Android/sdk BUNDLETOOL_JAR="$BUNDLETOOL_JAR" \
     node --test devtools/android-bundle/native-alignment.artifacts.mjs                 # 6건 — 반드시 release-shrink 뒤에
   ```
   **`release-shrink.artifacts.mjs`(A1 ~ A8)** — 축소된 release AAB의 dex 1개 · 매핑의 K1 · K2 대상 생존 · 접근성 클래스 생존 · 4개 ABI · 다운로드 크기를 본다. 위 빌드의 세 산출물(`assembleDebug` · `assembleBundled` · `bundleRelease`)을 모두 읽으므로 위 `gradlew`에서 셋 중 하나라도 빼면 `no .apk/.aab under …`로 실패한다(테스트 파일 머리의 실행법과 같다). 판정 로직은 `release-shrink.mjs`, 이 파일은 산출물을 읽어 단언만 한다.
   **순서가 중요하다**: `native-alignment`의 NA6은 `google-services.json`을 치우고 `:app:assembleBundled`를 다시 만든 뒤 `bundleRelease`만 다시 만든다(테스트 코드를 읽은 것 — 이 문서 수정에서 돌려 보지 않았다). 그 뒤의 `app-bundled.apk`는 **코드상 Firebase 설정 없이 만든 것이다**(NA6이 json 없이 `:app:assembleBundled`를 다시 빌드하고 json과 함께는 다시 빌드하지 않는다 — NA6 직후의 APK를 직접 연 실행은 없다. S.3의 「`bundled`를 검증에 쓰기 전에」). 그래서 `native-alignment`는 마지막에 돌리거나, 돌린 뒤 `bundled`를 다시 빌드한다.
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

①②③은 로그인 뒤 화면이 필요하면 「로그인 뒤 화면」 절의 **대체 경로**(debug 계측 또는 S 절의 탐침 빌드)로 들어간다 — AAB 설치에 픽스처를 붙이는 절차는 minify 뒤 성립하지 않는다(R3 FCM · 푸시 절차가 같은 패키지를 `debug` APK로 덮어썼다면 AAB를 다시 설치한다 — 「AAB 만들고 분할 설치」 3·4).

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

**minify의 영향(작업 `android-abi-minify`)**: 이 절의 계측(`assembleDebug` + `assembleDebugAndroidTest`)은 **debug 변형**이라 R8 축소를 받지 않는다. 변경 전(`fd6052d9`)과 후(`47982c70`) 사본에서 같은 번들로 clean 빌드한 APK의 sha256이 같았다 —
`app-debug.apk` `53582226137fd6ae…` · `app-debug-androidTest.apk` `26bf3efbe1db2054…`(기기에 원래 깔려 있던 계측 APK의 sha와도 같다, 2026-10-08 · S.9 · E6). 그래서 이 절의 이전 결과(계측 `OK (40 tests)` 등)는 minify 뒤에도 그대로 유효하다 — **다만 축소된 release를 본 것은 아니다**(위 R5의 대체 경로 표).

## R9 — 사용자 몫: 서명 · Play 재업로드 · 실기 확인

**이 절차는 사용자가 직접 한다.** 업로드 키 · 비밀번호 · Play Console 계정 · 실기가 필요해 자동 실행하지 않는다. 비밀번호는 명령에 쓰지 않는다 — `jarsigner`가 묻는 입력창에 직접 친다.
앞의 R1 ~ R8이 통과한 커밋에서 한다.

### 1. 빌드

```sh
cd <저장소>                                   # 업로드할 커밋을 체크아웃한 상태. git rev-parse HEAD 를 결과 표에 적는다
cp ~/Downloads/google-services.json apps/android/app/       # 아직 없다면. libitum.duru.android client가 있는 파일
pnpm bundle:android                                          # 실제 서버 주소가 들어간 번들 — 모의 값(PUBLIC_SUPABASE_URL=…invalid)을 주지 않는다
# 산출물 검사(아래 「산출물 검사」)가 debug · bundled · release 셋을 모두 읽으므로 셋을 한 번의 clean 호출로 만든다
cd apps/android && ANDROID_HOME=~/Library/Android/sdk ./gradlew clean :app:assembleDebug :app:assembleBundled :app:bundleRelease && cd ../..
ls -l apps/android/app/build/outputs/bundle/release/app-release.aab     # 서명 없는 AAB
```

실제 접속 값은 `apps/mobile/.env.local`(추적 안 함 — 루트 README)의 `PUBLIC_SUPABASE_URL` · `PUBLIC_SUPABASE_ANON_KEY`가 번들에 들어간다. 그 파일이 이 워크트리에 있는지 확인하고,
R1 ~ R8의 모의 값 인라인 지정은 그 명령 한 줄에만 적용되므로 셸에 남지 않는다. 그래도 `env | grep PUBLIC_SUPABASE`가 모의 값을 보이면 `unset` 한다. 번들 뒤 `grep -c example.invalid apps/mobile/dist/main.lynx.bundle`이 0인지로 모의 값이 안 섞였음을 확인한다.
빌드가 `Release build needs … google-services.json` 또는 `Native 16 KB page alignment check failed`로 멈추면 업로드하지 말고 메시지를 결과 표에 적어 되돌린다.

**산출물 검사 — 올릴 AAB에 대해, 서명하기 전에, 사용자가 돌린다.** 에뮬레이터 단계(R1)가 돌린 `release-shrink.artifacts.mjs`는 모의 값 번들로 만든 AAB를 본 것이다. **올리는 AAB는 실제 값 번들로 다시 만든 다른 파일이므로** 같은 검사를 그 빌드에 한 번 더 돌린다(업로드 직전 · 사용자). 위 빌드에 이어서, 저장소 루트에서:

```sh
export BUNDLETOOL_JAR=$HOME/tools/bundletool-all-1.17.2.jar     # 둔 자리에 맞춘다. 없으면 A7(다운로드 크기)이 「건너뜀」이 되고 건너뜀은 통과가 아니다
ANDROID_HOME=~/Library/Android/sdk BUNDLETOOL_JAR="$BUNDLETOOL_JAR" \
  node --test devtools/android-bundle/release-shrink.artifacts.mjs     # 8건 모두 통과해야 한다
```

- 보는 것(A1 ~ A8): dex 1개 · 매핑의 K1 · K2 대상 생존 · 접근성 클래스 생존 · ABI 4개 · 번들 일치 · 다운로드 크기 18,000,000 B 아래. **하나라도 실패하면 업로드하지 않고** 실패한 테스트 이름을 결과 표에 적어 작업 `android-abi-minify`로 되돌린다.
- **서명(2) 전에 돌린다**: 이 검사는 `outputs/bundle/release/`에서 `.aab`를 찾는다(코드를 읽은 것 — 첫 `.aab`를 쓴다). 2에서 같은 폴더에 `app-release-signed.aab`가 생기면 어느 파일을 읽을지 가려지지 않는다. 서명 전에는 `app-release.aab` 하나뿐이다.
- 이 검사는 AAB의 산출물만 본다 — 기기 동작이 아니다. 업로드 키 서명 · Play의 수락 · 실기는 아래 2 ~ 6이 진다.

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
| j | **스플래시 워드마크 — 출시 조건** | **minify를 켠 빌드(= 출시할 AAB)로** 한다. 앱을 완전히 끝낸 뒤(설정 → 앱 → Duru → 강제 종료) 다시 여는 콜드 스타트를 **20회** 한다. 매 회 주황 화면 위에 흰 손글씨 워드마크가 그려지는지(약 2.4초 동안 써진 뒤 다음 화면으로 넘어간다), **워드마크 없이 빈 주황 화면이 약 4초 가다 넘어가는 실행**(쓰다 만 워드마크에서 넘어가는 것 포함)이 있는지 본다. 결과 칸에 `그런 실행 수 / 20`을 적는다 — 아래 「j의 횟수와 한계」 | |
| k | **ABI 결정 — 출시 조건** | **프로덕션에 올리기 전에** Play Console의 기기 카탈로그에서 ABI별(arm64-v8a · armeabi-v7a · x86 · x86_64) 수치를 보고 4개 유지 / 축소를 정한다. 비공개 테스트는 4개 그대로다. 아래 「minify」 절의 「재검토는 프로덕션 출시 전에」와 [ADR-0052](../adr/0052-android-release-shrinking.md). 카탈로그는 기기 수이지 사용자 비율이 아니다 | 결정: 유지 / 축소 · 근거 수치 · 날짜를 적는다 |

이상이 있으면 증상 · 기기 모델 · Android 버전 · 페이지 크기를 적고(가능하면 `adb logcat` 발췌), 구현을 고치지 말고 작업 `android-release-config`로 되돌린다.

**j는 minify를 켠 빌드로 해야 출시 바이너리의 값이다.** 스플래시 길이 · 워드마크 그리기는 앱 시작 코드(Lynx 초기화 · 번들 로드)에 걸려 있고 R8이 그 코드의 모양을 바꾼다 — 축소 전 빌드(이전 작업의 에뮬레이터 20회 · dev 빌드 218회)의 값은 출시 바이너리의 값이 아니다.
에뮬레이터에서 축소된 `bundled`로 재 본 것은 `splash-wordmark-repeat.sh --build bundled --count 10 --cold clear --shot` **10회에 10/10 통과**(판정 불가 0 · `onFailed` 0 · 스플래시 길이 중앙값 2660ms — 기록만)뿐이다. **표본 10회라 「타이머로 닫히는 실행이 없다」를 말하지 못한다**
(0건이 배제하는 것은 「약 26% 이상으로 자주 난다」까지다 — 단측 95%, 1 − 0.05^(1/10) ≈ 0.26). 그 호스트의 부하가 3.7 → 12.7로 올라간 실행이었다. j의 20회는 이 절차로 대신되지 않는다.

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

**minify — 에뮬레이터에서 닿지 못했거나 탐침 빌드로만 본 것 (작업 `android-abi-minify`).** 위 확인 목록(a ~ j)과 별개로, R8 축소를 켠 **출시 AAB**(업로드 키로 서명한 것)를 실기에 설치해 본다. 에뮬레이터의 결과(S 절)는 「같은 규칙으로 축소한 앱이 그 경로에서 돈다」까지이고, 근거와 한계는 S.1이다. 결정은 [ADR-0052](../adr/0052-android-release-shrinking.md)에 있다.
기기 모델 · Android 버전을 결과에 적고, 이상이 있으면 **구현을 고치지 말고** 작업 `android-abi-minify`로 되돌린다.

| # | 확인 | 어떻게 | 에뮬레이터에서의 상태 | 결과 |
|---|---|---|---|---|
| m1 | 알림 탭 → 목적지 | 서버 푸시(또는 Firebase 콘솔의 테스트 메시지)를 받아 알림을 누른다 — 목적지 화면이 열린다 | **닿지 못함**(E9i — 탐침에 알림 게시 방송이 없다) | |
| m2 | 음성 인식 — 권한 허용 뒤의 실제 인식 | 말하기 화면에서 권한 대화상자의 `While using the app`(허용)을 고르고 실제로 말한다 — 인식 결과가 나온다(`getStatus` 경로 포함) | 권한 대화상자와 `requestPermissions` 호출 줄까지(`Don't allow`) | |
| m3 | TalkBack — 낭독 · 포커스 순서 · 더블탭 | TalkBack을 켜고 온보딩 · 로그인 · 맵 · 설정에서 스와이프로 포커스를 옮기며 **실제로 읽히는 문장**(이름 · 역할 · 상태)과 **스와이프 포커스 순서**를 듣는다(`Next` · `Get started` · `Back`이 한 번의 포커스 정지로 「이름, 버튼」으로 읽히는지 — accessibility 단계 X2). **온보딩 2 · 3단계 → 로그인 화면의 더블탭 활성화**, **로그인 뒤 화면(맵 · 학습 · 설정)의 TalkBack 동작**. **출시 AAB에서 학습 완료 안내가 실제로 발화되는지**(`CompletionAnnouncementModule.announce`) | 접근성 단계가 1단계 `Next` 더블탭 한 번(터치 탐색 포커스 링 · 2단계로 전이)만 minify된 `bundled`에서 보았다. 낭독 문장 · 스와이프 순서 · 2 · 3단계 더블탭 · 로그인 뒤 화면 · 완료 안내의 실제 발화(E9b는 탐침 빌드, 매핑에서는 `announce` 이름 유지만)는 못 봤다 | |
| m4 | 최종 테스트의 `<svg>` 화면 | 맵 끝의 `Final test` → 시험 단계에서 `<svg>` 그림(`libserval_svg.so`를 쓰는 화면)이 그려진다. 연속 학습 모달의 그림도 | 시험 단계 도달까지(스크린샷으로 `<svg>`를 식별하지 못했다) | |
| m5 | 소리 청음 | 효과음 · 대사 · 벨이 실제로 들린다(`SoundEffectsModule` · `AudioPlaybackModule`은 축소 뒤 호출 줄과 오류 0까지) | 에뮬레이터는 `-no-audio` | |
| m6 | 실제 로그인 완료 · 로그아웃 · 계정 삭제 | Apple · Google · Facebook 중 하나로 실제 로그인을 끝낸다(콜백 뒤 세션 교환) → 설정에서 로그아웃 → 계정 삭제(서버 함수) | 제공자 Custom Tab까지(`example.invalid`), 로그아웃은 탐침 세션에서 저장소 삭제 호출까지 | |
| m7 | 푸시 수신 | FCM 서버가 보낸 푸시가 실기에 도착하고 표시된다(토큰 등록 호출은 에뮬레이터에서 탐침 대역으로 보았다) | 닿지 못함 | |
| m8 | 손글씨 · 완료 안내 · 앱 리뷰 · 비주얼 노벨 | 출시 AAB로 각각 한 번 돈다: 손글씨 따라 그리기(`guide` · `compare`) · 학습 완료 안내 · 앱 리뷰 요청 · 비주얼 노벨 장면 | **탐침 빌드로는 통과**(E9a ~ E9d — dex ≠ 출시 바이너리). 출시 바이너리로는 실기에서 | |

**크래시가 나면**: 난독화된 스택(`r2.j` · `SourceFile:19` 모양)은 **그 빌드의 `mapping.txt`**로 푼다 — 이 문서 S 절의 「S.13 매핑으로 스택 풀기」(`retrace`). 매핑이 없으면 스택을 읽을 수 없다.
**출시한 빌드의 `mapping.txt` 보관은 사용자 몫이다**: `apps/android/app/build/outputs/mapping/release/mapping.txt`(추적하지 않는다)를 AAB와 함께 올린 버전 · versionCode와 묶어 따로 보관한다. AAB 안의 `BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map`도 같은 내용이지만 Play가 그것으로 보고서를 푸는지는 이 작업에서 확인하지 않았다(S.1).
보관하는 이유: 같은 소스 · 의존성 · 규칙이면 매핑이 빌드마다 같았지만(이 작업의 관찰 — release 3회 `mapping.txt` sha256 `657d490a…`) 소스 · 의존성 · 규칙이 바뀌면 달라지고, 출시한 바이너리의 스택은 **그 빌드의 매핑**으로만 푼다.

**ABI 4개(arm64-v8a · armeabi-v7a · x86 · x86_64) 유지는 사용자 결정이다**(축소가 `.so`를 건드리지 않는다). 에뮬레이터는 arm64 분할만 받으므로 **32비트 · x86 · x86_64 `.so`는 실행된 적이 없다.**
**재검토는 프로덕션 출시 전에 결정한다**(2026-10-08 사용자 결정): 비공개 테스트는 4개 그대로 가고, **프로덕션에 올리기 전에** Play Console의 기기 카탈로그에서 ABI별 수치를 보고 유지 · 축소를 정한다. 이 결정은 위 확인 목록의 **k**(출시 조건)다.
- **왜 출시 전인가**: 배포 뒤에 ABI를 빼면 그 ABI의 기기를 쓰는 기존 사용자가 새 버전을 받지 못한다(ADR-0052 D4). 그래서 재검토는 출시 전에만 실행할 수 있다.
- **한계**: 기기 카탈로그가 보여 주는 것은 기기 모델 · 지원 기기 수이지 **사용자 비율이 아니다.** 비공개 테스트의 설치 비율은 표본이 없어 근거가 되지 못한다. Play Console의 메뉴 경로는 이 작업에서 조회한 적이 없다 [문서 기억] — 화면에서 직접 찾는다. 유지 · 축소를 가르는 수치 기준은 정해 두지 않았다(그때 사용자가 정한다).
- 근거 · 크기 표 · 결정의 정본은 [ADR-0052](../adr/0052-android-release-shrinking.md)다(같은 문면).

## S — minify한 release 스모크 (작업 `android-abi-minify`, E1 ~ E9)

release AAB(와 `bundled` APK)를 **R8로 축소 · 난독화**하도록 바꾼 작업의 기기 확인이다. 축소가 만든 결함(JNI가 이름으로 찾는 메서드가 지워짐 · 리플렉션 대상의 이름이 바뀜)은 빌드와 정적 검사를 지나 **기동 · 화면 경로에서만** 드러난다
(keep 규칙 한 줄이 빠진 빌드는 빌드와 정적 검사 일부를 지나 기동 즉시 죽었다 — 아래 「변이」). 결정과 실측 표는 계약 `spec.md`(`android-abi-minify`)와 ADR-0052가 정본이고,
이 절은 그 계약의 수용 기준 AC4 · AC5 · AC10 · AC11을 기기에서 판정하는 수동 절차다. 순수 판정 · 설정 · 산출물(ABI · dex · 매핑 · 크기)은 `devtools/android-bundle/release-shrink.*`가 진다 — 여기서 되풀이하지 않는다.
**`bundled`가 release의 minify를 물려받는 것은 사용자가 확인했다**(2026-10-08 — 「그대로」. 대가는 계측 픽스처가 붙지 않아 앞선 작업의 절차 둘이 debug 계측으로 대체된 것이다. 검증용 `bundled`의 dex가 release와 바이트 단위로 같다는 것은 `google-services.json`이 있을 때의 재현이다 — S.0). 결정은 [ADR-0052](../adr/0052-android-release-shrinking.md)의 D3.
**ABI는 바뀌지 않는다**(사용자 결정 — 4개 그대로. 프로덕션 출시 전 재검토는 R9 k). 에뮬레이터에는 arm64 분할만 깔리므로 이 절은 **32비트 · x86 · x86_64 라이브러리를 실행하지 않는다**.

결과는 `test.e2e.manual-result`로 남긴다(따른 문서 · 누가 · 언제 · 빌드 SHA · AAB sha256). 새 러너 · 새 Maestro 흐름은 만들지 않는다 — 설치(bundletool) · 오류 판정(logcat) · 호출 집계는 아래 명령 블록, 화면 흐름은 기존 Maestro 흐름을 그대로 쓴다.

### S.0 실행 상태 (2026-10-08 실행 · HEAD `47982c70`)

**한 번 실행했다**: 2026-10-07 23:34 ~ 2026-10-08 00:25(에뮬레이터 시계) · 실행자 test-runner · HEAD `47982c7019e3001dc576968e86736f8a73885d7e`(제품 · 설정은 `ac0cdf6d`와 같다).
**전체 판정: 실행한 케이스 전부 통과**(E1 ~ E8 · E9a ~ h · E9j · K1 변이는 기대대로 실패로 나옴). 닿지 못함 1건(E9i, 사전 판정 — 시도하지 않음). **제품 결함 0.** 절차 · 도구 결함 11건이 나와 이 문서와 `run-talkback.sh`를 고쳤다(아래 「S.17 이 실행이 고친 것」).
케이스별 판정 · 근거는 S.16의 표가 정본이다.

**최종 검증(2026-10-08 · HEAD `28c307e4`, test-runner)**: 제품 결함 0 · 문서 결함 3건(이 문서의 S.10 — 아래 고침) · 환경 관찰 몇.
- **E1 판정 함수**: 이 문서의 S.2 블록에서 추출한 커밋본 `shrink_judge`를 기기에서 돌렸다 — 축소된 AAB 분할 설치(API 37) 12초 뒤 pid 있음 · `Step 1 of 3` · 호환성 대화상자 0 · **오류 판정 0줄**(원본 9줄은 시스템 HAL pid 6개로 제외), 5회 콜드 스타트도 0줄. API 30도 0줄(원본 0). 위에서 「옮긴 함수는 기기에서 다시 돌려 보지 않았다」고 한 것이 이 확인으로 닫혔다.
- **`run-talkback.sh`**(고친 폴링, minify된 `bundled` · dex 1): 1회째 통과(Maestro 전 단계 COMPLETED · 골든 95%) · `shrink_judge e7` 0줄. TalkBack의 알림 권한 창(X1)이 두 번 떴으나(앱 기동 직후 · 흐름이 끝난 뒤) 흐름을 막지 않았다.
- **S.10 접근성 활성화 단계**: 위 「접근성 활성화 단계」의 관찰 문단에 출처를 구분해 적었다(문서 그대로는 판정 불가 → 아래 고침 → 고친 문서로 test-design이 절차를 다시 확인).
- **변이 4종**(K1 · K2 줄 삭제 · release에 `abiFilters` · bundled에 `minifyEnabled false`)을 최종 구현의 일회용 사본에서 다시 확인했다 — 기대한 케이스(I3 · I4 · A4 / I1 · A1 / I1)에서 모두 실패했다. 로그는 `.agent-harness/work/android-abi-minify/logs/verify-mutation-{k1-delete,k2-delete,release-abifilter,bundled-minify-off}.log`.
- **`apps/android/app/google-services.json`이 있으면 `bundled`의 dex는 release AAB의 dex와 바이트가 같다**(2026-10-08 리뷰 뒤 재현 — 아래 「리뷰 뒤 실행」). 두 파일 모두 `classes.dex` sha `b751b2f5…`. 파일이 **없는** 빌드의 `bundled`만 다르다(`24ac3ed6…` — S.3의 「`bundled`를 검증에 쓰기 전에」). 이 문단이 처음 적었던 「release와 `bundled`의 dex는 같지 않다 · 원인은 release에만 있는 google-services 문자열」은 **일반화가 틀렸다**: 최종 검증(`verify.md` 2(a))이 견준 `bundled`는 json 없이 만든 빌드의 APK로 **보인다**(해시가 json 없는 재현 빌드와 전체가 일치한다 — 출처는 `native-alignment`의 NA6이 남긴 `bundled`로 읽는다: 최종 검증 로그의 순서와 뒤 빌드의 재실행 태스크로 지지되고, NA6 직후의 APK를 직접 해시한 실행은 없다. 근거는 [ADR-0052](../adr/0052-android-release-shrinking.md)의 「검증」). 그 APK에서 본 관찰(클래스 2,992개 · 크기 2,934,436 B 같음, R8이 인라인한 `R.string` 상수 4곳 `srl_content_empty` · `notification_channel_name` · `notification_channel_description` · `selectAll`과 헤더만 다름, 원인은 google-services 문자열 6개가 빠져 리소스 ID가 밀린 것)은 그 APK에 대해서는 맞다. **bundled 스모크가 release 코드의 대리가 되는 범위는 「json이 있는 빌드의 `bundled`」에 한해 dex 바이트까지다.** 근거는 `logs/review-p1-dex-shas.txt` · `review-p1.md`(과제 1)이고, 옛 비교는 `logs/verify-dex-compare.txt` · `verify-dex-diff-resids.txt`다.

**리뷰 뒤 실행(2026-10-08 · HEAD `6eb51a61`, test-runner — `review-p1.md`)** — 같은 날 리뷰의 지적을 닫으려고 돌렸다.
- **`pnpm verify` 통과**(exit 0, 94초) · **`pnpm test:android-bundle` 123/123**(실패 0 · 건너뜀 0).
- **`bundled` dex 재현**: 모의 값 번들 · `google-services.json` 있음 · gradle 빌드 캐시 미사용에서 — (A) `clean :app:assembleDebug :app:assembleBundled :app:bundleRelease` · (B) A를 한 번 더 · (C) clean 없는 `:app:assembleBundled` · (D) `clean :app:assembleBundled` 단독 · (V) verify와 같은 호출 `clean testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest :app:assembleBundled :app:bundleRelease` · (C2) `run-talkback.sh`의 두 단계 그대로 — **전부 `bundled` dex = `b751b2f5…`이고 release 쪽(A · B · V · C2)도 `b751b2f5…`**, `R.txt` 동일(2988줄), `bundled`에 google 문자열 6개, `mapping.txt` `657d490a…`.
  `google-services.json` **없이** `:app:assembleBundled`만 빌드하면 `bundled` dex가 `24ac3ed6c013…`(verify.md 2(a)의 값과 전체 일치), `R.txt` 2982줄(6줄 적음), google 문자열 0. minify 전 커밋 `3b2cbb65`도 json 유무로 같은 차이가 났다 — **이 작업이 만든 성질이 아니다**(`build.gradle`의 google-services 플러그인 조건은 이 작업이 건드리지 않았다).
- **S.10 접근성 활성화 단계를 판정으로 1회**(API 37 Pixel_8, 문서에서 추출한 블록 그대로, **zsh만**): minify된 `bundled`(release와 같은 dex)와 debug 모두 2단계 전이 · 링 사각형 6곳이 기준과 일치 · 두 빌드 diff 0 · 픽셀 수까지 같음(346 / 5868 / 13924 / 13900 / 704) → **통과**(판정 표 ① ②). 한계: 1회 표본 · bash 미실행 · 활성화가 `TapDelegate`를 지났는지는 구분하지 못함 · 읽힌 문장은 못 봄. 정리(TalkBack 설정 · `wm` · 전역 설정 diff 0)까지 했다.
- 안 닫은 것: json 없는 `bundled`의 로그인 뒤 푸시 경로(기동 12초 안에서 `FirebaseApp initialization unsuccessful` 경고 뒤 앱은 정상 기동 · FATAL 0까지만 봤다) · API 30 · 3버튼→제스처 전환.

- **빌드**: release AAB sha256 `7df2fa84c05ea580eeb43e91e0adcaaeda8a1aa665bd70587d98312ed0bcbc48` · bundled APK `c0a90384aadfcce11aadf7385518e98b111d1bf20c67fafdfa93bd6a3bf20461` · `mapping.txt` `657d490acdc5455575ec6180cf81d6184352cce353fbe499807944c591bb2ba3`(계약 값과 같다) · 번들 `main.lynx.bundle` `0a1c34fb…`(모의 값 `example.invalid` · `local-bridge-test`).
  축소 표지: AAB `base/dex/` 1개 · `proguard.map` 1개 · bundled `classes*.dex` 1개 · lib 16/16/16/15(4 ABI). 축소 전 비교 빌드: `fd6052d9`(`minifyEnabled false`) 일회용 사본의 release AAB — `base/dex/` 3개.
- **기기**: Pixel_8 API 37(`PAGE_SIZE` 16384 · Google Play 이미지) · R6_API30 Android 11(4096 · arm64). 한 대씩 — API 30은 Pixel_8을 끄고 띄웠다. 3000 포트 서버는 시작 · 끝 모두 그대로.
- **탐침 빌드**(E5 · E8의 (a) · E9): dex가 출시 바이너리와 같지 않다(S.1). 표에 「탐침」이라고 표시했다.
- **이 실행에서 이 문서가 그대로는 돌지 않았다**: 판정 함수가 건강한 빌드에서도 오탐했다(시스템 HAL의 `SIGABRT`). 실행 쪽이 고쳐 쓴 함수로 돌렸고, 그 고침을 이 문서에 옮겼다. **옮긴 함수는 기기에서 다시 돌려 보지 않았다** — 저장한 logcat 28개(건강한 release · 탐침 · API 30)와 K1 변이 로그로 다시 판정만 했다(결과는 S.4 · S.14).

### S.1 이 절차로 확인되지 않는 것

아래는 어느 케이스가 통과해도 **확인되지 않은 것**이다. R9 확인 목록(실기)으로 간다.

- **실기**: SoC · 제조사 ROM · 실기의 소프트웨어 렌더링이 아닌 GPU. API 26 ~ 29 · 31 ~ 36(이 절은 API 37 · API 30 둘뿐).
- **업로드 키로 서명한 AAB**: 이 절은 디버그 키로 재서명한 분할만 깐다. Play가 이 AAB를 받는지 · **Play가 `proguard.map`으로 비정상 종료 보고서를 푸는지** · Play가 보여 주는 다운로드 크기는 확인하지 않는다.
- **32비트 · x86 · x86_64 라이브러리**: R8은 `.so`를 건드리지 않으며 arm64 에뮬레이터는 그 분할을 받지 않는다. 그 기기에서 앱이 뜨는지 · x86_64에 `libserval_svg.so`가 없을 때 `<svg>` 화면이 어떻게 되는지는 [미확인]이다(이 작업이 그 위험을 키우거나 줄이지 않는다).
- **어노테이션 없이 JNI로 불리는 메서드 · Lynx를 올린 뒤 새로 생기는 누락**: 정적 검사(I3)는 vendor AAR 넷의 `CalledByNative`만 본다. `xelement*` · `lynx-service-*` · `primjs` · `servalsvg` 같은 다른 AAR과 어노테이션 없는 JNI는 기기에서 그 경로를 밟을 때만 드러난다.
- **R8의 최적화(인라인 · 클래스 병합)가 E9의 경로 밖 코드의 동작을 바꾸지 않았는지**: 돌린 경로에서 오류가 없다는 것까지다.
- **`bundled`는 `google-services.json`이 있을 때만 release와 같은 dex다**: json이 있으면 `bundled`의 `classes.dex`는 release AAB와 바이트가 같다(`b751b2f5…`). 없으면 다른 바이너리다(`24ac3ed6…` — S.3의 「`bundled`를 검증에 쓰기 전에」). 그래서 `bundled`에서 본 것이 release 코드의 대리인 범위는 **json이 있는 빌드에 한한다.** 이 절의 `bundled` 케이스는 쓰기 전에 그 확인(S.3의 3-b)을 한다. 앞선 검증이 쓴 `bundled`는 기록으로 확인되는 한 전부 json이 있는 빌드였다(예외는 verify의 dex 비교 한 건 — APK가 보존되지 않은 항목은 gradle 로그 수준의 판단이다).
- **탐침 빌드 ≠ 출시 바이너리**(E5 · E9): 탐침 훅이 Lynx HTTP 클래스 몇을 더 써서 dex가 출시 바이너리와 **같지 않다**(계약 단계 실측 dex 2,934,436 → 2,935,876바이트, 진도를 바꿔 다시 빌드할 때마다 조금씩 달라질 수 있다). E5 · E9의 결과는 「같은 규칙으로 축소한 앱이 그 경로에서 돈다」의 증거이지 「출시할 바로 그 바이너리가 돈다」의 증거가 아니다.
- **처음부터 R9로 가는 것**(에뮬레이터로 닿지 못한다): 실제 제공자 로그인의 완료(콜백 뒤 세션 교환) · 계정 삭제(서버 함수) · FCM 서버가 보낸 푸시의 수신 · 알림 탭 → 목적지(E9i) · 음성 인식의 실제 인식(권한 허용 뒤 — 이 실행은 `Don't allow`를 골랐다) · 소리의 청음(에뮬레이터는 `-no-audio`) · TalkBack의 **음성 출력 · 포커스 순서** · 탐침이 대신하는 실제 서버 응답. 목록은 R9의 「minify」 묶음(m1 ~ m8)이다.
- **`TapDelegate`가 불렸다는 직접 증거 · E7 Maestro 흐름의 증명 범위**: E7의 Maestro 탭은 주입 입력이라 TalkBack을 우회할 수 있어, 그 흐름이 통과해도 `ACTION_CLICK` · `AccessibilityTapBridge$TapDelegate`(`r2.a`)가 동작했다는 것은 **증명되지 않는다**(「TalkBack이 켜지면 탭은 `ACTION_CLICK` 경로로만 전달된다」는 확인되지 않은 전제였다). 접근성 활성화는 S.10의 「접근성 활성화 단계」(하드웨어 터치 더블탭)가 minify된 `bundled`에서 한 번 본 것이 전부다 — 그 활성화가 `TapDelegate`를 지났는지 Lynx 노드 제공자를 지났는지는 구분하지 못했고(호출 계측 없음) 출시 dex에 대한 `ACTION_CLICK` 자동 검사는 없다.
- **`<svg>`가 그려졌는지**(E9e · E9f): 스크린샷으로 어떤 요소가 `<svg>`인지 식별하지 못했다. 시험 단계 · 모달에 도달해 오류가 없었다는 것까지다.
- **E9j의 Maestro 흐름**: `e2e/android-speech-recognition.yaml`이 이 진도에서 좌표가 어긋나 실패한다(S.12). 통과는 손으로 진입한 결과다.
- **스플래시 표본**: 축소된 `bundled`로 10회 10/10 — 표본이 작아 「타이머로 닫히는 실행이 없다」를 말하지 못한다(R9 j).
- **콜드 스타트 시간**: 재지 않는다(스플래시 길이 중앙값 2660ms는 기록만 — 판정에 쓰지 않았다). 스플래시 20회 확인(R9 j)은 축소를 켠 빌드로 해야 하고 이 절은 그 값을 만들지 않는다.
- **`adb`가 PATH에 없을 때**: `install_aab`는 `--adb="$ADB"`를 주므로 괜찮지만 `small` 실행기(`adb`를 이름으로 부른다)와 `tap`·`maestro` 흐름은 `PATH`에 `platform-tools`가 있어야 한다(S.6).
- **이 문서 바깥 절차들의 지난 결과**: `bundled`를 깐 다른 절차들(스플래시 · 실행 화면 · 방향 · 뒤로가기 B7 등)의 이전 기록은 **축소 전 바이너리의 것**이다.

### S.2 환경 · 되돌림

- **에뮬레이터는 한 대씩**. 다른 에이전트 · 계측 · Maestro와 같은 기기를 동시에 쓰지 않는다. 두 에뮬레이터(Pixel_8 API 37 · R6_API30)를 동시에 켜지 않는다.
- **번들은 모의 값**(`https://example.invalid` · `local-bridge-test`). 실제 서버 주소가 들어간 번들로 만들지 않는다.
- **3000 포트의 서버를 건드리지 않는다**(다른 워크트리가 쓰고 있을 수 있다). 이 절의 모든 빌드는 내장 번들이라 개발 서버가 필요 없다 — `bundleUrl`도 쓰지 않는다. 호스트가 localhost:3000을 읽는 debug 빌드는 이 절에서 쓰지 않는다.
- **bundletool** — 위 「전제」 4(`$BUNDLETOOL_JAR`). `google-services.json` · JDK · SDK · `python3` · `pnpm` 의존 설치는 「전제」 2 · 3 그대로(release AAB는 `google-services.json` 없이 빌드되지 않는다 — 워크트리마다 필요).
- **기기**: API 37(16 KB 페이지, Google Play 이미지)이 기본이고 E8만 API 30(4 KB). 부팅 직후 `getconf PAGE_SIZE`가 16384 · 4096인지 확인한다. **부팅한 뒤 설치 상태를 먼저 본다** — `-no-snapshot-save`로 띄운 에뮬레이터는 다음 부팅 때 스냅샷 시점으로 돌아가 `libitum.duru.android` 패키지가 사라졌던 적이 있다.
- **「전제」의 셸 함수 블록**(`A` · `shot` · `dumpui` 등)을 먼저 정의한다. **`A`는 함수다** — `A="adb -s …"; $A …`는 zsh에서 깨진다. 아래 블록은 전부 함수 형태다.
- **화면 설정**은 「전제」 7의 표(R8 Maestro 줄)를 따른다: **3버튼 · `390x844` · `160` · 글자 배율 1.0**. `small`과 E5의 (c)만 `320x640`이다.
- **전역 설정은 쓰고 나면 되돌린다.** 시작 전에 아래 스냅샷과 원래 설치된 APK를 받아 두고, 끝에 「S.15 되돌림」으로 복구한다. 시작할 때 기기에 깔린 `app-debug.apk` · 계측 APK의 sha256을 적어 둔다.

```sh
# 「전제」의 A · shot · dumpui 정의가 먼저 있어야 한다. 이 블록은 그 위에 더한다.
# 저장소 밖의 절대 경로 — 상대 경로면 워크트리 안에 디렉터리가 생긴다. 다른 곳을 쓰려면 먼저 OUT을 절대 경로로 정해 둔다
export OUT="${OUT:-${TMPDIR:-/tmp}/android-abi-minify-e2e}" && mkdir -p "$OUT"
export SHRINK_ERR='ClassNotFoundException|NoSuchMethod|NoSuchField|UnsatisfiedLinkError|dlopen failed|FATAL EXCEPTION|NoClassDefFoundError|AbstractMethodError|JNI DETECTED|VerifyError|Modulefailed|no static method|no method|Fatal signal|SIGABRT|Abort message|Process libitum\.duru\.android .*has died|DEBUG +: Cmdline: libitum\.duru\.android *$|Module .*(not found|not registered|unregistered)'
export SHRINK_EXCL='com\.lynx\.primjs\.wasm\.RegisterWebAssembly|LynxRecorderReplayDataModule|AppleSignInModulefailed'

settings_snapshot() {   # $1 = 이름. 전역 설정 세 구역을 파일로 받는다
  for ns in global secure system; do
    A shell settings list "$ns" | tr -d '\r' | sort > "$OUT/settings-$1-$ns.txt"
  done
}
shrink_judge() {        # $1 = 이름. $OUT/$1.logcat 을 읽어 오류 판정 줄을 $OUT/$1.errors 에 쓰고 센다 — 0이어야 한다
  # .errors.raw = 패턴에 걸린 줄(제외 목록만 뺀 것). .errors = 거기서 「시스템 네이티브 프로세스」의 줄을 pid 단위로 뺀 것
  grep -E "$SHRINK_ERR" "$OUT/$1.logcat" | grep -v -E "$SHRINK_EXCL" > "$OUT/$1.errors.raw"
  # 시스템 프로세스 = crash_dump 가 「Cmdline: /…」(경로로 시작 — 예 /vendor/bin/hw/android.hardware.uwb-service)로 적은 프로세스.
  # 그 덤프 프로세스의 pid 와 덤프 대상(performing dump of process N)의 pid 둘 다 뺀다. 앱의 Cmdline 은 경로 없이 패키지 이름이라 빠지지 않는다.
  # 덤프가 logcat에 아직 안 찍혔을 때(구간 끝에서 잘림)를 위해 libc 의 `Fatal signal … pid N (이름)` 줄도 본다 — 이름에 duru.android 가 없으면 시스템 프로세스다
  awk '/ I crash_dump[0-9]*: performing dump of process [0-9]+/ { match($0, /dump of process [0-9]+/); tgt[$3] = substr($0, RSTART + 16, RLENGTH - 16); next }
       / F DEBUG +: Cmdline: \// { sys[$3] = 1; if ($3 in tgt) sys[tgt[$3]] = 1 }
       / F libc +: Fatal signal/ { if (match($0, /, pid [0-9]+ \([^)]*\)/)) { seg = substr($0, RSTART + 6, RLENGTH - 6); split(seg, a, " "); if (seg !~ /duru\.android/) sys[a[1]] = 1 } }
       END { for (q in sys) print q }' "$OUT/$1.logcat" > "$OUT/$1.syspids"
  awk 'NR == FNR { sys[$1] = 1; next } !($3 in sys)' "$OUT/$1.syspids" "$OUT/$1.errors.raw" > "$OUT/$1.errors"
  echo "$1: $(wc -l < "$OUT/$1.errors" | tr -d ' ') error lines (raw $(wc -l < "$OUT/$1.errors.raw" | tr -d ' '), system pids excluded: $(tr '\n' ' ' < "$OUT/$1.syspids"))"
}
shrink_scan() {         # $1 = 이름. 기기의 지금까지 logcat을 저장하고 판정한다. 구간 시작에 A logcat -c
  A logcat -d > "$OUT/$1.logcat"
  shrink_judge "$1"
}
calls() {               # $1 = 모듈.메서드 접두, $2 = logcat 파일. 실제 호출 수 — Lynx는 호출마다 `will fire`와 `call platform implementation` 2줄을 남긴다. 뒤의 것만 센다
  grep -F "InvokeMethod, method: ($1" "$2" | grep -c "call platform implementation"
}
sig_raw() {             # $1 = logcat 파일, $2 = 앱 pid. 앱의 W/E/F 줄을 숫자 · 주소를 지워 고유 줄로 줄인다
  awk -v p="$2" '$3 == p && ($5 == "W" || $5 == "E" || $5 == "F") { $1 = $2 = $3 = $4 = ""; print }' "$1" \
    | sed -E 's/0x[0-9a-fA-F]+/0xN/g; s/[0-9]+/N/g' | sort -u
}
sig_norm() {            # sig_raw 의 출력을 받아, 난독화된 클래스 이름만 다를 수 있는 한 종류의 줄만 이름을 지운다(S.5의 판정 규칙)
  sed -E 's/^( *W GoogleApiManager: The service for ).* is not available: [^{]*\{/\1<CLS> is not available: <CLS>{/' | sort -u
}
events_lifecycle() {    # MainActivity 의 onCreate · onDestroy 호출 수. 앞서 A logcat -c 로 구간을 시작해야 한다 — events 버퍼의 wm_on_create/destroy_called
  A logcat -b events -d | grep -E 'wm_on_(create|destroy)_called' | grep -c 'MainActivity'
}
install_aab() {         # $1 = AAB, $2 = 이름. 연결된 기기에 맞는 분할을 디버그 키로 서명해 깐다(깨끗한 설치)
  rm -f "$OUT/$2.apks"
  java -jar "$BUNDLETOOL_JAR" build-apks --bundle="$1" --output="$OUT/$2.apks" --connected-device --device-id="$E2E_UDID" --overwrite \
    --ks ~/.android/debug.keystore --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android
  A uninstall "$PKG" > /dev/null 2>&1
  java -jar "$BUNDLETOOL_JAR" install-apks --apks="$OUT/$2.apks" --device-id="$E2E_UDID"
}
cat > "$OUT/tap.py" <<'PY'
import re, sys
from xml.etree import ElementTree as ET
want = sys.argv[2]
for n in ET.parse(sys.argv[1]).iter('node'):
    if want in (n.get('text'), n.get('content-desc')):
        m = re.match(r'\[(\d+),(\d+)\]\[(\d+),(\d+)\]', n.get('bounds', ''))
        if m:
            x1, y1, x2, y2 = map(int, m.groups())
            print((x1 + x2) // 2, (y1 + y2) // 2)
            sys.exit(0)
sys.exit(1)
PY
tap_text() {            # $1 = text 또는 content-desc(정확히 일치). 노드가 없으면 1로 끝난다 — 그때는 shot으로 좌표를 읽는다
  dumpui tap-tmp
  xy=$(python3 "$OUT/tap.py" "$OUT/tap-tmp.xml" "$1") || return 1
  read -r x y <<< "$xy"
  [ "$x$y" = "00" ] && { echo "tap_text: $1 의 bounds가 [0,0][0,0] — 좌표로 탭한다(tap_xy)" >&2; return 1; }   # API 30: Lynx 노드의 bounds가 비어 있다 — (0,0)을 누르지 않는다
  A shell input tap "$x" "$y"
}
tap_xy() { A shell input tap "$1" "$2"; }   # tap_text 가 1로 끝난 화면(API 30)의 대체 — 좌표는 shot 으로 읽는다. 390x844 · 160 의 온보딩 Next 는 (195,743)이었다
step_now() {            # 온보딩의 「Step N of 3」
  dumpui step-now
  grep -o 'Step [0-9] of 3' "$OUT/step-now.xml" | head -1
}
app_pid() { A shell pidof "$PKG" | tr -d '\r'; }

# 시작 전 기록 — 되돌림에 쓴다
A shell pm list packages | grep libitum | tee "$OUT/pm-before.txt"
settings_snapshot before
NAV0=$(A shell settings get secure navigation_mode | tr -d '\r')                    # 0 = 3버튼, 2 = 제스처
NIGHT0=$(A shell cmd uimode night | tr -d '\r' | sed 's/.*: *//')                    # yes | no | auto
A shell settings get secure enabled_accessibility_services
echo "nav=$NAV0 night=$NIGHT0"
A shell pm path "$PKG"; A shell pm path "$PKG.test"
```

**원래 설치된 APK를 받아 둔다**(끝에 같은 것을 다시 깐다 — 단일 APK의 debug 설치일 때. `pm path`가 여러 줄이면 분할 설치였다는 뜻이니 그때는 그 AAB를 다시 `install_aab`로 깐다):

```sh
pull_pkg() {            # $1 = 패키지, $2 = 받을 폴더
  mkdir -p "$2"
  A shell pm path "$1" | tr -d '\r' | sed 's/^package://' | while read -r p; do A pull "$p" "$2/" > /dev/null; done
}
pull_pkg "$PKG" "$OUT/orig-app"; pull_pkg "$PKG.test" "$OUT/orig-test"
shasum -a 256 "$OUT"/orig-app/*.apk "$OUT"/orig-test/*.apk
```

### S.3 빌드

저장소 루트에서, **검사 대상 커밋을 체크아웃한 상태로**(`git rev-parse HEAD`를 결과 표에 적는다).

```sh
# 1) 모의 값 번들 — 실제 서버 주소가 번들에 들어가지 않게
PUBLIC_SUPABASE_URL=https://example.invalid PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
# 2) minify된 release AAB(서명 없음)와 minify된 bundled APK. 16 KB 정렬 게이트와 Firebase 검사가 이 단계에서 돈다
(cd apps/android && ./gradlew clean :app:bundleRelease :app:assembleBundled)
AAB=apps/android/app/build/outputs/bundle/release/app-release.aab
BUNDLED=apps/android/app/build/outputs/apk/bundled/app-bundled.apk
MAPPING=apps/android/app/build/outputs/mapping/release/mapping.txt
shasum -a 256 "$AAB" "$BUNDLED" "$MAPPING" | tee "$OUT/build-sha.txt"
# 3) 축소됐는지 먼저 본다 — 아니면 이후 모든 케이스가 의미 없다(축소 전 빌드를 돌린 것이다)
unzip -Z1 "$AAB" | grep -c '^base/dex/'                                                      # 1
unzip -Z1 "$AAB" | grep -c '^BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map$'   # 1
unzip -Z1 "$BUNDLED" | grep -c '^classes.*\.dex$'                                            # 1
unzip -Z1 "$AAB" | grep -E '^base/lib/[^/]+/.*\.so$' | cut -d/ -f3 | sort | uniq -c           # 4개 ABI: 16 · 16 · 16 · 15 (arm64-v8a · armeabi-v7a · x86 · x86_64)
```

dex 개수가 1이 아니면 **여기서 멈춘다**(`minifyEnabled`가 꺼진 빌드 — 구현이 아니라 빌드 환경을 먼저 본다).

#### `bundled`를 검증에 쓰기 전에 (3-b) — release AAB의 dex와 같은가

`bundled`를 release의 대리로 쓰는 절차(S.10 · `run-talkback.sh` · 스플래시 반복)는 **dex가 1개인 것만으로는 부족하다.** `google-services.json`이 없으면 `bundled`는 빌드되지만(`build.gradle`이 파일이 있을 때만 플러그인을 적용한다 — 의도된 동작) google-services 문자열 6개(`google_app_id` 등)가 빠져 리소스 ID가 밀리고, R8이 인라인한 `R.string` 상수 4곳이 달라져 **release와 다른 dex**가 된다. 그 앱은 Firebase 초기화 실패 로그(`Default FirebaseApp failed to initialize because no default options were found` · `FirebaseApp initialization unsuccessful`)를 찍고 기동은 한다 — 그래서 눈에 띄지 않는다. 다를 때는 `bundled`에서 본 결과를 release의 결과로 적지 않는다.

```sh
# 위 S.3의 AAB · BUNDLED 변수를 쓴다. 두 해시가 서로 같아야 한다(값 자체는 커밋이 바뀌면 달라진다 — 이 커밋의 json 있는 빌드는 b751b2f5…).
# 이 세 줄은 이 문서를 고칠 때 돌려 보지 않았다(같은 해시 비교는 리뷰 뒤 실행이 했다)
unzip -p "$AAB" base/dex/classes.dex | shasum -a 256
unzip -p "$BUNDLED" classes.dex | shasum -a 256
"$BT/aapt2" dump resources "$BUNDLED" | grep -c google_app_id     # 1 이상 — 0이면 json 없이 만든 bundled다
```

두 해시가 다르거나 `google_app_id`가 0이면 **멈춘다** — `apps/android/app/google-services.json`을 두고 `:app:assembleBundled`를 다시 빌드한다(워크트리마다 필요 — 「전제」 3). 같은 워크트리에서 `native-alignment.artifacts.mjs`(NA6)를 돌린 뒤라면 코드상 그 테스트가 json 없이 `bundled`를 만들어 둔 상태다(NA6이 json 없이 `:app:assembleBundled`를 다시 빌드하고 json과 함께는 다시 빌드하지 않는다 — NA6 직후의 APK를 직접 연 실행은 없다. R1).
**축소 전 비교 빌드**(E1의 경고 · 오류 서명 비교용): 구현 커밋의 부모를 일회용 사본에 체크아웃해 같은 번들로 빌드한다.

```sh
BEFORE_SHA="<구현 커밋의 부모 SHA>"                       # 구현 커밋: git log -S'minifyEnabled true' --format=%H -- apps/android/app/build.gradle — 그 커밋의 부모
SCRATCH="$(mktemp -d)"                                    # 저장소 밖
git worktree add --detach "$SCRATCH/before" "$BEFORE_SHA"
cp apps/android/app/google-services.json "$SCRATCH/before/apps/android/app/"
cp apps/android/app/src/main/assets/main.lynx.bundle "$SCRATCH/before/apps/android/app/src/main/assets/"   # 같은 번들
cp -R apps/android/app/src/main/assets/static "$SCRATCH/before/apps/android/app/src/main/assets/"          # 없으면 verifyBundledAssets 가 `Release static assets missing` 으로 멈춘다
(cd "$SCRATCH/before/apps/android" && ./gradlew clean :app:bundleRelease)
AAB_BEFORE="$SCRATCH/before/apps/android/app/build/outputs/bundle/release/app-release.aab"
unzip -Z1 "$AAB_BEFORE" | grep -c '^base/dex/'            # 3 (축소 전)
```

(끝나면 `git worktree remove --force "$SCRATCH/before"`.)

### S.4 오류 판정 — 모든 케이스 공통

실행 구간의 logcat(구간 시작에 `A logcat -c`)에서 **`shrink_scan`(이미 저장된 logcat이면 `shrink_judge`)이 0줄**이어야 한다. 패턴(`$SHRINK_ERR`)은 다음이다:

| 종류 | 패턴 |
|---|---|
| 클래스 · 메서드 · 필드가 없다 | `ClassNotFoundException` · `NoClassDefFoundError` · `NoSuchMethod`(`NoSuchMethodError` 포함) · `NoSuchField` · `AbstractMethodError` · `VerifyError` |
| 네이티브 | `UnsatisfiedLinkError` · `dlopen failed` · `JNI DETECTED` · JNI 조회 실패(`no static method` · `no method`) · `Fatal signal` · `SIGABRT` · `Abort message` |
| 앱의 죽음 | `FATAL EXCEPTION` · `Process libitum.duru.android … has died`(system_server가 남긴다 — 앱 pid가 이미 없어도 남는다) · 크래시 덤프의 `Cmdline: libitum.duru.android`(네이티브 충돌 때 `crash_dump`가 남긴다) |
| Lynx 모듈 | `<모듈>failed`(예 `SoundEffectsModulefailed`) · 모듈 미등록(`Module … not found / not registered`) — **미등록의 정확한 문구는 이 작업에서 관찰하지 못했다**(추정 패턴이다). 호출 줄이 기대인 케이스는 `calls`로 호출 줄을 직접 센다 |

**제외(문자열)**: 아래 셋은 축소 전 빌드에서도 같은 줄이 나온다(축소가 만든 줄이 아니다).
- `com.lynx.primjs.wasm.RegisterWebAssembly` — Lynx가 선택 모듈을 찾는 `ClassNotFoundException` 로그(E1의 서명 비교에서 전 · 후 둘 다 1줄).
- `LynxRecorderReplayDataModule` 미발견 줄.
- `AppleSignInModulefailed` — JS가 iOS 전용 모듈 `AppleSignInModule`을 이름으로 찾아보는 경고(`lynx_module_manager.cc`)다. 소셜 로그인 흐름(E2 `social`)에서만 나오고, 축소 전 사본(`fd6052d9`)의 같은 흐름에서 **같은 줄이 1건** 나왔다(`e2e-e2-social-before-apple.logcat`). 패턴이 `Modulefailed`라 걸린다.

**제외(pid 단위 — 시스템 네이티브 프로세스)**: 에뮬레이터 이미지의 HAL(`/vendor/bin/hw/android.hardware.uwb-service` 등)이 5초마다 `failed to open the serial device`로 `SIGABRT`를 낸다. 앱과 무관하고 건강한 빌드에서도 E1 한 번에 9줄(전체 21줄)이 걸린다.
`Fatal signal` · `SIGABRT` · `Abort message`는 **줄의 내용이 아니라 줄을 남긴 프로세스로** 거른다 — `crash_dump`가 `Cmdline: /…`(경로로 시작)로 적은 프로세스와 그 덤프 대상, 그리고 덤프가 구간 끝에서 잘렸을 때를 위해 `Fatal signal … pid N (이름)`의 이름에 `duru.android`가 없는 프로세스를 뺀다(`shrink_judge`의 `awk`).
앱의 줄은 거르지 않는다 — 앱의 `Cmdline`은 경로 없이 패키지 이름(`libitum.duru.android`)이고, 앱이 죽어 pid가 없는 경우(K1 변이)에도 `Process libitum.duru.android … has died` · `Cmdline: libitum.duru.android` · `JNI DETECTED`가 남는다. **저장 로그로 양성 대조했다**: 건강한 release E1 로그는 0줄, K1 변이 로그는 10줄(아래 S.14).
`JNI DETECTED ERROR IN APPLICATION`은 **CheckJNI의 출력이다** — 에뮬레이터 · 디버그 가능한 환경에서 보이는 모양이고, 실기의 비디버그 빌드에서는 같은 누락이 `NoSuchMethodError` · abort 등 다른 모양으로 나타날 수 있다 [추론 — 이 작업에서 실기를 돌리지 않았다]. 그래서 실기(R9)에서는 이 패턴 한 가지에 기대지 않고 앱이 죽었는지(`pidof` · `has died`)를 먼저 본다.
한계: pid는 재사용될 수 있다 — 구간이 길어 HAL이 쓴 pid를 앱이 받는 일은 한 구간(수 분)에서는 관찰하지 못했다. 시스템 프로세스를 그 내용(`android.hardwar`)으로 알아보는 방식이 아니라 `crash_dump`의 `Cmdline` 경로로 알아보므로, 다른 시스템 네이티브 프로세스의 중단도 같은 방식으로 빠진다 — 그 줄이 앱의 문제를 가렸을 가능성은 `.errors.raw`로 확인한다(`shrink_judge`는 원본을 `.errors.raw`로 남긴다).
`pidof`로 앱이 살아 있어야 하는 케이스에서 프로세스가 없으면 logcat에 패턴이 없어도 실패다(**패턴 0줄은 필요조건이다 — 충분하지 않다**). logcat 버퍼가 한 케이스 동안 넘치지 않게 케이스마다 `logcat -c`로 나눠 저장한다.

### S.5 E1 — release AAB 분할 설치 · 콜드 스타트 (API 37)

```sh
A shell getconf PAGE_SIZE                       # 16384
install_aab "$AAB" release
A shell pm path "$PKG" | tee "$OUT/e1-pm-path.txt"   # base.apk + split_config.arm64_v8a.apk + (언어 · 밀도 분할)
A logcat -c
A shell am start -W -n "$ACT"
sleep 12; app_pid                                # 12초 뒤 pid가 있다
shot e1-12s; dumpui e1-12s
grep -c 'Step 1 of 3' "$OUT/e1-12s.xml"          # 1 이상 — 온보딩 첫 화면
grep -c -i -E "App Compatibility|16 KB|16KB|page size" "$OUT/e1-12s.xml"     # 0 — 16 KB 호환성 대화상자 없음
shrink_scan e1
# 축소 전 빌드와의 경고 · 오류 서명 비교(같은 기기 · 같은 번들 · 한 번씩)
sig_raw "$OUT/e1.logcat" "$(app_pid)" > "$OUT/e1-after.sig"
install_aab "$AAB_BEFORE" before; A logcat -c; A shell am start -W -n "$ACT"; sleep 12
A logcat -d > "$OUT/e1-before.logcat"; sig_raw "$OUT/e1-before.logcat" "$(app_pid)" > "$OUT/e1-before.sig"
diff "$OUT/e1-before.sig" "$OUT/e1-after.sig" && echo "signature diff 0"
# 차이가 있으면 아래 「서명 비교의 판정 규칙」: 이름 정규화 뒤에도 차이가 있는지 본다
diff <(sig_norm < "$OUT/e1-before.sig") <(sig_norm < "$OUT/e1-after.sig") && echo "normalized signature diff 0"
install_aab "$AAB" release        # 이후 케이스를 위해 축소된 빌드를 다시 깐다
```

| 판정 | 조건 |
|---|---|
| **통과** | 설치된 분할이 `base` + `config.arm64_v8a`(+ 언어 · 밀도) · 12초 뒤 pid 있음 · `Step 1 of 3` 보임 · 대화상자 문구 0 · `shrink_scan` 0줄 · **서명 차이 0** |
| **통과(주석)** | 위와 같고, 서명의 원본 차이가 있으나 **아래 규칙의 「이름만 다른 줄」뿐**이다 — 그 줄의 전 · 후를 모두 결과에 적는다 |
| **판정 보류** | 규칙 밖의 차이(줄이 새로 생겼거나 사라졌거나, 이름 말고 다른 곳이 다르다)이면서 오류 판정 패턴에는 걸리지 않는다. 통과로 세지 않는다 |
| **실패** | 프로세스 종료 · 오류 판정 줄(서명 차이 줄이 패턴에 걸리는 경우 포함) · 온보딩에 닿지 못함(주황 한 면이 남음 — 번들을 못 읽은 것) · 대화상자 |
| 닿지 못함 | `getconf PAGE_SIZE`가 16384가 아님 · 설치 자체가 거절됨 → 환경 문제로 적고 통과로 세지 않는다 |

실패하면 구현을 고치지 말고 **계약(keep 규칙)으로 되돌린다.** 스택은 아래 「S.13 매핑으로 스택 풀기」로 읽는다.

**서명 비교의 판정 규칙 — 난독화된 이름만 다른 줄.** `sig_raw`는 숫자 · 주소만 지우므로, 로그 문자열에 **클래스 이름이 들어가는 줄**은 축소 뒤 이름이 바뀌어 차이로 잡힌다(실제로 API 30에서 1줄).
규칙은 아래 하나뿐이다 — 이 모양의 줄만 `sig_norm`이 이름을 지운다(`<CLS>`):

- `W GoogleApiManager: The service for <클래스 이름> is not available: <클래스 이름>{statusCode=…}` — Google Play 서비스 클라이언트 라이브러리가 **앱 안에서** 남기는 경고다(오래된 Play 서비스 이미지에서 `SERVICE_VERSION_UPDATE_REQUIRED`). 두 이름은 그 라이브러리의 내부 클래스이고 R8이 이름을 바꾼다.
  API 30의 실측: 전 `…cloudmessaging.zzd` / `ConnectionResult{` → 후 `yN.b` / `a{` — 나머지(`statusCode=SERVICE_VERSION_UPDATE_REQUIRED, resolution=null, message=null, clientMethodKey=null`)는 같고, 나머지 17줄도 같다.

**통과(주석)로 받아들이는 근거**: ① 같은 태그 · 같은 수준(W) · 같은 문장 구조에서 클래스 이름만 다르다. ② 줄 수가 같다(18 대 18 — 새로 생긴 줄이 없다). ③ 오류 판정 패턴에 걸리지 않는다. ④ 이름이 바뀌는 것은 R8이 하려는 일이고, 축소의 부작용은 이름이 아니라 **줄의 있고 없음**과 오류 패턴으로 드러난다.
**그 밖은 모두 보류다** — 다른 태그의 줄, 이름 말고 다른 값이 다른 줄, 줄 수가 다른 경우는 규칙이 흡수하지 않는다(규칙을 넓히려면 그 줄의 근거를 여기에 한 줄씩 더한다). 정규화로 흡수한 줄은 결과 표에 **원본 그대로** 적는다 — 이 규칙이 통과를 만드는 것이 아니라 읽기를 돕는 것이다.
이 규칙은 **API 30 이미지의 오래된 Play 서비스** 때문에 필요했다. 규칙을 받아들이지 않는 쪽이 맞다고 보면 그 줄은 「판정 보류」로 읽는다(이 문서의 결과는 보류가 아니라 통과(주석)로 적는다).

### S.6 E2 — Maestro `host` → `social` → `legal` → `small` (API 37)

설치하지 않는 실행기들이라 E1의 AAB 설치 상태에서 돌린다(「R8」 표). 화면 설정은 3버튼 · `390x844` · `160` · 글자 배율 1.0(`small`은 스스로 바꾼다).

```sh
export PATH="$ANDROID_HOME/platform-tools:$PATH"      # small 은 adb를 이름으로 부른다
A shell wm size 390x844; A shell wm density 160; A shell settings put system font_scale 1.0
for f in host social legal small; do
  A logcat -c
  pnpm test:e2e:android:$f; echo "$f exit=$?"
  if [ "$f" = social ]; then
    # run-social.sh 는 제공자마다 `logcat -c` 를 하므로 흐름 뒤의 logcat 은 마지막 제공자(facebook)의 것뿐이다.
    # 실행기가 제공자마다 남기는 파일 셋을 합쳐 판정한다
    cat /tmp/libitum-social-apple-logcat.txt /tmp/libitum-social-google-logcat.txt /tmp/libitum-social-facebook-logcat.txt > "$OUT/e2-social.logcat"
    shrink_judge e2-social
  else
    shrink_scan "e2-$f"
  fi
done
cat "$OUT"/e2-*.logcat > "$OUT/e2-all.logcat"
for c in WebAuthenticationModule.randomBytes WebAuthenticationModule.start LegalDocumentModule.open \
         SoundEffectsModule.play.button StorageModule.get SystemBackModule.ready; do
  echo "$c: $(calls "$c" "$OUT/e2-all.logcat")"      # 실제 호출 수 — 줄 수가 아니다(호출마다 2줄)
done
```

| 판정 | 조건 |
|---|---|
| **통과** | 네 흐름 모두 종료 코드 0 · 흐름마다 판정 0줄(`social`은 세 제공자의 로그를 합쳐서) · 위 여섯 호출이 각각 1 이상(합계) |
| **실패** | 흐름이 실패 · 오류 판정 줄 · 호출 줄이 0(먼저 logcat이 잘리지 않았는지 — 흐름마다 `logcat -c`로 나눴으므로 해당 흐름에서 그 호출이 안 일어난 것이다) |
| 닿지 못함 | 골든 임계 미달이 환경(제스처 모드 · 해상도)에서 온 것이면 「전제」 7대로 맞춘 뒤 다시 돌린다. 맞췄는데도 그렇다면 제품 회귀와 가린 다음 결과에 쓴다 |

`debug` 설치가 덮어썼으면(로컬 번들 없음 — 글자 없는 주황 한 면) E1의 `install_aab`로 다시 깐다.
`small`은 `SCALE` 100 · 130을 연달아 돈다(종료 코드 0 하나로 둘이 판정된다).

### S.7 E3 · E4 — 뒤로가기 · 구성 변경 (API 37)

```sh
# E3
install_aab "$AAB" release; A logcat -c; A shell am start -n "$ACT"; sleep 12
step_now                                                 # Step 1 of 3
tap_text "Next" || shot e3-no-next                        # 노드가 없거나 bounds가 비면 1 — 스크린샷으로 위치를 읽어 tap_xy (API 30은 항상 이쪽, 아래)
sleep 2; step_now                                         # Step 2 of 3
A shell input keyevent KEYCODE_BACK; sleep 2; step_now    # Step 1 of 3
A logcat -d | grep -c -F "InvokeMethod, method: (SystemBackModule.respond"       # 1 이상
A shell input keyevent KEYCODE_BACK; sleep 2
A shell dumpsys activity activities | grep -E "topResumedActivity|mResumedActivity"   # MainActivity가 아니라 런처
app_pid                                                   # 아직 있다 — 루트에서의 뒤로가기는 앱을 백그라운드로 보낸다
shrink_scan e3
# E4 — 앱을 다시 앞으로 가져온 뒤 야간 모드를 켰다 끈다
A shell am start -n "$ACT"; sleep 3
PID0=$(app_pid); REC0=$(A shell dumpsys activity activities | grep -o 'ActivityRecord{[0-9a-f]*' | head -1)
shot e4-0; step_now
A logcat -c                                              # events 버퍼도 함께 비운다 — 여기서부터의 wm_on_create/destroy_called 만 센다
A shell cmd uimode night yes; sleep 3; shot e4-yes
A shell cmd uimode night no;  sleep 3; shot e4-no
echo "pid $PID0 -> $(app_pid)"; echo "$REC0 -> $(A shell dumpsys activity activities | grep -o 'ActivityRecord{[0-9a-f]*' | head -1)"
step_now
echo "MainActivity create/destroy during night toggle: $(events_lifecycle)"        # 0 — 재생성 없음
shrink_scan e4
# 양성 대조 — 같은 센 방법이 재생성을 실제로 잡는지(글자 배율은 Activity를 다시 만든다). 0이 나오면 위 0은 아무것도 말하지 않는다
A logcat -c; A shell settings put system font_scale 1.3; sleep 3
echo "MainActivity create/destroy during font_scale 1.3: $(events_lifecycle)"    # 1 이상(실측 2)
A shell settings put system font_scale 1.0
```

| 케이스 | 통과 | 실패 |
|---|---|---|
| **E3** | `Step 2 of 3` → 뒤로 → `Step 1 of 3`(`SystemBackModule.respond` 호출 줄 1 이상) → 한 번 더 뒤로 → 런처가 최상위 · 프로세스 생존 · 오류 판정 0줄 | 뒤로가기에 앱이 종료됨 · 단계가 그대로 · 호출 줄 없음 · 오류 판정 줄 |
| **E4** | 야간 모드 켬 · 끔 전후로 **pid가 같고 `ActivityRecord` 해시가 같고** `Step N of 3`이 같다 · **events 로그의 MainActivity `wm_on_create_called` · `wm_on_destroy_called`가 야간 토글 동안 0이고, 양성 대조(글자 배율 1.3)에서는 1 이상** · `e4-0` · `e4-yes` · `e4-no` 스크린샷이 같은 화면 · 오류 판정 0줄 | pid나 해시가 바뀜(재생성) · events 로그에 생성 · 파괴가 있음 · 화면이 바뀜 · 오류 판정 줄 |

**pid와 `ActivityRecord` 해시는 재생성을 가리지 못한다**(같은 프로세스에서 Activity만 다시 만들어도 같고, 해시는 기록이 남는 한 같다). 그래서 재생성은 events의 생성 · 파괴 호출로 보고, 양성 대조가 0이면 그 숫자를 근거로 쓰지 않는다. events 줄의 정확한 모양은 저장하지 않았다(실행 기록은 센 수만 남겼다) — `grep MainActivity`가 맞지 않으면 `A logcat -b events -d | grep wm_on_create`로 모양을 먼저 본다.
스크린샷 비교는 보조다: 실행에서 `e4-yes`와 `e4-no`는 바이트가 같았으나 `e4-0`만 바이트가 달랐다(원인 미확인 — 육안 · 구조는 같았다). 바이트 동일을 통과 조건으로 쓰지 않는다.

`tap_text`가 노드를 못 찾으면(`Next`가 접근성 트리에 다른 이름일 때) 그 사실을 적고 스크린샷의 위치로 탭한다 — 그래도 못 하면 「닿지 못함」이고 통과로 세지 않는다.
**API 30에서는 `tap_text`가 동작하지 않는다**: Lynx 접근성 노드의 `bounds`가 `[0,0][0,0]`이라 (0,0)을 누르게 된다(`Next` · `Step 1 of 3` 같은 모든 Lynx 노드 — `Step N of 3` 문구 읽기는 된다). `tap_text`는 그 경우 1로 끝나므로 `tap_xy`로 좌표를 눌러야 한다(390x844 · 160의 `Next`는 `tap_xy 195 743`).
이것은 **축소와 무관한 이 이미지 · Lynx의 기존 성질이다** — 축소 전 빌드(`fd6052d9` 사본)의 덤프도 같다(`a30-before-dump.xml`).
**E4는 끝에 야간 모드를 시작 전 값(`$NIGHT0`)으로 되돌린다**(`cmd uimode night yes|no|auto`) — 위 블록은 `no`로 끝나므로 원래 값이 `auto`였다면 되돌려야 한다.

### S.8 E5 — 로그인 뒤 경로 (일회용 사본의 탐침 훅 · API 37)

minify한 설치에는 계측 픽스처가 붙지 않는다(`NoClassDefFoundError: kotlin.jvm.internal.Intrinsics` — 계약 단계의 실측). 그래서 로그인 뒤 화면은 **일회용 사본**의 탐침 훅으로만 본다.
탐침은 제품 트리에 **들어가지 않는다**. 만드는 법과 한계는 아래 「부록 — 탐침」이다 — **먼저 부록 A를 따라 `$OUT/probe-audio.aab`(진도 `audio`)를 만든다.**

```sh
install_aab "$OUT/probe-audio.aab" probe-audio
A shell pm clear "$PKG"; A logcat -c; A shell am start -W -n "$ACT"; sleep 15
dumpui e5a; grep -c 'Journey, selected' "$OUT/e5a.xml"                     # (a) 1 이상
shrink_scan e5a
# (b) 듣기 — 화면 설정 390x844 · 160 · 글자 배율 1.0
A logcat -c; maestro --udid "$E2E_UDID" test e2e/android-audio-playback.yaml; echo "b exit=$?"
A logcat -d > "$OUT/e5b.logcat"; shrink_scan e5b
calls AudioPlaybackModule.play.phone-call-confirm-01 "$OUT/e5b.logcat"    # 3 이상
calls AudioPlaybackModule.stop "$OUT/e5b.logcat"                          # 1 이상
# (c) 설정 — 320x640 · 160, SCALE=1.0 (픽스처 없이 탐침이 세션을 심으므로 pm clear 뒤 재기동)
A shell wm size 320x640; A shell wm density 160; A shell settings put system font_scale 1.0
A shell pm clear "$PKG"; A logcat -c; A shell am start -n "$ACT"; sleep 15
maestro --udid "$E2E_UDID" test -e SCALE=1.0 -e "DOCUMENT_LABEL=Terms of Use" e2e/android-signed-in-settings.yaml; echo "c exit=$?"
shrink_scan e5c
# (d) 알림 — 맵의 종 아이콘(shot으로 위치를 읽는다) → 알림 화면. 권한을 준 뒤 재기동
A shell wm size 390x844; A shell wm density 160
A shell pm grant "$PKG" android.permission.POST_NOTIFICATIONS
A shell am force-stop "$PKG"; A logcat -c; A shell am start -n "$ACT"; sleep 15; shot e5d-map
# → 종 아이콘을 누른다: A shell input tap <x> <y>
sleep 5; shot e5d-notifications
A logcat -d > "$OUT/e5d.logcat"; shrink_scan e5d
calls PushNotificationModule.register "$OUT/e5d.logcat"                   # 1 이상
grep -c 'ProbeSignedIn: http /rest/v1/rpc/register_push_device' "$OUT/e5d.logcat"      # 1 이상 — FCM 토큰을 받아야 나가는 요청
# (e) 맵 → 에피소드 인트로 → 뒤로 : 상태바 아이콘 표지
A shell pm clear "$PKG"; A shell am start -n "$ACT"; sleep 15
A shell dumpsys window | grep 'apr=' | cut -c1-200 | head -3 | tee "$OUT/e5e-map.txt"      # LIGHT_STATUS_BARS 있음
# → 맵의 Episode intro 항목을 누른다(shot으로 위치 — 「상태바 아이콘」 절차의 표 참조)
sleep 3; A shell dumpsys window | grep 'apr=' | cut -c1-200 | head -3 | tee "$OUT/e5e-intro.txt"   # LIGHT_STATUS_BARS 없음
A shell input keyevent KEYCODE_BACK; sleep 3
A shell dumpsys window | grep 'apr=' | cut -c1-200 | head -3 | tee "$OUT/e5e-back.txt"          # 있음
shrink_scan e5e
```

| 항목 | 통과 | 실패 / 닿지 못함 |
|---|---|---|
| (a) 맵 | `Journey, selected` 보임 · `shrink_scan` 0줄 | 실패: 오류 판정 줄 · 프로세스 종료. 닿지 못함: 세션이 심어지지 않아 로그인 화면이 남음(탐침이 적용되지 않은 빌드 — 부록의 확인 줄) |
| (b) `audio-playback` | 흐름 통과 · `AudioPlaybackModule.play.phone-call-confirm-01` 3회 이상 · `.stop` 1회 이상 · 0줄 | 실패: 흐름 실패 · 호출 부족 · 오류 판정 줄 |
| (c) `signed-in-settings` `SCALE=1.0` | 흐름 통과 · 0줄 | 실패: 흐름 실패 · 오류 판정 줄 |
| (d) 알림 | `PushNotificationModule.register` 호출 줄 뒤 `ProbeSignedIn: http /rest/v1/rpc/register_push_device` 1줄 이상 · 0줄 | 실패: 오류 판정 줄. **닿지 못함**: 요청 줄이 없고 오류도 없을 때 — FCM 토큰을 받지 못한 환경(Google Play 이미지가 아님 · 네트워크)이면 이유를 적고 R9로 옮긴다 |
| (e) 상태바 | `dumpsys window`의 `apr=`에 `LIGHT_STATUS_BARS`가 **있음 → 없음 → 있음** · 0줄 | 실패: 전환 순서가 다름. 닿지 못함: 항목에 닿지 못함 |

**한계(결과에 반드시 적는다): 이 빌드의 dex는 출시 바이너리와 같지 않다**(탐침 훅 때문). E5의 통과는 「같은 규칙으로 축소한 앱이 이 경로에서 돈다」다.
`maestro` 흐름의 골든은 환경에 묶인다(「R8」의 골든 설명) — 3버튼 · 해상도를 맞춘 상태여야 한다.

### S.9 E6 — debug · 계측 APK가 바뀌지 않았다

같은 번들 · 같은 커밋 계열에서 **변경 전**(`$BEFORE_SHA` 사본)과 **변경 후**의 `clean :app:assembleDebug :app:assembleDebugAndroidTest`가 만든 두 APK의 sha256이 각각 같아야 한다(AC3).

```sh
(cd apps/android && ./gradlew clean :app:assembleDebug :app:assembleDebugAndroidTest)
shasum -a 256 apps/android/app/build/outputs/apk/debug/app-debug.apk apps/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk | tee "$OUT/e6-after.sha"
(cd "$SCRATCH/before/apps/android" && ./gradlew clean :app:assembleDebug :app:assembleDebugAndroidTest)
(cd "$SCRATCH/before/apps/android/app/build/outputs/apk" && shasum -a 256 debug/app-debug.apk androidTest/debug/app-debug-androidTest.apk) | tee "$OUT/e6-before.sha"
# 파일 경로 열이 달라 sha 열만 견준다
diff <(cut -d' ' -f1 "$OUT/e6-before.sha") <(cut -d' ' -f1 "$OUT/e6-after.sha") && echo "same"
```

(`<( )`는 bash · zsh 모두 된다.) **번들이 같아야 한다** — 사본에는 S.3에서처럼 같은 `main.lynx.bundle`을 복사해 두었다. 계약 단계의 값(`53582226…` · `26bf3efb…`)은 **그 번들 · 그 커밋에서의 값**이라 다른 번들에서 그대로 같지 않다 — 견주는 것은 항상 이 실행의 변경 전 · 후다.

| 판정 | 조건 |
|---|---|
| **통과** | 두 sha가 각각 같다 |
| **같지 않다** | 빌드가 재현되지 않는 환경이다 — 계측 일괄 ①(「R8」의 계측)을 변경 전 · 후 빌드로 각각 돌려 **통과 · 건너뜀 · 실패 수**를 견준다(같으면 통과, 다르면 실패 → 계약으로) |

### S.10 E7 — TalkBack(minify된 `bundled`) · accessibility 단계의 입력

E7은 **accessibility 단계가 읽는 결과**다. R8이 `AccessibilityTapBridge$TapDelegate`의 이름을 바꾼다(`r2.a`) — TalkBack을 켠 상태의 동작은 계약 단계에서 돌리지 않았다.
전제: Google Play 이미지(TalkBack 설치 — 실행기가 `com.google.android.marvin.talkback`을 확인한다). 실행기는 `assembleBundled`로 만든 APK를 깔고 `390x844` · `160`으로 바꾸고 TalkBack을 켠다. **끝나도 TalkBack 설정을 되돌리지 않는다** — 아래에서 직접 되돌린다.

```sh
A_SERVICES0=$(A shell settings get secure enabled_accessibility_services | tr -d '\r'); A_ENABLED0=$(A shell settings get secure accessibility_enabled | tr -d '\r')
(cd apps/android && ./gradlew assembleBundled)
unzip -Z1 apps/android/app/build/outputs/apk/bundled/app-bundled.apk | grep -c '^classes.*\.dex$'      # 1 — 축소된 APK로 도는 표지
A logcat -c
E2E_UDID="$E2E_UDID" pnpm test:e2e:android:talkback; echo "talkback exit=$?"      # 1이고 `touch exploration is not enabled`면 아래 「실행기의 경합」
shrink_scan e7
# TalkBack 되돌림
A shell settings put secure enabled_accessibility_services "$A_SERVICES0"; A shell settings put secure accessibility_enabled "$A_ENABLED0"
```

(원래 값이 `null`이면 `settings delete secure enabled_accessibility_services`로 지운다.)

| 판정 | 조건 |
|---|---|
| **통과** | dex 1 확인 · 실행기 종료 코드 0(TalkBack이 붙은 상태에서 온보딩 · 로그인 화면 흐름 통과) · `shrink_scan` 0줄 |
| **실패** | 흐름 실패 · 오류 판정 줄 → **accessibility 단계가 아니라 계약(keep 규칙)으로 되돌린다** |
| 닿지 못함 | TalkBack이 설치되지 않은 이미지 · TalkBack이 붙지 않음(`TalkBack did not bind`) → 환경 문제. 통과로 세지 않는다 |

TalkBack의 **음성 출력** · 온보딩 · 로그인 화면 밖은 이 절의 범위 밖이다(S.1).

**위 블록 앞에 S.3의 3-b**(`bundled`의 dex가 release AAB의 dex와 같은가 · `google_app_id`가 있는가)를 한다. dex가 1개라는 표지만으로는 json 없이 만든 `bundled`를 가려내지 못한다.

**무엇을 단언하는가(실행 기록 2026-10-08)**: 위 Maestro 흐름이 단언하는 것은 「TalkBack이 바인딩된 상태에서 minify된 앱이 뜨고 죽지 않으며, 온보딩 3단계 → 로그인 화면의 문구와 골든(`android-login-390x844`, 95%)에 닿는다」까지다. **접근성 활성화(`ACTION_CLICK`)나 `AccessibilityTapBridge.TapDelegate` · Lynx 가상 노드가 동작했다는 것은 이 흐름이 증명하지 않는다.** Maestro의 탭과 `adb shell input`은 주입 입력이라 이 에뮬레이터에서 접근성 입력 필터를 우회해 앱 버튼을 직접 누를 수 있다(android-orientation 점검의 관찰) — 그러면 `Next`는 원시 터치로 눌린 것이고 접근성 경로를 지나지 않는다. 「TalkBack이 켜지면 탭은 `ACTION_CLICK` 경로로만 전달된다」는 **확인되지 않은 전제였다**(accessibility 단계 R3). 접근성 활성화의 근거는 아래 「접근성 활성화 단계」다.

#### 접근성 활성화 단계 — 터치 탐색 → 더블탭 → 화면 전이 (accessibility 단계 R1)

왜 필요한가: 출시되는 dex(minify)에서 접근성 활성화를 보는 자동 검사가 없다. 계측 `ButtonAccessibilityTest`는 debug 전용이고 minify된 앱에는 붙지 못한다(`NoClassDefFoundError: kotlin.jvm.internal.Intrinsics` — debug용 androidTest APK가 앱의 Kotlin 표준 라이브러리에 기대는데 R8이 그것을 덜어 냈다. 계측 프로세스에서만 나는 도구 한계다). 위 Maestro 흐름은 TalkBack을 거치지 않았을 수 있다. R8 규칙이 바뀌어 `TapDelegate`나 Lynx 노드 제공자가 깨져도 위 절차는 통과한다. 그래서 TalkBack이 실제로 받는 **하드웨어 수준 터치**(`emu event send`)로 한 번 더 본다. **`adb shell input tap`으로 대신하지 않는다**(입력 필터 우회).

**조건 — 이 단계의 값은 아래 전제에서만 같다.** 기준 사각형은 다음 조건의 측정이다. 하나라도 다르면 사각형 · 버튼 위치가 달라진다(다른 값이 나왔다고 곧 결함은 아니다 — 먼저 조건을 맞춘다).

| 전제 | 값 | 어긋나면 |
|---|---|---|
| 에뮬레이터 | Pixel_8 API 37 · Google Play 이미지(TalkBack 설치) | 다른 이미지의 TalkBack은 링 색 · 모양이 다를 수 있다 |
| 화면 | 물리 크기 **1080x2400 · 420dpi**(`wm size reset` · `wm density reset`) | 좌표 · 사각형이 전부 달라진다. 위 실행기가 바꾼 `390x844 · 160`이 남아 있으면 안 된다 |
| 내비게이션 모드 | **제스처**(`navigation_mode` = 2) | **3버튼에서는 버튼 위치가 달라지고 `Next`의 링이 버튼 전체에 잡힌다**(2026-10-08 최종 검증: `Next` 링 사각형 `(402,2064,678,2210)` — 아래 기준 `(468,2185,551,2214)`과 다름). 위 실행기는 3버튼이 필요하므로(Maestro 골든) **실행기 뒤에 제스처로 되돌려야** 한다 — 아래 블록이 한다 |
| TalkBack | 바인딩됨 · `touch_exploration_enabled` = 1 | 터치가 일반 터치가 되어 링이 없다 |
| 번들 | 모의 값 번들(`example.invalid`) · 글자 배율 1.0 · 앱 데이터 비움(`pm clear`) | 온보딩 1단계가 아니면 좌표가 맞지 않는다 |
| 도구 | `python3`(표준 라이브러리만 — 아래 `ring.py`를 이 블록이 쓴다) | 링 판정을 할 수 없다 |

**무엇으로 판정하는가 — 세 가지이고 모두 재현할 수 있는 것이다.**

1. **화면 전이(주 판정)**: `Next` 더블탭 뒤 2단계가 떴다. 2단계에만 있는 `Back` 버튼 위의 터치 탐색이 링을 만들면(링 사각형 = `Back` 기준) 2단계다 — 1단계에는 그 자리에 버튼이 없다. `a11y-*-t2.png`를 눈으로도 본다(「Practice Korean」 · `Back`).
2. **링 사각형의 일치**: 아래 표의 5지점이 기준 사각형과 **좌표까지 같다**.
3. **두 빌드가 같다**: **같은 절차 · 같은 조건**에서 minify된 `bundled`와 debug를 차례로 돌려 `ring.py`의 출력(사각형 **과 픽셀 수**)이 서로 같다. 이것이 접근성 점검의 관찰 — 「minify가 가상 노드의 존재 · 경계를 바꾸지 않았다」 — 의 재현이다. 픽셀 수는 **같은 도구 · 같은 조건 안에서만** 비교한다 — 이 문서가 싣는 `ring.py`(색 `(105,198,62)` ±14, 8비트 PNG)가 그 도구다. 아래 표의 픽셀 수는 이 도구로 2026-10-08에 두 빌드에서 얻은 **관찰값**이며 판정 기준이 아니다(에뮬레이터 이미지 · 글꼴이 다르면 달라질 수 있다 — 다르면 두 빌드끼리만 견준다).

(2026-10-08 최종 검증이 저장소 밖의 다른 측정 도구로 얻은 픽셀 수 `54 / 2236 / 5396 / 5198 / 540`은 이 도구의 값과 다르다. 사각형 5곳은 같았다. 도구가 다르면 수가 다르다는 뜻이므로 픽셀 수를 도구 밖의 기준으로 쓰지 않는다.)

**1. 전제를 맞추고 TalkBack을 켠다** (위 실행기 뒤이거나 실행기 없이도 된다 — 이미 켜져 있으면 그대로 둔다).

```sh
A shell wm size reset; A shell wm density reset
A shell wm size; A shell wm density                  # Physical size: 1080x2400 · Physical density: 420
NAV1=$(A shell settings get secure navigation_mode | tr -d '\r'); echo "nav=$NAV1"
[ "$NAV1" = 2 ] || A shell cmd overlay enable com.android.internal.systemui.navbar.gestural     # 실행기는 3버튼으로 둔다 — 끝에 S.15가 원래 모드로 되돌린다
A shell settings put secure enabled_accessibility_services com.google.android.marvin.talkback/.TalkBackService
A shell settings put secure accessibility_enabled 1
i=0; until A shell dumpsys accessibility | grep -q 'Bound services:{Service\[label=TalkBack' || [ $i -ge 15 ]; do sleep 1; i=$((i+1)); done
i=0; until [ "$(A shell settings get secure touch_exploration_enabled | tr -d '\r')" = 1 ] || [ $i -ge 15 ]; do sleep 1; i=$((i+1)); done
echo "touch_exploration=$(A shell settings get secure touch_exploration_enabled | tr -d '\r') nav=$(A shell settings get secure navigation_mode | tr -d '\r')"     # 1 · 2
```

**2. 도구** — `ring.py`(링 측정), 기준 사각형, 터치 · 대기 함수. bash · zsh 모두에서 돈다(`set -- $xy` 같은 단어 분리에 기대지 않는다).

```sh
cat > "$OUT/ring.py" <<'PY'
# TalkBack 포커스 링(연두 ≈ 105,198,62 ±14)의 바운딩 박스와 픽셀 수. 표준 라이브러리만 쓴다(PNG 8비트 RGB/RGBA).
import sys, zlib, struct


def load(path):
    d = open(path, 'rb').read()
    assert d[:8] == b'\x89PNG\r\n\x1a\n'
    p = 8
    idat = b''
    while p < len(d):
        n, t = struct.unpack('>I4s', d[p:p + 8])
        body = d[p + 8:p + 8 + n]
        if t == b'IHDR':
            w, h, bd, ct = struct.unpack('>IIBB', body[:10])
        elif t == b'IDAT':
            idat += body
        p += 12 + n
    assert bd == 8 and ct in (2, 6), (bd, ct)
    bpp = 3 if ct == 2 else 4
    raw = zlib.decompress(idat)
    stride = w * bpp
    rows = []
    prev = bytearray(stride)
    q = 0
    for _ in range(h):
        f = raw[q]
        cur = bytearray(raw[q + 1:q + 1 + stride])
        q += 1 + stride
        if f == 1:
            for i in range(bpp, stride):
                cur[i] = (cur[i] + cur[i - bpp]) & 255
        elif f == 2:
            for i in range(stride):
                cur[i] = (cur[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride):
                a = cur[i - bpp] if i >= bpp else 0
                cur[i] = (cur[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = cur[i - bpp] if i >= bpp else 0
                b = prev[i]
                c = prev[i - bpp] if i >= bpp else 0
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pr = a if pa <= pb and pa <= pc else (b if pb <= pc else c)
                cur[i] = (cur[i] + pr) & 255
        rows.append(cur)
        prev = cur
    return w, h, bpp, rows


def ring(path, color=(105, 198, 62), tol=14):
    w, h, bpp, rows = load(path)
    x0 = y0 = 10 ** 9
    x1 = y1 = -1
    n = 0
    r0, g0, b0 = color
    for y, row in enumerate(rows):
        for x in range(w):
            i = x * bpp
            if abs(row[i] - r0) < tol and abs(row[i + 1] - g0) < tol and abs(row[i + 2] - b0) < tol:
                n += 1
                x0, x1 = min(x0, x), max(x1, x)
                y0, y1 = min(y0, y), max(y1, y)
    return (x0, y0, x1, y1, n) if n else None


if __name__ == '__main__':
    if sys.argv[1] == 'dark':    # dark 파일 x y -> 그 픽셀의 r g b 가 모두 100 미만이면 종료 코드 0, 아니면 1
        w, h, bpp, rows = load(sys.argv[2])
        x, y = int(sys.argv[3]), int(sys.argv[4])
        rgb = rows[y][x * bpp:x * bpp + 3]
        print(*rgb)
        sys.exit(0 if max(rgb) < 100 else 1)
    else:                        # ring 이름=파일... -> 「이름 x0 y0 x1 y1 픽셀수」(링이 없으면 「이름 none」)
        for a in sys.argv[2:]:
            name, path = a.split('=', 1)
            r = ring(path)
            print(name, *(r if r else ('none',)))
PY
cat > "$OUT/ring-ref.txt" <<'REF'
t1 468 2185 551 2214
t2 468 2185 551 2214
p1 42 164 188 310
p2 250 1676 830 1783
p3 248 1794 832 1877
p4 426 647 654 730
REF
shot() { A exec-out screencap -p > "$OUT/a11y-$1.png"; }
hwtouch() {              # hwtouch x y [hold초] — 1080x2400 픽셀 좌표를 0..32767 절대 좌표로 바꿔 하드웨어 터치를 보낸다
  X=$(( $1 * 32767 / 1080 )); Y=$(( $2 * 32767 / 2400 )); H=${3:-0.6}
  A emu event send EV_ABS:ABS_MT_SLOT:0 EV_ABS:ABS_MT_TRACKING_ID:7 EV_ABS:ABS_MT_PRESSURE:512 EV_ABS:ABS_MT_TOUCH_MAJOR:5 EV_ABS:ABS_MT_POSITION_X:$X EV_ABS:ABS_MT_POSITION_Y:$Y EV_SYN:0:0 >/dev/null
  sleep "$H"
  A emu event send EV_ABS:ABS_MT_PRESSURE:0 EV_ABS:ABS_MT_TRACKING_ID:-1 EV_SYN:0:0 >/dev/null
}
wait_onboarding() {      # 스플래시(주황 한 면)가 끝나고 온보딩 1단계의 Next 버튼(어두운 남색 — 왼쪽 가장자리 (430,2200))이 그려질 때까지 최대 30초
  i=0
  while [ $i -lt 30 ]; do
    # 알림 권한 창(X1)이 앞이면 앱을 앞으로 올린다. 허용 · 거부를 누르지 않는다(권한 상태가 바뀐다)
    A shell dumpsys window | grep mCurrentFocus | grep -q GrantPermissionsActivity && A shell am start -n libitum.duru.android/com.libitum.host.MainActivity >/dev/null
    shot wait
    python3 "$OUT/ring.py" dark "$OUT/a11y-wait.png" 430 2200 >/dev/null && { sleep 1; return 0; }
    sleep 1; i=$((i+1))
  done
  echo "wait_onboarding: 30초 안에 온보딩 1단계가 뜨지 않았다" >&2; return 1
}
a11y_run() {             # $1 = 이름(bundled | debug), 나머지 = am start에 더할 인자. 앱은 이미 깔려 있어야 한다
  name=$1; shift
  A shell am force-stop libitum.duru.android; A shell pm clear libitum.duru.android >/dev/null
  A shell am start -n libitum.duru.android/com.libitum.host.MainActivity "$@" >/dev/null
  wait_onboarding || return 1
  hwtouch 510 2200 0.6; sleep 1.2; shot "$name-t1"                      # (1) 온보딩 1단계의 Next 위 터치 탐색 → TalkBack 포커스 링
  hwtouch 540 1000 0.05; sleep 0.1; hwtouch 540 1000 0.05; sleep 1.5    # (2) 빈 곳에 더블탭 → 포커스된 Next의 활성화
  shot "$name-t2"
  hwtouch 115 235 0.6; sleep 1.2; shot "$name-p1"                       # (3) 2단계의 네 지점 — 포커스 링 비교용
  hwtouch 540 1730 0.6; sleep 1.2; shot "$name-p2"
  hwtouch 540 1860 0.6; sleep 1.2; shot "$name-p3"
  hwtouch 540 690 0.6; sleep 1.2; shot "$name-p4"
  python3 "$OUT/ring.py" ring t1="$OUT/a11y-$name-t1.png" t2="$OUT/a11y-$name-t2.png" p1="$OUT/a11y-$name-p1.png" \
    p2="$OUT/a11y-$name-p2.png" p3="$OUT/a11y-$name-p3.png" p4="$OUT/a11y-$name-p4.png" > "$OUT/ring-$name.txt"
  cat "$OUT/ring-$name.txt"
}
ring_judge() {           # $1 = 이름. 사각형이 기준과 같은지 — p1이 Back 링이면 2단계로 넘어간 것이다
  awk '{print $1,$2,$3,$4,$5}' "$OUT/ring-$1.txt" | diff "$OUT/ring-ref.txt" - && echo "$1: 링 사각형 6곳이 기준과 같다(p1 = Back → 2단계)"
}
```

**3. minify된 `bundled`에서** (dex 1 — 위 `unzip` 확인):

```sh
A install -r apps/android/app/build/outputs/apk/bundled/app-bundled.apk
a11y_run bundled
ring_judge bundled
```

**4. 같은 절차를 debug에서**(「같은 조건」 — 같은 번들 · 같은 화면 · 같은 TalkBack). debug는 번들 서버가 필요하다(`apps/android/README.md`의 「계측」 절과 같은 18790 서버 — 3000 포트의 서버를 쓰지 않는다):

```sh
python3 -m http.server 18790 --bind 0.0.0.0 --directory apps/mobile/dist >/dev/null 2>&1 &      # `pnpm bundle:android`로 만든 같은 모의 값 번들
BUNDLE_SERVER=$!
(cd apps/android && ./gradlew assembleDebug)
A install -r -t apps/android/app/build/outputs/apk/debug/app-debug.apk
a11y_run debug --es bundle-url http://10.0.2.2:18790/main.lynx.bundle
ring_judge debug
kill "$BUNDLE_SERVER"
diff "$OUT/ring-bundled.txt" "$OUT/ring-debug.txt" && echo "두 빌드의 링이 사각형 · 픽셀 수까지 같다"
```

**화면이 2단계로 넘어갔는지**는 `ring_judge`의 p1(`Back` 링)과 `a11y-bundled-t2.png`(「Practice Korean」과 `Back` 버튼이 보인다 — 눈으로 본다)로 본다. **`uiautomator dump` · `maestro hierarchy`로 확인하지 않는다**: 접근성 서비스를 억제하는 UiAutomation으로 붙어 TalkBack이 풀리고 Lynx 가상 노드가 사라진다(노드 6개, 전부 `content-desc=""`). 온보딩 대기도 같은 이유로 `dump`가 아니라 스크린샷 픽셀(`wait_onboarding`)로 한다.

기준 사각형(`ring-ref.txt`)과 2026-10-08에 `ring.py`로 얻은 픽셀 수(관찰값 — minify된 `bundled`와 debug 모두 같았다):

| 지점 | 터치 좌표 | 기준 사각형 `(x0,y0)-(x1,y1)` | 관찰한 픽셀 수 |
|---|---|---|---|
| 1단계 `Next` (t1 · t2) | (510, 2200) | (468,2185)-(551,2214) | 346 |
| 2단계 `Back` (p1) | (115, 235) | (42,164)-(188,310) | 5868 |
| 2단계 제목 (p2) | (540, 1730) | (250,1676)-(830,1783) | 13924 |
| 2단계 설명 (p3) | (540, 1860) | (248,1794)-(832,1877) | 13900 |
| 2단계 카드 「Correct」 (p4) | (540, 690) | (426,647)-(654,730) | 704 |

| 판정 | 조건 |
|---|---|
| **통과** | ① 더블탭 뒤 2단계(`ring_judge`가 사각형 6곳 일치를 말하고 p1이 `Back`) ② `bundled`의 `ring-bundled.txt`가 `ring-debug.txt`와 **같다**(사각형 · 픽셀 수). 기준 픽셀 수와의 일치는 판정에 쓰지 않는다 |
| **실패** | 더블탭 뒤에도 1단계(p1에 링 없음) 또는 `bundled`의 링이 debug와 다르다 → minify로 `TapDelegate` 또는 Lynx 노드 제공자가 깨졌을 가능성. 매핑(`survivalIssues`)과 `shrink_scan`을 먼저 본다 → 계약(keep 규칙)으로 되돌린다 |
| 판정 불가 | `wait_onboarding`이 30초 안에 끝나지 않음 · 전제 불일치(`wm size` · 내비게이션 모드 · TalkBack) · 사각형이 기준과 다르지만 두 빌드가 서로 같음(조건이 달라졌을 가능성 — 위 「조건」 표를 다시 본다. 3버튼 모드가 대표적이다) |

한계: 활성화가 `TapDelegate`(`AccessibilityDelegateCompat.performAccessibilityAction`)를 지났는지 Lynx의 `LynxAccessibilityNodeProvider.performAction`을 지났는지는 구분하지 못한다(호출 계측 없음). 둘 다 매핑에 살아 있다. 포커스 링은 화면에 그려진 사각형이지 TalkBack이 읽는 문장이 아니다. **TalkBack이 (다시) 바인딩될 때마다 TalkBack의 알림 권한 창(`GrantPermissionsActivity`)이 앱 위에 뜬다(X1)** — `wait_onboarding`이 `am start`로 앱을 앞으로 올리고 허용 · 거부를 누르지 않는다. 끝나면 `dumpsys activity activities`에서 TalkBack의 권한 태스크 id를 찾아 `A shell am stack remove <id>`로 치우고 TalkBack을 되돌린다(위 되돌림 + `wm size`가 위 실행기와 달라졌으면 S.2의 값으로, 내비게이션 모드는 S.15).
**`bundled`는 `google-services.json`이 있을 때 release와 같은 dex다**: 이 단계가 보는 것은 minify된 **`bundled`**다. json이 있으면 `classes.dex`가 release AAB의 것과 바이트가 같다(`b751b2f5…` — S.0). json 없이 만든 `bundled`는 다르다(`24ac3ed6…`; 차이는 R8이 인라인한 `R.string` ID 상수 4곳과 헤더). S.3의 3-b로 확인한 `bundled`에서만 이 단계의 결과를 release의 것으로 읽는다.

**accessibility 단계의 관찰과 이 문서로 다시 돌린 결과(2026-10-08, API 37 에뮬레이터)** — 출처를 구분한다.
- **접근성 점검(accessibility 단계)**: minify된 `bundled`(dex 1)와 HEAD debug를 같은 번들로 차례로 깔아 같은 절차를 돌렸다. `Next` 더블탭이 **2단계로 넘어갔고**(「Practice Korean」, Back 버튼 등장) 포커스 링의 사각형 · 픽셀 수가 두 빌드에서 같았다. 측정 도구는 저장소 밖의 `ring.py`(`sips`로 BMP로 바꿔 읽음)였다. TalkBack이 음성 합성을 요청한 것은 로그로 보았다(`requestAudioFocus … USAGE_ASSISTANCE_ACCESSIBILITY`) — **읽힌 문장은 보지 못했다.**
- **최종 검증(test-runner, HEAD `28c307e4`)**: 문서 그대로 돌리면 (a) 단계 3의 `set -- $xy`가 zsh에서 죽었고 (b) 스플래시가 앞일 때 터치가 시작돼 판정 불가였다. 3버튼 모드에서 `Next` 링 사각형이 `(402,2064,678,2210)`으로 달랐다. 제스처 모드에서는 `Next` 더블탭 → 2단계 전환과 사각형 5곳 일치를 확인했으나, 저장소 밖 도구의 픽셀 수가 달라(54 / 2236 / 5396 / 5198 / 540) 「같은 픽셀 수」는 판정하지 못했다.
- **이 문서를 고친 뒤 test-design이 문서의 블록을 추출해 그대로 돌린 절차 확인**(판정이 아니다 — 아래 표): 위 「2. 도구」의 `ring.py`는 최종 검증이 쓴 도구와 다른 도구(표준 라이브러리 PNG 디코더)이고, 접근성 점검의 옛 스크린샷(`min-t1.png` · `dbg-p1.png`)에서도 같은 346 · 5868을 냈다. 그래서 같은 도구로 두 빌드를 견주는 것이 재현 가능한 판정이다.

| 빌드 | 셸 | 화면 전이 | 링 사각형 6곳 | 픽셀 수(346 · 5868 · 13924 · 13900 · 704) |
|---|---|---|---|---|
| minify된 `bundled`(dex 1) | zsh | 2단계(p1 = Back) | 기준과 같다 | 같다(기준 관찰값과도) |
| minify된 `bundled` | bash | 2단계 | 같다 | 같다 |
| debug(번들 서버 18790 + `--es bundle-url`) | zsh | 2단계 | 같다 | 같다 · `diff ring-bundled ring-debug` 0 |
| debug | bash | 2단계 | 같다 | 같다 · `diff` 0 |

온보딩 대기는 `uiautomator dump`가 TalkBack을 억제하므로 쓰지 않고 스크린샷 픽셀로 한다. logcat의 `DestroyLayoutNodeBeforeRemoveFromParent tag:image`도 스플래시가 끝나는 때(앱 시작 약 2.4초 뒤)에 찍혔으나 Lynx 내부의 오류 수준 문구라 Lynx를 올리면 바뀔 수 있어 쓰지 않는다.
관찰 X1(알림 권한 창): 위에 적었다. 관찰 X2(범위 밖 — 두 빌드 동일): `Next` 위 터치 탐색의 포커스가 버튼 전체가 아니라 안쪽 글자 「Next」 크기(약 84x30px)에 잡힌다. R9 m3에서 한 번의 포커스 정지로 「이름, 버튼」이 읽히는지 본다.
**실행기의 경합(수정함)**: `run-talkback.sh`는 바인딩 확인 직후 `touch_exploration_enabled`를 한 번만 읽어 첫 실행에서 `TalkBack touch exploration is not enabled`로 실패했다(5초 뒤에는 1이었다). 이제 그 값이 1이 될 때까지 1초 간격으로 최대 15번 읽는다. **수정한 스크립트는 기기에서 돌려 보지 않았다** — 모의 `adb`로 「두 번 0 → 1」(통과) · 「계속 0」(15번 읽고 실패)만 확인했다. **최종 검증이 기기에서 1회 돌려 통과했다**(S.0 · S.16 — 1회 표본이라 경합이 없어졌다고는 못 한다).
실행 기록은 1회째 이 경합으로 실패하고 재시도(2회째)에서 통과했다.

### S.11 E8 — API 30(4 KB 페이지)

에뮬레이터를 한 대씩: API 37을 끄고 `R6_API30`을 띄운다(`E2E_UDID`를 새 기기로 바꾼다). 4 KB 기기에서도 같은 AAB로 **E1 · E3 · E4 · E5의 (a)**를 돈다.

```sh
A shell getconf PAGE_SIZE; A shell getprop ro.build.version.sdk       # 4096 · 30
A shell pm list packages | grep libitum                                # 부팅 직후 설치 상태 확인
install_aab "$AAB" api30-release
# 이후 S.5(E1의 설치 분할 · 12초 · 온보딩 · 서명 비교는 이 기기의 축소 전 빌드와 견준다) · S.7(E3 · E4) 그대로 —
# 단 이 기기에서 `tap_text`는 (0,0)을 누르므로 `tap_xy 195 743`(S.7)을 쓴다. API 30에는 HAL 중단 소음이 없어 .errors.raw 도 0줄이었다
install_aab "$OUT/probe-audio.aab" api30-probe-audio                             # 부록 A의 audio 탐침 AAB
# S.8의 (a)만
```

| 판정 | 조건 |
|---|---|
| **통과** | E1 · E3 · E4 · E5 (a)가 각각 API 37과 같은 결과. E4는 API 30에서 pid만 견주어도 된다(`ActivityRecord` 해시를 못 읽으면 적는다) |
| **실패** | 어느 항목이든 오류 판정 줄 · 프로세스 종료 |

API 30의 뒤로가기는 `onBackPressed` 경로(`OnBackInvokedCallback`이 아니다)다 — 이 절은 두 경로의 차이를 따로 관찰하지 않고 **같은 화면 결과**만 본다.

### S.12 E9a ~ E9j — 닿지 못했던 경로의 확장 (회귀 확인)

계약 단계에서 minify한 빌드로 **돌려 보지 못한** 경로를, 일회용 사본의 탐침을 **진도별로 다시 빌드해** 한 번씩 돈다(API 37). red는 없다 — 구현 전 빌드에는 축소가 없어 같은 흐름이 debug에서 이미 통과한다. **회귀 확인이다.**
항목마다 판정은 셋 중 하나다: **통과**(아래 결과 + 오류 판정 0줄) · **실패**(오류 판정 줄 또는 프로세스 종료 → 계약으로 되돌린다) · **닿지 못함**(화면에 들어가지 못했다 — 이유를 적고 R9 목록으로 옮긴다. **통과로 세지 않는다**).

각 항목은 「부록 A」의 `build_probe <진도>`로 만든 AAB를 `install_aab`로 깔고(`pm clear` · `logcat -c`), 화면 설정은 390x844 · 160 · 글자 배율 1.0(E9g만 아래 값)으로 시작한다.

| id | 경로 | 진도 | 한 번에 | 통과 결과 | 닿지 못함 후보 |
|---|---|---|---|---|---|
| E9a | 손글씨 | `writing` | `maestro --udid "$E2E_UDID" test e2e/android-handwriting-trace.yaml` | 흐름 통과 · `calls HandwritingTraceModule.guide`와 `.compare`가 각각 1 이상 | 실행기가 이 흐름을 「전용 AOSP 에뮬레이터」의 것으로 주석한다 — Google Play 이미지에서 흐름이 판정을 못 하면 이유를 적는다 |
| E9b | 완료 안내 | `audio` | `maestro … test e2e/android-completion-announcement.yaml` | 흐름 통과 · `calls CompletionAnnouncementModule.announce.` 1 이상 | 흐름이 TalkBack을 요구하면(실행기의 전제를 먼저 읽는다) 이유를 적는다 |
| E9c | 앱 리뷰 | `review` | `maestro … test e2e/android-app-review.yaml` | 흐름 통과 · `calls AppReviewModule.requestReview` 1 이상. **호출 줄까지만 본다**(Play 리뷰 창은 판정하지 않는다) | — |
| E9d | 비주얼 노벨 | `visualNovel` | 손으로: 맵을 밀어 `Our Imagined Café` 항목(좌표는 `shot`으로 읽는다 — [상태바 아이콘 절차](android-status-bar-icons.md)의 D4 도달 순서) | 장면 그림이 보이는 캡처(`shot e9d`) · `app_pid` 있음 · 0줄 | 항목에 닿지 못함 |
| E9e | 최종 테스트 | `final` | 손으로: 맵 끝의 `Final test` → 도입 서사를 끝까지 넘김(같은 문서의 D3) → 시험 단계 | 시험 단계 화면의 캡처 · 문항 두 개를 넘김 · `app_pid` 있음 · 0줄. **`<svg>`가 그려졌는지는 이 에뮬레이터의 스크린샷으로 판정하지 못한다**(어떤 요소가 `<svg>`인지 화면에서 식별되지 않는다 — 실행에서도 못 했다) → 통과(주석), `<svg>` 화면은 R9로 | 시험 단계까지 닿지 못함 |
| E9f | 연속 학습 모달 | `audio` | 맵 상단의 연속 학습 지표를 누른다 | 모달 캡처 · `app_pid` 있음 · 0줄(모달의 `<svg>`도 스크린샷으로는 식별하지 못한다 — 모달이 그려진 것까지만 본다) | 지표에 닿지 못함 |
| E9g | 설정 글자 배율 1.3 | `audio` | `wm size 320x640` · `font_scale 1.3` 뒤 `maestro … test -e SCALE=1.3 -e "DOCUMENT_LABEL=Privacy Policy" e2e/android-signed-in-settings.yaml` | 흐름 통과 · 0줄 | — |
| E9h | 로그아웃 | `audio` | 설정 → 로그아웃(확인창의 확인) | 진입 화면(`Log in or Sign up`)으로 돌아옴 · `calls StorageModule.remove` 1 이상 · 0줄. **돌아온 뒤 재기동하지 않는다**(탐침은 저장소가 비면 세션을 다시 심는다) | 설정 · 로그아웃 항목에 닿지 못함 |
| E9i | 알림 탭 → 목적지 | — | **이 절은 시도하지 않는다** | — | **닿지 못함(사전 판정)**: 탐침에 픽스처의 알림 게시 방송(`POST_PUSH_FIXTURE`)을 옮기지 않았다 — 옮기면 탐침과 출시 바이너리의 차이가 커진다. `e2e/android-push-open.yaml`은 그 방송이 필요하다. R9로 간다 |
| E9j | 음성 인식 | `speech` | **손으로**(아래 「E9j의 진입」) — `e2e/android-speech-recognition.yaml`은 이 진도에서 좌표가 어긋난다 | `calls SpeechRecognitionModule.getStatus` 또는 `.requestPermissions` 1 이상 · `app_pid` 있음 · 0줄 | 말하기 화면에 닿지 못함. **실제 인식 · 골든 판정은 이 에뮬레이터(Google Play 이미지)에서 못 한다** — 호출 줄까지만 본다 |

**E9j의 진입(손으로)**: 탐침 진도 `speech`로 맵까지 간 뒤 `Say Your Hello` 항목을 눌러 → `Start` → `Speak`(`shot`으로 위치를 읽는다). 마이크 권한 대화상자 `Allow Duru to record audio?`가 뜨면 **`Don't allow`를 고른다**(마이크를 열지 않는다) —
그것으로 `calls SpeechRecognitionModule.requestPermissions` 1을 본다(`getStatus`는 0이었다).
**Maestro 흐름의 한계(고치지 않았다)**: `e2e/android-speech-recognition.yaml`은 고정 비율 좌표(`50%,42%` · `50%,76%`)를 탭한다. 이 진도의 지도 스크롤 위치에서는 그 좌표가 다른 곳을 눌러 `Allow Duru to record audio?` 단언에서 실패했다(exit 1) — **제품 결함이 아니라 흐름의 좌표가 진도의 화면에 맞지 않는 것**이다.
흐름을 고치려면 기기에서 어느 진도 · 스크롤 위치를 쓸지 확인해야 해서 이 작업에서는 문서에 한계로만 남긴다. 그래서 E9j의 통과는 흐름이 아니라 위 손 절차의 결과다.

모든 항목의 첫 줄: `A logcat -c` → 실행 → `shrink_scan e9<x>` → `app_pid`. 호출 집계는 `A logcat -d > "$OUT/e9<x>.logcat"; calls <모듈.메서드> "$OUT/e9<x>.logcat"`로 한다.
**E9의 결과는 탐침 빌드의 것이다**(S.1) — 항목마다 결과 표의 비고에 「탐침 빌드(dex ≠ 출시 바이너리)」를 적는다.
**닿지 못함으로 끝난 항목은 R9 확인 목록(실기)의 해당 항목으로 옮긴다**(이 절은 R9를 고치지 않는다 — 옮길 목록을 결과 표에 적는다).

### S.13 매핑으로 스택 풀기 (`retrace`)

난독화한 빌드의 logcat 스택은 `r2.j` · `SourceFile:19` 같은 모양이다. 푸는 데는 **그 빌드의 `mapping.txt`**가 필요하다.

| 무엇 | 어디 |
|---|---|
| 빌드 산출물 | `apps/android/app/build/outputs/mapping/release/mapping.txt`(release · `bundled`는 `…/mapping/bundled/mapping.txt`). 추적하지 않는다 |
| AAB 안의 사본 | `unzip -p "$AAB" BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map > "$OUT/proguard.map"` — 같은 내용이다 |
| 도구 | Android SDK의 `cmdline-tools`에 든 `retrace`(`"$ANDROID_HOME/cmdline-tools/latest/bin/retrace"`). 없으면 SDK Manager로 `cmdline-tools;latest`를 설치한다 |

```sh
RETRACE="$ANDROID_HOME/cmdline-tools/latest/bin/retrace"
A logcat -d -b crash > "$OUT/crash.txt"                                      # 또는 스택이 든 logcat 발췌
"$RETRACE" "$MAPPING" "$OUT/crash.txt" > "$OUT/crash-retraced.txt"
grep -E 'NoSuchMethodError|LynxLog' "$OUT/crash-retraced.txt" | head
```

**이 명령은 이 작업에서 돌려 보지 않았다**(`retrace`가 어느 SDK 경로에 있는지는 설치마다 다르다). **풀 스택을 낸 빌드의 `mapping.txt`여야 한다** — 같은 소스 · 의존성 · 규칙이면 매핑이 빌드마다 같았지만(이 작업의 관찰: release 3회 `657d490a…`) 소스 · 의존성 · 규칙이 바뀌면 달라지므로, **출시한 빌드의 `mapping.txt` 보관은 사용자 몫이다**(R9). Play에 올린 AAB는 Play가 같은 매핑으로 보고서를 푼다고 알고 있으나 [SDK/문서] 이 작업에서 확인하지 않았다.

### S.14 변이로 본 것 — K1이 없는 빌드

keep 규칙 한 줄(K1: `-keepclasseswithmembers class * { @com.lynx.base.CalledByNative <methods>; }`)이 빠진 빌드는 **기동 즉시 죽는다** — 계약 단계의 관찰이다(`NoSuchMethodError: no static method "Lcom/lynx/base/log/LynxLog;.log(ILjava/lang/String;Ljava/lang/String;IJII)V"` → `JNI DETECTED ERROR IN APPLICATION: mid == null` → `SIGABRT`). E1이 이 결함을 잡는지 보려면 **일회용 사본에서** 재현한다(제품 트리의 규칙 파일은 건드리지 않는다).

```sh
MUT="$(mktemp -d)"                                             # 저장소 밖
git worktree add --detach "$MUT/k1" "$(git rev-parse HEAD)"
cp apps/android/app/google-services.json "$MUT/k1/apps/android/app/"
cp apps/android/app/src/main/assets/main.lynx.bundle "$MUT/k1/apps/android/app/src/main/assets/"
cp -R apps/android/app/src/main/assets/static "$MUT/k1/apps/android/app/src/main/assets/"
( cd "$MUT/k1/apps/android/app" && grep -v 'com.lynx.base.CalledByNative' proguard-rules.pro > proguard-rules.pro.tmp && mv proguard-rules.pro.tmp proguard-rules.pro \
  && grep -c 'com.lynx.base.CalledByNative' proguard-rules.pro; cd .. && ./gradlew clean :app:bundleRelease )     # grep -c 가 0
install_aab "$MUT/k1/apps/android/app/build/outputs/bundle/release/app-release.aab" k1
A logcat -c; A shell am start -W -n "$ACT"; sleep 12
app_pid                                                        # 없다
shrink_scan k1; head "$OUT/k1.errors"                          # NoSuchMethodError … LynxLog.log, JNI DETECTED, SIGABRT, Cmdline, has died 줄
git worktree remove --force "$MUT/k1"
```

**기대: E1의 판정이 「실패」로 나온다**(프로세스 없음 · 오류 판정 줄 > 0). 그렇지 않다면 E1이 이 결함을 못 잡는 것이다 — 결과 표에 적고 계약으로 돌려보낸다.
**실행 기록(2026-10-08, API 37, K1 줄만 뺀 사본 AAB sha `2afc220c…`)**: `LaunchState UNKNOWN` · pid 없음 · `Step 1 of 3` 0 · 오류 판정 줄이 나왔다 — 기대대로 E1이 실패로 나온다. 실행 쪽의 판정은 9줄이었다:
`NoSuchMethodError: no static method "Lcom/lynx/base/log/LynxLog;.log(ILjava/lang/String;Ljava/lang/String;IJII)V"` 2 · `JNI DETECTED ERROR IN APPLICATION: mid == null` 3 · `Fatal signal 6 (SIGABRT) … (LynxTraceInit)` 1 · `Abort message: 'Failed to find staticlog(…)'` 1 · `Process libitum.duru.android (pid 19415) has died` 1 + 덤프 `signal 6` 1.
고친 `shrink_judge`로 저장 로그를 다시 판정하면 **10줄**이다 — 위 줄에 크래시 덤프의 `Cmdline: libitum.duru.android`(앱 덤프를 가리키는 줄)가 더해진다. 같은 로그에서 HAL 덤프 3건(`android.hardwar`)은 pid 단위로 빠졌다(raw 19 → 10).
K2(`@com.lynx.trace.CalledByNative`)를 뺀 빌드는 **죽지 않는다** — 계약 단계에서 기동과 Maestro 네 흐름이 통과했다. 그 규칙은 충돌을 관찰하지 못한 방어 규칙이라 기기 케이스로는 잡히지 않고 정적 검사(I3 · I4)와 매핑 검사(A4)가 진다.
**이 재현 절차는 기기에서 돌려 보지 않았다.**

### S.15 되돌림

```sh
# 원래 설치로 — S.2에서 받아 둔 APK를 다시 깐다(단일 APK의 debug 설치였을 때)
A uninstall "$PKG" > /dev/null 2>&1
A install -r "$OUT"/orig-app/base.apk
A install -r "$OUT"/orig-test/base.apk                          # 계측 APK(패키지 $PKG.test)도 같은 이름으로 받았다면
A shell wm size reset; A shell wm density reset; A shell settings put system font_scale 1.0
A shell cmd uimode night "$NIGHT0"
# Maestro 흐름이 바꾸는 전역값 — 시작 전 스냅샷(settings-before-*.txt)의 값으로 직접 되돌린다. 위의 `wm`·글자 배율과 달리 reset 명령이 없다
grep -H -E '^(accelerometer_rotation|system_locales)=' "$OUT"/settings-before-*.txt     # 없으면 `settings delete <구역> <키>`, 있으면 그 값으로 `settings put <구역> <키> <값>`
A shell pm revoke "$PKG" android.permission.POST_NOTIFICATIONS 2>/dev/null
# 내비게이션 모드는 시작 전 값(`$NAV0`)으로 — 제스처(2)였다면 오버레이를 되돌린다. 3버튼(0)이 원래였다면 그대로 둔다
[ "$NAV0" = 2 ] && A shell cmd overlay enable com.android.internal.systemui.navbar.gestural
[ "$NAV0" = 0 ] && A shell cmd overlay enable com.android.internal.systemui.navbar.threebutton     # S.10의 접근성 단계가 제스처로 바꿨다
settings_snapshot after
for ns in global secure system; do diff "$OUT/settings-before-$ns.txt" "$OUT/settings-after-$ns.txt"; done     # 직접 바꾼 것은 0
A shell pm list packages | grep libitum | diff "$OUT/pm-before.txt" -                                          # 같다
```

부팅마다 바뀌는 값(`phenotype_test_setting` · `bluetooth_address` · `binder_calls_stats` 같은 것)의 차이는 직접 바꾼 것이 아니다. **그 밖의 차이가 남으면 결과 표에 적는다.**
**Maestro(S.6 · S.8 · S.12 · S.10)는 `accelerometer_rotation` · `system_locales` · `display_size_forced` · `display_density_forced`를 바꾼다** — 위 `diff`가 이 값들에서 차이를 보이면 그 흐름이 남긴 것이다.
`accelerometer_rotation` · `system_locales`는 `wm` 명령으로 되돌아오지 않으므로 스냅샷의 값으로 직접 되돌린다(스냅샷에 키가 없었으면 `settings delete`).
**`wm size reset` · `wm density reset`은 값을 되돌리지만 빈 `display_size_forced=` · `display_density_forced=` 키를 남기고, 계측 · Maestro가 `system_locales=en-US`를 남길 수 있다**(2026-10-08 최종 검증에서 diff가 0이 아니었다). 스냅샷에 키가 없었으면 지운다:

```sh
for k in display_size_forced display_density_forced system_locales; do
  grep -q "^$k=" "$OUT"/settings-before-global.txt "$OUT"/settings-before-secure.txt "$OUT"/settings-before-system.txt || {
    for ns in global secure system; do A shell settings delete "$ns" "$k" > /dev/null 2>&1; done; }
done
```
 2026-10-08 실행에서는 이 목록이 없어 직접 복원하지 않았고, Pixel_8은 재부팅의 스냅샷 복원으로 차이 0이 되었을 뿐이다. `git worktree list`에 이 절이 만든 사본이 남지 않았는지 확인한다(`git worktree prune`).
**두 에뮬레이터를 동시에 켜지 않았는지 · 3000 포트 서버를 건드리지 않았는지**도 결과에 적는다. 앱 데이터는 `pm clear`로 비워진 상태가 정상이다.

### S.16 결과 표 (이 절의 것 — 위 「결과 표」에 한 줄로 합치지 않는다)

빌드한 SHA: `47982c7019e3001dc576968e86736f8a73885d7e`(`47982c70`) · AAB sha256: `7df2fa84…bcbc48` · 번들 sha256: `0a1c34fb…` · 날짜: 2026-10-08(에뮬레이터 시계 2026-10-07 23:34 ~ 2026-10-08 00:25) · 실행한 사람: test-runner ·
기기: Pixel_8 API 37(16384) · R6_API30 Android 11(4096).

| 케이스 | 빌드 | 기기 | 결과 | 근거 · 비고 |
|---|---|---|---|---|
| E1 | release AAB(분할 base + arm64_v8a + en + xxhdpi) | API 37 | **통과** | 4분할 · COLD 2051ms · 12초 뒤 pid 있음 · `Step 1 of 3` 1 · 대화상자 문구 0 · 판정 0줄(원본 21 = 전부 HAL) · **서명 21줄 대 21줄 · 차이 0** |
| E2 `host` · `social` · `legal` · `small` | 같은 설치 | API 37 | **통과** | 종료 코드 모두 0(`small`은 SCALE 100 · 130) · 판정 0줄(`social`은 세 제공자의 실행기 로그를 합쳐) · 호출 수: `WebAuthenticationModule.randomBytes` 3 · `.start` 3 · `LegalDocumentModule.open` 1 · `SoundEffectsModule.play.button` 18 · `StorageModule.get` 18 · `SystemBackModule.ready` 6 |
| E3 | 같은 설치 | API 37 | **통과** | Step 1 → Next → Step 2 → 뒤로 → Step 1 → 뒤로 → 런처 · pid 24505 생존 · `SystemBackModule.respond` platform 호출 2 · 0줄 |
| E4 | 같은 설치 | API 37 | **통과** | pid 24505 · `ActivityRecord` 97302947 · Step 1 동일 · events 로그 MainActivity `wm_on_create/destroy_called` 야간 토글 중 **0**, 양성 대조(글자 배율 1.3) **2** · `e4-yes` = `e4-no` 바이트 동일, `e4-0`만 바이트가 다름(원인 미확인 — 육안 · 구조는 같다) · 0줄. 야간 모드는 원래 값 `no`로 끝냄 |
| E5 (a) 맵 | 탐침 AAB `audio`(sha `68139b92…`) — **탐침 빌드(dex ≠ 출시 바이너리)** | API 37 | **통과** | `Journey, selected` 1 · 0줄 · pid 생존 |
| E5 (b) `audio-playback` | 탐침 `audio` | API 37 | **통과** | exit 0 · `play.phone-call-confirm-01` 호출 3 · `stop` 1 · 0줄 |
| E5 (c) `signed-in-settings` | 탐침 `audio` | API 37 | **통과** | 320x640 · SCALE=1.0 · `Terms of Use` · exit 0 · 0줄 |
| E5 (d) 알림 | 탐침 `audio` | API 37 | **통과** | 종 아이콘 → `Notifications` 화면 · `PushNotificationModule.register` 호출 1 · `ProbeSignedIn: http /rest/v1/rpc/register_push_device` 1줄 · 0줄. **요청은 탐침이 갈아 끼운 `ILynxHttpService` 대역이 받는다 — 기기 밖으로 나가지 않는다**(경로만 로그) |
| E5 (e) 상태바 | 탐침 `audio` | API 37 | **통과** | `apr=`: 맵 `LIGHT_STATUS_BARS` 있음 → 에피소드 인트로 없음 → 뒤로 있음 · 0줄 |
| E6 | debug · androidTest APK | — | **통과** | 변경 전 · 후 clean 빌드 sha 동일: `53582226137fd6ae…` · `26bf3efbe1db2054…`(기기에 원래 깔려 있던 계측 APK의 sha와도 같다) |
| E7 | minify된 `bundled`(dex 1) | API 37 | **통과(2회째)** | **1회째 exit 1**: `TalkBack touch exploration is not enabled`(`run-talkback.sh`의 경합 — 5초 뒤 값은 1이었다) · 오류 0줄. **2회째 exit 0**: TalkBack을 켠 채 온보딩 → 로그인 화면 · 골든 95% 일치 · 0줄 · pid 생존. 재시도 1회(정책 한도 2회 안). **결과는 「TalkBack 바인딩 상태에서 기동 · 화면 전이 · 골든 일치」까지다 — Maestro 탭은 TalkBack을 우회할 수 있어 `ACTION_CLICK` · `TapDelegate`를 증명하지 않는다**(S.10). **accessibility 단계의 관찰**(그때는 test-runner가 돌린 것이 아니었다 — HEAD `6eb51a61`에서는 판정으로 돌렸다, 아래 표): 하드웨어 터치 더블탭으로 minify된 `bundled`에서 `Next` → 2단계 전이, debug와 포커스 링 6캡처 동일 · 읽힌 문장은 못 봄(S.10) |
| E8 E1 | release AAB | API 30 | **통과(주석)** | 4분할 · COLD · Step 1 · 0줄 · 서명 18줄 대 18줄 · 원본 차이 1줄(규칙의 「이름만 다른 줄」 — S.5)이고 정규화 뒤 차이 0 |
| E8 E3 | release AAB | API 30 | **통과** | Step 1 → 2 → 1 → 런처 · pid 생존 · `respond` 호출 1 · 0줄 · **탭은 좌표**(`tap_xy 195 743`) |
| E8 E4 | release AAB | API 30 | **통과** | pid 5390 동일 · `ActivityRecord` e11dc38 동일 · events create/destroy 0 · 양성 대조 2 · 스크린샷 3장 해시 동일 · 0줄 |
| E8 E5 (a) | 탐침 `audio` | API 30 | **통과** | `Journey, selected` 1 · 0줄 · `ProbeSignedIn: http` 7줄 |
| E9a 손글씨 | 탐침 `writing`(`2f5e3680…`) | API 37 | **통과** | `android-handwriting-trace.yaml` exit 0(골든 94% 둘 — Google Play 이미지에서도 판정됨) · `HandwritingTraceModule.guide` 1 · `.compare` 1 · 0줄 |
| E9b 완료 안내 | 탐침 `audio` | API 37 | **통과** | exit 0(골든 2개) · `CompletionAnnouncementModule.announce.` 1 · `LynxAccessibilityModule.accessibilityAnnounce` 0 · 0줄 |
| E9c 앱 리뷰 | 탐침 `review`(`324553a4…`) | API 37 | **통과** | exit 0 · `AppReviewModule.requestReview` 1 · 0줄. Play 리뷰 창은 판정하지 않음 |
| E9d 비주얼 노벨 | 탐침 `visualNovel`(`0dbdf3c7…`) | API 37 | **통과** | `Our Imagined Café` → 장면 그림 + 대사 보임 · pid 생존 · 0줄 |
| E9e 최종 테스트 | 탐침 `final`(`a2820f3e…`) | API 37 | **통과(주석)** | 도입 서사 5장 → 선택지 시험 단계 2문항 · pid 유지 · 0줄(4회 스캔). **`<svg>`가 이 화면에 있는지는 스크린샷으로 식별하지 못했다** → R9 m4 |
| E9f 연속 학습 모달 | 탐침 `audio` | API 37 | **통과** | 불꽃 지표 → 모달(`0 day streak`) · pid 생존 · 0줄 |
| E9g 글자 배율 1.3 | 탐침 `audio` | API 37 | **통과** | 320x640 · font_scale 1.3 · SCALE=1.3 · `Privacy Policy` · exit 0 · 0줄 |
| E9h 로그아웃 | 탐침 `audio` | API 37 | **통과** | 설정 → `Sign out` → 확인 → `Log in or Sign up` · `StorageModule.remove` 호출 2 · 0줄 · 재기동 안 함 |
| E9i 알림 탭 → 목적지 | — | — | **닿지 못함**(사전 판정, 시도하지 않음) | 탐침에 `POST_PUSH_FIXTURE` 방송이 없다 → R9 m1 |
| E9j 음성 인식 | 탐침 `speech`(`63134bfe…`) | API 37 | **통과(손으로)** | Maestro 흐름은 exit 1(`Allow Duru to record audio?` 단언 — 고정 좌표 문제, 흐름은 고치지 않았다). 손으로 `Say Your Hello` → Start → Speak: 권한 대화상자 표시, `Don't allow` · `requestPermissions` 호출 1 · `getStatus` 0 · pid 생존 · 0줄. **허용 뒤의 실제 인식은 하지 않았다** → R9 m2 |
| 변이 K1 | K1 줄을 뺀 release AAB(sha `2afc220c…`, 일회용 사본 — 제거함) | API 37 | **E1 판정이 「실패」로 나옴 — 기대대로** | `LaunchState UNKNOWN` · pid 없음 · `Step 1 of 3` 0 · 판정 9줄(고친 함수로 10줄 — S.14): `NoSuchMethodError … LynxLog.log` · `JNI DETECTED … mid == null` · `Fatal signal 6 (SIGABRT) … (LynxTraceInit)` · `Abort message: 'Failed to find staticlog(…)'` · `Process libitum.duru.android (pid 19415) has died` |
| 최소 확인: 스플래시 | minify된 `bundled` | API 37 | **통과** | `splash-wordmark-repeat.sh --build bundled --count 10 --cold clear --shot` 수정 없이: PASS **10/10** · 판정 불가 0 · `onFailed` 0 · 스플래시 길이 중앙값 2660ms(기록만) · 캡처에 워드마크가 그려짐. **표본 10회의 한계** — R9 j |
| 최소 확인: 16 KB 대화상자 | release | API 37 | **통과** | E1 dump의 호환성 문구 0 |
| 최소 확인: 효과음 · 오디오 호출 | release · 탐침 | API 37 | **통과** | `SoundEffectsModule.play.button` 18 · `AudioPlaybackModule.play` 3 / `stop` 1 · `SoundEffectsModulefailed` 0 |

**최종 검증(2026-10-08 · HEAD `28c307e4` · test-runner)이 더한 행** — 위 표는 `47982c70`의 실행이고 아래는 그 뒤 고친 절차 · 도구를 기기에서 다시 본 것이다. **출처를 구분한다.**

| 케이스 | 출처 | 기기 | 결과 | 근거 · 비고 |
|---|---|---|---|---|
| E1 판정 함수(커밋본 `shrink_judge`) | test-runner | API 37 · API 30 | **통과** | 판정 0줄(API 37 원본 9줄 = 시스템 HAL pid 6개 제외 · API 30 원본 0) · 5회 콜드 스타트 0줄 · FATAL 0 |
| E7 `run-talkback.sh`(고친 폴링) | test-runner | API 37 | **1회째 통과** | exit 0 · 골든 95% · 0줄. X1 창이 두 번 떴으나(기동 직후 · 흐름 뒤) 흐름을 막지 않음. 1회 표본 |
| E7 접근성 활성화 단계, 옛 문서 그대로 | test-runner | API 37 | **판정 불가** | zsh에서 `set -- $xy`가 죽었고 스플래시에서 터치가 시작됨 |
| E7 접근성 활성화 단계, 제스처 모드 · 대기 뒤 | test-runner | API 37 | **전이 확인 · 링 사각형 5곳 일치** | 픽셀 수는 저장소 밖 도구라 기준과 달라 판정하지 못함 |
| E7 접근성 활성화 단계, **고친 문서의 블록을 추출해 그대로**(`bundled` · debug × zsh · bash) | test-design의 절차 확인 — **판정이 아니다** | API 37 | 4회 모두 2단계 전이 · 사각형 6곳 일치 · 픽셀 수 346 / 5868 / 13924 / 13900 / 704 · `bundled` = debug | S.10의 표 |
| 변이 K1 · K2 · `abiFilters` · bundled `minifyEnabled false` | test-runner | 일회용 사본(기기 아님) | **기대한 케이스에서 실패** | S.0의 로그 |
| release ↔ `bundled` dex (최종 검증) | test-runner | — | **json 없는 빌드의 APK를 견준 것으로 보인다** | `24ac3ed6…`은 `google-services.json` 없는 재현 빌드와 해시가 전체 일치한다(출처는 NA6이 남긴 `bundled`로 읽는다 — 로그의 순서와 뒤 빌드의 재실행 태스크로 지지, NA6 직후의 APK를 직접 해시한 실행은 없다). 아래 리뷰 뒤 행으로 정정 |

**리뷰 뒤 행(2026-10-08 · HEAD `6eb51a61` · test-runner — `review-p1.md`, 에뮬레이터 API 37 Pixel_8 · S.0의 「리뷰 뒤 실행」)**:

| 케이스 | 출처 | 기기 | 결과 | 근거 · 비고 |
|---|---|---|---|---|
| release ↔ `bundled` dex | test-runner | — | **json 있으면 같다**(재현 6가지 호출) · json 없으면 다르다 | clean 한 번 호출 2회 · 증분 · 단독 · verify 호출 · `run-talkback.sh` 방식 모두 `b751b2f5…`. json 없는 `bundled` `24ac3ed6c013…` |
| `pnpm verify` · `pnpm test:android-bundle` | test-runner | — | **통과** · 123/123 | exit 0, 94초 |
| E7 접근성 활성화 단계 — 문서에서 추출한 블록 그대로, **판정으로** | test-runner | API 37 | **통과** | zsh만 · 1회 표본 · minify된 `bundled`(release와 같은 dex)와 debug 모두 2단계 전이 · 링 사각형 6곳 기준과 일치 · 두 빌드 diff 0 · 픽셀 수까지 같음. TapDelegate 경유 구분 · 읽힌 문장은 못 봄 |

**축소 전후 서명 차이**: API 37 — 각 21줄, **차이 0**(둘 다 `ClassNotFoundException: com.lynx.primjs.wasm.RegisterWebAssembly` 1줄을 가진다 — 축소가 만든 줄이 아니다). API 30 — 각 18줄, **원본 차이 1줄**(나머지 17줄 같음):

- 전: `W GoogleApiManager: The service for com.google.android.gms.internal.cloudmessaging.zzd is not available: ConnectionResult{statusCode=SERVICE_VERSION_UPDATE_REQUIRED, …}`
- 후: `W GoogleApiManager: The service for yN.b is not available: a{statusCode=SERVICE_VERSION_UPDATE_REQUIRED, …}`

S.5의 규칙(「난독화된 이름만 다른 줄」)에 해당해 **통과(주석)** — 정규화(`sig_norm`) 뒤 차이 0, 줄 수 같음, 오류 패턴에 안 걸림. 실행 쪽의 같은 판단(주석으로 셈)을 이 규칙으로 옮긴 것이다. 규칙을 받아들이지 않으면 E8 E1은 「판정 보류」다.
축소 후 새로 생긴 오류 줄은 없다. 축소 전에도 있던 줄: `RegisterWebAssembly` ClassNotFound · `LynxRecorderReplayDataModulefailed` · `AppleSignInModulefailed`(E2 `social`, iOS 전용 모듈 조회 — 축소 전 사본에서 같은 줄 1건).

**되돌림**: API 30 — 앱 제거 · wm reset · 글자 1.0 · 야간 no → 설정 3구역 diff 0 · 패키지 목록 diff 0 · 에뮬레이터 종료. Pixel_8 — API 30 뒤 `-no-snapshot-save`로 재부팅하자 스냅샷으로 돌아가 `libitum.duru.android`와 `.test`가 없었다(`com.libitum.host`와 그 test는 활성) → HEAD debug(`53582226…`) + androidTest(`26bf3efb…`) 재설치 · `pm clear`. 설정 diff는 부팅마다 바뀌는 값 3개뿐(`binder_calls_stats` · `phenotype_test_setting` · `bluetooth_address`).
**Maestro가 바꾸는 전역값(`accelerometer_rotation` · `system_locales` · `display_*_forced`)은 직접 되돌리지 않았다** — Pixel_8의 재부팅 스냅샷 복원으로 diff 0이 되었을 뿐이다(그래서 S.15에 목록을 더했다). `git worktree list`에 사본이 남지 않음 · 에뮬레이터는 마지막에 Pixel_8 한 대 · 3000 포트 서버 그대로. 실제 서버로의 요청 없음.

**결과 표의 「통과」는 S.1의 확인되지 않은 것을 통과로 바꾸지 않는다.** 한 케이스라도 실패면 구현을 고치지 말고 **계약(`android-abi-minify`의 keep 규칙)으로 되돌린다.**

### S.17 이 실행이 고친 것 (절차 · 도구 결함 11건 — 제품 결함 아님)

이 절의 이전 판은 첫 실행에서 아래 이유로 그대로는 돌지 않았다. 고친 곳과 이유를 남긴다(번호는 실행 기록의 번호). **고친 함수는 저장 logcat으로 다시 판정만 했고 기기에서 다시 돌리지 않았다.**

| # | 결함 | 고침 |
|---|---|---|
| 1 | `shrink_scan`이 시스템 HAL(`android.hardwar`)의 `SIGABRT`에 걸려 건강한 release E1에서 9줄(원본 21줄) | S.2 `shrink_judge`: 줄의 내용이 아니라 **프로세스**로 거른다(`crash_dump`의 `Cmdline: /…` · `Fatal signal … pid N (이름)`). 앱 줄은 남기고, 앱이 죽은 K1에서도 잡는다(`has died` · 앱 `Cmdline`). S.4 |
| 2 | `SHRINK_EXCL`에 `AppleSignInModulefailed` 없음 — E2 `social` 1줄 | 제외에 추가. 축소 전 사본에서도 같은 줄(iOS 전용 모듈 조회). S.4 |
| 3 | `calls`가 호출당 2줄을 셈(`will fire` + `call platform implementation`) | `call platform implementation` 줄만 센다(S.2). 기준 「3 이상」은 실제 호출 3회 |
| 4 | 사본에 `main.lynx.bundle`만 복사해 `verifyBundledAssets`가 `Release static assets missing` | `assets/static/`도 복사(S.3 · S.14 · 부록 A) |
| 5 | `run-social.sh`가 제공자마다 `logcat -c` — 흐름 뒤 판정이 마지막 제공자만 봄 | 실행기가 남기는 `/tmp/libitum-social-{apple,google,facebook}-logcat.txt`를 합쳐 `shrink_judge`(S.6) |
| 6 | E4의 재생성 판정이 약함(pid · `ActivityRecord`는 재생성을 못 가림) | events 로그의 `wm_on_create/destroy_called` + 양성 대조(S.7) |
| 7 | API 30에서 `tap_text`가 (0,0)을 탭함(노드 `bounds` 비어 있음 — 축소와 무관) | `tap_text`가 (0,0)이면 1로 끝나고 `tap_xy` 좌표 탭으로 대체(S.2 · S.7) |
| 8 | 서명 비교가 난독화된 이름을 흡수하지 못함(API 30 `GoogleApiManager` 1줄) | `sig_norm` + 판정 규칙(S.5): 이름만 다른 한 종류의 줄은 통과(주석), 그 밖은 보류 |
| 9 | `run-talkback.sh`가 바인딩 확인 직후 `touch_exploration_enabled`를 한 번만 읽음 | 값이 1이 될 때까지 1초 간격 폴링(최대 15회)(S.10). 기기에서는 돌려 보지 않음 |
| 10 | `e2e/android-speech-recognition.yaml`의 고정 % 좌표가 이 진도의 스크롤 위치에서 어긋남 | **흐름은 고치지 않았다**(기기 확인 필요). 손 진입 절차와 한계를 S.12에 적음 |
| 11 | E9e의 「`<svg>` 포함」은 스크린샷으로 판정 불가 · `install_aab`는 `adb` PATH · S.15 복구 목록에 Maestro가 바꾸는 전역값 없음 | 통과 조건을 「시험 단계 도달」로 낮추고 `<svg>`는 R9 m4(S.12) · `install_aab`는 `--adb="$ADB"`를 이미 줌 · S.15에 `accelerometer_rotation` · `system_locales` · `display_*_forced` 추가 |

### 부록 — 일회용 탐침 (저장소 트리에 커밋하지 않는다)

계약 단계가 로그인 뒤 화면에 닿은 방법이다. **제품 트리에 들어가지 않는다 — 일회용 사본(저장소 밖의 `git worktree`)에서만 쓴다.** 훅은 `SignedInScreenFixtureTest`의 세션 · 진도 심기와 HTTP 대역을 release 앱 안으로 옮긴 클래스 하나(`ProbeSignedIn`)다.
**한계**: 이 훅이 Lynx HTTP 클래스 몇을 더 쓰므로 **탐침 빌드의 dex는 출시 바이너리와 같지 않다**(S.1). 기록은 저장소에 남기지 않은 계약 단계의 작업 폴더에 있었다 — 이 부록이 그 내용을 옮긴 정본이다.
탐침이 하는 일: ① `libitum.auth.session`이 비어 있으면 세션과 진도를 저장소에 심고 ② `ILynxHttpService`를 대역으로 갈아 끼워 토큰 갱신 · 진도 불러오기에 모의 응답을 준다(요청 **경로만** `ProbeSignedIn` 태그로 로그에 남긴다 — 토큰 · 본문은 남기지 않는다).
**진도는 사본 안에서만 고른다** — 아래 `build_probe`가 소스의 한 줄(`PROGRESS = AUDIO_PROGRESS;`)을 바꾼다. 이 문서는 계약이 말한 `-PprobeProgress` 대신 이 한 줄 치환을 쓴다(제품 `build.gradle`을 사본에서도 고치지 않으려는 것이다).

**A. 사본 만들기 · 진도별 AAB 빌드**

```sh
PROBE="$(mktemp -d)/probe"                                     # 저장소 밖
git worktree add --detach "$PROBE" "$(git rev-parse HEAD)"
cp apps/android/app/google-services.json "$PROBE/apps/android/app/"
cp apps/android/app/src/main/assets/main.lynx.bundle "$PROBE/apps/android/app/src/main/assets/"   # 모의 값 번들 그대로
cp -R apps/android/app/src/main/assets/static "$PROBE/apps/android/app/src/main/assets/"          # 없으면 verifyBundledAssets 가 멈춘다
PJ="$PROBE/apps/android/app/src"
# 1) 부록 C의 ProbeSignedIn.java 를 $PJ/release/java/com/libitum/host/ProbeSignedIn.java 로 저장한다(복사)
# 2) DuruApplication.onCreate 의 LynxEnv.inst().init(...) 바로 뒤에 한 줄을 더한다 — 부록 B의 diff와 같은 한 줄이다
```

부록 B의 diff를 `git -C "$PROBE" apply`로 적용해도 되고(줄 번호가 어긋나면 실패한다), 아래 한 줄 삽입이 같은 일을 한다:

```sh
perl -0pi -e 's/(LynxEnv\.inst\(\)\.init\(this, null, null, null\);\n)/$1    ProbeSignedIn.install(this);\n/' "$PJ/main/java/com/libitum/host/DuruApplication.java"
grep -c 'ProbeSignedIn.install' "$PJ/main/java/com/libitum/host/DuruApplication.java"          # 1
# bundled · debug 변형도 컴파일해야 한다면 빈 대역을 둔다(AAB만 만들면 필요 없다 — release 소스 세트만 컴파일된다)
for v in bundled debug; do
  mkdir -p "$PJ/$v/java/com/libitum/host"
  printf 'package com.libitum.host;\nfinal class ProbeSignedIn { static void install(android.content.Context c) {} }\n' > "$PJ/$v/java/com/libitum/host/ProbeSignedIn.java"
done
build_probe() {   # $1 = audio | speech | writing | review | visualNovel | final  → $PROBE_AAB
  case "$1" in
    audio) n=AUDIO ;; speech) n=SPEECH ;; writing) n=WRITING ;; review) n=REVIEW ;;
    visualNovel) n=VISUAL_NOVEL ;; final) n=FINAL ;; *) echo "unknown progress $1"; return 1 ;;
  esac
  f="$PJ/release/java/com/libitum/host/ProbeSignedIn.java"
  perl -pi -e "s/PROGRESS = [A-Z_]+_PROGRESS;/PROGRESS = ${n}_PROGRESS;/" "$f"
  grep -c "PROGRESS = ${n}_PROGRESS;" "$f"                                   # 1 — 적용된 진도
  ( cd "$PROBE/apps/android" && ./gradlew :app:bundleRelease ) || return 1
  PROBE_AAB="$OUT/probe-$1.aab"; cp "$PROBE/apps/android/app/build/outputs/bundle/release/app-release.aab" "$PROBE_AAB"
  shasum -a 256 "$PROBE_AAB"
  unzip -Z1 "$PROBE_AAB" | grep -c '^base/dex/'                               # 1 — 축소됐다
}
build_probe audio                                                             # E5 · E8 · E9b · E9f ~ E9h
```

진도마다 `build_probe <이름>` 뒤 `install_aab "$OUT/probe-<이름>.aab" probe-<이름>`을 한다. 끝나면 `git worktree remove --force "$PROBE"`로 사본을 지운다(사본은 `mktemp -d` 아래에 있다 — `git worktree prune`으로 확인).
탐침이 적용됐는지는 기동 15초 뒤 `Journey, selected`(맵)로 본다 — 로그인 화면이 남으면 훅이 불리지 않은 것이다.

**B. `DuruApplication`의 diff**(한 줄)

```diff
--- a/apps/android/app/src/main/java/com/libitum/host/DuruApplication.java
+++ b/apps/android/app/src/main/java/com/libitum/host/DuruApplication.java
@@ -16,6 +16,7 @@ public final class DuruApplication extends Application {
     LynxServiceCenter.inst().registerService(LynxLogService.INSTANCE);
     LynxServiceCenter.inst().registerService(LynxHttpService.INSTANCE);
     LynxEnv.inst().init(this, null, null, null);
+    ProbeSignedIn.install(this);
     DuruFirebaseMessagingService.createChannel(this);
   }
 }
```

**C. `ProbeSignedIn.java`**(`app/src/release/java/com/libitum/host/` — 진도 상수는 `SignedInScreenFixtureTest`의 것을 옮긴 것이다. 그 테스트의 상수가 바뀌면 이 부록도 고친다)

```java
package com.libitum.host;

import android.content.Context;
import android.util.Log;
import com.lynx.jsbridge.network.HttpRequest;
import com.lynx.jsbridge.network.HttpResponse;
import com.lynx.jsbridge.network.HttpStreamingDelegate;
import com.lynx.react.bridge.JavaOnlyMap;
import com.lynx.tasm.service.ILynxHttpService;
import com.lynx.tasm.service.LynxHttpRequestCallback;
import com.lynx.tasm.service.LynxServiceCenter;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/** PROBE ONLY - never commit to the product tree (android-abi-minify). */
final class ProbeSignedIn {
  private static final String REFRESH_URL =
      "https://example.invalid/auth/v1/token?grant_type=refresh_token";
  private static final String LOAD_PROGRESS_PATH = "/rest/v1/rpc/load_learning_progress";
  private static final String AUDIO_PROGRESS = "{\"version\":1,\"completedStepCount\":5,"
      + "\"completedEpisodeIntroIds\":[\"tutorial-intro\"],"
      + "\"completedMessengerUnitIds\":[\"appointment-confirmation\"],"
      + "\"completedPhoneCallUnitIds\":[\"appointment-confirmation-phone-call\"],"
      + "\"visualNovel\":{\"status\":\"completed\",\"beatIndex\":2},"
      + "\"completedEpisodeFinalIds\":[]}";
  private static final String SPEECH_PROGRESS = "{\"version\":1,\"completedStepCount\":6,"
      + "\"completedEpisodeIntroIds\":[\"tutorial-intro\"],"
      + "\"completedMessengerUnitIds\":[\"appointment-confirmation\"],"
      + "\"completedPhoneCallUnitIds\":[\"appointment-confirmation-phone-call\"],"
      + "\"completedVisualNovelUnitIds\":[\"cafe-arrival-visual-novel\"],"
      + "\"visualNovel\":{\"status\":\"completed\",\"beatIndex\":2},"
      + "\"completedEpisodeFinalIds\":[]}";
  private static final String WRITING_PROGRESS = SPEECH_PROGRESS.replace(
      "\"completedStepCount\":6", "\"completedStepCount\":7");
  private static final String VISUAL_NOVEL_PROGRESS = "{\"version\":1,\"completedStepCount\":4,"
      + "\"completedEpisodeIntroIds\":[\"tutorial-intro\"],"
      + "\"completedMessengerUnitIds\":[\"appointment-confirmation\"],"
      + "\"completedPhoneCallUnitIds\":[\"appointment-confirmation-phone-call\"],"
      + "\"visualNovel\":{\"status\":\"active\",\"beatIndex\":0},"
      + "\"completedEpisodeFinalIds\":[]}";
  private static final String FINAL_PROGRESS = "{\"version\":1,\"completedStepCount\":8,"
      + "\"completedEpisodeIntroIds\":[\"tutorial-intro\"],"
      + "\"completedMessengerUnitIds\":[\"appointment-confirmation\"],"
      + "\"completedPhoneCallUnitIds\":[\"appointment-confirmation-phone-call\"],"
      + "\"visualNovel\":{\"status\":\"completed\",\"beatIndex\":2},"
      + "\"completedEpisodeFinalIds\":[]}";
  private static final String REVIEW_PROGRESS = "{\"version\":1,\"completedStepCount\":1000,"
      + "\"completedEpisodeIntroIds\":[],"
      + "\"completedMessengerUnitIds\":[\"appointment-confirmation\"],"
      + "\"completedPhoneCallUnitIds\":[\"appointment-confirmation-phone-call\"],"
      + "\"visualNovel\":{\"status\":\"completed\",\"beatIndex\":2},"
      + "\"completedEpisodeFinalIds\":[\"tutorial-final-test\"]}";
  // build_probe가 이 한 줄의 이름만 바꾼다(AUDIO · SPEECH · WRITING · REVIEW · VISUAL_NOVEL · FINAL).
  private static final String PROGRESS = AUDIO_PROGRESS;

  static void install(Context context) {
    String accessToken = "fixture." + Base64.getUrlEncoder().withoutPadding().encodeToString(
        "{\"sub\":\"audio-fixture\"}".getBytes(StandardCharsets.UTF_8)) + ".signature";
    StorageModule storage = new StorageModule(context);
    if (storage.get("libitum.auth.session") == null || storage.get("libitum.auth.session").isEmpty()) {
      storage.set("libitum.auth.session",
          "{\"accessToken\":\"fixture-access\",\"refreshToken\":\"fixture-seed\",\"expiresAt\":1}");
      storage.set("libitum.progress.pending.audio-fixture", PROGRESS);
    }
    LynxServiceCenter.inst().registerService(ILynxHttpService.class, new ILynxHttpService() {
      @Override public void request(HttpRequest request, LynxHttpRequestCallback callback) {
        String path;
        try {
          path = java.net.URI.create(request.getUrl()).getPath();
        } catch (RuntimeException e) {
          path = "?";
        }
        Log.i("ProbeSignedIn", "http " + path);
        HttpResponse response = new HttpResponse();
        response.setUrl(request.getUrl());
        JavaOnlyMap headers = new JavaOnlyMap();
        headers.putString("content-type", "application/json");
        response.setHttpHeaders(headers);
        boolean refresh = REFRESH_URL.equals(request.getUrl());
        boolean load = LOAD_PROGRESS_PATH.equals(path);
        boolean ok = refresh || load;
        response.setStatusCode(ok ? 200 : 404);
        response.setStatusText(ok ? "OK" : "Not Found");
        String body = refresh
            ? "{\"access_token\":\"" + accessToken
                + "\",\"refresh_token\":\"fixture-refresh\",\"expires_in\":3600}"
            : load ? PROGRESS : "{}";
        response.setHttpBody(body.getBytes(StandardCharsets.UTF_8));
        callback.invoke(response);
      }

      @Override public void requestStreaming(
          HttpRequest request, LynxHttpRequestCallback callback, HttpStreamingDelegate delegate) {
        request(request, callback);
      }
    });
  }
}
```

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
