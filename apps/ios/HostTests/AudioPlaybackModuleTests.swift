import AVFoundation
import XCTest

@testable import Host

/// 재생 원천 해석의 판정을 잰다 — https 주소만 원격, 그 밖은 지금의 번들 조회.
/// 실제 소리가 나는지는 여기서 재지 않는다(`docs/e2e/`의 몫).
final class AudioPlaybackModuleTests: XCTestCase {
  private let bucketUrl =
    "https://abc.supabase.co/storage/v1/object/public/content/audio/u01-water/d-01.m4a"

  // AI1: https 주소는 같은 절대 URL로 풀린다(스킴 대소문자는 무시).
  func testAI1ResolvesHttpsUrlsAsRemote() throws {
    let resolved = try XCTUnwrap(AudioPlaybackModule.resolve(bucketUrl))
    XCTAssertEqual(resolved.absoluteString, bucketUrl)

    let upper = "HTTPS://abc.supabase.co/a.m4a"
    let resolvedUpper = try XCTUnwrap(AudioPlaybackModule.resolve(upper))
    XCTAssertEqual(resolvedUpper.absoluteString, upper)
    XCTAssertFalse(resolvedUpper.isFileURL)
  }

  // AI2: 원격이 아니고 번들에도 없으면 nil.
  func testAI2RejectsNonHttpsAndUnknownBundleIds() {
    let rejected = [
      "http://abc.supabase.co/a.m4a",
      "file:///tmp/a.m4a",
      "https://",
      "../greeting-1",
      "",
    ]
    for source in rejected {
      XCTAssertNil(AudioPlaybackModule.resolve(source), "should reject: \(source)")
    }
  }

  // AI3: 번들 id는 지금처럼 번들 안 파일로 풀린다.
  func testAI3ResolvesBundledIdToBundleFile() throws {
    let resolved = try XCTUnwrap(AudioPlaybackModule.resolve("greeting-1"))
    XCTAssertTrue(resolved.isFileURL)
    XCTAssertTrue(resolved.path.hasSuffix("audio/greeting-1.m4a"))
  }

  // AI4: 닿지 않는 https 주소는 done을 정확히 한 번 부른다.
  func testAI4UnreachableRemoteFiresDoneExactlyOnce() {
    let finished = expectation(description: "done")
    finished.assertForOverFulfill = true

    // 모듈을 붙잡아 둔다 — 놓으면 `deinit`이 관찰을 걷어 `done`이 오지 않는다.
    let module = AudioPlaybackModule()
    module.play("https://127.0.0.1:9/a.m4a") { _ in
      finished.fulfill()
    }

    wait(for: [finished], timeout: 10)
    // 늦게 오는 두 번째 `done`을 잡을 관찰 창 — 오면 `assertForOverFulfill`이 실패시킨다.
    RunLoop.current.run(until: Date().addingTimeInterval(0.5))
    withExtendedLifetime(module) {}
  }

  // AI5: 받아 둔 폴더 안 file 주소는 받고, 폴더 밖 file 주소(`..` 탈출 포함)는 거부한다.
  func testAI5AcceptsFileInsideContentRootOnly() throws {
    let base = FileManager.default.temporaryDirectory
      .appendingPathComponent("audio-root-\(UUID().uuidString)", isDirectory: true)
    defer { try? FileManager.default.removeItem(at: base) }
    let store = ContentFileStore(root: base.appendingPathComponent("content-files"))
    let inside = store.root.appendingPathComponent("audio/u01.m4a")
    try FileManager.default.createDirectory(
      at: inside.deletingLastPathComponent(), withIntermediateDirectories: true)
    try Data([1]).write(to: inside)
    let outside = base.appendingPathComponent("other.m4a")
    try Data([1]).write(to: outside)

    XCTAssertEqual(
      AudioPlaybackModule.resolve(inside.absoluteString, contentFiles: store)?.path,
      inside.path)
    XCTAssertNil(AudioPlaybackModule.resolve(outside.absoluteString, contentFiles: store))
    let escape = store.root.absoluteString + "audio/../../other.m4a"
    XCTAssertNil(AudioPlaybackModule.resolve(escape, contentFiles: store))
    // 루트 이름만 같은 형제 폴더도 아니다.
    let sibling = base.appendingPathComponent("content-files-evil/a.m4a")
    XCTAssertNil(AudioPlaybackModule.resolve(sibling.absoluteString, contentFiles: store))
  }

  // MARK: - 속도 재생 (playAtRate)

  // AI6: 요청 배율의 정규화 — 비정상 · 범위 밖(0.5 ~ 2.0 밖)은 1, 범위 안은 그대로.
  func testAI6PlaybackRateNormalizesOutOfRangeAndInvalidValues() {
    let normalizedToOne: [NSNumber?] = [
      nil,
      NSNumber(value: Double.nan),
      NSNumber(value: Double.infinity),
      NSNumber(value: -Double.infinity),
      NSNumber(value: 0.0),
      NSNumber(value: 0.49),
      NSNumber(value: 2.01),
    ]
    for requested in normalizedToOne {
      XCTAssertEqual(
        AudioPlaybackModule.playbackRate(requested), 1, "should normalize: \(String(describing: requested))")
    }
    for kept in [0.5, 0.85, 1.0, 2.0] {
      XCTAssertEqual(
        AudioPlaybackModule.playbackRate(NSNumber(value: kept)), Float(kept), accuracy: 0.0001)
    }
  }

  // AI7: `applyRate`는 소스와 무관하다 — 해석된 주소가 어떤 종류든 같은 AVPlayerItem/AVPlayer 설정을 한다.
  // 이 테스트는 원격 https와 받아 둔 file://이 실제로 0.85로 *들린다*는 증명이 아니다(그건 기기 확인 EU1).
  // 여기서는 세 종류 주소로 만든 항목에 같은 설정이 서는 것만 판정한다.
  func testAI7ApplyRateIsSourceIndependent() throws {
    let base = FileManager.default.temporaryDirectory
      .appendingPathComponent("audio-rate-\(UUID().uuidString)", isDirectory: true)
    defer { try? FileManager.default.removeItem(at: base) }
    let store = ContentFileStore(root: base.appendingPathComponent("content-files"))
    let inside = store.root.appendingPathComponent("audio/u01.m4a")
    try FileManager.default.createDirectory(
      at: inside.deletingLastPathComponent(), withIntermediateDirectories: true)
    try Data([1]).write(to: inside)

    let sources: [(String, URL)] = [
      ("https", try XCTUnwrap(AudioPlaybackModule.resolve(bucketUrl))),
      ("file", try XCTUnwrap(AudioPlaybackModule.resolve(inside.absoluteString, contentFiles: store))),
      ("bundle", try XCTUnwrap(AudioPlaybackModule.resolve("greeting-1"))),
    ]
    for (label, url) in sources {
      let slowItem = AVPlayerItem(url: url)
      let slowPlayer = AVPlayer(playerItem: slowItem)
      AudioPlaybackModule.applyRate(0.85, item: slowItem, player: slowPlayer)
      XCTAssertEqual(slowPlayer.defaultRate, 0.85, accuracy: 0.0001, label)
      XCTAssertEqual(slowItem.audioTimePitchAlgorithm, .timeDomain, label)

      let normalItem = AVPlayerItem(url: url)
      let normalPlayer = AVPlayer(playerItem: normalItem)
      let initialAlgorithm = normalItem.audioTimePitchAlgorithm
      AudioPlaybackModule.applyRate(1, item: normalItem, player: normalPlayer)
      XCTAssertEqual(normalPlayer.defaultRate, 1, accuracy: 0.0001, label)
      XCTAssertEqual(normalItem.audioTimePitchAlgorithm, initialAlgorithm, label)
    }
  }

  // AI8: 호스트 메서드는 다섯이고 각 셀렉터에 응답한다.
  func testAI8MethodLookupHasFiveMethodsThatTheModuleRespondsTo() {
    let lookup = AudioPlaybackModule.methodLookup
    XCTAssertEqual(Set(lookup.keys), ["play", "playAtRate", "stop", "pause", "resume"])
    let module = AudioPlaybackModule()
    for (name, selector) in lookup {
      XCTAssertTrue(module.responds(to: NSSelectorFromString(selector)), "no selector for \(name)")
    }
  }

  // MARK: - 호스트 integration (소리가 나는 재생)

  /// 번들 `greeting-1`을 `rate`로 재생해 `done`까지 걸린 초를 잰다. `rate`가 nil이면 `play`다.
  private func elapsedPlaying(_ module: AudioPlaybackModule, rate: Double?) -> TimeInterval {
    let finished = expectation(description: "done \(String(describing: rate))")
    finished.assertForOverFulfill = true
    let start = CFAbsoluteTimeGetCurrent()
    var end = start
    let finish = {
      end = CFAbsoluteTimeGetCurrent()
      finished.fulfill()
    }
    if let rate {
      module.playAtRate("greeting-1", rate: NSNumber(value: rate)) { _ in finish() }
    } else {
      module.play("greeting-1") { _ in finish() }
    }
    wait(for: [finished], timeout: 30)
    return end - start
  }

  // AI9: 0.85로 재면 1.0보다 1.1배 이상 오래 걸리고 둘 다 done은 한 번이다.
  func testAI9SlowPlaybackTakesLongerAndFiresDoneOnce() {
    let module = AudioPlaybackModule()
    let normal = elapsedPlaying(module, rate: nil)
    let slow = elapsedPlaying(module, rate: 0.85)

    XCTAssertGreaterThanOrEqual(slow, normal * 1.1, "normal=\(normal) slow=\(slow)")
    RunLoop.current.run(until: Date().addingTimeInterval(0.5))
    withExtendedLifetime(module) {}
  }

  // AI10: 0.85 재생 중 stop은 done을 부르지 않고, 닿지 않는 https의 0.85는 done을 정확히 한 번 부른다.
  func testAI10StopDuringSlowPlaybackSilencesDone() {
    let module = AudioPlaybackModule()
    let silent = expectation(description: "no done after stop")
    silent.isInverted = true
    module.playAtRate("greeting-1", rate: NSNumber(value: 0.85)) { _ in silent.fulfill() }
    RunLoop.current.run(until: Date().addingTimeInterval(0.1))

    module.stop()

    wait(for: [silent], timeout: 1)
    withExtendedLifetime(module) {}
  }

  func testAI10UnreachableRemoteAtSlowRateFiresDoneExactlyOnce() {
    let finished = expectation(description: "done")
    finished.assertForOverFulfill = true

    let module = AudioPlaybackModule()
    module.playAtRate("https://127.0.0.1:9/a.m4a", rate: NSNumber(value: 0.85)) { _ in
      finished.fulfill()
    }

    wait(for: [finished], timeout: 10)
    RunLoop.current.run(until: Date().addingTimeInterval(0.5))
    withExtendedLifetime(module) {}
  }
}
