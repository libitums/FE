# 동작 줄이기 설정이 앱의 실제 움직임을 멈춘다 (iOS · Android)

호스트가 OS의 「동작 줄이기」를 감지해 globalProps `reducedMotion`(boolean)으로 보내고, 앱의 `MotionProvider`가 그 값을 받아, 컴포넌트가 실제로
움직임을 걷는지를 시뮬레이터 · 에뮬레이터의 실제 호스트에서 확인한다. 흐름은 **호스트 감지 → globalProps → Provider → 컴포넌트의 실제 동작**
한 줄이다. 계약은 작업 `motion-reduced-motion`의 `spec.md` §5.1(호스트 키) · §5.6(관찰 요소)이 진다.

순수 판정과 DOM은 이미 다른 층이 진다 — 이 문서는 **기기에서만 보이는 것**(호스트가 값을 보내는가, 실행 중 토글이 따라오는가, 실제 애니메이션이
멈추는가)만 진다.

| 이미 지는 층 | 무엇을 |
|---|---|
| JUnit `ReducedMotionTest` · HostTests `ReducedMotionTests` | 호스트의 판정(`fromScales`)과 `{"reducedMotion": b}` 맵의 모양 |
| unit | 우선 규칙 · `reducedMotionFrom` · 클래스 토큰 · CSS 텍스트(`@media` 0건, reduced 규칙) |
| ui | Provider → 컴포넌트의 `data-motion` · 클래스 · 즉시 표시 |
| integration | globalProps → `App` → Dialog 한 길, `motion` alias |

수용 기준 대응(`spec.md` §6): **AC1** = M-I1 · M-I2, **AC2** = M-A1 · M-A2(판정식은 JUnit), **AC9** = M-I4 ~ M-I6 · M-A4 ~ M-A6.
가정 A1(키 단위 병합)은 M-I3 · M-A3, A2(첫 화면의 값)는 M-I1 · M-A1, A3(접근성 토글이 `ContentObserver`를 깨움)는 M-A2가 닫는다.

## 이 절차로 확인하지 못하는 것

- **iOS 실기**: 시뮬레이터로 판정한다. 실기는 닿으면 M-I1 · M-I4를 한 번 더 하고, 못 하면 「미확인」으로 적는다. 시뮬레이터 통과를 실기 통과로 적지 않는다.
- **`simctl`로 동작 줄이기를 켜는 수단**: `simctl ui`에는 없다(appearance · 대비 · 글자 크기만 다룬다). *(2026-10-11 정정: **있다** —
  `xcrun simctl spawn "$UDID" defaults write com.apple.Accessibility ReduceMotionEnabled -bool true` 뒤 앱을 재실행(`terminate` → `launch`)하면 호스트가 값을 읽는다. 재부팅도 설정 앱
  손 조작도 필요 없다 — [0.4.0 motion 토큰 e2e](motion-tokens.md) 「눌림 확장 회차」가 확인했다(4단계 회차는 같은 `defaults write` 뒤 재부팅을 썼다). 끌 때는 `-bool false` + 재실행.
  시작 값은 `defaults read com.apple.Accessibility ReduceMotionEnabled`로 읽어 결과 표에 적고 끝에 되돌린다. 설정 앱 손 조작은 이 명령이 서지 않을 때의 대체 수단이다.)*
  그 회차는 **재실행 뒤만** 확인했다 — 실행 중인 앱에 바로 반영되는지는 보지 않았으므로 「실행 중 토글이 따라오는가」(M-I3)는 설정 앱 손 조작 절차 그대로다.
- **`data-motion` 값을 직접 읽는 수단**: 없다고 본다. 이 속성은 접근성 트리에 오르지 않고(`uiautomator dump`와 시뮬레이터 접근성 검사기가 읽는 것은 접근성
  이름 · 라벨이다), 호스트는 보낸 값을 로그로 남기지 않는다. **그래서 M-I1 · M-A1의 「값」은 M-I4 ~ M-I6 · M-A4 ~ M-A6의 캡처 결과(움직이는가)로 판정한다.**
  읽는 수단을 찾았으면(예: 디버그 표시) 결과 표의 비고에 그 방법을 적고, 못 찾았으면 「캡처로 대신함」이라고 적는다. 값을 추측해 적지 않는다.
- **Android 배율 0이 플랫폼 애니메이터도 멈추는 겹침**: Android에서 「동작 줄이기」를 켜는 방법은 배율을 0으로 두는 것이고, 배율 0은 Lynx가 키프레임을 돌리는
  `ObjectAnimator`도 어차피 즉시 끝낸다([Android 효과음 · 서사 배경](android-assets.md)의 T3). 그래서 Android에서는 **앱의 `reduced` 분기가 켜졌는가와 플랫폼이
  멈췄는가를 캡처로 가를 수 없다.** Android의 판정 본체는 **M-A1(호스트가 보낸 값 — 두 배율 중 하나라도 0이면 reduced)과 M-A2(실행 중 따라옴)** 이고,
  M-A4 ~ M-A6의 캡처는 「두 효과가 겹쳐도 깨진 것이 없다(잔상 · 베일 · 반쯤 그려진 면 없음)」만 본다. Android의 AC9는 이 한계 안에서만 닫힌다.
  - 이 한계를 줄이는 길은 **배율 하나만 0**으로 두는 것이다(`transition_animation_scale`만 0이고 `animator_duration_scale`은 1이면 호스트는 reduced를 보내는데
    Lynx 키프레임을 돌리는 animator 배율은 1이다 — M-A4 ~ M-A6은 먼저 이 설정으로 돌린다). 이 설정에서 움직임이 걷히면 앱의 reduced 분기가 한 일이다.
    다만 `ObjectAnimator`가 `animator_duration_scale`만 따르는지는 이 문서가 확인하지 않은 추론이므로, 결과 표에 어느 설정에서 어떻게 보였는지를 그대로 적는다.
- **캡처 간격의 정밀도**: `simctl io screenshot` · `screencap`은 한 번에 수백 ms가 걸린다. 전환(대개 200 ms 안팎)의 중간 프레임을 두 장 잡는 것은 운이 섞인다.
  그래서 전환 항목(M-I4 · M-I5 · M-A4 · M-A5)은 **녹화를 기본으로 하고 프레임을 뽑아 비교한다**(아래 「연속 두 장 비교」). `ffmpeg`가 이 개발 머신에 있는지는 확인하지
  않았다 — 없으면 녹화 파일을 QuickTime · 영상 플레이어에서 한 프레임씩 넘겨 스크린샷으로 남긴다.
- **눌림 피드백이 reduced에서 사라지는 것**(`spec.md` §11 Q2): 이 회차(0.3.0)에서는 의도된 결과였다. **2단계(0.4.0)부터는 `opacity.pressed-shade` 막이 눌림을 알린다** —
  막의 관찰은 [0.4.0 motion 토큰 e2e](motion-tokens.md) M2-I5 · M2-A5가 진다. M-I5는 그대로 「축소가 없다」만 본다.
- Spinner 회전 · Button Loading: [0.4.0 motion 토큰 e2e](motion-tokens.md)(M2-I3 · M2-I4 · M2-I6 · M2-A3 · M2-A4 · M2-A6). 보상 배지 · 문항 전환: 3단계
  [보상 · 문항 전환 e2e](motion-reward.md)(M3-I1 ~ M3-I8 · M3-A1 ~ M3-A8 — reduced 분기는 M3-I5 · M3-A5). custom 화면 전환은 3단계가 적용하지 않았고 Card · Tooltip은 변경이
  없다 — 이 작업의 범위 밖이다. *(2026-10-11 주: Card는 눌림 확장으로 변경됐다 — interactive Card · Button · OptionSelector 항목 · 앱의 bank 칩 · 롤플레이 카드의 reduced 눌림(막 또는
  색만)은 [0.4.0 motion 토큰 e2e](motion-tokens.md) 「눌림 확장 회차」 M5-I5가 판정한다. Tooltip만 변경이 없다.)*
- TalkBack · VoiceOver를 켠 상태: accessibility 단계의 몫이다.

## 전제

1. **수정이 들어간 호스트와 번들, 둘 다 새로 빌드한다.** 번들만 새로 만들면 호스트가 `reducedMotion`을 보내지 않아 켠 상태에서도 움직이고, 결과가 「안 됨」으로
   읽힌다([Android 내비게이션 바](android-navigation-insets.md) 전제 1과 같은 함정). 결과 표에 빌드한 SHA를 적는다.
2. **전용 시뮬레이터 · 에뮬레이터**를 쓴다(전역 접근성 설정을 바꾸고 앱 데이터를 지운다).
3. **시작 전에 전역 설정 값을 기록하고, 끝에 되돌린다.** 값을 적어 두지 않고 시작하지 않는다.
4. **「같다 = 정지, 다르다 = 움직임」.** 연속 캡처 두 장을 나란히 놓고, 지정한 측정(폭 · 높이 · 글자 수 · 지름)이 같은지 다른지만 적는다. 「부드럽다」 · 「자연스럽다」 같은
   인상은 판정이 아니다. 두 장이 모두 전환이 끝난 모양이면 **판정 불가**로 적고 다시 잡는다(통과로 적지 않는다).
5. 로그인된 상태에서 시작한다([공통 전제](README.md#공통-전제)). 한 항목을 **끈 상태**와 **켠 상태**로 두 번 돌려 서로 비교한다 — 켠 상태 한 장만으로 통과를 적지 않는다.

### 증거 파일 이름

`docs/e2e/evidence/motion-reduced-<platform>-<id>-<n>.png` — `<platform>`은 `ios` 또는 `android`, `<id>`는 `M-I4` 같은 항목 id, `<n>`은 `off-1` · `off-2` ·
`on-1` · `on-2`(끈 상태 두 장 · 켠 상태 두 장). 예: `motion-reduced-ios-M-I4-on-2.png`. 영상은 같은 이름에 `.mov` · `.mp4`로 두고 저장소에 커밋하지 않는다
(프레임 캡처 PNG만 증거로 올린다).

### iOS 준비 (시뮬레이터 iPhone 17 Pro)

[워크플로 문서의 호스트 빌드 절차](../conventions/workflow.md)와 [디자인 토큰 e2e](design-token-rendering.md)의 `--bundle-url=main.lynx` 실행을 그대로 쓴다.
Debug는 `localhost:3000`의 dev 서버를 읽어 다른 작업 트리의 코드가 뜰 수 있으므로 **번들 내장 번들을 쓰게 인자를 준다.**

```sh
pnpm bundle:host
cd apps/ios && pod install
git checkout Host.xcodeproj/project.pbxproj   # pod install이 고친 것을 되돌린다
xcodebuild -workspace Host.xcworkspace -scheme Host \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath /tmp/dd build
cd ../..
export UDID=<전용 시뮬레이터 UDID>      # xcrun simctl list devices booted
xcrun simctl install "$UDID" /tmp/dd/Build/Products/Debug-iphonesimulator/Host.app
xcrun simctl launch "$UDID" com.libitum.host --bundle-url=main.lynx
```

- 동작 줄이기의 **시작 값을 기록**한다: 설정 › 손쉬운 사용 › 동작 › 동작 줄이기의 켜짐/꺼짐을 결과 표 「시작 값」에 적는다. 끝에 그 값으로 되돌린다.
- 재실행은 `xcrun simctl terminate "$UDID" com.libitum.host` 뒤 위 `launch`다.
- 캡처: `xcrun simctl io "$UDID" screenshot docs/e2e/evidence/motion-reduced-ios-<id>-<n>.png`
- 녹화: `xcrun simctl io "$UDID" recordVideo --codec h264 /tmp/motion-reduced-ios-<id>-<off|on>.mov &` 로 시작, 조작을 한 뒤 `kill -INT %1`(또는 해당 PID)로 끝낸다.

### Android 준비 (에뮬레이터 Pixel_8, API 37)

[Android 시스템 뒤로가기](android-system-back.md)의 「전제」 · 「앱 구간 진입 (로그인 없이)」를 그대로 따른다(`E2E_UDID` · `ADB` · `A` 함수 · `wm size 390x844` ·
`wm density 160` · 글자 배율 1.0 · `SignedInScreenFixtureTest` · 번들 서버 18790). 그 내용은 되풀이하지 않는다. 이 절차만의 부분:

```sh
export E2E_UDID=emulator-5554
export ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
A() { "$ADB" -s "$E2E_UDID" "$@"; }
A shell wm size 390x844; A shell wm density 160; A shell settings put system font_scale 1.0

# 호스트와 번들 둘 다 새로
PUBLIC_SUPABASE_URL=https://example.invalid PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
(cd apps/android && ./gradlew :app:assembleDebug assembleDebugAndroidTest)
python3 -m http.server 18790 --bind 0.0.0.0 --directory apps/mobile/dist >/tmp/libitum-motion-preview.log 2>&1 &
A install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
A install -r apps/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
```

**시작 전 세 배율을 기록한다.** `null`이면 설정된 값이 없다는 뜻이고 끝에 `delete`로 되돌린다(`1.0`을 써 넣지 않는다 — 시작 상태가 달라진다).

```sh
for k in animator_duration_scale transition_animation_scale window_animation_scale; do echo "$k=$(A shell settings get global $k)"; done
# 끝에 되돌리기 — 시작 값이 숫자면 put, null이면 delete
A shell settings put global animator_duration_scale <시작 값>      # 또는: A shell settings delete global animator_duration_scale
A shell settings put global transition_animation_scale <시작 값>   # 또는: A shell settings delete global transition_animation_scale
```

- **값을 바꾼 뒤 앱을 「재실행」한다는 것은 픽스처를 새로 시작하는 것**이다(`pm clear` → `am instrument …`, 뒤로가기 문서의 5번). 호스트는 `onCreate`에서 값을 읽는다.
- 접근성 토글: 설정 › 접근성 › 색상 및 모션(에뮬레이터 영어 UI는 Accessibility › Color and motion) › 「애니메이션 삭제」(Remove animations). 메뉴 이름은 시스템 이미지마다
  다를 수 있다 — 켠 직후 `A shell settings get global animator_duration_scale`이 `0.0`(세 배율 모두)이면 이 토글을 켠 것이다.
- 한 번 캡처: `A exec-out screencap -p > docs/e2e/evidence/motion-reduced-android-<id>-<n>.png`
- 녹화: `A shell screenrecord --time-limit 5 /sdcard/mr.mp4`(백그라운드) → 조작 → `A pull /sdcard/mr.mp4 /tmp/motion-reduced-android-<id>-<off|on>.mp4`

### 연속 두 장 비교

전환 중간을 잡아야 하는 항목(M-I4 · M-I5 · M-A4 · M-A5)은 다음 순서로 한다.

1. 끈 상태에서 **녹화를 시작하고 조작한 뒤 녹화를 끝낸다.** 같은 조작을 켠 상태에서 한 번 더 한다.
2. 녹화에서 조작 직후의 **연속 두 프레임**(전환이 시작된 지 대략 0.1 s와 0.3 s 지점)을 `ffmpeg -ss 0.1 -i <영상> -frames:v 1 …-1.png`,
   `-ss 0.3 …-2.png`로 뽑는다. 이 간격은 근사이므로 **프레임이 전환 중에 걸렸는지부터** 확인한다 — 두 프레임이 모두 정지 모양(전환 전이나 후)이면 판정 불가다.
3. 두 프레임에서 항목이 지정한 측정만 비교해 「같다」 또는 「다르다」로 적는다.

Android는 짧은 전환이면 `A shell input tap x y; A exec-out screencap -p > …-1.png; A exec-out screencap -p > …-2.png`로 이어 찍을 수도 있다. 이것은 녹화를 보조한다.

## 조작 도달 길

| 대상 | 어디서 | 어떻게 |
|---|---|---|
| Dialog(`ui-lynx-dialog`) | 학습 화면의 나가기 확인창 | 맵의 열린 스텝 → `Start` → 학습 화면의 `×`. 확인창이 서면 `Leave` · `Keep going` 두 버튼이 있다([Android 시스템 뒤로가기](android-system-back.md) B3의 좌표 표) |
| RoundButton(`ui-lynx-round-button`) | 여정 맵의 시작 단추 · 학습 화면의 큰 둥근 단추 | 누른 채로 캡처한다(iOS는 시뮬레이터에서 마우스를 눌러 둔 채, Android는 `A shell input swipe x y x y 3000`으로 3초 누름) |
| VisualNovelDialog(`ui-lynx-visual-novel-dialog`) | iOS: 「카페에 도착한 지민」 비주얼 노벨 · Android: 튜토리얼 「Before We Land」 프롤로그 | iOS는 [비주얼 노벨 iOS Release E2E](visual-novel.md) F1의 길, Android는 [Android 효과음 · 서사 배경](android-assets.md) E6의 「서사 화면에 닿는 길」 |
| BottomSheet · ProgressHeader · 설정 토글 · PageIndicator | 설문 시트 · 학습 화면 머리의 진행 · 설정 탭 · 온보딩 | 기록용(M-I7) — 화면을 보고 누른다 |

좌표는 진입 수단일 뿐 판정이 아니다. 스크린샷으로 위치를 확인하고 다르면 같은 대상을 누른다.

## iOS 항목

시작: 전용 시뮬레이터에 위 「iOS 준비」를 마친 상태, 「시작 값」을 기록한 상태.

### M-I1 — 호스트가 값을 보낸다: 끈 상태 → 켠 상태로 재실행 (AC1, 가정 A2)

- **조작**: 동작 줄이기를 **끄고** 앱을 재실행해 M-I4의 조작(Dialog 열기)을 한 번 한다. 이어서 동작 줄이기를 **켜고** 앱을 재실행해 M-I4를 한 번 더 한다.
- **관찰(통과 조건)**: 끈 재실행에서는 M-I4의 「끈 상태」 결과(첫 프레임의 컨테이너가 더 작다), 켠 재실행에서는 「켠 상태」 결과(크기 변화 없음)가 나온다. 첫 화면에서의 값이 맞았는지
  (가정 A2)는 이 켠 재실행의 **첫 Dialog**가 이미 reduced인지로 본다.
- `data-motion` 값을 직접 읽는 수단이 있으면 `ui-lynx-dialog`의 `data-motion`이 각각 `standard` · `reduced`인지 비고에 적는다. 없으면 「캡처로 대신함」이라고 적는다.
- 증거: `motion-reduced-ios-M-I1-off.png`, `-on.png`(Dialog가 선 화면 한 장씩).

### M-I2 — 실행 중에 따라온다 (AC1)

- **조작**: 앱을 켠 채로(재실행 없이) 홈으로 나가 설정 앱에서 동작 줄이기를 **바꾸고** 앱으로 돌아온다. 돌아온 뒤 **처음 여는** Dialog를 M-I4 기준으로 본다. 반대 방향(켬 → 끔)으로도 한 번 한다.
- **관찰**: 돌아온 뒤 처음 여는 Dialog가 **바꾼 새 값**대로 움직인다(끔→켬: 크기 변화 없음, 켬→끔: 첫 프레임이 더 작다). 이전 값대로 나오면 실패다(`reduceMotionStatusDidChangeNotification`을
  못 받았거나 `updateGlobalProps` 뒤 재렌더가 없다).
- 증거: `motion-reduced-ios-M-I2-<off-to-on|on-to-off>-<n>.png`.

### M-I3 — 셸 여백이 그대로다 (가정 A1)

- **조작**: 토글 전과 후에 같은 화면(여정 맵)을 캡처한다.
- **관찰**: 상단 상태바 아래 머리와 하단 홈 인디케이터 위 탭 바의 위치가 두 장에서 같다(상단 띠 · 하단 띠의 높이를 비교). 달라지면 `reducedMotion` 전송이 `safeAreaInsets`를 지운 것(키 단위
  병합이 아님)이다.
- 증거: `motion-reduced-ios-M-I3-off-1.png`, `-on-1.png`.

### M-I4 — Dialog는 불투명도만 바뀐다 (AC9)

- **조작**: **켠** 상태에서 학습 화면 `×`로 나가기 확인창(`ui-lynx-dialog`)을 열고, 위 「연속 두 장 비교」로 두 프레임을 뽑는다. **끈** 상태에서 같은 조작을 한다.
- **관찰**:
  - 켠 상태: `ui-lynx-dialog` 컨테이너의 폭 · 높이가 두 프레임에서 **같다**(크기 변화 없음), **불투명도만 다르다**(첫 프레임이 더 옅다).
  - 끈 상태: 첫 프레임의 컨테이너가 두 번째보다 **작다**(scale 0.96에서 1로).
  - 두 프레임이 모두 전환 전/후면 판정 불가.
- **측정 주의(2026-10-09 r02에서 배운 것)**: 켠 상태의 첫 프레임은 **반투명**(페이드 중)이라 그림자가 임계값 아래로 떨어져, 그림자를 포함해 재는 폭 · 높이는 정착값보다
  작게 나올 수 있다(한 회차에서 1002/780 · 984/771 · 960/756이 섞여 나왔다). 그래서 폭 · 높이 값이 아니라 **카드 상자의 위 · 아래 · 좌우 전환점**(배경과 카드 면의 경계)을
  비교한다 — 켠 상태에서는 첫 프레임과 정착 프레임의 전환점이 같고, 끈 상태에서는 첫 프레임만 안쪽으로 들어가 있다. 폭 · 높이만 보고 「켠 상태에서도 줄었다」로 적지 않는다.
- 증거: `motion-reduced-ios-M-I4-on-1.png`, `-on-2.png`, `-off-1.png`, `-off-2.png`.

### M-I5 — RoundButton은 눌러도 줄어들지 않는다 (AC9)

- **조작**: **켠** 상태에서 RoundButton(여정 맵 · 학습 화면)을 눌러 둔 채 캡처하고, 누르기 전 모습도 한 장 남긴다. **끈** 상태에서 같은 조작을 한다.
- **관찰**: 켠 상태에서는 `ui-lynx-round-button`의 surface 지름이 누르기 전과 **같다**(축소 없음). 끈 상태에서는 누른 모습이 누르기 전의 **95 %**다. 눌림 색이 없는 것은 실패가 아니다(Q2) —
  2단계(0.4.0)부터는 켠 상태에서 surface가 막으로 어두워지는데, 그 관찰은 이 항목이 아니라 [M2-I5](motion-tokens.md#m2-i5--켠-상태에서는-줄지-않고-어두워진다-ac4-가정-a2)다.
- 증거: `motion-reduced-ios-M-I5-on-1.png`(누르기 전), `-on-2.png`(누른 중), `-off-1.png`, `-off-2.png`.

### M-I6 — 비주얼 노벨 대사가 한 번에 선다 (AC9)

- **조작**: **켠** 상태에서 서사(카페 도착 비주얼 노벨)의 대사 화면에 진입한 직후를 캡처한다. **끈** 상태에서 같은 조작을 한다.
- **관찰**: 켠 상태에서는 진입 직후의 **첫 프레임부터** `ui-lynx-visual-novel-dialog`의 대사가 **전체**다(글자 수가 이후 프레임과 같다). 끈 상태에서는 글자가 늘어나고 있다(첫 프레임이 이후 프레임보다 짧다).
  이어서 켠 상태의 계속 표시(`ui-lynx-visual-novel-dialog-continue-indicator`)가 위아래로 튀지 않는지(두 프레임에서 y가 같다)도 본다 — 2단계(0.4.0)가 bounce keyframe 자체를 걷어
  **standard에서도 정지**이므로, 이제 켠 · 끈 어느 쪽도 튀면 실패다([M2-I7](motion-tokens.md#m2-i7--vn-계속-표시가-튀지-않는다) · M2-A7이 끈 상태에서 본다).
- 증거: `motion-reduced-ios-M-I6-on-1.png`, `-on-2.png`, `-off-1.png`, `-off-2.png`.

### M-I7 — 나머지 컴포넌트 (기록)

- **조작**: **켠** 상태에서 BottomSheet(설문 · 국가 시트), ProgressHeader 진행, 설정 토글, PageIndicator를 차례로 움직인다.
- **관찰**: 위치 · 너비 · knob이 **즉시** 바뀌고(이동 · 확대 · 너비 전환이 없다), 색 · 불투명도 전환은 남는다. **판정하지 않고 기록한다** — 본 것을 항목마다 한 줄로 적는다.
  *(2026-10-11 주: Button · Card · OptionSelector의 reduced 눌림은 여기서 기록하지 않는다 — 판정 항목이 따로 있다(`motion-tokens.md` M5-I5).)*
- 증거: 필요한 것만 `motion-reduced-ios-M-I7-<컴포넌트>-<n>.png`.

## Android 항목

시작: 위 「Android 준비」를 마치고 세 배율을 기록한 상태. 픽스처를 시작해 여정 맵이 선 상태에서 시작한다(`audioProgress true` — Dialog 열 스텝이 필요하다).

### M-A1 — 호스트가 두 배율을 읽어 값을 보낸다 (AC2, 가정 A2)

세 번 돈다. 매번 **값을 바꾼 뒤 픽스처를 새로 시작**(`pm clear` → `am instrument …`)해 M-A4의 Dialog를 한 번 연다.

| 회차 | 설정 | 기대 값 |
|---|---|---|
| a | `A shell settings put global animator_duration_scale 0` (transition은 1) | `reduced` |
| b | `animator_duration_scale`을 1로 되돌리고 `A shell settings put global transition_animation_scale 0` | `reduced` |
| c | 둘 다 1: `A shell settings put global animator_duration_scale 1; A shell settings put global transition_animation_scale 1` | `standard` |

- **관찰(통과 조건)**: a · b의 Dialog가 켠 상태의 모양(M-A4 기준: 크기 변화 없음), c의 Dialog가 끈 상태의 모양(첫 프레임이 더 작다)이다. 한계(배율 0이 플랫폼 애니메이터도 멈춤 — 「이 절차로
  확인하지 못하는 것」)로 a · b에서 `standard`와 `reduced`가 캡처로 갈리지 않으면 **갈리지 않는다고 적는다.** 이때 값은 JUnit `ReducedMotionTest`(판정)와 M-A2(변화 추종)의 간접 증거로만
  지지된다.
- `window_animation_scale`만 0인 경우는 `false`가 계약이다(`spec.md` §12). 필요하면 d 회차로 `window_animation_scale 0`, 나머지 1에서 `standard`인지 본다.
- 끝: 세 배율을 시작 값으로 되돌린다.
- 증거: `motion-reduced-android-M-A1-<a|b|c>-1.png`.

### M-A2 — 실행 중에 따라온다 (AC2, 가정 A3)

- **조작**: 앱을 켠 채(픽스처가 서 있는 동안) 다음을 차례로 한다. 매번 다음 Dialog를 M-A4 기준으로 연다.
  1. `A shell settings put global animator_duration_scale 0` → Dialog → 닫기
  2. `A shell settings put global animator_duration_scale 1` → Dialog → 닫기
  3. 설정 › 접근성 › 「애니메이션 삭제」를 **켠다**(세 배율이 0이 되는지 `settings get`으로 확인) → Dialog → 닫기
  4. 같은 토글을 **끈다** → Dialog
- **관찰**: **재실행 없이** 다음 Dialog가 새 값대로(`ContentObserver`가 깨웠다). 3에서 따라오지 않고 1에서만 따라오면 가정 A3이 틀렸다는 뜻이다(접근성 토글이 같은 길로 오지 않는다) — 실패로 적고
  그 사실을 보고한다.
- 증거: `motion-reduced-android-M-A2-<1|2|3|4>-1.png`.

### M-A3 — 3버튼 여백이 그대로다 (가정 A1)

- **조작**: `A shell cmd overlay enable com.android.internal.systemui.navbar.threebutton`으로 3버튼 모드에서, 토글 **전과 후**(배율 0 ↔ 1) 같은 화면(하단 탭이 보이는 맵)을 캡처한다.
- **관찰**: `app-shell` 아래 여백과 탭 바 바닥 면이 두 장에서 같다 — 수치는 [Android 내비게이션 바와 하단 탭 바](android-navigation-insets.md)의 N 수치가 정본이다. 달라지면 `reducedMotion` 전송이
  `tappableBottomInset`을 지웠다(키 단위 병합이 아님).
- 증거: `motion-reduced-android-M-A3-off-1.png`, `-on-1.png`.

### M-A4 · M-A5 · M-A6 — Dialog · RoundButton · 비주얼 노벨 (AC9, 한계 안에서)

M-I4 · M-I5 · M-I6과 같은 조작·측정으로 캡처한다(Android: Dialog는 맵 → 스텝 → `×`, RoundButton은 `A shell input swipe x y x y 3000`, 비주얼 노벨은 프롤로그 첫 독백). **두 설정으로 각각 돈다.**

| 설정 | 의미 |
|---|---|
| (i) `transition_animation_scale 0`, `animator_duration_scale 1` | 호스트는 `reduced`를 보내지만 animator는 살아 있다 — 앱의 reduced 분기가 한 일을 가장 가깝게 본다 |
| (ii) 접근성 「애니메이션 삭제」 | 세 배율 모두 0 — 실제 사용자의 설정. 플랫폼이 멈추는 효과와 겹친다 |
| (끈 상태) 둘 다 1 | 대조 |

- **관찰**: 항목별 측정(폭·높이, surface 지름, 글자 수)은 M-I4 · M-I5 · M-I6과 같다. (i)에서는 **켠 상태의 모양**이 나와야 한다. (ii)에서는 모양이 같다는 것에 더해 **잔상 · 베일 · 반쯤 그려진 면이
  없다**(전환이 끝난다). (i)에서도 끈 상태와 갈리지 않으면 「animator가 transition 배율에도 묶여 있다」는 뜻일 수 있으니 갈리지 않는다고 적는다 — 통과로 적지 않는다.
- 증거: `motion-reduced-android-M-A4-<i|ii|off>-<1|2>.png`, `M-A5`, `M-A6` 같은 꼴.

### M-A7 (선택) — 계측 테스트

`ReducedMotionHostTest`(계측: `settings put global …` 뒤 `MainActivity`가 마지막으로 보낸 값을 읽음)는 **이 변경에 없다**(`ReducedMotionTest`는 JVM 단위 테스트다). 만들지 않았고, 만들더라도
이 문서의 M-A1 · M-A2 판정을 대신하지 않는다. 결과 표에 「없음」으로 적는다.

## red의 근거 — 수정 전 호스트(`296e2eac`)

`296e2eac`(수정 직전) 호스트는 `reducedMotion` 키를 **보내지 않는다.** 앱은 키가 없으면 늘 `standard`다. 따라서 수정 전 호스트 + 수정 전 번들에서:

- **M-I1 · M-A1**: 값을 내지 않는다 — 어느 설정에서도 Dialog가 끈 상태의 모양이다(켠 설정에서도).
- **M-I4 ~ M-I6 · M-A4 ~ M-A6(설정 (i))**: 켠 설정에서도 움직인다(Dialog 크기 변화, RoundButton 95 %, 글자 타이핑). Android는 설정 (ii)에서 플랫폼 정지와 겹쳐 구분되지 않을 수 있다 — 수정 전의
  Android red는 **(i)로 본다.**

e2e-red가 이것을 확인하는 길은 둘이다.

1. **수정 전 호스트 + 번들로 한 번 돈다.** `git worktree add /tmp/mr-before 296e2eac`로 수정 전 작업 트리를 만들어 위 「iOS 준비」 · 「Android 준비」를 그 트리에서 하고, M-I1 · M-I4 ~ M-I6 · M-A1 · M-A4 ~ M-A6을
   켠 설정으로 돌려 「켠 설정에서도 움직인다 / 값이 안 나온다」를 캡처로 남긴다. 호스트와 번들 **둘 다** 수정 전이어야 한다(번들만 수정 전이면 호스트 쪽 결함이 드러나지 않고, 호스트만 수정 전이면
   앱이 이미 키를 기다리지만 키가 오지 않는다 — 둘 다 같은 「늘 standard」로 보이지만 어느 쪽 결함인지 가려지지 않는다).
2. **돌리지 않는다면 `moot` 조건을 쓴다.** 에뮬레이터 · 시뮬레이터를 쓸 수 없거나 수정 전 빌드를 만들 수 없을 때, red를 `moot`으로 처리하려면 (a) 선행 단계의 증거 — 호스트 unit(JUnit · HostTests)과 앱
   integration의 red(키가 없으면 늘 standard라는 `App.motion.integration.test.tsx`)와 (b) 코드 근거 — `296e2eac`의 `ViewController.swift` · `MainActivity.java`에 `reducedMotion` 문자열이 없다
   (`git grep -n reducedMotion 296e2eac -- apps/ios/Host apps/android/app/src/main`이 0줄)는 것 — 를 적는다. 이 경우 e2e의 red는 **기기에서 관찰한 것이 아니라 코드 근거로 대신한 것**이라고 명시하고,
   green 단계의 켠/끈 대조가 유일한 기기 증거가 된다.

### 실제로 일어난 일 — 두 회차

red는 위 1 · 2 어느 쪽으로도 돌지 않았다. **수정 후 빌드(`d5ff18d9`)로 절차를 한 번 돌았고**(첫 회차), Android는 7항목이 통과 · 판정 불가로 닫혔는데 **iOS가
M-I1 · M-I2 · M-I4 · M-I5에서 실패**했다(켠 상태에서도 첫 Dialog 프레임이 930/748로 작음 · RoundButton 216→206). 진단(격리 워크트리의 화면 오버레이)에서 JS가
받는 값이 `{reducedMotion: 1}`(number)임을 확인했다 — 원인은 iOS 호스트가 `updateGlobalProps(with: [String: Any])` Dictionary 오버로드로 보내,
Lynx `LynxTemplateData`의 `DEFAULT_USE_BOOL_LITERALS = NO`가 Swift `Bool`을 lepus 숫자 1로 바꾸고 앱의 `=== true`가 거짓이 된 것이다. 호스트를
`LynxTemplateData(dictionary:useBoolLiterals:true)`로 보내게 고쳤고(`d602fe08`, 계약은 그대로 boolean — [ADR-0044](../adr/0044-android-tappable-inset.md) D1
「후속 확장」), **둘째 회차(r02)는 iOS만 다시 돌아 M-I1 ~ M-I5 통과**, M-I6은 두 회차 모두 판정 불가다. 첫 회차의 iOS 실패는 「수정 전 호스트가 값을 내지 않는다」와
같은 모양(켠 설정에서도 움직인다)이라, 결과적으로 이 회차가 red의 관찰(켠 설정에서도 움직임)과 green의 대조(같은 절차 · 같은 측정 · 고친 빌드)를 함께 남겼다.

## 결과

두 회차다. 첫 회차(e2e-red, 빌드 `d5ff18d9`)는 Android 7항목과 iOS 7항목, 둘째 회차(e2e-green r02, 빌드 `d602fe08`)는 **iOS만** 다시 돌았다 —
`d5ff18d9..d602fe08`의 차이는 `apps/ios/Host/ReducedMotion.swift` · `ViewController.swift` 두 파일뿐이라 Android 호스트 · 번들 산출물이 같다(Android 결과는 첫
회차를 인용한다). 캡처 · 측정 스크립트는 저장소에 넣지 않았다 — 작업 `motion-reduced-motion`의 산출물 `artifacts/e2e-red/` · `artifacts/e2e-green/`에 있고 파일
이름은 위 「증거 파일 이름」 대신 `<platform>-<id>-<구분>-<n>.png` 꼴이다. `ffmpeg`가 없어 녹화 대신 연속 캡처(iOS 약 100 ms 간격 `tools/burst.py`,
Android 기기 안 `screencap` 루프)로 중간 프레임을 잡았다. `data-motion` 값을 읽는 수단은 찾지 못해 **캡처로 대신했다.** 통과·실패는 `통과` / `실패: <관찰>` /
`판정 불가: <이유>` / `미확인`으로만 적는다.

| 항목 | 플랫폼 | 결과 | 비고(설정 · 측정값 · 증거 파일) |
|---|---|---|---|
| M-I1 | iOS 시뮬레이터 | 통과(r02) | 끈 재실행의 첫 Dialog 930/748 → 1002/780(standard). 동작 줄이기를 켜고 재부팅한 뒤 첫 실행의 **첫 Dialog**가 첫 프레임부터 카드 상자 933..1689 · 123..1083으로 정착과 같다(reduced) — 가정 A2 성립(첫 화면부터 값이 실린다). 캡처로 대신함. `ios-M-I1-off.png` · `-on.png`. 첫 회차는 **실패**(켠 상태 첫 프레임 930/748 — 위 「실제로 일어난 일」) |
| M-I2 | iOS 시뮬레이터 | 통과(r02) | 앱 프로세스 유지(pid 429 동일). 설정 앱 스위치 켬 → 끔 뒤 첫 Dialog 930/748 → 1002/780(standard), 끔 → 켬 뒤 첫 Dialog 960/756 → 1002/780이지만 카드 상자 불변(reduced — 「측정 주의」). 스위치는 idb 탭이 첫 번에 자주 안 먹어 2 ~ 3회 탭. `ios-M-I2-*`, `-settings-off/on.png`. 첫 회차는 **실패**(끔 → 켬 뒤 930) |
| M-I3 | iOS 시뮬레이터 | 통과(두 회차) | 끈 · 켠 여정 맵 캡처가 상태바 시계 영역(x 249 ~ 276, y 79 ~ 116)을 빼고 픽셀 동일 — `reducedMotion` 전송이 `safeAreaInsets`를 지우지 않는다(가정 A1). `ios-M-I3-off-1.png` · `-on-1.png` |
| M-I4 | iOS 시뮬레이터 | 통과(r02) | 켠 5회 모두 카드 상자(top 933 · bottom 1689 · 폭 961) 불변, 첫 프레임은 반투명(페이드만). 끈 3회는 첫 프레임 930/748(상자 top 944 · bottom 1678 · 138..1067) → 991/775 → 1002/780. 켠 첫 프레임의 그림자 포함 값은 1002/780 · 984/771 · 960/756으로 흔들려 카드 상자로 판정 — 「측정 주의」. `ios-M-I4-on-*` · `-off-*` · `-cardbox.txt`. 첫 회차는 **실패** |
| M-I5 | iOS 시뮬레이터 | 통과(r02) | 켠: surface 지름 216 → 216(11프레임 전부, 축소 없음). 끈: 216 → 212 → 206(95.4 %). 눌림 색 없음은 실패가 아님(Q2). `ios-M-I5-on/off-*`. 첫 회차는 **실패**(켠 상태 216 → 206) |
| M-I6 | iOS 시뮬레이터 | 판정 불가: 끈 상태에서도 대사가 첫 Dialog 프레임부터 전체 | 끈 ko 664 · en 0 / 켠 ko 664 · en 0(글자 잉크 픽셀) — 진입 직전 프레임만 페이드이고 켠 · 끈이 캡처로 갈리지 않는다(두 회차 같음). 계속 표시 y 비교 안 함. 즉시 표시는 코드 · ui 테스트(TW · VN · CB)로 닫혀 있다. `ios-M-I6-on/off-*` |
| M-I7(기록) | iOS 시뮬레이터 | 부분 기록(판정 없음) | 설정 탭에 토글이 없고 알림 항목은 시스템 권한 창만 띄움(허용 안 함으로 닫음). BottomSheet · PageIndicator · ProgressHeader 진행은 도달하지 못함 → **미확인** |
| (실기) M-I1 · M-I4 | iOS 실기 | 미확인 | 실기 없음 |
| M-A1 | Android 에뮬레이터 | 통과(첫 회차) | a(`animator_duration_scale 0`, transition 1): reduced 모양 · b(animator 1, `transition_animation_scale 0`): 중간 프레임 카드 폭 320(축소 없음) · c(둘 다 1): 폭 310 ~ 318(축소). d 회차(`window_animation_scale`만 0)는 돌지 않음. `android-M-A1-a/b/c-*.png` · `-a-summary.txt` |
| M-A2 | Android 에뮬레이터 | 통과(첫 회차) | 1 ~ 4 모두 **재실행 없이** 다음 Dialog가 새 값대로. 접근성 「Remove animations」 토글(세 배율 0.0 ↔ 1.0, `settings get`으로 확인)도 따라옴 — 가정 A3 성립. `android-M-A2-1~4-1.png` · `-s1~s4-summary.txt` |
| M-A3 | Android 에뮬레이터 | 통과(첫 회차) | 3버튼, 배율 1 → 0 → 1에서 하단 행 차이 0 — `tappableBottomInset` 유지(가정 A1). `android-M-A3-off-1.png` · `-on-1.png` |
| M-A4 | Android 에뮬레이터 | 통과(첫 회차) | (i) · (ii) 모두 카드 폭 320 불변, 잔상 · 베일 없음; 끈 상태는 중간 프레임 310 ~ 318. **배율 0에서도 Lynx 페이드 중간 프레임이 보였다** — 「배율 0이 Lynx 키프레임도 멈춘다」는 이 에뮬레이터에서 성립하지 않아 (ii)에서도 앱의 reduced 분기(페이드만 · 축소 없음)가 끈 상태(축소)와 갈렸다. 중간 프레임 포착은 운이 섞임(끈 10회 중 8회, (i) 15회 중 4회, (ii) 5회 중 3회). `android-M-A4-i/ii/off-*` |
| M-A5 | Android 에뮬레이터 | 통과(첫 회차) | 끈 72 → 68(축소), (i) 72 → 72, (ii) 72 → 72. `android-M-A5-off-ctrl-*` · `-i-*` · `-ii-*` · `-measure.txt` |
| M-A6 | Android 에뮬레이터 | 판정 불가: 끈 상태에서도 첫 프레임부터 대사 전체 | 켠 · 끈이 캡처로 갈리지 않아 켠 상태 캡처는 찍지 않음(M-I6과 같은 한계). `android-M-A6-off-1/2.png` |
| M-A7(선택) | Android 에뮬레이터 | 없음 | 계측 테스트 없음(`ReducedMotionTest`는 JVM 단위 테스트) |

| 시작 값(실행 전 기록) | iOS 동작 줄이기: 0(꺼짐) · Android `animator_duration_scale`: `null` · `transition_animation_scale`: 1.0 · `window_animation_scale`: 1.0 |
|---|---|
| 확인자 | test-runner 에이전트(두 회차). 첫 회차 iOS 실패의 진단 · 재판정은 root |
| 날짜 | 2026-10-09 — 첫 회차 Android 판정 캡처 03:42 ~ 04:00, r02 iOS 04:30 ~ 04:45 |
| 빌드 SHA (호스트 · 번들) | Android 호스트 · 번들 `d5ff18d9`(첫 회차) / iOS 호스트 · 번들 `d602fe08`(r02; 첫 회차는 `d5ff18d9`). 번들은 로그인을 위해 `PUBLIC_SUPABASE_URL=https://localhost:18791`(iOS, 모의 TLS 서버) · `https://example.invalid`(Android)로 빌드 |
| 기기 · OS · 빌드 종류 | iPhone 17 Pro 시뮬레이터(iOS 26.5, 전용 `motion-reduced-e2e` · `motion-green`) · **Release** Host(`CODE_SIGNING_ALLOWED=NO`, pod install 안 함) + `--bundle-url=main.lynx` — 절차의 Debug와 다르다 / Pixel_8 AVD `emulator-5554` API 37 · debug + androidTest, 번들 서버 18792(18790은 다른 세션이 점유) |
| 설정 복원 확인 | iOS 0 → 0, 전용 시뮬레이터 `shutdown` · `delete`(목록 0건). Android `delete` · 1.0 · 1.0, `wm size`/`density` · `font_scale` · `navigation_mode` 원복. **TalkBack이 시작 시점에 켜져 있었다**(다른 세션의 잔재 — 탭이 탐색 모드로 먹혀 끄고 진행) → 끝에 세 값(`enabled_accessibility_services` · `accessibility_enabled` · `touch_exploration_enabled`)을 그대로 되돌림 |
