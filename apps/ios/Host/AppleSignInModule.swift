import AuthenticationServices
import UIKit

/// 네이티브 Sign in with Apple의 호스트 모듈이다(ADR-0028 개정). 메서드는 `start` 하나다 —
/// 시스템 시트를 열고, 끝날 때 **정확히 한 번** 콜백한다. 난수는 이 모듈이 아니라
/// `WebAuthenticationModule.randomBytes`가 낸다. 이름 · 이메일은 요청하지 않는다.
@objc(AppleSignInModule)
final class AppleSignInModule: NSObject, LynxModule {
  @objc static var name: String { "AppleSignInModule" }

  @objc static var methodLookup: [String: String] {
    [
      "start": NSStringFromSelector(#selector(start(_:callback:)))
    ]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  /// 진행 중인 시트의 컨트롤러와 콜백이다 — 붙들지 않으면 시트가 곧 해제된다. 하나만 두므로
  /// 이미 있으면 `already-active`다. main 스레드에서만 읽고 쓴다.
  private var activeController: ASAuthorizationController?
  private var activeCallback: LynxCallbackBlock?

  @objc func start(
    _ args: [String: Any],
    callback: @escaping LynxCallbackBlock
  ) {
    guard let hashedNonce = AppleSignInArguments.hashedNonce(from: args) else {
      callback(["status": "invalid-arguments"])
      return
    }

    // 시트는 UI라 main 스레드에서 연다 — Lynx가 모듈 메서드를 부르는 스레드는 main이 아닐 수 있다.
    DispatchQueue.main.async { [weak self] in
      guard let self else {
        callback(["status": "failed"])
        return
      }
      if self.activeController != nil {
        callback(["status": "already-active"])
        return
      }

      let request = ASAuthorizationAppleIDProvider().createRequest()
      request.requestedScopes = []
      request.nonce = hashedNonce

      let controller = ASAuthorizationController(authorizationRequests: [request])
      controller.delegate = self
      controller.presentationContextProvider = self

      self.activeController = controller
      self.activeCallback = callback
      controller.performRequests()
    }
  }

  /// 붙든 것을 놓고 콜백을 정확히 한 번 부른다. 이미 놓았으면(두 번째 델리게이트 호출) 아무것도 안 한다.
  private func finish(with payload: [String: Any]) {
    guard let callback = activeCallback else { return }
    activeController = nil
    activeCallback = nil
    callback(payload)
  }
}

extension AppleSignInModule: ASAuthorizationControllerDelegate {
  func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithAuthorization authorization: ASAuthorization
  ) {
    let credential = authorization.credential as? ASAuthorizationAppleIDCredential
    finish(
      with: AppleSignInPayload.make(
        identityToken: credential?.identityToken,
        authorizationCode: credential?.authorizationCode,
        error: nil))
  }

  func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithError error: Error
  ) {
    finish(with: AppleSignInPayload.make(identityToken: nil, authorizationCode: nil, error: error))
  }
}

extension AppleSignInModule: ASAuthorizationControllerPresentationContextProviding {
  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    let scenes = UIApplication.shared.connectedScenes
    let windowScene = scenes.first { $0.activationState == .foregroundActive } as? UIWindowScene
    return windowScene?.windows.first { $0.isKeyWindow } ?? ASPresentationAnchor()
  }
}

/// `start` 인자 판정이다 — 순수, `HostTests`가 잰다. `nonce`가 소문자 16진 64자일 때만 그 값이다.
enum AppleSignInArguments {
  static func hashedNonce(from args: [String: Any]) -> String? {
    guard
      let nonce = args["nonce"] as? String,
      nonce.range(of: "^[0-9a-f]{64}$", options: .regularExpression) != nil
    else { return nil }
    return nonce
  }
}

/// 콜백 페이로드 조립이다 — 순수, `HostTests`가 잰다. 키는 `status` · `identityToken`, 코드가 비지 않은
/// UTF-8이면 `authorizationCode`까지 셋이다. 코드는 계정 삭제 재인증(서버 철회)이 쓴다.
enum AppleSignInPayload {
  static func make(identityToken: Data?, authorizationCode: Data?, error: Error?) -> [String: Any] {
    if let error = error {
      if let authError = error as? ASAuthorizationError, authError.code == .canceled {
        return ["status": "cancelled"]
      }
      return ["status": "failed"]
    }

    if let data = identityToken,
      let token = String(data: data, encoding: .utf8),
      !token.isEmpty
    {
      var payload: [String: Any] = ["status": "completed", "identityToken": token]
      if let codeData = authorizationCode,
        let code = String(data: codeData, encoding: .utf8),
        !code.isEmpty
      {
        payload["authorizationCode"] = code
      }
      return payload
    }

    return ["status": "failed"]
  }
}
