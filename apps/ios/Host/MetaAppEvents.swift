import FBSDKCoreKit
import UIKit

/// Meta 앱 이벤트 설정입니다(ADR-0057). 두 값이 규칙을 지킬 때만 서고, 아니면 `nil`입니다.
/// `nil`이면 SDK를 한 줄도 부르지 않고 모듈도 등록하지 않습니다 — 순수 판정입니다.
struct MetaAppEventsConfig: Equatable {
  let appID: String
  let clientToken: String

  /// 두 값을 trim한 뒤 앱 ID가 `^[0-9]+$`, 클라이언트 토큰이 `^\S+$`일 때만 설정이 선다.
  /// 문자열이 아니거나 규칙을 어기면 `nil`.
  static func from(appID: Any?, clientToken: Any?) -> MetaAppEventsConfig? {
    guard let appID = trimmed(appID), let clientToken = trimmed(clientToken) else { return nil }
    guard !appID.isEmpty, appID.allSatisfy({ $0.isASCII && $0.isNumber }) else { return nil }
    guard !clientToken.isEmpty, !clientToken.contains(where: { $0.isWhitespace }) else { return nil }
    return MetaAppEventsConfig(appID: appID, clientToken: clientToken)
  }

  /// `Bundle.main`의 `FacebookAppID` · `FacebookClientToken`을 `from`에 넘긴다.
  static func fromBundle(_ bundle: Bundle = .main) -> MetaAppEventsConfig? {
    from(
      appID: bundle.object(forInfoDictionaryKey: "FacebookAppID"),
      clientToken: bundle.object(forInfoDictionaryKey: "FacebookClientToken")
    )
  }

  private static func trimmed(_ value: Any?) -> String? {
    (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
  }
}

/// SDK를 시작하는 유일한 자리입니다. 설정이 없으면 이 파일의 어떤 코드도 SDK를 부르지 않습니다.
enum MetaAppEvents {
  static private(set) var isStarted = false

  /// 두 번 불러도 한 번만 시작한다.
  static func start(
    _ config: MetaAppEventsConfig,
    application: UIApplication,
    launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) {
    guard !isStarted else { return }
    isStarted = true
    // 앱 ID · 클라이언트 토큰은 Info.plist(FacebookAppID · FacebookClientToken)에서 SDK가 읽는다.
    ApplicationDelegate.shared.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  /// 시작되지 않았으면 아무것도 하지 않는다(이중 방어).
  static func log(_ name: String, parameters: [String: String]) {
    guard isStarted, !name.isEmpty else { return }
    var sdkParameters: [AppEvents.ParameterName: Any] = [:]
    for (key, value) in parameters {
      sdkParameters[AppEvents.ParameterName(rawValue: key)] = value
    }
    AppEvents.shared.logEvent(AppEvents.Name(rawValue: name), parameters: sdkParameters)
  }
}
