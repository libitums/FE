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
  private var players: [SoundEffectAsset: AVAudioPlayer] = [:]
  private var activeOneShot: AVAudioPlayer?

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
      // 빠른 연속 탭에서 짧은 효과음이 무한히 겹치지 않게 한다. 벨·학습 음성은 별개다.
      activeOneShot?.stop()
      activeOneShot = player
    }
    player.currentTime = 0
    player.play()
  }

  func stopRing() {
    players[.ring_bell]?.stop()
    players[.ring_bell]?.currentTime = 0
  }

  func stopAll() {
    stopRing()
    activeOneShot?.stop()
    activeOneShot = nil
  }
}

@objc(SoundEffectsModule)
final class SoundEffectsModule: NSObject, LynxModule {
  @objc static var name: String { "SoundEffectsModule" }

  @objc static var methodLookup: [String: String] {
    [
      "play": NSStringFromSelector(#selector(play(_:))),
      "stopRing": NSStringFromSelector(#selector(stopRing)),
    ]
  }

  private let effects = SoundEffectsPlayer()
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
    DispatchQueue.main.async { [weak self] in self?.effects.preload() }
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
}
