import Foundation

/// Lynx 번들을 읽는다. 경로는 둘뿐이다 (ADR-0012 D2).
///
/// - `http(s)://…`  → dev 서버. 개발 중 호스트에서 화면을 만질 때
/// - 그 외          → 앱 번들에 들어 있는 `pnpm build` 산출물의 사본. 시연·판정
///
/// 어느 쪽을 쓸지는 `ViewController`가 정한다. 여기서는 형태만 보고 가른다.
final class TemplateProvider: NSObject, LynxTemplateProvider {
  func loadTemplate(withUrl url: String!, onComplete callback: LynxTemplateLoadBlock!) {
    guard let url, !url.isEmpty else {
      callback(nil, Self.error(400, "번들 URL이 비어 있습니다."))
      return
    }
    if url.hasPrefix("http://") || url.hasPrefix("https://") {
      loadRemote(url, callback)
    } else {
      loadBundled(url, callback)
    }
  }

  private func loadRemote(_ url: String, _ callback: @escaping LynxTemplateLoadBlock) {
    guard let requestURL = URL(string: url) else {
      callback(nil, Self.error(400, "URL 형식이 잘못됐습니다: \(url)"))
      return
    }
    // 캐시를 쓰지 않는다. dev 서버가 방금 낸 번들을 받아야 한다.
    var request = URLRequest(url: requestURL)
    request.cachePolicy = .reloadIgnoringLocalAndRemoteCacheData
    URLSession.shared.dataTask(with: request) { data, _, error in
      if let error {
        // dev 서버가 안 떠 있을 때 여기로 온다. 흰 화면 대신 원인이 로그에 남는다.
        callback(nil, error)
        return
      }
      guard let data else {
        callback(nil, Self.error(404, "번들이 비어 있습니다: \(url)"))
        return
      }
      callback(data, nil)
    }.resume()
  }

  private func loadBundled(_ name: String, _ callback: LynxTemplateLoadBlock) {
    guard let path = Bundle.main.path(forResource: name, ofType: "bundle") else {
      callback(nil, Self.error(404, "앱 번들에서 찾지 못했습니다: \(name).bundle"))
      return
    }
    do {
      callback(try Data(contentsOf: URL(fileURLWithPath: path)), nil)
    } catch {
      callback(nil, error)
    }
  }

  private static func error(_ code: Int, _ message: String) -> NSError {
    NSError(domain: "com.libitum.host", code: code,
            userInfo: [NSLocalizedDescriptionKey: message])
  }
}
