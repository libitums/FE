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
      config.register(StorageModule.self)
      config.register(AudioPlaybackModule.self)
      builder.config = config
      builder.screenSize = UIScreen.main.bounds.size
      builder.fontScale = 1.0
    }
    lynxView.layoutWidthMode = .exact
    lynxView.layoutHeightMode = .exact
    lynxView.translatesAutoresizingMaskIntoConstraints = true
    view.addSubview(lynxView)
    self.lynxView = lynxView

    lynxView.loadTemplate(fromURL: Self.templateURL, initData: nil)
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
  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    guard let lynxView else { return }
    let safe = view.safeAreaLayoutGuide.layoutFrame
    guard lynxView.frame != safe else { return }
    lynxView.frame = safe
    lynxView.preferredLayoutWidth = safe.width
    lynxView.preferredLayoutHeight = safe.height
    lynxView.triggerLayout()
  }
}
