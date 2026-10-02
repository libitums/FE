import AVFoundation
import XCTest

@testable import Host

final class SoundEffectsModuleTests: XCTestCase {
  func testEveryAllowedEffectIsBundledAndDecodable() throws {
    XCTAssertEqual(SoundEffectAsset.allCases.count, 8)
    for asset in SoundEffectAsset.allCases {
      let url = try XCTUnwrap(asset.url(), "Missing sound effect: \(asset.rawValue)")
      let player = try AVAudioPlayer(contentsOf: url)
      XCTAssertGreaterThan(player.duration, 0, asset.rawValue)
      XCTAssertTrue(player.play(), "Could not play sound effect: \(asset.rawValue)")
      player.stop()
    }
  }

  func testOnlyKnownIdsCanResolveToBundledFiles() {
    XCTAssertNil(SoundEffectAsset(rawValue: "../audio/greeting-1"))
    XCTAssertNil(SoundEffectAsset(rawValue: "unknown"))
    XCTAssertNotNil(SoundEffectAsset(rawValue: "correct_answer"))
  }

  func testDifferentEffectsOverlapAndStopAllStopsBoth() throws {
    let effects = SoundEffectsPlayer()
    effects.play(SoundEffectAsset.correct_answer.rawValue)
    effects.play(SoundEffectAsset.button.rawValue)

    let correct = try XCTUnwrap(effects.players[.correct_answer])
    let button = try XCTUnwrap(effects.players[.button])
    XCTAssertTrue(correct.isPlaying)
    XCTAssertTrue(button.isPlaying)

    effects.stopAll()
    XCTAssertFalse(correct.isPlaying)
    XCTAssertFalse(button.isPlaying)
  }
}
