import XCTest

@testable import Host

/// `contentSyncOpportunity`를 보낼 때의 판정. NWPathMonitor · UIKit 없이 상태기만 잰다.
final class ContentSyncSignalTests: XCTestCase {
  // CS1: 처음 보고는 연결돼 있어도 보내지 않는다(실행 시작은 JS가 스스로 돈다).
  func testCS1FirstReportIgnored() {
    var signal = ContentSyncSignal()
    XCTAssertFalse(signal.pathUpdated(satisfied: true))
    var offline = ContentSyncSignal()
    XCTAssertFalse(offline.pathUpdated(satisfied: false))
  }

  // CS2: 연결 안 됨 → 연결됨에서 보낸다.
  func testCS2OfflineToOnlineEmits() {
    var signal = ContentSyncSignal()
    _ = signal.pathUpdated(satisfied: false)
    XCTAssertTrue(signal.pathUpdated(satisfied: true))
  }

  // CS3: 연결됨 → 연결됨, 연결됨 → 안 됨은 보내지 않는다. 다시 끊겼다 붙으면 또 보낸다.
  func testCS3NoEmitWithoutTransition() {
    var signal = ContentSyncSignal()
    _ = signal.pathUpdated(satisfied: true)
    XCTAssertFalse(signal.pathUpdated(satisfied: true))
    XCTAssertFalse(signal.pathUpdated(satisfied: false))
    XCTAssertFalse(signal.pathUpdated(satisfied: false))
    XCTAssertTrue(signal.pathUpdated(satisfied: true))
    XCTAssertFalse(signal.pathUpdated(satisfied: true))
  }

  // CS4: 백그라운드에서 돌아오면 보낸다. 콜드 스타트의 첫 포그라운드는 보내지 않는다.
  func testCS4ForegroundEmitsAfterBackground() {
    var signal = ContentSyncSignal()
    XCTAssertFalse(signal.willEnterForeground())
    signal.didEnterBackground()
    XCTAssertTrue(signal.willEnterForeground())
    XCTAssertFalse(signal.willEnterForeground())
    signal.didEnterBackground()
    XCTAssertTrue(signal.willEnterForeground())
  }
}
