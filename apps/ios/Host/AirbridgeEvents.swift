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

  /// ⟨ADR-0080 D4 보충⟩ 대시보드 Tracking Link › Custom Domain에 등록한 도메인이다. SDK에도 같은 FQDN을 넣어야
  /// 이 도메인의 링크를 Airbridge 링크로 알아본다(Airbridge iOS SDK 문서 「Set up custom domain」).
  static let trackingLinkCustomDomains = ["go.k-duru.com"]

  /// ⟨ADR-0085 D4⟩ 시험 계정이라 추적을 멈췄는지 기억하는 키입니다. 다음 실행도 멈춘 채로 시작합니다.
  static let trackingStoppedKey = "airbridge.trackingStopped"

  /// 두 번 불러도 한 번만 시작한다. 설치 · 실행은 SDK가 자동으로 잰다 — 멈춰 둔 기기에서는 재지 않는다.
  static func start(_ config: AirbridgeEventsConfig, defaults: UserDefaults = .standard) {
    guard !isStarted else { return }
    isStarted = true
    let option = AirbridgeOptionBuilder(name: config.appName, token: config.sdkToken)
      .setAutoDetermineTrackingAuthorizationTimeout(second: trackingAuthorizationTimeoutSeconds)
      .setAutoStartTrackingEnabled(!defaults.bool(forKey: trackingStoppedKey))
      .setTrackingLinkCustomDomains(trackingLinkCustomDomains)
      .build()
    Airbridge.initializeSDK(option: option)
    AirbridgeDeeplinks.handleDeferred()
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

  /// ⟨ADR-0085 D4⟩ 추적을 켜거나 멈추고 그 값을 기억한다. 시작되지 않은 빌드에서는 아무것도 하지 않는다.
  static func setTrackingEnabled(_ enabled: Bool, defaults: UserDefaults = .standard) {
    guard isStarted else { return }
    defaults.set(!enabled, forKey: trackingStoppedKey)
    if enabled {
      Airbridge.startTracking()
    } else {
      Airbridge.stopTracking()
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

/// Airbridge 딥링크를 받아 두는 자리입니다(ADR-0080). 호스트는 링크를 **해석하지 않고** 한 개만 들고 있다가, JS가
/// 앱 구간(진입 흐름이 끝난 뒤)에서 `takeOpenedDeeplink`로 꺼냅니다 — 알림 목적지(ADR-0034)와 같은 모양입니다.
/// SDK가 시작되지 않은 빌드에서는 아무것도 하지 않습니다(모듈도 없어 꺼낼 쪽이 없습니다).
enum AirbridgeDeeplinks {
  static let openedNotification = Notification.Name("AirbridgeDeeplinks.opened")
  /// 로그인 콜백(`duru://auth-callback`)은 웹 인증 세션이 받습니다 — 딥링크로 들고 있지 않습니다.
  static let authCallbackHost = "auth-callback"

  private static let lock = NSLock()
  private static var pending: String?

  /// 앱이 꺼져 있다가 링크로 켜질 때(scheme · universal link).
  static func handle(connectionOptions: UIScene.ConnectionOptions) {
    guard AirbridgeEvents.isStarted else { return }
    Airbridge.trackDeeplink(connectionOptions: connectionOptions)
    let isAirbridge = Airbridge.handleDeeplink(connectionOptions: connectionOptions) { store($0) }
    if !isAirbridge { connectionOptions.urlContexts.forEach { storeIfOwn($0.url) } }
  }

  /// 켜져 있는 앱이 scheme 링크로 열릴 때.
  static func handle(openURLContexts: Set<UIOpenURLContext>) {
    guard AirbridgeEvents.isStarted else { return }
    Airbridge.trackDeeplink(openURLContexts: openURLContexts)
    let isAirbridge = Airbridge.handleDeeplink(openURLContexts: openURLContexts) { store($0) }
    if !isAirbridge { openURLContexts.forEach { storeIfOwn($0.url) } }
  }

  /// 켜져 있는 앱이 universal link로 열릴 때.
  static func handle(userActivity: NSUserActivity) {
    guard AirbridgeEvents.isStarted else { return }
    Airbridge.trackDeeplink(userActivity: userActivity)
    _ = Airbridge.handleDeeplink(userActivity: userActivity) { store($0) }
  }

  /// 설치 전에 누른 링크(지연 딥링크) — 첫 실행에 한 번 SDK가 답합니다. 앱 구간에 들어선 뒤에 열립니다.
  static func handleDeferred() {
    _ = Airbridge.handleDeferredDeeplink { url in
      if let url { store(url) }
    }
  }

  /// 한 번 꺼내면 비웁니다. 없으면 `nil`.
  static func take() -> String? {
    lock.lock()
    defer { lock.unlock() }
    let url = pending
    pending = nil
    return url
  }

  /// 우리 scheme(`duru`)이고 로그인 콜백이 아닐 때만 받는다. 순수 판정.
  static func isOwnDeeplink(_ url: URL) -> Bool {
    url.scheme?.lowercased() == "duru" && url.host?.lowercased() != authCallbackHost
  }

  private static func storeIfOwn(_ url: URL) {
    if isOwnDeeplink(url) { store(url) }
  }

  private static func store(_ url: URL) {
    guard isOwnDeeplink(url) else { return }
    lock.lock()
    pending = url.absoluteString
    lock.unlock()
    DispatchQueue.main.async { NotificationCenter.default.post(name: openedNotification, object: nil) }
  }
}
