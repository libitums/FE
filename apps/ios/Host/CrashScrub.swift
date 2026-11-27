import Foundation

/// 오류 글에서 개인 정보 꼴을 지운다(ADR-0207 D4 — Android `CrashScrub.java`와 같은 규칙 · 같은 순서). 던지지 않는다.
/// 규칙을 처리하지 못한 글은 그대로 넘기지 않고 빈 글로 버린다.
enum CrashScrub {
  // iOS가 설치마다 정하는 컨테이너 UUID(`…/Application/<UUID>/`)는 같은 설치의 모든 크래시를 잇는다. 지우기 규칙의 첫 줄이다.
  private static let installDir = regex("/Application/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/")
  private static let urlQuery = regex("([A-Za-z][A-Za-z0-9+.-]*://[^\\s?#]+)[?#]\\S*")
  private static let bareQuery = regex("\\?[^\\s?#=]*+=\\S*")
  private static let email = regex("[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}")
  private static let dotlessEmail = regex("([^\\s@<>()\\[\\]]++)@([^\\s@<>()\\[\\]]+)")
  // `pkg.Class@1a2b3c`는 주소가 아니라 객체 식별 해시다 — 클래스 꼴 이름 뒤 16진수 꼬리.
  private static let className = regex("^(?:[A-Za-z_$][\\w$]*\\.)*[A-Z][\\w$]*$")
  private static let hexTail = regex("^[0-9a-fA-F]{1,16}$")
  private static let bearer = regex("\\b(bearer)\\s+\\S+", options: [.caseInsensitive])
  private static let basic = regex("\\b([Bb][Aa][Ss][Ii][Cc])\\s+(?=[a-z]*[0-9+/A-Z])[A-Za-z0-9+/]{8,}+={0,2}")
  private static let jwt = regex("eyJ[A-Za-z0-9_-]{5,}\\.[A-Za-z0-9_-]{5,}\\.[A-Za-z0-9_-]{5,}")
  private static let opaque = regex("[A-Za-z0-9_-]{32,}")
  private static let number = regex("\\+?\\d(?:[ ().-]{0,2}\\d){8,}")
  private static let nonAscii = regex("[^\\x00-\\x7F]+")

  static func scrub(_ text: String?) -> String {
    guard let text, rulesReady else { return "" }
    var out = withoutInstallPath(text)
    out = replace(urlQuery, in: out, with: "$1?[redacted]")
    out = replace(bareQuery, in: out, with: "?[redacted]")
    out = replace(email, in: out, with: "[email]")
    out = dotlessEmails(out)
    out = replace(bearer, in: out, with: "$1 [token]")
    out = replace(basic, in: out, with: "$1 [token]")
    out = replace(jwt, in: out, with: "[token]")
    out = replace(opaque, in: out, with: "[token]")
    out = replace(number, in: out, with: "[number]")
    return replace(nonAscii, in: out, with: "[text]")
  }

  /// 설치 컨테이너 경로를 고정 표지로 바꾼다. 나머지는 그대로다.
  static func withoutInstallPath(_ value: String) -> String {
    replace(installDir, in: value, with: "/Application/[install]/")
  }

  // 정규식 하나라도 만들지 못했으면 지우기를 하지 않고 글을 버린다(지우지 못한 것을 보내지 않는다).
  private static let rulesReady: Bool = {
    let all: [NSRegularExpression?] = [
      installDir, urlQuery, bareQuery, email, dotlessEmail, className, hexTail, bearer, basic, jwt, opaque,
      number, nonAscii,
    ]
    return all.allSatisfy { $0 != nil }
  }()

  private static func regex(_ pattern: String, options: NSRegularExpression.Options = []) -> NSRegularExpression? {
    try? NSRegularExpression(pattern: pattern, options: options)
  }

  private static func replace(_ re: NSRegularExpression?, in text: String, with template: String) -> String {
    guard let re else { return "" }
    let range = NSRange(text.startIndex..., in: text)
    return re.stringByReplacingMatches(in: text, options: [], range: range, withTemplate: template)
  }

  private static func matchesWhole(_ re: NSRegularExpression?, _ text: String) -> Bool {
    guard let re else { return false }
    return re.firstMatch(in: text, options: [], range: NSRange(text.startIndex..., in: text)) != nil
  }

  private static func dotlessEmails(_ text: String) -> String {
    guard let dotlessEmail else { return "" }
    let ns = text as NSString
    var out = ""
    var last = 0
    for match in dotlessEmail.matches(in: text, options: [], range: NSRange(location: 0, length: ns.length)) {
      let whole = ns.substring(with: match.range)
      let name = ns.substring(with: match.range(at: 1))
      let tail = ns.substring(with: match.range(at: 2))
      let identityHash = matchesWhole(className, name) && matchesWhole(hexTail, tail)
      out += ns.substring(with: NSRange(location: last, length: match.range.location - last))
      out += identityHash ? whole : "[email]"
      last = match.range.location + match.range.length
    }
    out += ns.substring(from: last)
    return out
  }
}
