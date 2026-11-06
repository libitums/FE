import AVFoundation
import UIKit

/// 학습 음성(`AudioPlaybackModule`)과 독립적인 iOS 전용 효과음 재생기다.
/// Lynx 화면은 안정적인 ID만 보내고, 번들 경로·재생 정책은 호스트가 소유한다.
enum SoundEffectAsset: String, CaseIterable {
  case button
  case correct_answer
  case wrong_answer
  case lesson_complete
  case pass_lesson
  case failed_lesson
  case ring_bell
  case accept_call

  func url(in bundle: Bundle = .main) -> URL? {
    bundle.url(forResource: rawValue, withExtension: "mp3", subdirectory: "sfx")
  }

  var volume: Float {
    switch self {
    case .button: 0.25
    case .ring_bell: 0.35
    case .accept_call: 0.4
    case .correct_answer, .wrong_answer: 0.5
    case .lesson_complete, .pass_lesson, .failed_lesson: 0.55
    }
  }
}

/// 메인 큐 전용. 벨과 짧은 효과음은 다른 플레이어라 대사와도 서로 중단하지 않는다.
final class SoundEffectsPlayer {
  private(set) var players: [SoundEffectAsset: AVAudioPlayer] = [:]

  func preload() {
    for asset in SoundEffectAsset.allCases where players[asset] == nil {
      guard let url = asset.url(), let player = try? AVAudioPlayer(contentsOf: url) else { continue }
      player.volume = asset.volume
      player.numberOfLoops = asset == .ring_bell ? -1 : 0
      player.prepareToPlay()
      players[asset] = player
    }
  }

  func play(_ id: String) {
    guard let asset = SoundEffectAsset(rawValue: id) else { return }
    preload()
    guard let player = players[asset] else { return }
    if asset == .ring_bell {
      guard !player.isPlaying else { return }
    } else {
      // 같은 효과음의 빠른 연속 탭만 다시 시작한다. 다른 판정음·완료음은 끝까지 재생한다.
      player.stop()
    }
    player.currentTime = 0
    player.play()
  }

  func stopRing() {
    players[.ring_bell]?.stop()
    players[.ring_bell]?.currentTime = 0
  }

  func stopAll() {
    for player in players.values {
      player.stop()
      player.currentTime = 0
    }
  }
}

/// 판정 햅틱의 종류다. 플랫폼 기본 알림 햅틱만 쓰고, 설정의 「시스템 햅틱」은 UIKit이 따른다.
enum HapticFeedbackKind: String, CaseIterable {
  case success
  case error

  var feedbackType: UINotificationFeedbackGenerator.FeedbackType {
    switch self {
    case .success: .success
    case .error: .error
    }
  }

  /// nil · 빈 문자열 · 모르는 값은 nil — 호출자는 조용히 무시한다.
  static func of(_ raw: String?) -> HapticFeedbackKind? {
    guard let raw else { return nil }
    return HapticFeedbackKind(rawValue: raw)
  }
}

@objc(SoundEffectsModule)
final class SoundEffectsModule: NSObject, LynxModule {
  @objc static var name: String { "SoundEffectsModule" }

  @objc static var methodLookup: [String: String] {
    [
      "play": NSStringFromSelector(#selector(play(_:))),
      "stopRing": NSStringFromSelector(#selector(stopRing)),
      "haptic": NSStringFromSelector(#selector(haptic(_:))),
    ]
  }

  private let effects = SoundEffectsPlayer()
  // 생성기 하나를 들고 미리 prepare()해 둔다 — 매번 만들면 Taptic Engine이 식은 채 시작해 소리보다 늦는다.
  private let feedback = UINotificationFeedbackGenerator()
  private var backgroundObserver: NSObjectProtocol?

  @objc override init() {
    super.init()
    setUp()
  }

  @objc init(param _: Any) {
    super.init()
    setUp()
  }

  deinit {
    if let backgroundObserver { NotificationCenter.default.removeObserver(backgroundObserver) }
  }

  private func setUp() {
    DispatchQueue.main.async { [weak self] in
      self?.effects.preload()
      self?.feedback.prepare()
    }
    backgroundObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.didEnterBackgroundNotification,
      object: nil,
      queue: .main
    ) { [weak self] _ in self?.effects.stopAll() }
  }

  @objc func play(_ id: String) {
    DispatchQueue.main.async { [weak self] in self?.effects.play(id) }
  }

  @objc func stopRing() {
    DispatchQueue.main.async { [weak self] in self?.effects.stopRing() }
  }

  /// 햅틱 없는 기기(iPad · 시뮬레이터)에서는 UIKit이 무동작이다. 낸 뒤 다음 판정을 위해 다시 prepare()한다.
  @objc func haptic(_ kind: String?) {
    guard let kind = HapticFeedbackKind.of(kind) else { return }
    let type = kind.feedbackType
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.feedback.notificationOccurred(type)
      self.feedback.prepare()
    }
  }
}
