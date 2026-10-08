# Android 시스템 뒤로가기

Android 시스템 뒤로가기(◁ 또는 가장자리 스와이프)가 앱 안의 「보이는 닫기」와 같은 길을 타는지, 앱을 떠나는 자리에서
`moveTaskToBack`/`finish`가 결정대로 갈리는지를 에뮬레이터의 실제 Activity에서 확인한다. 결정은
[ADR-0043](../adr/0043-android-system-back.md)이 진다. 순수 판정(`SystemBackGate` · `defaultBackDecision` · 핸들러 스택)과 화면별 닫기는
JUnit · `ui` · `integration`이 이미 진다 — 이 문서는 **실제 Activity에서만 보이는 것**만 진다.

## 이 절차로 확인하지 못하는 것

- **실제 JS 무응답(500ms 타임아웃 분기)**: 에뮬레이터에서 JS를 멈출 수단이 없다. 이 절차로 확인하지 못한다. 증거는
  `SystemBackGateTest`의 SG6 · SG9(JUnit)다. B2는 「응답이 500ms 안에 왔다」는 쪽만 본다.
- **첫 유닛 안내 가림막 위의 뒤로가기**: 계측 픽스처로는 안내가 서지 않는다(B4(a)). 증거는 `integration` IB7
  (`App.system-back.integration.test.tsx`)과 `ui` UL8(`PrologueCallScreen.back.ui.test.tsx`)이다.
- **ready 전 누름의 종료를 결정적으로 재현하는 것**: 에뮬레이터에서는 누름의 주입 시점이 흔들려 B8(b)가 여러 번 중 한 번만
  맞는다. 이 분기의 정본 증거는 JUnit `SystemBackGateTest` SG1(미준비 누름 = `FINISH`)이고 B8(b)는 보조 관찰이다.
- **TalkBack을 켠 상태의 동작**: B1 ~ B9는 전부 TalkBack을 끈 상태다. 관측 항목 T1 ~ T6을 아래에 적어 두었고 **아직 실행하지 않았다.**
- **Android 8 ~ 12(API 26 ~ 32)의 `onBackPressed()` 경로**: 이 버전대는 `OnBackInvokedCallback`이 아니라 `MainActivity`의
  `onBackPressed()` 재정의를 탄다. 이 경로는 **컴파일만 확인됐고 한 번도 실행되지 않았다** — 실행한 AVD가 API 37 하나다.
  아래 「API 32 이하 관측 항목」 L1을 적어 두었고 **아직 실행하지 않았다.**
  ⟨2026-10-05 뒤⟩ L1이 API 30 에뮬레이터 하나(3버튼)에서 실행돼 통과했다 — 그 절의 결과 표. API 26 ~ 29 · 31 ~ 32와 제스처 모드는 여전히 실행되지 않았다.
- **응답 간격의 숫자**: 호스트는 누름 · 응답 로그를 남기지 않는다. 간격은 읽지 않고, 「타임아웃(500ms)이 지나도 앱이 앞에 있다
  = 응답이 그 안에 왔다」로 판정한다(B2).
- 실제 소셜 로그인 · 운영 서버 계정 · 서버 푸시. 로그인 뒤 구간은 계측 픽스처(모의 세션)로 들어가고, B9의 푸시는 픽스처가 올리는
  로컬 알림이다.

## 전제

- 에뮬레이터 **Pixel_8 AVD(API 37)**. 전용 에뮬레이터를 쓴다(`wm size`를 바꾸고 앱 데이터를 지운다).
- JDK 17 이상, Android SDK, `ANDROID_HOME`, `python3`, `pnpm` 의존 설치 완료.
- **16 KB 호환성 대화상자는 뜨지 않아야 한다.** 이 AVD(API 37, 16KB 페이지)는 2026-10-05의 출시 설정 변경(작업 `android-release-config`,
  [ADR-0046](../adr/0046-android-play-release.md)) 전까지 프로세스가 새로 뜨거나 HOME에서 돌아올 때마다 「Android App Compatibility」
  대화상자를 띄웠다. 그 변경 이후로는 **뜨지 않는다 — 뜨면 회귀다**(`pm clear` · 재설치 뒤에도 같다). 판정과 되돌릴 곳은
  [Android 출시 설정 절차](android-release-config.md)의 R1이 진다. **떠 있는 동안 뒤로가기는 대화상자가 먹는다**(앱에 가지 않는다) —
  그래서 **모든 항목의 「누르기 전 확인」** 은 그대로다: 스크린샷이나 dump에 이 대화상자(`Android App Compatibility`)가 없을 것.
  있으면 닫고 넘어가지 말고 그 시도를 버린 뒤 회귀로 적는다.
- 아래 변수를 한 셸에서 정한다. 이후 명령은 모두 이 셸에서 돌린다.

```sh
export E2E_UDID=emulator-5554          # adb devices 로 확인한 전용 에뮬레이터 ID
export ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
A() { "$ADB" -s "$E2E_UDID" "$@"; }   # 함수다 — `A shell …`로 부른다. 문자열 변수(`A="adb -s …"; A shell …`)는 zsh에서 command not found가 난다
A shell wm size 390x844; A shell wm density 160; A shell settings put system font_scale 1.0
```

### 준비 — 16 KB 호환성 대화상자가 없는지 확인

```sh
A shell am start -n libitum.duru.android/com.libitum.host.MainActivity --es bundle-url http://10.0.2.2:18790/main.lynx.bundle
sleep 3; A shell uiautomator dump /sdcard/ui.xml >/dev/null; A shell cat /sdcard/ui.xml | grep -o 'Android App Compatibility\|Don.t Show Again\|text="OK"'
```

**기대**: 출력이 한 줄도 없다. 앱을 `force-stop`하고 다시 열어, 또 HOME으로 나갔다가 다시 열어서도 같은지 본다.
`pm clear`와 APK 재설치(`bundled` ↔ `debug` 교체 포함) 뒤에도 뜨지 않아야 한다.

`Android App Compatibility`가 나오면 **`Don't Show Again`으로 닫고 진행하지 않는다.** 재빌드한 Lynx · Fresco AAR(`apps/android/vendor-maven`)이나
16 KB 정렬 게이트가 빠진 빌드라는 뜻이다 — 이 절차를 멈추고 [Android 출시 설정 절차](android-release-config.md)의 R1로 간다.
(이 문서의 아래 「실행 결과」는 대화상자가 뜨던 때의 기록이라 `Don't Show Again`을 누른 흔적이 남아 있다. 기록이므로 고치지 않았다.)

### 두 가지 설치 — 쓰임이 다르다

| APK | 만드는 법 | 쓰는 항목 |
|---|---|---|
| `bundled`(번들 내장, 네트워크 불필요) | `pnpm bundle:android` → `cd apps/android && ./gradlew assembleBundled` → `A install -r app/build/outputs/apk/bundled/app-bundled.apk` | B7(새 설치에서 진입 구간) |
| `debug` + 계측 픽스처(로그인 뒤 구간) | 아래 「앱 구간 진입」 | B1 ~ B6, B9, B8 |

`bundled`는 새 설치(`A shell pm clear libitum.duru.android`) 상태에서 스플래시 → 온보딩 → 로그인으로 가므로 **로그인 없이** 진입 구간을
볼 수 있다. 로그인 뒤 구간은 소셜 로그인을 지날 수 없으므로 아래 픽스처를 쓴다.

**두 APK는 같은 패키지(`libitum.duru.android`)라 한 번에 하나만 설치된다.** 실행 순서가 `debug` 항목 → B7(`bundled`) → B8(`debug`)이므로
B7 뒤에는 `debug`를 **재설치(`-r`)로** 되돌린다. 지우고 새로 설치하지 않는다.

```sh
A install -r apps/android/app/build/outputs/apk/debug/app-debug.apk   # B7 뒤, B8 앞
```

### 앱 구간 진입 (로그인 없이)

`apps/android/app/src/androidTest/java/com/libitum/host/SignedInScreenFixtureTest.java`가 저장소에 테스트 세션
(`libitum.auth.session`)을 심고 갱신 요청만 모의한 뒤 Activity를 띄워 둔다. 번들은 로컬 HTTP로 제공한다
(`devtools/android-maestro/run-signed-in-settings.sh` · `run-audio-playback.sh`와 같은 구성).

```sh
# 1) 번들 — 실제 서버 주소가 번들에 들어가지 않게 모의 값으로 만든다
PUBLIC_SUPABASE_URL=https://example.invalid PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
# 2) Debug APK + 계측 APK
cd apps/android && ./gradlew assembleDebug assembleDebugAndroidTest && cd ../..
# 3) 번들 제공 (별도 터미널 또는 백그라운드)
python3 -m http.server 18790 --bind 0.0.0.0 --directory apps/mobile/dist >/tmp/libitum-back-preview.log 2>&1 &
# 4) 설치
A install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
A install -r apps/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
# 5) 픽스처 시작 — 여정 맵이 서면 STOP 방송을 받을 때까지 Activity를 유지한다 (최대 180초)
A shell pm clear libitum.duru.android
A shell pm grant libitum.duru.android android.permission.POST_NOTIFICATIONS   # B9 푸시용(pm clear가 권한을 지우므로 clear 뒤에). API 33 미만에서는 이 줄을 건너뛴다 — 권한이 API 33부터라 API 30에서 Unknown permission 예외가 난다
A shell am instrument -w -e class com.libitum.host.SignedInScreenFixtureTest \
  -e audioProgress true -e bundleUrl http://10.0.2.2:18790/main.lynx.bundle \
  libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner >/tmp/libitum-back-fixture.log 2>&1 &
# 6) 끝낼 때
A shell am broadcast -a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE
```

- `-e audioProgress true`는 진행 5스텝을 심어 **학습 유닛(듣기)** 이 맵에서 바로 열리게 한다(B3). 진행이 없어도 B1 · B2 · B4(b)(c) · B5 · B6 · B7 · B9는 돈다.
- 픽스처는 **180초 뒤 스스로 끝난다**. 항목 묶음마다 다시 시작한다(5번을 다시 실행).
- 픽스처가 띄운 Activity도 일반 `MainActivity`다. 뒤로가기로 홈에 나간 뒤 다시 여는 것은 `A shell am start -n libitum.duru.android/com.libitum.host.MainActivity`
  (singleTask라 같은 Activity가 앞으로 온다).
- 이 구성의 한계: 픽스처는 갱신 요청 외 모든 요청에 404를 돌려주므로 서버 진행 불러오기(`load_learning_progress`)가 끝나지 않는다. 그래서 `hasLoadedProgress`가 서지 않고 첫 유닛 안내 가림막은 이 구성에서 뜨지 않는다(B4 참고).
- 이 구성의 한계: 모의 세션이라 서버 데이터가 없다. 서버가 필요한 화면은 이 절차의 대상이 아니다.

### 내비게이션 모드 전환

기본은 에뮬레이터 설정을 따른다. 아래로 바꾸고 확인한다(바꾼 직후 홈으로 가면 앱을 다시 연다).

```sh
A shell cmd overlay enable com.android.internal.systemui.navbar.threebutton   # 3버튼(◁ ○ □)
A shell cmd overlay enable com.android.internal.systemui.navbar.gestural      # 제스처
A shell settings get secure navigation_mode                                   # 현재 모드: 0 = 3버튼, 2 = 제스처
```

⚠ `cmd overlay list | grep navbar`는 모드 확인에 쓰지 않는다 — 전환 뒤에도 threebutton · gestural이 둘 다 `[x]`로 나올 수 있다
(작업 `android-tabbar-inset`의 에뮬레이터 실행에서 관찰).
두 오버레이가 모두 `[x]`일 때의 일반 `enable`은 우선순위만 바꿔 앱의 Activity가 유지되지만, 한 오버레이만 켜는 전환(`enable-exclusive --category …` · 설정 앱)은 **API 35 이하에서** `MainActivity`를 재생성한다(API 36 이상에서는 `assetsPaths`를 직접 처리해 재생성되지 않는다 — 실측은 API 37과 API 30이고 경계 36은 추론이다. 2026-10-06 —
[Android 화면 방향과 구성 변경](android-orientation.md)의 O10 (c)). 뒤로가기 항목은 모드를 바꾼 **뒤** 앱을 연 상태에서 시작하므로 어느 쪽이든 판정이 같다.

### 뒤로가기를 누르는 법

- 3버튼: ◁ 탭(390x844에서 약 (83,820)). 제스처: 화면 왼쪽(또는 오른쪽) 가장자리에서 안쪽으로 스와이프(`A shell input swipe 2 420 200 420 150`).
- 명령: `A shell input keyevent KEYCODE_BACK` (줄여서 `A shell input keyevent 4`). 사람이 눌러도 되고 명령으로 눌러도 된다. 아래 기대 결과는 같다.

### 참고 좌표 (390x844 · 160 dpi · 글자 배율 1.0)

에뮬레이터 실행에서 실측한 **참고값**이다. 좌표는 진입 수단일 뿐 판정이 아니다 — 매번 스크린샷으로 위치를 확인하고 다르면
같은 대상을 누른다. 표에 없는 대상은 스크린샷을 보고 누른다.

| 대상 | 좌표 | 쓰는 항목 |
|---|---|---|
| 3버튼 내비게이션의 ◁ | (83,820) | B2 · B4 · B6 |
| 온보딩 `Next` | (195,767) | B7 |
| 로그인의 보이는 `Back` | (43,86) | B7(a) |
| 하단 탭 `Roleplay` | (195,808) | B5 |
| 하단 탭 `Settings` | (290,808) — 수정 전 3버튼 빌드에서는 탭 바가 겹쳐 (290,789)처럼 위쪽을 눌러야 했다. ADR-0044 뒤 3버튼은 (291,760) | B5 · B9(a) |
| 맵의 「Listen to a Hello」 스텝(맵을 두 번 스와이프한 뒤) | (195,677) | B3 |
| 스텝 말풍선의 `Start` | (195,698) | B3 |
| 학습 화면의 `×` | (43,142) | B3 |
| 나가기 확인창의 `Leave` | (195,436) | B3 |

### 관찰 명령 — 앱이 앞에 있나 / 떠났나 / 끝났나

```sh
# 앞에 있는가 — 출력에 libitum.duru.android/com.libitum.host.MainActivity 가 있으면 앞(RESUMED)
A shell dumpsys activity activities | grep -E "topResumedActivity|mResumedActivity"
# Activity 기록이 남았는가 — 0이면 끝남(finish), 1 이상(실제로는 여러 줄)이면 남음/떠남(moveTaskToBack)
A shell dumpsys activity activities | grep -c "libitum.duru.android/com.libitum.host.MainActivity"
# 프로세스 — moveTaskToBack은 pid가 그대로, 끝난 Activity도 pid는 남을 수 있다(pid로 「끝남」을 판정하지 않는다)
A shell pidof libitum.duru.android
```

판정 어휘(항목 전체에서 같다):

| 판정 | 앞 Activity | MainActivity 기록 |
|---|---|---|
| **남음** | 앱 | 있음 |
| **떠남**(`moveTaskToBack`) | 런처 등 다른 앱 | 있음 |
| **끝남**(`finish`) | 다른 앱 | 없음(누른 뒤 2초 안에 0) |

화면 내용은 `A exec-out screencap -p > /tmp/back-<id>.png`로 남기고, 글자는 `A shell uiautomator dump /sdcard/ui.xml && A shell cat /sdcard/ui.xml`의
`content-desc`/`text`로 읽는다(Maestro 흐름과 같은 이름: `Journey, selected`, `Back to map`, `Settings` 등).
⚠ **dump에 나오지 않는 글자가 있다** — 학습 문항의 문구는 읽히지 않는다(확인창의 `Leave` · `Keep going`은 읽힌다). 그런 화면이
「이전과 같은가」는 스크린샷을 나란히 놓고 본다(B3).
누르기 전에 16 KB 대화상자가 없는지 본다(전제). 누른 뒤에는 `sleep 1.5`를 둔다 — 이것은 임의 대기가 아니라 **500ms 타임아웃이 지나기를 기다리는 것**이 판정의 일부다(B2).

## 실행 순서

준비(16 KB 대화상자가 없는지 확인) → B1 → B2 → B4(b)(c) → B5 → B3 → B9 → B6 → (`bundled` 설치 · 앱 데이터 초기화) B7 → (`debug` 재설치) B8.
B4(a)(첫 유닛 안내 가림막)는 이 절차에서 뺐다(B4 참고).

**해결됨(ADR-0044) — 3버튼 내비게이션에서 하단 탭 바 겹침**: 이 절차를 쓸 때(제품 코드 `f23712a2`)는 3버튼 모드에서 하단 탭 바가
시스템 내비게이션 버튼(◁ ○ □)과 겹쳐 그려졌고(기준 커밋 `444fcfd6`에서도 동일), 그래서 **탭을 누르는 조작(B5 · B9(a))을 제스처 모드에서
했다.** 이 겹침은 [ADR-0044](../adr/0044-android-tappable-inset.md)로 고쳐졌다 — 3버튼에서 알약이 시스템 바 위 12에 서고 눌린다.
수정이 들어간 빌드에서는 탭 조작도 3버튼에서 할 수 있다(탭 가운데 y가 3버튼 760 · 제스처 808로 다르다). 3버튼 · 제스처의 탭 바 확인은
[Android 내비게이션 바와 하단 탭 바](android-navigation-insets.md)가 진다. 아래 「실행 결과」는 수정 전 빌드의 결과다.

## 항목

### B1 — 준비 완료: 로그인된 상태로 실행 · safe area 불변

- **조작**: 「앱 구간 진입」 5번으로 픽스처를 시작한다. 맵이 서면 스크린샷을 남긴다(`/tmp/back-B1-<모드>.png`). 내비게이션 모드를 3버튼 · 제스처 각각으로 바꿔 다시 한 장씩 남긴다.
- **기대 결과**: 여정 맵(`journey-map-screen`)이 서고 하단 탐색에 `Journey, selected`가 읽힌다. 상단 헤더가 상태 표시줄 밑에, 하단 탐색이 내비게이션 바 위에 있어 겹치지 않는다. 뒤로가기 구현 전과 같은 여백이다.
- **판정 기준**
  - 픽스처 로그 `/tmp/libitum-back-fixture.log`에 실패가 없고(`journey screen did not render` 없음) uiautomator dump에 `Journey, selected`가 있다. → 통과(준비 완료).
  - safe area: 두 모드의 스크린샷에서 헤더 · 하단 탐색이 시스템 바에 가려지지 않는다. 기준선은 커밋 `444fcfd6`(뒤로가기 작업 직전, safe area 커밋 포함; `main`에는 이 커밋이 없다)을 같은 AVD에 Debug로 빌드해 찍은 같은 화면이며, 여백이 다르면 실패. 기준선 빌드를 만들지 못했으면 「기준선 없음, 가려짐 없음만 확인」으로 적는다.
  - ⚠ 그 기준선은 **3버튼에서 하단 탭 바가 시스템 버튼 밑에 깔린 상태**다(알약 48 중 36이 시스템 바 밑). 「여백이 같다」는 뒤로가기 작업이 여백을
    바꾸지 않았다는 뜻일 뿐 3버튼 탭 바가 가려지지 않았다는 뜻이 아니다. [ADR-0044](../adr/0044-android-tappable-inset.md) 뒤의 빌드는 3버튼 탭 바가
    48 올라가 있어 이 기준선과 다르다 — 그 빌드의 탭 바는 [Android 내비게이션 바와 하단 탭 바](android-navigation-insets.md)의 기준 수치로 본다.

### B2 — 알림 화면에서 뒤로가기는 맵 · 앱이 닫히지 않는다 (수용 기준 1)

- **조작**: 맵에서 첫 사용 안내를 닫고(B4 앞부분을 이미 했다면 생략) 헤더의 알림 아이콘을 눌러 알림 화면(`Back to map`이 읽힌다)으로 간다. 뒤로가기를 한 번 누른다: `A shell input keyevent KEYCODE_BACK; sleep 0.7; <앞 확인>; sleep 1; <앞 확인>`.
- **기대 결과**: 맵이 서고(`Back to map`을 누른 것과 같다) 앱은 앞에 남는다. 0.7초 · 1.7초 두 시점 모두 **남음**이다.
- **판정 기준**
  - 두 시점 모두 앞이 `libitum.duru.android/com.libitum.host.MainActivity` + 화면이 맵 → 통과. 0.7초는 타임아웃(500ms) 경과 직후라, 여기서 남아 있으면 JS의 `handled` 응답이 500ms 안에 온 것이다(응답이 늦었다면 `moveTaskToBack`으로 **떠남**이 된다). 이것으로 「누름 → 응답 왕복이 500ms 안」을 한 번 적는다. 숫자 간격은 읽지 못한다(위 「확인하지 못하는 것」).
  - 앞이 런처로 바뀌면 **떠남** = 실패(구현 전에는 이렇게 끝난다).
- **하위 조작 — 대기 중 재누름 무시**: 알림 화면에서 `A shell input keyevent KEYCODE_BACK KEYCODE_BACK`(한 호출에 두 번). 두 번째는 첫 응답이 오기 전에 도착하면 호스트가 무시한다. 기대: 맵에서 **남음**(두 번째가 맵의 「떠남」으로 처리되지 않는다). 이 하위 조작은 도착 간격에 달려 있어 확률적이다 — 떠나면 3회 재시도하고, 3회 모두 떠나면 실패로 기록한다(결정적 증거는 JUnit 게이트의 「대기 중 재누름 = IGNORE」).
- 3버튼과 제스처 모두에서 한 번씩 한다(제스처는 스와이프 명령으로).

### B3 — 학습 유닛: 확인창 두 번 (수용 기준 1 · 2)

- **조작**: `audioProgress true` 픽스처의 맵에서 듣기 유닛에 들어간다. 좌표는 e2e-red에서 390×844 제스처 모드로 실측한 **참고값**이며, 매번 스크린샷으로 위치를 확인하고 다르면 같은 대상을 누른다.
  ```sh
  A shell input swipe 195 590 195 211 700; A shell input swipe 195 590 195 211 700   # 맵을 두 번 스와이프
  A shell input tap 195 677    # 「Listen to a Hello」 스텝 (참고값)
  A shell input tap 195 698    # 말풍선의 Start (참고값)
  ```
  문항 화면(`learning-shell-exit` `×`가 왼쪽 위에 있다)이 서면: **스크린샷(문항 기준 장)** → 뒤로가기 → 스크린샷 → 뒤로가기 → 스크린샷 → `×`(`A shell input tap 43 142`, 참고값) → 확인창의 `Leave`(`A shell input tap 195 436`, 참고값).
- **기대 결과**: 1회째 나가기 확인창(`ui-lynx-dialog`)이 뜬다. 2회째는 확인창만 닫히고 **같은 문항**이 그대로다(떠나지도, 나가지도 않는다). `×` → `Leave`는 맵으로 간다.
- **판정 기준**: 1회째 직후 uiautomator dump에 `Leave` · `Keep going`이 읽힌다. 2회째 직후 dump에서 그 둘이 사라지고, **2회째 뒤의 스크린샷이 뒤로가기 전의 문항 기준 장과 같은 문항이다.** 문항 문구는 dump에 나오지 않으므로 「같은 문항」은 dump가 아니라 **스크린샷 비교로만** 판정한다. 두 누름 모두 `sleep 1.5` 뒤 **남음**. `Leave` 뒤 맵에 `Journey, selected`. 이 중 하나라도 어긋나면 실패.
- 좌표가 맞지 않으면(다른 화면 크기) 스크린샷을 보고 같은 위치를 누른다 — 좌표는 진입 수단일 뿐 판정이 아니다.

### B4 — 층만 닫힌다 (수용 기준 3)

세 가지를 각각 한 번씩 한다. 판정은 같다: 층(가림막 · 말풍선 · 모달)이 닫히고, **맵은 그대로**이며, 앱은 **남음**이다.

- **(a) 첫 유닛 안내 가림막** — **에뮬레이터 픽스처로 재현 불가 — 증거는 integration IB7과 ui UL8.** 사유: 안내는 `AppSession.tsx`의
  `FirstUnitGuideProvider enabled`(`progress.hasLoadedProgress` + 진행 0 + 비주얼 노블 `active`/`beatIndex 0`)에서만 서는데,
  `hasLoadedProgress`는 `load_learning_progress` 응답을 받아 합친 뒤에만 참이 된다. `SignedInScreenFixtureTest`는 갱신 요청 외 모든 요청에 404를 돌려주므로 불러오기가 끝나지 않아
  `audioProgress true`/`false` 어느 쪽으로도 가림막이 서지 않는다(e2e-red 실측: 0/13 맵, 스크림 없음). 서려면 픽스처(계측 테스트)가 불러오기 응답을 돌려줘야 하며, 이 작업은 픽스처를 고치지 않는다. 이 하위 항목은 실행하지 않고 판정에서 제외한다.
- **(b) 스텝 말풍선** — 맵에서 스텝을 눌러 말풍선(`step-sheet-close`가 있는 시트)을 연다 → 뒤로가기. 말풍선만 닫히고 같은 스크롤 위치의 맵이다.
- **(c) 연속 칩 모달** — 헤더의 연속(스트릭) 칩을 눌러 모달(`journey-stat-modal-*`, 닫기가 `Back to map`)을 연다 → 뒤로가기. 모달만 닫힌다.
- **판정 기준**: (b)(c)에 대해, 누른 뒤 1.5초에 uiautomator dump의 층 문구가 사라지고 맵의 `Journey, selected`가 읽힌다. 앱이 런처로 가면(떠남) 실패. 층이 닫히지 않고 맵으로 간 경우(층을 건너뛴 경우)도 실패 — 스크린샷에 층이 보이는지 본다.

### B5 — 다른 탭 루트에서 뒤로가기는 여정 탭 (수용 기준 4)

- **조작**: (제스처 모드에서 — 위 「알려진 문제」) 하단 탐색의 롤플레이 탭(`Roleplay`) → 뒤로가기. 다시 설정 탭(`Settings`) → 뒤로가기.
- **기대 결과**: 둘 다 여정 맵이 서고 하단 탐색은 `Journey, selected`다. 앱은 닫히지 않는다.
- **판정 기준**: 각 누름 뒤 1.5초에 **남음** + dump에 `Journey, selected`. 런처로 가거나 탭이 그대로면 실패. 이어서 맵에서 한 번 더 누르면 B6의 「떠남」이다(여기서 이어 해도 된다).

### B6 — 맵에서 떠남 · 다시 열면 스플래시 없이 맵 (수용 기준 5)

- **조작**: 맵에서 pid를 적고(`A shell pidof libitum.duru.android`) 뒤로가기 → 1.5초 대기 → 판정 명령 3개 → `A shell am start -n libitum.duru.android/com.libitum.host.MainActivity` → 스크린샷을 즉시(0.3초 이내)와 2초 뒤 두 번.
- **기대 결과**: 홈(런처)으로 나간다. Activity 기록은 남는다. 다시 열면 스플래시나 로딩 없이 **같은 맵**이 선다. pid는 그대로다.
- **판정 기준**: **떠남**(앞 = 런처, `grep -c`가 1 이상 — 여러 줄이 나와도 된다). 재오픈 직후 스크린샷이 이미 맵이고(스플래시 화면 없음), 앞뒤 pid가 같다. `grep -c`가 0이면(끝남) 또는 재오픈에 스플래시가 뜨면 실패. 3버튼 모드의 0.3초 프레임은 빈 흰 창일 수 있다(창 전환 프레임; 스플래시 UI가 아니다) — 그 모드는 2초 뒤 맵으로 판정한다.
- 제스처 내비게이션에서 가장자리 스와이프로도 한 번 한다.

### B7 — 진입 구간: 로그인 → 온보딩 → … → 떠남 (수용 기준 6)

**`bundled` APK의 새 설치**로 한다(로그인 불필요). 픽스처를 끝낸 뒤:
```sh
A shell am broadcast -a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE
A install -r apps/android/app/build/outputs/apk/bundled/app-bundled.apk
A shell pm clear libitum.duru.android
A shell am start -n libitum.duru.android/com.libitum.host.MainActivity
```
- **(a) 로그인에서 뒤로** — 온보딩의 `Next`(참고값 (195,767))를 세 번 눌러 로그인 화면에 도달한다. 뒤로가기 → 뒤로가기.
  (`e2e/android-host.yaml`이 같은 구간을 자동으로 지난다.)
  - **기대 결과**: 로그인 → 온보딩 **첫 스텝**(로그인의 보이는 `Back`을 누른 것과 같은 곳. 온보딩 스텝은 화면 로컬 상태라 돌아오면 첫 스텝으로 선다) → 앱을 떠난다(마지막 누름만 떠남).
  - **판정 기준**: 첫 누름은 1.5초 뒤 **남음** + 온보딩 첫 스텝 문구(`Step 1 of 3`). 로그인의 보이는 `Back`(참고값 (43,86), 다른 시도에서)도 같은 곳으로 가는지 비교한다. 둘째 누름은 **떠남**. 로그인에서 떠나거나 첫 스텝이 아닌 곳으로 가면 실패.
- **(b) 온보딩 안에서 단계 되돌림** — 로그인에 가지 않고 `Next`를 두 번 눌러 셋째 스텝(`Step 3 of 3`)까지 간다. 뒤로가기 → 둘째 → 뒤로가기 → 첫 스텝 → 뒤로가기.
  - **기대 결과**: 셋째 → 둘째 → 첫 스텝 → 앱을 떠난다(마지막 누름만 떠남). 온보딩 단계는 `onboarding-screen`의 `data-step`, 화면 문구 `Step N of 3`로 읽는다.
  - **판정 기준**: 앞의 두 번은 매번 1.5초 뒤 **남음**이고 단계 문구가 `Step 2 of 3`, `Step 1 of 3`으로 줄어든다. 세 번째는 **떠남**(기록 있음). 첫 스텝에서 떠나지 않거나 앞 단계에서 떠나면 실패.
- 로그인 중 요청 무동작 자리는 모의 서버가 없어 이 절차의 대상이 아니다. (a)와 (b) 사이에는 `pm clear`로 다시 시작한다.
- B7이 끝나면 `debug` APK를 재설치로 되돌린다(위 「두 가지 설치」). B8은 `debug`에서 한다.

### B8 — 번들 로드 실패 · ready 전 첫 누름은 종료 (수용 기준 8)

JS가 준비되지(`ready`) 못한 Activity는 기다림 없이 `finish()`가 된다.

- **(a) 닿지 않는 번들**: Debug APK(B7 뒤에 재설치로 되돌린 것)를 닿지 않는 주소로 실행하고 뒤로가기를 누른다.
  ```sh
  A shell am force-stop libitum.duru.android
  A shell am start -n libitum.duru.android/com.libitum.host.MainActivity --es bundle-url http://10.0.2.2:9/none.bundle
  sleep 3; A shell input keyevent KEYCODE_BACK; sleep 2
  ```
- **(b) 정상 번들의 콜드 스타트 직후 — 보조 관찰이다. 이 분기의 정본 증거는 JUnit `SystemBackGateTest` SG1(미준비 누름 = `FINISH`)이다.**
  번들 서버(18790)를 띄운 채, 호스트의 `ready`(에뮬레이터 실측: 시작 뒤 약 2.2초) **전에** 누른다. 16 KB 대화상자가 없어야 한다(전제 — 떠 있으면 뒤로가 대화상자로 가고, 뜬 것 자체가 회귀다).
  ```sh
  A shell am force-stop libitum.duru.android
  A shell 'am start -n libitum.duru.android/com.libitum.host.MainActivity --es bundle-url http://10.0.2.2:18790/main.lynx.bundle; sleep 0.8; input keyevent KEYCODE_BACK'
  sleep 2
  ```
  누르는 시점은 시작 뒤 약 0.8초(창이 포커스를 받은 뒤, ready 2.2초보다 앞)다. 끝나지 않으면 지연을 `0.5` · `1.0` · `1.5`초로 바꿔 시도한다(2.2초를 넘기지 않는다).

  ⚠ **이 타이밍은 흔들린다 — 재현 가능한 절차가 아니다.** `sleep`의 값은 명목값이다. 에뮬레이터에서 `input` 프로세스가 뜨는 데
  0.3 ~ 2초가 걸려, 같은 명령이어도 실제 주입이 ready 앞에 떨어지기도 뒤에 떨어지기도 한다. 2026-10-05 실행에서는
  **8회 중 1회만 끝남**이었고(지연 0.8초의 첫 시도) 나머지 7회는 주입이 ready 뒤라 **떠남**이었다 — 제품의 모순이 아니라
  주입 시점의 차이다. 그래서 (b)의 「끝남」은 맞으면 적는 관찰이고, 맞지 않아도 실패가 아니다.
- **기대 결과**: 둘 다 기다림 없이 Activity가 끝난다. (a)는 실패한 빈 화면이 백그라운드에 남지 않는다.
- **판정 기준**
  - **(a)**: 누른 뒤 2초 안에 **끝남**(`grep -c`가 0, 앞이 런처). 화면이 남거나 **떠남**(기록 있음)이면 실패.
  - **(b)**: 정본은 JUnit이다 — `cd apps/android && ./gradlew testDebugUnitTest`에서 `SystemBackGateTest`의 SG1이 통과하면 이 분기는 판정된 것이다.
    에뮬레이터 관찰은 위 지연값으로 최대 4회까지 해 보고, 한 번이라도 **끝남**이면 「관찰됨」으로, 아니면 **「에뮬레이터에서 재현하지 못함(JUnit SG1로 판정)」**으로 적는다.
    누름 시점에 ready가 이미 왔다면 **떠남**이 되고, 창이 아직 포커스를 받기 전이면 뒤로가 무시될 수 있다. 매 시도 전 대화상자가 없는지 확인한다.
- 실패 뒤 다시 열면 번들을 처음부터 다시 읽는다(빈 화면이 그대로 복귀하지 않는다) — (a) 후 `am start`를 정상 주소(`--es bundle-url http://10.0.2.2:18790/main.lynx.bundle`)로 하면 맵 또는 스플래시부터 선다.

### B9 — 앱 밖 화면 · 푸시 진입 회귀

- **(a) 법률 문서(Custom Tab)**: (제스처 모드에서) 맵에서 설정 탭 → `Terms of Use`(아래로 스크롤) → Custom Tab이 열리면 뒤로가기. Custom Tab만 닫히고 **설정 화면이 그대로**다(`Settings`). 앱의 뒤로가기 경로는 이때 오지 않는다. (`e2e/android-signed-in-settings.yaml`의 마지막 단계와 같다. 외부 문서 로드 성공은 판정하지 않는다.)
- **(b) 푸시로 진입**: 앱을 홈으로 보낸 뒤 픽스처가 올리는 로컬 알림을 연다.
  ```sh
  A shell input keyevent HOME
  A shell am broadcast -a com.libitum.host.test.POST_PUSH_FIXTURE
  A shell cmd statusbar expand-notifications     # 알림 `Duru test` / `Open notifications` 탭
  ```
  알림 화면(`Back to map` 읽힘)이 서면, 16 KB 대화상자가 없는지 보고(전제) 뒤로가기. **푸시 목적지 화면의 닫기와 같다** — 맵이 서고 앱은 **남음**.
- **판정 기준**: (a) Custom Tab 닫힘 + dump에 `Settings`, 앱이 **남음**. (b) 1.5초 뒤 **남음** + 맵. 어느 쪽이든 앱이 런처로 가면 실패.

## API 32 이하 관측 항목 — API 30 하나에서만 실행

**L1은 한 번도 실행하지 않았다(아래 ⟨2026-10-05 같은 날 뒤⟩ 전까지의 기록).** `MainActivity`는 API 33 이상에서만 `OnBackInvokedCallback`을 등록하고
(`registerBackCallback`이 `SDK_INT < TIRAMISU`면 바로 돌아간다) API 26 ~ 32에서는 `onBackPressed()` 재정의가 같은
`handleSystemBack()`을 부른다. B1 ~ B9는 전부 API 37에서 돌았으므로 **`onBackPressed()` 재정의는 컴파일만 확인됐고
실행된 적이 없다.** 앱의 `minSdk`는 26이라 이 경로는 실제 사용자 기기가 탄다.
2026-10-05에 `targetSdk`가 36으로 올라 [ADR-0043](../adr/0043-android-system-back.md)의 재검토 조건(「36 이상이면 두 경로를 API 26 ~ 32와 함께 확인」)이
걸렸지만, API 26 ~ 32 AVD가 없어 **여전히 미실행이다**([Android 출시 설정 절차](android-release-config.md)의 R6도 같은 이유로 미실행).
⟨2026-10-05 같은 날 뒤 — 위 세 문장은 그 시점의 기록이다⟩ **L1이 API 30(Android 11) · 4 KB 페이지 · arm64 `google_apis` 에뮬레이터 · 3버튼 · `114099e3`에서 실행됐다**(Play 배포 형태 AAB 설치와 `debug` + 픽스처).
B2 · B5 · B6에 더해 온보딩의 B7(b)가 통과했다. **실행되지 않은 것**: API 26 ~ 29 · 31 ~ 32, 제스처 모드, 이 경로에서의 B3 · B4 · B7(a) · B8 · B9. 환경과 나머지 관찰은 [Android 출시 설정 절차](android-release-config.md)의 R6 「실행 기록」이 진다.

- **실행 수단**: API 32 이하 시스템 이미지의 AVD를 하나 만든다(예: API 30 또는 32). 이 저장소에 준비된 AVD는 API 37
  하나다. 「전제」의 16 KB 대화상자는 16 KB 페이지 이미지의 것이고 지금은 그 이미지에서도 뜨지 않아야 한다 — 이 AVD에서도
  「준비」의 확인만 한다. 「참고 좌표」는 390x844 · 160 dpi로 맞췄을 때의 참고값이고, 다른 이미지에서는 스크린샷으로 다시 확인한다.
  3버튼 모드가 기본인 이미지에서는 ◁로 누른다.

| 항목 | 조작 | 판정 기준 |
|---|---|---|
| L1 | API 32 이하 AVD에서 **B2 · B5 · B6을 한 번씩** 돌린다(조작은 각 항목 그대로) | 각 항목의 판정 기준 그대로. 셋 다 통과하면 `onBackPressed()` 경로가 「화면의 닫기 · 탭 루트 → 여정 · 떠남」에서 API 33 이상과 같게 움직인 것이다. 하나라도 어긋나면 실패 |

| 항목 | 결과 | AVD · API | 근거 |
|---|---|---|---|
| L1 (B2) | 통과 (2026-10-05) | API 30 · 3버튼 · `114099e3` | 픽스처로 들어간 알림 화면(`Back to map`) → 뒤로 → 0.7초 · 1.7초 모두 `MainActivity`가 앞, 맵(`Journey, selected`) |
| L1 (B5) | 통과 (2026-10-05) | 같음 | 롤플레이 탭 → 뒤로 → 맵 `Journey, selected`, 앱 남음. 설정 탭도 같다 |
| L1 (B6) | 통과 (2026-10-05) | 같음 | 맵 → 뒤로 → 앞이 런처, `MainActivity` 기록 남음, pid 전후 동일(떠남). 다시 열면 2초 뒤 `Journey, selected` · pid 동일. 0초 프레임은 런처 그대로였다 — 2초 뒤 화면으로 판정했다 |
| (B7(b)) | 통과 (2026-10-05) | 같음 — L1 항목은 아니지만 같은 경로로 함께 봤다 | `Step 3 of 3` → `Step 2 of 3` → `Step 1 of 3`(앱 남음) → 런처(떠남, pid 유지) |

API 26 ~ 29 · 31 ~ 32와 제스처 모드, 이 경로에서의 B3 · B4 · B7(a) · B8 · B9는 실행하지 않았다.

## TalkBack 관측 항목 — 아직 실행하지 않음

**T1 ~ T6은 한 번도 실행하지 않았다.** B1 ~ B9는 전부 TalkBack을 끈 상태의 화면 전이 관찰이고, 이 변경의 접근성은 코드
읽기까지만 판정됐다(등록한 함수가 보이는 닫기와 같은가). 「그렇게 들리는가」는 이 항목들이 잰다
([ADR-0016](../adr/0016-assistive-technology-semantics.md) D6의 경계).

이 항목들은 **통과/실패가 아니라 들린 것을 적는 관측**이다. 판정 기준은 전환 통지 축(ADR-0016 D8)이 정해진 뒤에 붙인다.

**실행 수단**

- TalkBack이 들어 있는 **Google Play 시스템 이미지** 에뮬레이터 또는 실기기가 필요하다(`com.google.android.marvin.talkback`).
  B1 ~ B9를 돌린 AVD에 TalkBack이 있는지는 확인하지 않았다 — `A shell pm path com.google.android.marvin.talkback`으로 먼저 본다.
- TalkBack을 켜는 명령은 `devtools/android-maestro/run-talkback.sh`에 있다(`enabled_accessibility_services` ·
  `accessibility_enabled` 설정과 `dumpsys accessibility`의 `Bound services` 확인). 루트의 `pnpm test:e2e:android:talkback`이
  이 스크립트를 부르지만 **그 명령은 온보딩 Maestro 흐름만 돈다 — 아래 항목을 실행하지 않는다.** 켜는 부분만 빌려 쓰고
  항목은 손으로 한다. 기존 관찰은 [Android TalkBack 검증](android-talkback.md)에 있다.
- 로그인 뒤 구간은 위 「앱 구간 진입」의 픽스처로 들어간다. **헤드리스 에뮬레이터에서는 음성 출력을 들을 수 없다** —
  소리를 적어야 하는 칸은 창이 있는 에뮬레이터나 실기기에서 채운다.
- TalkBack의 뒤로 제스처는 아래로 쓸고 이어서 왼쪽으로 쓰는 한 획이다. 3버튼의 ◁를 두 번 탭해 활성화하는 것과 나란히 적는다.

| 항목 | 조작 | 적을 것 |
|---|---|---|
| T1 전제 | 알림 화면(B2와 같은 화면)에서 TalkBack 뒤로 제스처 | 화면이 맵으로 가는가(= 제스처가 `systemBackPressed` 경로를 타는가). 가지 않으면 T2 ~ T6은 그 사실만 적고 멈춘다 |
| T2 층 닫기 | 설정 로그아웃 확인창 · 로그인 국가 시트 · 스텝 말풍선 · 연속 모달 각각에서 층 안에 포커스를 둔 채 뒤로 제스처 | 닫힌 직후 무엇이 들리는가 · 포커스가 어디에 서는가. 같은 층을 보이는 닫기로 닫았을 때와 나란히 |
| T3 학습 2회 누름 | 학습 문항 화면에서 뒤로 제스처 두 번(B3과 같은 화면) | 1회째에 들리는 것 · 2회째에 들리는 것 · 확인창이 떴다는 것을 알 수 있는가 |
| T4 탭 루트 → 여정 | 설정 · 롤플레이 탭 루트에서 뒤로 제스처 | 들리는 것 · 포커스가 서는 자리. 하단 탭을 직접 눌렀을 때와 나란히 |
| T5 무동작 | 로그인 요청 중 · 인증 코드 검증 중 · 계정 삭제 진행 중에 뒤로 제스처 | 들리는 것. 보이는 `Back`을 두 번 탭했을 때와 나란히. ⚠ 모의 서버가 없으면 이 상태를 만들 수 없다 — 만들지 못했으면 그렇게 적는다 |
| T6 닫힌 뒤 조작 | T2로 층을 닫은 뒤 뒤쪽 버튼 하나를 두 번 탭 | 실제로 활성화되는가(뒤쪽 가림이 풀렸는가 · 클릭 동작이 다시 붙었는가) |

T3 · T4가 재는 불편은 ADR-0016 D8의 ⟨2026-10-05⟩ 적용 기록에 적혀 있다 — 코드 읽기로 낸 예상이고 이 항목들이 그것을 확인하거나 뒤집는다.

| 항목 | 결과 | 기기 · 이미지 | 들린 것 · 포커스 자리 |
|---|---|---|---|
| T1 | 미실행 | | |
| T2 | 미실행 | | |
| T3 | 미실행 | | |
| T4 | 미실행 | | |
| T5 | 미실행 | | |
| T6 | 미실행 | | |

## Maestro로 옮길 수 있는 것

`pressKey: back`(`- back`)으로 B2 ~ B5를 `e2e/android-*.yaml` 흐름으로 옮길 수 있다(`android-signed-in-settings.yaml`이 이미 `pressKey: back`을 쓴다).
이 작업에서는 옮기지 않았다. B6 · B8의 「떠남/끝남」은 `dumpsys`로만 구분되므로 수동으로 남긴다.

## 실행 결과

실행 날짜 · AVD · 내비게이션 모드 · 빌드 SHA를 적고, 항목별 결과를 채운다. 수용 기준 11은 B2 · B4 · B5 · B6 · B8의 통과로 닫는다.

### 2026-10-05 — Pixel_8 AVD(API 37) · 390x844 · 160 dpi · 글자 배율 1.0

제품 코드는 `f23712a2`다(두 회차 사이에 바뀐 것은 이 문서뿐이다). 첫 회차(11:35 ~ 11:52 KST)가 전 항목을 돌았고, 절차의 결함을
고친 뒤 둘째 회차(11:55 ~ 12:01 KST)가 준비 · B3 · B5 · B7 · B8(b)를 다시 돌았다. 나머지는 첫 회차 결과다. JDK 21로 빌드했다.
TalkBack은 꺼져 있었다. 앱의 `FATAL EXCEPTION`은 없었다. 스크린샷과 `dumpsys` 출력은 저장소에 넣지 않았다 — 작업
`android-back`의 산출물로 남아 있다.

⚠ **아래 「결과」는 커밋 `d454723f` 시점의 절차로 얻은 것이다.** 그 뒤 이 문서의 판정 기준 · 비교 방법 · 설치 순서 ·
준비 단계가 고쳐졌고(`86d9ba2f`), **고쳐진 글대로는 아직 한 번도 다시 실행하지 않았다.** 해당 항목은 「현재 기준」 칸에
**기준 변경 후 미실행**으로 적는다 — 그 항목의 「통과」는 지금 적힌 기준의 통과가 아니다. 「변경 없음」은 조작과 판정 기준이
실행 때와 같다는 뜻이다(참고 좌표 표를 더한 것은 진입 수단이라 세지 않았다).

| 항목 | 결과 | 현재 기준 | 모드 | 근거 |
|---|---|---|---|---|
| 준비 | 통과 | **기준 변경 후 미실행** — `Don't Show Again`이 단독 버튼이라는 조작 · HOME 복귀 재확인 · `pm clear`/재설치 뒤 다시 누르는 규칙이 뒤에 적혔다 | 제스처 | `Don't Show Again` 탭 뒤 `force-stop` 재실행 · HOME 복귀 재실행 모두 dump에 `Android App Compatibility` 없음. `pm clear` · 재설치 뒤에는 다시 떴다 |
| B1 | 통과 | 변경 없음 | 3버튼 · 제스처 | dump에 `Journey, selected`. 3버튼 스크린샷이 기준선 `444fcfd6`과 같다(하단 탭 바 겹침도 기준선과 같다) |
| B2 | 통과 | 변경 없음 | 제스처 · 3버튼 | 알림 화면 → 뒤로 → 0.7초 · 1.7초 모두 앞 = `MainActivity`, 화면은 맵 |
| B2 하위(재누름 무시) | 통과(확률적) | 변경 없음 | 제스처 · 3버튼 | 재시도 규칙 안에서 **남음**을 관찰했다 — 제스처는 6회 중 2회만 남음. 결정적 증거는 JUnit SG3 |
| B3 | 통과 | **기준 변경 후 미실행** — 뒤로가기 전 「문항 기준 장」을 찍어 2회째 뒤 스크린샷과 비교하는 방법 · dump의 `Leave` · `Keep going` 둘 다 확인으로 바뀌었다 | 제스처 | 1회째 dump에 `Leave` · `Keep going`, 2회째 확인창만 닫히고 스크린샷이 같은 문항. 두 번 다 앞 = `MainActivity`. `×` → `Leave` 뒤 `Journey, selected` |
| B4(a) | 제외 | 변경 없음(제외) | — | 픽스처로 안내가 서지 않는다. 증거는 `integration` IB7 · `ui` UL8 |
| B4(b)(c) | 통과 | 변경 없음 | 3버튼 | 말풍선 · 연속 모달 각각 ◁ 뒤 층만 닫히고 맵, 앱 남음 |
| B5 | 통과 | 변경 없음 | 제스처 · 3버튼 | `Roleplay, selected` → 뒤로 → `Journey, selected`, `Settings, selected` → 뒤로 → `Journey, selected`. 매번 앞 = `MainActivity` |
| B6 | 통과 | 변경 없음 | 3버튼 · 제스처 | 뒤로 → 앞 = 런처, `grep -c` 5(떠남) → `am start` → pid 그대로, 맵. 제스처는 0.25초 프레임이 이미 맵, 3버튼은 0.25초가 빈 흰 창이라 2초 프레임으로 판정 |
| B7(a) | 통과 | **기준 변경 후 미실행** — `bundled` 설치 → B7 → `debug` 재설치(`-r`) 순서 · `Next` 횟수 · `pm clear` 뒤 대화상자 처리가 뒤에 적혔다 | 제스처 · `bundled` | 로그인 → 뒤로 → `Step 1 of 3`(남음) → 뒤로 → 런처(떠남). 보이는 `Back`도 `Step 1 of 3` |
| B7(b) | 통과 | **기준 변경 후 미실행** — B7(a)와 같다 | 제스처 · `bundled` | `Step 3 of 3` → `Step 2 of 3` → `Step 1 of 3` → 런처(떠남) |
| B8(a) | 통과 | **기준 변경 후 미실행** — 대상 APK가 「B7 뒤에 재설치로 되돌린 `debug`」로 바뀌었다(판정 기준 자체는 같다) | 제스처 | 닿지 않는 번들에서 뒤로 → 2초 안에 앞 = 런처, `grep -c` 0(끝남). 정상 주소로 다시 열면 번들을 처음부터 읽는다 |
| B8(b) | 관찰됨 — **8회 중 1회** | **기준 변경 후 미실행** — 판정이 「재시도해 끝남이어야 통과」에서 「정본은 JUnit SG1, 에뮬레이터는 관찰됨/재현하지 못함으로 적는 보조 관찰」로 바뀌었다 | 제스처 | 지연 0.8초의 첫 시도에서 `grep -c` 0(끝남). 이어 본 7회는 주입이 ready(약 2.2초) 뒤라 떠남. 정본 증거는 JUnit SG1 |
| B9(a) | 통과 | 변경 없음 | 제스처 | `Terms of Use` → Custom Tab → 뒤로 → 앞 = `MainActivity`, dump에 `Settings, selected` |
| B9(b) | 통과 | 변경 없음 | 제스처 | HOME → 로컬 알림 → 알림 화면 → (16 KB 대화상자를 닫은 뒤) 뒤로 → 맵, 앱 남음 |

**이 실행으로 확인하지 못한 것**: 실제 JS 무응답(증거 JUnit SG6 · SG9) · 첫 유닛 안내 가림막(증거 `integration` IB7 · `ui` UL8) ·
TalkBack을 켠 상태(T1 ~ T6 미실행) · API 26 ~ 32의 `onBackPressed()` 경로(L1 미실행 — AVD가 API 37 하나다. 이 경로는 컴파일만 확인됐다. ⟨2026-10-05 뒤⟩ L1은 별도 회차로 API 30에서 실행됐다 — 「API 32 이하 관측 항목」).

호스트의 JUnit은 같은 날 `./gradlew testDebugUnitTest`로 통과했다(`SystemBackGateTest` SG1 ~ SG10 포함 30건).
