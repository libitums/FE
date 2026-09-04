# ADR-0020 — Dynamic Type을 코어 배율 하나로 받는다 (요소별 opt-in을 쓰지 않는다)

- 상태: 채택
- 날짜: 2026-09-04
- 다루는 축: 시스템 글자 크기(Dynamic Type) · WCAG 1.4.4
- 관련: ADR-0012(호스트 경계) · ADR-0014(디자인 토큰) · ADR-0016 D6(자동/실기 경계) · LIB-224

## 맥락 — 「끄고 있던 한 줄」이 없었다

LIB-224는 이 진단으로 열렸다.

> `ViewController.swift`의 `builder.fontScale = 1.0` 한 줄이 Dynamic Type을 끄고 있다.

**틀렸다.** Pod을 열어 보니 그 값이 프레임워크 기본값이다.

```objc
// apps/ios/Pods/Lynx/platform/darwin/ios/lynx/LynxBaseConfigurator.mm:26
self.fontScale = 1.0;
```

우리 줄은 기본값을 다시 적은 것이고 **지워도 아무것도 바뀌지 않는다.** 끄는 코드가
있어서 꺼진 것이 아니라 **켜는 코드가 없어서 꺼져 있었다.**

**그래도 그 줄은 해로웠다.** 기본값을 명시적으로 적어 두면 「의도적으로 정한 값」처럼
읽힌다. 그래서 아무도 의심하지 않았고, LIB-221에서 *"Dynamic Type을 안 따라간다"*
를 관측하고도 원인이 여기로 오지 않았다.

**이 정정이 이 ADR의 첫 값이다** — 다음 사람이 한 줄 지우고 「고쳤다」고 하지 않게.

## 조사 — 경로가 둘이고 둘 다 꺼져 있었다

### (A) 코어 배율 — `builder.fontScale`

`shell_->SetFontScale()` → `lynx_env_config.font_scale_` → `CssMeasureContext`.

**`px`에 실제로 걸린다.** 이것이 이 결정의 전제여서 코드로 확인했다.

```cpp
// core/renderer/css/css_style_utils.cc:367
const float non_sp_font_scale =
    (is_font_relevant && !context.font_scale_sp_only_) ? context.font_scale_ : 1.f;
// :376  PX 분기
float float_value = value.GetNumber() * context.layouts_unit_per_px_ * non_sp_font_scale;
```

`is_font_relevant`는 호출자가 정하는데, **`font-size`는 `true`로 부른다.**

```cpp
// core/renderer/css/css_style_utils.cc:462  ResolveFontSize
const auto resolved_result = ToLength(value, css_context, configs, true);
```

`font_scale_sp_only_`는 기본 `false`(`lynx_env_config.h:96`)다. 우리 토큰이 전부
`px`(`--libitum-typography-*-font-size: 18px` 등)이므로 **토큰을 `sp`로 바꾸지 않아도
걸린다.**

**폭·높이·패딩은 안 걸린다** — 그 자리들은 `is_font_relevant`가 `false`다. 글자만
커지고 상자는 그대로라 **넘치는 자리가 드러난다.** 그것이 WCAG 1.4.4가 묻는 것이다.

### (B) 요소별 opt-in — `enable-font-scaling`

`LynxBaseTextShadowNode.m:605` prop setter → `LynxTextStyle.enableFontScaling` →
`applyFontScaling:` → `[UIFontMetrics scaledFontForFont:]`.

기본값 `NO`(`LynxTextStyle.m:36`). `@lynx-js/types`에 선언 **0건**, 우리 코드에 사용
**0건**.

## 결정 1 — (A)로 간다. (B)는 켜지 않는다

`builder.fontScale`에 시스템 배율을 넣는다. **`enable-font-scaling`은 어느 요소에도
붙이지 않는다.**

**왜 (A)인가 — 레이아웃 엔진이 배율을 안다.** (A)는 코어의 CSS 계산 단계에서 걸리므로
측정과 줄바꿈이 커진 글자 기준으로 난다. (B)는 코어가 잰 박스 위에 플랫폼 텍스트
계층이 `UIFontMetrics`를 다시 얹는 것이라 **엔진이 잰 크기와 그려지는 글자가 어긋날
수 있다.**

**그리고 (B)는 빠뜨려도 아무도 모른다.** 요소마다 붙여야 하는데 타입 선언이 없어
TS가 오타를 못 잡는다. **이 저장소는 정확히 그 모양으로 한 번 넘어졌다** —
`accessibility-value`가 `ui`에서 전부 green이었는데 iOS에 도달하지 않았다
(ADR-0016 `정정 기록`).

**둘을 같이 켜면 두 번 스케일된다.** 그래서 「(B)를 안 쓴다」가 취향이 아니라 규약이다.

**버린 대안 — 둘 다 안 켜고 토큰을 `sp`로 바꾼다.** `sp`는 `font_scale_sp_only_`와
무관하게 항상 배율을 받는다(`css_style_utils.cc:435`). 하지만 토큰은
`@libitums/design-tokens`가 내는 것이고 **이 저장소가 정하는 값이 아니다**
(ADR-0014 D1). 단위를 바꾸려면 패키지에 요청해야 하는데, (A)면 요청 없이 닿는다.

## 결정 2 — 설정 변경은 **다음 실행에 반영된다.** 실시간 갱신은 닿지 않는다

**처음에는 실시간으로 정했다가 실패로 판정을 바꿨다.** 그 경위를 남긴다.

의도는 이랬다 — 보조기술 사용자가 글자를 키우는 순간은 대개 「지금 안 보여서」이므로
다음 실행까지 기다리라는 것은 답이 아니다. `LynxView`가 `updateFontScale:`
(`LynxView.h:251`)를 공개하니 뷰를 다시 만들지 않고 배율만 갈아끼우면 화면 상태
(열린 시트·진행 중인 문항)도 살아남는다.

**안 됐다.** `updateFontScale:`을 붙였더니 실기에서 설정을 바꿔도 그대로였고 껐다
켜야 커졌다. `triggerLayout()`을 이어 붙이고 다시 봤을 때 **되는 것으로 보고했는데,
그것도 틀렸다** — 시뮬레이터에서 `simctl ui content_size`로 양방향(키우기·줄이기)을
재보니 스크린샷이 **바이트 동일**이었고, 사용자도 실기에서 재확인해 안 바뀐다고 정정했다.

원인이 Pod 소스에 있다.

| | 스타일 재계산 | 파이프라인 요청 |
|---|---|---|
| `UpdateColorScheme` (`element_manager.cc:733`) | `UpdateDynamicElementStyle` | **`RequestResolve(options)`** |
| `UpdateFontScale` (`element_manager.cc:722`) | `UpdateDynamicElementStyle` | **없음** |

`element_manager.cc` 전체에서 `RequestResolve` 호출은 **그 한 자리뿐**이다. 공개
API로 렌더 파이프라인을 다시 돌릴 길이 없다.

**버린 대안 둘.**

- **`updateColorScheme:`을 Dark→Light로 토글해 resolve를 강제한다.** 동작은 하겠지만
  **무관한 API에 기대는 편법**이고, 다크 규칙이 생기는 날 화면이 번쩍인다
- **`LynxView`를 다시 만든다.** 확실하지만 **열린 시트와 진행 중인 문항이 사라진다** —
  이 결정이 애초에 피하려던 바로 그것이다

**그래서 낮춰 적는다.** WCAG 1.4.4는 즉시성을 요구하지 않는다. 다만 **관찰자는
남긴다** — 값을 안 갱신하면 나중에 무엇이든 전체 리레이아웃을 일으켰을 때 **옛
배율로 그려진다.** 값은 맞춰 두고 그리는 것만 못 하는 편이 낫다.

**교훈 하나를 함께 남긴다.** 이 항목은 *"됐다"* 로 두 번 보고됐다가 두 번 뒤집혔다.
두 번 다 **걸어서 본 것**이었고, 뒤집은 것은 **픽셀 대조**였다. `docs/e2e/`가 *"인상으로
판정하지 않는다"* 를 반복해 적는 이유가 이것이다.

## 결정 3 — 배율은 `UIFontMetrics`가 낸다. 표를 손으로 적지 않는다

```swift
UIFontMetrics(forTextStyle: .body).scaledValue(for: 100) / 100
```

**Lynx가 가진 표를 쓰지 않는다.** `LynxTextStyle.m:100`의
`fontScaleWithSizeCategory:`는 값이 박혀 있는 표인데, **iOS 11 미만 폴백 경로
전용**이고(같은 파일 `applyFontScaling:`) 그마저 (B)가 켜져야 돈다. (A)로 가는 우리는
그 표에 닿지 않는다.

**손으로 적지 않는 이유**는 OS가 매핑을 바꾸면 손으로 적은 표는 그날 낡기 때문이다.
`UIFontMetrics`가 Apple의 정본이다.

**기준을 `.body`로 두는 것**은 이 앱의 글자가 대부분 본문 크기(12~18px)여서다.
제목만 다른 축으로 키우는 것은 이번에 하지 않는다.

## 결정 4 — 배율에 **2.0 상한**을 둔다. 스크롤이 들어오면 걷는다

> **갱신 (2026-09-04, LIB-226) — 걷었다. 이 결정은 뒤집힌 것이 아니라 실행된 것이다.**
> 이 결정이 *"스크롤이 들어오면 걷는다"* 를 스스로 조건으로 적어 뒀고 **그 조건이
> 발동했다** — 화면 다섯의 내용 영역이 스크롤 영역이 됐고
> ([ADR-0022](0022-scroll-regions-and-fixed-affordances.md)), `FontScale.cap`과
> `min(scaled / base, cap)`이 제거됐다. **아래 본문은 상한이 있던 동안의 기록으로 읽는다.**
>
> **`cap` 상수의 문서 주석이 지던 사실을 여기로 옮긴다**: 상한을 둔 **유일한 이유가
> 스크롤이 한 곳도 없다는 것**이었고, 그래서 그 상한은 「고친 것」이 아니라 「막아 둔
> 것」이었다. 스크롤이 들어온 지금 그 이유가 사라졌으므로 상한도 사라진다.
> **최대 배율은 다시 약 3.1배이고**, 그 배율에서 화면을 훑는 것이 `docs/e2e/`의 몫이다.

**처음에는 상한 없이 넣고 무엇이 깨지는지 보기로 했다.** 상한을 먼저 걸면 깨지는
자리가 가려지고, 가려진 것은 고칠 대상이 되지 못하기 때문이다.

**가려지지 않았고, 봤다.**

> **듣기 화면에서 보기가 아래로 밀려 `다음`에 닿을 수 없다.**
> — 2026-09-04, iPhone 13 mini, 최대 배율(AX3XL)

**시각 결함이 아니라 기능 상실이다.** 학습 루프를 완주할 수 없고, WCAG 1.4.4가
금지하는 것이 정확히 그것이다(*내용 또는 기능의 손실 없이*).

### 근본 원인은 배율이 아니라 **스크롤이 한 곳도 없다는 것**이다

**⟨당시⟩** `scroll-view` 사용이 저장소 전체에 **0건**이었다. 화면은 전부 고정 뷰포트의
flex 열이었고, **안 들어가는 내용은 닿을 방법이 없었다.** (지금은 여섯 건 —
[ADR-0022](0022-scroll-regions-and-fixed-affordances.md). 평가 화면이 여섯째다.)

`listening-screen.css`의 주석이 이미 경고하고 있었다.

> **Lynx flex는 웹의 자동 최소 크기를 만들지 않아 내용이 있어도 계속 줄어든다.**

D5의 `min-height` 일곱은 **라벨 잘림**을 고쳤지 이것을 고치지 못한다. 이건 한 상자의
높이가 아니라 **화면 전체의 세로 예산** 문제다.

### 그래서 2.0이다 — 다만 **1.4.4를 채우지는 못한다**

Apple의 최대 접근성 크기는 `.body` 기준 **약 3.1배**(17pt → 53pt)다. **WCAG 1.4.4가
요구하는 것은 200%**이고 2.0이 그 숫자다.

**⚠️ 이 상한이 1.4.4를 충족한다고 처음 적었는데 틀렸다.** 2.0에서 다시 재보니 —

> `다음`은 닿는데 **객관식이 상황에 따라 2~3개만 보인다.**
> — 2026-09-04, 같은 기기, 상한 적용 후

**내용은 여전히 사라진다.** 산수가 그렇게 나온다 (iPhone 13 mini, safe area 약 730pt,
배율 2.0. **padding·gap은 배율을 안 받고 `line-height`만 받는다**).

| | 계산 | 결과 |
|---|---|---|
| 화면 여백 + 블록 간격 | 12+24 + 16×3 | 84pt |
| 헤더 · 문항 · 액션 행 | 48 + (48+48) + 48 | 192pt |
| **보기에 남는 세로** | 730 − 84 − 192 | **454pt** |
| 보기 하나 (한 줄) | padding 32 + line-height 24→48 | 80pt → 넷이 **344pt, 들어감** |
| 보기 하나 (두 줄) | padding 32 + 48×2 | 128pt → 넷이 **536pt, 넘침** |

**두 줄이면 세 개까지만 들어간다.** 관측과 정확히 맞는다.

**더 낮추는 것은 답이 아니다.** 1.5로 내려도 두 줄이면 440pt로 아슬아슬하고,
무엇보다 **200% 아래로 내리면 그때는 표준 요구 자체를 못 맞춘다.** 못 맞추면서 더
작기까지 한 것은 모든 면에서 나쁘다.

### 그래서 이 상한이 실제로 한 일

**「기능 상실」을 「내용 손실」로 낮췄다.** 그 이상은 아니다.

- **전**: `다음`에 닿을 수 없다 → 학습 루프를 **완주할 수 없다**
- **후**: `다음`에 닿는다. 다만 보기 넷 중 **2~3개만 보인다**

**WCAG 1.4.4는 여전히 미충족이다.** 채우는 것은 스크롤이고 그것이 LIB-226이다.
**이 상한은 막아 둔 것이지 고친 것이 아니다** — 이 문단이 지워지면 다음 사람이
`cap = 2.0`을 보고 「1.4.4 대응 완료」로 읽는다.

**그래도 상한을 유지하는 이유**는 완주 불가능한 것보다 낫기 때문이고, 그것뿐이다.

**버린 대안 — 지금 `scroll-view`를 넣는다.** 진짜 해법이고 언젠가 한다. 다만 스크롤은
**화면 스물 몇 개에 번지는 결정**이다 — 어느 영역이 스크롤하고 어느 것이 고정인지
(헤더 · 액션 행)를 화면마다 정해야 하고, 계약의 요소 목록(§1.9)도 넓어진다.
**듣기 화면 하나에서 조용히 정할 성질이 아니다.** 별도 이슈로 뗀다.

**`scroll-view`가 쓸 수 있는 것은 확인했다** — Pod에 등록돼 있다
(`LYNX_LAZY_REGISTER_UI`). `<video>`처럼 타입에만 있고 등록이 없는 함정이 아니다.
**다만 등록된 UI는 열셋뿐이고 `IntrinsicElements`는 서른셋이다** — 그 격차가
`<video>`를 죽였다(ADR-0017).

## 결정 5 — Dynamic Type 아래서 **고정 높이는 하한으로 읽는다**

텍스트를 품은 상자에 `height`를 쓰지 않는다. `min-height`를 쓴다. **토큰 값은 그대로
쓰고 제약의 성질만 바꾼다** — 리터럴을 박지 않으므로 ADR-0014 D4에 걸리지 않는다.

> **갱신 (2026-09-04, LIB-226) — 이 결정의 적용 축이 가로로 넓어졌다.** 텍스트를 품은
> 상자에는 `height`뿐 아니라 **`width`도 쓰지 않는다. 하한(`min-width`)으로 쓴다** —
> **[ADR-0022 D6](0022-scroll-regions-and-fixed-affordances.md)**. **결정이 뒤집힌 것이
> 아니라 넓어진 것이다**: 아래 근거(*"잘린 내용은 사라진다"*)가 축을 가리지 않는데 이
> 결정이 세로만 적어, `.step-sheet-close`가 **같은 상자에서 세로만 하한으로 바뀐 채**
> 남았다. **아래 일곱 자리 표는 세로 축 그대로이고**, 가로 자리 하나
> (`.step-sheet-close`의 `min-width`)는 ADR-0022이 진다.

**왜 규약이어야 하나.** 이 축이 무는 자리는 **일곱이었고 전부 같은 모양**이었다.
`bottom-navigator.css` 하나만 고쳤을 때 `fe-66` 세션이 나머지 여섯을 실측해 넘겼다.

| 파일 | 셀렉터 | 라벨 |
|---|---|---|
| `components/bottom-navigator.css` | `.bottom-navigator` | 탭 라벨 넷 |
| `screens/journey-map/step-sheet.css` | `.step-sheet-start` | `시작` |
| `screens/journey-map/step-sheet.css` | `.step-sheet-close` | `닫기` |
| `screens/listening/listening-screen.css` | `.listening-screen-exit` | 뒤로 |
| `screens/listening/listening-screen.css` | `.listening-screen-next` | `다음` |
| `screens/listening/listening-screen.css` | `.listening-screen-finish` | **`결과 보기`** — 옛 라벨은 `맵으로 돌아가기`였고 **일곱 중 가장 길었다**(LIB-227이 문구와 목적지를 바꿨다). 셀렉터·값은 그대로다 |
| `screens/listening/listening-prompt.css` | `.listening-prompt-playback` | `듣기`/`멈춤` |

> **갱신 (2026-09-04, LIB-227) — 여덟째 자리가 붙었다.** 평가 화면의 나가는 수단이다.
> **결정은 안 바뀐다** — 새 화면이 이 규약을 적용받을 뿐이다.
>
> | 파일 | 셀렉터 | 라벨 |
> | --- | --- | --- |
> | `screens/assessment/assessment-screen.css` | `.assessment-screen-exit` | `맵으로` |
>
> **평가 화면에서 `min-height`를 지는 상자는 이 하나다.** 문항 행
> (`.assessment-item`)은 **하한을 걸지 않는다** — 텍스트를 품지만 높이를 내용이 정하고
> `padding`으로만 여백을 준다(LIB-227 design §4.1). **일곱을 여덟으로 세는 근거는
> 「`height`를 하한으로 바꾼 자리」이지 「텍스트를 품은 상자」가 아니다.**

**`min-height`가 이 저장소에 0건이었다.** 한 파일의 실수가 아니라 **규약의 공백**이다.
하나만 고치면 나머지 여섯이 *"실기에서 깨지는 걸 볼 때까지"* 남고, 고친 하나와 안
고친 여섯의 차이가 근거 없이 남는다. **일곱을 함께 바꾸고 여기 적는 이유가 그것이다.**

**잘라내지 않는다.** `text-overflow: ellipsis`로 한 줄에 가두는 쪽을 버렸다 —
**잘린 내용은 사라지고 그것이 WCAG 1.4.4가 금지하는 것**이다. 상자가 커지는 쪽이 맞다.

**확인된 것은 일곱 중 하나다.** `.bottom-navigator`만 최대 배율 스크린샷으로
전후를 봤다(2026-09-04). 나머지 여섯은 **같은 원인·같은 수정이라는 근거로 함께 고친
것이지 각각 관측한 것이 아니다.** 아래 대가 절이 그것을 재판정 대상으로 든다.
**나중에 붙은 여덟째(`.assessment-screen-exit`)도 미확인이고, 판정 자리는
`docs/e2e/assessment.md`의 E5다.**

**design-system에 올릴 것.** Bottom Navigator는 패키지가 스펙을 가진 컴포넌트다.
스펙이 높이를 고정으로 규정한다면 **Dynamic Type 아래서 그것을 하한으로 읽는 것이
맞는지**는 패키지가 답할 문제다. 보류 표에 행을 둔다.

## 대가

**e2e의 pt 수치 항목이 전부 재판정 대상이 된다.** `journey-map.md`의 열아홉은 이미
쟀으므로 그 측정이 무효가 된다. `listening.md`의 스물아홉은 **아직 안 쟀으므로 한
번만 잰다** — 이 시점을 고른 이유가 그것이다.

**일곱 중 여섯은 눈으로 확인되지 않았다.** 같은 원인으로 함께 고쳤을 뿐이므로
`journey-map.md`·`listening.md`의 최대 배율 훑기에서 각각 판정해야 한다.

**`listening.md` 9번은 지금까지 공허한 통과였다.** 입력이 안 바뀌어 실패할 수 없었다.
이 ADR이 채택되면 그 항목이 **처음으로 실패할 수 있게 된다.**

## 재검토 조건

- ~~최대 배율에서 화면이 못 쓰게 되는 자리가 나오면. 그때 결정 4(상한 없음)를 다시
  본다.~~ **발동했다 (2026-09-04)** — 듣기 화면의 `다음`에 닿을 수 없었고, 결정 4가
  상한 `2.0`으로 바뀌었다
- ~~**`scroll-view`가 들어오면 상한을 걷는다.** 그것이 상한을 둔 유일한 이유다.
  걷을 때 최대 배율(약 3.1배)에서 세 화면을 다시 훑는다~~ **발동했다 (2026-09-04)** —
  화면 다섯에 스크롤 영역이 들어갔고(ADR-0022) 상한을 걷었다. 최대 배율(약 3.1배)의
  훑기는 `docs/e2e/`의 실기 항목이 진다
- **제목과 본문이 같은 배율로 커지는 것이 문제가 되면.** 결정 3의 `.body` 기준을 다시
  본다
- **Android가 붙을 때.** `fontScale`은 Lynx 코어의 축이라 그대로 가지만, 값을 만드는
  쪽(`UIFontMetrics`)은 iOS 전용이다
