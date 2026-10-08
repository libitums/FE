# Duru Android 최소 호스트

`apps/mobile`의 Lynx 번들을 Android `LynxView` 하나에서 실행한다. 지금은 이미지·HTTP
서비스, 입력·SVG·오버레이 요소와 `StorageModule`·`WebAuthenticationModule`·
`LegalDocumentModule`·`AudioPlaybackModule`·`SoundEffectsModule`·`CompletionAnnouncementModule`·
`SpeechRecognitionModule`·`HandwritingTraceModule`·`AppReviewModule`·`SystemBackModule`을
제공한다. 네이티브 기능 전체의
iOS 동등성은 아직 없다([ADR-0038](../../docs/adr/0038-android-minimal-host.md)).

## 시스템 뒤로가기

시스템 뒤로가기(제스처·3버튼)는 Activity를 바로 끝내지 않고 Lynx 화면에 먼저 묻는다
([ADR-0043](../../docs/adr/0043-android-system-back.md)). `MainActivity`가 누름마다
`systemBackPressed` 전역 이벤트를 보내고, JS가 `SystemBackModule.respond`로 답한다.

| 상황 | 동작 |
|---|---|
| 열린 확인창·시트·모달이 있다 | 그 층만 닫힌다 |
| 쌓인 화면 | 그 화면의 보이는 닫기를 누른 것과 같다 |
| 롤플레이·설정 탭 루트 | 여정 탭으로 간다 |
| 여정 맵, 뒤로 수단이 없는 화면 | 앱을 백그라운드로 보낸다(`moveTaskToBack`). 다시 열면 같은 화면이다 |
| JS가 500ms 안에 답하지 않는다 | 앱을 백그라운드로 보낸다 |
| JS가 아직 준비되지 않았다(번들 로드 전·로드 실패) | Activity를 끝낸다(`finish`) |

JS의 준비 신호(`SystemBackModule.ready`)는 에뮬레이터 실측에서 시작 뒤 약 2.2초에 왔다. 그 전의
뒤로가기는 앱을 끝낸다. 판정은 Android 의존이 없는 `SystemBackGate`가 하고 `MainActivity`는
실행만 한다. API 33 이상은 `OnBackInvokedCallback`, 26~32는 `onBackPressed()`를 쓴다.

3버튼 내비게이션에서 하단 탭 바가 시스템 내비게이션 버튼과 겹쳐 그려지던 문제는 해결됐다
([ADR-0044](../../docs/adr/0044-android-tappable-inset.md), 아래 「시스템 바와 safe area」).

## 시스템 바와 safe area

호스트는 LynxView를 시스템 바 뒤까지 전체 화면으로 그리고, inset이 바뀔 때마다 globalProps 두 키를
한 번의 `updateGlobalProps`로 넘긴다(`MainActivity.publishSafeAreaInsets`, 값이 같으면 보내지 않는다).

| 키 | 값 | 출처 |
|---|---|---|
| `safeAreaInsets` | `{ top, bottom, left, right }` dp — 가려지는 가장자리 | `systemBars() \| displayCutout()` |
| `tappableBottomInset` | dp — 시스템 바 가운데 **터치를 가로채는** 아래 높이. 3버튼에서만 0이 아니다(Pixel_8 48), 제스처는 0 | `tappableElement()`의 아래 값, `safeAreaInsets.bottom`을 넘지 않게 자른다 |

iOS 호스트는 `tappableBottomInset`을 보내지 않는다(JS가 0으로 읽는다). 앱 셸은 탭 루트에서 이 값만큼 아래를
비우고 탭 바 밑에 같은 색의 바닥 면을 덧댄다. inset이 바뀌면(화면 크기 변경 · 모드 전환) 탭 바가 따라 바뀐다 — 내비게이션 모드 전환은 API 37에서는 Activity를 다시 만들지 않고 따라 바뀌고, API 30에서는 Activity 재생성을 거쳐 새 자리에 선다(API별 동작과 그 경계의 근거는 아래 「화면 방향과 구성 변경」). 규칙과 근거는
[ADR-0044](../../docs/adr/0044-android-tappable-inset.md)에, 에뮬레이터 절차는
[Android 내비게이션 바와 하단 탭 바](../../docs/e2e/android-navigation-insets.md)에 있다.

## 화면 방향과 구성 변경

`MainActivity`는 휴대폰에서 세로로 고정되고, 매니페스트가 선언한 구성 변경은 Activity를 다시 만들지 않고 받는다
([ADR-0047](../../docs/adr/0047-android-orientation-config-changes.md)). **Android만 세로로 고정하는 것은 사용자 결정이다**(2026-10-06, 그 ADR의 U1) — iOS iPhone은 가로를 허용해 두 플랫폼이 다르고, 휴대폰에서 WCAG 2.1 AA SC 1.3.4(Orientation) 불충족을 알고 받아들인 상태다(가로 레이아웃 후속 작업이 끝나면 고정을 푼다).

| 변경 | 동작 |
|---|---|
| 기기 회전(휴대폰) | 세로 그대로다(`screenOrientation="portrait"`). 구성 변경이 오지 않는다 |
| 다크 모드 · 화면 크기 · 분할 화면 · 큰 화면의 회전 · 시스템 언어 · 키보드 연결(`configChanges` 11값 가운데 10값: `orientation` `screenSize` `smallestScreenSize` `screenLayout` `uiMode` `locale` `layoutDirection` `keyboard` `keyboardHidden` `navigation`) | **재생성 없이** 같은 화면 · 같은 진행 상태로 새 창에 다시 배치된다. 재생 중인 소리 · 진행 중인 인증 · 뒤로가기의 준비 상태가 이어진다 |
| 내비게이션 모드 전환 · 시스템 글꼴 오버레이(11번째 값 `assetsPaths` — compileSdk 36부터 선언할 수 있다) | **API 36 이상: 재생성 없이** 탭 바가 새 모드의 자리로 간다. **API 35 이하: 선언이 무시되어 재생성된다** — 앱이 처음 화면부터 다시 서고 정상 화면이 선다. **관찰은 API 30과 API 37 두 점뿐이다. 경계를 36으로 본 것은 `assetsPaths` 속성이 SDK 36의 `attrs_manifest.xml`에 처음 나온다는 데서 온 추론이고, API 36 자체 · 26 ~ 29 · 31 ~ 35는 재지 않았다** |
| 글꼴 크기(`fontScale`) · 디스플레이 크기(`density`) · 선언하지 않은 그 밖의 값 | **재생성된다**(이 변경 전과 같다). 앱이 처음 화면부터 다시 서고 로그인 세션은 남는다. Lynx가 실행 중에 따라가지 못하는 값이다. `resourcesUnused`는 이 재생성까지 막으므로 선언하지 않는다 |

재생성 없이 받을 때 `MainActivity.onConfigurationChanged`가 하는 일은 둘이다. Lynx 4.0.1이 구성 변경을 스스로 듣지 않기 때문이다.

1. 실제 디스플레이 크기를 `lynxView.updateScreenMetrics(w, h)`로 다시 넘긴다(LynxView 자체의 크기는 측정이 스스로 따라간다).
2. `ViewCompat.requestApplyInsets(lynxView)`로 safe area를 다시 계산하게 한다(위 「시스템 바와 safe area」의 두 키가 새 창의 값으로 간다).

번들을 다시 읽지 않고, 어떤 값이 바뀌었는지로 분기하지 않는다. `assetsPaths` 때문에 더한 코드는 없다 — 오버레이가 inset을 바꾸면 2번이 새 값을 보낸다.

- **큰 화면**(최소 너비 600dp 이상 · API 36 이상)에서는 세로 고정이 듣지 않는다고 플랫폼 문서가 말한다(이 저장소에서 증명하지는 못했다 — 휴대폰 AVD의 흉내에서만 가로를 봤다).
  그때는 초기화되지 않고 창을 채우는 것까지만 보장하고 가로 배치의 보기 좋음은 보장하지 않는다.
- **분할 화면에서는 세로 고정이 유지된다.** 앱 영역이 세로 모양이면 창을 채우고, 가로로 넓은 모양이면 시스템이 세로 창을 가운데 세우고 좌우를 비운다(레터박스 — 받아들인 동작이다). 어느 쪽도 재생성되지 않고 레터박스 안의 터치는 듣는다.
  **가로 모양의 낮은 영역에서는 아래 조작부가 잘려 닿지 못할 수 있다**(높이 823px에서 듣기 문항의 답 · 재생 버튼이 창 밖이었고 스크롤로도 닿지 않았다). 보장하지 않는 것이다 — 이 변경 전의 빌드도 같은 높이에서 똑같이 잘렸고, 그 빌드는 분할선을 움직일 때마다 재생성되어 진행까지 잃었다. 작은 창 적응은 후속 과제다.
- `configChanges`의 값 집합은 `devtools/android-bundle/host-config-changes.mjs`가 판정으로 고정한다(`pnpm test:android-bundle`): 11값 가운데 하나라도 빠지면 `config-missing`, `density` · `fontScale`을 선언하면 `config-forbidden`,
  그 밖의 값(`resourcesUnused` 포함)을 선언하면 `config-unlisted`. 값을 더하거나 뺄 때는 ADR과 그 함수를 함께 고친다.

## 실행 화면과 런처 아이콘

앱을 켤 때 시스템이 그리는 구간(API 30 이하의 시작 창 · API 31 이상의 시스템 스플래시 · Lynx가 첫 프레임을 그리기 전의 창)은 JS 스플래시와 같은 주황 한 면이고,
런처 아이콘은 적응형이다([ADR-0049](../../docs/adr/0049-android-launch-appearance.md)). 전부 `app/src/main/res/`의 리소스와 매니페스트 `<application>`의 두 속성(`android:theme` · `android:icon`)이다 — `MainActivity`와 Gradle에는 이 일을 위한 코드가 없다.

| 리소스 | 내용 |
|---|---|
| `values/colors.xml` | `libitum_color_brand_primary`(`#F46B18` — 디자인 토큰 `--libitum-color-brand-primary`의 사본)와 그것을 가리키는 별칭 둘: `launch_background`(창 배경 · 스플래시 배경) · `ic_launcher_background`(아이콘 배경 레이어) |
| `values/` · `values-v27/` · `values-v31/`의 `themes.xml` | `Theme.Duru`. 창 배경과 투명 · 밝은 시스템 바 설정(`MainActivity.layoutEdgeToEdge`가 코드로 적는 값과 같다)을 테마에도 적어 `onCreate` 전의 창에 닿게 한다. API 27 속성(`windowLightNavigationBar`)은 `v27`부터, API 31 속성(`windowSplashScreenBackground` · `windowSplashScreenAnimatedIcon`)은 `v31`에만 둔다 |
| `drawable/splash_icon_none.xml` | 전부 투명한 drawable. 시스템 스플래시에 아이콘을 두지 않는다 |
| `mipmap-anydpi-v26/ic_launcher.xml` | `<adaptive-icon>` — 배경 `@color/ic_launcher_background`, 전경 `@mipmap/ic_launcher_foreground`. `<monochrome>` · `roundIcon` · API 25 이하 폴백은 없다(`minSdk` 26) |
| `mipmap-{mdpi,hdpi,xhdpi,xxhdpi,xxxhdpi}/ic_launcher_foreground.png` | 108 · 162 · 216 · 324 · 432px RGBA. iOS `AppIcon.png` 전체를 캔버스의 80/108로 줄여 가운데 두고 사방을 투명으로 둔 **사본**이다 |

- **토큰 색이 바뀌면 `colors.xml`의 값도 함께 바꾼다.** 어긋나면 `pnpm test:android-bundle`(= `pnpm verify`)이 실패한다(`host-launch-appearance.integration.test.mjs`의 HL2).
- **`Theme.Duru`를 고칠 때는 세 파일을 함께 고친다.** 한정자끼리 스타일이 합쳐지지 않아 `values-v27` · `values-v31`의 것이 `values/`의 것을 통째로 대체한다. `-night` 변형은 두지 않는다.
  어긋남(한 파일만 고침 · API 수준보다 낮은 한정자에 적은 속성 · 금지한 스플래시 속성 · `monochrome` 추가 등)은 `devtools/android-bundle/host-launch-appearance.mjs`의 판정이 같은 명령에서 잡는다. 값을 바꾸려면 ADR과 그 판정을 함께 고친다.
- **적응형 아이콘은 진짜 레이어 분리가 아니다.** 원본이 배경까지 합쳐진 한 장뿐이라 그림 전체가 전경이고 배경은 단색이다. 한계와 디자이너에게 요청할 원본은 ADR-0049의 D5 · 「후속 과제」가 진다.
- **API 31 이상에서는 시작 구간의 상태바 아이콘이 흰색이었다가 앱이 뜬 뒤 어두운 색으로 한 번 바뀐다.** 시스템 스플래시의 아이콘 명암은 플랫폼이 스플래시 배경색으로 정해 테마로 바꿀 수 없다(API 37 에뮬레이터 실측 — 같은 ADR의 「이 작업이 만든 변화」).
  **알고 받아들인 후퇴다(사용자 결정, 2026-10-06)** — 그 구간의 색 쌍 대비가 20.12:1에서 3.016:1로 낮아졌고 시계 글자는 텍스트 기준 4.5:1에 못 미친다. 화면에 따라 상태바 아이콘의 명암을 바꾸는 일(아래 「상태바 아이콘」 · ADR-0050)이 들어간 뒤에도 이 뒤집힘은 남는다 — 스플래시 표면은 표지를 달지 않아 검정 아이콘을 유지하고(그것이 맞다), 없애려면 브랜드 주황 자체를 더 어둡게 해야 한다(디자인 결정).
- **`Theme.Duru`는 `<application>`에 걸려 있어 `PushNotificationTapActivity`도 물려받는다.** 앱이 떠 있는 동안 알림을 눌러도 주황이 번쩍이는 프레임은 영상에서 관찰되지 않았다(API 37 에뮬레이터 — 한계는 [절차 문서](../../docs/e2e/android-launch-appearance.md)의 L11).
- **리소스 검사는 `values` · `values-v27` · `values-v31`(과 `values-night*`)만 본다.** 다른 한정자(`values-v33` · `values-land` · `mipmap-anydpi-v33` · `drawable-v31` 등)로 테마 · 색 · 아이콘 · 스플래시 drawable을 더하면 검사가 놓친다 — 더하지 않거나, 더할 때 검사부터 넓힌다(ADR-0049 「후속 과제」 6).
- **번들을 읽지 못하면 끝없는 주황 한 면이 보인다**(이 변경 전에는 회백색이었다). `debug` 빌드를 번들 서버 없이 띄웠을 때가 그렇다 — 스플래시가 길어진 것이 아니다.

### 전경 PNG 다시 만들기

iOS 앱 아이콘(`apps/ios/Host/Assets.xcassets/AppIcon.appiconset/AppIcon.png`)이 바뀌면 전경 다섯 장을 사람이 다시 만든다. 두 그림이 같은지 지키는 검사는 없다. macOS의 `swift`만 쓴다(CoreGraphics — ImageMagick · Pillow가 필요 없다). 저장소 루트에서:

```sh
swift apps/android/tools/generate-launcher-foreground.swift \
  apps/ios/Host/Assets.xcassets/AppIcon.appiconset/AppIcon.png \
  apps/android/app/src/main/res
```

밀도마다 `<밀도>: canvas …px, art …px, margin …px -> …/mipmap-<밀도>/ic_launcher_foreground.png` 한 줄을 낸다. 만든 뒤 `pnpm test:android-bundle`(HL3이 크기와 알파 채널을 본다)을 돌리고, 런처에서 마크가 잘리지 않는지는
[Android 실행 시 색과 적응형 아이콘](../../docs/e2e/android-launch-appearance.md)의 L4로 본다. 마크만 있는 원본이 오면 이 스크립트가 아니라 레이어 파일을 교체한다(ADR-0049 D5).

## 상태바 아이콘

앱의 창이 뜬 뒤 상태바 아이콘(시계 · 알림 · 신호 · 배터리)의 명암은 **화면이 단 표지를 호스트가 읽어** 정한다([ADR-0050](../../docs/adr/0050-android-status-bar-icons.md)). 새 호스트 모듈 · 전역 이벤트 · 매니페스트 · Gradle 변경은 없다.
이름은 전부 아이콘 색 기준이다 — `setAppearanceLightStatusBars(true)`는 「밝은 바」 = **어두운 아이콘**이라 뒤집혀 있다.

| 자리 | 하는 일 |
|---|---|
| 공유 JS `apps/mobile/src/lib/status-bar-icons.ts` | 상수 하나(`lightStatusBarIcons = "light-icons"`). 상단 띠를 어둡게 칠하는 요소가 `data-statusbar={lightStatusBarIcons}`를 단다 — 다는 자리와 새 화면의 규칙은 [화면 명세](../../docs/screens.md#상단-띠를-어둡게-칠하는-면은-상태바-표지를-단다)가 진다 |
| `StatusBarIcons.java` | 순수 판정(Android · Lynx import 없음). dataset 키 `statusbar` · 값 `light-icons`, 표지 값들 → `Tone`(`LIGHT` · `DARK`). **표지가 하나라도 있으면 밝은 아이콘**, 그 밖(없음 · `null` · 모르는 값)은 어두운 아이콘 |
| `StatusBarIconSync.java` | Lynx UI 트리를 걸어 표지를 모으고, 직전에 적용한 명암과 다를 때만 `setAppearanceLightStatusBars`를 부른다. 내비게이션 바는 건드리지 않는다. 트리 읽기에서 예외가 나면 로그 없이 직전 명암을 둔다(ADR-0050 「대가」) |
| `MainActivity` | `layoutEdgeToEdge`의 기본값(어두운 아이콘)은 그대로다. `LynxViewClient`의 `onFirstScreen` · `onPageUpdate` **안에서 곧바로** `statusBarIcons.sync(lynxView)`를 부른다 |

- **`sync`를 `post`로 미루지 않는다.** 미루면 62 ~ 210 ms 늦는다(API 37 에뮬레이터 실측). `StatusBarIconSync` 안에도 `post` · `Handler` · `Executor` · `Thread`를 두지 않는다 — 둘 다 `pnpm test:android-bundle`(= `pnpm verify`)의 규칙 `host-wiring`이 막는다.
  같은 콜백의 `AccessibilityTapBridge.sync`는 원래대로 `post`한다(건드리지 않았다).
- **JS의 상수와 호스트의 문자열 둘은 짝이다.** 한쪽만 고치면 같은 명령의 `marker-value` · `marker-key`가 실패한다. 판정은 `devtools/android-bundle/host-status-bar-icons.mjs`에 있다.
- **기본값으로 서는 때**: 번들이 뜨기 전 · 로드 실패 · JS 스플래시 · 재생성(글꼴 배율 등) 직후. `uiMode` · 화면 크기 변경과 HOME → 복귀에서는 호스트가 다시 하지 않아도 값이 남는다.
- **아이콘은 표면보다 늦게 바뀐다 — 확인한 범위에서 앱이 줄일 수 있는 것은 한 프레임이다.** Pixel/AOSP 에뮬레이터 이미지 둘(API 37 · API 30)의 SystemUI dex에서 아이콘 색이 120 ms 애니메이션으로 바뀌는 것을 확인했고(제조사 SystemUI는 확인하지 않았다), API 30 에뮬레이터(호스트 GPU) 실측으로 다 바뀔 때까지 약 150 ~ 160 ms다(앱 몫은 한 프레임). 기준과 판정 환경은 ADR-0050 D7이 진다.
- **Lynx를 올리면 아래 계측을 다시 돌린다.** 호스트가 Lynx의 `getDataset` · `onPageUpdate` · 클라이언트 호출 순서에 기대는데, 그것을 보는 계측은 에뮬레이터가 필요해 `pnpm verify`에 없다.
- iOS 호스트는 이 표지를 읽지 않는다 — iOS는 시스템이 스스로 고른다.

### 계측 `StatusBarIconsHostTest` 실행

8건(HI1 ~ HI8)이다. 실제 `MainActivity`를 띄워 세션을 심고 모의 HTTP로 여정 맵까지 간 뒤, 창의 외형 플래그 · `StatusBarIconSync.applyCount()` · LynxView 트리의 dataset을 본다.
**번들 서빙과 `-e bundleUrl`이 필수다** — 빠지면 `precondition: instrumentation argument bundleUrl is missing`으로 실패한다. 그래서 계측 일괄에서는 `notClass`로 빼고 따로 돌린다([출시 설정 절차](../../docs/e2e/android-release-config.md)의 R8 ④).

```sh
# 저장소 루트 — 모의 값으로 만든 번들을 서빙한다
PUBLIC_SUPABASE_URL=https://example.invalid PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
python3 -m http.server 18790 --bind 0.0.0.0 --directory apps/mobile/dist &
cd apps/android && ./gradlew :app:assembleDebug :app:assembleDebugAndroidTest
adb -s <기기> install -r -t app/build/outputs/apk/debug/app-debug.apk
adb -s <기기> install -r -t app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk
adb -s <기기> shell am instrument -w -r -e class com.libitum.host.StatusBarIconsHostTest \
  -e bundleUrl http://10.0.2.2:18790/main.lynx.bundle \
  libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner
```

- **판정**: 종료 코드가 아니라 출력 마지막의 `OK (8 tests)`(실패면 `FAILURES!!!`)와 케이스별 `INSTRUMENTATION_STATUS_CODE`로 본다.
  **`-r` 출력에는 코드 0이 10개 나온다**(테스트 8 + hi7 · hi8의 수치 보고 2) — 「0이 8개」로 세지 않고 `OK (8 tests)`와 테스트별 코드로 판정한다.
  API 37 · API 30 에뮬레이터 모두 `OK (8 tests)`였다(2026-10-06 — HI8은 두 기기 모두 `calls=10 toneChanges=4 mismatched=0`).
  HI4의 야간 모드 명령은 API 29부터라 그 아래에서는 건너뛴다(`-4` — 통과로 세지 않는다).
- **전제**: 시작할 때 시스템 야간 모드가 꺼져 있어야 한다. 끝난 뒤 일반 번들이 필요하면 `pnpm bundle:android`를 다시 돌린다.
- **에뮬레이터 전역 상태를 바꿨다 되돌린다** — HI4가 야간 모드를 켜고, 앱 저장소(`duru-storage`)를 백업한 뒤 세션을 심거나 비운다. Maestro · 다른 계측 · e2e 절차와 같은 기기에서 동시에 돌리지 않는다.
  러너가 중간에 죽었으면 `adb -s <기기> shell 'cmd uimode night no'`, 앱 저장소가 비거나 세션이 남았으면 개발용 기기에 한해 `adb -s <기기> shell pm clear libitum.duru.android`.
- **무엇을 증명하고 무엇을 못 하는가**: HI2 ~ HI6은 50 ms 간격 폴링이라 「결국 바뀐다 · 유지된다 · 적용 횟수」만 본다. **「화면 갱신과 같은 콜 안에서 적용된다」를 보는 것은 HI8 하나다** — 테스트가 자기 `LynxViewClient`를 더해 그 `onPageUpdate` 안에서 트리의 명암과 창의 플래그를 견준다.
  HI8의 실행값(`toneChanges=4`)은 단언의 하한과 같아 여유가 없다(ADR-0050 D7의 「HI8의 한계」). HI7은 여정 맵에서 `sync` 200회의 평균이 4 ms 미만인지 본다.
- 계측으로 닿는 화면은 온보딩 · 여정 맵 · 에피소드 표지 · 첫 서사 · 지표 모달이다. 시스템이 실제로 그린 픽셀(대비)과 전환 영상은 계측이 보지 못한다 — [Android 상태바 아이콘 명암](../../docs/e2e/android-status-bar-icons.md)의 에뮬레이터 절차가 진다.

## 준비

- Android Studio, Android SDK Platform 36과 Build Tools 36.0.0 (`compileSdk` · `targetSdk` 36, `minSdk` 26)
- JDK 17 (Gradle 8.11.1 · Android Gradle Plugin 8.9.2)
- 저장소의 [첫 설정](../../docs/conventions/workflow.md#첫-설정) 및 `pnpm install`

`apps/android`를 Android Studio에서 열거나 이 디렉터리에서 `./gradlew`를 실행한다.
프로젝트는 pnpm workspace 멤버가 아니다.

## 개발 서버와 HMR

저장소 루트에서 `pnpm dev`를 실행하고 Android 에뮬레이터에 Debug APK를 설치한다.
기본 번들 URL은 `http://10.0.2.2:3000/main.lynx.bundle`이다. 개발 서버가 다른
포트를 선택하면 출력된 포트를 실행 인자로 지정한다. 실기기에서는 서버가 표시한 LAN
주소를 사용한다.

```sh
cd apps/android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n libitum.duru.android/com.libitum.host.MainActivity \
  --es bundle-url http://10.0.2.2:3001/main.lynx.bundle
```

`-n`의 컴포넌트는 `<패키지>/<완전한 클래스 이름>`으로 쓴다. 패키지(`applicationId`)는 `libitum.duru.android`이고 Java 패키지(`namespace`)는
`com.libitum.host` 그대로라, 축약형 `libitum.duru.android/.MainActivity`는 없는 클래스다(아래 「패키지 이름과 출시 빌드」).

Debug 호스트는 Rspeedy의 WebSocket 연결과 변경분 파일을 읽는다. `apps/mobile/src`를
수정하면 앱을 다시 실행하지 않고 화면에 반영된다. 로컬 HTTP는 Debug에만 허용한다.

## HTTP 미리보기로 실행

저장소 루트에서 `pnpm bundle:android`로 번들을 만든 뒤 `pnpm preview`를 실행한다.
Android 에뮬레이터에서 `./gradlew assembleDebug`로 만든 APK를 설치한다. 기본 번들 URL은
`http://10.0.2.2:3000/main.lynx.bundle`이다. 출력된 포트가 다르거나 실기기를 쓰면
URL을 실행 인자로 지정한다. `/static/` 이미지는 같은 서버에서 읽는다.

```sh
adb shell am start -n libitum.duru.android/com.libitum.host.MainActivity \
  --es bundle-url http://10.0.2.2:3001/main.lynx.bundle
```

실제 포트는 `pnpm preview` 출력에서 확인한다. 화면 수정 후에는 번들을 다시 빌드하고
앱을 재실행한다. 반복 개발에는 위의 `pnpm dev`를 사용한다.

## APK 자산으로 실행

저장소 루트에서 `pnpm bundle:android`를 실행한다. 이 명령은 UI package와 모바일
번들을 빌드한 뒤 `main.lynx.bundle` 및 `static/`을 Android assets로 복사한다.
`pnpm dev`가 같은 모바일 `dist`를 덮을 수 있으므로 복사를 따로 하지 않는다.

```sh
cd apps/android
./gradlew assembleBundled
adb install -r app/build/outputs/apk/bundled/app-bundled.apk
```

`bundled`는 로컬 검증용으로 Android 디버그 키로 서명한다. `release`는 서명 없는 산출물을 만든다(아래 「패키지 이름과 출시 빌드」).
두 빌드 모두 복사된 Lynx 번들이 없으면 빌드를 중단한다.

## 패키지 이름과 출시 빌드

Play Console에 등록된 앱에 맞춘 설정이다. 결정과 버린 대안은 [ADR-0046](../../docs/adr/0046-android-play-release.md)이 진다.

| 항목 | 값 | 어디에 쓰이나 |
|---|---|---|
| `applicationId`(패키지) | `libitum.duru.android` | Play · Firebase 앱 · `adb`/`am`/`pm`의 대상 · Maestro `appId` |
| 계측 APK | `libitum.duru.android.test` | 러너 `libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner` |
| `namespace`(Java 패키지) | `com.libitum.host` — 바꾸지 않았다 | 소스 경로 `app/src/main/java/com/libitum/host/` · 클래스 이름(`-e class com.libitum.host.<Test>`, `…/com.libitum.host.MainActivity`) |
| `versionCode` · `versionName` | `2` · `0.1.0` | Play에는 `versionCode` 1이 올라가 있다 |

- **`versionCode`는 손으로 올린다.** Play에 올릴 커밋에서 `app/build.gradle`의 정수를 1 올린다. 빌드 인자로 받지 않는다 — 어느 커밋이 어느 번호인지 저장소가 알아야 한다.
- **서명은 저장소 밖이다.** `./gradlew bundleRelease`는 서명 없는 `app/build/outputs/bundle/release/app-release.aab`를 만들고, 업로드 키 서명은 사람이 `jarsigner`로 한다.
  `release` buildType에 `signingConfig`를 두지 않는다. 키 · 비밀번호를 저장소나 명령에 쓰지 않는다. 서명 · Play 업로드 · 실기 확인 순서는
  [Android 출시 설정 절차](../../docs/e2e/android-release-config.md)의 R9에 있다 — **2026-10-05 현재 아직 실행되지 않았다.**
- **`release` 빌드는 `app/google-services.json`이 있어야 한다.** 없으면 `verifyReleaseFirebaseConfig`가
  `Release build needs apps/android/app/google-services.json for libitum.duru.android …`로 멈춘다(FCM이 빠진 AAB가 Play에 올라가는 것을 막는다).
  `debug` · `bundled`는 파일 없이도 빌드된다. 파일은 추적하지 않으므로 워크트리마다 둔다(아래 「푸시 알림 Firebase 설정」).
- **옛 패키지와의 공존(개발 기기만).** 2026-10-05 이전 빌드로 설치한 `com.libitum.host`는 지워지지 않고 별도 앱으로 남는다(아이콘 둘 · 데이터 따로).
  둘 다 `duru://auth-callback`을 받으므로 함께 있으면 콜백에 앱 선택 창이 뜬다 — 소셜 로그인을 보기 전에 `adb uninstall com.libitum.host`.
  스크립트는 옛 앱을 지우지 않는다. Play 사용자는 처음부터 새 패키지만 가진다.

## 16 KB 페이지

Play는 64비트 네이티브 라이브러리가 16 KB 페이지를 지원하기를 요구한다. Lynx 4.0.1 · Fresco 2.3.0의 상류 AAR은 이를 통과하지 못하고 상위 버전도 풀지 못해,
**같은 버전을 16 KB로 다시 빌드한 AAR 9개**를 [`vendor-maven/`](vendor-maven/README.md)에 둔다. 출처 · 바꾼 라이브러리 · 패치 · 다시 만드는 법(`rebuild.sh`)은 그 README가 정본이다.

- **결선**: `settings.gradle`의 `exclusiveContent`가 그 9개 모듈을 `vendor-maven`에서만 찾는다. 좌표와 `app/build.gradle`의 의존 선언은 상류와 같다.
- **빌드 게이트**: `app/native-alignment.gradle`이 변형마다 `verify<Variant>ApkNativeAlignment`(`assemble<Variant>`) · `verify<Variant>BundleNativeAlignment`(`bundle<Variant>`)를 건다.
  APK · AAB의 64비트 `.so`(`arm64-v8a` · `x86_64`) 가운데 하나라도 기준을 어기면 `Native 16 KB page alignment check failed for <파일>: …`로 빌드가 실패하고,
  64비트 `.so`를 하나도 못 찾아도 실패한다. 기준은 LOAD 정렬만이 아니라 `GNU_RELRO` 끝까지 본다(LOAD만 맞아도 호환성 대화상자가 떴다).
- **같은 판정을 손으로**: `node devtools/android-bundle/elf-page-alignment.mjs <apk|aab|aar>...` — 실패가 있거나 검사한 것이 0개면 종료 코드 1.
- **의존 조정 둘**: `primjsWasm`(WebAssembly 엔진 — 앱이 쓰지 않고 `libwasm.so`가 정렬되지 않았다)을 설정 전체에서 제외하고, `androidx.datastore:datastore-core-android`의 하한을 1.2.1로 둔다(그 아래 판의 `.so`가 정렬되지 않았다).
- **Lynx · Fresco 버전을 올리면** `vendor-maven`을 그 버전으로 다시 만들어야 한다(`exclusiveContent`라 새 좌표를 상류에서 찾지 않는다). 상류가 판정을 통과하는 `.so`를 내면 `vendor-maven`과 `exclusiveContent`를 지운다.

16 KB 에뮬레이터에서의 확인 절차는 [Android 출시 설정 절차](../../docs/e2e/android-release-config.md)에 있다. 4 KB 페이지에서는 2026-10-05에 API 30 에뮬레이터 하나에서 재빌드한 `.so`의 로드와 `onBackPressed()` 경로 일부를 확인했다(그 문서의 R6 「실행 기록」). **API 26 ~ 29 · 31 ~ 32와 실기(4 KB 기기 포함)에서의 로드는 아직 확인되지 않았다**(R9 미실행).

## 확인

`PATH`에 JDK 17의 `javac`/`java`가 있을 때 `sh apps/android/test-host-paths.sh`를
저장소 루트에서 실행한다. 번들 복사는 `pnpm test:android-bundle`로 검증한다.
에뮬레이터를 실행한 상태에서 `apps/android/test-storage-restart.sh`를 실행하면
테스트용 세션의 저장·앱 프로세스 종료 후 복원·삭제 후 재시작을 확인한다. 실제
소셜 로그인과 서버의 토큰 갱신은 이 테스트에 포함되지 않는다.
전용 에뮬레이터에서 `E2E_UDID=<ID> sh apps/android/test-session-resume.sh`를
실행하면 모의 HTTPS 인증 응답으로 실제 Lynx 화면의 세션 갱신을 확인한다. 스크립트는
앱 데이터를 지우고 테스트용 설정으로 번들을 다시 빌드한 뒤, 서로 다른 앱 프로세스에서
세션 저장 → 갱신·여정 화면 → 재시작 후 재갱신·여정 화면 → 거부 시 세션 삭제·로그인
화면을 검증한다. 완료 후 일반 번들이 필요하면 `pnpm bundle:android`를 다시 실행한다.
`sh apps/android/test-web-auth-contract.sh`는 인증 URL·콜백 검증을, Android 계측
`WebAuthenticationModuleTest`는 난수와 잘못된 요청의 반환을 확인한다.
`LegalDocumentModuleTest`는 법률 문서 이름을 두 고정 HTTPS 주소로만 연결하는지 확인한다.
`AudioPlaybackModuleTest`는 공통 `.m4a` 자산 21개, 실제 재생 완료, 대체, 일시정지·재개,
중단·백그라운드 전환·오디오 포커스 손실과 복귀, 자산을 열지 못했을 때의 경고 로그를 확인한다.
`SoundEffectAssetTest`·`SoundEffectsSessionTest`(JUnit)는 효과음 id 8개와 `apps/ios/Host/sfx`의 1:1 대응, 로드 전 요청·벨
상태를, 계측 `SoundEffectsModuleTest`는 8개 자산 열기·벨 반복과 `stopRing`·`stopAll`을 확인한다.
오디오 자산(`apps/ios/Host/audio/*.m4a` 대사, `apps/ios/Host/sfx/*.mp3` 효과음)은 Android에 복사본을 두지 않는다. Gradle이 변형마다
`sync<Variant>HostAudioAssets`로 생성 소스 디렉터리에 옮겨 `assets/audio/`·`assets/sfx/`에 압축 없이 넣고, `assemble*`·`bundle*`이
`verify<Variant>ApkHostAudio`·`verify<Variant>BundleHostAudio`로 산출물을 검사해 원본과 다르거나 압축된 항목이 있으면 빌드를
실패시킨다. AAB 파일 안의 항목은 원래 전부 deflate로 보이며, 기기에 설치되는 분할 APK의 무압축은 AAB의 `BundleConfig` 무압축 글롭이
정한다. 2026-10-05 전의 결선은 태스크 의존을 걸지 않아 Android 빌드에 오디오가 0개였다
([ADR-0045](../../docs/adr/0045-android-host-audio-assets.md)). 결선이 되돌아가지 않았는지는 `pnpm test:android-bundle`이,
Gradle 산출물 자체는 `node --test devtools/android-bundle/packaged-assets.artifacts.mjs`(먼저 `./gradlew clean :app:assembleDebug
:app:assembleBundled :app:bundleRelease`)가 본다. 재생 실패는 logcat 태그 `AudioPlayback`(대사)·`SoundEffects`(효과음)의 `W`로 남는다.
효과음은 오디오 포커스를 요청하지 않고, 대사는 TalkBack 낭독 동안 멈췄다 이어진다 — iOS와의 차이는
[효과음 계약](../../docs/specs/ios-sound-effects.md#의도된-차이)에 있다. AAB 분할 설치로 소리·서사 배경 그림을 보는 에뮬레이터 절차는
[Android 효과음 · 대사 오디오 · 서사 배경](../../docs/e2e/android-assets.md)에 있다.
`CompletionAnnouncementModuleTest`는 완료 안내의 원문·콜백·실제 Android 접근성
공지 이벤트를 확인한다. 듣기 완료까지의 Maestro 절차는
[`docs/e2e/android-completion-announcement.md`](../../docs/e2e/android-completion-announcement.md)에 있다.
`SpeechRecognitionSessionTest`는 결과 한 번 반환과 입력 레벨 경계를,
`SpeechRecognitionModuleTest`는 권한·잘못된 인자·서비스 부재 페이로드를 확인한다.
말하기 화면의 마이크 권한 Maestro 절차는
[Android 음성 인식 검증](../../docs/e2e/android-speech-recognition.md)에 있다.
`HandwritingTraceMathTest`와 `HandwritingTraceModuleTest`는 안내 그림의 마스크 정렬,
팽창 판정, PNG와 채점 영역의 일치를 확인한다. 쓰기 화면의 터치·판정 Maestro 절차는
[Android 손글씨 검증](../../docs/e2e/android-handwriting-trace.md)에 있다.
`ReviewRequestGateTest`와 `AppReviewModuleTest`는 Play 리뷰 요청의 중복 방지,
`FakeReviewManager`를 통한 요청·실행 및 실패 후 재시도를 확인한다. 설문에서 호스트까지의
Maestro 절차는 [Android 평점 요청 검증](../../docs/e2e/android-app-review.md)에 있다.
`PushTokenCodecTest`와 `PushPermissionStateTest`는 FCM 저장 토큰과 권한 상태를,
`PushNotificationModuleTest`는 브리지·알림 채널·목적지 일회성 소비를 확인한다.
Maestro의 권한·설정·알림 탭 절차는
[Android 푸시 검증](../../docs/e2e/android-push-notifications.md)에 있다.
`PushTokenRefreshRelayTest`는 FCM 토큰 갱신 통지를 서비스에서 Activity로 넘기는 프로세스 안 중계의 판정
(리스너 없음 · 전달 한 번 · 뗌 · 순서가 뒤바뀐 재생성 · 대체 · 리스너 예외 삼킴)을 확인한다. 계측
`PushTokenRefreshHostTest`는 실제 `MainActivity`가 살아 있는 동안만 중계가 전달하는지를 보고 번들 · Firebase 설정
없이 계측 일괄에서 돈다. SDK가 실제로 `onNewToken`을 부르는 구간과 JS의 재등록 요청은 Google Play
에뮬레이터의 수동 절차(같은 문서의 「토큰 갱신」)가 본다.
`SystemBackGateTest`는 시스템 뒤로가기의 판정을 확인한다. 준비 전 누름의 종료, 대기 중
재누름 무시, `handled`·`leave` 응답, 500ms 무응답과 모르는 응답의 처리가 대상이며
`./gradlew testDebugUnitTest`로 실행한다. 실제 Activity에서의 에뮬레이터 절차는
[Android 시스템 뒤로가기 검증](../../docs/e2e/android-system-back.md)에 있다.
`SafeAreaInsetsTest`는 가장자리 px → dp 변환과 `tappableBottomInset`(3버튼 48 · 제스처 0 ·
safe 아래 값으로 자르기 · 음수와 밀도 불명은 0)을 확인하며 같은 명령으로 실행한다. 3버튼 · 제스처 ·
실행 중 전환의 에뮬레이터 절차는 [Android 내비게이션 바와 하단 탭 바](../../docs/e2e/android-navigation-insets.md)에 있다.
계측 `ConfigurationChangeTest`(8건)는 실제 `MainActivity`에서 구성 변경 뒤의 Activity 수명 · LynxView 크기 · screen metrics · 화면 상태 유지를 확인한다
(세로 유지 · 야간 모드 · 화면 크기 · 큰 화면 가로 · 내비게이션 모드 오버레이 전환은 같은 인스턴스, 글꼴 배율 · 밀도는 재생성). 번들 서빙과 `-e bundleUrl`이 필요하다.
기대는 API 37에서 8건 통과, API 30에서 6건 통과 + 2건 건너뜀(큰 화면 가로와 오버레이 전환 — 둘 다 API 36 이상에서만 성립한다. 건너뜀은 통과로 세지 않는다).
**이 클래스는 에뮬레이터 전역 설정(야간 모드 · 화면 크기 · 밀도 · 글꼴 배율 · 회전 · 내비게이션 모드 오버레이)을 바꿨다 되돌린다.** 그래서 계측 일괄에서는 `notClass`로 빼고 따로 돌리며,
Maestro · 다른 계측과 같은 기기에서 동시에 돌리지 않고, 중간에 죽었으면 되돌리기 명령을 한 번 더 돈다. 실행 줄 · 판정 · 되돌리기는
[Android 화면 방향과 구성 변경](../../docs/e2e/android-orientation.md#계측-configurationchangetest--실행법)에 있고, 회전 · 다크 모드 · 크기 변경의 에뮬레이터 절차도 그 문서가 진다.
계측 `LaunchAppearanceTest`(4건)는 실제 `MainActivity`에서 테마의 풀린 값(창 배경 `#F46B18` · 투명 바 · 밝은 상태바), 앱 아이콘이 `AdaptiveIconDrawable`이고 전경의 투명 여백이 80/108 배치와 맞는지 · `monochrome`이 없는지,
API 31 이상의 스플래시 배경과 아이콘 속성, 띄운 뒤에도 밝은 바와 edge-to-edge가 유지되는지를 확인한다. 번들 · 전역 설정 변경 없이 계측 일괄에서 돈다.
기대는 API 37에서 4건 통과, API 30에서 3건 통과 + 1건 건너뜀(스플래시 속성 — API 31 이상에서만 있다. 건너뜀은 통과로 세지 않는다).
리소스 · 매니페스트의 판정과 토큰 색 대조는 `pnpm test:android-bundle`이, 패키지된 APK의 리소스(적응형 아이콘 · `Theme.Duru`의 v27 · v31 구성 · `app_icon` 없음)는
`ANDROID_HOME=~/Library/Android/sdk node --test devtools/android-bundle/host-launch-appearance.artifacts.mjs`(먼저 `pnpm bundle:android`와 `./gradlew :app:assembleBundled`)가 본다.
시스템이 실제로 그리는 것(콜드 스타트 프레임의 색 · 런처의 마스크)은 계측이 보지 못한다 — 에뮬레이터 절차는 [Android 실행 시 색과 적응형 아이콘](../../docs/e2e/android-launch-appearance.md)에 있다.
`StatusBarIconsTest`(JUnit 9건)는 상태바 아이콘 명암의 순수 판정(표지 값들 → 명암 · 플래그 값 · 다시 적용해야 하는가)을 확인하며 `./gradlew testDebugUnitTest`로 실행한다.
표지의 자리 · JS와 호스트의 문자열 짝 · 등록부 · `MainActivity` 결선 · 연속 학습 모달의 운석 자리는 `pnpm test:android-bundle`(`host-status-bar-icons.unit.test.mjs` · `host-status-bar-icons.integration.test.mjs`)이 본다.
계측 `StatusBarIconsHostTest`(8건)는 실제 `MainActivity`에서 호스트가 트리의 표지를 읽어 창의 플래그를 바꾸는지 · 같은 명암끼리의 교체에서 다시 적용하지 않는지 · 구성 변경과 재생성 뒤의 값 · 호출 비용 · 화면 갱신과 같은 콜 안에서 적용되는지를 확인한다.
번들 서빙과 `-e bundleUrl`이 필요하고 야간 모드를 바꿨다 되돌려 계측 일괄에서는 `notClass`로 뺀다 — 실행 줄 · 판정 · 되돌리기는 위 「상태바 아이콘」의 「계측 `StatusBarIconsHostTest` 실행」에 있다.
기기 절차는 [`docs/e2e/android-host.md`](../../docs/e2e/android-host.md)에 있다.

## Maestro E2E

Maestro CLI와 전용 Android API 35 에뮬레이터를 준비한다. 흐름은 **세로 390×844,
160 dpi, 글자 배율 1.0** 기준이다. 에뮬레이터 크기를 확인하고 필요하면
아래처럼 맞춘다. 앱 상태를 지우므로 로그인된 기기에는 실행하지 않는다.
**`wm density` 재정의는 앱을 띄우기 전에 건다** — 밀도 변경은 Activity를 재생성한다(글꼴 배율도 같다). `wm size`를 앱이 뜬 채 걸면
같은 화면이 새 크기로 다시 배치된다(위 「화면 방향과 구성 변경」). 높이만 바꾸는 `wm size`는 이 변경 전의 빌드에서도 API 37에서는 재생성을 일으키지 않았다 — 「재생성이 사라졌다」의 증거로 쓰지 않는다.

```sh
adb -s <전용 에뮬레이터 ID> shell wm size 390x844
adb -s <전용 에뮬레이터 ID> shell wm density 160
adb -s <전용 에뮬레이터 ID> shell settings put system font_scale 1.0

# 저장소 루트: 실제 제공자 설정 대신 모의 URL을 번들에 포함한다.
PUBLIC_SUPABASE_URL=https://example.invalid \
  PUBLIC_SUPABASE_ANON_KEY=local-bridge-test pnpm bundle:android
cd apps/android
./gradlew assembleBundled
adb -s <전용 에뮬레이터 ID> install -r app/build/outputs/apk/bundled/app-bundled.apk
cd ../..
E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android
```

`test:e2e:android:host`는 온보딩과 로그인 화면을, `test:e2e:android:social`은
Apple·Google·Facebook의 인증 URL·PKCE·모의 딥링크 복귀를 각각 확인한다.
`test:e2e:android:legal`은 로그인 화면의 두 법률 문서 링크가 정해진 주소를
Custom Tab으로 열고 뒤로가기로 앱에 복귀하는지 확인한다.
`E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:audio`는 모의 진행으로 듣기
화면을 열어 자동 재생·다시듣기·이탈 시 중단을 확인한다.
`E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:speech`는 모의 진행으로 말하기
화면을 열어 마이크 권한 요청과 인식 서비스가 없는 AOSP의 건너뛰기 안내를 확인한다.
`E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:handwriting`은 모의 진행으로
쓰기 화면을 열어 안내 PNG, 터치 획, 네이티브 판정과 결과 화면을 확인한다.
`E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:review`는 모의 완료 상태에서
에피소드 설문 5점을 골라 `AppReviewModule.requestReview` 호출 1회를 확인한다.
`E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:push`는 모의 로그인 상태에서
알림 권한 요청·시스템 설정·로컬 알림 탭 뒤 화면 이동을 확인한다.
`test:e2e:android:small`은 320×640에서 글자 배율 1.0·1.3을 각각 적용해
온보딩 세 단계의 고정 버튼과 소셜 로그인 화면을 비교한다. 실행 뒤 390×844·1.0으로
돌린다. 네 흐름은 버튼의 접근성 이름으로 선택한다. `test:e2e:android`는 이 네 명령을
순서대로 실행한다.
로그인 후 설정 화면의 320×640·글자 배율 1.0·1.3 및 법률 링크는
`E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:signed-in`으로 검사한다.
모의 세션과 계측 APK를 사용하는 이 흐름의 범위는
[설정 화면 검증](../../docs/e2e/android-signed-in-settings.md)에 적었다.
Google Play 이미지의 TalkBack 검증은 별도 명령
`E2E_UDID=<전용 에뮬레이터 ID> pnpm test:e2e:android:talkback`을 사용한다.
이 명령은 모의 인증 번들과 APK를 다시 빌드·설치한다. 관찰 결과와 남은 수동 검증은
[TalkBack 검증](../../docs/e2e/android-talkback.md)에 있다.
실제 제공자 계정으로 로그인하거나 세션을 갱신하지는 않는다. 결과와 남은 항목은
[호스트 흐름](../../docs/e2e/android-host.md)과
[소셜 로그인 흐름](../../docs/e2e/android-social-login.md)에 적는다.
실제 Supabase 설정과 Chrome이 있는 전용 Google Play 에뮬레이터에서는
`E2E_UDID=<ID> pnpm test:e2e:android:social:live`로 계정 입력 전 제공자 페이지까지
사전 검증한다. 현재 Apple은 서버의 OAuth secret 누락 오류로 실패한다.
모의 설정의 APK를 검증한 뒤 배포용 번들이 필요하면 실제 설정으로
`pnpm bundle:android`와 Gradle 빌드를 다시 실행한다.

## 소셜 로그인 설정

초기 심사 버전의 로그인 화면에는 Apple·Google·Facebook 버튼만 있다. 세 버튼 모두
Android에서는 Custom Tab의 Supabase OAuth + PKCE를 사용한다. 앱은
`duru://auth-callback` 딥링크를 받으며, 이 값을 Supabase Auth Redirect URLs에
허용해야 한다. Google·Facebook 제공자에는 Supabase의
`https://<project-ref>.supabase.co/auth/v1/callback`을 등록한다. Apple 웹 OAuth에는
Apple Services ID와 웹용 secret을 준비하고, Supabase Apple provider Client IDs에
Services ID를 맨 앞에 둔다. iOS 네이티브 App ID는 뒤에 둘 수 있다.
`PUBLIC_SUPABASE_URL`과 `PUBLIC_SUPABASE_ANON_KEY`를 번들 빌드 전에 주입한다.
설정과 계정이 없는 빌드에서는 실제 로그인·재시작 A3를 통과로 판정하지 않는다.
Apple 계정 삭제는 Android에서 웹 OAuth를 다시 열고 Supabase PKCE 교환 응답의
`provider_refresh_token`을 삭제 함수에 일회성으로 보낸다. 함수의
`APPLE_WEB_CLIENT_ID`가 Supabase Apple provider의 첫 번째 Services ID와 같아야 한다.
제공자 토큰이 없거나 재인증한 Supabase 사용자 ID가 다르면 삭제를 중단한다.
실제 Apple 왕복은 제공자 설정과 테스트 계정이 준비될 때까지 미검증이다.

## 푸시 알림 Firebase 설정

Android 호스트는 FCM SDK와 `duru-updates` 알림 채널을 포함한다. Firebase 프로젝트에 Android 앱 `libitum.duru.android`를 등록한 뒤 받은 `google-services.json`을 `apps/android/app/`에 둔다. 이 로컬 파일은 Git에서 제외한다. 파일이 있으면 Gradle의 Google services 플러그인이 적용되고 SDK가 기본 Firebase 앱을 초기화한다. 파일이 없는 `debug` · `bundled` 빌드는 권한·알림 화면 검증은 되지만 FCM 토큰을 반환하지 않아 서버 기기 등록은 하지 않는다. `release` 빌드는 파일이 없으면 실패한다(위 「패키지 이름과 출시 빌드」).

서버에는 [FCM 전송 마이그레이션과 함수](../supabase-functions/README.md#android-fcm-확장-adr-0041)를 배포하고 `FIREBASE_SERVICE_ACCOUNT_JSON`을 Edge Function 시크릿으로 설정한다. 서비스 계정 키는 Android 앱이나 저장소에 넣지 않는다. 앱이 허용된 권한으로 열릴 때 현재 토큰을 읽어 기존 `register_push_device` RPC에 등록한다. FCM 토큰이 바뀌면 다음 앱 실행에서 다시 등록한다. 실제 원격 수신·백그라운드 탭은 서버 발송 인증이 준비될 때까지 미검증이다.

**앱이 살아 있는 동안 토큰이 바뀌면 다음 실행을 기다리지 않고 바로 다시 등록한다**([ADR-0048](../../docs/adr/0048-android-push-token-refresh.md)). `DuruFirebaseMessagingService.onNewToken`이 프로세스 안 중계(`PushTokenRefreshRelay`)를 부르고, 살아 있는 `MainActivity`가 인자 없는 전역 이벤트 `pushTokenRefreshed`를 메인 스레드에서 보내며, JS가 묻지 않고 등록을 다시 부른다. 이벤트는 토큰을 싣지 않고 쌓아 두지 않는다 — Activity가 없으면(서비스만 깨어난 경우) 통지는 버려지고 호스트는 아무것도 저장하지 않는다. 로그아웃 상태이거나 알림 권한이 없으면 등록하지 않는다. iOS 호스트는 이 이벤트를 보내지 않는다.
등록 요청이 떠 있는 동안 로그아웃하거나 다른 계정으로 바뀌면, 뒤늦게 성공한 등록은 기억하지 않고 그 요청에 쓴 인증으로 바로 해제를 보낸다(같은 ADR의 D5 — 공유 JS의 동작이고 vitest로만 확인했다. 기기에서 실행된 적은 없다).
이 경로가 닫는 것은 「앱 프로세스가 살아 있는 동안 바뀐 토큰」 하나다. 앱을 열지 않는 동안의 갱신은 여전히 다음 실행에서 반영되고, 앱을 홈 버튼으로만 오가는 동안에는(JS가 다시 부팅하지 않는다) 포그라운드 복귀 때 등록이 일어나지 않는다 — 후속 과제다(같은 ADR의 「남는 틈」). 2026-10-06에 API 37 Google Play 에뮬레이터에서 가짜 HTTP 서비스로 등록 요청이 한 번 더 나가는 것까지 확인했다. 실 서버의 행 · 원격 발송은 확인하지 않았다.

설정 파일의 `client_info.android_client_info.package_name`은 `libitum.duru.android`여야 한다. Google Play 서비스를 포함한 전용 에뮬레이터에서 토큰 발급과 브리지 반환을 확인한다. 이 계측 테스트는 명시적으로 실행할 때만 네트워크를 사용하며 토큰 값을 출력하지 않는다.

```sh
ANDROID_HOME="$HOME/Library/Android/sdk" FCM_UDID=emulator-5554 ./apps/android/test-live-fcm-token.sh
```

2026-10-02에는 API 35 Google Play 에뮬레이터에서 1건 통과했다(당시 패키지 `com.libitum.host`). 2026-10-05에 패키지를 `libitum.duru.android`로 바꾼 뒤 새 Firebase 앱 설정으로 API 37 Google Play 에뮬레이터에서 다시 1건 통과했다. 이 검증은 토큰 발급까지만 포함한다. 원격 발송과 알림 수신에는 같은 Firebase 프로젝트에 접근할 수 있는 서버 인증이 추가로 필요하다.
