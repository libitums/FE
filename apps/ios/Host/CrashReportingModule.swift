import Foundation

/// JS가 오류 수집에 로그인한 사용자의 내부 id를 넘기고, 로그아웃 · 계정 삭제 때 지운다(ADR-0207 D3). 응답 · 콜백은 없다.
/// DSN이 없는 빌드에서도 등록한다 — id만 잡아 두고 아무것도 보내지 않는다. 던지지 않는다.
@objc(CrashReportingModule)
final class CrashReportingModule: NSObject, LynxModule {
  @objc static var name: String { "CrashReportingModule" }

  @objc static var methodLookup: [String: String] {
    [
      "setUser": NSStringFromSelector(#selector(setUser(_:))),
      "clearUser": NSStringFromSelector(#selector(clearUser)),
    ]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  @objc func setUser(_ userId: String) {
    CrashReporting.setUser(userId)
  }

  @objc func clearUser() {
    CrashReporting.setUser(nil)
  }
}

/// LynxView가 올리는 오류를 받아 JS 예외만 수집 깔때기로 넘긴다(Android `LynxViewClient.onReceivedError`의 짝, ADR-0207 D1).
final class CrashLynxErrorClient: NSObject, LynxViewLifecycle {
  @objc func lynxView(_ view: LynxView!, didRecieveError error: Error!) {
    guard let lynxError = error as? LynxError else { return }
    CrashReporting.onLynxError(
      code: lynxError.errorCode, level: lynxError.level, text: lynxError.summaryMessage)
  }
}
