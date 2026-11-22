import XCTest

@testable import Host

/// PA-1 ~ PA-4: RevenueCat 고객에 Airbridge 기기 id를 거는 판정(ADR-0144 「Airbridge 기기 id」). 실제 SDK 전송은 보지 않는다 — 판정까지다.
final class PurchasesAttributionTests: XCTestCase {
  // PA-1: 기기 id는 trim한 뒤 공백 없는 한 덩어리일 때만 쓴다.
  func testPA1ValidDeviceIDIsTrimmed() {
    XCTAssertEqual(
      PurchasesAttribution.deviceID("  3F2A9C1E-5B7D-4E2A-9F1C-0A1B2C3D4E5F\n"),
      "3F2A9C1E-5B7D-4E2A-9F1C-0A1B2C3D4E5F")
  }

  func testPA1MissingBlankOrSpacedDeviceIDIsNil() {
    XCTAssertNil(PurchasesAttribution.deviceID(nil))
    XCTAssertNil(PurchasesAttribution.deviceID(""))
    XCTAssertNil(PurchasesAttribution.deviceID("   "))
    XCTAssertNil(PurchasesAttribution.deviceID("3F2A 9C1E"))
  }

  // PA-2: 두 SDK가 모두 시작됐고 추적을 멈추지 않았을 때만 건다.
  func testPA2LinksOnlyWhenBothStartedAndTrackingNotStopped() {
    XCTAssertTrue(PurchasesAttribution.shouldLink(purchasesStarted: true, airbridgeStarted: true, trackingStopped: false))
    XCTAssertFalse(PurchasesAttribution.shouldLink(purchasesStarted: false, airbridgeStarted: true, trackingStopped: false))
    XCTAssertFalse(PurchasesAttribution.shouldLink(purchasesStarted: true, airbridgeStarted: false, trackingStopped: false))
    XCTAssertFalse(PurchasesAttribution.shouldLink(purchasesStarted: true, airbridgeStarted: true, trackingStopped: true))
  }

  // PA-4: 추적 허용을 정한 뒤에는 허용했을 때만 식별자를 다시 모은다(대화상자는 띄우지 않는다).
  func testPA4CollectsAgainOnlyWhenAuthorizedAndLinkable() {
    XCTAssertTrue(
      PurchasesAttribution.shouldCollectAfterTrackingDecision(
        authorized: true, purchasesStarted: true, airbridgeStarted: true, trackingStopped: false))
    XCTAssertFalse(
      PurchasesAttribution.shouldCollectAfterTrackingDecision(
        authorized: false, purchasesStarted: true, airbridgeStarted: true, trackingStopped: false))
    XCTAssertFalse(
      PurchasesAttribution.shouldCollectAfterTrackingDecision(
        authorized: true, purchasesStarted: false, airbridgeStarted: true, trackingStopped: false))
    XCTAssertFalse(
      PurchasesAttribution.shouldCollectAfterTrackingDecision(
        authorized: true, purchasesStarted: true, airbridgeStarted: true, trackingStopped: true))
  }
}
