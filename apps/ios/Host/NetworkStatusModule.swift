import Foundation
import Network

/// `NetworkStatusModule.current()`가 돌려줄 `"<transport>:<cost>"`를 정하는 순수 분류다(ADR-0096 D1). 네트워크와
/// 무관해서 HostTests가 표 전체를 잰다. JS가 모르는 값은 `unknown`으로 읽는다.
enum NetworkStatusLabel {
  static let unknown = "unknown:unknown"

  /// 전송 수단은 Wi-Fi → 셀룰러 → 유선 순, 그 밖은 `other`. 저데이터 모드가 비싼 연결보다 먼저다.
  static func of(
    satisfied: Bool, wifi: Bool, cellular: Bool, wired: Bool, expensive: Bool, constrained: Bool
  ) -> String {
    guard satisfied else { return "offline:unknown" }
    let transport = wifi ? "wifi" : cellular ? "cellular" : wired ? "ethernet" : "other"
    let cost = constrained ? "constrained" : expensive ? "metered" : "unmetered"
    return "\(transport):\(cost)"
  }

  static func of(path: NWPath) -> String {
    of(
      satisfied: path.status == .satisfied,
      wifi: path.usesInterfaceType(.wifi),
      cellular: path.usesInterfaceType(.cellular),
      wired: path.usesInterfaceType(.wiredEthernet),
      expensive: path.isExpensive,
      constrained: path.isConstrained)
  }
}

/// `NWPathMonitor` 하나를 띄워 마지막 경로의 분류를 잠금 아래 둔다. 첫 보고 전에는 `unknown:unknown`이다.
/// 앱 시작 때 `ViewController`가 `start()`하고, 모듈도 만들어질 때 부른다(두 번째부터는 아무것도 하지 않는다).
final class NetworkStatusMonitor {
  static let shared = NetworkStatusMonitor()

  private let queue = DispatchQueue(label: "libitum.network-status")
  private let lock = NSLock()
  private var monitor: NWPathMonitor?
  private var label = NetworkStatusLabel.unknown

  init() {}

  func start() {
    lock.lock()
    defer { lock.unlock() }
    guard monitor == nil else { return }
    let monitor = NWPathMonitor()
    self.monitor = monitor
    monitor.pathUpdateHandler = { [weak self] path in
      self?.update(NetworkStatusLabel.of(path: path))
    }
    monitor.start(queue: queue)
  }

  var current: String {
    lock.lock()
    defer { lock.unlock() }
    return label
  }

  private func update(_ value: String) {
    lock.lock()
    label = value
    lock.unlock()
  }

  deinit { monitor?.cancel() }
}

/// 지금 연결 종류를 동기로 돌려주는 호스트 모듈이다(ADR-0096 D1). 분석 이벤트가 날 때마다 JS가 부른다. 권한이 없고,
/// 던지지 않는다.
@objc(NetworkStatusModule)
final class NetworkStatusModule: NSObject, LynxModule {
  @objc static var name: String { "NetworkStatusModule" }

  @objc static var methodLookup: [String: String] {
    ["current": NSStringFromSelector(#selector(current))]
  }

  @objc override init() {
    super.init()
    NetworkStatusMonitor.shared.start()
  }

  @objc init(param _: Any) {
    super.init()
    NetworkStatusMonitor.shared.start()
  }

  @objc func current() -> String {
    NetworkStatusMonitor.shared.current
  }
}
