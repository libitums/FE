import SafariServices
import UIKit

/// 개인정보처리방침 · 이용약관을 앱 위의 브라우저(`SFSafariViewController`)로 여는 호스트 네이티브
/// 모듈이다(ADR-0033). 메서드는 `open` 하나다.
///
/// **JS에게서 주소를 받지 않는다.** JS는 문서 이름(`privacy-policy` · `terms-of-use`)만 넘기고,
/// 주소는 이 파일의 표가 든다 — 나가는 목적지가 고정 두 곳으로 닫혀 있다(ADR-0026 D4의 경계를
/// 유지한다). 표에 없는 이름은 `invalid-arguments`다.
@objc(LegalDocumentModule)
final class LegalDocumentModule: NSObject, LynxModule {
  @objc static var name: String { "LegalDocumentModule" }

  @objc static var methodLookup: [String: String] {
    ["open": NSStringFromSelector(#selector(open(_:callback:)))]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  @objc func open(
    _ args: [String: Any],
    callback: @escaping LynxCallbackBlock
  ) {
    guard let url = LegalDocumentURL.url(for: args["document"]) else {
      callback(["status": "invalid-arguments"])
      return
    }

    // 화면을 띄우는 일은 UI라 main 스레드에서 한다(`WebAuthenticationModule`과 같은 관례).
    DispatchQueue.main.async {
      guard let presenter = LegalDocumentModule.topViewController() else {
        callback(["status": "failed"])
        return
      }
      let safari = SFSafariViewController(url: url)
      safari.dismissButtonStyle = .done
      presenter.present(safari, animated: true) {
        callback(["status": "opened"])
      }
    }
  }

  /// 전경 창의 맨 위 화면이다 — 이미 무엇이 떠 있으면 그 위에 띄운다.
  private static func topViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes
    // 전환 중이라 전경 scene이나 key window가 잠깐 없으면 첫 번째 것으로 물러선다.
    let windowScene =
      (scenes.first { $0.activationState == .foregroundActive } as? UIWindowScene)
      ?? (scenes.first as? UIWindowScene)
    var top =
      windowScene?.windows.first { $0.isKeyWindow }?.rootViewController
      ?? windowScene?.windows.first?.rootViewController
    while let presented = top?.presentedViewController {
      top = presented
    }
    return top
  }
}

/// 문서 이름 → 주소 표다 — 순수, `HostTests`가 잰다. 주소를 바꾸면 여기 한 곳만 고친다.
enum LegalDocumentURL {
  static let table: [String: String] = [
    "privacy-policy":
      "https://gregarious-pharaoh-bb6.notion.site/DURU-Privacy-Policy-3eb0c2540c01802cad91cc0430552402",
    "terms-of-use":
      "https://gregarious-pharaoh-bb6.notion.site/DURU-Term-of-Use-3eb0c2540c0180ef9072f0b447b3b468",
  ]

  static func url(for document: Any?) -> URL? {
    guard let name = document as? String, let raw = table[name] else { return nil }
    guard let url = URL(string: raw), url.scheme?.lowercased() == "https" else { return nil }
    return url
  }
}
