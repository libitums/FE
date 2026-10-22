import Airbridge
import UIKit

/// Airbridge 앱 이벤트 설정입니다(ADR-0063). 두 값이 규칙을 지킬 때만 서고, 아니면 `nil`입니다.
/// `nil`이면 SDK를 한 줄도 부르지 않고 모듈도 등록하지 않습니다 — 순수 판정입니다.
struct AirbridgeEventsConfig: Equatable {
  let appName: String
  let sdkToken: String

  /// 두 값을 trim한 뒤 앱 이름이 `^[A-Za-z0-9_-]+$`, SDK 토큰이 `^\S+$`일 때만 설정이 선다.
  /// 문자열이 아니거나 규칙을 어기면 `nil`.
  static func from(appName: Any?, sdkToken: Any?) -> AirbridgeEventsConfig? {
    guard let appName = trimmed(appName), let sdkToken = trimmed(sdkToken) else { return nil }
    guard !appName.isEmpty, appName.allSatisfy(isNameCharacter) else { return nil }
    guard !sdkToken.isEmpty, !sdkToken.contains(where: { $0.isWhitespace }) else { return nil }
    return AirbridgeEventsConfig(appName: appName, sdkToken: sdkToken)
  }

  /// `Bundle.main`의 `AirbridgeAppName` · `AirbridgeSDKToken`을 `from`에 넘긴다.
  static func fromBundle(_ bundle: Bundle = .main) -> AirbridgeEventsConfig? {
    from(
      appName: bundle.object(forInfoDictionaryKey: "AirbridgeAppName"),
      sdkToken: bundle.object(forInfoDictionaryKey: "AirbridgeSDKToken")
    )
  }

  private static func trimmed(_ value: Any?) -> String? {
    (value as? String)?.trimmingCharacters(in: .whitespacesAndNewlines)
  }

  private static func isNameCharacter(_ character: Character) -> Bool {
    character.isASCII && (character.isLetter || character.isNumber || character == "_" || character == "-")
  }
}

/// SDK를 시작하는 유일한 자리입니다. 설정이 없으면 이 파일의 어떤 코드도 SDK를 부르지 않습니다.
enum AirbridgeEvents {
  static private(set) var isStarted = false

  /// 설치 이벤트가 추적 허용 결정을 기다리는 시간(초)입니다(ADR-0079 D3). 허용을 묻는 때가 가입을 마친 뒤
  /// 여정 맵이라, SDK 기본 30초로는 온보딩 · 가입 중에 끝나 IDFA 없이 설치가 나갑니다.
  static let trackingAuthorizationTimeoutSeconds: Double = 600

  /// 두 번 불러도 한 번만 시작한다. 설치 · 실행은 SDK가 자동으로 잰다.
  static func start(_ config: AirbridgeEventsConfig) {
    guard !isStarted else { return }
    isStarted = true
    let option = AirbridgeOptionBuilder(name: config.appName, token: config.sdkToken)
      .setAutoDetermineTrackingAuthorizationTimeout(second: trackingAuthorizationTimeoutSeconds)
      .build()
    Airbridge.initializeSDK(option: option)
  }

  /// 추적 허용(ATT)을 **아직 정하지 않았을 때만** 시스템 대화상자를 띄운다(ADR-0079 D2). 이미 정했으면 아무것도
  /// 하지 않는다 — 시스템도 다시 묻지 않는다. 시작되지 않은 빌드에서는 묻지 않는다(보낼 곳이 없다).
  /// 대화상자는 앱이 활성일 때만 뜨므로 메인 큐에서 부른다.
  static func requestTrackingAuthorizationIfUndetermined() {
    guard isStarted else { return }
    DispatchQueue.main.async {
      guard Airbridge.trackingAuthorizationStatus() == .notDetermined else { return }
      Airbridge.requestTrackingAuthorization { _ in }
    }
  }

  /// 시작되지 않았거나 카테고리가 비면 아무것도 하지 않는다(이중 방어). 속성이 비면 속성 없는 오버로드를 쓴다.
  static func track(_ category: String, semanticAttributes: [String: String]) {
    guard isStarted, !category.isEmpty else { return }
    if semanticAttributes.isEmpty {
      Airbridge.trackEvent(category: category)
    } else {
      Airbridge.trackEvent(category: category, semanticAttributes: semanticAttributes)
    }
  }
}
