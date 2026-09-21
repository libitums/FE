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

/// 번들 안 이미지의 경로를 앱 번들 파일로 돌린다.
///
/// Release 번들은 `pnpm build`가 낸 이미지를 `/static/image/…`처럼 **호스트 없는 절대
/// 경로**로 가리킨다. dev 서버에서는 그 앞에 `http://…:3000`이 붙어 풀리지만, 앱 번들에서
/// 읽을 때는 붙일 것이 없어 iOS가 `unsupported URL`로 거절했다 — 이미지가 그려지지 않고
/// `<image>`에 `binderror`만 온다. 그 파일들은 `pnpm bundle:host`가 `Resource/static/`에
/// 복사해 두므로(ADR-0012 D2) 경로를 그 자리의 `file://` URL로 바꿔 준다.
///
/// `/static/` 로 시작하지 않는 URL(dev 서버의 `http://…`, 원격 이미지)은 **그대로** 둔다.
final class BundledMediaResourceFetcher: NSObject, LynxMediaResourceFetcher {
  private let resourceRoot: URL?

  init(resourceRoot: URL? = Bundle.main.resourceURL?.appendingPathComponent("Resource")) {
    self.resourceRoot = resourceRoot
  }

  func shouldRedirectUrl(_ request: LynxResourceRequest) -> String {
    Self.redirect(request.url, resourceRoot: resourceRoot)
  }

  /// 판정만 하는 순수 함수. 파일이 실제로 있는지는 보지 않는다 — 없으면 이미지 쪽이
  /// 평소처럼 `binderror`를 낸다.
  static func redirect(_ url: String, resourceRoot: URL?) -> String {
    guard let resourceRoot, url.hasPrefix("/static/") else { return url }
    return resourceRoot.appendingPathComponent(String(url.dropFirst())).absoluteString
  }
}
