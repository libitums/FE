import Foundation
import Sentry

/// Sentry 설정 판정(ADR-0207 D1 · D5). `Info.plist`의 `SentryDSN`(← `Config/Sentry.xcconfig` ← 추적하지 않는 `Sentry.local.xcconfig`)이
/// `https://<key>@<host>/<project>` 꼴일 때만 선다. 아니면 SDK를 한 줄도 부르지 않는다.
struct CrashReportConfig: Equatable {
  static let releasePrefix = "libitum.duru.ios"
  static let defaultEnvironment = "release"
  private static let dsnShape = try? NSRegularExpression(pattern: "^https://[A-Za-z0-9]+@[A-Za-z0-9.-]+/[0-9]+$")
  private static let environmentShape = try? NSRegularExpression(pattern: "^[A-Za-z0-9_-]{1,64}$")

  let dsn: String
  let environment: String
  let release: String
  let dist: String

  static func from(dsn: Any?, environment: Any?, version: Any?, build: Any?) -> CrashReportConfig? {
    guard let dsn = trimmed(dsn), matches(dsnShape, dsn),
      let version = trimmed(version), let build = trimmed(build)
    else { return nil }
    let env = trimmed(environment).flatMap { matches(environmentShape, $0) ? $0 : nil } ?? defaultEnvironment
    return CrashReportConfig(
      dsn: dsn, environment: env, release: "\(releasePrefix)@\(version)+\(build)", dist: build)
  }

  /// Debug 구성은 DSN이 있어도 nil이다(Android `debug`와 같다).
  static func fromBundle(_ bundle: Bundle = .main) -> CrashReportConfig? {
    #if DEBUG
      return nil
    #else
      let info = bundle.infoDictionary
      return from(
        dsn: info?["SentryDSN"], environment: info?["SentryEnvironment"],
        version: info?["CFBundleShortVersionString"], build: info?["CFBundleVersion"])
    #endif
  }

  private static func trimmed(_ raw: Any?) -> String? {
    guard let value = (raw as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else {
      return nil
    }
    return value
  }

  private static func matches(_ re: NSRegularExpression?, _ text: String) -> Bool {
    guard let re else { return false }
    return re.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) != nil
  }
}

/// 이벤트에 싣는 사용자 — 내부 id 하나(PostHog distinct id와 같은 값). JS가 로그인 뒤 넣고 로그아웃 · 계정 삭제 때 지운다(ADR-0207 D3).
enum CrashUser {
  private static let lock = NSLock()
  private static var stored: String?
  private static let uuidShape = try? NSRegularExpression(
    pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")

  /// UUID 꼴이면 소문자 id, 아니면 nil.
  static func idFrom(_ raw: String?) -> String? {
    guard let id = raw?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(), let uuidShape,
      uuidShape.firstMatch(in: id, range: NSRange(id.startIndex..., in: id)) != nil
    else { return nil }
    return id
  }

  /// 맞는 id를 잡는다. 아니면 앞 id를 지운다 — 남는 사용자가 없게.
  @discardableResult static func set(_ raw: String?) -> Bool {
    let id = idFrom(raw)
    lock.lock()
    stored = id
    lock.unlock()
    return id != nil
  }

  static func clear() { set(nil) }

  static var current: String? {
    lock.lock()
    defer { lock.unlock() }
    return stored
  }
}

/// 나가는 모든 이벤트가 지나는 한 깔때기(ADR-0207 D4 — Android `CrashEventPolicy`의 짝).
enum CrashEventPolicy {
  static func eventFrom(_ payload: CrashReportPayload) -> Event {
    let mechanism = Mechanism(type: "lynx")
    // 앱이 죽지 않았다 — 세션을 crashed로 세지 않게 한다.
    mechanism.handled = true
    let exception = Exception(value: payload.message, type: payload.name)
    exception.mechanism = mechanism
    let event = Event(level: .error)
    event.exceptions = [exception]
    event.tags = ["lynx.source": payload.source.rawValue]
    event.fingerprint = payload.fingerprint
    event.context = ["lynx": ["stack": payload.stackLines.joined(separator: "\n")]]
    return event
  }

  /// 사용자를 내부 id 하나로 다시 세우고 식별 값을 지운 같은 이벤트.
  static func beforeSend(_ event: Event, userId: String?) -> Event? {
    event.user = CrashUser.idFrom(userId).map { User(userId: $0) }
    event.breadcrumbs = nil
    event.serverName = nil
    event.request = nil
    if var context = event.context {
      if var device = context["device"] {
        for key in ["id", "name", "boot_time"] { device.removeValue(forKey: key) }
        context["device"] = device
      }
      if var app = context["app"] {
        app.removeValue(forKey: "device_app_hash")
        context["app"] = app
      }
      event.context = context
    }
    for exception in event.exceptions ?? [] {
      if let value = exception.value { exception.value = clean(value) }
      clearInstallPath(exception.stacktrace)
    }
    for thread in event.threads ?? [] { clearInstallPath(thread.stacktrace) }
    clearInstallPath(event.stacktrace)
    for image in event.debugMeta ?? [] {
      if let file = image.codeFile { image.codeFile = CrashScrub.withoutInstallPath(file) }
    }
    if let message = event.message {
      let cleaned = SentryMessage(formatted: clean(message.formatted))
      if let body = message.message { cleaned.message = clean(body) }
      event.message = cleaned
    }
    return event
  }

  private static func clearInstallPath(_ trace: SentryStacktrace?) {
    for frame in trace?.frames ?? [] {
      if let value = frame.package { frame.package = CrashScrub.withoutInstallPath(value) }
      if let value = frame.fileName { frame.fileName = CrashScrub.withoutInstallPath(value) }
      if let value = frame.module { frame.module = CrashScrub.withoutInstallPath(value) }
    }
  }

  private static func clean(_ value: String) -> String {
    String(CrashScrub.scrub(CrashReportPayload.preCapMessage(value)).prefix(CrashReportPayload.messageMax))
  }
}

/// SDK를 시작하는 유일한 자리다. 설정이 없으면 이 파일의 어떤 코드도 SDK를 부르지 않는다. 앱 시작을 막지 않는다.
enum CrashReporting {
  static private(set) var isStarted = false
  private static let budget = CrashReportBudget()

  static func start(_ config: CrashReportConfig?) {
    guard let config, !isStarted else {
      #if DEBUG
        if config == nil { NSLog("[DuruCrash] disabled (no DSN or debug build)") }
      #endif
      return
    }
    SentrySDK.start { options in
      options.dsn = config.dsn
      options.environment = config.environment
      options.releaseName = config.release
      options.dist = config.dist
      options.sendDefaultPii = false
      options.beforeSend = { event in CrashEventPolicy.beforeSend(event, userId: CrashUser.current) }
      options.beforeBreadcrumb = { _ in nil }
      options.maxBreadcrumbs = 0
      options.enableAutoBreadcrumbTracking = false
      options.enableNetworkBreadcrumbs = false
      options.attachScreenshot = false
      options.attachViewHierarchy = false
      options.sessionReplay.sessionSampleRate = 0
      options.sessionReplay.onErrorSampleRate = 0
      options.tracesSampleRate = nil
      options.enableAutoPerformanceTracing = false
      options.enableUIViewControllerTracing = false
      options.enableUserInteractionTracing = false
      options.enableNetworkTracking = false
      options.enableFileIOTracing = false
      options.enableCoreDataTracing = false
      options.enableCaptureFailedRequests = false
      options.enableSwizzling = false
      options.enableMetricKit = false
      options.enableLogs = false
      options.enableMetrics = false
      options.enableCrashHandler = true
      options.enableAppHangTracking = true
      options.enableWatchdogTerminationTracking = false
      options.enableAutoSessionTracking = true
    }
    isStarted = SentrySDK.isEnabled
  }

  /// JS가 넘긴 사용자 id. nil이면 지운다. 던지지 않는다.
  static func setUser(_ raw: String?) {
    CrashUser.set(raw)
  }

  /// Lynx 오류 하나를 깔때기로 넘긴다. 받지 않는 오류 · SDK 없음 · 상한 초과는 버린다. 던지지 않는다.
  static func onLynxError(code: Int, level: String?, text: String?) {
    guard let payload = CrashReportPayload.from(code: code, level: level, text: text), isStarted,
      budget.tryAcquire()
    else { return }
    SentrySDK.capture(event: CrashEventPolicy.eventFrom(payload))
  }
}
