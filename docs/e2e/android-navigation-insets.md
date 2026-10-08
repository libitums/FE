# Android 내비게이션 바와 하단 탭 바 (3버튼 · 제스처)

Android 3버튼 내비게이션(◁ ○ □)에서 하단 탭 바의 알약이 시스템 버튼 밑에 깔려 눌리지 않던 문제가 고쳐졌는지,
제스처 모드 · iOS의 모습이 그대로인지를 에뮬레이터의 실제 창에서 확인한다. 순수 계산(`shellBottomLayout` ·
`tappableBottomInsetFrom` · 호스트 `SafeAreaInsets`)과 컴포넌트 · 셸 트리는 `unit` · `ui` · `integration` · JUnit이 이미 진다 —
이 문서는 **실제 창에서만 보이는 것**(시스템 바와의 겹침 · 눌림 · 바 면의 이음매 · `tappableElement`의 실제 값)만 진다.
수치와 구조의 정본은 작업 `android-tabbar-inset`의 계약(§5.5 기대 수치 · §7 전수 점검)이고, 결정은
[ADR-0044](../adr/0044-android-tappable-inset.md)가 진다.

## 이 절차로 확인하지 못하는 것

- **iOS 실기**: 이 절차는 Android 에뮬레이터만 다룬다. iOS 값이 수정 전과 같다는 증거는 `unit` SL3 · SL5 · SL6 · TB2 · TB4,
  `ui` UA2, `integration` II4다(키가 없으면 `tappableBottomInset`이 0이라 식이 수정 전 식으로 떨어진다). 성능 보고서를 수집할 때의
  시뮬레이터 화면이 보조다.
- **API 26 ~ 28의 폴백(`min(tappable, safe)` 자르기)**: 실행한 AVD가 API 37 하나다. 증거는 JUnit `SafeAreaInsetsTest`의 SI3(`clampsTappableBottomToSafeBottom`)다.
- **가로 모드에서 3버튼 바가 옆에 서는 경우**(`tappableElement`의 좌 · 우): 이 작업의 범위 밖이다.
- **다른 기기 · 제조사의 3버튼 바 높이**: 48dp는 Pixel_8 · API 37 실측이다. 식은 그 수에 기대지 않지만 이 절차는 그 한 기기에서만 잰다.
- **`BottomSheet`의 로그인 국가 시트(`LoginCountrySheet`)**: 제품에서 닿지 않는다(`login.ts`의 `productPhoneSignIn = "hidden"`). 아래 N7은 같은 `BottomSheet`를 쓰는
  설문 시트로 판정하고, 국가 시트는 그 판정을 따른다.
- **에러 경계 화면(`Retry`)**: `.app` 밖이라 이 작업의 판정(바닥 고정 조작 요소 없음)에 걸리지 않는다. 이 절차의 대상이 아니다.
- **TalkBack을 켠 상태**: N1 ~ N9는 전부 TalkBack을 끈 상태다. 보조기술로 듣는 확인은 아래 T1이 따로 진다(미실행).
- **탭 바 위 모서리의 라운드(3버튼)**: 픽스처의 지도에는 모서리(x 0 ~ 20) 뒤로 색 있는 콘텐츠가 지나가는 화면이 없고 롤플레이 목록은 세로 스크롤이 없다.
  N2는 「관찰 못 함」으로 적는다.
- **학습 완료 화면 · 메신저 화면으로 가는 진입로**: 픽스처에 없다. 학습 완료 화면은 N5 → N7 길에서 우연히 닿는다(N6). 메신저는 코드 판정이다.

## 전제

[Android 시스템 뒤로가기](android-system-back.md)의 「전제」 · 「준비 — 16 KB 호환성 대화상자 없애기」 · 「앱 구간 진입 (로그인 없이)」 ·
「내비게이션 모드 전환」을 그대로 따른다(Pixel_8 AVD API 37 · `E2E_UDID` · `ADB`/`A` 변수 · `wm size 390x844` · `wm density 160` · 글자 배율 1.0 ·
`SignedInScreenFixtureTest` · 번들 서버 18790). 그 내용은 여기에 되풀이하지 않는다. 이 절차만의 차이는 아래다.

1. **수정이 들어간 빌드여야 한다.** 호스트(`MainActivity`)와 번들 둘 다 수정 커밋에서 새로 만든다. 번들만 새로 만들면 `tappableBottomInset`을 호스트가 보내지 않아
   3버튼에서도 수정 전 모습이 나온다(결과가 「안 고쳐짐」으로 읽힌다). 실행 결과 표에 빌드한 SHA를 적는다.
2. **한 px가 한 dp다.** `wm density 160`이라 아래 모든 수치의 px = dp다. 계약의 수치(Pixel_8 기본 밀도 2.625에서 48dp = 126px)와 같은 dp를 이 해상도로 환산해 적었다.
3. **픽스처 인자가 항목마다 다르다.**

   | 인자 | 항목 | 이유 |
   |---|---|---|
   | 없음 | N1 · N3 · N4의 연속 모달과 확인창 · N8 · N9 | 기본 지도. 노드가 잠긴 회색뿐이고 열린 스텝이 없다 |
   | `audioProgress true` | N2 · N4의 스텝 말풍선 · N6 | 초록(끝낸) 노드와 열린 스텝이 있다. 말풍선(`Start`)은 이 지도를 스크롤해야 연다 |
   | `reviewProgress true` | N5 · N7 | 서사 표지 하나만 남은 상태 |

   인자를 바꾸면 「앱 구간 진입」의 5번(픽스처 시작)을 다시 한다.
   - 픽스처는 **180초 뒤 스스로 끝난다.** 항목 묶음마다 남은 시간을 보고 다시 시작한다.
   - `STOP_SIGNED_IN_FIXTURE` 방송 직후 바로 다시 시작하면 새 계측이 곧바로 끝나는 경쟁이 있다. **4초 이상 둔 뒤** 다시 시작한다.
   - **픽스처가 끝나면 심어 둔 세션이 지워진다.** 그 뒤 앱을 그냥 다시 켜면 스플래시 → 로그인 화면이다(맵이 아니다). 로그인 뒤 화면은 늘
     픽스처를 다시 시작해서 연다. `pm clear` 없이 다시 시작하면 16 KB 대화상자 없이 첫 로드를 볼 수 있다.
4. **모드 전환은 항목 안에서 한다.** 아래 N9가 전환 자체를 판정한다. N1 ~ N8은 시작 전에 3버튼으로 맞추고 확인한다.
   ```sh
   $A shell settings get secure navigation_mode   # 0 = 3버튼, 2 = 제스처
   ```
   ⚠ `cmd overlay list | grep navbar`로 확인하지 않는다 — 전환 뒤에도 threebutton · gestural이 둘 다 `[x]`로 나와 모드를 가르지 못한다.
   바꾸는 명령(`cmd overlay enable …`)은 그대로 쓴다.
5. **`pm clear` 뒤마다 16 KB 대화상자가 다시 뜬다.** 3버튼 모드의 `Don't Show Again`은 약 (285,749)다(제스처 약 (285,773)).
6. **끝나면 에뮬레이터를 시작할 때의 모드로 되돌린다.** `wm size reset` · `wm density reset`도 한다.

### 기준 수치 (390x844 · 160 dpi · 1px = 1dp)

화면 위에서 아래로 y 좌표다. 「바닥에서」는 `844 - y`다.

| | 3버튼 (수정 후) | 3버튼 (수정 전) | 제스처 (전후 같음) |
|---|---|---|---|
| 시스템 바(터치를 가로채는 띠) | y 796 ~ 844 (48) | 같음 | 없음 — 제스처 핸들만 y 820 ~ 844 (24), 터치를 가로채지 않는다 |
| 탭 바 면 | y 728 ~ 844 (116) | y 776 ~ 844 (68) | y 776 ~ 844 (68) |
| 알약(선택 표시 · 항목 상자 64 × 48) | y 736 ~ 784 | y 784 ~ 832 | y 784 ~ 832 |
| 알약과 시스템 바 사이 | 12 | 알약 48 중 36이 시스템 바 밑 | — |
| 항목 가운데 x | 여정 99 · 롤플레이 195 · 설정 291 | 같음 | 같음 |
| 항목 가운데 y | 760 | 808 (아래 36은 시스템 바 밑이라 눌리지 않고 위 12만 눌렸다) | 808 |
| 탭 루트 스크롤 끝(마지막 항목의 아래 끝) | y ≤ 728 | y ≤ 776 | y ≤ 776 |
| 쌓인 화면 · 전체 화면 그림 화면 아래 여백 | 48 · 0 (그대로) | 같음 | 24 · 0 (그대로) |

### 수정 전 기준 스크린샷의 출처

| 파일(저장소 루트 기준) | 무엇 | 동작한 커밋 |
|---|---|---|
| `.agent-harness/work/android-back/artifacts/e2e/B1-3btn.png` | **수정 전 3버튼** 여정 맵 — 알약이 y 784 ~ 832로 시스템 버튼(◁ ○ □) 위에 겹쳐 그려진다 | `444fcfd6` ~ `db7604e4` |
| `.agent-harness/work/android-back/artifacts/e2e/B1-gesture.png` | 제스처 여정 맵 — N3의 비교 기준 | 〃 |
| `.agent-harness/work/android-back/artifacts/e2e/B4b-sheet.png` · `B4c-modal.png` | 3버튼에서 스텝 말풍선 · 연속 칩 모달이 이미 시스템 바 위에 있던 모습 — N4의 비교 기준 | 〃 |

`.agent-harness/`가 없는 체크아웃에서는 기준 스크린샷이 없다 — 그때는 「기준 없음」으로 적고 위 수치 표로만 판정한다.
수정 전 N2 · N5 ~ N9의 스크린샷은 없다(그 상태는 N1에서 이미 실패한다).

## 준비 — 관찰 도구

```sh
# 한 화면 캡처 — 파일명은 항목 id를 붙인다
shot() { $A exec-out screencap -p > "$OUT/$1.png"; }
# 접근성 트리 — 글자와 영역(bounds)을 읽는다. 인자는 content-desc의 앞부분
dumpb() { $A shell uiautomator dump /sdcard/ui.xml >/dev/null; $A shell cat /sdcard/ui.xml | grep -o "content-desc=\"$1[^\"]*\"[^>]*bounds=\"[^\"]*\""; }
export OUT=.agent-harness/work/android-tabbar-inset/artifacts/e2e; mkdir -p "$OUT"
```

- `dumpb "Journey"`는 `content-desc="Journey, selected" … bounds="[left,top][right,bottom]"`를 낸다. 탭 항목 상자(64 × 48)가 곧 알약이므로 `bottom`이 알약의 아래 끝이다.
  선택되지 않은 탭은 `Roleplay` · `Settings`처럼 `, selected`가 없다.
- **판정은 스크린샷에서 잰다. `bounds`는 같은 값을 숫자로 읽는 보조다.** 둘이 어긋나면 스크린샷을 따른다(Lynx의 `bounds`는 터치 상자라 그림과 1px 흔들릴 수 있다 — 허용 ±2).
- `dumpb`는 `content-desc`만 읽는다. 버튼 글자가 `content-desc`가 아니면(예: 스텝 말풍선의 `Start`) 아무것도 나오지 않는다 — 그때는 스크린샷에서 잰다.
- **`dumpb`가 빈 출력이면 먼저 앱이 앞에 있는지 본다.** 앱이 홈으로 가도 빈 출력이라 「안 가려짐」이나 「없음」으로 오독하기 쉽다.
  `$A shell dumpsys activity activities | grep topResumedActivity`에 `com.libitum.host/.MainActivity`가 있어야 한다.
- 누르기 전에 16 KB 호환성 대화상자(`Android App Compatibility`)가 없는지 본다(시스템 뒤로가기 문서의 전제). 있으면 그 시도는 버린다.
- 이 문서의 `sleep`은 전부 **시스템 UI · 스크롤 관성이 끝나기를 기다리는 것**이다.

## 항목

### N1 — 3버튼: 탭 알약이 시스템 바 위에 있고 눌린다 (수용 기준 1)

- **조작**: 3버튼 모드, 인자 없는 픽스처로 맵을 세운다. `shot N1-journey`. `dumpb "Journey"`. 이어서 롤플레이 탭을 누르고(`$A shell input tap 195 760`) `sleep 1`, `shot N1-roleplay`, `dumpb "Roleplay"`.
  설정 탭(`input tap 291 760`) → `shot N1-settings`, `dumpb "Settings"`. 여정 탭(`input tap 99 760`)으로 돌아온다.
- **기대 결과**: 알약 셋이 시스템 버튼(◁ ○ □) 바로 위에 선다 — 겹치지 않는다. 탭마다 화면이 바뀌고 선택 표시가 옮겨 간다.
- **판정 기준**
  - 세 스크린샷 모두 선택된 알약의 아래 끝이 y 784 이하(바닥에서 60 이상)이고, 시스템 버튼 글리프(y 약 808 ~ 832)와 알약의 겹침이 0이다. 알약 아래 끝과 시스템 바 위 끝(y 796) 사이가 보인다(약 12).
  - `dumpb`의 `bottom`이 784 ±2.
  - 눌러서 바뀐다: 롤플레이를 누른 뒤 dump에 `Roleplay, selected`, 설정 뒤 `Settings, selected`, 돌아온 뒤 `Journey, selected`. 눌러도 안 바뀌면 실패(수정 전에는 y 760을 눌러도 시스템 바가 가져가 바뀌지 않았다).
  - 수정 전 대조: `B1-3btn.png`는 알약 아래 끝이 y 832라 위 기준에서 실패한다 — 같은 화면을 나란히 놓고 알약이 48 올라갔음을 적는다.

### N2 — 3버튼: 바 면이 화면 바닥까지 한 장으로 이어진다 (수용 기준 2)

- **조작**: 3버튼 모드, 픽스처 `audioProgress true`(인자 없는 지도는 잠긴 회색 노드뿐이라 색 있는 노드가 없다). (a) 여정 맵을 위로 밀어(`input swipe 195 650 195 450 300`) 바 밑으로 색이 있는 노드(초록 체크 원)가 지나가게 한 채 `shot N2-journey-green`. (b) 롤플레이 탭에서 카드 그림이 바 밑에 오게 스크롤해 `shot N2-roleplay` — 롤플레이 목록이 한 화면에 들어가 세로 스크롤이 없으면 (b)는 「만들 수 없음」으로 적는다.
- **기대 결과**: 바의 위쪽 두 모서리는 둥글게 보이고(y 728), 그 아래부터 화면 바닥(y 844)까지 가로 이음매 없이 한 면이다. 콘텐츠(노드 · 카드 그림)가 바 면 아래로 비치지 않는다.
- **판정 기준**
  - 스크린샷을 y 720 ~ 844만 잘라 확대한다. 바 위 끝(y 728)에서 시작해 y 844까지 **같은 색 한 면**이어야 한다. y 776(옛 바 아래 끝)과 y 796(시스템 바 위 끝) 근처에 가로선 · 색 띠 · 비친 그림이 없다.
  - 왼쪽 가장자리(x = 10) 세로 열과 오른쪽 가장자리(x = 380)를 따라 y 728 이후 색이 한 번도 바뀌지 않는다. 바 좌우 끝까지 같다.
  - 시스템이 3버튼 구간에 얹는 흰 반투명 막 밑에서도 이음매가 안 보인다(바닥 면이 바 배경색과 같은 토큰이다).
  - 초록 노드의 픽셀이 y 728 이후에 하나도 없다(바 면 밑으로 비치지 않는다).
  - 바 위 모서리의 라운드가 보인다(바 뒤로 색이 있는 콘텐츠가 지나가는 상태여야 라운드가 드러난다). 지도의 노드는 가운데 열(x 약 145 ~ 245)에만 있어
    모서리(x 0 ~ 20) 뒤로 색이 지나가는 화면을 이 픽스처로 만들 수 없다 — 그때는 **「라운드 관찰 못 함」** 으로 적고 앞의 세 기준으로 판정한다.

### N3 — 제스처: 수정 전과 같다, 가운데 탭 선택 포함 (수용 기준 3)

- **조작**: 인자 없는 픽스처. `cmd overlay enable com.android.internal.systemui.navbar.gestural` → `settings get secure navigation_mode`가 `2`인지 확인 → 앱을 앞에 두고 `sleep 3`. `shot N3-journey`. 롤플레이 탭을 누르고(`input tap 195 808`) `sleep 1`, `shot N3-roleplay`, `dumpb "Roleplay"`.
- **기대 결과**: 바 높이 68(y 776 ~ 844), 알약 y 784 ~ 832 — 수정 전과 같다. 롤플레이(가운데) 탭을 선택해도 같다. 바닥 면 · 가로 이음매가 없다.
- **판정 기준**: `N3-journey`의 알약이 `B1-gesture.png`와 같은 y(784 ~ 832)에 있다. `N3-roleplay`에서도 알약 y 784 ~ 832, `dumpb`의 `bottom` 832 ±2, `Roleplay, selected`가 읽힌다.
  3버튼에서 이 항목의 수치(알약 y 736 ~ 784)가 나오면 실패 — 제스처 모드에서 바가 올라간 것이다. 이 항목은 디자인이 권한 「제스처에서 가운데 탭 선택」 스크린샷 한 장이 포함한다.

### N4 — 3버튼: 화면 위 층의 하단 조작이 시스템 바 위에 있다 (수용 기준 5)

- **조작**: 3버튼 모드. 세 층을 각각 연다.
  1. 스텝 말풍선(픽스처 `audioProgress true`): 맵을 스크롤해 열린 스텝 노드를 눌러 말풍선을 연다 → `shot N4-sheet`. `Start`의 영역은 **스크린샷에서 잰다** —
     `dumpb "Start"`는 읽히지 않는다(`content-desc`가 아니다). 인자 없는 지도에는 열린 스텝이 없어 노드를 누르면 말풍선 없이 표지 화면으로 바로 간다.
  2. 연속 칩 모달(인자 없는 픽스처): 헤더의 불꽃 칩을 누른다 → `shot N4-modal` → `dumpb "Continue"`. 닫는다(`Continue`).
  3. 설정 탭 → `Sign out` 행 → 확인창(`Sign out?`) → `shot N4-dialog`. **`Stay signed in`으로 닫는다**(로그아웃을 확정하지 않는다).
- **기대 결과**: `Start` · `Continue` · 확인창의 두 버튼(`Sign out` · `Stay signed in`)이 전부 시스템 바(y 796 ~ 844) 위에 보이고, 누르면 동작한다.
- **판정 기준**: 각 스크린샷에서 버튼의 아래 끝이 y 796 이하이고 가려진 부분이 없다. `Continue` · 확인창 버튼은 `dumpb`의 `bottom`도 796 이하. 말풍선은 맵이 48 짧아진 만큼 위로 서 있어도 `Start`가 탭 바 윗면(y 728) 위에 보인다.
  버튼을 눌러 실제로 말풍선 / 모달 / 확인창이 닫힌다. 수정 전 대조: `B4b-sheet.png` · `B4c-modal.png`(수정 전에도 통과였다 — 이 항목은 **수정 뒤에도 통과하는지**를 본다).

### N5 — 3버튼: 전체 화면 그림 화면의 하단 조작 (수용 기준 5)

서사 표지(`episode-intro`)는 전체 화면 그림 화면이라 `.app` 아래 여백이 0이고 화면이 스스로 `safeAreaInsets.bottom`(3버튼에서 48)을 피한다.

- **조작**: 픽스처를 `reviewProgress true`로 시작한다(서사 표지 하나만 남은 상태). 3버튼 모드에서 지도의 표지 노드(`Episode intro`)를 눌러 말풍선의 `Start` → 표지 화면으로 간다.
  표지가 서면 `shot N5-intro`, `dumpb "Next"`, `dumpb "Skip"`. 표지에서 `Skip` → 확인창(`Skip the story?`) → `shot N5-skip-dialog`.
  **N7이 이 실행에 이어진다**(표지를 끝내면 설문이 선다) — 확인창의 `Skip`까지 눌러 지도로 돌아가는 길은 N7의 조작 1을 따른다.
- **기대 결과**: `Next` · `Skip`이 시스템 바 위에 전부 보인다. 그림이 화면 가장자리(시스템 바 밑 포함)까지 깔린다. 하단 조작이 시스템 바에 잘리지 않는다.
- **판정 기준**: `Next` · `Skip`의 아래 끝이 y 796 이하(`dumpb`의 `bottom`과 스크린샷). 탭 바가 보이지 않는다(전체 화면 그림 화면은 탭 바가 없다). 확인창의 두 버튼도 y 796 이하.
- **닿지 못한 화면은 통과로 적지 않는다.** 서사(대사 패널) · 최종 테스트 문항 패널 · 여정 입구(`Start`)는 이 픽스처 구성에서 전부 닿는다고 확인되지 않았다 — 닿지 못했으면 「닿지 못함 — 코드 판정(계약 §7.1)」으로 적는다.
  닿으면 같은 판정(바닥 조작의 아래 끝 ≤ y 796)을 적용한다.

### N6 — 3버튼: 셸이 아래를 비우는 화면 표본 (수용 기준 5)

학습 화면 같은 쌓인 화면은 탭 바가 없고 `.app`의 아래 여백이 `safeAreaInsets.bottom`(48) 그대로다. 이 화면들은 수정 전에도 가려지지 않았고, **수정 뒤에도 그대로인지**를 본다.

- **조작**: 픽스처를 `audioProgress true`로 시작한다. 시스템 뒤로가기 문서의 B3 조작(맵을 두 번 스와이프 → 「Listen to a Hello」 → `Start`)으로 학습 화면에 간다. 문항 화면에서 `shot N6-learning`.
  이어서 알림 화면(헤더의 종 아이콘)에서 `shot N6-notifications`. 학습 완료 화면(나가기 버튼) · 메신저 화면(답장 줄)은 이 픽스처에 가는 길이 없다.
  학습 완료 화면(`Back to map`)은 N5 → N7 길(표지 `Skip` 뒤)에서 닿으므로 그때 같은 판정으로 잰다. 메신저는 닿지 못하면 「닿지 못함 — 코드 판정」으로 적는다.
  끝나면 `×` → `Leave`(B3)로 맵에 돌아온다.
- **기대 결과**: 학습 화면의 하단 주 버튼 · 알림 화면의 아래 끝이 시스템 바 위에 있다. 탭 바는 없다. 화면 아래에 48 높이의 셸 띠가 있다.
- **판정 기준**: 하단 조작 요소의 아래 끝이 y 796 이하이고 가려진 부분이 없다. 화면 바닥 y 796 ~ 844가 그림 없는 여백(셸 배경)이다. 수정 전과 같은 모습이다.

### N7 — 3버튼: `BottomSheet` — 설문 시트의 건너뛰기 버튼 (수용 기준 5)

`ui-lynx` `BottomSheet`의 패널은 아래 여백이 `calc(spacing-20 + env(safe-area-inset-bottom))`(`bottom-sheet.css`)인데, 이 호스트에서 `env()` 항은 0으로 풀린다
(첫 실행에서 `Not now`가 `[16,768][374,824]` — 패널 아래 여유가 정확히 20이었다). 그래서 시트 소비자가 마지막 자식으로 `tappableBottomInset` 높이(3버튼 48)의
빈 상자를 둔다([ADR-0044](../adr/0044-android-tappable-inset.md) D3 — `episode-survey-inset` · `login-screen-country-inset`). 이 항목은 그 상자가 버튼을 시스템 바 위로
올리는지를 본다.

**시트를 띄우는 법(픽스처로 가능하다)**: 설문 시트는 `AppHeader`의 `episodeSurvey`가 있고 연속 모달 · 다른 층이 없을 때 선다. `episodeSurvey`는 `useJourneyProgress`가
**한 세션 안에서 활동을 끝내 에피소드가 완성될 때** 채운다(`grew` — 부팅 때 합친 진행은 세지 않는다). 서버 진행 불러오기(`hasLoadedProgress`)에 기대지 않으므로
첫 유닛 안내와 달리 404를 돌려주는 픽스처에서도 선다. 선례가 있다 — `e2e/android-app-review.yaml`이 `-e reviewProgress true` 픽스처로 같은 시트를 띄워 `5 · Love it`을 고른다
(`docs/e2e/android-app-review.md`). 이 항목은 그 길을 **시트가 선 뒤에 건너뛰기 버튼 앞에서 멈춰** 3버튼 모드에서 잰다.

- **조작**
  1. 3버튼 모드. 픽스처를 `reviewProgress true`로 시작한다(서사 표지 하나만 남은 상태 — `SignedInScreenFixtureTest`의 `REVIEW_PROGRESS`). N5의 표지에서 `Skip` → 확인창의 확정 버튼(`Skip`)으로 표지를 끝낸다.
     학습 완료 화면(`Back to map`)이 서면 N6의 판정으로 재고 `Back to map`으로 지도로 돌아온다. 매 탭 전에 스크린샷으로 대상을 확인한다(좌표는 진입 수단일 뿐 판정이 아니다).
  2. 지도가 돌아오면 설문 시트(제목 `How was this episode?`, 별점 `1 · Not good` … `5 · Love it`, 맨 아래 `Not now`)가 선다. 연속 모달(`Continue`)이 먼저 뜨면 `Continue`로 닫는다 — 그 뒤에 설문이 선다.
  3. 시트가 서면 **아무것도 누르지 않고** `shot N7-sheet`. `dumpb "Not now"` — **한 노드만 읽힌다**(아래 건너뛰기 버튼). 두 노드가 나오면 y가 가장 큰 노드가 버튼이다.
  4. **버튼의 아래쪽을 누른다** — `bounds` 아래 끝에서 2 ~ 4 위(예: bottom 776이면 `input tap 195 772`). 가운데 한 점은 판별력이 없다: 가려진 상태에서도
     버튼 가운데가 시스템 바 위 끝(y 796) 근처라 앱으로 갈 수 있다. 누른 뒤 `sleep 1`, `dumpsys activity activities | grep topResumedActivity`, `dumpb "Journey"`, `shot N7-after`.
  5. **반복하려면 `pm clear`가 필요하다.** 같은 앱 데이터에서는 설문이 두 번째로 서지 않는다. `pm clear` 뒤에는 16 KB 대화상자가 다시 뜬다(3버튼 `Don't Show Again` 약 (285,749)).
- **기대 결과**: 건너뛰기 버튼 전체가 시스템 바(y 796 ~ 844) 위에 보이고, 아래쪽을 눌러도 시트가 닫힌다. 3버튼 Pixel_8 · 390x844에서 `Not now` 약 `[16,720][374,776]`.
- **판정 기준**
  - **통과**: `Not now`의 `bottom`이 796 이하이고 스크린샷에서 버튼 전체가 보이며, 4번에서 시트가 닫히고 `topResumedActivity`가 `com.libitum.host/.MainActivity`, `Journey, selected`가 읽힌다.
    버튼 아래 끝과 y 796 사이의 값(여유, 기대 20)을 적는다.
  - **실패**: 버튼 `bottom`이 796을 넘거나, 4번에서 앞이 런처(`NexusLauncherActivity` 등)로 바뀐다(시스템 홈 버튼이 눌린 것). 이때 `dumpb`가 빈 출력이어도 「안 가려짐」이 아니다.
    `bottom`이 약 824면 빈 상자가 빠진 것이다(수정 전 모습 — `EpisodeSurveySheet`의 마지막 자식, 호스트가 `tappableBottomInset`을 보내는지 확인).
  - 로그인 국가 시트는 같은 판정을 따른다(제품에서 숨겨져 있어 이 절차로 따로 못 본다 — `ui` UC3 · UC4가 상자를 진다).
- **띄우지 못했을 때**: 표지를 끝내고도 시트가 서지 않으면 그 사실과 어디서 막혔는지(스크린샷)를 적고 통과로 적지 않는다. 이 절차의 다른 진입로는 없다 —
  `BottomSheet`를 쓰는 곳은 설문 시트와 숨겨진 로그인 국가 시트뿐이다(`LoginCountrySheet`은 `productPhoneSignIn = "hidden"`이라 `bundled`의 새 설치 로그인 화면에서도 닿지 않는다).

### N8 — 3버튼: 탭 루트의 스크롤 끝이 탭 바에 가려지지 않는다 (수용 기준 6)

- **조작**: 3버튼 모드. 여정 / 롤플레이 / 설정 각각에서 끝까지 스크롤한다. 끝은 **연속한 두 스크린샷이 같아질 때**다.
  ```sh
  prev=/dev/null; for i in $(seq 1 40); do
    $A shell input swipe 195 650 195 150 300; sleep 0.8; shot "N8-$TAB-cur"
    cmp -s "$OUT/N8-$TAB-cur.png" "$prev" && break; cp "$OUT/N8-$TAB-cur.png" "$OUT/N8-$TAB-prev.png"; prev="$OUT/N8-$TAB-prev.png"
  done; cp "$OUT/N8-$TAB-cur.png" "$OUT/N8-$TAB-end.png"   # TAB=journey|roleplay|settings
  ```
  (`sleep 0.8`은 스크롤 관성이 끝나기를 기다리는 것이다.) 끝 화면에서 `dumpb` 또는 스크린샷으로 마지막 항목을 읽는다.
- **기대 결과**: 마지막 항목(맵: 마지막 유닛 라벨 / 롤플레이: 마지막 구획 카드 / 설정: `Delete account`)이 탭 바 면의 위 끝(y 728)보다 위에 전부 보인다.
- **판정 기준**: 세 끝 화면에서 마지막 항목의 아래 끝이 y 728 이하이고 바 면에 닿거나 가려지지 않는다. 항목과 바 사이에 화면 여백만큼(수 dp ~ 십수 dp)의 띠가 있다. 설정은 `dumpb "Delete account"`의 `bottom` ≤ 728.
  수정 전에는 y 776이 한계였고 3버튼에서 바 위쪽 48이 마지막 항목을 덮을 수 있었다.
- **약한 표본임을 적는다**: 롤플레이 · 설정은 한 화면에 거의 다 들어가 스크롤이 짧거나 없고, 맵 끝은 마지막 항목 아래에 큰 빈 공간이 있다(수정과 무관한 맵 구조).
  세 화면 모두 통과해도 결과에 「약한 표본」으로 적는다. 이 경계의 정본은 계약 §6의 산수(화면의 68 + 셸의 48 = 바 면 116)다.

### N9 — 실행 중 모드 전환: 재시작 없이 바가 따라 바뀐다 (수용 기준 1 · 3)

- **조작**: 인자 없는 픽스처, 3버튼 모드로 맵을 연 채(`pidof`를 적는다 — `$A shell pidof com.libitum.host`) 맵을 한 번 스크롤해 둔다. `shot N9-3btn-1`, `dumpb "Journey"`.
  `cmd overlay enable com.android.internal.systemui.navbar.gestural` → `sleep 3` → `settings get secure navigation_mode`(`2`) → `shot N9-gesture`, `dumpb "Journey"`, `pidof`.
  `cmd overlay enable com.android.internal.systemui.navbar.threebutton` → `sleep 3` → `settings get secure navigation_mode`(`0`) → `shot N9-3btn-2`, `dumpb "Journey"`, `pidof`.
  앱은 앞에 두고 홈으로 가지 않으며, **세 시점 사이에 탭을 누르지 않는다**(누르면 다시 그려져 갱신 누락이 가려진다).
- **기대 결과**: 앱을 다시 켜지 않고 바가 모드를 따라 68 ↔ 116으로 바뀐다. 알약: 3버튼 y 736 ~ 784 → 제스처 y 784 ~ 832 → 3버튼 y 736 ~ 784.
- **판정 기준**: 세 시점의 `dumpb "Journey"` `bottom`이 784 → 832 → 784(±2)이고 스크린샷의 바 면 위 끝이 y 728 → 776 → 728이다.
  `pidof`가 세 시점 모두 같고 화면이 스플래시로 돌아가지 않는다(재시작이면 실패). 스크롤 위치는 유지되되 뷰포트 높이가 48 바뀐 만큼 내용의 y가 달라질 수 있다.
  마지막 3버튼 화면에서 N2의 이음매 기준(바 아래가 한 면)을 다시 만족한다.
  화면에 반영되지 않고 이전 모드의 모습이 그대로면 실패다. 원인은 둘 중 하나다 — 호스트가 inset 변경 때 새 값을 보내지 않았거나, JS가 갱신 뒤 다시 그리지 않았다
  (`apps/mobile/lynx.config.ts`의 `globalPropsMode: "event"`가 빠지면 이렇게 된다 — [ADR-0044](../adr/0044-android-tappable-inset.md) D4).

### T1 — TalkBack: 새 요소가 정지점이 되지 않고, 모드 전환에 포커스가 남는다 (접근성 점검 A3)

N1 ~ N9는 TalkBack을 끈 상태다. 이 항목만 TalkBack을 켜고 3버튼 · 글자 배율 1.0에서 한다. 바닥 면 · 시트의 빈 상자는 접근성 속성이 없는 잎 `<view>`라
정지점이 되지 않는다는 판단은 코드 · AAR 읽기까지다(작업 `android-tabbar-inset`의 접근성 점검). TalkBack을 켜고 끄는 법은 [TalkBack 검증](android-talkback.md)을 따른다.

- **조작과 기대**
  - (a) 여정 탭 루트에서 오른쪽 스와이프로 끝까지 훑는다. 탭 바 정지가 정확히 셋(`Journey, selected` · `Roleplay` · `Settings`)이고, 그 뒤에 이름 없는 정지가 없다.
  - (b) 설문 시트(N7의 길)에서 끝까지 훑는다. 마지막 정지가 `Not now`이고 그 뒤에 빈 정지가 없다.
  - (c) TalkBack 포커스를 `Roleplay` 탭에 둔 채 3버튼 → 제스처 → 3버튼으로 바꾼다(N9의 명령). 포커스가 같은 탭에 남고 낭독이 다시 나지 않는다.
  - (d) 설문 시트가 열린 동안 탭 바 · 바닥 면이 탐색되지 않는다(ADR-0016 D9).
- **판정 기준**: 네 가지 모두 들은 대로 적는다. 하나라도 이름 없는 정지 · 포커스 이탈 · 반복 낭독이 있으면 실패로 적고 보고한다.

## 실행 순서

준비(대화상자 · 빌드 · 번들 서버) → (인자 없는 픽스처, 3버튼) N1 → N4(모달 · 확인창) → N8 → (모드 왕복) N9 → N3 →
(`audioProgress true`) N2 → N4(말풍선) → N6 → (`reviewProgress true`, `pm clear`) N5 → N7 → 모드 되돌리기. T1은 별도 회차(TalkBack을 켠다).
N3는 제스처 모드를 쓰므로 N9 뒤에 한다. 픽스처가 180초 뒤 끝나면 4초 이상 둔 뒤 다시 시작한다.

## 실행 결과

두 회차다. 첫 회차가 N7 · N9의 실패를 찾았고, 그 둘을 고친 뒤(`834f56fc` — 설문 · 국가 시트의 빈 상자와 `globalPropsMode: "event"`) 둘째 회차가 전 항목을 다시 돌았다.
둘 다 2026-10-05, Pixel_8 AVD(API 37) · `wm size 390x844` · `wm density 160` · 글자 배율 1.0, TalkBack 꺼짐, 호스트(`assembleDebug`)와 번들
(`PUBLIC_SUPABASE_URL=https://example.invalid … pnpm bundle:android`)을 그 커밋에서 새로 만들었다. 앱 `FATAL EXCEPTION`은 두 회차 모두 0건이다.
스크린샷은 저장소에 넣지 않았다 — 작업 `android-tabbar-inset`의 산출물 `artifacts/e2e/`(첫 회차) · `artifacts/e2e-green/`(둘째 회차)에 있다.
첫 회차의 절차 결함(모드 확인 명령 · `Start` · N7의 노드 수와 누르는 자리 · 픽스처 인자 · 180초와 재시작 대기 · 세션 지워짐)은 이 문서에 반영했다.

| 항목 | 첫 회차 13:39 ~ 13:52 KST (`4fa8304b`) | 둘째 회차 14:05 ~ 14:13 KST (`834f56fc`) | 모드 | 근거(둘째 회차) |
|---|---|---|---|---|
| N1 | 통과 | 통과 | 3버튼 | 알약 Journey `[67,736][131,784]` · Roleplay `[163,736][227,784]` · Settings `[259,736][323,784]`, 시스템 바 위 끝 796까지 12. y 760 탭마다 선택이 옮겨 감. 수정 전 `B1-3btn.png`는 784 ~ 832 |
| N2 | 통과(라운드 관찰 못 함) | 통과(라운드 관찰 못 함) | 3버튼 | `audioProgress true`. x = 3/10/380/387 세로 열 y 729 ~ 795가 한 색(255,253,252), y 776 · 795 가로줄 한 색, 초록 노드 픽셀 y ≥ 728에서 0. y 796 ~ 843은 시스템 막(255,255,255). (b) 롤플레이는 스크롤이 없어 만들지 못함 |
| N3 | 통과 | 통과 | 제스처 | Journey `[67,784][131,832]`, 가운데 탭 y 808 → `Roleplay, selected` `[163,784][227,832]`. `B1-gesture.png`와 같은 y |
| N4 | 통과 | 통과 | 3버튼 | 말풍선 `Start` 스크린샷 y 약 636 ~ 692(탭 바 윗면 728 위). 연속 모달 `Continue →` `[128,722][262,780]`, 눌러 닫힘. 확인창 `Sign out` `[55,384][335,440]` · `Stay signed in` `[55,448][335,504]` |
| N5 | 통과(닿은 화면만) | 통과(닿은 화면만) | 3버튼 | 표지 `Skip` `[16,716][103,772]` · `Next` `[115,716][374,772]`, 탭 바 없음. 확인창 `Skip` `[55,408][335,464]` · `Keep watching` `[55,472][335,528]`. 서사 대사 · 최종 문항 · 여정 입구는 닿지 못함 — 코드 판정 |
| N6 | 통과 | 통과 | 3버튼 | 학습 화면: 탭 바 없음, 답 버튼 아래 끝 약 688, 바닥 `[0,796][390,844]` 셸 여백. 알림 화면 같은 모습. 학습 완료 `Back to map` `[16,656][374,712]`(N5 → N7 길). 메신저는 닿지 못함 — 코드 판정 |
| N7 | **실패** — `Not now` `[16,768][374,824]`, 아래 28이 시스템 바 밑. 아래쪽 (195,810)을 누르자 홈 버튼이 눌려 런처로 감 → 빈 상자 추가(ADR-0044 D3) | 통과 | 3버튼 | `Not now` `[16,720][374,776]`(한 노드), 여유 20. 아래쪽 (195,774) 탭 → 시트 닫힘, `Journey, selected`, `topResumedActivity=MainActivity`. 국가 시트는 이 절차로 못 봄 |
| N8 | 통과(약한 표본) | 통과(약한 표본) | 3버튼 | 설정 `Delete account` `[21,627][369,699]`(바 위 끝 728까지 29). 맵 마지막 항목 약 y 374. 롤플레이 스크롤 없음, 카드 아래 약 420 |
| N9 | **실패** — 모드를 바꿔도 알약이 그대로(제스처에서 `[67,736][131,784]`), 탭을 한 번 누르자 따라감. 호스트는 새 값을 보냈고 JS가 다시 그리지 않았다(logcat) → `globalPropsMode: "event"`(ADR-0044 D4) | 통과 | 3버튼 → 제스처 → 3버튼 | 탭 없이 Journey bottom 784 → 832 → 784(mode 0 → 2 → 0), pid 세 시점 같음, 스플래시 복귀 없음. 마지막 3버튼 화면 바 아래 한 면 |
| T1 | 미실행 | 미실행 | 3버튼 | TalkBack을 켠 회차가 없다 |

`globalPropsMode` 변경의 회귀 점검(둘째 회차): 스플래시 → 온보딩, 콜드 스타트(로그인 화면), 로그인 뒤 첫 로드의 safe area(15프레임 연속 — 여백 깜빡임 · 점프 없음),
연속 칩 모달 세 번 열고 닫기에서 이상이 없었다.
