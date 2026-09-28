import AuthenticationServices
import Security
import UIKit

/// 웹 인증 창(OAuth 소셜 로그인)의 호스트 네이티브 모듈이다(ADR-0028). 메서드는 둘이다 —
/// `start`(인증 창을 열고 정확히 한 번 콜백한다)와 `randomBytes`(암호학적 난수를 소문자
/// 16진 문자열로 동기 반환한다).
@objc(WebAuthenticationModule)
final class WebAuthenticationModule: NSObject, LynxModule {
  @objc static var name: String { "WebAuthenticationModule" }

  @objc static var methodLookup: [String: String] {
    [
      "start": NSStringFromSelector(#selector(start(_:callback:))),
      "randomBytes": NSStringFromSelector(#selector(randomBytes(_:))),
    ]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  /// 이 모듈 인스턴스가 붙든 진행 중인 세션이다 — 없으면 시스템이 세션을 해제해
  /// 창이 곧 닫힌다. 하나만 두므로 이미 있으면 `already-active`다. main 스레드에서만 읽고 쓴다.
  private var activeSession: ASWebAuthenticationSession?

  @objc func start(
    _ args: [String: Any],
    callback: @escaping LynxCallbackBlock
  ) {
    guard
      let urlString = args["url"] as? String,
      let url = URL(string: urlString),
      url.scheme == "https",
      let callbackSchemeArg = args["callbackScheme"] as? String,
      callbackSchemeArg.range(of: "^[a-z][a-z0-9+.-]*$", options: .regularExpression) != nil
    else {
      callback(["status": "invalid-arguments"])
      return
    }

    // 세션을 만들고 띄우는 일은 UI라 main 스레드에서 한다 — Lynx가 모듈 메서드를 부르는
    // 스레드는 main이 아닐 수 있다(`CompletionAnnouncementModule`과 같은 관례). 인자 검증은
    // 위에서 곧장 끝낸다.
    DispatchQueue.main.async { [weak self] in
      guard let self else {
        callback(["status": "failed"])
        return
      }
      if self.activeSession != nil {
        callback(["status": "already-active"])
        return
      }

      // Deployment Target이 17.4라 `.customScheme(_:)`(iOS 17.4+ API)를 그냥 쓴다 — 더 낮은
      // 버전을 지원해야 하는 날이 오면 `#available` 분기와 옛 `callbackURLScheme:`로 바꾼다.
      let session = ASWebAuthenticationSession(
        url: url,
        callback: .customScheme(callbackSchemeArg)
      ) { [weak self] callbackURL, error in
        DispatchQueue.main.async {
          self?.activeSession = nil
          callback(WebAuthenticationPayload.make(callbackURL: callbackURL, error: error))
        }
      }
      session.presentationContextProvider = self
      // Safari 쿠키를 공유한다 — 이미 제공자에 로그인한 사용자는 비밀번호 없이 지나간다.
      // 대가는 시스템 확인 알림 1회다(ADR-0028).
      session.prefersEphemeralWebBrowserSession = false

      self.activeSession = session

      if !session.start() {
        self.activeSession = nil
        callback(["status": "failed"])
      }
    }
  }

  @objc func randomBytes(_ count: NSNumber) -> String {
    let byteCount = count.intValue
    guard (1...64).contains(byteCount) else { return "" }

    var bytes = [UInt8](repeating: 0, count: byteCount)
    let status = SecRandomCopyBytes(kSecRandomDefault, byteCount, &bytes)
    guard status == errSecSuccess else { return "" }

    return bytes.map { String(format: "%02x", $0) }.joined()
  }
}

extension WebAuthenticationModule: ASWebAuthenticationPresentationContextProviding {
  func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
    let scenes = UIApplication.shared.connectedScenes
    let windowScene = scenes.first { $0.activationState == .foregroundActive } as? UIWindowScene
    return windowScene?.windows.first { $0.isKeyWindow } ?? ASPresentationAnchor()
  }
}

/// 인증 창 완료 핸들러의 페이로드입니다 — 순수, `HostTests`가 잽니다.
enum WebAuthenticationPayload {
  static func make(callbackURL: URL?, error: Error?) -> [String: Any] {
    if let error = error {
      if let authError = error as? ASWebAuthenticationSessionError,
        authError.code == .canceledLogin
      {
        return ["status": "cancelled"]
      }
      return ["status": "failed"]
    }

    if let callbackURL = callbackURL {
      return ["status": "completed", "callbackUrl": callbackURL.absoluteString]
    }

    return ["status": "failed"]
  }
}
