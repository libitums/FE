import UIKit

/// 호스트가 하는 일은 셋뿐이다 (ADR-0012 D2 · ADR-0017 D1):
/// LynxView를 전체 화면으로 띄우고, 번들을 로드하고, 네이티브 모듈을 제공한다.
/// 커스텀 UI를 만들지 않는다 — 화면은 전부 Lynx 쪽에 있다.
/// **커스텀 네이티브 엘리먼트도 만들지 않는다** (ADR-0017 D1이 명시로 더한 항목).
final class ViewController: UIViewController {
  private var lynxView: LynxView?

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .white

    let lynxView = LynxView { builder in
      let config = LynxConfig(provider: TemplateProvider())
      // **개수 상한은 없다. 입장 조건 셋이 있다** (ADR-0017 D1이 ADR-0012 D2의
      // `두 번째 네이티브 모듈 금지` 한 항목을 대체했다 — 그 D2가 말한 "새 번호"가
      // ADR-0017이고 이미 채택됐다).
      //
      // 하나 더 열려면 셋을 **전부** 만족해야 한다: (1) 화면 목록이 요구하고 그 능력
      // 없이는 화면이 정체성을 잃는다, (2) 스택 안에 대체 경로가 0개임을 확인하고
      // 훑은 자리를 적었다, (3) `docs/e2e/`에 사람이 판정할 항목으로 적을 수 있다.
      //
      // **목록은 `docs/adr/README.md`의 호스트 모듈 표가 든다.** 아래 줄 수를 세지
      // 말고 그 표를 본다 — 표의 각 행이 곧 Android 이관 항목이기도 하다 (D5).
      // 재검토 트리거는 숫자로 적혀 있다: **모듈이 넷째로 요구되는 시점**,
      // **한 모듈의 메서드가 다섯을 넘는 시점** (D2).
      //
      // **앞엣것은 이미 당겨졌다.** 손글씨 인식(LIB-263 탐침)이 그 시점이었고, 입장
      // 조건 셋을 통과해 아래에 섰다 — 손으로 쓴 글자를 읽는 능력 없이는 그 탐침이
      // 물음 자체를 잃고, Lynx 쪽에 래스터화 수단이 0개이며(`canvas` 선언 없음),
      // 사람이 눈으로 판정할 수 있다. 다음에 하나 더 여는 사람은 **트리거가 이미
      // 당겨진 뒤**라는 것을 알고 연다.
      config.register(StorageModule.self)
      config.register(AudioPlaybackModule.self)
      config.register(CompletionAnnouncementModule.self)
      config.register(HandwritingRecognitionModule.self)
      config.register(SpeechRecognitionModule.self)
      builder.config = config
      // Release 번들의 `/static/…` 이미지를 앱 번들 파일로 푼다(TemplateProvider.swift).
      // 이미지 서비스는 generic resource fetcher가 켜져 있을 때만 `shouldRedirectUrl`을
      // 부른다. 템플릿 fetcher는 두지 않으므로 번들 로드는 그대로 `TemplateProvider`가 맡는다.
      builder.enableGenericResourceFetcher = .true
      builder.mediaResourceFetcher = BundledMediaResourceFetcher()
      builder.screenSize = UIScreen.main.bounds.size
      // 시스템 글자 크기를 코어 배율로 넘긴다 (ADR-0020 D1).
      //
      // 이 줄은 원래 `= 1.0`이었다. 그것은 끄는 코드가 아니라 **프레임워크 기본값을
      // 다시 적은 것**이었고(`LynxBaseConfigurator.mm:26`), 그래서 「의도적으로 정한
      // 값」처럼 읽혀 아무도 의심하지 않았다. **켜는 코드가 없어서 꺼져 있었다.**
      builder.fontScale = FontScale.current(compatibleWith: nil)
    }
    lynxView.layoutWidthMode = .exact
    lynxView.layoutHeightMode = .exact
    lynxView.translatesAutoresizingMaskIntoConstraints = true
    view.addSubview(lynxView)
    self.lynxView = lynxView

    lynxView.loadTemplate(fromURL: Self.templateURL, initData: nil)
    observeContentSizeCategory()
  }

  /// 배율 **값**을 최신으로 유지한다. **화면은 다음 실행에 바뀐다** (ADR-0020 D2).
  ///
  /// **실시간 반영은 안 된다 — 재봤고 안 됐다.** `updateFontScale:`도
  /// `triggerLayout()`도 화면을 다시 그리지 않는다. `ElementManager::UpdateFontScale`
  /// (`element_manager.cc:722`)이 env를 갈고 스타일을 다시 계산하지만
  /// **렌더 파이프라인을 요청하지 않는다** — 바로 아래 `UpdateColorScheme`(:733)은
  /// 같은 자리에서 `RequestResolve(options)`를 부른다. `element_manager.cc` 전체에서
  /// `RequestResolve` 호출은 **그 한 자리뿐**이라 공개 API로 닿을 길이 없다.
  ///
  /// **그런데도 이 관찰자를 두는 이유**: 값을 안 갱신하면 나중에 무엇이든 전체
  /// 리레이아웃을 일으켰을 때 **옛 배율로 그려진다.** 값은 맞춰 두고 그리는 것만
  /// 못 하는 편이, 값까지 낡는 것보다 낫다.
  ///
  /// **이 주석이 「그 자리에서 커진다」로 되돌아가면 그것은 거짓이다.**
  /// 2026-09-04에 실기와 시뮬레이터 양쪽에서 안 되는 것을 확인했다.
  ///
  /// `registerForTraitChanges`는 iOS 17+이고 이 앱의 Deployment Target이 **17.4**다
  /// (PR #38 리뷰). `NotificationCenter` 관찰자를 손으로 등록·해제하지 않으므로
  /// `deinit`이 필요 없고, 클로저가 `self`를 강한 타입으로 받아 `[weak self]` 가드도
  /// 없다. **등록 해제를 잊어 새는 자리를 아예 만들지 않는 것이 요점이다.**
  private func observeContentSizeCategory() {
    registerForTraitChanges([UITraitPreferredContentSizeCategory.self]) {
      (vc: ViewController, _) in
      guard let lynxView = vc.lynxView else { return }
      lynxView.updateFontScale(FontScale.current(compatibleWith: vc.traitCollection))
      // **이 한 줄로 화면이 바뀌지는 않는다.** 위 문서 주석에 적은 그대로다 —
      // `triggerLayout()`까지 붙여도 다시 그려지지 않았고, 실기와 시뮬레이터 양쪽에서
      // 확인했다(ADR-0020 D2). 그래도 부르는 이유는 **레이아웃이 실제로 도는 다른
      // 계기가 왔을 때 새 배율 위에서 돌게 하려는 것**이다.
      //
      // **이 줄이 없어도 지금 보이는 동작은 같다.** 지우고 싶으면 지워도 되지만,
      // 지운 뒤에 「실시간으로 안 바뀐다」를 새 결함으로 보고하지 마라 — 원래
      // 안 바뀐다.
      lynxView.triggerLayout()
    }
  }

  /// 번들을 어디서 읽을지는 **빌드 구성이 가른다** (ADR-0012 D2).
  /// Explorer처럼 입력창을 두지 않는다 — 호스트는 커스텀 UI를 만들지 않는다.
  ///
  /// - Debug   → dev 서버. 화면을 고치면 다시 켜기만 하면 된다
  /// - Release → 앱 번들에 들어 있는 `pnpm build` 산출물의 사본
  ///
  /// 포트가 다르거나 다른 기기의 서버를 볼 때는 실행 인자로 덮어쓴다.
  /// `xcrun simctl launch booted com.libitum.host --bundle-url=http://…`
  private static var templateURL: String {
    let flag = "--bundle-url="
    if let arg = ProcessInfo.processInfo.arguments.first(where: { $0.hasPrefix(flag) }) {
      return String(arg.dropFirst(flag.count))
    }
    #if DEBUG
      return "http://localhost:3000/main.lynx.bundle"
    #else
      return "main.lynx"
    #endif
  }

  /// 크기를 `viewDidLoad`가 아니라 여기서 잡는다.
  /// `viewDidLoad` 시점의 `view.frame`은 최종 크기가 아니라서 레이아웃이 어긋난다.
  ///
  /// **LynxView는 전체 화면이다.** 예전에는 safe area 안에만 두었는데, 그러면 상태바와
  /// 홈 인디케이터 뒤는 호스트 배경(흰색)이 칠해져 화면이 가장자리 색을 정할 수 없었다
  /// (브랜드색 스플래시가 위아래 흰 띠를 달고 떴다). 이제 가려지는 크기를 globalProps
  /// `safeAreaInsets`로 넘기고, 앱 셸이 그만큼 안쪽 여백을 잡는다(mobile `lib/safe-area.ts`).
  /// Lynx에는 `env(safe-area-inset-*)`가 없어 이 경로가 유일하다.
  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    guard let lynxView else { return }

    let insets = view.safeAreaInsets
    if insets != lastSafeAreaInsets {
      lastSafeAreaInsets = insets
      lynxView.updateGlobalProps(with: [
        "safeAreaInsets": [
          "top": insets.top,
          "bottom": insets.bottom,
          "left": insets.left,
          "right": insets.right,
        ],
      ])
    }

    let bounds = view.bounds
    guard lynxView.frame != bounds else { return }
    lynxView.frame = bounds
    lynxView.preferredLayoutWidth = bounds.width
    lynxView.preferredLayoutHeight = bounds.height
    lynxView.triggerLayout()
  }

  private var lastSafeAreaInsets: UIEdgeInsets?
}
