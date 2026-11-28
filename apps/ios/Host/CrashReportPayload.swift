import Foundation

/// 호스트를 떠나는 JS 예외의 닫힌 모양 — 출처 · 이름 · 메시지 · 자른 스택(ADR-0207 D4 — Android `CrashReportPayload.java`와 같은 규칙).
struct CrashReportPayload: Equatable {
  enum Source: String {
    case jsBackground = "js-background"
    case jsMainThread = "js-main-thread"
  }

  static let nameMax = 80
  static let messageMax = 300
  static let stackMaxLines = 30
  static let stackLineMax = 400
  // 지우기 앞의 상한 — 규칙이 하는 일을 묶고, 잘린 비밀 조각이 규칙을 빠져나가지 않게 한다.
  static let textPreMax = 65_536
  static let messagePreMax = 2_000
  static let stackLinePreMax = 800

  private static let nameAndMessage = try? NSRegularExpression(
    pattern: "^([A-Za-z_$][A-Za-z0-9_$]*(?: rejection)?): ([\\s\\S]*)$")
  private static let knownName = try? NSRegularExpression(
    pattern: "^(?:[A-Z][A-Za-z0-9]*(?:Error|Exception)|Error|unhandled rejection)$")
  private static let mainThreadPrefix = "main-thread.js exception: "
  private static let backtraceHeader = "backtrace:"
  private static let number = "-?[0-9]+(?:\\.[0-9]+)?(?:[eE][-+]?[0-9]+)?"
  // 스크롤 상자가 범위 밖 목적지를 가장 가까운 자리로 옮겼다는 알림(code 4)은 실패가 아니다(ADR-0061 D1).
  private static let scrollClamp = try? NSRegularExpression(
    pattern: "^UI method invoke: \\{\"code\":4,\"data\":\"Target scroll position = " + number
      + " is beyond threshold\\. Clamped to position = " + number + "\"\\}\\s*$")

  let source: Source
  let name: String
  let message: String
  let stackLines: [String]

  /// 받지 않는 오류면 nil. 던지지 않는다.
  static func from(code: Int, level: String?, text: String?) -> CrashReportPayload? {
    guard let source = sourceOf(code), level != "warn", let text,
      !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    else { return nil }
    // Swift는 "\r\n"을 글자 하나로 센다 — 먼저 "\n"으로 맞춰야 줄로 나뉜다.
    let body = String(text.prefix(textPreMax)).trimmingCharacters(in: .whitespacesAndNewlines)
      .replacingOccurrences(of: "\r\n", with: "\n")
    var rawMessage: String
    let rawStack: String
    if let raw = rawErrorOf(body) {
      rawMessage = raw.message
      rawStack = raw.stack
    } else {
      let parts = body.split(separator: "\n", maxSplits: 1, omittingEmptySubsequences: false)
      rawMessage = String(parts[0])
      rawStack = parts.count > 1 ? String(parts[1]) : ""
    }
    if rawMessage.hasPrefix(mainThreadPrefix) {
      rawMessage = String(rawMessage.dropFirst(mainThreadPrefix.count))
        .trimmingCharacters(in: .whitespacesAndNewlines)
    }
    var name = "Error"
    var message = rawMessage
    if let split = groups(nameAndMessage, rawMessage), matches(knownName, split[0]) {
      name = split[0]
      message = split[1]
    }
    if name == "Error" && matches(scrollClamp, message) { return nil }
    return CrashReportPayload(
      source: source,
      name: String(name.prefix(nameMax)),
      message: String(CrashScrub.scrub(preCapMessage(message)).prefix(messageMax)),
      stackLines: stackOf(rawStack))
  }

  /// 메시지를 messagePreMax로 자른다. 잘랐으면 마지막 공백 뒤 토막을 버린다 — 반쪽 토큰이 지우기를 빠져나가지 않게.
  static func preCapMessage(_ value: String) -> String {
    guard value.count > messagePreMax else { return value }
    let head = String(value.prefix(messagePreMax))
    if let index = head.lastIndex(where: { $0.isWhitespace }) { return String(head[..<index]) }
    return head
  }

  /// 넷: "lynx", 출처, 이름, 첫 스택 줄(스택이 없으면 메시지).
  var fingerprint: [String] {
    ["lynx", source.rawValue, name, stackLines.first ?? message]
  }

  private static func sourceOf(_ code: Int) -> Source? {
    if (200..<300).contains(code) { return .jsBackground }
    if (1100..<1200).contains(code) { return .jsMainThread }
    return nil
  }

  private static func rawErrorOf(_ trimmed: String) -> (message: String, stack: String)? {
    guard trimmed.hasPrefix("{"), let data = trimmed.data(using: .utf8),
      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
      let rawError = object["rawError"] as? [String: Any]
    else { return nil }
    return (rawError["message"] as? String ?? "", rawError["stack"] as? String ?? "")
  }

  private static func stackOf(_ rawStack: String) -> [String] {
    var lines: [String] = []
    let normalized = rawStack.replacingOccurrences(of: "\r\n", with: "\n")
    for piece in normalized.split(separator: "\n", omittingEmptySubsequences: false) {
      if lines.count >= stackMaxLines { break }
      let line = String(piece)
      let trimmed = line.trimmingCharacters(in: .whitespaces)
      if trimmed.isEmpty { continue }
      if lines.isEmpty && trimmed == backtraceHeader { continue }
      let clean = CrashScrub.scrub(preCapStackLine(line))
      // 줄 · 열이 프레임 끝에 있으니 뒤쪽을 남긴다.
      lines.append(clean.count > stackLineMax ? String(clean.suffix(stackLineMax)) : clean)
    }
    return lines
  }

  // 긴 프레임은 뒤쪽을 남기고, 첫 구분자까지의 앞 토막을 함께 버린다.
  private static func preCapStackLine(_ line: String) -> String {
    guard line.count > stackLinePreMax else { return line }
    let tail = line.suffix(stackLinePreMax)
    if let index = tail.firstIndex(where: { $0.isWhitespace || $0 == "/" || $0 == "(" }) {
      return String(tail[tail.index(after: index)...])
    }
    return String(tail)
  }

  private static func matches(_ re: NSRegularExpression?, _ text: String) -> Bool {
    guard let re else { return false }
    return re.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) != nil
  }

  private static func groups(_ re: NSRegularExpression?, _ text: String) -> [String]? {
    guard let re, let match = re.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
      let first = Range(match.range(at: 1), in: text), let second = Range(match.range(at: 2), in: text)
    else { return nil }
    return [String(text[first]), String(text[second])]
  }
}

/// 프로세스당 JS 예외 보고 상한 — 렌더 루프가 수집기를 덮지 않게(ADR-0061 D11).
final class CrashReportBudget {
  static let maxPerProcess = 20
  private let lock = NSLock()
  private var used = 0

  func tryAcquire() -> Bool {
    lock.lock()
    defer { lock.unlock() }
    guard used < Self.maxPerProcess else { return false }
    used += 1
    return true
  }
}
