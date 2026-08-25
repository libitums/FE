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
      builder.config = LynxConfig(provider: BundleTemplateProvider())
      builder.screenSize = UIScreen.main.bounds.size
      builder.fontScale = 1.0
    }
    lynxView.layoutWidthMode = .exact
    lynxView.layoutHeightMode = .exact
    lynxView.translatesAutoresizingMaskIntoConstraints = true
    view.addSubview(lynxView)
    self.lynxView = lynxView

    lynxView.loadTemplate(fromURL: "main.lynx", initData: nil)
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
