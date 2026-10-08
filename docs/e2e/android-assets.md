# Android 효과음 · 대사 오디오 · 서사 배경 그림 (Play 배포 형태)

Android 릴리스에서 효과음이 나지 않고(`SoundEffectsModule` 부재), 대사 오디오(m4a 21개)가 패키지에 없고, 서사 화면의 배경 그림이 단색으로만 보이던
결함이 고쳐졌는지를 **Play가 기기에 내려주는 것과 같은 형태**(AAB → bundletool 분할 설치)로 확인한다. 순수 판정(`SoundEffectAsset` · `SoundEffectsSession`) ·
Gradle 결선과 산출물 검사(`devtools/android-bundle/*.test.mjs`) · 계측(`SoundEffectsModuleTest`) · 서사 배경의 마크업(`ui`)은 이미 진다 — 이 문서는
**실제 패키지를 실제 기기에 설치했을 때만 보이는 것**(패키지 안의 무압축 항목 · 플레이어가 시작됐는가 · 그림이 그려지는가)만 진다.
항목 정본은 작업 `android-assets`의 계약(`spec.md` §2 ~ §4 · test-plan `e2e`)이고, 수정 전 상태의 원인은 같은 작업의 진단이 진다.
결함의 원인 요약:

| # | 결함 | 수정 전 증상 |
|---|---|---|
| 1 | Android 호스트에 `SoundEffectsModule`이 없다 | 효과음 8종 전부 무동작. logcat `try to find module: SoundEffectsModulefailed.` |
| 2 | `syncAudioAssets`가 태스크 그래프에 연결돼 있지 않다 | `assets/audio/*.m4a`가 APK · AAB에 없다. 재생은 로그 없이 「끝났다」로 처리돼 화면만 진행된다 |
| 3 | `<image>`에 건 `transform` 키프레임이 Android Lynx에서 그림을 그리지 못하게 한다 | 서사 배경이 단색 `#1b1613`. 그림 로드(`bindload`)는 성공한다 |

## 이 절차로 확인하지 못하는 것

- **실기 스피커의 청음**: 음질 · 음량 · 소리가 실제로 들리는가. 이 절차는 사람이 들을 수 없는 환경(CI · 원격 에뮬레이터)을 가정하고 `dumpsys audio`의
  플레이어 기록과 logcat으로 판정한다. 플레이어가 `started`여도 스피커에서 소리가 나왔다는 증명은 아니다. 귀로 들을 수 있으면 아래 항목마다 들어서도 확인하고
  결과 표에 「청음」 열을 따로 적는다(들었다 · 못 들었다 · 안 들었다).
- **무음 · 진동 모드**: Android에는 iOS의 무음 스위치가 없다. 효과음은 벨 소리 모드가 아니라 **미디어 볼륨**을 따른다(계약 §2.2). 벨 소리 모드를 바꿔 본 관찰은 이 절차에 없다.
- **다른 앱의 음악과 섞임**: 효과음은 오디오 포커스를 요청하지 않아 다른 앱 음악 위에서 섞여 난다(iOS는 끊는다 — 의도된 차이). 다른 앱을 재생해 둔 상태의 관찰은 이 절차에 없다.
- **16 KB 페이지 기기와 4 KB 기기의 실물**: 에뮬레이터 하나(Pixel_8 AVD, API 37 = 16 KB 페이지)로만 잰다. 업로드 AAB의 Fresco · Lynx `.so`가 실기 CPU에서 정상 로드되는지는 실기에서만 알 수 있다. 16 KB로 다시 빌드한 `.so`의 정렬 판정과 4 KB 기기 · 실기 항목은 [Android 출시 설정 절차](android-release-config.md)(R1 · R6 · R9)가 진다 — R6은 API 30 에뮬레이터 하나에서만 실행됐고 R9는 아직 실행되지 않았다.
- **실기 GPU / 하드웨어 가속에서의 서사 배경**: 에뮬레이터의 소프트웨어 렌더링으로만 본다. 실기에서 다르게 보일 가능성은 낮다고 판단하지만 이 절차가 증명하지 않는다.
- **Play가 실기에 내려주는 분할 구성 전부**: `build-apks --connected-device`가 에뮬레이터의 ABI · 밀도 · 언어에 맞춘 분할(base-master / arm64_v8a / xxhdpi / en)을 만든다. 다른 기기의 분할은 보지 않는다. 자산은 모두 base-master에 있어 영향은 없다고 본다.
- **효과음 8종의 정확한 음색과 타이밍**: 아래 표의 조작마다 플레이어가 시작됐는가만 본다. 어느 mp3가 났는지 `dumpsys`가 알려 주지 않으므로 같은 조작에서 어느 id가 불렸는지는 logcat의 `SoundEffectsModule.play.<id>`가 진다.
- **마무리 이야기(`Almost There`, S5) 세 장면의 직접 관찰**: 픽스처로 맵의 최종 유닛을 열 수 없다(첫 실행 `e62cf211`에서 `audioProgress` · `reviewProgress` 둘 다 잠김). S5는 S1~S4와 같은 컴포넌트 · 같은 클래스라 S1~S4의 결과로 대신한다 — 근거는 E6의 6번. 직접 관찰한 것이 아니다.
- **TalkBack을 켠 상태와 「애니메이션 제거」**: 아래 T1 ~ T3은 사람 귀와 TalkBack이 필요한 수동 항목이고 **아직 실행하지 않았다**. E1 ~ E8의 통과는
  TalkBack 낭독과 대사 · 수신 벨이 겹칠 때의 경험(효과음 계약의 의도된 차이 3 · 4)과, 「애니메이션 제거」에서 서사 배경이 멈추는지를 보증하지 않는다.
- **iOS**: Release 호스트로는 서사 화면에 닿지 못한다. E7은 **로컬 전용** playground 경로로 본다(커밋하지 않는다). 그 경로도 못 열면 E7에서 「이 절차로 확인하지 못한다」로 적는다.

## 전제

[Android 시스템 뒤로가기](android-system-back.md)의 「전제」 · 「준비 — 16 KB 호환성 대화상자가 없는지 확인」 · 「앱 구간 진입 (로그인 없이)」을 따른다
(Pixel_8 AVD API 37 · `E2E_UDID` · `ADB` 변수 · `A` 함수 · `SignedInScreenFixtureTest` · 번들 서버). 그 내용은 되풀이하지 않는다. 이 절차만의 차이는 아래다.

1. **설치 형태가 AAB다.** 아래 「AAB 만들고 분할 설치」로 `bundleRelease` 산출물을 설치한다. `debug` APK가 아니다.
2. **`wm size` · `wm density`는 기본값으로 둔다.** 이 절차는 레이아웃 치수가 아니라 그림이 그려지는지와 플레이어를 본다. 바꿔 둔 상태라면 `wm size reset` · `wm density reset`.
   **좌표는 스크린샷(`shot`)으로 위치를 잡는다. 이 문서의 좌표는 참고값이다.** 참고값은 기본 해상도 1080x2400(Pixel_8 AVD)에서 첫 실행(`e62cf211`)에 잰 값이다: 온보딩 `Next` (540,2262) · 맵 활성 노드 (540,2100) · 시트 `Start` (540,1934) · 화면 하단 큰 버튼 (540,2200) · 서사 독백 상자 (540,2050) · 메신저 답장 전송 (943,2242) · 전화 `Accept` (540,2000). 해상도가 다르면 비례로 환산하지 말고 스크린샷에서 다시 잡는다.
   **16 KB 호환성 대화상자는 뜨지 않는다**(2026-10-05의 출시 설정 변경, 작업 `android-release-config` 이후). 뜨면 `Don't Show Again`으로 닫고 넘어가지 말고 회귀로 적는다 — 판정은 [Android 출시 설정 절차](android-release-config.md)의 R1이 진다. 이 절차의 첫 실행(`e62cf211`)은 대화상자가 뜨던 때라, 아래 기록에는 닫은 흔적이 남아 있다.
3. **시각은 이력으로 판정한다.** 에뮬레이터 호스트가 바쁘면 `dumpsys audio` 한 번과 `screencap` 한 번이 각각 수 초 걸려 「조작 N초 뒤」 샘플이 어긋난다. 소리 판정은 샘플 시각이 아니라 `events`의 `player piid:<N> event:started|stopped|paused` 줄과 logcat 시각으로 한다. 화면 캡처는 보조다.
4. **빌드한 SHA를 결과 표에 적는다.** AAB는 수정이 들어간 커밋에서 만든다. 수정 전 기준은 아래 「수정 전 기준선」에서 따로 만든다.
5. **로그인 뒤 화면은 픽스처로 들어간다.** 픽스처는 `debug` 빌드의 호스트에 계측 APK를 붙여 쓰는 구성인데, release AAB의 앱도 같은 디버그 키로 서명되므로
   같은 패키지(`libitum.duru.android`)의 계측 APK를 그대로 붙여 쓸 수 있다(진단의 방법). 서명이 다르면 `INSTALL_FAILED_UPDATE_INCOMPATIBLE`이 나므로 둘 다 디버그 키로 서명한다.

### 도구

```sh
export E2E_UDID=emulator-5554
export ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
A() { "$ADB" -s "$E2E_UDID" "$@"; }   # 함수다 — `A shell …`로 부른다. 문자열 변수(`A="adb -s …"; A shell …`)는 zsh에서 command not found가 난다
# bundletool: https://github.com/google/bundletool/releases 의 bundletool-all-<버전>.jar. 진단은 1.17.2를 썼다
export BUNDLETOOL_JAR=$HOME/tools/bundletool-all-1.17.2.jar     # 둔 자리에 맞춘다
export OUT=.agent-harness/work/android-assets/artifacts/e2e && mkdir -p "$OUT"
shot() { A exec-out screencap -p > "$OUT/$1.png"; }
```

`BUNDLETOOL_JAR`는 `devtools/android-bundle/packaged-assets.artifacts.mjs`의 BG2b도 쓴다(없으면 그 검사는 건너뛴다). 같은 jar를 둘 다 쓴다.

### AAB 만들고 분할 설치

`bundleRelease`의 산출물은 **서명이 없다.** bundletool이 디버그 키로 서명한다.

```sh
# 1) 번들 — 로그인 뒤 화면용 픽스처를 쓸 때는 모의 값으로 만든다(실제 서버 주소가 번들에 들어가지 않게)
PUBLIC_SUPABASE_URL=https://example.invalid PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
# 2) AAB — 서명 없음
cd apps/android && ./gradlew bundleRelease && cd ../..
AAB=apps/android/app/build/outputs/bundle/release/app-release.aab
# 3) 연결된 기기에 맞는 분할로 .apks 만들기 — 디버그 키로 서명
rm -f "$OUT/fixed.apks"
java -jar "$BUNDLETOOL_JAR" build-apks --bundle="$AAB" --output="$OUT/fixed.apks" --connected-device --device-id="$E2E_UDID" \
  --ks ~/.android/debug.keystore --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android
# 4) 설치 — 기존 앱이 있으면 같은 서명이라 덮어쓴다
java -jar "$BUNDLETOOL_JAR" install-apks --apks="$OUT/fixed.apks" --device-id="$E2E_UDID"
```

`bundleRelease`는 `verifyBundledAssets` → `verifyReleaseBundleHostAudio`를 탄다. 원본 오디오가 없거나 AAB의 항목이 원본과 다르면 이 단계에서 빌드가 실패한다.
빌드가 이미 실패하면 그 메시지(`Packaged host audio check failed for …`)를 결과 표에 적고 이 절차를 멈춘다.

### 수정 전 기준선 — 사용자가 Play에 올린 AAB

수정 전 모습은 사용자가 Play에 올린 AAB `~/Desktop/app-release-signed-16kb.aab`(패키지 `libitum.duru.android`)에 같은 절차를 적용해 본다.
이 파일은 이미 서명돼 있으므로 디버그 키로 **재서명**해 설치한다(Play 서명 키를 다루지 않는다).
**2026-10-05부터 이 저장소의 빌드도 같은 패키지(`libitum.duru.android`)다**([ADR-0046](../adr/0046-android-play-release.md)). 그래서 기준선을 설치하면 수정본 설치를 **덮어쓴다**(같은 디버그 키) —
둘을 나란히 둘 수 없으므로 기준선을 본 뒤 「AAB 만들고 분할 설치」로 수정본을 다시 설치한다. 함께 설치되는 것은 그 이전 커밋으로 만든 옛 패키지 `com.libitum.host`뿐이고,
그 둘이 함께 있으면 `duru://auth-callback`에 앱 선택 창이 뜬다 — 소셜 로그인을 보기 전에 `adb uninstall com.libitum.host`.
이 AAB 파일은 저장소 밖 사용자 파일이라 그 자리에 없을 수 있다(2026-10-05 `android-release-config` 계약 단계에는 없었다). 없으면 이 절은 건너뛰고 아래 저장된 스크린샷 · 로그를 기준으로 쓴다.

```sh
UP=~/Desktop/app-release-signed-16kb.aab
java -jar "$BUNDLETOOL_JAR" build-apks --bundle="$UP" --output="$OUT/uploaded.apks" --connected-device --device-id="$E2E_UDID" \
  --ks ~/.android/debug.keystore --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android
java -jar "$BUNDLETOOL_JAR" install-apks --apks="$OUT/uploaded.apks" --device-id="$E2E_UDID"
A shell am start -n libitum.duru.android/com.libitum.host.MainActivity
```

`MainActivity`의 완전한 이름이 다르면 `A shell cmd package resolve-activity --brief libitum.duru.android`로 확인한다.
이 앱은 서버 주소가 실제 값이라 픽스처(모의 세션)로 들어갈 수 없다. 기준선으로 확인할 수 있는 것은 **패키지 안 내용(E1)** 과 **온보딩 `Next`의 효과음 부재(E2)** 뿐이다.
로그인 뒤 화면(E3 ~ E8)의 수정 전 기준은 아래 저장된 스크린샷 · 로그를 쓴다.

수정 전 기준 자료(저장소 루트 기준, `.agent-harness/`가 없는 체크아웃에서는 「기준 없음」으로 적는다):

| 파일 | 무엇 |
|---|---|
| `.agent-harness/work/android-assets/artifacts/spike-c3/00-baseline-3s.png` · `00-baseline-10s.png` | 수정 전 프롤로그 첫 장면 — 단색, 10초가 지나도 단색 |
| `.agent-harness/work/android-assets/artifacts/21-aab-prologue.png` | 수정 전 release AAB 분할 설치의 프롤로그 — 단색 |
| `.agent-harness/work/android-assets/artifacts/08-prologue-1.png` | 수정 전 bundled APK의 프롤로그 — 단색 |
| `.agent-harness/work/android-assets/artifacts/12-prologue-no-animation.png` | 애니메이션을 뺐을 때의 그림(날개 끝 y ≈ 393, 확대 1.0배) — 움직임 판정의 기준점 |
| `.agent-harness/work/android-assets/artifacts/logcat-onboarding-next.txt` | 수정 전 온보딩 `Next`의 logcat — `SoundEffectsModulefailed.` 포함 |
| `.agent-harness/work/android-assets/artifacts/30-uploaded-aab-launch.png` | 업로드 AAB 재서명 설치의 온보딩(그림은 정상) |

### 소리 관찰 도구

```sh
# 현재 활성 플레이어. 효과음은 SoundPool(USAGE_MEDIA · CONTENT_TYPE_SONIFICATION), 벨은 MediaPlayer(같은 속성), 대사는 MediaPlayer(USAGE_MEDIA · CONTENT_TYPE_SPEECH)
players() { A shell dumpsys audio | grep -E "player piid|AudioPlaybackConfiguration" ; }
# 플레이어 이력(시작 · 정지 이벤트)
events()  { A shell dumpsys audio | grep -E "player piid:[0-9]+ event:" ; }
# 조작 한 번 사이의 logcat — 조작 직전에 비우고 직후에 읽는다
A logcat -c        # 조작 전
A logcat -d | grep -E "SoundEffectsModule|AudioPlaybackModule|SoundEffects|AudioPlayback"
```

- `dumpsys audio`의 출력 줄 형식은 Android 버전마다 다르다. `player piid:<N> event:started`(시작)과 `event:stopped`(정지)를 찾고, 한 줄도 안 나오면
  `A shell dumpsys audio | grep -n -i "playback\|piid"`로 플레이어 절을 먼저 찾는다. 효과음이 짧아 조작 뒤 곧 끝나므로 **조작 직후 1초 안에** 이력(`events`)을 읽는다.
  **API 30(Android 11) 에뮬레이터의 출력에는 이 이력이 없었다**(2026-10-05 — `AudioPlaybackConfiguration piid:… state:idle` 목록만 나왔다. Android 버전에 따른 출력 형식 차이로 **추정**하며 원인을 가리지는 않았다). 그런 기기에서는 `events`로 판정하지 말고 logcat(`SoundEffectsModule.play.<id>` 호출 · `SoundEffectsModulefailed` 0 · `SoundEffects`/`AudioPlayback` 경고 0)으로 판정하고, 이력으로 보지 못했다고 결과 표에 적는다.
- 판정에 쓰는 것은 **조작 직전과 직후의 이력 차이**다. 직전에 이미 있던 `piid`를 새 시작으로 세지 않는다. 조작 전에 `events > "$OUT/<id>-before.txt"`, 후에 `events > "$OUT/<id>-after.txt"`로 남기고 `diff`로 본다.
- logcat에서 **있어야 하는 것**: `SoundEffectsModule.play.<id>`(Lynx가 남기는 모듈 호출 줄, 조작이 부른 id). **없어야 하는 것**: `SoundEffectsModulefailed`(모듈 부재), 태그 `SoundEffects` 또는 `AudioPlayback`의 `W`(`Cannot load sound effect` · `Cannot open audio asset` · `Audio playback error` · `Rejected audio source`).
  앱 `FATAL EXCEPTION`도 없어야 한다.

```sh
A logcat -d | grep -c "SoundEffectsModulefailed"                       # 0이어야 한다
A logcat -d | grep -E " W (SoundEffects|AudioPlayback) " ; echo "warn=$?" # 한 줄도 없어야 한다(grep 종료 코드 1)
```

## 효과음 8종과 화면 조작 (iOS 연결 지점)

iOS의 연결 지점을 그대로 쓴다(`docs/specs/ios-sound-effects.md` 계약표 · `apps/mobile/src`의 `playSound` 호출). Android는 이 JS 호출을 그대로 받아 `SoundPool` / `MediaPlayer`로 낸다.

| id | 어느 화면 조작에서 나는가 | 코드 자리 | 이 절차의 항목 |
|---|---|---|---|
| `button` | 온보딩 `Next` · `Get started` · 뒤로, 하단 탭(`Journey` · `Roleplay` · `Settings`), 여정 레슨 시작(`StepSheet`의 시작), 문화 퀴즈 시작, 학습의 진행 · 나가기 · 듣기 재생 · 다시 듣기 · 녹음 · 건너뛰기, 문장 만들기 단어 칩 | `OnboardingScreen` · `BottomNavigator` · `StepSheet` · `LearningShell` · `ListeningPrompt` · `SpeakingScreen` · `SentenceOrderChip` | E2 · E3 |
| `correct_answer` | 정답 판정 표시(`AnswerVerdict`) · 문화 퀴즈 보기 정답 | `AnswerVerdict` · `CultureQuizOption` | E3 |
| `wrong_answer` | 오답 판정 표시 · 문화 퀴즈 보기 오답 | 〃 | E3 |
| `lesson_complete` | 활동의 모든 문항을 끝낸 완료 안내 | `LearningActivityComplete` | E3 |
| `pass_lesson` | 레슨 결과 화면의 통과(퍼펙트 포함) | `LessonCompleteScreen` | E3 |
| `failed_lesson` | 레슨 결과 화면의 미통과 | 〃 | E3 |
| `ring_bell` | 수신 전화 화면이 서 있는 동안 반복(튜토리얼 통화 · 일반 전화 학습 모두) | `PrologueCallScreen` · `PhoneCallScreen` | E4 |
| `accept_call` | 수신 전화에서 받기(통화 수락) | 〃 | E4 |

판정은 `SoundEffectsModule.play.<id>` logcat 줄과, 그 직후의 플레이어 시작 기록이 둘 다 있는 것이다. 이 표의 8종 가운데 로그인 뒤 학습 문항으로 닿는 길이
픽스처에 없는 id는 닿지 못한 사유를 적는다(아래 E3).

## 항목

**항목마다 새 픽스처로 시작한다.** 픽스처는 **180초 뒤 스스로 끝난다.** 튜토리얼 프롤로그를 S1부터 수신 전화(E4)까지 가는 데 약 50 ~ 60초,
E4의 20초 이상 대기와 통화, 기내 복귀(S4 · E5)까지 한 픽스처에 겨우 들어가고, E8까지 한 픽스처로 이어 가지 못한다(r02에서 E8은 따로 새 픽스처로 했다).
그래서 순서를 정하지 않고 아래 묶음마다 새로 시작한다. 다시 시작하기 전 `STOP_SIGNED_IN_FIXTURE` 방송 뒤 4초 이상 둔다(android-navigation-insets 「전제」 3).

| 묶음 | 픽스처 인자 | 항목 |
|---|---|---|
| 패키지 | 픽스처 없음 | E1 |
| 온보딩 | 픽스처 없음(새 설치 상태로 앱을 연다) | E2 |
| 학습 | `audioProgress true` | E3 (가) · (나) |
| 프롤로그 | 인자 없음 | E6 S1 ~ S3 → E4 → E6 S4 · E5 |
| 백그라운드 | 인자 없음 | E8(프롤로그를 다시 지나 수신 전화 화면에서) |
| iOS | — | E7 |
| 접근성(수동) | 항목별 | T1 ~ T3 |

`pm clear` 뒤에도 16 KB 대화상자는 뜨지 않아야 한다(전제 2 — 뜨면 회귀).

### E1 — 패키지에 오디오 29개가 무압축으로 들어 있다 (수용 기준 4)

- **조작**: 위 「AAB 만들고 분할 설치」 3번에서 만든 `fixed.apks`를 연다. 분할 APK에서 `base-master.apk`를 꺼내 항목을 본다. 같은 확인을 `assembleBundled` APK에도 한다.
  ```sh
  rm -rf "$OUT/split" && mkdir -p "$OUT/split" && unzip -o -q "$OUT/fixed.apks" -d "$OUT/split"
  unzip -v "$OUT/split/splits/base-master.apk" | grep -E "assets/(audio|sfx)/" | tee "$OUT/E1-assets.txt"
  grep -c "assets/audio/.*\.m4a" "$OUT/E1-assets.txt"; grep -c "assets/sfx/.*\.mp3" "$OUT/E1-assets.txt"
  grep -E "assets/(audio|sfx)/" "$OUT/E1-assets.txt" | grep -vc "Stored"
  # bundled APK (두 APK는 같은 패키지 — 이 확인은 설치 없이 파일만 연다)
  (cd apps/android && ./gradlew assembleBundled) && unzip -v apps/android/app/build/outputs/apk/bundled/app-bundled.apk | grep -E "assets/(audio|sfx)/"
  # 업로드 AAB(수정 전 기준선) — 같은 분할
  rm -rf "$OUT/split-uploaded" && mkdir -p "$OUT/split-uploaded" && unzip -o -q "$OUT/uploaded.apks" -d "$OUT/split-uploaded"
  unzip -v "$OUT/split-uploaded/splits/base-master.apk" | grep -cE "assets/(audio|sfx)/"
  ```
  AAB 파일 자체를 열 때(`unzip -v app-release.aab`)는 항목이 전부 `Defl:N`로 보인다 — 그것은 정상이다. 기기에 설치되는 **분할 APK**에서 `Stored`인지를 본다
  (`openFd`는 무압축 자산만 열 수 있다). 원본 목록은 `ls apps/ios/Host/audio/*.m4a | wc -l`(21) · `ls apps/ios/Host/sfx/*.mp3 | wc -l`(8)이다.
- **기대**: `assets/audio/*.m4a` 21개와 `assets/sfx/*.mp3` 8개가 `base-master.apk`에 있고 전부 `Stored`다. `bundled` APK도 같다.
- **판정 기준**
  - **통과**: 첫 두 줄이 21 · 8, 세 번째 줄(`Stored`가 아닌 줄)이 0. `bundled` APK도 29개 모두 `Stored`.
  - **실패**: 개수가 21 · 8과 다르거나 `Defl:N`인 항목이 있다. 수정 전 기준은 0개다(업로드 AAB의 마지막 명령이 0).
  - 실패 시 `A logcat`에서 E3 · E5의 `Cannot open audio asset`(`FileNotFoundException`)이 같이 보이는지 적는다.
- **관찰 명령**: 위 명령. 결과를 `E1-assets.txt`에 남긴다.

### E2 — 온보딩 `Next`를 누르면 효과음 모듈이 불린다 (수용 기준 1)

- **조작**: 새 설치 상태(`A shell pm clear libitum.duru.android`)로 앱을 연다. 스플래시 뒤 온보딩 첫 스텝이 서면 logcat을 비우고 이력을 저장한 뒤 `Next`를 누른다
  (1080x2400 기준 약 (540,2262) — 스크린샷으로 위치를 잡는다, 참고값). 화면 크기가 다르면 같은 대상을 누른다.
  ```sh
  A shell pm clear libitum.duru.android; A shell am start -n libitum.duru.android/com.libitum.host.MainActivity; sleep 8   # 16 KB 대화상자는 뜨지 않아야 한다(전제 2)
  shot E2-onboarding-1; events > "$OUT/E2-before.txt"; A logcat -c
  A shell input tap 540 2262; sleep 0.5   # 참고값 — shot으로 확인
  events > "$OUT/E2-after.txt"; A logcat -d > "$OUT/E2-logcat.txt"; shot E2-onboarding-2
  diff "$OUT/E2-before.txt" "$OUT/E2-after.txt"
  grep -c "SoundEffectsModulefailed" "$OUT/E2-logcat.txt"; grep "SoundEffectsModule.play" "$OUT/E2-logcat.txt"
  ```
  업로드 AAB의 기준선도 같은 조작으로 남긴다(패키지 `libitum.duru.android`, 위 「수정 전 기준선」).
- **기대**: 수정 후에는 `SoundEffectsModule.play.button`이 있고, `SoundEffectsModulefailed`는 없고, `dumpsys audio`에 usage `USAGE_MEDIA` · content type `CONTENT_TYPE_SONIFICATION`인 SoundPool 플레이어의 `event:started`가 새로 생긴다.
- **판정 기준**
  - **통과**: `SoundEffectsModulefailed` 0줄, `play.button` 1줄 이상, `diff`에 새 `started` 플레이어가 1개 이상, `SoundEffects` · `AudioPlayback` 경고 0줄. 화면은 온보딩 둘째 스텝으로 넘어간다(`E2-onboarding-2`).
  - **실패**: `SoundEffectsModulefailed`가 있거나(모듈 부재 — 수정 전 모습, `artifacts/logcat-onboarding-next.txt`) 새 플레이어 기록이 없다.
  - `play.button`이 logcat에서 안 보이는데 플레이어가 시작됐다면 로그 줄의 형식이 다른 것이니 줄을 그대로 적고 판정은 플레이어 기록으로 한다.
  - 귀로 들을 수 있으면 짧은 클릭음이 한 번 나는지 적는다.
- **관찰 명령**: 위 명령.

### E3 — 학습의 정답 · 오답, 결과 화면에서 같은 형태의 시작 기록이 난다 (수용 기준 1)

- **조작**: 픽스처를 `audioProgress true`로 시작한다(진행 5스텝 — 듣기 학습 유닛이 맵에서 바로 열린다. android-system-back의 B3와 같은 길).
  맵은 **한 번에 약 900px씩** 위로 스와이프하고(`A shell input swipe 540 1800 540 900 400`) 매번 스크린샷으로 확인한다 — 길이를 정하지 않으면 맵 끝까지 가 버린다. 활성 노드는 이름이 아니라 스크린샷에서 연 노드(자물쇠 없음)를 직접 고른다: 활성 노드가 「Listen to a Hello」가 아니라 단어 순서 유닛(「Asking for directions」)으로 보이는 회차도 있었다. 두 유닛을 다 쓴다 — 듣기 유닛은 `wrong_answer` · `failed_lesson`, 단어 순서 유닛은 `correct_answer` · `lesson_complete` · `pass_lesson`에 닿는다.
  **한 회차에서 모든 id에 닿지 않는다.** 한 레슨에 오답이 하나라도 있으면 결과는 `failed_lesson`으로 고정되므로 `pass_lesson` · `correct_answer`는 **오답 없이 푸는 별도 회차**로만 닿는다. 회차를 둘로 나눈다: (가) 오답을 하나 고르고 끝까지 간다 → `wrong_answer` · `failed_lesson`; (나) 새 회차에서 전부 정답으로 푼다 → `correct_answer` · `lesson_complete` · `pass_lesson`. **(가)의 결과 화면에서 같은 유닛의 `Try again`을 누르면 오답 0인 새 시도가 된다** — 맵으로 돌아가 노드를 다시 열 필요가 없고 가장 짧다(r02에서 이 길로 했다). 매 조작 전에 `events`와 `logcat -c`.
  1. 하단 탭 `Roleplay` → `Journey`로 이동: `button`.
  2. 학습 시작 → 듣기 재생 버튼: `button` (E5의 대사 오디오와 겹치는 첫 조작).
  3. (나) 정답 판정: `correct_answer`. (가) 오답 판정: `wrong_answer`.
  4. 모든 문항을 끝낸 안내: `lesson_complete`.
  5. 결과 화면: (나)는 `pass_lesson`, (가)는 `failed_lesson`.
- **기대**: 조작마다 `SoundEffectsModule.play.<표의 id>`와 새 플레이어 `started`가 있다. 대사 재생 중에 효과음이 나도 **대사 플레이어가 멈추지 않는다**(오디오 포커스를 요청하지 않으므로 대사에 포커스 손실이 가지 않는다).
- **판정 기준**
  - **통과**: 닿은 조작마다 위 두 기록이 있다. 닿은 id를 모두 표에 적는다(`button` · `correct_answer` · `wrong_answer` · `lesson_complete` · `pass_lesson` · `failed_lesson` 가운데 닿은 것). 대사 플레이어(`CONTENT_TYPE_SPEECH`)의 이력에서 효과음 조작 시각에 `event:stopped`가 없다 —
    대사 재생 중 `correct_answer`가 난 구간을 `events`로 잡아 본다. logcat에 `AudioPlayback`의 `onAudioFocusChange` 계열 줄이 없다.
  - **실패**: 닿은 조작인데 `play.<id>`가 없거나 새 플레이어가 없다. 효과음이 날 때 대사 플레이어가 `stopped`가 된다(포커스를 요청한 것).
  - **닿지 못한 id**: 픽스처의 모의 세션으로 레슨 결과 화면이나 오답 경로까지 닿지 못하면 닿지 못한 id와 막힌 자리(스크린샷)를 결과 표에 적고 통과로 적지 않는다.
    그 id는 `unit` SA(`SoundEffectAssetTest`) · SS와 `integration` SI의 판정에 기댄다고 적는다(이 절차가 진 것이 아니다).
- **관찰 명령**: `events` · `logcat` 위 명령. 대사 플레이어 이력은 `dumpsys audio | grep -B1 -A3 SPEECH`. 효과음 SoundPool은 소리마다 `started`를 한 줄 남기므로 `events`의 새 `started` 줄과 `play.<id>` 로그 시각(수십 ms 안)을 짝지어 판정한다.
- **직접 대조가 어려운 항목**: 「긴 대사가 도는 동안 효과음을 일부러 겹쳐 내도 대사가 멈추지 않는다」는 호스트가 바쁠 때 타이밍을 맞추기 어렵다(첫 실행에서 못 했다). 못 맞추면 간접 근거(대사 `started` 직후 `button` · `accept_call`이 같이 난 구간에서 대사가 이어짐 + `onAudioFocusChange` 줄 0건 + 효과음 쪽 `requestAudioFocus` 로그 없음)로 적고 「직접 대조 못 함」을 명시한다.

### E4 — 수신 전화 벨이 반복되고 받으면 멈춘다 (수용 기준 2)

- **조작**: 픽스처를 인자 없이 시작한다. 지도의 튜토리얼 표지(`Episode intro`) → `Start` → 표지의 `Next` → 「Before We Land」 프롤로그(경로는 E6의 「서사 화면에 닿는 길」).
  기내 독백 3개를 넘기고, 민서와의 메시지에 두 번 답장한 뒤 `Continue`를 누르면 카페 독백(S3)이 선다. `Continue` 뒤 3 ~ 5초 두어 카페 독백의 타이핑이 끝나면
  **독백 상자를 한 번만 누른다** — 그 한 번으로 **수신 전화 화면**(`prologue-call-screen`, 상태 문구 incoming)이 선다. ⚠ 한 번 더 누르지 않는다: 같은 자리(참고값 (540,2050))가 전화의 `Accept`라
  의도치 않게 전화를 받는다(r02에서 한 번 그렇게 받아 통화 중이 됐다). 전화 화면이 선 것을 스크린샷으로 확인하고 시작한다.
  1. 전화 화면이 선 시각에 `events > "$OUT/E4-ring-0s.txt"`, `A logcat -c`.
  2. **20초 이상 기다린다**(벨 mp3가 14.04초라 반복이 아니면 20초 시점에 이미 끝나 있다). `sleep 20; events > "$OUT/E4-ring-20s.txt"; players > "$OUT/E4-players-20s.txt"; shot E4-ring-20s`.
     조작 시간 때문에 실제 덤프는 21초 부근이 된다(r02 약 21초) — 판정은 「20초 이상 지난 시점」이고 정확히 20초일 필요는 없다.
  3. 받기 버튼을 누른다(화면의 수락 조작 — 스크린샷으로 위치를 잡는다, 참고값 (540,2000)). `sleep 1; events > "$OUT/E4-accept.txt"; players > "$OUT/E4-players-accept.txt"; A logcat -d > "$OUT/E4-logcat.txt"`.
- **기대**: 전화 화면이 서는 순간 `play.ring_bell` + 벨 플레이어 `started`. 20초 이상 지난 시점에도 같은 벨 플레이어가 **재생 중**(`players`에 남아 있고 `stopped`가 없다 — 14초 자산이 반복되는 중). 받기를 누르면 벨 플레이어가 멈추고(`stopRing`) `play.accept_call` + 새 플레이어 `started`. 「멈춘다」는 벨 `MediaPlayer`를 `pause()`하는 설계라 **`state:paused` / `event:paused`** 로 보인다(`stopped`나 목록에서 사라짐이 아니다). logcat의 `stopRing` 줄은 인자가 없어 `SoundEffectsModule.stopRing.`(끝에 마침표)로 찍힌다.
- **판정 기준**
  - **통과**: 0초에 벨 `started`, 20초 이상 지난 시점에 벨 플레이어가 아직 활성(`E4-players-20s.txt`에 usage `USAGE_MEDIA`·`CONTENT_TYPE_SONIFICATION`이 남음), 받기 뒤 벨 플레이어가 **`paused`**(`E4-players-accept.txt`의 `state:paused` 또는 `events`의 `event:paused`)이고 `stopRing` 줄이 있고 `accept_call` 플레이어가 새로 `started`.
  - **실패**: 20초 이상 지난 시점에 벨 플레이어가 이미 `stopped`(반복 안 됨), 받기 뒤에도 벨 플레이어가 `state:started` 그대로(`stopRing` 안 됨), `accept_call`의 시작이 없다.
  - **전화 화면을 받지 않고 나갈 때**도 벨이 멈춘다: 다른 회차에서 전화 화면의 뒤로(`prologue-call-screen-back`)를 눌러 벨 플레이어가 멈추는지 본다(`stopRing`이 `handleBack`에서 불린다). 이 경로가 닿으면 결과 표에 적는다. 이 경우에도 판정은 `paused`다.
  - 귀로 들을 수 있으면 벨이 20초 넘게 끊기지 않고 이어지는지 적는다.

### E5 — 대사 오디오가 재생되고 끝까지 이어진다 (수용 기준 3)

**기대 정정 (r02)**: 「재생 중에는 탭이 넘기지 않는다」는 사실이 아니다. `EpisodeNarrativeScreen.tsx:79-100`은 `playAudio(audioSource, () => {})`로 **완료 콜백을 쓰지 않고**(「음원이 끝나도 독백을 읽을 시간은 사용자가 정합니다. 자동으로 넘기지 않습니다」), `handleAdvance`는 타이핑이 안 끝났으면 `typing.finish()`만, 끝났으면 다음 비트로 넘기며 그때 effect cleanup이 `stopAudio()`를 부른다. 즉 **글자가 다 나온 뒤 탭하면 소리가 나는 중에도 넘어가고 소리가 멈춘다 — 의도된 동작**이다(첫 실행에서 재생 시작 11ms 뒤 탭이 소리를 끊는 것이 관찰됨). 첫 탭이 타이핑을 끝내고 둘째 탭이 넘기므로 빠르게 두 번 누르면 소리 직후에도 끊긴다. 그래서 이 항목은 **탭하지 않는 회차**로 판정한다.

**수용 기준 3과의 관계**: 기준 3의 「재생이 끝난 뒤에야 「완료」가 JS로 간다」에서 「완료」는 `AudioPlaybackModule.play`의 **완료 콜백**이다. 서사 화면은 그 콜백을 쓰지 않으므로(위 줄 번호) 이 화면의 탭 동작은 기준 3의 판정 대상이 아니다 — 정정은 기준 3과 어긋나지 않는다. 완료 콜백이 재생 종료 뒤에 불리는지는 integration의 AP 계측이 진다. 이 절차는 그것을 대신하지 않고, 이 화면에서는 「패키지에 자산이 있어 플레이어가 실제로 생기고 끝까지 재생된다」(수정 전에는 `openFd` 실패가 로그 없이 「끝났다」로 처리돼 소리 없이 지나갔다)만 진다.

- **조작**: 프롤로그 마지막 구간의 기내 방송(`tutorial-cabin-announcement`, 자산 길이 약 5.68초 — 알림음 2초 + 안내 3.46초)에 닿는다(E4에서 전화를 끝내고 `Continue`로 기내로 돌아오면 첫 줄이 이 방송이다: 「잠시 후 인천국제공항에 도착하겠습니다.」 번역 「We will shortly be arriving at Incheon International Airport.」).
  방송 줄이 서자마자 `A logcat -c; events > "$OUT/E5-before.txt"`. **화면을 탭하지 않고** 약 10초 둔 뒤 `events > "$OUT/E5-after.txt"; A logcat -d > "$OUT/E5-logcat.txt"; shot E5-end`. 중간 스크린샷(1초 · 4초 · 7초)은 글자 공개 상태를 보는 보조다 — 호스트가 바쁘면 시각이 어긋나므로 판정에 쓰지 않는다.
  듣기 문항(E3의 `Listen to a Hello`)의 음성도 같은 방식으로 한 번 본다(`AudioPlaybackModule.play.phone-call-confirm-01`, 약 1.1초).
  별도 회차로 「탭 끊김」(의도된 동작)도 한 번 남긴다: 글자가 다 나온 뒤 탭하면 `AudioPlaybackModule.stop.`이 찍히고 플레이어가 `releasing`되며 둘째 줄로 넘어간다. 통과 · 실패 판정이 아니라 관찰 기록이다.
- **기대**: 탭하지 않으면 대사가 끝까지 재생된다 — usage `USAGE_MEDIA` · content type `CONTENT_TYPE_SPEECH`인 `MediaPlayer`가 `started` → `stopped`(약 6초, 호스트가 바쁘면 7초대; 자산 5.68초 + 시작 지연). 방송 줄은 스스로 다음 줄로 넘어가지 않는다. logcat에 `AudioPlayback`의 경고(`Cannot open audio asset` 등)가 없다.
- **판정 기준**
  - **통과**: `E5-logcat.txt`에 `AudioPlaybackModule.play.tutorial-cabin-announcement`가 있고, `events`에 대사 플레이어의 `started` 뒤 약 5 ~ 8초 사이에 `stopped`가 있다(탭 없이). 경고 0줄, `FATAL EXCEPTION` 0줄. 화면은 끝에도 방송 줄 그대로(자동 진행 없음).
  - **실패**: 대사 플레이어가 한 번도 안 생긴다(수정 전 모습 — m4a가 없어 `openFd`가 실패하고 **로그 없이** 곧바로 「끝났다」로 처리돼 화면만 진행된다). 또는 탭하지 않았는데 화면이 다음 줄로 넘어간다. `Cannot open audio asset`이 보이면 E1이 실패한 것이다.
  - 글자 공개 시점(`revealTiming`: 알림음 2.22초 뒤 안내 글자 3.456초 공개)은 스크린샷에 같이 적는다 — 다 공개되면 화살표가 뜬다.
  - 귀로 들을 수 있으면 방송이 자연스럽게 끝까지 나오는지 적는다.

### E6 — 서사 배경 다섯 장면에서 그림이 그려지고 움직인다 (수용 기준 5)

서사 배경은 튜토리얼 「Before We Land」 프롤로그의 네 장면과 마무리 이야기(`Almost There`)의 세 장면이다. 이 절차에서 **직접 관찰하는 것은 S1 ~ S4**이고 S5는 아래 6번의 근거로 대신한다.

| # | 장면 | 어디서 | 그림 | 전환 방식 |
|---|---|---|---|---|
| S1 | 비행기 창 | 프롤로그 첫 독백 두 개 | `airplane-window` | 처음 마운트(crossfade) |
| S2 | 상상 속 거리 | 프롤로그 셋째 독백 | `imagined-street` | `imagination`(이전 그림 상자 `-motion-imagination-departing` + 새 그림 상자 + 베일) |
| S3 | 상상 속 카페 | 메신저 뒤의 카페 독백 | `imagined-cafe` | 새로 마운트(crossfade) |
| S4 | 기내 복귀 | 전화 뒤 기내 방송 | `airplane-descent` | `reality`(이전 그림 상자 `-motion-reality-departing` + 새 그림 상자) |
| S5 | 마무리 이야기 | `Almost There`의 기내 · 카페 · 도착 | `final-flight` · `final-cafe` · `final-arrival` | 기내 → 카페는 `imagination`, 카페 → 기내(엔딩)는 `reality` |

「서사 배경 다섯 장면」은 위 S1 ~ S5다(S5는 한 이야기의 세 그림 묶음이라 한 장면으로 센다).

**서사 화면에 닿는 길 (로그인 없이)**

1. 위 「AAB 만들고 분할 설치」의 번들(모의 서버 주소)로 AAB를 설치한다. 이 번들은 `https://example.invalid`로 만든 것이라 서버 호출은 모두 실패하고 모의 세션만 쓴다.
2. 계측 APK를 설치한다: `cd apps/android && ./gradlew assembleDebugAndroidTest`, `A install -r apps/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk`.
3. 번들 서버를 띄우고 픽스처를 시작한다(`pm clear` 먼저):
   ```sh
   python3 -m http.server 18797 --bind 0.0.0.0 --directory apps/mobile/dist >/tmp/libitum-assets-preview.log 2>&1 &
   A shell pm clear libitum.duru.android
   A shell am instrument -w -e class com.libitum.host.SignedInScreenFixtureTest -e bundleUrl http://10.0.2.2:18797/main.lynx.bundle \
     libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner >/tmp/libitum-assets-fixture.log 2>&1 &
   ```
   (픽스처는 `bundleUrl` 인자가 필수라 번들을 HTTP로 읽는다. 서버가 주는 `apps/mobile/dist`는 AAB에 들어간 번들과 같은 `pnpm bundle:android` 산출물이므로 서사 배경의 마크업 · CSS가 같다. 호스트 앱 자체는 release AAB 분할 설치본이다. 호스트 내장 번들로 서는 화면은 아니라는 점을 결과에 적는다.)
4. 여정 맵이 서면 튜토리얼 표지 노드 `Episode intro`를 누른다 → 말풍선 `Start` → 표지 화면 → `Next`. 프롤로그 첫 화면은 헤더 `Before We Land` 아래에 비행기 창 그림과 독백이다.
5. 독백을 넘겨 S1 → S2, 메시지에 두 번 답장해 `Continue` → S3, 통화 뒤 `Continue` → S4 순으로 간다(`docs/e2e/tutorial-prologue.md`의 확인 절차와 같은 길).
6. **S5(마무리 이야기)는 직접 관찰하지 않는다.** 첫 실행(`e62cf211`)에서 `audioProgress true`(9/13)와 `reviewProgress true`(12/13) 둘 다 맵 끝의 「Say Your Hello」 · 「Trace One Letter」 · 「Final test」가 전부 잠겼고 「Final test」를 눌러도 반응이 없었다. 맵에 `Almost There`라는 이름의 노드는 없다 — `Almost There`는 최종 유닛 이야기의 **제목**(`apps/mobile/src/screens/episode-final/tutorial-final-story.ts:8`)이고 맵의 마지막 노드 이름은 `Final test`다. 픽스처로 이 유닛을 열 수단이 없고, 미리보기 `tutorial-final-story`는 dev 번들(playground)에만 있다(iOS 로컬 경로는 E7).
   **S5를 S1~S4의 결과로 대신하는 근거** (같은 컴포넌트 · 같은 클래스임을 코드로 확인했다):
   - 마무리 이야기는 `apps/mobile/src/app/EpisodeFinalJourneyScreen.tsx:44`에서 `EpisodeNarrativeScreen`을 쓴다. 프롤로그도 같은 컴포넌트다 — `apps/mobile/src/app/EpisodePrologueScreen.tsx:49`.
   - `apps/mobile/src/screens/episode-narrative/EpisodeNarrativeScreen.tsx:122`가 `NarrativeBackground`를 쓴다(`key={background}` · `transition={beat.transition}`). 프롤로그와 마무리 이야기가 이 한 곳을 공유한다.
   - 그림 상자 클래스는 `apps/mobile/src/screens/episode-narrative/NarrativeBackground.tsx:77-79`의 `narrative-background-motion narrative-background-motion-${profile ?? "current"}` — 프로필이 없으면(처음 마운트 · crossfade) `-motion-current`, `imagination` · `reality` 전환이면 해당 프로필이다. S5의 전환 값은 `tutorial-final-story.ts`가 정하며(`transition: "reality"` 등) S1~S4와 같은 프로필 집합이다.
   - 따라서 **S5는 S1~S4와 같은 컴포넌트 · 같은 클래스(`-motion-current` · `-motion-imagination` · `-motion-reality`)라 S1~S4의 결과로 대신한다. S5는 직접 관찰하지 못함.** 결과 표 E6 근거에 「S5 직접 관찰 못 함(S1~S4로 대신)」을 적는다. 코드에서 다른 프로필이나 클래스를 쓰는 비트가 발견되면 그 사실을 적고 대신하지 않는다.

**장면마다 찍는 법**

화면 캡처 자체가 0.3초쯤 걸리므로 시각은 ±0.3초다. 장면이 서는 입력(탭)을 한 시점을 0초로 둔다.

```sh
scene() { # $1=장면 id (S1 등)
  sleep 1;  shot "$1-1s"
  sleep 6;  shot "$1-7s"
}
A shell input tap <장면으로 넘기는 위치>; scene S2
```

- **기대**: 장면마다 전환 시작 1초 안에 1장(`<id>-1s`), 7초 뒤 1장(`<id>-7s`). 7초 뒤 그림이 보이고, 1초 시점보다 확대 정도가 크다(확대 drift가 6초 동안 돌고 끝난 뒤 1.035배에서 멈춘다 — `imagination` 프로필은 3초에 가라앉고 남은 3초 동안 아주 조금 떠오른다. `reality`는 2.8초 동안 천천히 가라앉고 정지한다).
- **판정 기준**
  - **그림이 그려진다(필수)**: `-7s`(필요하면 `-1s`도 — 0.5초나 그림 로드 직후의 단색은 `frame-loading { opacity: 0 }` 구간과 900ms reveal 시작부라 결함이 아니다)에 단색 `#1b1613`만이 아니라 그림이 보인다. 2초 이후에도 단색이면 실패.
  - **움직인다(필수)**: S1은 날개 끝(진단의 기준: 애니메이션 없는 기준 y ≈ 393, 2초 y ≈ 383, 7초 y ≈ 370 — 900x2000으로 줄인 화면 좌표) 같은 두드러진 지점이 `-1s` → `-7s` 사이에 바깥쪽으로 몇 px 이동한다. 두 장을 겹치거나 나란히 놓고 이동 방향과 크기를 적는다. 이동이 없으면 그림은 그려져도 움직임이 없는 것이다(실패).
  - **전환 도중(S2 · S4)**: 전환 2 ~ 3초 시점에 이전 그림과 새 그림이 겹쳐 보이는 중이거나 베일로 밝게 씻긴 상태여도 된다. 장면이 끝나면(약 7초) 새 그림만 보여야 한다. 이전 그림이 남아 있거나 단색이면 실패.
  - **끝난 뒤**: 7초 뒤 화면이 흔들리거나 다시 처음 크기로 되돌아가지 않는다(`both` fill로 끝 상태 유지).
  - 장면이 자동으로 다음으로 넘어가지 않고 독백이 정상 진행된다(`bindanimationend` 판정이 깨지면 crossfade가 안 끝나 다음으로 못 넘어간다).
- **수정 전과 대조**: 같은 장면의 수정 전 스크린샷(`artifacts/spike-c3/00-baseline-3s.png` · `00-baseline-10s.png` · `21-aab-prologue.png`)은 단색이다. 수정 후 `-7s`를 그 옆에 놓고 「단색 → 그림」으로 바뀐 것을 적는다. 수정 전과 같은 단색이면 **E6 실패**이고,
  이 경우 구현을 고치지 말고 계약(`spec.md` §5 [추론] 2)으로 되돌린다 — 상자의 transform에서도 그림이 안 그려지는 것이 실현된 것이다.
- **S3 · S4의 위험**: `reality` 프로필은 이전 탐색(`spike-c3.md`)에서 띄워 보지 못했다. 첫 실행(`e62cf211`)에서 S4를 처음 봤다. S5는 위 6번처럼 직접 관찰하지 않는다.
- **관찰 명령**: `shot` · `scene`, 화면 비교는 두 PNG를 나란히 열어 눈으로 한다(`sips -g pixelHeight` 등으로 크기를 같게 확인).

### E7 — iOS 서사 배경의 확대 움직임이 그대로다 (수용 기준 5)

계약은 이 변경이 iOS 보이는 결과를 바꾸지 않는다고 한다(그림이 아니라 같은 크기의 감싸는 `<view>`에 같은 키프레임을 걸었다). 눈으로 한 번 확인한다.

- **닿는 길 (정식 절차, 로컬 전용)**: 시뮬레이터에는 로그인을 지날 수단이 없다(소셜 로그인만 보이고 개발용 세션 주입이 없다 — [이 변경의 성능 보고서](../performance/reports/android-assets-narrative-background-iphone-17-pro-simulator-01.md)도 같은 경로로 쟀다). 그래서 **Release 호스트로는 서사 화면에 닿지 못한다.** 서사 화면은 dev 전용 playground로 본다. 이 경로는 **로컬에서만** 쓴다 — `current.ts`를 바꾼 채 커밋하지 않고, 끝나면 되돌린다.
  playground는 dev에서만 붙는 번들이다(`apps/mobile/lynx.config.ts`의 `entry`가 dev에서만 `playground: ./src/playground/index.tsx`를 더한다). `apps/mobile/src/playground/current.ts`의 `current` 한 줄이 처음 뜰 화면을 정한다(기본값 `"tutorial-journey"`). 서사 화면 이름은 `apps/mobile/src/playground/screens.tsx`에 있다:
  - `"tutorial-prologue"`: 프롤로그(S1 ~ S4 같은 장면 — `EpisodePrologueScreen`). 끝나면 `journey-map`으로 간다.
  - `"tutorial-final-story"`: 마무리 이야기(S5 — `TutorialSpecialsFixture initialStage={3}`). Android에서 직접 못 본 S5를 눈으로 볼 수 있는 유일한 길이다.
  ```sh
  # 0) 로컬에 남은 rspeedy dev가 다른 worktree 것이 아닌지 확인한다(포트 3000). 있으면 그 cwd를 확인하고 끈다
  lsof -nP -iTCP:3000 -sTCP:LISTEN
  # 1) 화면 고르기 — 로컬 전용, 커밋하지 않는다
  #    apps/mobile/src/playground/current.ts 의 current 를 "tutorial-prologue" (또는 "tutorial-final-story")로 고친다
  # 2) dev 서버(ui-lynx 빌드 후 rspeedy dev). playground 번들 주소: http://localhost:3000/playground.lynx.bundle
  pnpm dev            # 배경으로 두고, 브라우저/curl 로 http://localhost:3000/playground.lynx.bundle 이 200인지 본다
  # 3) 호스트 빌드 · 설치 — 아래 「iOS 호스트 빌드」. 번들 주소는 실행 인자가 덮어쓴다(ViewController.swift 의 templateURL)
  xcrun simctl launch $UDID com.libitum.host --bundle-url=http://localhost:3000/playground.lynx.bundle
  # 4) 끝나면 되돌린다 — 반드시
  git checkout apps/mobile/src/playground/current.ts
  # 5) dev 서버를 끈다(pkill 'rspeedy dev'는 놓친다 — 3000을 잡은 프로세스를 lsof 로 찾아 끈다)
  ```
  `current.ts`를 바꾼 뒤 HMR이 곧바로 그 화면을 띄운다. 화면 전환 동안(`-1s` · `-7s`)은 `xcrun simctl io $UDID screenshot <파일>.png`로 찍는다. 장면을 다시 보려면 앱을 다시 켠다(`simctl terminate` → `launch`).
  **탭은 `idb ui tap --udid $UDID <x> <y>`로 넣는다**(`simctl`에는 탭 명령이 없다). 좌표는 스크린샷의 포인트 좌표(픽셀 ÷ 3)다.
  `tutorial-final-story`에서는 `final-flight` → `final-cafe` 뒤에 **퀴즈 세 문항**을 지나야 `final-arrival`에 닿는다. 엔딩의 `reality` 전환(카페 → 기내)은 그보다 뒤다(r02에서는 도착 장면까지만 봤다).
- **iOS 호스트 빌드**: 앞선 iOS 확인과 같은 요령이다(`docs/performance/reports/android-tappable-inset-app-launch-iphone-17-pro-simulator-01.md`의 「실행 조건」 — Release / iphonesimulator / `CODE_SIGNING_ALLOWED=NO`, 새로 만든 iPhone 17 Pro 시뮬레이터). `--bundle-url` 인자는 `#if DEBUG` 밖에서 읽히므로(`apps/ios/Host/ViewController.swift`의 `templateURL`) Release 호스트에도 먹지만, http 로컬 주소가 막히면 Debug 구성으로 같은 명령을 다시 빌드한다. 호스트가 내장 번들을 쓰지 않고 dev 번들을 읽으므로 `pnpm bundle:host`는 필요 없다(이미 빌드한 호스트가 있으면 재사용).
  ```sh
  cd apps/ios && pod install --deployment
  xcodebuild -workspace Host.xcworkspace -scheme Host -configuration Release -sdk iphonesimulator -destination "platform=iOS Simulator,id=$UDID" CODE_SIGNING_ALLOWED=NO -derivedDataPath <scratch>/dd build
  xcrun simctl install $UDID <scratch>/dd/Build/Products/Release-iphonesimulator/Host.app
  git checkout apps/ios/Host.xcodeproj/project.pbxproj   # pod install가 바꾼 파일 되돌리기
  ```
  이 경로는 dev 번들(src alias)이라 Release의 내장 번들과 같은 빌드는 아니다. 서사 배경의 마크업 · CSS는 같으므로 눈 확인에는 쓸 수 있다. 결과 표 E7 방법 칸에 「playground, 로컬 전용」과 `current` 값을 적는다.
- **조작**: 위 경로로 서사 화면(`tutorial-prologue`, 필요하면 `tutorial-final-story`)을 띄워 S1 ~ S4(와 가능하면 S5)와 같은 방식으로 `-1s` · `-7s` 스크린샷을 찍는다.
- **기대**: 그림이 보이고 확대 움직임이 수정 전과 같다 — 같은 그림이 같은 곡선으로 천천히 확대된다.
- **판정 기준**
  - **통과**: `-1s` · `-7s`에 그림이 보이고 `-7s`가 `-1s`보다 확대돼 있다. 수정 전 기준 스크린샷이 있으면 같은 장면과 비교해 확대 정도가 눈에 띄게 다르지 않다(수정 전 iOS 스크린샷은 저장소에 없다 — 그러면 「기준 없음」으로 적고 움직임이 있다는 것만 판정한다).
  - **실패**: 그림이 사라지거나 움직임이 없거나 수정 전과 눈에 띄게 다르다.
  - **이 절차로 확인하지 못한다**: playground 경로(위)도 열 수 없으면(dev 서버나 시뮬레이터 문제 등) E7은 「이 절차로 확인하지 못한다」로 적고 사유를 쓴다. Release 호스트만으로는 서사 화면에 닿지 못하므로 그것을 사유로 삼지 않는다 — 로컬 경로를 시도하지 않은 not-run은 허용하지 않는다.
    그때 iOS 불변의 증거는 `ui` NB(상자가 그림과 같은 inset 0 상자로 같은 선언을 받는다는 마크업 단언)와 계약 §4.4의 기하학적 논거뿐이다 — 눈 확인은 비어 있다.

### E8 — 앱을 백그라운드로 보내면 효과음이 멈추고 돌아와도 이어지지 않는다 (수용 기준 1, 2)

`MainActivity.onStop`이 `stopAll()`을 부르는지를 본다(iOS의 `didEnterBackground`와 같은 계약 — 복귀 시 자동 재개 없음).

- **조작**: 위 E4의 수신 전화 화면(벨이 울리는 중)에서 벨이 울리는 것을 `players`로 확인한 뒤 **홈으로 간다**(`A shell input keyevent KEYCODE_HOME`). 홈 직후 `onStop`은 전환 애니메이션 뒤(약 1.5 ~ 2초)에 불려 2초 시점에는 아직 `started`로 보일 수 있다 — **3초 이상 기다리거나 `events`의 `event:paused` 시각(이 판정은 `onStop` 이후)으로 본다**: `sleep 4; players > "$OUT/E8-home.txt"; events > "$OUT/E8-home-events.txt"`. 앱으로 돌아온다(`A shell am start -n libitum.duru.android/com.libitum.host.MainActivity`). `sleep 2; players > "$OUT/E8-back.txt"; shot E8-back`.
  벨이 아니라 학습 화면의 효과음으로도 한 번 한다(짧은 효과음은 곧 끝나므로 벨이 이 항목의 주 관찰이다).
- **기대**: 홈으로 가면 벨 플레이어가 멈춘다. 돌아와도 벨이 자동으로 다시 울리지 않는다(화면이 아직 수신 전화 화면이면 이미 `stopRing`이 반영되지 않은 상태일 수 있음 — 아래 판정).
- **판정 기준**
  - **통과**: 홈 뒤 3초 이상 시점의 `E8-home.txt`에서 벨 플레이어(`USAGE_MEDIA` · `CONTENT_TYPE_SONIFICATION`)가 `paused`(또는 없거나 `stopped`)이고 `events`에 홈 이후 `event:paused`가 있다. `E8-back.txt`에도 벨이 자동으로 다시 시작되지 않았다(`paused` 그대로, 새 `started` 없음, `ring_bell` 재요청 로그 없음).
  - **실패**: 홈 뒤 3초 넘게 벨 플레이어가 `state:started` 그대로다(백그라운드에서 소리가 계속 난다). 홈 직후 2초 이내의 `started`는 실패가 아니다(`onStop` 지연).
  - 돌아온 화면에서 벨을 다시 울리는 것은 화면이 `ring_bell`을 다시 요청한 경우뿐이다 — 화면이 전화 수신을 그대로 두고 있으면 재요청이 일어나지 않아야 하는지 코드(`PrologueCallScreen`의 `useEffect`가 `incoming` 변화에만 반응)로 판단한다. 다시 울렸다면 어느 경로인지(화면 재마운트인지) 적는다.
  - 대사 오디오(`AudioPlaybackController`)의 백그라운드 정지는 기존 계측(`AudioPlaybackModuleTest`)이 진다 — 이 항목은 효과음만 본다.

### T1 ~ T3 — TalkBack을 켠 상태와 「애니메이션 제거」 (수동, 미실행)

아래 셋은 이 변경으로 Android에서 처음 실제로 생긴 경험이다 — 대사 자산이 들어가 대사가 처음 재생되고, 효과음이 처음 나고, 서사 배경 확대가 처음 보인다.
JUnit · 계측 · E1 ~ E8은 TalkBack 포커스 경합을 만들지 않고 시스템 애니메이션 배율을 바꾸지 않는다. **사람 귀와 TalkBack이 필요하고 CI 대상이 아니다.**
TalkBack은 Google Play 시스템 이미지나 Android Accessibility Suite가 있는 기기에서만 켤 수 있다([TalkBack 검증](android-talkback.md)). 기대는 코드와 Android 플랫폼의
공개 동작으로 추론한 것이다(효과음 계약 [의도된 차이](../specs/ios-sound-effects.md#의도된-차이) 3 · 4).

| 항목 | 조작 | 기대 | 청음 열에 적을 것 |
|---|---|---|---|
| T1 TalkBack 켬 + 대사 | 듣기 문항(E3의 `Listen to a Hello`)이나 E5 방송 줄이 재생되는 동안 한 번 스와이프한다 | `dumpsys audio`에서 SPEECH 플레이어가 `paused` → 낭독이 끝난 뒤 다시 `started`(포커스가 `LOSS_TRANSIENT_CAN_DUCK` → `GAIN`). 대사가 멈춘 동안 자막 타이핑은 계속 진행된다(차이 4) | 낭독이 끊기지 않는가, 재개 뒤 대사와 자막의 어긋남 |
| T2 TalkBack 켬 + 수신 벨 | E4의 수신 전화 화면에서 벨이 우는 동안 스와이프로 `Accept`까지 간다. 두 번 탭한다 | 벨 플레이어는 낭독 동안에도 낮아지지 않는다(차이 3 — 포커스를 쥐지 않음). 두 번 탭하면 벨 `paused`, `accept_call` `started`, SPEECH `started`. 포커스 순서는 이 변경으로 바뀌지 않았다 | 낭독 문구, 벨에 낭독이 가려지는가 |
| T3 「애니메이션 제거」 켬 | 개발자 옵션의 세 애니메이션 배율을 0으로 두거나 접근성 「애니메이션 삭제」를 켠 뒤 E6의 S1 · S2 · S4를 같은 방식(`-1s` · `-7s`)으로 찍는다 | 두 장이 같다(정지). 그림이 보이고, 베일이나 이전 그림이 남지 않는다(`animationend`가 발화해 전환이 끝난다). 근거는 Lynx Android가 키프레임을 `ObjectAnimator`로 돌린다는 것뿐이다 — 서사 화면 호출부는 `reducedMotion`을 넘기지 않는다 | — |

- **판정**: 기대와 다르면 「실패」가 아니라 관찰로 적고 [ADR-0045](../adr/0045-android-host-audio-assets.md)의 재검토 조건으로 넘긴다 — 셋 다 고치지 않고 기록한 동작이다.
  T3에서 확대가 그대로 돌면 그것은 이 변경 이전부터의 문제(호출부가 `reducedMotion`을 넘기지 않음)와 같은 축이라 별도 작업으로 넘긴다.

## 실행 결과

두 회차다. **r02**(`cb7dc6cd`)는 제품 코드가 첫 실행(`e62cf211`)과 같고 이 문서만 바뀐 상태에서, 바뀐 기준(E5 기대 정정 · S5 대체 · E7 로컬 경로 ·
E4/E8 판정 문구)으로 다시 실행한 결과다. 다시 실행하면 열을 하나 더하고 빌드 SHA · 기기 · 날짜를 적는다. 판정은 r02 열이 진다.

| 항목 | 첫 실행 `e62cf211` | r02 `cb7dc6cd` (2026-10-05, Pixel_8 AVD API 37 · iPhone 17 Pro iOS 26.5 시뮬레이터) | 근거(작업 산출물 `artifacts/e2e-r02/`) | 청음 |
|---|---|---|---|---|
| E1 | 통과 | **통과** — base-master에 m4a 21 · mp3 8, `Stored`가 아닌 항목 0. bundled APK 29개 전부 `Stored`. 원본 21 · 8. 수정 전 업로드 AAB 0개(첫 실행 인용) | `E1-assets.txt` · `E1-bundled-assets.txt` | — |
| E2 | 통과 | **통과(첫 실행 인용, 다시 실행하지 않음)** — `SoundEffectsModulefailed` 1 → 0, `play.button`, 새 SoundPool `started` | 첫 실행 `artifacts/e2e/E2-*` | 안 함 |
| E3 | 통과 | **통과** — (가) 오답 회차: `button` · `wrong_answer` · `lesson_complete` · `failed_lesson`(LESSON FAILED). (나) `Try again` 새 시도: `correct_answer` · `lesson_complete` · `pass_lesson`(PERFECT LESSON). 닿은 id 6/6, 모두 `play.<id>`와 새 `started` 짝. 포커스 줄 · `W` · `FATAL` 0. 효과음 `started`와 대사 `started`가 61ms 차로 겹쳤고 대사는 1.24초 뒤 자연 종료 — **긴 대사 위 직접 대조는 못 함**(간접 근거) | `E3a-*` · `E3b-*` | 안 함 |
| E4 | 통과 | **통과** — 전화 화면에 `play.ring_bell` + 벨 `started`, 약 21초 뒤 같은 플레이어가 `state:started`(USAGE_MEDIA · SONIFICATION, 14.3초 지점 되감김 기록). 받기 → 벨 `event:paused` · `SoundEffectsModule.stopRing.` · `accept_call` `started` · 대사(SPEECH) `started`. 받지 않고 뒤로가기 경로는 시도하지 않음 | `E4-*` | 안 함 |
| E5 | 통과(문서 기대가 코드와 달랐음) | **통과** — 탭 없는 회차: `AudioPlaybackModule.play.tutorial-cabin-announcement` → SPEECH `started` → `stopped` 5.78초(자산 5.68초). `AudioPlayback` `W` · `FATAL` 0. 화면은 방송 줄 그대로(자동 진행 없음). 듣기 문항 음성은 E3에서 `started` → `stopped` 1.2초 | `E5-*` · `S4-1s.png` · `S4-7s.png` | 안 함 |
| E6 | S1 ~ S4 통과, S5 not-run | **통과(S1 ~ S4)** — S1 날개 끝 y 390 → 372(위 · 바깥으로 약 18px, 둘째 독백에서도 372 유지). S2(`imagination`) 7초에 거리 그림만. S3 카페 그림. S4(`reality`) 7초에 활주로 그림만, 이전 그림 잔상 없음. 수정 전 단색 → 그림. **S5는 Android에서 직접 관찰하지 않음**(S1 ~ S4로 대신, iOS E7에서 직접 봄) | `S1-*` ~ `S4-*` | — |
| E7 | not-run | **통과** — playground, 로컬 전용, `current` = `tutorial-prologue` · `tutorial-final-story`, Release 호스트에 http 로컬 번들이 먹음. S1 날개 끝 1초 388 → 7초 370, S2 · S3 · S4 그림과 전환, S5 `final-flight`(388 → 366) · `final-cafe` · `final-arrival` 그려짐. 엔딩 `reality` 전환은 보지 못함. 수정 전 iOS 스크린샷 없음 → 「기준 없음」, 움직임 · 그림만 판정 | `E7-*` | — |
| E8 | 통과 | **통과** — 벨 `started` 뒤 HOME → 1.0초 뒤 `event:paused`, HOME +4초 `state:paused`. 복귀 +3초에도 `paused`, 새 `started` · `ring_bell` 재요청 0. 화면은 수신 전화 그대로. 별도 픽스처로 실행 | `E8-*` | 안 함 |
| T1 ~ T3 | — | **미실행** — TalkBack · 「애니메이션 제거」 수동 항목. 이 회차의 통과가 이 셋을 보증하지 않는다 | — | — |

- 앱 `FATAL EXCEPTION` 건수: 0(r02 전 항목).
- 서사 화면(E4 ~ E6 · E8)은 release AAB 분할 설치본 호스트에 픽스처 + 번들 서버로 읽은 번들이다(호스트 내장 번들로 선 화면이 아니다).
- 정리(r02): `current.ts` · `pbxproj` · `Podfile.lock` 되돌림, dev 서버(3000) · 번들 서버(18797) 종료, 전용 시뮬레이터 삭제, 에뮬레이터 `wm` 기본값 ·
  제스처 모드 그대로.

### 다음 실행 때 채울 것

- 빌드 SHA · 기기 · OS · 날짜, 앱 `FATAL EXCEPTION` 건수.
- 정리: 번들 서버(18797) 종료, 픽스처 종료(`STOP_SIGNED_IN_FIXTURE`), 에뮬레이터의 `wm` 값과 내비게이션 모드는 시작할 때로 되돌린다. E7을 했으면 `current.ts` 되돌림(`git diff apps/mobile/src/playground/current.ts`가 비어 있다) · dev 서버(포트 3000) 종료.
