import Foundation
import Network
import UIKit

/// `contentSyncOpportunity`를 보낼 때를 가르는 순수 상태기. 네트워크 · UIKit과 무관해서 HostTests가 잰다.
///
/// 보내는 때는 둘이다: 연결 안 됨 → 연결됨으로 바뀔 때, 앱이 백그라운드에서 돌아올 때.
/// 실행 시작은 JS가 스스로 돌기 때문에 **처음 등록 직후의 첫 경로 보고**와 **콜드 스타트의 첫 포그라운드**는
/// 보내지 않는다(백그라운드에 간 적이 없으면 「돌아옴」이 아니다).
struct ContentSyncSignal {
  private var lastSatisfied: Bool?
  private var wasBackgrounded = false

  /// 경로 상태가 보고될 때마다 부른다. 보내야 하면 true.
  mutating func pathUpdated(satisfied: Bool) -> Bool {
    defer { lastSatisfied = satisfied }
    guard let previous = lastSatisfied else { return false }
    return !previous && satisfied
  }

  mutating func didEnterBackground() {
    wasBackgrounded = true
  }

  /// 포그라운드로 들어올 때 부른다. 백그라운드를 거쳐 돌아온 것이면 true.
  mutating func willEnterForeground() -> Bool {
    defer { wasBackgrounded = false }
    return wasBackgrounded
  }
}

/// `NWPathMonitor`와 앱 생애 알림을 `ContentSyncSignal`에 먹이고, 보낼 때 `onSignal`을 부른다.
/// 셀룰러 · Wi-Fi를 가르지 않는다(`.satisfied`면 된다). `onSignal`은 메인 큐에서 불린다.
final class ContentSyncSignalSource {
  private let queue = DispatchQueue(label: "libitum.content-sync-signal")
  private var monitor: NWPathMonitor?
  private var state = ContentSyncSignal()
  private let onSignal: () -> Void
  private var tokens: [NSObjectProtocol] = []

  init(onSignal: @escaping () -> Void) {
    self.onSignal = onSignal
  }

  func start() {
    guard monitor == nil else { return }
    let monitor = NWPathMonitor()
    self.monitor = monitor
    // 상태기는 이 큐에서만 만진다. 포그라운드 알림도 같은 큐로 넘긴다.
    monitor.pathUpdateHandler = { [weak self] path in
      self?.apply { $0.pathUpdated(satisfied: path.status == .satisfied) }
    }
    monitor.start(queue: queue)

    // `sceneWillEnterForeground`와 같은 시점에 이 알림이 온다 — SceneDelegate는 뷰 컨트롤러를
    // 알지 못하므로 알림으로 받는다.
    let center = NotificationCenter.default
    tokens.append(
      center.addObserver(forName: UIScene.didEnterBackgroundNotification, object: nil, queue: nil) {
        [weak self] _ in
        self?.queue.async { self?.state.didEnterBackground() }
      })
    tokens.append(
      center.addObserver(forName: UIScene.willEnterForegroundNotification, object: nil, queue: nil)
      { [weak self] _ in
        self?.apply { $0.willEnterForeground() }
      })
  }

  func stop() {
    monitor?.cancel()
    monitor = nil
    for token in tokens { NotificationCenter.default.removeObserver(token) }
    tokens.removeAll()
  }

  private func apply(_ step: @escaping (inout ContentSyncSignal) -> Bool) {
    queue.async { [weak self] in
      guard let self, step(&self.state) else { return }
      DispatchQueue.main.async { self.onSignal() }
    }
  }

  deinit { stop() }
}
