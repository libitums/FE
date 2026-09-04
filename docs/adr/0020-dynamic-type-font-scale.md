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

## 결정 2 — 설정 변경을 앱 재시작 없이 따라간다

`builder.fontScale`은 뷰를 만들 때 **한 번** 읽힌다. 그것만 두면 사용자가 설정을 바꿔도
다음 실행까지 그대로다.

**보조기술 사용자가 글자를 키우는 순간은 대개 「지금 안 보여서」다.** 다음 실행까지
기다리라는 것은 답이 아니다.

`UIContentSizeCategory.didChangeNotification`을 받아 `LynxView.updateFontScale:`
(`LynxView.h:251`)를 부른다. **뷰를 다시 만들지 않는다** — 그러면 열려 있던 시트나
진행 중인 문항 같은 화면 로컬 상태가 사라진다(ADR-0007 D1).

### `updateFontScale:`만으로는 화면이 안 바뀐다 — 레이아웃을 걷어차야 한다

**처음 붙였을 때 실기에서 안 커졌다.** 설정을 바꾸고 앱으로 돌아와도 그대로였고,
**껐다 켜야 커졌다.** 즉 배율은 반영됐는데 아무도 다시 그리지 않았다.

원인이 Pod 소스에 있다. `ElementManager::UpdateFontScale`
(`core/renderer/dom/element_manager.cc:722`)과 바로 아래 `UpdateColorScheme`(:733)을
나란히 놓으면 한 줄이 빈다.

| | 스타일 재계산 | 파이프라인 요청 |
|---|---|---|
| `UpdateColorScheme` | `UpdateDynamicElementStyle` | **`RequestResolve(options)`** |
| `UpdateFontScale` | `UpdateDynamicElementStyle` | **없음** |

`SetRootOnLayout`과 `UpdateLynxEnvForLayoutThread`는 불리므로 **레이아웃 스레드는 새
배율을 들고 있다.** 남은 것은 그것을 돌리는 것뿐이라 `lynxView.triggerLayout()`을
이어 붙였고, **그 한 줄로 실기에서 그 자리에서 커졌다 (2026-09-04 확인).**

**이 한 줄을 지우면 조용히 옛 동작으로 돌아간다** — `updateFontScale:`은 여전히
성공으로 보이고 화면만 안 바뀐다. 자동 계층은 이것을 못 잡는다(ADR-0016 D6).

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

## 결정 4 — 상한을 두지 않는다. **이번에는**

Apple의 접근성 크기는 `.body` 기준 3배를 넘는다. 상한을 걸면 레이아웃은 지키지만
**사용자가 설정한 크기를 앱이 거부하는 것**이고 WCAG 1.4.4가 묻는 것에 어긋난다.

**그래서 이번에는 상한 없이 넣고 무엇이 깨지는지 본다.** 상한을 먼저 걸면 깨지는
자리가 가려지고, 가려진 것은 고칠 대상이 되지 못한다.

**이 결정은 관측 뒤에 다시 본다** — 아래 재검토 조건.

## 대가

**e2e의 pt 수치 항목이 전부 재판정 대상이 된다.** `journey-map.md`의 열아홉은 이미
쟀으므로 그 측정이 무효가 된다. `listening.md`의 스물아홉은 **아직 안 쟀으므로 한
번만 잰다** — 이 시점을 고른 이유가 그것이다.

**`listening.md` 9번은 지금까지 공허한 통과였다.** 입력이 안 바뀌어 실패할 수 없었다.
이 ADR이 채택되면 그 항목이 **처음으로 실패할 수 있게 된다.**

## 재검토 조건

- **최대 배율에서 화면이 못 쓰게 되는 자리가 나오면.** 그때 결정 4(상한 없음)를 다시
  본다. 상한이 아니라 레이아웃을 고치는 쪽이 먼저다
- **제목과 본문이 같은 배율로 커지는 것이 문제가 되면.** 결정 3의 `.body` 기준을 다시
  본다
- **Android가 붙을 때.** `fontScale`은 Lynx 코어의 축이라 그대로 가지만, 값을 만드는
  쪽(`UIFontMetrics`)은 iOS 전용이다
