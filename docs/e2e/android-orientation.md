# Android 화면 방향과 구성 변경

Android 호스트가 휴대폰에서 **세로로 고정**되는지, 그 밖의 구성 변경(다크 모드 · 화면 크기 · 시스템 언어 · 내비게이션 모드 전환 · 분할 화면 · 큰 화면의 가로)에서
**Activity가 다시 만들어지지 않고** 같은 화면 · 같은 진행 상태로 새 창에 다시 배치되는지, 다시 만들어지는 변경(글꼴 크기 · 디스플레이 크기, API 35 이하의 내비게이션 모드 전환)은
다시 서서 정상 화면이 되는지를 에뮬레이터의 실제 Activity에서 확인한다. 값 집합의 판정(`mainActivityConfigIssues`) · 병합 매니페스트 · 설치된 앱의 Activity 수명과
LynxView의 크기 · screen metrics는 `unit` · `integration`(`host-orientation.integration.test.mjs` · `ConfigurationChangeTest`)이 이미 진다.
이 문서는 **실제 화면에서만 보이는 것**(세로 유지 · 같은 문항 · 새 창을 채움 · safe area와 탭 바의 위치 · 소리의 이어짐 · 큰 화면 가로)만 진다.
항목 정본은 작업 `android-orientation`의 계약(`spec.md` — r03이 앞 절을 이긴다)과 test-plan `e2e`(O1 ~ O12, r02 · r03 정정 포함)다. 결정(세로 고정 · 재생성 없이 받는 11값 · 재생성을 받아들이는 변경)과 그 근거는 [ADR-0047](../adr/0047-android-orientation-config-changes.md)이 진다.

이 문서는 **절차**다. 2026-10-06 하루에 여섯 번 돌았고 그때마다 찾은 절차 결함을 반영해 고쳐 썼다(맨 아래 「절차 정정 기록」).

| 실행 | HEAD | 매니페스트 | 무엇을 돌렸나 |
|---|---|---|---|
| ① 첫 e2e 실행 + API 30 진단 + 접근성 점검 | `8e16f6b5` | 10값(`assetsPaths` 없음) | O1 ~ O4 · O7 ~ O12 · 계측 · 회귀 일괄 |
| ② 최종 검증 | `94097ecb` | 10값 | 고친 도구 · O10 (c) · O11 · 계측 · 회귀 일괄(API 37만) |
| ③ e2e 재실행 | `5988e8ec` | 10값 | O5 · O6 · O8 · O9 · O10 (a)(b) · O12 전체 · 계측(API 30) |
| ⑤ 최종 검증 r02 | `33057ccb` | 11값 | `pnpm verify` · gradle 전체 · 계측(API 37) · O6(r03 기준) · 새 명령 넷 |
| ⑥ O6 재판정 + 기준선 대조 | `33057ccb` · 기준선 `47600f41` | 11값 / 선언 없음 | O6(r04 기준)과 같은 조작의 기준선 실행 |
| ④ `assetsPaths` 선언 뒤의 기기 검증 | `4f3b2927` | **11값** | O10 (c)의 새 기준 · 학습 화면과 소리 재생 중의 모드 전환 · O1 · O2 · O7 · O12의 O10 (c) · 계측(두 API) · 회귀 일괄 |

①②③은 제품 코드가 같다. **④ · ⑤ · ⑥이 `assetsPaths`가 더해진 지금의 빌드다**(`33057ccb`는 `4f3b2927`에 문서만 더한 것이다). 아래 표는 항목마다 마지막으로 돈 실행을 적는다 — ④에서 다시 돌지 않은 항목은 「10값 빌드에서 통과, `assetsPaths` 추가 뒤 재실행 안 함」이다.
**이 문서의 지금 판을 처음부터 끝까지 그대로 돌린 실행은 없다.**

## 실행 상태

| 항목 | 무엇 | 기기 | 마지막 실행일 | 결과 |
|---|---|---|---|---|
| O1 | 회전해도 세로 · 재생성 없음 | Pixel_8 (API 37) | 2026-10-06 ④ `4f3b2927` | 통과(④에서는 설정 앱 대조 회전을 하지 않았다 — 대조는 ①) |
| O2 | 다크 모드 전환 | Pixel_8 | 2026-10-06 ④ `4f3b2927` | 통과 |
| O3 | 화면 크기 변경(`wm size`)과 safe area · 탭 바 | Pixel_8 | 2026-10-06 ① `8e16f6b5` | 통과 — (a) · (b). **`assetsPaths` 추가 뒤 재실행 안 함** |
| O4 | 큰 화면 흉내(가로) | Pixel_8 | 2026-10-06 ① `8e16f6b5` | 통과 — **흉내에서.** 플랫폼이 스스로 고정을 무시하는지는 미증명. **`assetsPaths` 추가 뒤 재실행 안 함** |
| O5 | 시스템 언어 변경 | Pixel_8 | 2026-10-06 ③ `5988e8ec` | 통과. **`assetsPaths` 추가 뒤 재실행 안 함** |
| O6 | 분할 화면 | Pixel_8 | 2026-10-06 ⑥ `33057ccb` | 통과(r04 기준) — 재생성 0 · 세로 모양 영역 채움 · 가로 모양 영역 레터박스 · 레터박스 안 탭이 들음 · 복귀 뒤 같은 문항. **관찰**: 높이 823의 창에서 답 · 재생 버튼이 잘려 그 문항을 풀 수 없고 스크롤로도 닿지 않는다 — 기준선도 같은 높이에서 같게 잘린다. 앞선 두 실행(③ · ⑤)의 「실패」는 당시 기준(r02 · r03)에서였다 |
| O7 | 가드 — 글꼴 크기 · 디스플레이 크기는 다시 선다 | Pixel_8 | 2026-10-06 ④ `4f3b2927`(글꼴) · ① `8e16f6b5`(밀도) | 통과(가드). 밀도 회차는 `assetsPaths` 추가 뒤 재실행 안 함(계측 IC7은 ④에서 통과) |
| O8 | 구성 변경 중 소리가 이어진다 | Pixel_8 | 2026-10-06 ③ `5988e8ec`(다크 모드 두 회차) · ④ `4f3b2927`(내비게이션 모드 전환 두 회차) | 통과 |
| O9 | 소셜 로그인 왕복 중 구성 변경 | Pixel_8 | 2026-10-06 ③ `5988e8ec` | 회차 1(다크 모드) · 회차 2(큰 화면 흉내의 가로) 통과. **`assetsPaths` 추가 뒤 재실행 안 함** |
| O10 | 구성 변경 뒤 뒤로가기 · 내비게이션 모드 전환 | Pixel_8 | 2026-10-06 ③ `5988e8ec`((a)(b) 야간 왕복) · ④ `4f3b2927`((c)와 모드 전환 뒤의 뒤로가기) | (a) · (b) 통과. (c) 통과 — **재생성 0**, 알약 2243 → 2369 → 2243 |
| O11 | TalkBack 포커스 · 두 번 탭 | Pixel_8 | 2026-10-06 ① 접근성 점검 · ② `94097ecb` | 통과 — 로그인 · 온보딩 화면에서 `uiMode` · `screenSize` 변경 뒤 포커스 유지 · 두 번 탭 활성화 · 재생성 0. **학습 화면 · API 30 · 실기 TalkBack · 낭독 · 스와이프 탐색은 미확인. `assetsPaths` 추가 뒤 재실행 안 함** |
| O12 | API 30에서 O1 · O2 · O3 · O10 | R6_API30 (API 30) | 2026-10-06 ③ `5988e8ec`(전체) · ④ `4f3b2927`(O2 · O10 (c)) | 통과 — O10 (c)는 **재생성되고**(선언이 무시된다) 재생성 뒤 맵 정상 · 알약 2175 → 2307 → 2175. O1 · O3 · O10 (a)(b)는 `assetsPaths` 추가 뒤 재실행 안 함 |
| 계측 | `ConfigurationChangeTest`(8건) | Pixel_8 · R6_API30 | 2026-10-06 ④ `4f3b2927` | API 37: 8 통과. API 30: 6 통과 + 2 건너뜀(IC5 · IC8) |
| 회귀 | 앞선 작업(뒤로가기 · 탭 바 inset · 효과음 · 오디오 · 딥링크) 범위 확인 | Pixel_8 | 2026-10-06 ⑤ `33057ccb`(`pnpm verify` · gradle 전체 · 계측 일괄) · ④ `4f3b2927`(계측 일괄) | 계측 일괄 `OK (40 tests)`. **Maestro · 세션/저장소 스크립트 · R8 ②는 어느 실행에서도 돌리지 않았다.** `pnpm verify`는 ⑤(`33057ccb`, 11값 빌드)에서 종료 0이었다(②의 10값 빌드에서도 통과) |

**실행하면 이 표와 맨 아래 「실행 결과」를 같은 날 함께 고친다.** 「미실행」은 통과가 아니다. 건너뛴 항목(O4의 흉내 불가 · O5의 닿지 못함 · O11의 TalkBack 없음)도
통과로 적지 않고 사유를 적는다.

## 이 절차로 확인되지 않는 것

- **실기의 회전 센서와 회전 잠금 버튼**: 에뮬레이터의 가상 센서(`adb emu rotate`)는 시스템에 「회전 제안」을 주는 데까지만 실기와 같다. 실제 가속도 센서의 노이즈 · 기기를 눕혔을 때의 동작 ·
  제조사의 회전 설정 UI는 보지 못한다.
- **폴더블**: 펼침 · 접힘 · 힌지 · 화면 이어짐(posture)을 일으킬 AVD가 없다. 이 절차는 폴더블을 확인하지 않았다.
- **실제 태블릿**: 큰 화면 AVD가 없다. O4는 휴대폰 AVD에 `wm size`로 최소 너비 600dp 이상을 만든 **흉내**다. 제조사의 앱별 화면 비율 설정 · 태블릿 전용 창 배치는 보지 못한다.
- **플랫폼이 큰 화면에서 스스로 방향 고정을 무시하는가**: O4는 `wm set-ignore-orientation-request true`를 **걸어서** 가로를 만든다. 그 설정 없이 API 36 이상 · 최소 너비 600dp 이상에서 무엇이 일어나는지(무시인지 레터박스인지)는 이 절차로 알 수 없다 — 플랫폼 문서 기준일 뿐이다.
  분할 화면(O6)도 이것을 대신 보여 주지 못한다 — 분할 화면에서는 고정이 유지된다.
- **낮은 분할 창에서의 조작 가능성**: 가로 모양의 낮은 영역에서는 세로 전제 화면의 아래가 잘려 조작부에 닿지 못할 수 있다. 이 절차는 그것을 **판정하지 않고 관찰로 적는다**(계약이 보장하지 않는 것이다 — ADR-0047 D5).
  본 것은 듣기 문항 하나 · 높이 823 하나다. 다른 문항 종류 · 다른 높이 · 다른 화면의 잘림, 잘린 버튼을 눌렀을 때의 채점, 두 가지 스와이프 밖의 스크롤 수단은 재지 않았다.
- **`assetsPaths`의 미확인 범위**: API 31 ~ 35(선언이 듣는지), 실기 · 제조사 스킨, 배경화면 기반 동적 색상이 이 구성 변경을 보내는지, 텍스트 입력 중의 오버레이 전환.
- **TalkBack 포커스의 낭독 · 청음**: 헤드리스 에뮬레이터에서는 음성 출력을 들을 수 없다. O11은 포커스 표시와 활성화(두 번 탭)의 결과까지만 보며, TalkBack이 붙은 이미지가 없으면 미실행이다.
  구성 변경 뒤의 낭독이 반복되는지 · 어떻게 들리는지는 확인하지 못한다. **실기 TalkBack이 아니다.** 포커스는 터치 탐색으로만 둔다 — 스와이프 탐색(선형 순서)과 그 순서가 구성 변경 뒤 같은지는 보지 않는다.
- **실제 설정 앱 UI로 내비게이션 모드를 바꾸는 조작**: 이 절차는 오버레이 명령(`cmd overlay enable-exclusive`)으로 대신한다. 설정 앱이 같은 방식(한 오버레이만 켠다)이라는 것은 명령의 결과가 같다는 데서 온 판단이고,
  설정 화면을 직접 누르지는 않았다. 제조사 스킨도 보지 않았다.
- **글꼴 · 밀도 변경(모든 API)과 내비게이션 모드 전환(API 35 이하)으로 재생성된 뒤 어디까지 복원되는가**: 재생성 뒤 처음 화면(맵 또는 온보딩)이 정상으로 서는 것까지만 본다. 진행 중이던 문항 · 화면 스택은 사라진다(ADR-0047 D3).
- **블루투스 · USB 키보드 연결**(`keyboard|keyboardHidden|navigation`): 에뮬레이터로 일으킬 수 없다. 코드 판정(계약 §5.2)이다.
- **일몰 예약에 의한 다크 모드 전환**: O2가 같은 구성 변경을 `cmd uimode night`로 일으킨다. 시각에 맞춰 시스템이 일으키는 경로는 따로 보지 않는다.
- **글꼴 크기 · 디스플레이 크기에서 상태를 살리는 일**: 계약이 재생성을 받아들이므로(§5.2) 상태가 사라지는 것이 정상이다. O7은 그것이 지금과 같다는 가드일 뿐이다.
- **열린 말풍선의 위치**: 창 크기가 바뀌면 낡을 수 있다(계약 §14-4, 범위 밖). O4에서 관찰로만 적는다.
- **가로 화면의 보기 좋음**: 세로 전제 화면은 가로에서 아래가 잘릴 수 있다(계약 §9). 판정이 아니라 관찰이다.
- **API 26 ~ 29 · 31 ~ 36**: 두 AVD(API 37 · API 30)만 다룬다. 사이 버전의 `configChanges` · 방향 고정 동작 차이는 확인하지 못한다. 특히 `assetsPaths` 선언이 듣기 시작하는 API가 36이라는 것은 SDK 파일 대조에서 온 판단이고 API 31 ~ 36 기기에서 재지 않았다.
- **프로세스가 죽은 뒤의 복귀**: 범위 밖이다(`onSaveInstanceState` 없음).
- **iOS**: 이 변경은 iOS 파일을 바꾸지 않는다. 증거는 `git diff --stat`의 `apps/ios/` 0줄이다.

## 전제

### 기기 · 빌드

| 기기 | AVD | API | 쓰는 항목 |
|---|---|---|---|
| 주 기기 | `Pixel_8` | 37 (16 KB 페이지 · 1080x2400 · 420 dpi · 최소 너비 411dp) | O1 ~ O11 · 계측 |
| 구 버전 기기 | `R6_API30` | 30 (4 KB 페이지) | O12 · 계측 |

- JDK 17 이상, Android SDK, `ANDROID_HOME`, `python3`, Node 22(`export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"`), `pnpm` 의존 설치 완료.
  스크린샷 크롭(O2)에 macOS의 `sips`를 쓴다.
- **전용 에뮬레이터를 쓴다.** 이 절차는 야간 모드 · 화면 크기 · 밀도 · 글꼴 배율 · 회전 · 내비게이션 모드 같은 **에뮬레이터 전역 설정**을 바꾼다.
  Maestro · 다른 계측 · 다른 e2e와 **동시에 돌리지 않는다**(한 기기에서). 두 기기를 함께 띄워도 되지만 기기마다 따로 돌린다.
- **16 KB 호환성 대화상자는 뜨지 않아야 한다.** 뜨면 닫고 넘어가지 말고 그 시도를 버린 뒤 회귀로 적는다([Android 출시 설정 절차](android-release-config.md)의 R1).
- 이 절차는 **디스플레이 기본값(1080x2400 · 420 dpi)** 에서 한다. 다른 Android e2e 문서가 쓰는 `390x844` · `160 dpi`가 아니다 — 이 절차의 숫자(최소 너비 411dp · 1080x1920 · 1600x2560의
  609dp)가 기본 밀도에 묶여 있고, 계측 `ConfigurationChangeTest`가 크기 · 밀도 재정의가 남아 있으면 시작 전에 실패한다.
  다른 문서의 절차를 돌린 뒤라면 아래 「시작 전 전역 설정」으로 먼저 되돌린다.
- **`wm density` 재정의는 이 절차가 앱을 띄운 채 걸지 않는다.** 밀도 변경은 재생성을 일으키는 변경(계약 §5.2)이다. 걸어야 하는 것은 O7뿐이고 그것은 재생성을 확인하는 항목이다.
  `wm size`는 앱이 뜬 채 걸어도 재생성하지 않는다 — 다만 **높이만 바꾸는 `wm size 1080x1920`은 구현 전 빌드에서도 API 37에서는 재생성을 일으키지 않았다.** 그래서 이 자극 뒤의 「재생성 없음」은 구현 전후를 가르지 못한다(아래 「자극의 구분력」).
- **내비게이션 모드는 항목이 요구하지 않는 한 앱을 띄우기 전에 맞춘다.** 모드 전환은 API 36 이상에서는 재생성 없이 처리되지만(`assetsPaths`), **API 35 이하에서는 재생성을 일으킨다**(O10 (c)가 두 경우를 보는 항목이다).
- **debug 앱을 다시 앞에 올릴 때는 늘 `--es bundle-url …`을 붙인다**(아래 도구의 `reopen`). extra 없이 `am start -n …MainActivity`를 하면 `singleTask`의 `onNewIntent`가 인텐트를 extra 없는 것으로 바꿔 놓고,
  **그 뒤의 재생성**(글꼴 · 밀도, API 35 이하의 모드 전환)이 기본값 `http://10.0.2.2:3000/main.lynx.bundle`을 읽어 글자 없는 주황 한 면(`errCode:102` — Lynx가 아무것도 그리지 않아 창 배경만 남는다. [ADR-0049](../adr/0049-android-launch-appearance.md) 전에는 흰 화면이었다)이 된다. debug 빌드에서만 생기는 일이고 번들을 내장한 빌드와는 무관하다.

```sh
# 두 기기 공통 — 한 번만
export PATH="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools:$PATH"
export PATH="$HOME/.nvm/versions/node/v22.23.2/bin:$PATH"
# 기기 ID는 adb devices 로 확인한다. API는 getprop 으로 가른다(Pixel_8 = 37, R6_API30 = 30). 기기를 바꿀 때 ID만 다시 정한다
ID="<adb devices 가 보여 준 에뮬레이터 ID>"
A() { adb -s "$ID" "$@"; }    # 함수다 — `A shell …`로 부른다. 문자열 변수(`A="adb -s …"; $A shell …`)는 zsh에서 command not found가 난다
A shell getprop ro.build.version.sdk
```

빌드 · 번들 · 설치(저장소 루트에서, **검증할 커밋의 SHA를 실행 결과에 적는다**):

```sh
git rev-parse --short HEAD
# 1) 번들 — 실제 서버 주소가 번들에 들어가지 않게 모의 값으로 만든다
PUBLIC_SUPABASE_URL=https://example.invalid PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
# 2) debug APK + 계측 APK (호스트 · 번들 둘 다 같은 커밋에서 새로 만든다 — 번들만 새로 만들면 호스트의 새 동작이 빠진다)
( cd apps/android && ./gradlew assembleDebug assembleDebugAndroidTest )
# 3) 번들 제공 — 별도 터미널 또는 백그라운드. 호스트 쪽에서 200이 나와야 한다
python3 -m http.server 18790 --bind 0.0.0.0 --directory apps/mobile/dist >/tmp/libitum-orientation-preview.log 2>&1 &
curl -sI http://localhost:18790/main.lynx.bundle | head -1
# 4) 설치 — 기기마다 ID를 바꿔 한 번씩
A install -r apps/android/app/build/outputs/apk/debug/app-debug.apk
A install -r apps/android/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
```

**`pnpm verify`를 돌린 뒤에는 1)을 반드시 다시 돌린다.** `pnpm verify`가 `apps/mobile/dist`를 모의 값 없는 번들로 덮어쓰고, 그 번들을 서빙하면 `fixture`가 `signed-in journey screen did not render`로 실패했다(2026-10-06).
원인이 그 번들이라는 것은 **추측**이다 — 확정하지 않았고, 1)을 다시 돌리자 같은 명령이 통과했다는 것까지가 사실이다.

에뮬레이터 안에서 호스트 PC는 `10.0.2.2`다(`http://10.0.2.2:18790/main.lynx.bundle`).

### 시작 전 전역 설정 — 기록하고 확인한다

아래 도구를 정의한 뒤 **시작 전 값을 파일에 남긴다**(되돌리기가 이 기록으로 한다).

```sh
OUT=.agent-harness/work/android-orientation/artifacts/e2e; mkdir -p "$OUT"
globals() {
  echo "sdk: $(A shell getprop ro.build.version.sdk | tr -d '\r')"
  echo "night: $(A shell cmd uimode night | tr -d '\r')"
  echo "size: $(A shell wm size | tr -d '\r' | tr '\n' ' ')"
  echo "density: $(A shell wm density | tr -d '\r' | tr '\n' ' ')"
  for K in font_scale accelerometer_rotation user_rotation; do echo "$K: $(A shell settings get system $K | tr -d '\r')"; done
  echo "navigation_mode: $(A shell settings get secure navigation_mode | tr -d '\r')"
  echo "overlays: $(A shell cmd overlay list | tr -d '\r' | grep 'systemui.navbar' | tr -s ' ' | sed 's/^ //' | sort | tr '\n' ' ')"
  echo "talkback: $(A shell settings get secure enabled_accessibility_services | tr -d '\r')"
  echo "locale: $(A shell getprop persist.sys.locale | tr -d '\r')"
  echo "ignoreOrientation: $(A shell wm get-ignore-orientation-request 2>&1 | tr -d '\r' | head -1)"
}
globals | tee "$OUT/globals-before-$ID.txt"
```

| 설정 | 시작 전에 이 값이어야 한다 | 아니면 |
|---|---|---|
| `night` | `Night mode: no` | `A shell cmd uimode night no` |
| `size` | `Physical size` 한 줄만(재정의 없음) | `A shell wm size reset` |
| `density` | `Physical density` 한 줄만(재정의 없음) | `A shell wm density reset` — `R6_API30`은 이전 작업의 `wm density 160`이 남아 있을 수 있다. 이것을 모른 채 계측을 돌리면 `precondition: a 'wm density' override is already set`으로 5건이 실패한다 |
| `font_scale` | `1.0` | `A shell settings put system font_scale 1.0` |
| `accelerometer_rotation` | **기록해 둔다.** 정해진 값이 없다 — Pixel_8의 시작 값이 실행에 따라 `0`이기도 `1`이기도 했다(2026-10-06). O1 · O4가 항목 안에서 `1`로 켠다 | 끝에서 기록한 값으로 |
| `user_rotation` | 기록해 둔다(`0`이 정상) | 끝에서 그 값으로 |
| `navigation_mode` · `overlays` | **시작 값을 기록한다.** Pixel_8은 `2`(제스처)에 threebutton · gestural이 둘 다 `[x]`였고, R6_API30은 `0`에 threebutton만 `[x]`였다(2026-10-06). O3 · O4 · O10은 `0`(3버튼)에서 한다 | **앱을 띄우기 전에** `navmode threebutton`(아래 도구) 뒤 `settings get secure navigation_mode`가 `0`인지 확인. 끝에서 `restore_nav`가 기록해 둔 모드와 `[x]` 목록으로 되돌린다 |
| `talkback` | 비어 있음(`null`) — O11 전까지 꺼져 있다 | O11 밖에서 켜져 있으면 끈다 |
| `ignoreOrientation` | API 37: `ignoreOrientationRequest false`. API 30: `Unknown command`(그 명령이 없다 — 정상) | API 37에서 `true`면 `A shell wm set-ignore-orientation-request reset` |

**모드는 `settings get secure navigation_mode`로 확인한다.** `cmd overlay list | grep navbar`는 모드를 가르지 못한다 — 두 오버레이가 모두 `[x]`로 나올 수 있다([Android 시스템 뒤로가기](android-system-back.md)의 「내비게이션 모드 전환」).
`globals`가 그 목록(`overlays:`)을 남기는 것은 모드 확인이 아니라 **되돌리기** 때문이다: `[x]` 목록이 시작 때와 다르면 같은 모드 번호라도 다음 전환의 동작(API 35 이하에서의 재생성 여부 · 일반 `enable`이 듣는지)이 달라진다.

**`locale:` 줄은 O5를 돌리면 시작 값으로 돌아가지 않을 수 있다.** Pixel_8의 `persist.sys.locale`은 시작 때 빈 값이었고, 언어 목록을 한 번이라도 건드리면 목록을 되돌려도 `en-US`가 남았다(2026-10-06). 마지막 `globals | diff`에 `locale:` 한 줄만 남는 것은 그 경우다 — O5 절.

### 셸 관용구와 관찰 도구

```sh
shot() { A exec-out screencap -p > "$OUT/$1.png"; }
# 스크린샷의 가로 · 세로(px). 회전 · 크기 판정은 이 값으로 한다
shotsize() { A exec-out screencap -p | python3 -c 'import sys,struct; d=sys.stdin.buffer.read(24); print(*struct.unpack(">II", d[16:24]))'; }
# 현재 디스플레이(재정의 포함)의 W H D 를 셸 변수로. 회전하면 W · H가 바뀐 채로 읽히지 않는다 — 가로에서는 직접 바꿔 읽는다
disp() {
  SZ=$(A shell wm size | tr -d '\r' | tail -1 | grep -o '[0-9]*x[0-9]*')
  W=${SZ%x*}; H=${SZ#*x}
  D=$(A shell wm density | tr -d '\r' | tail -1 | grep -o '[0-9]*' | tail -1)
}
# dp -> px (D는 disp 가 읽은 dpi). 420 dpi: 60dp = 157px, 48dp = 126px, 12dp = 31px, 64dp = 168px
px() { echo $(( $1 * D / 160 )); }
# 실제 값 · 기대 값 · 허용 오차(px). 한 줄로 PASS / FAIL
near() { d=$(( $1 - $2 )); [ "${d#-}" -le "$3" ] && echo "PASS $1 == $2 (허용 $3)" || echo "FAIL $1 != $2 (허용 $3)"; }

# --- 「재생성 없음」 판정 ①: Activity 수명 이벤트 ---
# 조작 직전에 mark, 조작 뒤에 lc. 재생성이 없으면 "create: 0 destroy: 0 relaunch_resume: 0"
mark() { A logcat -b events -c; }
lc() {
  EV=$(A logcat -b events -d | tr -d '\r' | grep 'com.libitum.host.MainActivity')
  echo "create: $(echo "$EV" | grep -c wm_on_create_called) destroy: $(echo "$EV" | grep -c wm_on_destroy_called) relaunch_resume: $(echo "$EV" | grep -c wm_relaunch_resume_activity)"
}
# --- 판정 ②(보조): 프로세스. 재생성은 같은 프로세스 · 같은 ActivityRecord 안에서 일어난다 — 이 값으로는 재생성을 가르지 못한다 ---
state() {
  echo "records: $(A shell dumpsys activity activities | tr -d '\r' | grep -o 'ActivityRecord{[0-9a-f]* [^ ]* [^ ]*MainActivity' | sort -u | tr '\n' ' ')"
  echo "pid: $(A shell pidof libitum.duru.android | tr -d '\r')"
}
# --- 판정 ③: 앱 쪽 노드의 글자와 영역 ---
texts() {
  A shell uiautomator dump /sdcard/ui.xml >/dev/null
  A exec-out cat /sdcard/ui.xml | python3 -c '
import sys, xml.etree.ElementTree as ET
for n in ET.fromstring(sys.stdin.read()).iter("node"):
    if n.get("package") == "libitum.duru.android":
        for k in ("content-desc", "text"):
            if n.get(k):
                print(k, n.get(k))
' | sort -u
}
# 앱 노드 bounds 의 오른쪽 · 아래 최댓값 = 앱 창이 차지한 크기 ("W H")
appbounds() {
  A shell uiautomator dump /sdcard/ui.xml >/dev/null
  A exec-out cat /sdcard/ui.xml | python3 -c '
import re, sys, xml.etree.ElementTree as ET
r = b = 0
for n in ET.fromstring(sys.stdin.read()).iter("node"):
    if n.get("package") == "libitum.duru.android":
        x = re.findall(r"[0-9]+", n.get("bounds"))
        r = max(r, int(x[2]))
        b = max(b, int(x[3]))
print(r, b)
'
}
# content-desc 가 $1 로 시작하는 노드의 bounds. edge "Journey" 4 -> 4번째 숫자(아래 끝). 1 왼쪽 · 2 위 · 3 오른쪽 · 4 아래
dumpb() { A shell uiautomator dump /sdcard/ui.xml >/dev/null; A shell cat /sdcard/ui.xml | grep -o "content-desc=\"$1[^\"]*\"[^>]*bounds=\"[^\"]*\""; }
edge() { dumpb "$1" | head -1 | grep -o 'bounds="[^"]*"' | grep -o '[0-9]*' | sed -n "$2p"; }
# 한 시점을 통째로 남긴다: snap O2-before -> $OUT/O2-before.{state,texts,png}
snap() { state > "$OUT/$1.state"; texts > "$OUT/$1.texts"; shot "$1"; }
# 두 시점의 판정 ②: sameproc O2-before O2-night
sameproc() { diff "$OUT/$1.state" "$OUT/$2.state" >/dev/null && echo "SAME process $1 $2" || echo "DIFFERENT process(프로세스가 바뀜) $1 $2"; }
# 앞에 있는 Activity
front() { A shell dumpsys activity activities | grep -E "topResumedActivity|mResumedActivity"; }
# debug 앱을 다시 앞에 올린다 — 늘 bundle-url extra 와 함께(위 전제)
BUNDLE=http://10.0.2.2:18790/main.lynx.bundle
reopen() { A shell am start -n libitum.duru.android/com.libitum.host.MainActivity --es bundle-url "$BUNDLE"; }
# content-desc 가 $1 로 시작하는 첫 노드의 가운데를 누른다: tapdesc "Connect with Google"
tapdesc() {
  B=$(dumpb "$1" | head -1 | grep -o 'bounds="[^"]*"' | grep -o '[0-9]*' | tr '\n' ' ')
  [ -n "$B" ] || { echo "no node: $1"; return 1; }
  A shell input tap $(echo "$B" | awk '{ print int(($1 + $3) / 2), int(($2 + $4) / 2) }')
}
# LynxView 의 bounds "왼,위-오른,아래" = 창 안에서 Lynx 가 차지한 영역. 「창을 채운다」의 판정(두 API 공통)
lynxbounds() { A shell dumpsys activity top | tr -d '\r' | grep -o 'com.lynx.tasm.LynxView{[^}]*}' | grep -o '[0-9]*,[0-9]*-[0-9]*,[0-9]*' | head -1; }
# 상태바 inset 의 높이(px). API 37 의 dumpsys 형식이다 — API 30 은 `dumpsys window` 의 `StatusBar … mFrame=[0,0][W,h]` 를 눈으로 읽는다
sbar() { A shell dumpsys window | tr -d '\r' | grep -m1 -o 'type=statusBars frame=\[0,0\]\[[0-9]*,[0-9]*\]' | grep -o '[0-9]*' | tail -1; }
# 내비게이션 모드를 바꾼다 — 설정 앱처럼 그 범주에서 하나만 켠다: navmode threebutton | navmode gestural
navmode() { A shell cmd overlay enable-exclusive --category "com.android.internal.systemui.navbar.$1"; }
# 시작 때 기록(globals-before)의 모드와 오버레이 [x] 목록으로 되돌린다. 시작 모드의 오버레이를 마지막에 켠다(나중에 켠 쪽이 이긴다)
restore_nav() {
  case "$(grep '^navigation_mode:' "$OUT/globals-before-$ID.txt" | grep -o '[0-9]*$')" in
    2) FIRST=threebutton; LAST=gestural ;;
    *) FIRST=gestural; LAST=threebutton ;;
  esac
  for N in "$FIRST" "$LAST"; do
    if grep '^overlays:' "$OUT/globals-before-$ID.txt" | grep -q -E "\[x\] com\.android\.internal\.systemui\.navbar\.$N( |\$)"; then
      A shell cmd overlay enable "com.android.internal.systemui.navbar.$N"
    else
      A shell cmd overlay disable "com.android.internal.systemui.navbar.$N"
    fi
  done
  sleep 3; A shell settings get secure navigation_mode
}
# 스크린샷 $1.png 의 x = $2 열에서 탭 알약의 주황(244,107,24)이 마지막으로 나오는 y + 1 = 선택된 알약의 아래 끝(px).
# 같은 열 위쪽의 주황(맵의 원)은 무시된다 — 가장 아래 것만 본다. 맵(탭 루트) 스크린샷에만 쓴다
pillbottom() {
  python3 - "$OUT/$1.png" "$2" <<'PY'
import struct, sys, zlib
d = open(sys.argv[1], "rb").read()
x = int(sys.argv[2])
w, h, depth, kind = struct.unpack(">IIBB", d[16:26])
n = {2: 3, 6: 4}[kind]                       # RGB / RGBA, 8비트(screencap 의 형식)
raw, p = b"", 8
while p < len(d):
    size, tag = struct.unpack(">I4s", d[p:p + 8])
    if tag == b"IDAT":
        raw += d[p + 8:p + 8 + size]
    p += 12 + size
raw = zlib.decompress(raw)
stride, prev, last = w * n, bytearray(w * n), -1
for y in range(h):
    f = raw[y * (stride + 1)]
    row = bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
    for i in range(stride):
        a = row[i - n] if i >= n else 0
        b = prev[i]
        c = prev[i - n] if i >= n else 0
        if f == 1:
            row[i] = (row[i] + a) & 255
        elif f == 2:
            row[i] = (row[i] + b) & 255
        elif f == 3:
            row[i] = (row[i] + (a + b) // 2) & 255
        elif f == 4:
            pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
            row[i] = (row[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
    r, g, bl = row[x * n:x * n + 3]
    if r > 200 and 70 < g < 150 and bl < 90:
        last = y
    prev = row
print(last + 1)
PY
}
```

- `dumpb`는 `content-desc`만 읽는다. 학습 문항의 문구 · 일부 버튼(`Start` 등)은 dump에 나오지 않는다 — 그런 화면은 스크린샷을 나란히 놓고 본다.
  Lynx의 `bounds`는 터치 상자라 그림과 ±2dp 흔들릴 수 있다. 판정은 스크린샷에서 재고 `bounds`는 같은 값을 숫자로 읽는 보조다. 둘이 어긋나면 스크린샷을 따른다.
- **API 30에서는 `uiautomator dump`의 `bounds`가 앱 영역에서 잘린다.** 그 버전의 dump는 노드의 아래 끝을 디스플레이의 「앱 크기」(`dumpsys window displays`의 `app=1080x2072` — 화면에서 컷아웃과 3버튼 바를 뺀 값)에서 자른다.
  선택된 알약이 `[188,2043][364,2072]`로 읽히지만 실제 픽셀의 아래 끝은 2175다(2026-10-06 진단). 그래서 API 30에서는 `edge … 4`(아래 끝) · `appbounds`의 세로 값을 **절대 위치 판정에 쓰지 않는다** —
  아래 끝은 `pillbottom`(스크린샷 픽셀)으로, 「창을 채운다」는 `lynxbounds`로 본다. 위 끝 · 왼쪽 · 오른쪽은 잘리지 않는다. API 37은 앱 크기가 화면 전체(`app=1080x2400`)라 잘리지 않는다.
  앱 루트가 화면보다 짧은 것이 아니다 — `dumpsys activity top`에서 창과 LynxView는 두 API 모두 화면 전체다.
- `state`의 `records:`에는 이전 계측이 남긴 오래된 ActivityRecord가 섞여 나올 수 있다(2026-10-06 관찰). 두 시점 가운데 한쪽에만 그 레코드가 있으면 `sameproc`이 거짓 `DIFFERENT`를 낼 수 있다는 것은 **추측**이다(그 실행에서는 일어나지 않았다) — `DIFFERENT`가 나오면 `pid:` 줄을 직접 비교한다. 판정은 어차피 `lc`다.
- `dumpb` · `texts` · `appbounds`가 **빈 출력이면 먼저 앱이 앞에 있는지 `front`로 본다.** 앱이 홈으로 가도 빈 출력이라 「없음」으로 오독하기 쉽다.
- 이 문서의 `sleep`은 **시스템이 구성 변경을 전달하고 다시 그리기를 기다리는 것**이다. 판정은 `sleep`이 아니라 그 뒤의 관찰이 한다. `sleep 3` 뒤에도 값이 이전이면 2초 더 기다려 한 번 다시 읽고,
  그래도 같으면 그 값으로 적는다.

### 「재생성 없음」의 판정 — ①과 ③이 맞아야 통과

| 번호 | 무엇 | 명령 | 통과 |
|---|---|---|---|
| ① | **`MainActivity`의 생성 · 파괴 이벤트가 없다** | 조작 직전에 `mark`(`A logcat -b events -c`), 조작 뒤에 `lc` | `create: 0 destroy: 0 relaunch_resume: 0`. `create`나 `destroy`가 1 이상이면 다시 선 것이다 |
| ② | 프로세스가 같다(보조) | `A shell pidof libitum.duru.android`. `state`의 `pid:` 줄, 두 시점은 `sameproc` | 전후 같은 pid. **이것만으로는 통과가 아니다** — 재생성돼도 pid와 ActivityRecord 해시는 그대로다 |
| ③ | 화면 · 진행 상태가 같다(스플래시를 거치지 않는다) | 전후 스크린샷을 나란히 놓고 같은 화면 · 같은 진행인지 본다. 본문만 잘라 `cmp`(O2의 크롭), 보조로 `texts` 두 파일의 `diff` | 같은 화면이고 처음 화면(스플래시 · 맵 · 온보딩)으로 돌아가지 않았다. 창 크기가 바뀐 항목(O3 · O4 · O6)은 같은 화면이 새 크기로 배치된 것까지 같은 화면으로 본다 |

- **①이 판정의 중심이다.** 재생성은 같은 프로세스 · 같은 ActivityRecord 안에서 일어나므로 해시와 pid는 실제로 재생성된 O7에서도 전후가 같았다(2026-10-06). `wm_on_create_called` · `wm_on_destroy_called`만이 갈랐다.
- **`mark`는 조작 바로 앞에서 한다.** 앱을 띄운 뒤 `mark` 없이 `lc`를 부르면 처음 띄울 때의 `create` 1이 세어진다.
- `relaunch_resume`은 보조다. 시스템이 구성 변경으로 다시 띄울 때 찍히지만(글꼴 · 밀도에서 1. `assetsPaths`를 선언하기 전의 빌드에서는 API 37의 모드 전환에서도 1이었다), API 30의 모드 전환처럼 이 줄 없이 `destroy` → `create`만 찍히는 재생성도 있다.
  `wm_relaunch_activity`는 세지 않는다 — 이 Activity에는 찍히지 않고 런처에만 찍혔다.
- **양성 대조**: 이 도구가 재생성을 실제로 잡는지는 O7이 보여 준다(글꼴 1.3 · 밀도 480에서 `create: 1 destroy: 1 relaunch_resume: 1`). `lc`가 늘 0만 내는 환경이면 ①은 판정이 되지 못한다 — O7을 먼저 돌려 확인한다.
- ③은 눈으로 한다 — 학습 문항의 문구는 dump에 나오지 않으므로 `texts`가 같아도 같은 문항의 증거가 되지 못한다. 상태바의 시계는 매번 달라지므로 비교에서 뺀다.

### 자극의 구분력 — 어느 자극이 「재생성 없음」을 가르는가

`lc`가 0이라는 것은 **그 자극이 구현 전 빌드에서 재생성을 일으킬 때만** 이 변경의 증거다. 구현 전 빌드 · API 37에서 높이만 바꾼 `wm size 1080x1920`은 재생성을 일으키지 않았다(계측의 구현 전 probe).

| 자극 | 구현 전에 재생성되는가(API 37) | 쓰는 곳 |
|---|---|---|
| `cmd uimode night yes` / `no` | **된다** | 「재생성 없음」을 가르는 **기본 자극**: O2 · O8 회차 1 · 2 · O9 회차 1 · O10 (a) · (b) · O11 |
| 회전(자동 회전 + `emu rotate`) · 큰 화면 흉내 | 된다 | O1 · O4 · O9 회차 2 |
| 내비게이션 모드 오버레이 전환(`navmode`) | **된다**(API 36 이상에서 구현 전 재생성 · 구현 뒤 0). API 35 이하는 전후 모두 재생성 — 가드 | O10 (c) |
| `wm size 1080x1920`(높이만) | **안 된다** | O3 — **배치 판정에만** 쓴다(창을 채움 · safe area · 알약 위치). O3의 `lc` 0은 가드로만 적고 「같은 화면 · 같은 진행」의 증거로 세지 않는다 |
| 글꼴 배율 · 밀도 | 된다(구현 뒤에도 — 계약) | O7. `lc`가 재생성을 실제로 잡는다는 **양성 대조** |

- 「같은 화면 · 같은 진행」의 증거는 O2 · O4 · O10 (a) · (b)가 진다. O3는 자극을 바꾸지 않는다 — 보는 것이 크기 변경 뒤의 배치이기 때문이다.
- API 30에서 `wm size`가 구현 전에 재생성을 일으키는지는 재지 않았다 — O12의 O3도 같은 규칙(배치 판정)으로 읽는다.
- 2026-10-06의 첫 실행은 O8 회차 2 · O9 회차 1 · O10 (b)에 `wm size`를 썼다 — 구분력이 없어 다크 모드 전환으로 바꿔 다시 돌았다.

### 기준 화면 — 학습 화면 도중

기준 화면은 **학습 화면의 안정된 두 화면 가운데 하나**다. 로그인 없이 계측 픽스처(`SignedInScreenFixtureTest`)로 들어간다 —
[Android 시스템 뒤로가기](android-system-back.md)의 「앱 구간 진입 (로그인 없이)」와 B3의 길을 따르되, 이 문서는 다음이 다르다.

- **픽스처의 학습은 Lesson 1/1이다 — 둘째 문항이 없다.** 쓸 수 있는 안정 화면은 둘이다: **(가) 답하기 전의 첫 문항**, **(나) 답한 뒤의 「All questions done」**. 어느 쪽에서 했는지 결과에 적는다.
  답을 고르면 「Correct」가 뜨고 **몇 초 뒤 스스로 「All questions done」으로 넘어간다** — 그 사이에 찍은 전후 스크린샷은 구성 변경과 무관하게 다르다. 답한 직후에는 화면이 멈출 때까지 기다린 뒤 `snap`한다.
- **좌표를 그대로 쓰지 않는다.** 그 문서의 참고 좌표는 `390x844` · `160 dpi` 값이다. 이 문서는 1080x2400 · 420 dpi이므로 **스크린샷을 찍어 같은 대상을 찾아 누른다**
  (`shot X` 뒤 이미지를 읽고 `A shell input tap <x> <y>`). `content-desc`가 있는 대상은 `tapdesc`로 누른다.
- 흐름: 픽스처 시작 → 맵이 서면 위로 스와이프해 「Listen to a Hello」 스텝(열린 스텝의 주황 원)을 찾는다 → 말풍선의 `Start` → 첫 문항.
  **맵의 스크롤 위치는 실행마다 다르다** — 「두 번 스와이프한 뒤의 좌표」는 맞지 않는다. 스와이프마다 스크린샷에서 주황 원의 위치를 다시 찾는다.
- 픽스처는 **180초 뒤 스스로 끝난다**(끝나면 심은 세션이 지워져 앱을 켜면 로그인 화면이다). 진입에만 25초쯤 걸리므로 **픽스처 한 번에 항목 하나**를 원칙으로 한다(짧은 항목 둘까지).
  `STOP` 방송 뒤에는 **4초 이상 둔 뒤** 다시 시작한다. 진입 조작을 미리 정리해 두고, 시간이 모자라면 그 항목을 처음부터 다시 한다 — 픽스처가 끝난 뒤의 관찰은 버린다.
  픽스처가 끝나면 Activity가 스스로 끝나고 프로세스가 죽는다 — 그 뒤 다시 켠 앱의 `create 1`은 콜드 스타트이지 구성 변경의 재생성이 아니다.
- **어느 학습 화면이 나왔는지 스크린샷으로 확인한다.** 맵 스크롤이 진입마다 달라 듣기 문항(「Listening」 — 재생 버튼이 있다)이 나오기도 단어 순서 문항이 나오기도 한다. 「안정 화면」의 정의는 같지만 **O8은 듣기 문항이어야 한다.**
- **스크린샷에서 읽은 좌표는 원본 픽셀로 환산한다.** 뷰어가 이미지를 줄여 보여 주면(예: 0.833배) 보이는 좌표를 그대로 `input tap`에 쓰면 빗나간다. `pillbottom` · `shotsize`가 내는 값은 원본 픽셀이다.

```sh
fixture() {   # 픽스처를 시작한다(최대 180초). 백그라운드로 돈다
  A shell pm clear libitum.duru.android >/dev/null
  [ "$(A shell getprop ro.build.version.sdk | tr -d '\r')" -ge 33 ] && A shell pm grant libitum.duru.android android.permission.POST_NOTIFICATIONS
  A shell am instrument -w -e class com.libitum.host.SignedInScreenFixtureTest \
    -e audioProgress true -e bundleUrl http://10.0.2.2:18790/main.lynx.bundle \
    libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner >"$OUT/fixture.log" 2>&1 &
}
stop_fixture() { A shell am broadcast -a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE; }
```

`audioProgress true` 한 가지로 O1 ~ O12의 학습 화면 · 맵이 모두 선다(진행이 있어야 학습 유닛이 맵에서 열린다). 맵에서 `dumpb "Journey"`가 `Journey, selected`를 내면 로그인 뒤 구간이다.

## 항목

기대 red는 구현 전(HEAD `47600f41`: `screenOrientation` · `configChanges` · `onConfigurationChanged` 없음) 기준이다. 구현 뒤의 통과 기준이 아래 「판정」이다.
**이 항목들의 구현 전 실패를 실제로 본 적은 없다** — 이 절차가 처음 돈 것은 구현이 들어간 뒤다. 같은 동작의 구현 전 실패는 계측 `ConfigurationChangeTest`와 정적 검사가 기록했다(작업 산출물 `integration-red.md`).

### O1 — 회전해도 세로 · 재생성 없음 (AC1)

- **기기 · 준비**: Pixel_8. 학습 화면의 안정 화면(위 「기준 화면」 — 답한 직후의 넘어가는 화면이 아니다). 자동 회전을 켠다.
  ```sh
  A shell settings put system accelerometer_rotation 1
  disp; echo "$W x $H @ $D"          # 1080 x 2400 @ 420
  snap O1-before
  ```
- **대조 — 회전 입력이 이 환경에서 먹는가**(먼저 한다. 먹지 않으면 아래 통과는 의미가 없다):
  ```sh
  A shell am start -a android.settings.SETTINGS; sleep 2
  A emu rotate; sleep 3; echo "control: $(shotsize)"      # 기대: 2400 1080 (설정 앱은 가로로 돈다)
  A emu rotate; A emu rotate; A emu rotate; sleep 3; echo "control back: $(shotsize)"   # 1080 2400
  reopen; sleep 2                                        # singleTask: 같은 Activity가 앞으로 온다. extra 를 붙인다(전제)
  ```
  `control`이 `2400 1080`이 아니면 「회전 입력이 먹지 않는 환경 — O1은 통과로 세지 않는다」로 적고 멈춘다(설정 앱이 세로 고정이면 다른 가로 허용 앱으로 대조한다).
- **조작**: 앱이 앞에 있는 채로 한 바퀴(네 번).
  ```sh
  mark
  for I in 1 2 3 4; do A emu rotate; sleep 3; echo "rotate $I: $(shotsize)"; done
  lc; snap O1-after; sameproc O1-before O1-after
  ```
- **판정** (모두 맞아야 통과)
  - 네 번 모두 `shotsize`가 `1080 2400`이다(가로 `2400 1080`이 한 번도 없다).
  - ①: `lc`가 `create: 0 destroy: 0 relaunch_resume: 0`이다. ②: `sameproc`이 `SAME process`.
  - ③: `O1-before.png`와 `O1-after.png`가 같은 화면 · 같은 진행이다. 스플래시를 거치지 않았다(본문을 잘라 `cmp`하면 같다 — O2의 크롭).
- **기대 red**: 가로로 돌고 처음 화면으로 돌아간다(`lc`의 `create` · `destroy`가 회전마다 는다).

### O2 — 다크 모드 전환 (AC2)

- **기기 · 준비**: Pixel_8. 학습 화면 도중. `A shell cmd uimode night`가 `Night mode: no`. `snap O2-before`.
- **조작**
  ```sh
  mark
  A shell cmd uimode night yes; sleep 3; A shell cmd uimode night      # Night mode: yes — 변경이 실제로 걸렸는지 먼저 본다
  snap O2-night
  A shell cmd uimode night no; sleep 3; A shell cmd uimode night       # Night mode: no
  snap O2-after
  lc; sameproc O2-before O2-after
  ```
- **판정**
  - `cmd uimode night`가 `yes`였다(걸리지 않았으면 이 항목은 무효다).
  - `lc`가 `create: 0 destroy: 0 relaunch_resume: 0`(야간 켜기 · 끄기 두 번을 건넌 합계다). 같은 화면 · 같은 진행(③).
  - **상태바 아이콘 색 · 앱 배경이 전과 같다.** 상태바 오른쪽 절반(아이콘)과 앱 본문을 잘라 비교한다.
    ```sh
    disp
    for N in O2-before O2-night O2-after; do
      sips -c 100 $((W / 2)) --cropOffset 0 $((W / 2)) "$OUT/$N.png" --out "$OUT/$N-bar.png" >/dev/null
      sips -c $((H - 330)) "$W" --cropOffset 130 0 "$OUT/$N.png" --out "$OUT/$N-body.png" >/dev/null
    done
    cmp "$OUT/O2-before-bar.png" "$OUT/O2-night-bar.png" && echo "bar same"
    cmp "$OUT/O2-before-body.png" "$OUT/O2-night-body.png" && echo "body same"
    ```
    `bar same` · `body same` 두 줄이 다 나오면 통과. 안 나온 쪽은(시계 · 신호 막대 · 배터리 · 문항의 움직임으로 흔들릴 수 있다 — 2026-10-06 실행에서는 본문은 같았고 상태바는 신호 막대의 음영만 달랐다) 두 이미지를 나란히 보고 **아이콘이 밝은색이 됐는가 · 배경이 어두워졌는가**만 판정한다 — 둘 중 하나라도 달라졌으면 실패.
    (앱의 테마는 Light 고정이고 상태바 아이콘 색은 코드가 고정한다 — 계약 §5.2.) 3버튼 바의 시스템 면은 시스템이 그리는 것이라 비교 밖이다.
- **기대 red**: 야간 전환에서 Activity가 다시 서고 처음 화면으로 돌아간다.

### O3 — 화면 크기 변경과 safe area · 3버튼 탭 바 (AC2 · AC3)

- **기기 · 준비**: Pixel_8. `settings get secure navigation_mode`가 `0`(3버튼). **두 화면에서 각각 한다**: (a) 탭 루트(여정 맵, `Journey, selected`), (b) 학습 화면 도중.
  `1080x1920`은 420 dpi에서 최소 너비 411dp로 600dp 미만 그대로다.
- **조작**: 각 화면에서
  ```sh
  V=a                                              # a = 탭 루트, b = 학습 화면. 화면마다 바꿔 한 번씩 돌린다
  disp; snap "O3-$V-before"; echo "lynx: $(lynxbounds) sbar: $(sbar)"
  [ "$V" = a ] && { X=$(( ($(edge Journey 1) + $(edge Journey 3)) / 2 )); echo "pill x: $X"; }   # (a)만 — 알약 가운데 x. 좌우는 API 30에서도 잘리지 않는다
  mark
  A shell wm size 1080x1920; sleep 3
  disp; echo "W=$W H=$H"                           # 1080 / 1920
  echo "size: $(shotsize)"; echo "lynx: $(lynxbounds) sbar: $(sbar)"; echo "app: $(appbounds)"
  snap "O3-$V-small"
  [ "$V" = a ] && near "$(pillbottom "O3-$V-small" "$X")" "$((H - $(px 60)))" "$(px 2)"        # (a)만 — 줄인 상태의 알약 아래 끝
  A shell wm size reset; sleep 3
  disp; echo "lynx: $(lynxbounds) sbar: $(sbar)"; echo "app: $(appbounds)"
  snap "O3-$V-after"
  [ "$V" = a ] && near "$(pillbottom "O3-$V-after" "$X")" "$((H - $(px 60)))" "$(px 2)"        # (a)만 — 복귀 뒤
  lc; sameproc "O3-$V-before" "O3-$V-after"
  ```
- **판정** (420 dpi 숫자. 다른 밀도면 `px`가 환산한다)
  - 재생성 없음: `lc`가 `create: 0 destroy: 0 relaunch_resume: 0`(줄이기 · 되돌리기 두 번의 합계), ③ 같은 화면. **이 `lc` 0은 가드다** — 이 자극은 구현 전 빌드에서도 재생성을 일으키지 않았으므로 「같은 화면 · 같은 진행」의 증거로 세지 않는다(「자극의 구분력」).
  - **창을 채운다**: 줄인 상태에서 `shotsize`가 `1080 1920`이고 `lynxbounds`가 `0,0-1080,1920`(LynxView = 창). 복귀 뒤 `0,0-1080,2400`. 줄인 상태의 스크린샷에서
    **아래 빈 띠(앱이 안 그려진 검은 줄)도 아래로 넘친 셸도 없다**(육안). API 37에서는 `appbounds`도 `1080 1920` → `1080 2400`으로 같은 것을 말한다(2026-10-06 실행은 이 값으로 판정했다).
    **API 30에서는 `appbounds`를 쓰지 않는다** — 세로 값이 앱 영역(`H − 268px`)에서 잘려 `1080 1652`처럼 읽힌다. 도구의 한계이고 앱 루트는 화면 전체다(「관찰 도구」).
  - **(a) 3버튼 탭 바**: 선택된 알약의 아래 끝이 `H - 60dp`(= `$((H - $(px 60)))`, 1920에서 1763)와 ±2dp(±5px) 이내 — 위 두 `near`가 `PASS`. 복귀 뒤는 H = 2400(2243).
    판정은 **스크린샷 픽셀**(`pillbottom`)이다. API 37에서는 `edge "Journey" 4`가 같은 값을 낸다(`near "$(edge Journey 4)" "$((H - $(px 60)))" "$(px 2)"`); API 30에서는 `edge … 4`가 잘린 값을 내므로 쓰지 않는다.
    알약은 시스템 버튼 위에 있다(스크린샷에서 겹침 0 — [Android 내비게이션 바와 하단 탭 바](android-navigation-insets.md) N1의 기준).
    알약 아래 끝과 시스템 바 위 끝(`H - 48dp`) 사이가 12dp(31px) 안팎으로 보인다.
  - **위 여백 = 상태바**: 헤더가 상태바 밑에서 시작한다(스크린샷). 줄이기 전 · 줄인 뒤 · 복귀 뒤 세 시점에서 **「헤더 노드의 위 끝(`edge <헤더 content-desc> 2`) − 상태바 inset(`sbar`)」이 같다**(±2dp).
    헤더의 위 끝 자체는 같지 않다 — 상태바 inset이 `wm size`에 따라 달라진다(2026-10-06 Pixel_8: inset 132 → 106 → 132px, 헤더 칩 위 끝 164 → 138 → 164, 차이는 세 시점 모두 32px).
  - **(b) 학습 화면**: 탭 바가 없다(`X` · `pillbottom` 줄은 `V=b`에서 스스로 건너뛴다). 하단 주 버튼의 아래 끝이 `H - 48dp`(1920에서 1794) 이하로 내려가지 않는다 — 아래 48dp는 시스템 바 높이만큼의 셸 여백이다(N6의 기준).
    문항 문구가 dump에 안 나오므로 버튼의 아래 끝은 스크린샷에서 잰다.
- **기대 red**: API 37에서 높이만 바꾼 `wm size`는 구현 전에도 재생성을 일으키지 않는다(「자극의 구분력」) — 이 항목의 red는 재생성이 아니라 **배치**다. (구현에 `onConfigurationChanged`만 있고 safe area를 다시 계산하지 않으면 줄인 뒤 탭 바 위치가 낡는다 — 그것도 이 판정에서 실패다.)

### O4 — 큰 화면 흉내: 가로 (요구 3 · AC3)

최소 너비 600dp 이상의 큰 화면에서는 API 36 이상 · targetSdk 36에서 방향 고정이 **무시**돼 가로가 된다고 플랫폼 문서가 말한다. 큰 화면 AVD가 없어 휴대폰 AVD에서 흉내 낸다 —
`wm set-ignore-orientation-request true`를 **걸어서** 만든 가로이므로, 이 항목의 통과는 「가로가 됐을 때 G1 ~ G5가 선다」의 증거이지 「플랫폼이 스스로 고정을 무시한다」의 증거가 아니다.

- **기기 · 준비**: Pixel_8(API 37). 3버튼. 학습 화면 도중. `snap O4-before`(1080x2400). 흉내를 건다.
  ```sh
  mark
  A shell settings put system accelerometer_rotation 1
  A shell wm size 1600x2560                               # 420 dpi에서 최소 너비 609dp
  A shell wm set-ignore-orientation-request true
  sleep 3; disp; echo "$W x $H @ $D"; echo "portrait: $(shotsize)"    # 1600 2560
  snap O4-big-portrait
  ```
- **게이트 — 가로가 실제로 됐는가**(먼저 적는다)
  ```sh
  A emu rotate; sleep 3; echo "landscape: $(shotsize)"    # 기대 2560 1600
  A shell dumpsys window displays | tr -d '\r' | grep -m1 -o ' \(port\|land\) '     # land (형식이 달라 비면 shotsize 만 쓴다)
  ```
  `shotsize`가 `2560 1600`이면 가로가 된 것이다 — 판정으로 넘어간다. **그렇지 않으면 「흉내 불가」로 적고 이 항목을 통과로 세지 않는다**(`wm size` · 재정의 · 회전 입력 중 무엇이 먹지 않았는지 출력을 붙인다).
  **O6(분할 화면)으로 대신하지 않는다** — 분할 화면은 방향 고정이 풀리는 경로가 아니다(O6). 가로가 되지 않으면 큰 화면의 보장은 「미증명」으로 적고 큰 화면 AVD 생성을 요청한다.
- **판정(가로가 된 경우)** — 가로에서 W = 2560, H = 1600으로 바꿔 읽는다(`wm size`는 회전과 무관하게 `1600x2560`이다)
  - **G1 재생성 없음**: `snap O4-land` 뒤 `lc`가 `create: 0 destroy: 0 relaunch_resume: 0`(크게 만들기 · 회전을 건넌 합계). ③ 같은 화면 · 같은 진행.
  - **G2 창을 채운다**: `lynxbounds`가 `0,0-2560,1600`(API 37이라 `appbounds`의 `2560 1600`도 같은 것을 말한다 — 2026-10-06 실행은 이 값으로 판정했다). 스크린샷에 빈 띠 · 창 밖으로 밀린 셸이 없다.
  - **G3 시스템 바에 가리지 않는다**: 스크린샷에서 `×` 나가기 버튼 · 하단 주 버튼 · 헤더가 상태바 띠(위)와 내비게이션 바 띠(3버튼이면 아래 `48dp` = 126px)와 겹치지 않는다.
    3버튼 바가 옆에 서면 그 띠와 겹치는지로 읽고 **관찰로 적는다**(범위 밖 — ADR-0044).
  - **G4 죽지 않는다**: 가로에서 뒤로가기를 누른다 — `A shell input keyevent KEYCODE_BACK; sleep 1.5` 뒤 `texts`에 `Leave` · `Keep going`이 있다(나가기 확인창). 앱이 앞에 남는다(`front`가 `MainActivity`).
    다시 뒤로가기 → 확인창이 닫히고 같은 문항. `A shell pidof libitum.duru.android`가 같고 `A shell logcat -d -b crash | grep -c libitum.duru.android`가 0, `A shell logcat -d | grep -c 'ANR in libitum.duru.android'`가 0.
  - **G5 세로로 돌아오면 원래 모습**:
    ```sh
    A emu rotate; A emu rotate; A emu rotate; sleep 3; echo "back: $(shotsize)"      # 1600 2560
    A shell wm set-ignore-orientation-request reset; A shell wm size reset; sleep 3
    echo "reset: $(shotsize)"; snap O4-after; lc; sameproc O4-before O4-after       # 1080 2400, 0 0 0
    ```
    `O4-before.png`와 `O4-after.png`가 같은 화면 · 같은 모습이고 `lc`가 여전히 `create: 0 destroy: 0 relaunch_resume: 0`이다. 본문 `cmp`가 다르면 나란히 본다 — 재생 버튼 가장자리의 안티앨리어싱 몇 픽셀은 다를 수 있다.
  - **관찰만(판정 아님)**: 가로에서 어디가 잘리는지(아래 · 오른쪽), 열린 말풍선이 있었다면 위치가 낡았는지. `O4-land.png`에 적어 둔다.
    2026-10-06 실행의 관찰: 3버튼 바는 옆이 아니라 아래에 태스크바 모양으로 섰다. 「1 of 1 question completed」 알약이 하단 주 버튼에 가려졌고, 오른쪽 약 183px이 비어 있었다(상태바 아이콘도 같은 만큼 안쪽). 원인은 가리지 않았다.
- **끝에서**: `wm set-ignore-orientation-request reset` · `wm size reset` · `accelerometer_rotation` 복원(아래 「끝난 뒤 되돌리기」).
- **기대 red**: 가로로 돌고 재생성돼 처음 화면으로 돌아간다.

### O5 — 시스템 언어 변경 (AC2)

- **기기 · 준비**: Pixel_8. 학습 화면 도중(어느 문항인지 스크린샷으로 확인). `snap O5-before`. 시작 언어를 적는다: `A shell getprop persist.sys.locale`(**비어 있을 수 있다** — 그대로 적는다) · `A shell settings get system system_locales`.
- **조작**: `cmd locale set-app-locales`(앱별 언어)가 **아니라 시스템 언어**를 바꾼다. 설정 앱에서 한다 — 앱을 그대로 두고 설정을 연다.
  ```sh
  mark; A shell am start -a android.settings.LOCALE_SETTINGS; sleep 2; shot O5-settings
  # 아래 길을 따라 언어를 추가해 목록 맨 위로 올리고 확인 대화상자의 「Change」까지 누른다
  A shell getprop persist.sys.locale          # 기록값과 달라졌는가(예: es-US)
  reopen; sleep 3
  snap O5-after; lc; sameproc O5-before O5-after
  ```
  2026-10-06 Pixel_8 · API 37 · 1080x2400에서 지난 길(좌표는 그 이미지의 값이다 — **매번 스크린샷으로 확인한다**):
  「Add a language」 → 제안 목록의 「Español (Estados Unidos)」 → 목록 둘째 항목(추가된 언어)의 「Edit system language list」 (933,933) → 「Move up」 (749,1090) →
  **「Change system language to …?」의 「Change」 (841,1490).** 마지막 확인을 누르지 않으면 목록 순서만 `en-US,es-US`로 남고 시스템 언어는 바뀌지 않는다 — 그 시도는 판정에 쓰지 않는다.
- **판정**
  - `persist.sys.locale`이 바뀌었다(`en-US` → `es-US`처럼. 바뀌지 않았으면 이 항목은 닿지 못한 것이다). 설정 앱 자체가 새 언어로 바뀌어 보이는 것도 걸렸다는 단서다.
  - `lc`가 `create: 0 destroy: 0 relaunch_resume: 0`(재생성 없음). 앱 문구는 **저장된 UI 언어 그대로**다 — `diff "$OUT/O5-before.texts" "$OUT/O5-after.texts"`가 비어 있다(시스템 언어가 앱 문구를 바꾸지 않는다).
  - ③ 같은 문항 · 같은 진행(본문 `cmp` 같음).
- **바꾸지 못하면**(설정 UI가 열리지 않거나 이미지에서 언어 추가가 막힌 경우): 「닿지 못함 — 코드 판정(계약 §5.2)」으로 적는다. 통과로 적지 않는다.
- **끝에서**: 설정 앱에서 추가한 언어를 지워 목록을 시작 때와 같게 한다. 같은 실행의 되돌리기 길: 첫째 항목(스페인어)의 「Edit」 (933,689) → 「Quitar」(Remove) (749,1035) → 「Cambiar」 (834,1514) — 설정 앱이 스페인어인 상태다. 이 항목은 셸 한 줄로 되돌릴 수 없다.
  **`persist.sys.locale`은 시작 값으로 돌아가지 않을 수 있다**: 시작 때 빈 값이었다면 목록을 되돌려도 `en-US`가 남는다. 그래서 「`getprop`이 기록값과 같아야 한다」를 기준으로 쓰지 않는다 — **언어 목록**(`system_locales`)이 시작 때와 같은지로 본다.
  마지막 `globals | diff`에 `locale:` 한 줄이 남으면 이 경우인지 확인하고 그렇게 적는다(빈 값으로 되돌리는 방법은 시도하지 않았다).
- **기대 red**: 로캘 변경에서 Activity가 다시 서고 처음 화면으로 돌아간다.

### O6 — 분할 화면 (AC2 · 요구 3)

**분할 화면에서는 방향 고정이 유지된다.** 앱에는 크기 변경만 오고, 앱 영역이 **가로로 넓은 모양**이 되면 시스템이 세로 창을 가운데 세우고 좌우를 비운다(레터박스 — `letterboxReason=FIXED_ORIENTATION`).
세로 고정의 귀결이고 받아들인 동작이다(ADR-0047 D5 · U5). 이 항목은 큰 화면의 가로(O4)를 **대신하지 못한다** — 고정이 풀리는 경로가 아니다.
이 문서의 첫 판은 「방향 고정은 분할 화면에서 창에 적용되지 않는다」고 적었다 — 틀렸다(「절차 정정 기록」).

- **기기 · 준비**: Pixel_8. 학습 화면 도중. `snap O6-before`, 이어서 `mark`. **픽스처는 180초에 끝난다 — 아래 좌표를 미리 정해 두고 진입한다**(첫 시도는 조작 도중 픽스처가 끝나 버렸다).
- **조작** (좌표는 2026-10-06 Pixel_8 · API 37 · 1080x2400의 값이다 — 스크린샷으로 확인한다)
  1. `A shell input keyevent KEYCODE_APP_SWITCH`로 최근 앱을 연다 → 앱 카드의 머리글(아이콘) (360,310) → 「Split screen」 (420,590 — **예시일 뿐이다.** 다른 실행에서는 같은 메뉴 항목이 (420,654)였다) → 아래쪽 앱으로 설정 앱 카드 (540,1200).
  2. 분할이 서면 `sleep 3; snap O6-split; echo "lynx: $(lynxbounds)"; lc`. 분할선(스크린샷의 두꺼운 가로 막대)을 `A shell input swipe 540 <선 y> 540 <새 y> 600`으로 끈다.
     **분할선은 끌 때마다 자리가 바뀐다 — 다음 끌기는 직전의 목표 y에서 시작한다**(처음 값 하나로 둘째 끌기를 하면 빗나간다).
     **세 위치**에서 각각 `sleep 2; snap O6-drag-<n>; echo "lynx: $(lynxbounds)"; lc`: 앱 영역이 세로 모양인 두 곳(예: 높이 약 1187 · 1551)과 **가로 모양인 한 곳**(분할선 y≈800 — 영역 약 1080x823).
     가로 모양인 곳에서는 `A shell dumpsys activity activities | tr -d '\r' | grep -E "letterboxReason|areBoundsLetterboxed=true"`도 남긴다
     (`-m`으로 줄 수를 자르지 않는다 — 앞쪽 줄은 다른 Activity 레코드의 것이라 `letterboxReason`까지 가지 못한다. `MainActivity` 레코드의 `areBoundsLetterboxed=true` · `letterboxReason=FIXED_ORIENTATION`이 나와야 한다).
     이어서 레터박스 안에 **보이는** 조작부 하나를 누른다(예: 헤더의 닫기 → 나가기 확인창 → `Keep going`) — `shot O6-letterbox-tap`.
  3. 분할선을 **아래 끝까지** 끌어 앱만 남긴다(전체 화면 복귀). `sleep 3; snap O6-after; echo "lynx: $(lynxbounds)"; lc; sameproc O6-before O6-after`.
  - **분할 중에는 `appbounds`가 `0 0`을 낸다 — 쓰지 않는다.** 판정은 `lynxbounds`와 스크린샷이다.
- **판정**
  - 모든 시점에서 `lc`가 `create: 0 destroy: 0 relaunch_resume: 0`(재생성 없음 — `mark`는 처음 한 번뿐이라 합계다). ③ 같은 화면이 새 창 크기로 다시 배치됐다.
  - **세로 모양 영역: 창을 채운다.** `lynxbounds`가 `0,0-1080,<영역 높이>`이고 스크린샷에서 앱의 아래 끝이 분할선과 맞닿는다(±2dp). 영역 안에 빈 띠가 없다.
  - **가로 모양 영역: 레터박스를 허용한다.** 좌우에 빈 띠가 서도 실패가 아니다(1080x823에서 창 `Rect(133,0-948,823)`, `lynxbounds 0,0-815,823` — 좌우 133px씩).
    그때 판정하는 것은 셋이다: `letterboxReason=FIXED_ORIENTATION`(다른 이유의 레터박스가 아니다) · **레터박스 안에 보이는 조작부의 탭이 듣는다** · `lc` 0.
    가로 모양 영역에서 레터박스 없이 가로로 채워졌다면 그것도 적는다 — 고정이 풀린 것이고 계약이 예상한 동작이 아니다.
  - **관찰로만 적는 것(판정 아님)**: 창 아래로 잘린 조작부(무엇이 · 어느 y부터), 스크롤로 닿는지(스와이프해 보고 `uiautomator dump`에 `scrollable="true"`인 앱 노드가 있는지), 확인창 · 헤더가 상태바 쪽으로 가려지는지.
    2026-10-06: 높이 823에서 듣기 문항의 카드 위쪽(y ≈ 660)부터 창 밖 — 답 버튼 · 재생 버튼이 보이지 않고, 스와이프 두 가지에 화면이 변하지 않았으며 `scrollable` 노드가 없었다. 확인창 제목이 일부 가려졌다.
    기준선 `47600f41`도 같은 높이에서 같은 자리부터 잘렸다(회귀가 아니다).
  - **복귀 뒤 원래 모습**: `lynxbounds`가 `0,0-1080,2400`, `O6-before.png`와 `O6-after.png`가 같은 화면 · 같은 진행, 같은 pid, `texts` 같음. **전체 `cmp`로 판정하지 않는다** — 상태바의 시계로 늘 다르고, 상태바를 뺀 크롭도 제스처 바의 몇 행이 다르다.
    두 장을 나란히 눈으로 보거나 행 단위로 견준다(2026-10-06: 다른 행 38개가 전부 상태바 시계 대역 32행과 제스처 바 대역 6행이었고 본문은 0).
- **분할 화면에 못 들어가면**(이미지가 막거나 앱이 분할을 거부): 「닿지 못함」으로 적고 통과로 세지 않는다. 앱 쪽 원인이면(분할 진입 직후 크래시 등) logcat을 붙여 실패로 적는다.
- **기대 red**: 분할 진입 · 분할선 이동 · 복귀마다 재생성돼 처음 화면(맵 맨 위)으로 돌아간다. 레터박스는 없다(가로 폭을 전부 쓴다). **기준선 `47600f41`로 같은 조작을 돌려 관찰했다**(2026-10-06 — 매번 `create 1 destroy 1 relaunch_resume 1`).

### O7 — 가드: 글꼴 크기 · 디스플레이 크기는 다시 선다 (계약 §5.2)

재생성을 **받아들인** 두 값(`fontScale` · `density`)이 지금처럼 다시 서는지를 본다. 이 항목은 통과가 「바뀐다」이다.

- **기기 · 준비**: Pixel_8. 학습 화면 도중(또는 맵). `snap O7-before`. 이 항목은 **다른 Pixel_8 항목 뒤에 한다**(밀도 재정의가 끝에 남지 않게 되돌린다).
- **조작 A — 글꼴 크기**
  ```sh
  mark; A shell settings put system font_scale 1.3; sleep 5
  A shell settings get system font_scale          # 1.3
  snap O7-font
  until texts | grep -q 'Journey, selected'; do sleep 2; done       # 처음 화면(맵)에서 다시 선다 — 상한은 사람이 본다(20초 넘으면 중단)
  lc                                              # create: 1 destroy: 1 relaunch_resume: 1
  A shell settings put system font_scale 1.0; sleep 5
  ```
- **조작 B — 디스플레이 크기**
  ```sh
  mark; A shell wm density 480; sleep 5
  A shell wm density                              # Override density: 480
  snap O7-density
  disp; near "$(( $(edge Journey 3) - $(edge Journey 1) ))" "$(px 64)" 3      # 선택된 알약의 폭 = 64dp = 192px
  lc                                              # create: 1 destroy: 1 relaunch_resume: 1
  A shell wm density reset; sleep 5
  ```
- **판정** (A · B 각각)
  - **`lc`가 `create: 1 destroy: 1 relaunch_resume: 1`**: 앱이 다시 섰다. `0 0 0`이면 실패다(재생성을 받아들이기로 한 값이 직접 처리되고 있다).
    ActivityRecord 해시와 pid는 재생성돼도 **그대로다** — 「해시가 바뀐다」로 판정하지 않는다. 이 결과가 다른 항목의 `lc`가 재생성을 잡는다는 양성 대조이기도 하다.
  - 죽지 않는다: `front`가 `MainActivity`, `A shell logcat -d -b crash | grep -c libitum.duru.android`가 0. 다시 서서 처음 화면(스플래시를 지나 맵의 `Journey, selected`)이 선다 — 문항으로 돌아가지 않는다.
  - **로그인 세션이 남는다**: 다시 선 화면이 로그인 화면이 아니라 맵이다(`texts`에 `Journey, selected`).
  - 새 값으로 그려진다: A는 `O7-before.png`와 `O7-font.png`에서 같은 요소의 글자가 커졌다(육안). B는 위 `near`가 `PASS`(알약 폭 192px — 기본 밀도라면 168px).
  - pid는 같아도 달라도 된다(Activity 재생성은 프로세스를 지킨다 — 2026-10-06 실행에서는 같았다. 달라져도 크래시가 없으면 실패가 아니다). 다르면 값을 적는다.
  - `font_scale 1.0` · `wm density reset`으로 되돌릴 때도 한 번씩 재생성된다 — 그것은 세지 않는다.
- **끝에서**: `wm density reset` · `font_scale 1.0`이 맞는지 `globals`로 확인한다.
- **기대**: 구현 전에도 지금도 통과(가드).

### O8 — 구성 변경 중에도 소리가 이어진다 (AC4)

재생성이 없으면 `onStop` · `onDestroy`가 불리지 않아 대사 · 효과음이 끊기지 않는다. 헤드리스에서 소리를 듣지 못하므로 `dumpsys audio`의 플레이어 목록 · 이력과 logcat으로 판정한다.

- **기기 · 준비**: Pixel_8. 학습 화면의 **듣기 문항**(「Listening」 — 재생 버튼을 누르면 대사가 재생된다. [Android 자산 확인](android-assets.md)의 E5와 같은 화면). 진입한 화면이 듣기 문항인지 스크린샷으로 확인한다.
  재생 버튼은 1080x2400에서 (540,1300)이었다(2026-10-06 — 스크린샷으로 확인).
  대사는 `MediaPlayer`(`USAGE_MEDIA` · `CONTENT_TYPE_SPEECH`) 플레이어이고 **1.3 ~ 1.5초면 끝난다.** 그래서 「재생을 확인하고 → 명령을 건다」를 따로 치면 그 사이에 대사가 끝난다 —
  **탭 · 명령 · 플레이어 읽기를 한 번의 `adb shell`에 묶는다.**
  `state:started`는 `dumpsys audio`의 **`AudioPlaybackConfiguration` 줄**에만 찍힌다(`player piid:… event:` 이력 줄에는 `state:`가 없다 — 그 줄로 grep하면 아무것도 안 나온다).
- **조작**: 두 회차. 둘 다 구분력 있는 자극이다(「자극의 구분력」).
  ```sh
  # 회차 1 — 다크 모드 켜기
  mark
  A shell 'input tap 540 1300; sleep 0.3; echo "cmd-at $(date +%T.%N)"; cmd uimode night yes; echo "cmd-done $(date +%T.%N)"; dumpsys audio | grep AudioPlaybackConfiguration | grep state:started; sleep 0.5; dumpsys audio | grep AudioPlaybackConfiguration | grep state:started' | tee "$OUT/O8-r1-shell.log"
  lc
  # 회차 2 — 다크 모드 끄기(회차 1이 켜 둔 상태에서)
  mark
  A shell 'input tap 540 1300; sleep 0.3; echo "cmd-at $(date +%T.%N)"; cmd uimode night no; echo "cmd-done $(date +%T.%N)"; dumpsys audio | grep AudioPlaybackConfiguration | grep state:started; sleep 0.5; dumpsys audio | grep AudioPlaybackConfiguration | grep state:started' | tee "$OUT/O8-r2-shell.log"
  lc
  A shell dumpsys audio | tr -d '\r' | grep -E "player piid:[0-9]+ event:" | tail -6      # 자연 종료 시각을 본다
  ```
  **API 36 이상에서는 같은 형태로 내비게이션 모드 전환도 본다**: `cmd uimode night yes` 자리에 `cmd overlay enable-exclusive --category com.android.internal.systemui.navbar.gestural`(이어 `…threebutton`). 끝나면 `restore_nav`.
- **판정**
  - 명령 **뒤**의 두 읽기(직후와 +0.5초)에 같은 `piid:<N>`의 `state:started` 줄이 있다(재생이 이어진다 — 재생성이었다면 플레이어가 해제돼 그 `piid`가 사라진다).
    줄이 하나도 없으면 「재생 중에 건 명령이 아니다 — 관찰 못 함」이지 통과가 아니다. 다시 한다.
  - 그 `piid`의 `event:stopped`가 **명령 시각이 아니라 재생 시작 약 1.3 ~ 1.5초 뒤**(자연 종료)에 있다. `cmd-at` 시각과 겹치는 `stopped`는 끊긴 것이다.
  - `lc`가 `create: 0 destroy: 0 relaunch_resume: 0`(재생성 없음).
  - **효과음**: 변경이 끝난 뒤 `A logcat -c`; 화면의 버튼 하나를 누른다; `A logcat -d | tr -d '\r' | grep -c 'SoundEffectsModule.play\.'`가 1 이상이고 `grep -c SoundEffectsModulefailed`가 0. 어느 버튼이든 된다 — 누른 좌표가 겨냥한 버튼이 아니어도 효과음 호출이 찍히면 이 판정은 선다.
  - **한계**: 「구성 변경이 Activity에 전달된 순간」을 타임스탬프로 잡지는 않는다. 명령 직후와 +0.5초의 표본으로 본다.
  끝나면 `cmd uimode night no`로 되돌린다.
- **`dumpsys audio`에 이력이 안 나오는 이미지**(API 30은 `state:idle` 목록뿐이었다): 이 항목은 Pixel_8 전용이다. 이력 줄이 없으면 「소리 판정 불가」로 적고 logcat의 `AudioPlayback` 줄만 붙인다.
- **기대 red**: 변경 직후 재생이 끊기고(플레이어 해제) 효과음이 한 번 늦게 난다.

### O9 — 소셜 로그인 왕복 중 구성 변경 (AC4)

Custom Tab이 떠 있는 동안 구성 변경이 오면(구현 전에는) `MainActivity`가 재생성돼 **인증 콜백이 사라질 수 있다**(계약 §2). 모의 OAuth([소셜 로그인 확인](android-social-login.md)의 A5)로 본다.

- **기기 · 준비**: Pixel_8. 모의 값 번들 · debug 앱 · 번들 서버(위 「빌드」). 새로 시작한다.
  ```sh
  A shell pm clear libitum.duru.android
  A shell am start -n libitum.duru.android/com.libitum.host.MainActivity --es bundle-url http://10.0.2.2:18790/main.lynx.bundle
  # 온보딩: 「Welcome! Are you looking for anything?」 → Next → Next → Get started → 로그인 화면(위치는 스크린샷으로)
  ```
  로그인 화면이 서면 `snap O9-login`. **「Connect with Google」**을 눌러 Custom Tab을 연다(`tapdesc "Connect with Google"` — 버튼 이름은 「Sign in with Google」이 아니다. Apple만 「Sign in with Apple」이다) — `texts`가 아니라 브라우저 쪽이므로 `A shell uiautomator dump`의 `example.invalid`로 Custom Tab이 떴는지 확인한다.
- **조작**(두 회차 중 하나 이상, 가능하면 둘 다)
  - **회차 1 — 다크 모드 전환**: Custom Tab이 뜬 동안 `mark; A shell cmd uimode night yes; sleep 3; A shell cmd uimode night`(`Night mode: yes` 확인) `; lc`. 딥링크 콜백을 가르는 회차다 — `wm size`를 쓰지 않는다(구분력이 없다).
  - **회차 2 — 큰 화면 가로**: O4의 흉내(`wm size 1600x2560` + `wm set-ignore-orientation-request true` + 자동 회전 + `A emu rotate`)를 Custom Tab이 뜬 동안 건다(걸기 직전에 `mark`). 가로가 되지 않으면 이 회차는 「흉내 불가」다.
  이어서 모의 콜백을 연다.
  ```sh
  state > "$OUT/O9-opened.state"
  A shell am start -W -a android.intent.action.VIEW -d "duru://auth-callback?code=fake" libitum.duru.android
  until texts | grep -q "Couldn't connect"; do sleep 2; done      # 상한은 사람이 본다(30초 넘으면 중단 — 아래 판정은 실패)
  snap O9-after; lc; sameproc O9-opened O9-after
  ```
  회차가 끝나면 `cmd uimode night no`(회차 2는 `wm size reset` · `wm set-ignore-orientation-request reset` · 회전 복원)로 되돌리고 `pm clear`로 다시 시작해 다음 회차를 한다. 되돌릴 때의 `lc`도 0이어야 한다.
- **판정**
  - 콜백 뒤 `texts`에 **`Couldn't connect. Check your connection and try again.`**가 나온다(콜백이 받아져 코드 교환을 시도했다는 증거다 — 콜백이 사라졌다면 이 문구가 서지 않는다).
  - `lc`가 `create: 0 destroy: 0 relaunch_resume: 0`: Custom Tab 사이의 구성 변경과 콜백에서 `MainActivity`가 다시 서지 않았다(`singleTask` · `onNewIntent`).
  - 앱이 앞에 있다(`front`가 `MainActivity`). 로그인 화면이다(스플래시 · 온보딩으로 돌아가지 않았다). 회차 2는 가로가 실제로 됐는지(`shotsize` `2560 1600`) 먼저 적고 `lynxbounds`가 `0,0-2560,1600`인지 본다.
- **모의 OAuth를 준비하지 못하면**(번들 서버 · Custom Tab을 못 띄운 경우): 「닿지 못함 — 코드 판정(계약 §2)」으로 적는다. 통과로 적지 않는다.
- **기대 red**: [추론] 재생성으로 인증 콜백이 사라져 오류 문구가 서지 않거나 로그인이 처음부터 다시 선다.

### O10 — 구성 변경 뒤 뒤로가기 · 내비게이션 모드 전환 (AC3 · AC4)

구성 변경을 건넌 뒤에도 뒤로가기가 **「JS 준비 완료」 경로**를 탄다는 것(`finish()`로 끝나지 않는다)과, 내비게이션 모드 전환 뒤 탭 바가 새 모드의 자리에 선다는 것 — **API 36 이상에서는 재생성 없이, API 35 이하에서는 재생성을 거쳐** — 을 본다.
뒤로가기의 기준은 [Android 시스템 뒤로가기](android-system-back.md)의 B2 · B5 · B6이고 모드 전환은 [Android 내비게이션 바와 하단 탭 바](android-navigation-insets.md)의 N9다.

- **기기 · 준비**: Pixel_8. 3버튼(`navigation_mode` `0`).
- **(a) 학습 화면**: 학습 화면 도중에 O2의 변경(`cmd uimode night yes; sleep 3; cmd uimode night no; sleep 3`)을 건넌 뒤 뒤로가기.
  ```sh
  snap O10-a-before; mark
  A shell cmd uimode night yes; sleep 3; A shell cmd uimode night no; sleep 3
  A shell input keyevent KEYCODE_BACK; sleep 1.5
  texts | grep -E 'Leave|Keep going'; front; snap O10-a-back; lc
  ```
  **판정**: `Leave` · `Keep going`이 읽힌다(나가기 확인창). `front`가 `MainActivity`(남음). 같은 Activity(`lc`가 `create: 0 destroy: 0 relaunch_resume: 0`). 한 번 더 뒤로가기 → 확인창이 닫히고 같은 화면(스크린샷 비교).
- **(b) 탭 루트**: 맵으로 돌아와(또는 새로 시작) **야간 왕복**(`cmd uimode night yes; sleep 3; cmd uimode night no; sleep 3`)을 건넌 뒤 뒤로가기. `wm size`를 쓰지 않는다(구분력이 없다).
  ```sh
  state > "$OUT/O10-b-before.state"; echo "pid: $(A shell pidof libitum.duru.android | tr -d '\r')"; mark
  A shell cmd uimode night yes; sleep 3; A shell cmd uimode night no; sleep 3
  A shell input keyevent KEYCODE_BACK; sleep 2
  front; A shell dumpsys activity activities | grep -c "libitum.duru.android/com.libitum.host.MainActivity"; A shell pidof libitum.duru.android
  reopen; sleep 0.5; snap O10-b-reopen
  sleep 2; texts | grep 'Journey, selected'; lc
  ```
  **판정**: `front`가 `MainActivity`가 **아니다**(런처일 수도, 앞서 열어 둔 다른 앱 — 예: O1의 대조에서 연 설정 앱 — 일 수도 있다), `grep -c`가 **1 이상**(기록이 남음 = 떠남 `moveTaskToBack`), pid가 전과 같다. `finish()`로 **끝나지 않았다**(`grep -c`가 0이면 실패 — 구성 변경 뒤 뒤로가기가 「JS 미준비」 경로로 갔다는 뜻이다).
  다시 열면 스플래시 없이 맵이 선다(`Journey, selected`가 2초 안에 읽힌다). 3버튼 모드의 0.5초 프레임이 빈 흰 창일 수 있다 — 2초 뒤 화면으로 판정한다. **[ADR-0049](../adr/0049-android-launch-appearance.md) 뒤에는 창 배경이 주황이라 이 프레임이 흰색이 아니라 글자 없는 주황 한 면일 수 있다(추론 — 그 변경 뒤 이 프레임을 다시 재지 않았다). 워드마크 없는 주황 한 면은 스플래시 UI가 아니다.** `lc`가 `create: 0 destroy: 0 relaunch_resume: 0`이다(다시 여는 것은 `onNewIntent`다).
- **(c) 모드 전환** — **기준이 API에 따라 다르다.** 내비게이션 모드 전환은 오버레이의 경로 집합을 바꾸고 그 구성 변경이 `assetsPaths`다. `MainActivity`가 그것을 `configChanges`에 선언해 직접 처리한다(compileSdk 36부터 선언할 수 있다 — [ADR-0047](../adr/0047-android-orientation-config-changes.md) D2).
  **API 36 이상에서는 재생성되지 않고, API 35 이하에서는 선언이 무시되어 재생성된다.**
  전제(API 35 이하 · debug): 앱은 픽스처가 띄운 인텐트 그대로다. 그 전에 extra 없는 `am start`를 했다면 `reopen`을 한 번 해 둔다(안 하면 재생성 뒤 글자 없는 주황 한 면이다 — 「전제」). 맵에서, **맵을 한 번 스크롤해 둔 채**:
  ```sh
  disp; A shell cmd overlay list | grep navbar                       # 시작 [x] 목록을 결과에 적는다
  X=$(( ($(edge Journey 1) + $(edge Journey 3)) / 2 ))               # 알약 가운데 x
  shot O10-c-3btn; near "$(pillbottom O10-c-3btn "$X")" "$((H - $(px 60)))" "$(px 2)"            # 3버튼: 아래 끝 = H - 60dp (2243)
  mark; navmode gestural; sleep 3
  A shell settings get secure navigation_mode                        # 2
  until texts | grep -q 'Journey, selected'; do sleep 2; done        # 맵이 서 있다(API 35 이하는 재생성 뒤 다시 선다) — 상한은 사람이 본다(20초 넘으면 중단 = 실패)
  lc; shot O10-c-gesture; near "$(pillbottom O10-c-gesture "$X")" "$((H - $(px 12)))" "$(px 2)"  # 제스처: H - 12dp (2369)
  mark; navmode threebutton; sleep 3
  A shell settings get secure navigation_mode                        # 0
  until texts | grep -q 'Journey, selected'; do sleep 2; done
  lc; shot O10-c-3btn2; near "$(pillbottom O10-c-3btn2 "$X")" "$((H - $(px 60)))" "$(px 2)"
  front; A shell logcat -d -b crash | grep -c libitum.duru.android
  ```
  **판정 — 공통**
  - 모드가 `2` → `0`으로 실제로 바뀌었고 전환 뒤 한 오버레이만 `[x]`다(바뀌지 않았으면 이 항목은 무효다).
  - **새 모드의 탭 바 위치**: 세 `near`가 `PASS` — 알약 아래 끝 `H - 60dp` → `H - 12dp` → `H - 60dp`(420 dpi · 2400에서 2243 → 2369 → 2243, 440 dpi · 2340에서 2175 → 2307 → 2175, ±2dp). 스크린샷 픽셀이 판정이다.
  - `front`가 `MainActivity`, crash 0.
  **판정 — API 36 이상(Pixel_8 · API 37)**
  - **`lc`가 전환마다 `create: 0 destroy: 0 relaunch_resume: 0`.** 1이 나오면 실패다 — `assetsPaths`가 매니페스트에서 빠졌거나 듣지 않는다.
  - **화면 상태가 남는다**: 스크롤해 둔 맵 위치가 그대로다(세 스크린샷의 본문 크롭이 탭 바 영역을 빼고 같다). 스플래시를 거치지 않는다.
  - 이 자극은 이 API에서 구분력이 있다 — 선언 전 빌드는 같은 전환에 `create: 1 destroy: 1 relaunch_resume: 1`이었고 스플래시부터 다시 섰다.
  - **맵 밖에서도 본다**(같은 명령, 화면만 바꿔): 학습 화면 도중(같은 문항 · `lc` 0), 학습 화면의 하단 주 버튼(버튼 아래 끝이 시스템 바 위 끝을 넘지 않는다 — 3버튼에서 버튼 2211 · 바 2274, 제스처에서 버튼 2274 · 바 2337이었다), 전환 뒤 BACK(O10 (a)의 판정), 대사 재생 중(O8).
  **판정 — API 35 이하(R6_API30 · API 30)**
  - **재생성을 허용한다.** `lc`는 판정이 아니라 기록이다 — 전환마다 `create: 1 destroy: 1 relaunch_resume: 0`이 기대되는 값이다(API 30은 서버 쪽 relaunch 이벤트 없이 앱 프로세스 안에서 바로 다시 선다).
  - **재생성 뒤 정상 화면**: 전환마다 맵(`Journey, selected`)이 다시 선다. 글자 없는 주황 한 면(번들을 읽지 못한 화면 — 「전제」) · 로그인 화면 · 멈춘 스플래시가 아니다.
  - API 31 ~ 35에서는 어느 쪽 기준이 맞는지 **모른다**(재지 않았다) — 그 기기에서 돌리면 `lc`를 적고 ADR-0047에 알린다.
  끝나면 `restore_nav`로 시작 때의 모드와 `[x]` 목록으로 되돌린다(「끝난 뒤 되돌리기」).
  이 항목의 기준은 두 번 바뀌었다 — 「재생성 없음」(첫 판, 측정 조건이 만든 착오) → 「재생성 허용」(「선언할 수 없다」는 틀린 근거) → 지금(API별). 「절차 정정 기록」.
- **기대 red**: (a) 확인창 대신 앱이 `finish()`로 끝난다(재생성으로 뒤로가기 준비 상태가 사라져 「JS 미준비」 경로). (b) 같다. (c)는 API 36 이상에서 전환마다 재생성돼 처음 화면부터 다시 선다(`assetsPaths` 선언 전 빌드에서 확인). API 35 이하에서는 구현 전후가 같다 — 가드다.

### O11 — TalkBack 포커스와 두 번 탭 (계약 §11)

TalkBack이 있는 Google Play 시스템 이미지가 필요하다(`A shell pm path com.google.android.marvin.talkback`이 경로를 낸다). 없으면 **미실행**이다(통과가 아니다).

**이 항목의 터치는 `adb shell input`으로 하지 않는다.** `input`이 주입한 이벤트는 접근성 입력 필터를 건너뛰어 앱으로 바로 간다 — TalkBack 포커스는 움직이지 않고 탭은 버튼을 그대로 누른다.
2026-10-06의 실측: `input swipe` 오른쪽 스와이프 6회 · `input tap` 2회 · `keycombination ALT_LEFT DPAD_RIGHT` 모두 포커스 테두리가 움직이지 않았고, e2e 실행에서는 「포커스를 두려던 탭」이 답 버튼을 눌러 버렸다.
대신 **에뮬레이터 콘솔의 하드웨어 수준 터치**(`adb emu event send …`)를 쓴다 — 입력 필터를 지나 TalkBack이 받는다.
`uiautomator dump`도 포커스 판독에 쓰지 않는다: TalkBack이 켜져 있어도 Lynx의 가상 노드를 내지 않고(LynxView 한 노드), 실행 직후 `Accessibility Focused Window Id`가 잠시 `-1`이 된다.
그래서 이 항목에서는 `texts` · `dumpb` · `snap`을 부르지 않는다. 포커스는 **스크린샷의 TalkBack 테두리**와 `dumpsys accessibility`의 창 id로 읽는다.

```sh
# 좌표는 현재 디스플레이의 px (disp 가 읽은 W · H 로 콘솔 좌표 0 ~ 32767 로 환산한다). $3 은 추적 id
hwdown() {
  A emu event send EV_ABS:ABS_MT_SLOT:0 "EV_ABS:ABS_MT_TRACKING_ID:$3" EV_ABS:ABS_MT_PRESSURE:512 EV_ABS:ABS_MT_TOUCH_MAJOR:5 \
    "EV_ABS:ABS_MT_POSITION_X:$(( $1 * 32767 / W ))" "EV_ABS:ABS_MT_POSITION_Y:$(( $2 * 32767 / H ))" EV_SYN:0:0 >/dev/null
}
hwup() { A emu event send EV_ABS:ABS_MT_PRESSURE:0 EV_ABS:ABS_MT_TRACKING_ID:-1 EV_SYN:0:0 >/dev/null; }
# 터치 탐색 — 그 자리의 요소에 TalkBack 포커스를 둔다(누르지 않는다): explore <x> <y>
explore() { hwdown "$1" "$2" 7; sleep 0.6; hwup; sleep 2; }
# 두 번 탭 — 화면 어디를 눌러도 포커스 항목이 활성화된다. 빈 곳을 누른다: dtap <x> <y>
dtap() { hwdown "$1" "$2" 9; hwup; hwdown "$1" "$2" 9; hwup; sleep 3; }
# 접근성 포커스가 있는 창 id
af() { A shell dumpsys accessibility | tr -d '\r' | grep -E "Accessibility Focused Window Id|Top Focused Window Id" | tr -s ' ' | tr '\n' ';'; echo; }
# 스크린샷에서 TalkBack 포커스 테두리(밝은 배경에서 RGB 105,198,62 안팎)의 영역. macOS 의 sips 를 쓴다
focusring() {
  python3 - "$1" <<'PY'
import os, struct, subprocess, sys
p = sys.argv[1]
b = p[:-4] + ".bmp"
subprocess.run(["sips", "-s", "format", "bmp", p, "--out", b], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
d = open(b, "rb").read()
os.remove(b)
off = struct.unpack_from("<I", d, 10)[0]
w, h = struct.unpack_from("<ii", d, 18)
bpp = struct.unpack_from("<H", d, 28)[0] // 8
flip = h > 0
h = abs(h)
row = (w * bpp + 3) // 4 * 4
xs, ys = [], []
for y in range(0, h, 2):
    base = off + ((h - 1 - y) if flip else y) * row
    for x in range(0, w, 2):
        bl, g, r = d[base + x * bpp], d[base + x * bpp + 1], d[base + x * bpp + 2]
        if abs(r - 100) <= 18 and abs(g - 190) <= 22 and abs(bl - 60) <= 18:
            xs.append(x)
            ys.append(y)
if len(xs) < 150:
    print("focus-ring: none (%d px)" % len(xs))
else:
    print("focus-ring: [%d,%d][%d,%d] (%d px)" % (min(xs), min(ys), max(xs), max(ys), len(xs)))
PY
}
# 한 시점의 포커스: ring O11-before -> 스크린샷 + 테두리 영역 + 창 id
ring() { shot "$1"; echo "$1 $(focusring "$OUT/$1.png") | $(af)"; }
```

- 콘솔은 `EV_SYN:SYN_REPORT:0`을 거부한다 — `EV_SYN:0:0`으로 쓴다.
- `focusring`은 테두리를 **색으로** 찾는다. 어두운 버튼 위에서는 테두리 색이 달라 `none`이 나올 수 있다 — 그때는 스크린샷을 눈으로 읽는다(2026-10-06 접근성 점검의 온보딩 「Next」가 그랬다). 같은 날 최종 검증(API 37)에서는 어두운 「Next」에서도 `[402,2064][678,2210]`(376 px)로 잡혔다 — 이 기기에서 늘 `none`인 것은 아니다.
- **기기 · 준비**: Pixel_8. **픽스처 없이** 온보딩 · 로그인 화면에서 한다(O9의 준비와 같은 시작: `pm clear` 뒤 `--es bundle-url`로 앱을 연다). 픽스처는 180초에 끝나 TalkBack 조작과 겹친다 —
  학습 화면에서 하려면 창이 있는 에뮬레이터에서 손으로 한다(2026-10-06에는 학습 화면에서 하지 않았다). TalkBack을 켠다([Android TalkBack 검증](android-talkback.md)의 「켜기」와 같은 설정).
  ```sh
  A shell pm grant com.google.android.marvin.talkback android.permission.POST_NOTIFICATIONS    # 처음 켤 때 뜨는 「알림 허용」 대화상자가 앱 앞을 가려 입력을 먹는다 — 미리 준다
  A shell settings put secure enabled_accessibility_services com.google.android.marvin.talkback/.TalkBackService
  A shell settings put secure accessibility_enabled 1
  until A shell dumpsys accessibility | grep -q 'Bound services:{Service\[label=TalkBack'; do sleep 1; done    # 상한이 없다 — 붙지 않으면 Ctrl-C
  ```
  스크린샷에서 버튼 하나의 가운데 좌표를 읽고 `disp; explore <x> <y>`로 포커스를 둔다. `ring O11-before` — 테두리가 그 버튼에 서 있어야 한다. `mark`.
- **조작**: 변경 둘을 차례로, 변경마다 `ring`.
  ```sh
  A shell cmd uimode night yes; sleep 3; ring O11-night; lc
  A shell wm size 1080x1920; sleep 3; disp; ring O11-size; lc
  A shell wm size reset; sleep 3; disp; A shell cmd uimode night no; sleep 3; ring O11-after; lc
  ```
  이어서 활성화를 본다: 포커스를 둔 채 변경 하나(`cmd uimode night yes` 또는 `wm size 1080x1920`)를 걸고 `disp; dtap <빈 곳 x> <빈 곳 y>; ring O11-dtap`.
- **판정**
  - 재생성 없음: `lc`가 `create: 0 destroy: 0 relaunch_resume: 0`. `af`의 `Accessibility Focused Window Id`가 전후 같다.
  - **포커스가 같은 요소에 남는다**: `focus-ring`의 영역이 변경 전과 같다. 요소가 움직인 변경(`wm size`)에서는 **포커스 테두리가 요소를 따라간다** — 이동량은 요소마다 다르다(예: 위쪽에 붙은 로그인 화면의 Facebook 버튼은 상태바 inset이 줄어든 만큼 26px, 아래에 붙은 온보딩 「Next」는 화면 높이가 줄어든 만큼 480px — `[402,2064][678,2210]` → `[402,1584][678,1730]`). 숫자가 아니라 같은 요소 위에 있는지로 판정한다. 다른 화면(스플래시)에 가 있거나 `none`이 되면 실패다(어두운 버튼이면 눈으로 확인한 뒤 판정).
  - **두 번 탭이 포커스 항목을 누른다**: 빈 곳을 두 번 탭했는데 포커스가 있던 버튼의 효과가 난다(화면 전환 · 단계 이동). 빈 곳에 한 탭이 효과를 냈다는 것이 터치가 아니라 TalkBack의 활성화(`ACTION_CLICK`)라는 증거다.
  - **양성 대조**: 끝에 `mark; A shell settings put system font_scale 1.3; sleep 5; ring O11-font; lc` — 재생성(`create: 1 destroy: 1 relaunch_resume: 1`)되고 창 id가 바뀌며 포커스가 첫 요소로 돌아간다.
    이 대조가 재생성을 잡아야 위의 「0 · 같음」이 도구의 무감각 때문이 아니다. `font_scale 1.0`으로 되돌린다.
- **TalkBack을 켜지 못하면**: 「미실행 — 사유」로 적는다. 통과로 적지 않는다. 끝나면 TalkBack을 끈다(`settings delete secure enabled_accessibility_services`; `settings put secure accessibility_enabled 0` — 아래 되돌리기).
- **확인되지 않는 것**: 구성 변경 뒤 TalkBack의 **낭독 내용 · 반복 여부**, 스와이프 탐색의 순서, 포커스가 갇혀야 하는 곳(모달 · 시트). 이 항목은 터치 탐색으로 둔 포커스의 유지와 활성화까지만 본다.
  이것을 지키는 자동 테스트는 없다 — 이 수동 항목이 유일한 근거다(ADR-0047의 「확인한 것과 확인하지 못한 것」).

### O12 — API 30에서 O1 · O2 · O3 · O10 (AC1 ~ AC4)

- **기기 · 준비**: `R6_API30`. `ID`를 이 기기의 ID로 바꾸고 `A shell getprop ro.build.version.sdk`가 `30`인지 본다. 시작 전 `globals`를 남긴다. **`wm density` 재정의가 남아 있으면 `wm density reset`한다**(전제 표).
  이 기기는 물리 밀도가 420이 아닐 수 있으므로(이전 실행에서 `Physical density: 440`) `disp`가 읽은 `D`로 `px`가 환산한다 — 아래 숫자는 `420`에서의 값이고 다른 밀도면 식이 맞다.
  설치(`A install -r` 두 APK) · 번들 서버 · 픽스처는 O1 ~ O11과 같다. `POST_NOTIFICATIONS` 권한은 API 33부터라 `fixture`가 건너뛴다.
  API 30은 3버튼이 기본이다 — `settings get secure navigation_mode`가 `0`인지 본다. 이 이미지는 시작 때 threebutton **하나만** `[x]`다(Pixel_8은 둘 다) — `globals`의 `overlays:`로 확인한다.
- **조작 · 판정**: 각 항목의 조작 · 판정 기준 그대로다. 이 기기에서 다른 점만:
  - **O1**: `A emu rotate`가 같이 통한다. 세로 고정과 재생성 없음을 같은 기준으로 본다(대조의 설정 앱은 `2340 1080`으로 돈다).
  - **O2**: `cmd uimode night`는 API 29 이상에 있다. 같다.
  - **O3**: `wm size 1080x1920`이 같이 통한다. 숫자는 `px`로 환산한다(밀도 440이면 `60dp` = 165px → 1920에서 1755, 2340에서 2175).
    **절대 위치는 스크린샷 픽셀(`pillbottom`)로만 판정한다** — `edge … 4` · `appbounds`는 이 버전에서 아래가 `app=` 높이(`H − 268px`)에서 잘려 2072 · `1080 1652`처럼 읽히고, 그 값은 화면 크기와 무관하게 기대보다 늘 103px 작다.
    「창을 채운다」는 `lynxbounds`(`0,0-1080,1920` → `0,0-1080,2340`)와 스크린샷의 빈 띠 없음으로 본다.
    **`sbar`는 이 기기에서 비어 나온다.** 헤더 판정의 대체: `A shell dumpsys window | tr -d '\r' | grep -m1 'mStable='`의 위 끝(145)을 상태바 inset으로 쓰고,
    헤더 아이콘(주황 255,141,40)의 위 끝을 스크린샷 픽셀로 재서 그 차이가 세 시점 같은지 본다(2026-10-06: inset 145 · 아이콘 위 끝 215로 세 시점 모두 같고 차이 70px).
    이 기기에서는 `wm size 1080x1920`에 상태바 inset이 달라지지 않았다(Pixel_8은 132 → 106px로 달라진다).
  - **O10 (a) · (b)**: 뒤로가기는 `OnBackInvokedCallback`이 아니라 **`onBackPressed()` 경로**를 탄다(API 33 미만). 기준은 같다 — 확인창 · 떠남 · 구성 변경 뒤에도 `finish()` 없음.
  - **O10 (c)**: **API 35 이하 기준**이다 — 재생성 허용 · 재생성 뒤 맵 · 픽셀로 잰 알약 위치 2175 → 2307 → 2175. `assetsPaths` 선언은 이 기기에서 무시된다(선언한 빌드의 설치 · 실행은 정상이다).
    `lc`는 전환마다 `create: 1 destroy: 1 relaunch_resume: 0`이다. `navmode`(`enable-exclusive --category`)는 **이 기기에서도 통한다**(2026-10-06: 모드 0 → 2 → 0, 한 오버레이만 `[x]`).
    같은 빌드에서 `cmd uimode night`는 `0 0 0`이어야 한다 — 직접 처리 자체가 이 API에서 깨진 것이 아님을 가르는 대조다.
- **이 기기에 없는 것**: `wm set-ignore-orientation-request` · `wm get-ignore-orientation-request` · **`wm user-rotation`**은 API 30에 없다(`Unknown command`). 그래서 **O4는 이 기기에서 하지 않는다**, 되돌리기에 `wm user-rotation free`를 쓰지 않는다.
  `dumpsys audio`의 소리 이력도 없다 — O8은 이 기기에서 하지 않는다.
- **판정**: O1 · O2 · O3 · O10 각각의 기준을 이 기기에서 통과해야 통과다. 하나라도 실패하면 어느 항목인지 적는다(계약 §14-8).
  dump 값(`edge` · `appbounds`)이 기대와 다르다는 것만으로 실패로 적지 않는다 — 먼저 같은 화면의 스크린샷 픽셀을 잰다.

## 계측 `ConfigurationChangeTest` — 실행법

`apps/android/app/src/androidTest/java/com/libitum/host/ConfigurationChangeTest.java`(8건)는 실제 `MainActivity`를 띄워 구성 변경 뒤의 Activity 수명 · LynxView 크기 · screen metrics를 본다.
두 기기에서 각각 돈다. **이 클래스는 에뮬레이터 전역 설정(야간 · 크기 · 밀도 · 글꼴 배율 · 방향 재정의 · 회전 · 내비게이션 모드 오버레이)을 바꾼다.** O1 ~ O12 · Maestro · 다른 계측과 동시에 돌리지 않는다.

- **번들 서빙과 `-e bundleUrl`이 필수다.** 번들 서버(위 「빌드」 3)가 떠 있어야 하고 `-e bundleUrl http://10.0.2.2:18790/main.lynx.bundle`을 준다.
  `bundleUrl`이 없으면 6건이 `precondition: instrumentation argument bundleUrl is missing`으로 실패한다(IC1만 앱을 띄우지 않아 통과). 번들이 실제로 로드되지 않으면(온보딩의 `Next`가 서지 않으면) `번들이 로드되지 않았다: <url>`로 실패한다.
- 시작 전에 크기 · 밀도 재정의가 없어야 한다(전제 표). 있으면 `precondition: a 'wm size' override is already set`으로 실패한다.
- **`am instrument`는 테스트가 실패해도 종료 코드가 0이다 — 종료 코드로 판정하지 않는다.**
- **API 30에서 IC5와 IC8은 건너뛴다**(둘 다 API 36 이상을 가정한다 — IC5 `the orientation lock is only ignored on API 36+`, IC8은 내비게이션 모드 오버레이 전환에 같은 인스턴스). 건너뜀은 기본 출력의 `OK (8 tests)`에 **섞여 보이지 않는다**(점의 개수가 유일한 흔적). 건너뜀은 `-r`(raw) 출력의
  `INSTRUMENTATION_STATUS_CODE: -4`로만 확인된다. 그래서 **`-r`로 돌려 코드를 센다.** 건너뜀은 통과로 세지 않는다.
- **IC8은 `assetsPaths` 선언을 가른다.** 매니페스트에서 `assetsPaths`만 뺀 빌드(API 37)에서 IC8이 `navigation mode -> threebutton: MainActivity was recreated`로 실패하는 것을 확인했다(2026-10-06, 변형 하나).

```sh
A shell am instrument -w -r -e class com.libitum.host.ConfigurationChangeTest \
  -e bundleUrl http://10.0.2.2:18790/main.lynx.bundle \
  libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner >"$OUT/instrument-$ID.raw.log"
# 테스트별 최종 코드 — 시작(1)을 뺀다. 0 통과 · -2 실패 · -4 건너뜀(가정 불충족)
tr -d '\r' <"$OUT/instrument-$ID.raw.log" | awk '/^INSTRUMENTATION_STATUS: test=/{t=$0} /^INSTRUMENTATION_STATUS_CODE:/{print t, $0}' | grep -v ' 1$'
tr -d '\r' <"$OUT/instrument-$ID.raw.log" | grep '^INSTRUMENTATION_STATUS_CODE:' | grep -v ': 1$' | sort | uniq -c
```

| 기기 | 기대 | 통과 기준 |
|---|---|---|
| Pixel_8(API 37) | 8건 | 코드 집계가 **`0`이 8개**, `-2` · `-4`가 0개 |
| R6_API30(API 30) | 8건 | **`0`이 6개 + `-4`가 2개**이고 `-4`인 테스트가 IC5 · IC8(API 36 이상 가정). 「8 통과」로 적지 않는다 — **6 통과 + 2 건너뜀**이다 |

- 실패하면 어느 케이스인지 `test=` 이름과 `stack=`을 붙인다. 구현을 덧대지 않는다(계약 §6 · §14).
- **끝나면 아래 「끝난 뒤 되돌리기」를 한 번 더 돈다** — 케이스가 중간에 죽으면 전역 설정이 남는다.
- 기존 계측 일괄([Android 출시 설정 절차](android-release-config.md)의 R8 ①)은 `notClass`에 `com.libitum.host.ConfigurationChangeTest`를 넣어 이 클래스를 **빼고** 돈다(그 문서의 명령에 반영돼 있다) — 이 클래스가 전역 설정을 바꾸고 `-e bundleUrl`을 요구하기 때문이다.
  기준선은 `OK (47 tests)`다(통과 44 + 건너뜀 3 — 2026-10-06 `dfbe03cb`부터, `LaunchAppearanceTest` 4건이 더해졌다. 수의 내력과 건너뛰는 셋은 [출시 설정 절차](android-release-config.md) R8의 「통과」가 진다. 이 문서의 「실행 결과」에 남은 `OK (40 tests)`는 그때의 결과다). 빼지 않으면 일괄에 들어가 `bundleUrl` 없이 실패한다(이 클래스가 7건이던 때 `Tests run: 47, Failures: 6`이었다 — 일괄 40 + 이 클래스 7이고 지금 기준선의 47과는 숫자만 같다. 8건이 된 뒤의 수는 재지 않았다).
- **이 계측이 보증하지 않는 것**: IC2 ~ IC5의 「화면 상태 유지」 단언(구성 변경 뒤 페이지 로드 콜백 0회 · 온보딩 둘째 단계 그대로)이 **실제로 실패하는 장면은 관찰된 적이 없다** — `configChanges`만 뺀 임시 빌드에서는 재생성 단언이 먼저 실패했다.
  그 임시 빌드에서 IC3 · IC4는 통과했다(IC3은 `onConfigurationChanged`의 전달을, IC4는 세로 잠금을 가른다). ADR-0047의 「확인한 것과 확인하지 못한 것」에 같은 한계가 있다.

## 앞선 작업 회귀 확인 — test-plan이 정한 범위

이 작업이 `MainActivity`의 수명을 바꾸므로(재생성이 사라진다) 앞선 작업의 **구성 변경과 맞닿는 지점**만 다시 본다. 각 문서의 전체 절차를 다시 돌리는 것이 아니다.

| 앞선 작업 | 이 문서에서의 확인 | 기준 문서 |
|---|---|---|
| 시스템 뒤로가기(ADR-0043) | O10(a) · (b) — 구성 변경 뒤 확인창 · 떠남. O12는 `onBackPressed()` 경로 | [Android 시스템 뒤로가기](android-system-back.md)의 B2 · B3 · B5 · B6 · API 32 이하 L1 |
| 탭 바 · 내비게이션 inset(ADR-0044) | O3(a) · O10(c) — 크기 변경 · 모드 전환의 알약 위치 | [Android 내비게이션 바와 하단 탭 바](android-navigation-insets.md)의 N1 · N9 |
| 효과음 · 오디오 | O8 — 구성 변경 뒤 효과음 · 이어지는 대사 | [Android 자산 확인](android-assets.md)의 E2 · E5, [Android 오디오 재생](android-audio-playback.md) |
| 딥링크 콜백 | O9 — Custom Tab 중 구성 변경 뒤 `duru://auth-callback` | [소셜 로그인 확인](android-social-login.md)의 A5-2, [Android 출시 설정 절차](android-release-config.md)의 R4 |

자동 회귀(기기 불필요 — 이 문서의 대상이 아니라 test-plan 「회귀」가 정한다): `pnpm verify` 통과, `./gradlew testDebugUnitTest assembleBundled` 통과(JUnit 통과 수가 기준선과 같다),
`git diff --stat 47600f41`에 `apps/ios/` · `apps/mobile/` · `packages/` 0줄.

## 끝난 뒤 되돌리기

**기기마다 돈다.** 두 API에서 모두 통하는 명령만 쓴다 — `wm user-rotation free`는 API 30에 없다(`Unknown command`)이므로 쓰지 않는다. 회전은 `settings put system`으로 되돌린다.
회전 두 값과 내비게이션 모드는 **기본값이 아니라 `globals-before-$ID.txt`에 남긴 시작 값**으로 되돌린다(Pixel_8은 시작이 제스처 `2`였고 R6_API30은 `accelerometer_rotation`이 `1`이었다).

```sh
# 내비게이션 모드와 오버레이 [x] 목록을 시작 때 값으로(0 = 3버튼, 2 = 제스처). API 35 이하에서는 앱이 떠 있으면 이때 한 번 더 재생성된다.
# 회전 값보다 먼저 한다 — 3버튼으로 바꾸면 user_rotation 이 바뀔 수 있다(아래)
restore_nav
ACC=$(grep '^accelerometer_rotation:' "$OUT/globals-before-$ID.txt" | grep -o '[0-9]*$')
ROT=$(grep '^user_rotation:' "$OUT/globals-before-$ID.txt" | grep -o '[0-9]*$')
A shell "cmd uimode night no; wm size reset; wm density reset; settings put system font_scale 1.0; settings put system user_rotation ${ROT:-0}; settings put system accelerometer_rotation ${ACC:-0}"
# API 36 이상에서만 있는 명령 — API 30에는 없어 건너뛴다
[ "$(A shell getprop ro.build.version.sdk | tr -d '\r')" -ge 36 ] && A shell wm set-ignore-orientation-request reset
# O11을 했으면 TalkBack을 끈다
A shell settings delete secure enabled_accessibility_services
A shell settings put secure accessibility_enabled 0
# 픽스처 · 번들 서버
stop_fixture
kill %1 2>/dev/null     # 이 셸에서 띄운 번들 서버(작업 번호는 jobs 로 확인한다)
globals | diff - "$OUT/globals-before-$ID.txt" && echo "restored"
```

- **`restore_nav`는 회전 값을 되돌리기 전에 돈다.** 2026-10-06 Pixel_8에서 `navmode threebutton` 첫 전환 뒤 `user_rotation`이 `0` → `1`로 바뀌었다. 에뮬레이터 SystemUI의 3버튼 회전 버튼 때문이라는 것은 **추정**이다(logcat에 `RotationButtonController` 흔적).
  같은 실행의 마지막 되돌리기에서는 다시 나타나지 않았다. 순서와 무관하게 마지막 `globals | diff`가 이 어긋남을 잡는다 — 그 확인을 빼지 않는다.
- **`restore_nav` 뒤 `navigation_mode`와 `overlays:` 줄이 시작 때와 같은지 본다.** 같지 않으면 손으로 맞춘다: 시작 때 `[x]`였던 오버레이는 `cmd overlay enable <오버레이>`, `[ ]`였던 것은 `cmd overlay disable <오버레이>`,
  시작 모드의 오버레이를 **마지막에** 켠다. `enable …threebutton` 한 줄로는 돌아오지 않는 경우가 있었다 — 2026-10-06 R6_API30에서 두 오버레이가 모두 `[x]`가 된 뒤 모드가 `2`에 머물러 `disable …gestural`이 필요했다.
- 마지막 `diff`가 비어야 한다(`restored`). 남은 차이는 **시작 전 값으로 다시 맞춘다** — 특히 `R6_API30`이 시작 때 `wm density 160` · `accelerometer_rotation 1` 같은 이전 작업의 값을 가지고 있었다면, 이 문서는 그 값을 복원하지 않고 기본값으로 돌려 놓은 것이므로
  다음에 쓰는 절차가 자기 값을 스스로 건다는 것을 알고 기록해 둔다.
- 앱 데이터는 `pm clear`로 비어 있을 수 있다. 시스템 언어(O5)는 위 셸 줄로 되돌아가지 않는다 — 설정 앱에서 언어 목록을 시작 때와 같게 돌려놓는다. `locale:` 줄 하나만 `diff`에 남는 경우는 O5 절에 있다.
- 끝나면 기기에 `debug` 앱 + 계측 APK가 설치돼 있다. 다른 e2e(`bundled` 설치를 전제하는 것)를 돌릴 때는 그 문서의 설치부터 다시 한다.

## 실행 결과

**④ ~ ⑥이 지금의 빌드(11값)이고 ① ~ ③은 `assetsPaths`가 없는 10값 빌드다.** 실행은 여섯이다. 결과를 실행별로 따로 적는다 — 섞어 읽지 않는다.
원본(스크린샷 · `state` · `texts` · 계측 raw 로그)은 작업 산출물 `.agent-harness/work/android-orientation/`의 `artifacts/` · `logs/`에 있다(저장소에 이미지를 넣지 않는다).
다음에 실행하면 날짜 · 기기(AVD · API) · 빌드 SHA · 내비게이션 모드와 오버레이 `[x]` 목록을 적고 새 절을 더한다.

### ⑤ · ⑥ `33057ccb` — 최종 검증 r02와 O6 재판정 · 기준선 대조 (2026-10-06 02:3x ~ 02:5x, 11값 빌드)

`33057ccb`의 제품 코드는 `4f3b2927`과 같다. Pixel_8 · API 37, 듣기 문항(「Minseo's hello comes back to me」), 픽스처. 끝에 전역 설정 diff 0.

| 항목 | 결과 | 기기 · API | 근거 |
|---|---|---|---|
| O6 — 판정(r04 기준, ⑥) | **통과** | Pixel_8 · 37 | 진입(1187) · 823 · 확인창 · 1551 · 복귀 · 맵 루트 분할 각 단계 `lc` 0/0/0, crash 0. 1080x1187 → `lynxbounds 0,0-1080,1187`, 1080x1551 → `0,0-1080,1551`(채움). 1080x823 → `lynxbounds 0,0-815,823`, `areBoundsLetterboxed=true` · `letterboxReason=FIXED_ORIENTATION`. 레터박스 안: 헤더 닫기 (248,384) → 「Leave this lesson?」 → `Keep going`으로 닫힘, 맵 루트의 설정 탭 (792,728) → Settings. 복귀: `0,0-1080,2400`, 같은 pid · 같은 문항, 다른 행 38개가 전부 시계 대역 32 + 제스처 바 대역 6(본문 0) |
| O6 — 관찰(판정 아님) | 잘림 · 스크롤 불가 | Pixel_8 · 37 | 높이 823: 카드 위쪽(y ≈ 660)부터 창 밖 — 답 버튼 `Hello` / `Thank you`와 재생 버튼이 보이지 않아 **그 문항을 풀 수 없다.** 스와이프 두 가지에 화면 불변, 앱 노드에 `scrollable=true` 없음. 잘린 버튼은 닿지 못해 채점을 시도하지 못했다. 확인창 제목이 상태바 쪽으로 일부 가려짐. 높이 1187에서도 같은 문항의 답 버튼은 창 밖(재생 버튼이 분할선에 걸림). 맵 루트(823)는 탭 바가 창 아래쪽에 서서 보이고 눌린다 |
| O6 — 기준선 `47600f41` 대조(⑥) | 회귀 아님 | Pixel_8 · 37 | 기준선: 분할 진입 · 분할선 이동 · 복귀 **매번 `create 1 destroy 1 relaunch_resume 1`**, 문항 도중이면 스플래시 → 맵 맨 위(진행 소실). 1080x823에서 `lynxbounds 0,0-1080,823`(레터박스 없음). 그 창에서 같은 문항에 다시 들어가면 **같은 자리(y ≈ 660)부터 잘리고 답 · 재생 버튼이 보이지 않는다.** 기준선이 더 보여 주는 것은 가로 폭뿐이다. 기준선에서는 스크롤 가능 여부 · 높이 1551 · 세로 모양 영역의 문항 화면을 보지 않았다. 두 빌드는 같은 JS 번들을 썼다 |
| O6 — r03 기준(⑤) | 당시 기준으로 실패 | Pixel_8 · 37 | 관찰 값은 ⑥과 같다. 당시 기준의 「내용과 조작부가 창 안에 전부 보인다」가 성립하지 않아 실패로 적혔고, 그 문면이 관찰 없이 쓴 것이라 계약 r04가 뺐다 |
| 계측 API 37(⑤) | 8 통과 | Pixel_8 · 37 | `-r` 코드 `0`이 8개. R8 ① 일괄 `OK (40 tests)` |
| `pnpm verify` · gradle 전체(⑤) | 통과 | — | `pnpm verify` 종료 0, gradle `BUILD SUCCESSFUL`(JUnit 45건 0 실패), AAB의 `MainActivity` `configChanges=0x80002ff4`(11값) |

**O6 판정의 변천**: ③(`5988e8ec`)은 「창을 채운다」(r02 기준)로 실패, ⑤는 「내용 · 조작부 전부 보임」(r03 기준)으로 실패, ⑥은 r04 기준으로 통과다. 세 실행의 관찰 값은 서로 어긋나지 않는다 — 바뀐 것은 기준이다.

### ④ `4f3b2927` — `assetsPaths` 선언 뒤의 기기 검증 (2026-10-06 02:17 ~ 02:30)

`debug` APK + 계측 APK를 이 HEAD에서 새로 빌드(병합값 `0x80002ff4`), 번들은 모의 값으로 다시 만들었다. Pixel_8은 시작 모드 제스처(`2`) · 두 오버레이 `[x]`, R6_API30은 3버튼(`0`) · threebutton만 `[x]`. 두 기기 모두 끝에 전역 설정 · 오버레이 목록 diff 0.
양성 대조: 같은 실행에서 글꼴 1.3 → `create 1 · destroy 1 · relaunch_resume 1`.

| 항목 | 결과 | 기기 · API | 근거 |
|---|---|---|---|
| O10 (c) — 맵 | 통과 | Pixel_8 · 37 | `navmode` 3버튼 → 제스처 → 3버튼: 전환마다 `lc` 0/0/0, 알약 2243 → 2369 → 2243(각 PASS), 모드 0 → 2 → 0, 스크롤 위치 유지(본문 크롭 3장 같음), crash 0 |
| O10 (c) — 학습 화면 도중 | 통과 | Pixel_8 · 37 | 듣기 문항에서 두 전환 `lc` 0/0/0, 같은 문항(본문 크롭 같음), `texts` 같음, 같은 pid |
| O10 (c) — 학습 화면의 하단 주 버튼 | 통과 | Pixel_8 · 37 | `See results`: 3버튼에서 버튼 아래 끝 2211 · 바 위 끝 2274 → 제스처 2274 · 2337 → 3버튼 2211. 늘 버튼이 바 위(여유 63px), `lc` 0/0/0 |
| O8 — 내비게이션 모드 전환 중 | 통과 | Pixel_8 · 37 | 두 회차(제스처로 · 3버튼으로): 명령 +0.06초 · +0.5초에 같은 `piid`의 `state:started`, 자연 종료는 시작 약 1.5초 뒤, `lc` 0/0/0, 효과음 호출 2. 소리를 듣지는 못했다 |
| 시스템 글꼴 오버레이 켬 · 끔 | 통과(절차 항목 밖의 확인) | Pixel_8 · 37 | `notoserifsource`: `lc` 0/0/0(합계), 켬 중 · 끔 뒤 본문 크롭 같음, 같은 pid. 이 오버레이는 앱 화면의 글꼴을 바꾸지 않았다 |
| 모드 전환 뒤 뒤로가기 · 탭 전환 | 통과 | Pixel_8 · 37 | 전환 두 번 뒤 학습 화면에서 BACK → `Keep going`/`Leave`, `lc` 0/0/0, 한 번 더 → 같은 문항. 설정 탭 → 여정 탭 정상, `lc` 0/0/0 |
| O1 | 통과 | Pixel_8 · 37 | `emu rotate` 네 번 모두 `1080 2400`, `lc` 0/0/0. **설정 앱 대조 회전은 하지 않았다**(대조는 ①) |
| O2 | 통과 | Pixel_8 · 37 | night `yes` 확인 → `no` 확인, `lc` 0/0/0 |
| O7 (글꼴) | 통과(가드 · 양성 대조) | Pixel_8 · 37 | 글꼴 1.3 → 1/1/1, 재생성 뒤 맵, crash 0. 밀도 회차는 돌리지 않았다 |
| O12 — O2 | 통과 | R6_API30 · 30 | night `yes`/`no`: `lc` 0/0/0(직접 처리 유지). `0x80002ff4` 매니페스트의 설치 · 실행 정상 |
| O12 — O10 (c) | 통과(API 35 이하 기준) | R6_API30 · 30 | `navmode` 전환마다 `create 1 · destroy 1 · relaunch_resume 0`(선언이 무시된다 — 허용), 재생성 뒤 맵 정상, 알약 2175 → 2307 → 2175(각 PASS), 한 오버레이만 `[x]`, crash 0 |
| 계측 API 37 | **8 통과** | Pixel_8 · 37 | `-r` 코드 집계 `0`이 8개. IC8(오버레이 전환)이 이 기기에서 처음 돌아 통과. 전후 전역 설정 diff 0 |
| 계측 API 30 | **6 통과 + 2 건너뜀** | R6_API30 · 30 | `0`이 6개 + `-4`가 2개(IC5 · IC8 — API 36 이상 가정) |
| IC8의 구분력 | 확인 | Pixel_8 · 37 | 매니페스트에서 `assetsPaths`만 뺀 빌드에서 IC8이 `MainActivity was recreated (created 2 times)`로 실패 |
| 회귀 | **계측 일괄만** | Pixel_8 · 37 | R8 ① 문서 명령 그대로 `OK (40 tests)` |

**④에서 돌지 않은 것**: O3 · O4 · O5 · O6(⑥에서 돌았다) · O9 · O11, O7의 밀도 회차, O12의 O1 · O3 · O10 (a)(b), 텍스트 입력 중의 전환, 배경화면 기반 동적 색상, Maestro · 세션/저장소 스크립트 · R8 ②. 이 항목들의 마지막 결과는 아래 10값 빌드의 것이다.

### ③ `5988e8ec` — e2e 재실행 (2026-10-06 01:52 ~ 02:12, 10값 빌드)

리뷰가 「구분력 없는 자극」과 「API 30에서 고친 절차로 돈 적 없음」을 지적해 다시 돈 실행이다. Pixel_8 시작: `accelerometer_rotation` **`1`** · 모드 `2` · 두 오버레이 `[x]` · `locale` 빈 값. 끝: `locale`만 `en-US`로 달라짐(O5 — 그 절). R6_API30은 diff 없음.
양성 대조: 글꼴 1.3 → `create: 1 destroy: 1 relaunch_resume: 1`, 같은 기기의 야간 전환은 `0 0 0`.

| 항목 | 결과 | 기기 · API | 근거 |
|---|---|---|---|
| O5 | 통과 | Pixel_8 · 37 | Español (EE.UU.)을 추가해 맨 위로: `persist.sys.locale` `en-US` → `es-US`(목록 `es-US,en-US`). `reopen` 뒤 `lc` 0/0/0, `texts` 같음, 본문 `cmp` 같음, 같은 pid. 설정 앱은 스페인어로 바뀜. (첫 시도는 확인 대화상자를 못 눌러 목록만 바뀌었다 — 판정에 쓰지 않음) |
| O6 | **재생성 0 · 세로 모양 채움 · 가로 모양 레터박스** | Pixel_8 · 37 | 분할 진입 `lc` 0/0/0. 영역 1080x1187: `lynxbounds 0,0-1080,1187` 채움. 1080x1551: 채움. **1080x823(분할선 y≈800)**: 창 `Rect(133,0-948,823)` = 815x823, 좌우 133px씩 빔, `letterboxReason=FIXED_ORIENTATION` · `fixedOrientationLetterboxAspectRatio=1.333`, `lynxbounds 0,0-815,823`. 모든 시점 `lc` 0/0/0. 복귀 `0,0-1080,2400`, 같은 pid, `texts` · 본문 같음. **그 실행은 당시 기준(「창을 채운다」)으로 이 항목을 실패로 적었다 — 그 뒤 계약이 레터박스를 받아들이도록 재고정됐다.** 지금 기준의 「레터박스 안에서 조작된다」는 그 실행이 따로 확인하지 않았다 |
| O8 회차 1 · 2 | 통과 | Pixel_8 · 37 | 회차 1(night `yes`): `piid:9903 state:started`가 명령 뒤에도 유지, `stopped`는 시작 1.34초 뒤 자연 종료, `lc` 0/0/0. 회차 2(night `no`): `piid:9895` 같음, `lc` 0/0/0. 효과음 호출 2 · `failed` 0. (첫 시도는 읽기와 명령 사이에 대사가 끝나 「관찰 못 함」 — 한 번의 셸로 묶어 다시 했다) |
| O9 회차 1 | 통과 | Pixel_8 · 37 | Custom Tab이 열린 동안 night `yes`(확인) → 모의 콜백: `Couldn't connect. Check your connection and try again.`, 앞 MainActivity, 로그인 화면 유지, `lc` 0/0/0(night 직후 · 콜백 뒤), 같은 pid. 되돌림도 0/0/0 |
| O9 회차 2 | 통과(흉내) | Pixel_8 · 37 | Custom Tab이 열린 동안 큰 화면 흉내 + 회전: 가로 성립(`2560 1600`, ` land `). 콜백 뒤 같은 문구, `lynxbounds 0,0-2560,1600`, `lc` 0/0/0, 같은 pid |
| O10 (a) | 통과 | Pixel_8 · 37 | 학습 화면 야간 왕복 → BACK: `Keep going`/`Leave`, 앞 MainActivity, `lc` 0, 한 번 더 → 닫힘 |
| O10 (b) | 통과 | Pixel_8 · 37 | 맵에서 **야간 왕복** → BACK: 앞이 런처, 기록 13개, pid 32351 전후 같음, 다시 열어 2초 안에 `Journey, selected`, `lc` 0/0/0 |
| O12 — O1 | 통과 | R6_API30 · 30 | 설정 앱 대조 `2340 1080` → 세 번 더 `1080 2340`. 앱에서 네 번 모두 `1080 2340`, `lc` 0/0/0, 같은 pid, 본문 같음 |
| O12 — O2 | 통과 | R6_API30 · 30 | `lc` 0/0/0, 상태바 · 본문 `cmp` 같음 |
| O12 — O3 (a) | 통과 | R6_API30 · 30 | 알약 아래 끝(픽셀) 2175 / 1755 / 2175 — 각 PASS. `lynxbounds 0,0-1080,1920` → 2340. dump 값은 2072 · `1080 1652`로 잘림(쓰지 않음). `lc` 0/0/0. 헤더: `mStable` 위 끝 145 · 헤더 아이콘 위 끝 215가 세 시점 같음(차이 70px) |
| O12 — O3 (b) | 통과 | R6_API30 · 30 | `shotsize 1080 1920`, `lynxbounds 0,0-1080,1920` → `0,0-1080,2340`, `lc` 0/0/0, 본문 같음. 줄인 화면에서 콘텐츠가 약 1722에서 끊겨 아래 버튼이 잘려 보임(세로 전제 화면의 관찰 — 시스템 바 1788 위, 겹침 · 빈 띠 없음) |
| O12 — O10 (a) · (b) | 통과 | R6_API30 · 30 | (a) 확인창, `lc` 0/0/0. (b) 앞이 설정 앱, 기록 10개, pid 5421 같음, 다시 열어 `Journey, selected`, `lc` 0/0/0 |
| O12 — O10 (c) | 통과(당시 기준 = 재생성 허용) | R6_API30 · 30 | **`enable-exclusive`가 API 30에서 통했다.** 전환마다 `create 1 · destroy 1 · relaunch_resume 0`, 재생성 뒤 맵 정상, 알약 2175 → 2307 → 2175(PASS), `lynxbounds 0,0-1080,2340`, crash 0 |
| 계측 API 30 | 6 통과 + 1 건너뜀(당시 7건) | R6_API30 · 30 | `0`이 6개 + `-4`가 1개(IC5) |

### ① `8e16f6b5` · ② `94097ecb` — 첫 e2e 실행 · 진단 · 접근성 점검 · 최종 검증 (2026-10-06 00:2x ~ 01:1x, 10값 빌드)

`debug` APK + 계측 APK, 번들은 모의 `PUBLIC_SUPABASE_*` 값으로 만들어 18790 포트로 제공.
①은 세 묶음이다: e2e 실행(O1 ~ O12 · 계측 · 회귀 일괄) → API 30 진단(처음 실패로 적힌 둘을 기준선 `47600f41` 빌드와 대조) → 접근성 점검(O11). ②는 그 뒤 고친 도구를 API 37에서 돌린 최종 검증이다.
**이 결과는 고치기 전 절차로 얻었다** — 재생성 판정의 `lc`는 실행 도중에 더한 것이고, O10 (c) · O11 · O12의 기준과 도구는 실행 뒤에 고쳤다(「절차 정정 기록」).
**아래 표의 「미실행」 · 「재생성」 서술은 그 시점의 기록이다.** O5 · O6 · O9 회차 2는 ③에서 돌았고, O10 (c)의 재생성은 `assetsPaths`를 선언하지 않은 빌드의 동작이다(지금 빌드는 ④).
O8 회차 2 · O9 회차 1 · O10 (b)는 이 실행에서 구분력 없는 자극(`wm size`)을 썼다 — 그 통과는 「재생성 없음」의 증거로 세지 않고 ③의 값을 쓴다.

| 기기 | 시작 때 | 끝 |
|---|---|---|
| `emulator-5554` Pixel_8 · API 37 | 1080x2400 @420 재정의 없음 · night `no` · font `1.0` · `accelerometer_rotation` `0` · `navigation_mode` **`2`(제스처)**, threebutton · gestural 둘 다 `[x]` | 시작 값과 diff 없음 |
| `emulator-5556` R6_API30 · API 30 | 1080x2340 @440 **재정의 없음** · night `no` · font `1.0` · `accelerometer_rotation` `1` · `navigation_mode` `0`, threebutton만 `[x]` | 시작 값과 diff 없음(e2e 실행 끝에 모드가 `2`로 남아 `cmd overlay disable …gestural`로 되돌렸다) |

스크린샷 · `state` · `texts` · 계측 raw 로그 원본은 작업 산출물 `.agent-harness/work/android-orientation/`의 `artifacts/e2e/` · `artifacts/diagnosis/` · `artifacts/accessibility/` · `logs/`에 있다(저장소에 이미지를 넣지 않는다).
다음에 실행하면 날짜 · 기기(AVD · API) · 빌드 SHA · 내비게이션 모드와 오버레이 `[x]` 목록을 적고 이 표를 새로 채운다.

| 항목 | 결과 | 기기 · API | 근거(숫자 · 문자열 · 파일) |
|---|---|---|---|
| O1 | 통과 | Pixel_8 · 37 | 대조: 설정 앱 `emu rotate` → `2400 1080`, 세 번 더 → `1080 2400`. 앱에서 네 번 모두 `1080 2400`. `lc` 0. 안정 화면의 본문 md5 같음. (첫 시도는 답한 직후라 화면이 스스로 넘어가 전후가 달랐다 — 버리고 안정 화면에서 다시 했다) |
| O2 | 통과 | Pixel_8 · 37 | `Night mode: yes` 확인. `lc` 0. 본문 `cmp` 같음. 상태바 `cmp`는 다름 — 신호 막대 음영뿐이고 아이콘은 양쪽 다 어두운색 · 배경 밝음(육안) |
| O3 (a) 탭 루트 | 통과 | Pixel_8 · 37 | 1080x1920: `shotsize` `1080 1920` · `appbounds` `1080 1920` · 알약 아래 끝 `PASS 1763 == 1763`. 복귀: `appbounds` `1080 2400` · `PASS 2243 == 2243`. `lc` 0. 헤더 칩 위 끝 164 → 138 → 164, 상태바 inset 132 → 106 → 132(차 32px 일정). `lynxbounds` · `pillbottom`은 이 실행에 없던 도구다 — `appbounds` · `edge`로 판정했다 |
| O3 (b) 학습 화면 | 통과 | Pixel_8 · 37 | `lc` 0, 본문 md5 같음, `appbounds` `1080 1920`, 줄인 스크린샷에서 하단 주 버튼 아래 끝 y≈1731(≤ 1794), 빈 띠 · 넘침 없음 |
| O4 | 통과 — **흉내에서** | Pixel_8 · 37 | 게이트: 세로 `1600 2560` → 회전 뒤 `2560 1600`, `dumpsys window displays`의 ` land `. G1 `lc` 0 · 같은 화면. G2 `appbounds` `2560 1600`. G3 헤더 · `×` · 하단 주 버튼이 상태바 띠 · 3버튼 바(아래 태스크바 모양)와 겹치지 않음. G4 뒤로가기 → `Keep going`/`Leave`, 한 번 더 → 닫힘, pid 같음, crash 0 · ANR 0. G5 `back: 1600 2560`, reset `1080 2400`, 전후 본문 같음(한 회차는 재생 버튼 가장자리 몇 픽셀만 다름). 관찰: 가로에서 「1 of 1 question completed」 알약이 하단 주 버튼에 가려짐, 오른쪽 약 183px 빔 |
| O5 | **미실행** | — | 설정 앱의 언어 조작에 착수하지 못했다. 코드 판정(계약 §5.2)뿐이다 |
| O6 | **미실행** | — | O4가 가로로 성립해 대체로는 필요 없었으나, 분할 화면 자체의 확인은 없다 |
| O7 | 통과(가드) | Pixel_8 · 37 | A 글꼴 1.3: `create 1 · destroy 1 · relaunch_resume 1`, 학습 화면 → 맵(`Journey, selected`), 글자 커짐, crash 0, 세션 유지. B 밀도 480: `1 · 1 · 1`, 알약 폭 `PASS 192 == 192`, 맵, crash 0. pid 같음. **옛 `same`은 두 경우 모두 `SAME`이었다** — 해시 · pid가 재생성을 가르지 못한다는 증거 |
| O8 | 통과 | Pixel_8 · 37 | 회차 1(night): `MediaPlayer` `piid:7559 state:started` 전후 같음, `events` diff 비어 있음, `lc` 0. 회차 2(`wm size`): `piid:7575 started` 전후 같음, `lc` 0. 효과음: 변경 뒤 탭 → `SoundEffectsModule.play.button` 2회, `…failed` 0(누른 좌표는 겨냥한 버튼이 아니었다). 소리를 듣지는 못했다 |
| O9 | 회차 1 통과 · **회차 2 미실행** | Pixel_8 · 37 | 「Connect with Google」 → Custom Tab(`example.invalid`). 열린 동안 `wm size 1080x1920`, 모의 콜백 → `Couldn't connect. Check your connection and try again.`, `front` MainActivity, 로그인 화면 유지, `lc` 0, pid 같음. 큰 화면 가로 회차는 하지 않았다 |
| O10 (a) | 통과 | Pixel_8 · 37 | 야간 왕복 뒤 BACK → `Keep going`/`Leave`, `front` MainActivity, 한 번 더 → 닫힘 · 같은 화면, `lc` 0 |
| O10 (b) | 통과 | Pixel_8 · 37 | 크기 왕복 뒤 BACK → 앞이 MainActivity가 아님(런처가 아니라 앞서 연 설정 앱), 기록 9개, pid 24808 전후 같음, 다시 열어 2.5초 뒤 `Journey, selected`, `lc` 0 |
| O10 (c) | 통과 — **고친 기준으로 판정(최종 검증, `94097ecb`)** | Pixel_8 · 37 | 최종 검증(픽스처 맵, 3버튼 시작, `navmode`): `pillbottom` 3버튼 2243 → 제스처 2369 → 3버튼 2243(기대 2243 · 2369), 전환마다 `create 1 · destroy 1`(`relaunch_resume 1`), 재생성 뒤 `Journey, selected`가 다시 섬, `lynxbounds` `0,0-1080,2400`, 앞 Activity MainActivity. 앞선 기록 — e2e 실행(일반 `cmd overlay enable`, 두 오버레이 `[x]`): 알약 `2243 → 2369 → 2243`, `lc` 0 — 「재생성 없음」은 이 조건에서만 나온다. 진단: `disable …gestural` · `enable-exclusive` 둘은 각각 재생성 1회(`wm_relaunch_resume_activity`의 마지막 필드 `80000000`), 일반 `enable` 둘은 0회 |
| O11 | 통과 — 접근성 점검(로그인 · 온보딩 화면) | Pixel_8 · 37 | e2e 실행: `input tap`이 답 버튼을 눌러 판정 불가. 접근성 점검(하드웨어 수준 터치): 「Connect with Facebook」에 포커스 `[320,998][758,1058]` → night `yes` 같음 → `wm size 1080x1920` `[320,972][758,1032]`(같은 요소, 26px 위) → reset · night `no` 원래 값, 창 id 3693 내내 같음, `lc` 0. 뒤로 버튼에 포커스 → night `yes` → 빈 곳 (540,1800) 두 번 탭 → 온보딩 1단계로 이동. 온보딩 「Next」에 포커스 → `wm size 1080x1920` → 빈 곳 (540,600) 두 번 탭 → 2단계. 양성 대조 글꼴 1.3 → 1.0: 창 id 3693 → 3698 → 3700, 재생성, 포커스 첫 요소로. **학습 화면 · API 30 · 큰 화면 가로 · 낭독 · 스와이프 탐색은 보지 않았다**. **최종 검증의 재확인(`94097ecb`, 이 문서의 도구)**: 온보딩 「Next」에 `explore` → 테두리 `[402,2064][678,2210]`, night `yes` 같은 영역 · `lc` 0 · 창 id 4018 같음, `wm size 1080x1920` `[402,1584][678,1730]` · `lc` 0, 복귀 원래 값, `dtap`(빈 곳) → 다음 화면. 양성 대조 글꼴 1.3: `create 1 · destroy 1 · relaunch_resume 1`, 창 id 4018 → 4022 |
| O12 | 통과 — **진단 뒤 재판정** | R6_API30 · 30 | O1: 대조 `2340 1080`, 네 번 `1080 2340`, `lc` 0. O2: `lc` 0, 본문 md5 같음. O3 (b): `lc` 0 · 본문 같음, 줄인 스크린샷에서 콘텐츠 끝 약 1722 · 시스템 바 1788부터(겹침 · 빈 띠 없음). O3 (a): dump는 `FAIL 1652 != 1755` · `FAIL 2072 != 2175`였으나 **픽셀은 1755(줄인 상태) · 2175(전체 크기)로 기대와 같다** — dump가 `app=1080x2072`에서 잘린 것이고 기준선 빌드도 같은 값이다. 전체 크기의 픽셀은 진단의 새 세션에서 쟀다(줄였다 되돌린 직후의 스크린샷으로 재지는 않았다). 창 · LynxView는 `0,0-1080,2340`. O10 (a) · (b): 통과(`lc` 0, pid 6923 같음). O10 (c): 전환마다 `create 1 · destroy 1 · relaunch_resume 0` — **기준선 `47600f41`도 같다**(플랫폼 동작). 재생성 뒤 맵이 다시 섰고 알약 픽셀은 제스처 2307 · 3버튼 2175(기대 2307 · 2175 — 제스처 값은 진단 스크린샷 `F1-api30-head-after-gestural.png`를 문서 단계에서 `pillbottom`과 같은 계산으로 잰 것). e2e 실행의 흰 화면은 그 전에 extra 없는 `am start`를 한 탓(debug 한정)으로 재현됐다. 모드 전환은 `enable` / `disable …gestural`로 했다 |
| 계측 API 37 | 통과 | Pixel_8 · 37 | `-r` 코드 집계 `0`이 7개, `-2` · `-4` 0개 |
| 계측 API 30 | 6 통과 + 1 건너뜀 | R6_API30 · 30 | `0`이 6개 + `-4`가 1개(IC5 — `the orientation lock is only ignored on API 36+`). 실행 전후 전역 설정 diff 없음 |
| 회귀 | **계측 일괄만** | Pixel_8 · 37 | `notClass`에 `ConfigurationChangeTest`를 더한 일괄 `OK (40 tests)`. `pnpm verify` · Maestro · `test-session-resume.sh` · `test-storage-restart.sh` · R8 ②는 이 실행에서 돌리지 않았다 |

## 절차 정정 기록

2026-10-06의 실행과 진단 · 접근성 점검이 이 문서의 첫 판에서 찾은 결함이다. 본문은 모두 고쳐져 있다 — 여기는 **무엇이 어떻게 틀렸는지**만 남긴다.

| 무엇 | 첫 판 | 사실 |
|---|---|---|
| 「재생성 없음」의 판정 | ActivityRecord 해시 + pid가 전후 같으면 통과(`same`), 보조로 `wm_relaunch_activity` 개수 | 해시 · pid는 **실제로 재생성된 O7에서도 같았다.** 재생성은 같은 프로세스 · 같은 레코드 안에서 일어난다. `wm_on_create_called` · `wm_on_destroy_called`(MainActivity)의 개수가 판정이고, 시스템이 다시 띄운 흔적은 `wm_relaunch_activity`가 아니라 `wm_relaunch_resume_activity`다 |
| O7의 기대 | `same`이 `DIFFERENT`(해시가 바뀐다) | 그 값은 나오지 않는다. `create: 1 destroy: 1 relaunch_resume: 1` |
| O10 (c) · N9의 기준(첫 번째 착오) | 모드 전환에 재생성이 없다 | 그 관찰은 두 오버레이가 모두 `[x]`인 AVD에서 일반 `cmd overlay enable`을 쓴 결과였다. 한 오버레이만 켜는 전환(설정 앱과 같은 동작)은 **그때의 빌드(`assetsPaths` 미선언)에서** API 30 · 37 모두 재생성됐고 기준선도 같았다 |
| O10 (c)의 기준(두 번째 착오) · 전제의 「모드 전환은 `configChanges`로 막을 수 없는 재생성」 | 재생성 허용(모든 API) — `CONFIG_ASSETS_PATHS`는 선언할 수 없다고 보았다 | **compileSdk 36부터 `assetsPaths`로 선언할 수 있다.** 선언해 직접 처리하게 됐고(`4f3b2927`), 기준이 API별이 됐다: API 36 이상은 재생성 0, API 35 이하는 재생성 허용 |
| 「API 30에서는 앱 루트가 `H − 268`까지만 닿는다」(실행 중의 판단) | 제품 차이로 보고 API별 기대값을 두려 했다 | **도구 차이다.** API 30의 `uiautomator dump`가 bounds를 앱 영역에서 자른다. 앱 루트는 화면 전체이고 탭 바 픽셀은 기대와 같다. 절대 위치는 스크린샷 픽셀로, 「창을 채운다」는 LynxView bounds로 판정한다 |
| O3의 헤더 | 헤더의 위 끝이 줄이기 전후 같다(「상태바 높이는 크기 변경으로 달라지지 않는다」) | 상태바 inset이 `wm size`에 따라 달라진다(132 → 106px). 같은 것은 「헤더 위 끝 − 상태바 inset」이다 |
| 기준 화면 | 학습 화면의 둘째 문항 이후, 맵에서 두 번 스와이프한 좌표 | 픽스처는 Lesson 1/1이고 답하면 몇 초 뒤 「All questions done」으로 넘어간다. 맵의 스크롤 위치는 실행마다 다르다. 180초는 진입 뒤 항목 여럿에는 모자란다 |
| O9의 버튼 이름 | 「Sign in with Google」 | 「Connect with Google」 |
| O10 (b)의 판정 | 앞이 런처 | 앞서 열어 둔 다른 앱일 수 있다 — 「`front`가 MainActivity가 아님」 |
| 앱을 다시 앞에 올리기 | extra 없는 `am start -n …MainActivity` | debug 빌드에서 그 뒤의 재생성이 3000 포트 기본값을 읽어 글자 없는 주황 한 면이 된다(ADR-0049 전에는 흰 화면) — `reopen`(extra 포함) |
| 되돌리기 | 늘 `enable …threebutton`, 회전 값은 0 | 시작 모드가 제스처일 수 있고, `[x]` 목록이 달라지면 그 한 줄로 돌아오지 않는다. 시작 값과 `[x]` 목록을 기록해 그 값으로 되돌린다 |
| O6의 전제와 판정 | 「방향 고정은 분할 화면에서 창에 적용되지 않는다」, 세 위치 모두 창을 채운다, O4가 안 되면 O6이 대신한다 | 분할 화면에서 고정이 **유지된다.** 가로 모양 영역에는 레터박스가 선다(받아들인 동작). O6은 O4를 대신하지 못한다. 분할 중 `appbounds`는 `0 0`이고 분할선은 끌 때마다 자리가 바뀐다 |
| O6의 가로 모양 영역 기준(둘째 판) | 레터박스 안에서 「내용과 조작부가 잘리지 않고 창 안에 전부 보인다」 | 관찰 없이 쓴 문면이었다. 높이 823에서 답 · 재생 버튼이 잘려 닿지 못한다(기준선도 같다). 판정은 「레터박스 안에 보이는 조작부의 탭이 듣는다」까지이고 잘림은 관찰 칸이다 |
| O6의 `letterboxReason` 읽기 · 복귀 판정 | `grep -m3 …`, 본문 `cmp` 같음 | `-m3`은 다른 레코드의 줄에서 멈춰 `letterboxReason`이 나오지 않는다. 전체 `cmp`는 시계 · 제스처 바로 늘 다르다 — 행 단위 비교나 눈 확인 |
| O8 회차 2 · O9 회차 1 · O10 (b)의 자극 | `wm size 1080x1920` | 높이만 바꾼 `wm size`는 구현 전 빌드에서도 API 37에서 재생성을 일으키지 않는다 — 구분력이 없다. 다크 모드 전환으로 바꿨다 |
| O8의 형태 | 재생을 확인한 뒤 별도 명령으로 구성 변경, `players` · `events`를 전후로 떠서 `diff` | 대사가 1.3 ~ 1.5초라 그 사이에 끝난다. 한 번의 `adb shell`에 탭 · 명령 · 읽기를 묶는다. `state:started`는 `AudioPlaybackConfiguration` 줄에만 있다 |
| O5의 되돌리기 기준 | 끝에서 `persist.sys.locale`이 기록값과 같아야 한다 | 시작 때 빈 값이면 목록을 되돌려도 `en-US`가 남는다. 언어 목록으로 본다. 확인 대화상자의 「Change」를 눌러야 실제로 바뀐다 |
| 시작값 표의 `accelerometer_rotation` | `0`이어야 한다 | 정해진 값이 없다(시작이 `1`인 실행이 있었다). 기록하고 끝에서 그 값으로 |
| O12의 `navmode` | API 30에서 실행해 본 적이 없다 — 안 되면 `enable`/`disable`로 대신 | `enable-exclusive --category`가 API 30에서 통했다 |
| O11의 조작 | `adb shell input` 스와이프 · 탭으로 포커스, 한 호출에 묶은 두 번 탭 | `input`은 접근성 입력 필터를 건너뛴다 — 포커스가 움직이지 않고 탭이 버튼을 누른다. 에뮬레이터 콘솔의 하드웨어 수준 터치로 바꿨다. TalkBack을 처음 켤 때의 알림 허용 대화상자는 `pm grant`로 미리 막는다 |

**도구의 실행 기록**(2026-10-06)

- **API 37**(②③④): `mark` · `lc` · `state` · `snap` · `sameproc` · `reopen` · `front` · `lynxbounds` · `sbar` · `navmode` · `restore_nav` · `tapdesc` · `near` · `pillbottom` · `globals` · `fixture`와
  O11의 `hwdown` · `hwup` · `explore` · `dtap` · `af` · `focusring` · `ring`이 문서가 말한 형식으로 출력했다(`mark` 뒤 `lc`는 `create: 0 destroy: 0 relaunch_resume: 0`, `lynxbounds` `0,0-1080,2400`, `sbar` `132`,
  `navmode` 왕복은 모드 `0`/`2`/`0`에 한 오버레이만 `[x]`, `restore_nav` 뒤 모드 `2`와 두 오버레이 `[x]`로 복원).
- **API 30**(③④): `lc` · `lynxbounds` · `pillbottom` · `near` · `navmode`(`enable-exclusive`) · `restore_nav` · `globals`가 통했다. `sbar`는 비어 나온다(O12에 대체). `edge … 4` · `appbounds`는 잘린 값을 낸다(쓰지 않는다).
- **⑤가 확인한 새 명령**(`33057ccb`): O8의 한 줄 묶음 명령(출력 형식 일치) · O5의 `settings get system system_locales`(`en-US`) · O12의 `mStable` 읽기(API 30: `mStable=[0,145][1080,2208]`).
  O6의 `letterboxReason` 읽기는 `-m3`이 붙은 형태가 틀렸고, `-m` 없는 형태로 `letterboxReason=FIXED_ORIENTATION`을 읽었다(⑤ · ⑥).
- **실행으로 확인되지 않은 것**: 이 판에서 O6의 grep을 `areBoundsLetterboxed=true`로 좁힌 줄(⑤ · ⑥이 돌린 것은 `-m` 없는 `grep -E` 형태이고 이 문서의 줄 그대로는 아니다), API 30에서의 O11 도구 전부와 O12 전체의 11값 빌드 재실행(⑤는 `mStable` 한 줄만), 맵 밖 화면에서의 `edge` · `appbounds`.
  그리고 **이 판의 절차를 처음부터 끝까지 그대로 돌린 실행은 없다.** 어긋나면 도구를 고치고 여기에 적는다.
