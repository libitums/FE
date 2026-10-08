# ADR-0044 — Android 3버튼 내비게이션과 하단 탭 바: 터치를 가로채는 아래 높이

- 상태: **채택** — 에뮬레이터(Pixel_8 AVD · API 37)에서 3버튼 · 제스처 두 모드와 실행 중 전환으로 실행했다(2026-10-05).
  ⚠ D4(`globalPropsMode: "event"`)는 번들 공통 설정이라 iOS에도 닿는데, **iOS 실기 · 시뮬레이터에서 갱신 뒤 다시 그리는
  동작은 확인하지 않았다**(「확인한 것과 확인하지 못한 것」).
- 날짜: 2026-10-05
- 다루는 축: 호스트가 넘기는 아래쪽 시스템 바 값의 구분(가려짐 vs 터치 가로챔) · 탭 루트에서 셸과 탭 바가 아래를 나눠 지는 방식 ·
  화면 위 층(바텀 시트)이 아래를 비우는 방식 · 호스트의 globalProps 갱신이 화면에 닿는 방식
- 이어받는 결정: [ADR-0038](0038-android-minimal-host.md)(Android 최소 호스트), [ADR-0025](0025-ui-lynx-package-and-storybook-catalog.md)
  (`ui-lynx` 공용 컴포넌트), [ADR-0016](0016-assistive-technology-semantics.md) D5 · D9(잎 `<view>`와 층이 열린 동안 뒤쪽 가림).
  **바꾸는 결정은 없다** — `ui-lynx` `BottomNavigator` · `BottomSheet`, 화면 CSS, `ScreenWiring`, `SafeAreaInsets` 타입이 그대로다.

## 맥락

커밋 `444fcfd6`부터 Android 호스트는 LynxView를 시스템 바 뒤까지 전체 화면으로 그리고, 가려지는 가장자리 크기를 globalProps
`safeAreaInsets`(dp)로 넘긴다(`MainActivity.publishSafeAreaInsets`). 앱 셸(`AppSession`)은 이 값으로 안쪽 여백을 잡지만,
**탭 바가 서는 탭 루트에서는 아래를 비우지 않았다** — 탭 바가 화면 바닥까지 배경을 칠하고 아이콘만 고정 12 위에 두는 설계였다
(`packages/ui-lynx/src/bottom-navigator/bottom-navigator.css`, 위 8 · 항목 48 · 아래 12 = 68).

이 설계는 iOS 홈 인디케이터(34pt)와 Android 제스처 핸들(24dp)을 전제한다. 둘 다 **가리지만 터치를 가로채지 않는다.**
Android 3버튼 바(◁ ○ □, Pixel_8에서 48dp)는 터치를 가로챈다. 그래서 3버튼에서는 알약(바닥에서 12 ~ 60) 48 가운데 36이
시스템 바 밑에 깔려 탭이 거의 눌리지 않았다. 호스트가 넘기는 값이 `systemBars() | displayCutout()` 하나뿐이라 JS는 「그 바가
터치를 가로채는가」를 알 길이 없었다. Play Console 업로드 빌드의 출시 리뷰 지적이다.

## 결정

### D1. 호스트가 「터치를 가로채는 아래 높이」를 따로 넘긴다 — globalProps `tappableBottomInset`

| 키 | 타입 · 단위 | 보내는 쪽 | 없을 때 |
|---|---|---|---|
| `safeAreaInsets` | `{ top, bottom, left, right }` 수 · dp/pt | Android · iOS | 네 값 0 — **변경 없음** |
| `tappableBottomInset` | 수(유한 · 0 이상) · dp | **Android만** | 0 |

- 값은 `WindowInsetsCompat.Type.tappableElement()`의 아래 값을 dp로 바꾼 것이다. **3버튼에서만 0이 아니다**(Pixel_8 48).
  제스처 모드는 `tappableElement`가 0이다.
- 호스트는 `min(tappable.bottom, safe.bottom)`으로 자른다. androidx.core 1.15.0은 API 26 ~ 28에서 `tappableElement`를
  `getSystemWindowInsets()`로 대신하는데, 그 값에 키보드 높이가 섞일 수 있기 때문이다. 자르는 곳은 호스트 한 곳이고 JS는 자르지 않는다.
- 두 키는 한 번의 `updateGlobalProps`에 함께 실린다. 내비게이션 모드가 실행 중에 바뀌면 inset 리스너가 다시 불려 새 값이 간다
  (기존의 이전 값 맵 비교가 새 키까지 본다).
- 변환은 Android 의존이 없는 `SafeAreaInsets.globalProps`가 지고 JUnit `SafeAreaInsetsTest`가 잰다(3버튼 · 제스처 · 자르기 · 음수와 밀도 불명).
- JS 접점은 `apps/mobile/src/lib/safe-area.ts`의 `tappableBottomInsetFrom(globalProps)`이다. 키가 없거나 유한한 양수가 아니면 0이고 던지지 않는다.
  `safeAreaInsetsFrom` · `SafeAreaInsets` 타입은 바뀌지 않았다.
- **iOS 호스트 · Lynx Explorer · 테스트 환경에는 키가 없다 → 0.** 아래 D2 · D3의 식이 0에서 수정 전 식과 같아지므로 iOS와 Android
  제스처의 수치는 하나도 바뀌지 않는다.

### D2. 탭 루트에서는 셸이 `tappableBottomInset`만큼 비우고, 탭 바 묶음이 그 밑에 바닥 면을 덧댄다

판정은 순수 함수 `shellBottomLayout`(`apps/mobile/src/app/shell-bottom-layout.ts`)이 진다.

| 탭 바가 서는가 | `.app`의 padding-bottom | 탭 바 밑 바닥 면 |
|---|---|---|
| 아니오(쌓인 화면 · 진입 구간) | `safeAreaInsets.bottom`(전체 화면 그림 화면이면 0) — **변경 없음** | 없음 |
| 예(탭 루트) | `tappableBottomInset` | `tappableBottomInset` 높이 |

```text
.app  (padding-bottom = 위 표)                                  data-testid="app-shell"
├ .app-content  (탭 루트 화면 — 3버튼에서는 바닥에서 48 위에서 끝난다)
└ .app-navigator  (absolute · bottom 0 · 배경 없음)             data-testid="app-navigator"
   ├ BottomNavigator (ui-lynx, 68 그대로)
   └ .app-navigator-floor  (값이 0이면 요소를 만들지 않는다)       data-testid="app-navigator-floor"
```

- **탭 바 자신은 68 그대로다.** 바는 올라가지 않고 **아래로 길어진다** — 3버튼에서 바 면이 화면 바닥에서 0 ~ 116, 알약이 60 ~ 108이고
  알약과 시스템 바 사이가 12다. 바닥 면은 바와 같은 `--libitum-color-background-primary`이고 모서리 · 테두리 · 그림자가 없다.
- 묶음은 `apps/mobile/src/app/AppNavigator.tsx`가 그린다(판정하지 않고 `floorHeight`를 받아 그리기만 한다). 층이 열린 동안의 낭독 가림
  (`accessibility-elements-hidden`)은 묶음 루트에 붙어 바닥 면까지 덮는다.
- **탭 루트 화면은 바뀌지 않는다.** 화면이 재는 「바닥」은 콘텐츠 영역의 바닥이라, 셸이 48을 비우면 화면들의 스크롤 끝 여백 68
  (`spacing-64 + spacing-4`)과 스텝 말풍선의 아래 한계(잰 화면 높이 − 68)가 그대로 바 위 끝에 맞는다. 런타임 값을 화면까지
  넘기는 경로를 만들지 않았다 — `ScreenWiring` · 화면 props · 화면 CSS 변경 0건.
- 바닥 면은 3버튼 바 밑에 깔린다. 시스템이 그 구간에 흰 반투명 막을 얹지만 바닥 면이 바와 같은 색이라 이음매가 보이지 않는다(에뮬레이터 N2).

### D3. 화면 위의 바텀 시트는 소비자가 마지막 자식으로 빈 상자를 둔다 — `env(safe-area-inset-bottom)`에 기대지 않는다

`ui-lynx` `BottomSheet`의 패널 아래 여백은 `calc(spacing-20 + env(safe-area-inset-bottom))`이다(`bottom-sheet.css`).
**이 호스트에서 그 `env()` 항은 0으로 풀린다** — 에뮬레이터 3버튼에서 설문 시트의 `Not now`가 `[16,768][374,824]`였고 패널 아래
여유가 정확히 `spacing-20`(844 − 824 = 20)이었다. 버튼 56 가운데 아래 28이 시스템 바 밑이라, 아래쪽을 누르면 홈 버튼이 눌려 앱이
런처로 갔다. 원인은 **추정**이다: Lynx 4.0.1 네이티브에 그 이름은 있지만 이 호스트는 safe area를 CSS 환경값이 아니라 globalProps로만
넘긴다. `lib/safe-area.ts`의 「Lynx에는 `env(safe-area-inset-*)`가 없다」는 이 작업 전부터의 주석이고, 이 호스트에서 값이 없다는
결과만은 맞다. iOS에서 `env()`가 값을 주는지는 확인하지 않았다.

그래서 시트를 쓰는 화면이 스스로 비운다.

- `EpisodeSurveySheet` · `LoginCountrySheet`가 `BottomSheet`의 **마지막 자식**으로 높이 `tappableBottomInsetFrom(useGlobalProps())`의
  빈 `<view>`를 둔다(testid `episode-survey-inset` · `login-screen-country-inset`). 0이면 만들지 않는다. 상자는 줄지 않는다(`flex-shrink: 0`).
- `ui-lynx`는 고치지 않았다. 값이 0인 iOS · 제스처에서는 트리가 수정 전과 같아 `env()`가 iOS에서 듣든 안 듣든 수치가 바뀌지 않는다.
- 수정 뒤 `Not now`는 `[16,720][374,776]`, 시스템 바 위 여유 20이다.

**새 시트 · 새 바닥 고정 층이 지킬 규칙**

1. **바닥에 붙는 조작이 있는 층은 `tappableBottomInset`을 스스로 비운다.** `env(safe-area-inset-bottom)`이나 `ui-lynx`의 여백에
   기대지 않는다 — 이 호스트에서 0이다. `BottomSheet`를 새로 쓰면 위 두 시트처럼 마지막 자식으로 빈 상자를 둔다.
2. `position: fixed`로 셸의 padding을 벗어나는 층만 이 규칙의 대상이다. 셸 안에 서는 화면은 셸이 `safeAreaInsets.bottom`을 비우므로
   해당하지 않는다(쌓인 화면 · 진입 구간).
3. 이미 `safeAreaInsets.bottom`을 스스로 피하는 층(`JourneyStatModal` 등)은 3버튼의 48을 같은 경로로 피한다 — 둘을 더하지 않는다.
4. 빈 상자는 값이 0이면 만들지 않고, flex 축 안에 두면 줄지 않게 한다. 접근성 속성은 붙이지 않는다(ADR-0016 D5 — 잎 `<view>`).

### D4. 호스트의 globalProps 갱신이 화면을 다시 그리도록 `globalPropsMode: "event"`로 빌드한다

`apps/mobile/lynx.config.ts`의 `pluginReactLynx({ globalPropsMode: "event" })`.

에뮬레이터에서 앱을 켠 채 3버튼 ↔ 제스처를 바꾸자 탭 바가 따라 바뀌지 않았다(N9 — 다음 탭을 누를 때야 바뀌었다). 임시 로그로
원인을 가렸다(작업 산출물 `e2e-fix.md`):

```text
D TBDBG: listener tappable=0 bottom=24 same=false
D TBDBG: updateGlobalProps {safeAreaInsets={top=46.0, left=0.0, bottom=24.0, right=0.0}, tappableBottomInset=0.0}
I lynx: "TBDBG changed-hook {...,"tappableBottomInset":0}"
(이후 5초간 AppSession 렌더 로그 없음)
```

호스트는 새 값을 보냈고 JS의 `onGlobalPropsChanged`까지 닿았지만, `useGlobalProps()`를 쓰는 `AppSession`은 다시 그려지지 않았다.
이 저장소는 `globalPropsMode`를 정하지 않아 기본값 `reactive`였고, 그 모드의 `useGlobalProps`는 구독 없이 `lynx.__globalProps`를
읽기만 하며 `GlobalPropsProvider`도 통과 컴포넌트다(`@lynx-js/react` `runtime/lib/core/globalProps.js`). `event` 모드의
`useGlobalProps`는 `onGlobalPropsChanged`를 구독해 값이 오면 쓰는 컴포넌트가 스스로 다시 그린다. 앱의 globalProps 읽기는 전부
`useGlobalProps`이고(`AppSession` · `JourneyStatModal` · `GemPurchaseScreen` · 두 시트) `lynx.__globalProps` 직접 읽기는 없다.

**이 설정은 이 작업의 키 하나가 아니라 safe area 전달 전체에 닿는다.**

- 회전 · 컷아웃 변화 · 모드 전환 뒤 `safeAreaInsets`도 이제 바로 다시 그린다. 앞에서는 다음 상태 변경까지 낡은 여백이 남았다.
- **iOS에도 닿는다** — 번들 공통 설정이다. iOS `ViewController`도 `updateGlobalProps`로 safe area를 넘기므로(예: 회전) 같은 갱신 누락이
  있었을 것이고 이 설정이 그것을 고친다고 본다. 첫 렌더의 값은 같다. **iOS에서는 확인하지 않았다.**
- vitest 환경은 `__GLOBAL_PROPS_MODE__`가 정의되지 않아 fallback 경로를 탄다 — 테스트로 「갱신 뒤 다시 그린다」를 잡을 수 없다.
  설정이 지워지지 않게 지키는 것은 `apps/mobile/src/app/lynx-config.unit.test.ts`(UG1, 설정 파일 단언)와 e2e N9 절차다.

⚠ **낡은 주석(후속 정리)**: `apps/mobile/src/app/index.tsx`의 「`GlobalPropsProvider`가 있어야 호스트가 뒤늦게 넘기는 safe area 값에
`useGlobalProps`가 다시 그립니다」와 `apps/mobile/src/lib/safe-area.ts`의 「값이 오면 `useGlobalProps`가 다시 그립니다」는 기본
`reactive` 모드에서 사실이 아니었고, `event` 모드에서도 다시 그리는 것은 Provider가 아니라 훅의 구독이다. 제품 코드 파일이라 이
문서 작업에서 고치지 않았다. 다음에 그 파일을 고치는 작업이 이 D4를 가리키게 고친다.

## 버린 대안

| 대안 | 버린 이유 |
|---|---|
| JS에서 플랫폼 문자열로 분기 | 3버튼과 제스처를 가르지 못한다(둘 다 Android). `insets.bottom`을 통째로 쓰면 제스처에서 바가 24 높아진다. 테스트가 플랫폼 스텁에 묶인다 |
| 호스트가 LynxView를 시스템 바 위까지만 그린다 | `444fcfd6`이 푼 문제(가장자리까지 그림을 까는 화면 · 스플래시의 띠)가 돌아온다. targetSdk 35부터 시스템이 전체 화면을 강제하고, 바 밑이 바 배경이 아니라 창 배경이 된다 |
| 탭 바가 `safeAreaInsets.bottom`을 항상 반영 | iOS에서 바가 68 → 102가 된다. iOS 불변 조건 위반 |
| 셸 여백으로 탭 바를 통째로 올린다 | 바 밑에 셸 배경이 띠로 드러나 「바 배경은 바닥까지, 아이콘만 위로」가 깨진다. D2는 바를 올리지 않고 바닥 면으로 아래를 잇는다 |
| `safeAreaInsets` 객체에 다섯째 필드 | `SafeAreaInsets` 타입이 화면 props · 테스트 픽스처의 리터럴로 여러 곳에 선다. 필수 필드가 늘면 전부 고쳐야 하고, 화면은 이 값을 쓸 일이 없다 |
| `ui-lynx` `BottomNavigator`에 여백 prop | 공용 API가 넓어지고 `dist` 예산 여유가 작다. 단위 테스트가 `padding` 선언을 문자열로 고정하고, shorthand에 `calc`가 섞이면 Lynx가 선언을 버린다 |
| 바텀 시트 여백을 `ui-lynx` `BottomSheet`에서 고친다 | 공용 API가 넓어진다. `env()`가 iOS에서 값을 주는지 모르는 채 패널 여백을 바꾸면 iOS 수치가 바뀔 수 있다 — 소비자가 0일 때 아무것도 만들지 않는 쪽은 iOS 트리를 건드리지 않는다 |

## 대가

- **호스트 → JS 계약에 키가 하나 늘었다.** iOS 호스트는 보내지 않으므로, iOS에서 같은 구분이 필요해지면(터치를 가로채는 아래 바가 생기면)
  iOS 호스트도 이 키를 보내야 한다.
- **바닥 고정 층은 규칙(D3)을 스스로 지켜야 한다.** 새 시트가 빈 상자를 빠뜨려도 iOS · 제스처 · 테스트 기본값에서는 아무것도
  빨개지지 않는다(값이 0). 잡는 것은 3버튼 에뮬레이터 확인뿐이다.
- **탭 루트의 콘텐츠 영역이 3버튼에서 48 짧다.** 화면이 아니라 셸이 지는 값이라 화면 쪽 수치는 그대로지만, 「화면 높이」를 재는
  코드는 콘텐츠 영역의 높이를 받는다.
- **globalProps 갱신마다 그 값을 쓰는 컴포넌트가 다시 그린다**(D4). 호스트는 값이 바뀔 때만 보내므로(모드 전환 · 회전 · 컷아웃) 드물다.
- **3버튼 바 높이 48 · 제스처 24는 Pixel_8 · API 37 한 기기의 실측이다.** 식은 그 수에 기대지 않지만 다른 제조사 바를 잰 적은 없다.

## 확인한 것과 확인하지 못한 것

| 무엇 | 상태 | 증거 |
|---|---|---|
| 3버튼 탭 루트: 알약이 시스템 바 위 12에 서고 눌린다 · 바 면이 바닥까지 한 면 | 에뮬레이터 통과 | [절차 문서](../e2e/android-navigation-insets.md) N1 · N2 |
| 제스처 모드 수치 불변(가운데 탭 선택 포함) | 에뮬레이터 통과 | 같은 문서 N3 |
| 화면 위 층 · 전체 화면 그림 화면 · 쌓인 화면의 하단 조작 | 에뮬레이터 통과(닿은 화면만) | 같은 문서 N4 ~ N6. 닿지 못한 화면은 코드 판정 |
| 설문 시트 `Not now`(D3) | 첫 실행 실패 → 빈 상자 뒤 통과 | 같은 문서 N7 |
| 실행 중 모드 전환(D4) | 첫 실행 실패 → `event` 모드 뒤 통과(재시작 없음) | 같은 문서 N9 |
| iOS 수치 불변 | 단위 · ui · integration 계층(키 없음 → 0) | `shell-bottom-layout.unit.test.ts` · `AppNavigator.ui.test.tsx` · `App.system-insets.integration.test.tsx` |
| API 26 ~ 28의 `min` 자르기 | JUnit만 | `SafeAreaInsetsTest` |
| **iOS에서 `event` 모드의 갱신 뒤 다시 그림(회전 등)** | **확인하지 못했다** | 없음 |
| **TalkBack을 켠 상태** | **실행하지 않았다** | [절차 문서](../e2e/android-navigation-insets.md) T1(미실행) |
| 탭 바 위 모서리 라운드(3버튼) | 관찰하지 못했다 — 모서리 뒤로 색 있는 콘텐츠가 지나가는 화면을 만들지 못했다 | 같은 문서 N2 |
| 가로 모드에서 3버튼 바가 옆에 서는 경우 | 범위 밖 | — |

## 재검토 조건

- **iOS에서 `globalPropsMode: "event"` 뒤 회전 · 여백 깜빡임 · 재렌더 문제가 하나라도 관측되면** → D4. iOS에서 갱신 뒤 다시 그림을 먼저 확인한다.
- **`BottomSheet`를 쓰는 화면이 하나 더 생기면** → D3. 소비자마다 빈 상자를 두는 대신 `ui-lynx`가 값을 받게 할지 본다.
- **Lynx가 이 호스트에서 `env(safe-area-inset-bottom)`에 값을 주게 되면**(호스트가 CSS 환경값을 넘기거나 SDK가 바뀌면) → D3의 빈 상자와
  `env()` 항이 겹친다. 둘 중 하나를 걷는다.
- **iOS 호스트가 `tappableBottomInset`을 보내야 할 사정이 생기면** → D1의 「Android만」.
- **가로 모드 지원이 요구되면** → D1. `tappableElement`의 좌 · 우 값과 셸의 좌우 여백을 함께 본다.
- **탭 바 높이(68)나 고정 몫 12가 바뀌면** → D2. 바닥 면의 높이는 바뀌지 않지만 화면들의 스크롤 끝 여백이 그 값을 따라야 한다.
