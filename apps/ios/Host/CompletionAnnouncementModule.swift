import UIKit

// 완료 안내를 높은 우선순위로 전달하는 호스트 네이티브 모듈이다.
@objc(CompletionAnnouncementModule)
final class CompletionAnnouncementModule: NSObject, LynxModule {
  @objc static var name: String { "CompletionAnnouncementModule" }

  @objc static var methodLookup: [String: String] {
    ["announce": NSStringFromSelector(#selector(announce(_:callback:)))]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  @objc func announce(
    _ args: [String: Any],
    callback: @escaping LynxCallbackBlock
  ) {
    guard let content = args["content"] as? String else {
      callback(NSNull())
      return
    }
    DispatchQueue.main.async {
      UIAccessibility.post(notification: .announcement, argument: CompletionAnnouncementPayload.make(content: content))
      callback(NSNull())
    }
  }
}

enum CompletionAnnouncementPayload {
  static func make(content: String) -> NSAttributedString {
    NSAttributedString(
      string: content,
      attributes: [
        .accessibilitySpeechAnnouncementPriority: UIAccessibilityPriority.high.rawValue,
      ]
    )
  }
}
