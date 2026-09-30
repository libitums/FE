import UIKit
import UserNotifications

/// 서버 푸시 알림의 권한 · 기기 토큰 · 누른 알림을 JS에 잇는 호스트 네이티브 모듈이다(ADR-0034).
/// 호스트의 **열째** 모듈이고, 권한을 요구하는 **둘째** 모듈이다(첫째는 마이크 · 음성 인식).
///
/// **들어오는 입구를 열지 않는다.** 알림을 누르면 앱이 열리지만, 목적지는 URL이 아니라 알림
/// 안의 `target` 사전이고 JS가 **아는 목적지 목록**으로만 읽는다(`lib/push-target.ts`). URL
/// scheme · universal link를 등록하지 않는다 — ADR-0012 D2 · ADR-0026 D4의 딥링크 금지는 산다.
///
/// **조회와 요청이 다른 메서드다**(ADR-0026 D5). `getStatus`는 다이얼로그를 띄우지 않고,
/// `register`는 **미요청일 때만** 묻는다. 거부된 권한에 다시 묻지 않는다 — 처방은 설정 열기다.
@objc(PushNotificationModule)
final class PushNotificationModule: NSObject, LynxModule {
  @objc static var name: String { "PushNotificationModule" }

  /// 메서드는 넷이다(ADR-0017 D2의 둘째 트리거 「다섯 초과」에 닿지 않는다).
  @objc static var methodLookup: [String: String] {
    [
      "getStatus": NSStringFromSelector(#selector(getStatus(_:))),
      "register": NSStringFromSelector(#selector(register(_:))),
      "takeOpened": NSStringFromSelector(#selector(takeOpened(_:))),
      "openSettings": NSStringFromSelector(#selector(openSettings)),
    ]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  /// 권한 상태만 읽는다. 다이얼로그를 띄우지 않는다.
  @objc func getStatus(_ callback: @escaping LynxCallbackBlock) {
    UNUserNotificationCenter.current().getNotificationSettings { settings in
      callback(["permission": PushPermission.name(for: settings.authorizationStatus)])
    }
  }

  /// 미요청이면 묻고, 허용 상태면 기기 토큰까지 받아 돌려준다. 거부 상태면 묻지 않는다.
  /// 응답: `{ permission, token?, environment? }` — 토큰을 못 받으면 `token`이 없다.
  @objc func register(_ callback: @escaping LynxCallbackBlock) {
    let center = UNUserNotificationCenter.current()
    center.getNotificationSettings { settings in
      switch settings.authorizationStatus {
      case .notDetermined:
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
          if granted {
            PushNotificationHub.shared.registerForToken { token in
              callback(PushNotificationModule.payload(permission: "authorized", token: token))
            }
          } else {
            callback(["permission": "denied"])
          }
        }
      case .authorized, .provisional, .ephemeral:
        let permission = PushPermission.name(for: settings.authorizationStatus)
        PushNotificationHub.shared.registerForToken { token in
          callback(PushNotificationModule.payload(permission: permission, token: token))
        }
      default:
        callback(["permission": PushPermission.name(for: settings.authorizationStatus)])
      }
    }
  }

  /// 사용자가 누른 알림의 `target`을 **한 번** 꺼낸다. 없으면 `target: null`.
  @objc func takeOpened(_ callback: @escaping LynxCallbackBlock) {
    let target = PushNotificationHub.shared.takeOpenedTarget()
    callback(["target": (target as Any?) ?? NSNull()])
  }

  /// 이 앱의 설정 페이지를 연다 — ADR-0026 D4가 연 나가는 목적지 그대로다.
  @objc func openSettings() {
    DispatchQueue.main.async {
      guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
      UIApplication.shared.open(url)
    }
  }

  static func payload(permission: String, token: String?) -> [String: Any] {
    var result: [String: Any] = ["permission": permission]
    if let token {
      result["token"] = token
      result["environment"] = PushEnvironment.current
    }
    return result
  }
}

/// 권한 상태 → JS 낱말. 순수, `HostTests`가 잰다.
enum PushPermission {
  static func name(for status: UNAuthorizationStatus) -> String {
    switch status {
    case .notDetermined: return "not-determined"
    case .denied: return "denied"
    case .authorized: return "authorized"
    case .provisional: return "provisional"
    case .ephemeral: return "authorized"
    @unknown default: return "denied"
    }
  }
}

/// 이 빌드의 토큰이 어느 APNs로 가야 하는지다. 개발 서명(`embedded.mobileprovision`의
/// `aps-environment`가 `development`)이면 `sandbox`, App Store · TestFlight(파일 없음)면 `production`.
/// 빌드 구성(Debug · Release)이 아니라 서명이 가른다 — Release 구성을 개발 서명으로 기기에 올려도 맞다.
enum PushEnvironment {
  static let current: String = {
    guard
      let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
      let data = try? Data(contentsOf: url)
    else { return "production" }
    return environment(fromProvisioningProfile: String(decoding: data, as: UTF8.self))
  }()

  /// 프로파일 본문에서 `aps-environment` 값을 읽는다. 없거나 `production`이면 `production`.
  static func environment(fromProvisioningProfile text: String) -> String {
    guard let key = text.range(of: "<key>aps-environment</key>") else { return "production" }
    let rest = text[key.upperBound...]
    guard
      let open = rest.range(of: "<string>"),
      let close = rest.range(of: "</string>", range: open.upperBound..<rest.endIndex)
    else { return "production" }
    let value = rest[open.upperBound..<close.lowerBound].trimmingCharacters(in: .whitespaces)
    return value == "development" ? "sandbox" : "production"
  }
}

/// 앱 전체에서 하나다. 시스템 콜백(토큰 · 알림 누름)이 오는 자리가 `AppDelegate`라 모듈 인스턴스가
/// 아니라 여기에 모은다.
final class PushNotificationHub: NSObject, UNUserNotificationCenterDelegate {
  static let shared = PushNotificationHub()
  /// 누른 알림이 도착했다 — `ViewController`가 LynxView에 전역 이벤트로 알린다.
  static let openedNotification = Notification.Name("PushNotificationHub.opened")
  static let tokenTimeout: TimeInterval = 10

  private let queue = DispatchQueue(label: "com.libitum.push-notifications")
  private var tokenWaiters: [(String?) -> Void] = []
  /// 요청 회차다 — 앞 회차의 제한 시간이 뒤 회차의 기다림을 끝내지 않게 한다.
  private var tokenRound = 0
  private var openedTarget: [String: Any]?

  /// 토큰을 요청하고 받으면(또는 실패 · 제한 시간) 한 번 부른다.
  func registerForToken(_ completion: @escaping (String?) -> Void) {
    queue.async {
      self.tokenWaiters.append(completion)
      let isFirst = self.tokenWaiters.count == 1
      guard isFirst else { return }
      self.tokenRound += 1
      let round = self.tokenRound
      DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
      self.queue.asyncAfter(deadline: .now() + Self.tokenTimeout) {
        if self.tokenRound == round { self.finish(token: nil) }
      }
    }
  }

  func didRegister(deviceToken: Data) {
    queue.async { self.finish(token: Self.hex(deviceToken)) }
  }

  func didFailToRegister() {
    queue.async { self.finish(token: nil) }
  }

  func takeOpenedTarget() -> [String: Any]? {
    queue.sync {
      let target = openedTarget
      openedTarget = nil
      return target
    }
  }

  /// `queue` 위에서만 부른다. 기다리는 쪽이 없으면(이미 끝남) 아무것도 하지 않는다.
  private func finish(token: String?) {
    let waiters = tokenWaiters
    tokenWaiters = []
    tokenRound += 1
    waiters.forEach { $0(token) }
  }

  static func hex(_ data: Data) -> String {
    data.map { String(format: "%02x", $0) }.joined()
  }

  // MARK: - UNUserNotificationCenterDelegate

  /// 앱이 앞에 있을 때도 배너를 보인다.
  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    completionHandler([.banner, .list, .sound])
  }

  func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let target = response.notification.request.content.userInfo["target"] as? [String: Any]
    queue.sync { openedTarget = target ?? [:] }
    NotificationCenter.default.post(name: Self.openedNotification, object: nil)
    completionHandler()
  }
}
