# Android TalkBack 검증

## 환경과 재현

**아래 「환경과 재현」 첫 문단과 「관찰 결과」는 Android 15 API 35 에뮬레이터에서의 기록이다**(패키지가 `com.libitum.host`이던 때). 그 뒤 API 37 · targetSdk 36 ·
패키지 `libitum.duru.android`에서 다시 본 것은 맨 아래 「계측 `ButtonAccessibilityTest`의 전제와 실행」의 계측 둘뿐이다 — **`pnpm test:e2e:android:talkback`(Maestro)은 그 구성에서 다시 돌리지 않았다.**

Android 15 API 35 Google Play ARM 에뮬레이터(390×844, 160 dpi)에 포함된
`com.google.android.marvin.talkback` 서비스를 켰다. `dumpsys accessibility`에서
TalkBack이 `Bound services`에 나타났고 터치 탐색도 켜져 있었다. 테스트 APK는
모의 Supabase URL을 넣은 내장 번들 APK로 실행했다. 접근성 계측은 같은 번들의
Debug APK와 로컬 HTTP 미리보기를 사용했다.

전용 에뮬레이터와 Maestro가 준비되면 저장소 루트에서 실행한다.

```sh
E2E_UDID=<Google Play 에뮬레이터 ID> pnpm test:e2e:android:talkback
```

이 명령은 모의 인증 설정으로 Lynx 번들과 APK를 다시 빌드·설치하고 TalkBack을 켠 뒤
기존 온보딩 Maestro E2E를 실행한다. Node.js·pnpm·JDK 17·Android SDK·Maestro가
필요하며, 전용 에뮬레이터의 앱 데이터가 지워진다. 제공자 로그인은 호출하지 않는다.

## 관찰 결과

- TalkBack 활성 상태의 첫 화면에서 실제 초점 테두리가 첫 대사에 표시됐다.
- 진행 표시의 장식용 `PageIndicator`가 부모의 `Step 1 of 3` 대신
  `Scene 1 of 3`을 노출했다. 온보딩에서는 내부 표시를 장식으로 처리해
  `Step 1 of 3` 노드가 노출되는 것을 계측에서 확인했다.
- 초기 Maestro 실행에서는 첫 대사가 보였지만 `Next` 선택이 한 번 실패했다. 실패
  화면에는 버튼이 그려졌으나 계층 JSON에는 `Next`가 없었다. 동일 APK와 TalkBack
  활성 상태에서 이후 세 번 연속 온보딩부터 로그인 화면까지 통과했다.
- `ButtonAccessibilityTest`는 첫 대사를 번역문만으로 찾던 기대값을 실제
  `화자: 한국어 대사, 번역` 접근성 이름으로 고쳤다. 계측의 `UiAutomation`도 TalkBack
  서비스를 중지하지 않도록 설정했다. 수정 후 TalkBack 활성 Google Play 이미지에서
  `ACTION_CLICK`으로 온보딩 전체와 로그인 버튼·약관 링크 노드를 확인해 통과했다.

이 자동화는 TalkBack 서비스가 켜진 동안의 노드 노출과 접근성 클릭을 확인한다.
헤드리스 에뮬레이터에서 음성 출력, 스와이프에 따른 실제 초점 순서, 제공자 로그인과
로그인 후 화면 탐색은 확인하지 못했다. 초기 `Next` 누락이 반복되는지도 계속 살펴야
하므로 전체 사용자 경험을 통과로 판정하지 않는다.

## 계측 `ButtonAccessibilityTest`의 전제와 실행

`ButtonAccessibilityTest.onboardingButtonCanBeActivatedByAccessibility`는 온보딩 전체의 `ACTION_CLICK`, 로그인 버튼 3개 · 약관 링크 2개의 노드, 읽기 순서를 본다.
**전제가 둘이고, 테스트는 둘 다 스스로 확인하지 않는다.** 하나라도 빠지면 제품 결함처럼 보이는 메시지로 실패한다.

| 전제 | 빠지면 | 왜 |
|---|---|---|
| **번들 서빙 + `-e bundleUrl`** | `Next accessibility node missing` (`ButtonAccessibilityTest.java:123`) | `debug` 빌드는 `bundle-url`이 없으면 `http://10.0.2.2:3000/main.lynx.bundle`을 읽는다. 테스트는 `bundleUrl` 계측 인자가 있을 때만 그 값을 넘긴다. 3000 포트에 번들이 없으면(다른 워크트리의 dev 서버가 그 포트를 잡고 404를 낼 수도 있다) 빈 화면에서 찾다 실패한다 |
| **TalkBack 켬(터치 탐색)** | `onboarding dialogue accessibility node missing` (`:125`) — `Next` · `Step 1 of 3`까지는 통과한다 | Lynx 4.0.1 Android는 시스템 접근성과 **터치 탐색이 둘 다 켜져 있을 때만** 평탄화된 요소의 가상 노드를 낸다. 꺼져 있으면 접근성 트리는 Android View 트리 그대로라 대사 말풍선의 이름(`화자: 한국어 대사, 번역`)이 없다. `UiAutomation`만 붙어서는 터치 탐색이 켜지지 않는다 |

Google Play 이미지(TalkBack 포함)의 전용 에뮬레이터에 `debug` APK와 계측 APK를 설치한 상태에서:

```sh
# 저장소 루트에서 실행한다(번들 경로 apps/mobile/dist 가 상대 경로다).
ID="<전용 에뮬레이터 ID>"                 # 자리표시자다 — adb devices 에 나온 실제 ID(예: emulator-5554)로 바꾼다
A() { adb -s "$ID" "$@"; }                # 함수다. 문자열 변수(A="adb -s …"; $A shell …)는 zsh에서 command not found가 난다
# 1) 번들 제공 — apps/mobile/dist 를 로컬 포트로 (pnpm bundle:android 로 만든 것)
python3 -m http.server 18799 --bind 0.0.0.0 --directory apps/mobile/dist >/dev/null 2>&1 &
SERVER_PID=$!
# 2) TalkBack 켬 — devtools/android-maestro/run-talkback.sh 와 같은 방법
A shell settings put secure enabled_accessibility_services com.google.android.marvin.talkback/.TalkBackService
A shell settings put secure accessibility_enabled 1
until A shell dumpsys accessibility | grep -q 'Bound services:{Service\[label=TalkBack'; do sleep 1; done   # 켠 직후에는 비어 있다(약 4초 뒤 나타났다)
# 3) 계측
A shell am instrument -w -e class com.libitum.host.ButtonAccessibilityTest \
  -e bundleUrl http://10.0.2.2:18799/main.lynx.bundle \
  libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner
# 4) 되돌리기
A shell settings delete secure enabled_accessibility_services
A shell settings put secure accessibility_enabled 0
kill "$SERVER_PID"
```

**기대 결과**: 출력 마지막의 `OK (1 test)`. **`adb shell am instrument`는 테스트가 실패해도 종료 코드가 0이다** — 종료 코드가 아니라 이 줄로 판정한다. 끝나면 `A shell dumpsys accessibility`의 `Bound services`가 비었는지 본다.
대기 루프에는 상한이 없다 — TalkBack이 붙지 않는 이미지에서는 끝나지 않으므로 Ctrl-C로 끊는다(`run-talkback.sh`는 10회에서 멈춘다).

| 날짜 | 구성 | 조건 | 결과 |
|---|---|---|---|
| 2026-10-05 | API 37 Google Play 에뮬레이터(Pixel_8, 16 KB) · `c5d38608` · targetSdk 36 · `libitum.duru.android` · 16 KB로 다시 빌드한 Lynx AAR의 `debug` 빌드 | `bundleUrl` 없음 · TalkBack 꺼짐 | 실패 — `Next accessibility node missing` |
| 같음 | 같음 | `bundleUrl` 있음 · TalkBack 꺼짐 | 실패 — `onboarding dialogue accessibility node missing` |
| 같음 | 같음 | `bundleUrl` 있음 · TalkBack 켬(`Bound services`에 TalkBack 확인) | **`OK (1 test)`** |
| 같음 | 같음 | `CompletionAnnouncementModuleTest`, TalkBack 켬 | `OK (3 tests)` — `View.announceForAccessibility`(API 36에서 deprecated)가 targetSdk 36에서도 `TYPE_ANNOUNCEMENT` 이벤트를 낸다 |

이 기록의 한계:

- **위 블록의 내용은 실행됐지만 지금 적힌 글자 그대로는 아니다.** 2026-10-05 최종 검증(`9b15f548` · API 37 에뮬레이터)이 이 블록의 앞선 형태 — `A="adb -s <ID>"` 문자열 변수, `Bound services`를 한 번만 grep, 서버를 끄는 줄 없음, 서버 로그는 `/tmp` — 를 **bash에서** 위에서 아래로 돌려 `OK (1 test)`를 얻고 설정 원복을 확인했다. 그 실행에서 zsh의 `command not found`와 켠 직후의 빈 grep(약 4초 뒤 나타남)이 드러나, 함수 `A` · `until` 대기 루프 · `SERVER_PID`/`kill`로 고쳐 적었다. **고쳐 적은 형태는 `bash -n` · `zsh -n` 문법 검사만 했고 기기에서 돌리지 않았다.**
- TalkBack을 켠 직후 `settings get secure touch_exploration_enabled`를 한 번 읽었을 때 `0`이었고 다시 읽지 않았다. 평탄화된 요소의 이름이 나와 통과했으므로 Lynx의 가상 노드 공급자가 생긴 것으로 **추론**한다. `run-talkback.sh`는 이 값이 `1`이 아니면 중단한다.
- TalkBack을 켠 채 앱을 띄우고 9초 뒤의 `uiautomator dump`가 Lynx 노드 없이 껍데기만 담은 일이 한 번 있었다(직전 계측은 통과). dump가 가상 노드를 못 읽은 것인지 로드 지연인지 가리지 않았다 — 위 「초기 `Next` 누락」과 함께 계속 살핀다.
- **음성 출력 · 스와이프 초점 순서 · 완료 안내가 실제로 들리는지는 확인하지 못했다.** 온보딩 · 로그인 밖의 화면(여정 · 문항 · 설정)은 TalkBack을 켠 채 보지 않았다. 스위치 제어 · 음성 액세스(터치 탐색을 켜지 않는 보조기술)는 실행하지 않았다.
- 이 테스트를 일괄 계측에서 빼고 따로 돌리는 순서는 [Android 출시 설정 절차](android-release-config.md)의 R8이 진다.

## 학습 문항 안내의 낭독 · 격리 — 판정하는 자리와 방법 ⟨2026-10-09⟩

문장 만들기 · 메신저 · 전화 · 비주얼 노벨 · 말하기 · 쓰기를 이 기기에서 처음 열 때 뜨는 안내
([ADR-0054](../adr/0054-learning-item-guides.md))가 TalkBack에서 **한 덩어리로 한 번 읽히는가 · 뒤 화면이 격리되는가 ·
두 번 탭으로 닫히는가 · 닫은 뒤 뒤 화면이 다시 읽히는가**는 이 문서가 아니라
[학습 문항 안내 e2e](learning-item-guides.md)의 **E10**(여섯 종류)이 판정한다. 곁의 E10-r(열고 닫기 세 번 뒤의 복원과
맵), E10-l(안내가 뜬 뒤에 TalkBack을 켠 관찰), E10-i(iOS VoiceOver)도 그 문서에 있다. 조작 · 판정 문면은 그 문서가
단일 출처다 — 여기에 옮겨 적지 않는다.

**방법이 이 문서의 것과 다르다.** 위의 Maestro 흐름과 계측은 접근성 **노드**를 읽는다. E10은 접근성 단계가 세운 아래
방법을 쓴다([ADR-0016](../adr/0016-assistive-technology-semantics.md) D9의 ⟨2026-10-09⟩ 플랫폼 주가 이 방법의 관찰에
서 있다).

| 무엇 | 까닭 | 도구의 자리 |
|---|---|---|
| **TalkBack을 켠 동안 `uiautomator dump`를 쓰지 않는다**(덤프에 기대는 관용구도 부르지 않는다) | 덤프가 TalkBack을 풀고 알림 권한 창을 띄웠다 [실측 — 2026-10-09] | E10의 「방법」 1 |
| 낭독은 **발화 글자 캡처**로 읽는다 — TalkBack 개발자 설정 「Display speech output」이 화면 아래에 띄우는 글자를 걸음마다 캡처한다 | 헤드리스 에뮬레이터에서는 소리를 들을 수 없다. **귀로 들은 것이 아니다** — 끊김 · 두 번 읽힘의 체감은 판정하지 않는다 | `montage.py` — 그 문서의 부록 |
| 조작은 **`adb emu event send`의 하드웨어 터치**(쓸기 · 터치 탐색 · 두 번 탭) | 접근성 입력 필터를 지나야 TalkBack의 제스처가 된다 | `tb-idioms.sh` — 그 문서의 부록 |
| 초점은 **초록 테두리의 경계 상자**로 본다 | 덤프를 못 쓰므로 캡처에서 읽는다 | `ring.py` — 그 문서의 부록 |

「Display speech output」은 TalkBack 앱 안의 설정이라 `settings`로 켜지 않는다 — 처음 한 번 사람이 켜고 끝에 끈다(E10의
「방법」 2 · 「끝에」).

**주의 — 앱이 뜬 뒤에 TalkBack을 켜면 Lynx의 낭독 트리가 서지 않는다.** 그 상태에서는 화면 전체가 Lynx의 낭독 이름
없이 Android View 그대로 읽히고, 안내의 격리도 서지 않는다(뒤의 머리 묶음 · 카드 · 이름 없는 `Skip` 자리에 초점이
닿았다 — 말하기 한 번의 실측, 접근성 단계 재실행의 지적 N1). **안내의 결함이 아니라 앱 전체의 기존 동작이다**: 위
계측 표의 전제(가상 노드는 시스템 접근성과 터치 탐색이 둘 다 켜져 있을 때만 난다)와 같은 뿌리이고, 켜진 뒤에 노드
제공자를 다시 만드는 경로가 있는지는 읽지 않았다(ADR-0054 「대가」 2 · 「미확인 · 후속」 1 — Android 호스트의 별도
작업, 일정 없음). 그래서 **낭독을 보는 회차는 TalkBack을 먼저 켜고 앱을 띄운다.** E10-l만 일부러 그 반대 순서로
돈다(판정이 아니라 관찰).

위 한계 목록의 「TalkBack을 켠 채 앱을 띄우고 9초 뒤의 `uiautomator dump`가 껍데기만 담은 일」(2026-10-05)이 이
표 첫 줄의 관찰(덤프가 TalkBack을 푼다)과 같은 원인인지는 **가리지 않았다.**

**확인된 범위.** 접근성 단계 재실행이 계약 r03의 구현에서 여섯 종류의 격리 · 멈춤 하나 · 닫기 · 복원을 발화 글자로 봤다 —
Pixel_8 AVD · API 37 · TalkBack 17, 에뮬레이터 한 대다(ADR-0054 D6의 근거 수준 표). **절차 문서의 E10 · E10-r · E10-l은
그 문면대로 기기에서 돈 적이 없고, 실기 · 귀로 듣는 낭독 · TalkBack 17 밖의 버전 · iOS VoiceOver는 미확인이다.** 학습
화면의 나가기 확인창이 TalkBack에서 뒤 화면을 격리하지 못한다는 기존 문제(지적 N3)는 ADR-0054 「미확인 · 후속」 2가 진다.

**이 문서의 기록은 안내가 들어온 뒤 다시 돌려진 적이 없다.** `pnpm test:e2e:android:talkback`과
`ButtonAccessibilityTest`는 온보딩 · 로그인까지만 가므로 안내를 만나지 않는다 — 위 「음성 출력 · 스와이프 초점 순서 …는
확인하지 못했다」는 한계는 온보딩 · 로그인에 대해 그대로다.
