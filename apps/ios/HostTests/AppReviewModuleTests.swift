import XCTest

@testable import Host

/// `AppReviewModule`의 이름 · 메서드 표를 잰다(AR1). **여기가 못 지는 것** — 평점 창이 실제로 뜨는지는 iOS가 정하고
/// 사람이 기기에서 본다(e2e).
final class AppReviewModuleTests: XCTestCase {
  func testAR1ModuleNameAndMethodLookup() {
    XCTAssertEqual(AppReviewModule.name, "AppReviewModule")
    XCTAssertEqual(Set(AppReviewModule.methodLookup.keys), ["requestReview"])
  }
}
