import UIKit

/// 호스트가 하는 일은 셋뿐이다 (ADR-0012 D2):
/// LynxView를 전체 화면으로 띄우고, 번들을 로드하고, 저장소 모듈을 제공한다.
/// 커스텀 UI를 만들지 않는다 — 화면은 전부 Lynx 쪽에 있다.
final class ViewController: UIViewController {
  private var lynxView: LynxView?

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .white

    let lynxView = LynxView { builder in
      let config = LynxConfig(provider: TemplateProvider())
      // 네이티브 모듈은 이 하나뿐이다 (ADR-0012 D2).
      // 두 번째가 필요해지면 ADR을 새 번호로 갱신해야 한다.
      config.register(StorageModule.self)
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
