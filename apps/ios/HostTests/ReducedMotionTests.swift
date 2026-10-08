import XCTest

@testable import Host

/// `ReducedMotion`의 순수 부분(globalProps 페이로드)을 잰다(IR1).
/// **여기가 못 지는 것** — `UIAccessibility` 알림 구독 · 실행 중 토글 반영 · 실제 애니메이션 정지는 e2e의 몫이다.
final class ReducedMotionTests: XCTestCase {
  // IR1: 키는 `reducedMotion` 하나, 값은 Bool 그대로(숫자 아님).
  func testIR1GlobalPropsCarryTheBoolUnderASingleKey() {
    XCTAssertEqual(ReducedMotion.globalPropsKey, "reducedMotion")

    let on = ReducedMotion.globalProps(enabled: true)
    XCTAssertEqual(on.count, 1)
    XCTAssertEqual(on["reducedMotion"] as? Bool, true)

    let off = ReducedMotion.globalProps(enabled: false)
    XCTAssertEqual(off.count, 1)
    XCTAssertEqual(off["reducedMotion"] as? Bool, false)
  }
}
