import Foundation

/// 앱 번들에 들어 있는 Lynx 번들을 읽는다.
/// 원본은 `apps/mobile`의 `pnpm build` 산출물이고, 이 파일은 그 사본이다 (ADR-0002 D3).
final class BundleTemplateProvider: NSObject, LynxTemplateProvider {
  func loadTemplate(withUrl url: String!, onComplete callback: LynxTemplateLoadBlock!) {
    guard let path = Bundle.main.path(forResource: url, ofType: "bundle") else {
      callback(nil, NSError(
        domain: "com.libitum.host", code: 404,
        userInfo: [NSLocalizedDescriptionKey: "번들을 찾지 못했습니다: \(url ?? "nil")"]))
      return
    }
    do {
      callback(try Data(contentsOf: URL(fileURLWithPath: path)), nil)
    } catch {
      callback(nil, error)
    }
  }
}
