import Foundation
import UIKit

/// 위기 안내 카드가 여는 주소 규칙이다(ADR-0125). 전화(`tel:` 번호 — 공백은 걷는다)와 `https` 웹 주소만 열고, 그 밖은 nil.
/// JS `isOpenableExternalUrl`과 같은 표를 HostTests가 잰다. 끝은 `\z` — ICU의 `$`는 끝 줄바꿈 앞에서도 맞는다.
enum ExternalLinkPolicy {
  private static let tel = try! NSRegularExpression(pattern: "^tel:\\+?[0-9][0-9 -]*\\z")
  private static let https = try! NSRegularExpression(pattern: "^https://[^\\s/?#]+([/?#]\\S*)?\\z")

  static func target(_ url: String) -> URL? {
    let range = NSRange(url.startIndex..., in: url)
    if tel.firstMatch(in: url, range: range) != nil {
      return URL(string: url.replacingOccurrences(of: " ", with: ""))
    }
    if https.firstMatch(in: url, range: range) != nil {
      // 인코딩되지 않은 유니코드(한글 경로 등)는 `URL(string:)`이 nil을 낸다 — 퍼센트 인코딩해 다시 읽는다(PR #412 리뷰).
      return URL(string: url) ?? url.addingPercentEncoding(withAllowedCharacters: urlAllowed).flatMap(URL.init(string:))
    }
    return nil
  }

  /// 주소에 이미 쓰인 구분자(`/` `?` `#` `&` `=` `%`)는 그대로 두고 나머지만 인코딩한다.
  private static let urlAllowed = CharacterSet.urlQueryAllowed.union(CharacterSet(charactersIn: "#"))
}

/// 위기 안내의 전화 · 웹 주소를 시스템에 넘기는 호스트 모듈이다(ADR-0125). 콜백 `{ status: opened | rejected | failed }`.
@objc(ExternalLinkModule)
final class ExternalLinkModule: NSObject, LynxModule {
  @objc static var name: String { "ExternalLinkModule" }

  @objc static var methodLookup: [String: String] {
    ["open": NSStringFromSelector(#selector(open(_:callback:)))]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  @objc func open(_ url: String, callback: @escaping LynxCallbackBlock) {
    guard let target = ExternalLinkPolicy.target(url) else {
      callback(["status": "rejected"])
      return
    }
    DispatchQueue.main.async {
      UIApplication.shared.open(target, options: [:]) { opened in
        callback(["status": opened ? "opened" : "failed"])
      }
    }
  }
}
