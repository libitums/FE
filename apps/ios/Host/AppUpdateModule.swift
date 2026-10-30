import UIKit

/// App Store의 이 앱 페이지를 여는 호스트 네이티브 모듈이다(ADR-0086). 메서드는 `openStore` 하나다.
///
/// **JS에게서 주소를 받지 않는다.** 목적지는 이 파일의 `AppStoreURL` 하나로 닫혀 있다(ADR-0026 D4 · ADR-0033의
/// 경계 그대로). Apple App ID가 아직 없으면(`appleId == nil`) 열지 않고 `unconfigured`로 답한다 — 앱이 App Store에
/// 오르면 그 ID를 `AppStoreURL.appleId`에 넣는다.
@objc(AppUpdateModule)
final class AppUpdateModule: NSObject, LynxModule {
  @objc static var name: String { "AppUpdateModule" }

  @objc static var methodLookup: [String: String] {
    ["openStore": NSStringFromSelector(#selector(openStore(_:)))]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  @objc func openStore(_ callback: @escaping LynxCallbackBlock) {
    guard let url = AppStoreURL.url else {
      callback(["status": "unconfigured"])
      return
    }
    // 앱 전환은 UI라 main 스레드에서 한다(`LegalDocumentModule`과 같은 관례).
    DispatchQueue.main.async {
      UIApplication.shared.open(url, options: [:]) { opened in
        callback(["status": opened ? "opened" : "failed"])
      }
    }
  }
}

/// App Store 주소다 — 순수, `HostTests`가 잰다. ID를 바꾸면 여기 한 곳만 고친다.
enum AppStoreURL {
  /// Apple App ID(숫자). **아직 없다** — App Store Connect에서 앱이 만들어지면 채운다. 그 전에는 정책 파일에
  /// `min_build.ios`를 두지 않는다(두면 화면은 서지만 버튼이 스토어를 못 연다).
  static let appleId: String? = nil

  static func url(appleId: String?) -> URL? {
    guard let appleId, !appleId.isEmpty, appleId.allSatisfy(\.isNumber) else { return nil }
    return URL(string: "https://apps.apple.com/app/id\(appleId)")
  }

  static var url: URL? { url(appleId: appleId) }
}
