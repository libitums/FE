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
}
