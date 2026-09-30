import AVFoundation
import XCTest

@testable import Host

final class RecordingAudioSessionTests: XCTestCase {
  func testRecordingTemporarilyReplacesDefaultPlaybackConfiguration() throws {
    let session = FakeAudioSession()
    let recording = RecordingAudioSession(session: session)
    try recording.activate()
    XCTAssertEqual(session.category, .record)
    XCTAssertEqual(session.mode, .measurement)
    XCTAssertEqual(session.categoryOptions, [])
    XCTAssertEqual(session.activations, [true])
    XCTAssertEqual(session.activationOptions, [[]])

    recording.restore()
    XCTAssertEqual(session.category, .soloAmbient)
    XCTAssertEqual(session.mode, .default)
    XCTAssertEqual(session.categoryOptions, [])
    XCTAssertEqual(session.activations, [true, false])
    XCTAssertEqual(session.activationOptions.last, .notifyOthersOnDeactivation)
  }

  func testRestoresPreviousModeAndOptionsRatherThanHardCodingPlaybackPolicy() throws {
    let session = FakeAudioSession()
    session.category = .playback
    session.mode = .spokenAudio
    session.categoryOptions = [.mixWithOthers, .duckOthers]
    let recording = RecordingAudioSession(session: session)
    try recording.activate()
    recording.restore()
    XCTAssertEqual(session.category, .playback)
    XCTAssertEqual(session.mode, .spokenAudio)
    XCTAssertEqual(session.categoryOptions, [.mixWithOthers, .duckOthers])
  }

  func testActivationFailureRollsBackRecordingConfiguration() {
    let session = FakeAudioSession()
    session.failActivation = true
    let recording = RecordingAudioSession(session: session)
    XCTAssertThrowsError(try recording.activate())
    XCTAssertEqual(session.category, .soloAmbient)
    XCTAssertEqual(session.mode, .default)
    XCTAssertEqual(session.activations, [true, false])
    recording.restore()
    XCTAssertEqual(session.activations, [true, false])
  }

  func testCategoryFailureRollsBackPartialConfiguration() {
    let session = FakeAudioSession()
    session.failRecordCategory = true
    let recording = RecordingAudioSession(session: session)
    XCTAssertThrowsError(try recording.activate())
    XCTAssertEqual(session.category, .soloAmbient)
    XCTAssertEqual(session.mode, .default)
    XCTAssertEqual(session.activations, [false])
  }

  func testDeactivationFailureStillRestoresPlaybackConfiguration() throws {
    let session = FakeAudioSession()
    let recording = RecordingAudioSession(session: session)
    try recording.activate()
    session.failDeactivation = true
    recording.restore()
    XCTAssertEqual(session.category, .soloAmbient)
    XCTAssertEqual(session.mode, .default)
  }

  func testLateRepeatedCleanupDoesNotDeactivateNewPlayback() throws {
    let session = FakeAudioSession()
    let recording = RecordingAudioSession(session: session)
    try recording.activate()
    recording.restore()
    try session.setCategory(.playback, mode: .spokenAudio, options: [.mixWithOthers])
    try session.setActive(true, options: [])
    recording.restore()
    XCTAssertEqual(session.category, .playback)
    XCTAssertEqual(session.mode, .spokenAudio)
    XCTAssertEqual(session.activations, [true, false, true])
  }

  func testRepeatedActivationPreservesOriginalConfiguration() throws {
    let session = FakeAudioSession()
    let recording = RecordingAudioSession(session: session)
    try recording.activate()
    try recording.activate()
    recording.restore()
    XCTAssertEqual(session.category, .soloAmbient)
    XCTAssertEqual(session.activations, [true, false])
  }

  func testCleanupBeforeActivationDoesNotTouchSharedSession() {
    let session = FakeAudioSession()
    RecordingAudioSession(session: session).restore()
    XCTAssertTrue(session.activations.isEmpty)
    XCTAssertEqual(session.category, .soloAmbient)
  }

  // 실제 AVAudioSession과 기존 재생 모듈을 함께 지난다. 마이크 입력이나 음성 인식기는
  // 시작하지 않는다. 실패도 부르는 완료 콜백과 별개로 실제 재생 종료 알림을 확인한다.
  @MainActor
  func testRestoredSystemSessionAllowsBundledPlaybackToFinish() throws {
    let system = AVAudioSession.sharedInstance()
    let originalCategory = system.category
    let originalMode = system.mode
    let originalOptions = system.categoryOptions
    let player = AudioPlaybackModule()
    defer {
      player.stop()
      try? system.setActive(false, options: .notifyOthersOnDeactivation)
      try? system.setCategory(originalCategory, mode: originalMode, options: originalOptions)
    }
    try system.setCategory(.soloAmbient, mode: .default, options: [])
    let recording = RecordingAudioSession()
    try recording.activate()
    XCTAssertEqual(system.category, .record)
    recording.restore()
    XCTAssertEqual(system.category, .soloAmbient)
    XCTAssertEqual(system.mode, .default)
    XCTAssertEqual(system.categoryOptions, [])

    let ended = expectation(description: "Bundled greeting reaches its actual end")
    let observer = NotificationCenter.default.addObserver(
      forName: AVPlayerItem.didPlayToEndTimeNotification, object: nil, queue: .main
    ) { notification in
      guard let item = notification.object as? AVPlayerItem,
        let asset = item.asset as? AVURLAsset,
        asset.url.lastPathComponent == "greeting-1.m4a"
      else { return }
      ended.fulfill()
    }
    defer { NotificationCenter.default.removeObserver(observer) }
    let completed = expectation(description: "Playback callback fires exactly once")
    completed.assertForOverFulfill = true
    player.play("greeting-1") { _ in completed.fulfill() }
    wait(for: [ended, completed], timeout: 20)
    XCTAssertEqual(system.category, .soloAmbient)
  }
}

private final class FakeAudioSession: RecordingAudioSessionClient {
  var category: AVAudioSession.Category = .soloAmbient
  var mode: AVAudioSession.Mode = .default
  var categoryOptions: AVAudioSession.CategoryOptions = []
  var activations: [Bool] = []
  var activationOptions: [AVAudioSession.SetActiveOptions] = []
  var failActivation = false
  var failDeactivation = false
  var failRecordCategory = false

  func setCategory(
    _ category: AVAudioSession.Category,
    mode: AVAudioSession.Mode,
    options: AVAudioSession.CategoryOptions
  ) throws {
    self.category = category
    self.mode = mode
    self.categoryOptions = options
    if failRecordCategory && category == .record { throw TestError.unavailable }
  }

  func setActive(_ active: Bool, options: AVAudioSession.SetActiveOptions) throws {
    activations.append(active)
    activationOptions.append(options)
    if (active && failActivation) || (!active && failDeactivation) {
      throw TestError.unavailable
    }
  }

  private enum TestError: Error { case unavailable }
}
