import CoreGraphics
import XCTest

@testable import Host

/// `ViewportMetrics`의 순수 부분(globalProps 페이로드)을 잰다(HI1 · HI2).
/// **여기가 못 지는 것** — 실제 전송 시점, 실행 중 폭 변화 반영, 글자 크기를 바꿔도 코어에 준 배율이
/// 실행 시 값으로 고정되는지는 e2e의 몫이다.
final class ViewportMetricsTests: XCTestCase {
  // HI1: 키는 `fontScale` · `viewportWidth` 둘이고 값은 Double로 읽힌다.
  func testHI1GlobalPropsCarryBothValuesAsDoubles() {
    XCTAssertEqual(ViewportMetrics.fontScaleKey, "fontScale")
    XCTAssertEqual(ViewportMetrics.viewportWidthKey, "viewportWidth")

    let props = ViewportMetrics.globalProps(fontScale: 1.35, width: 402)
    XCTAssertEqual(props.count, 2)
    XCTAssertEqual(props["fontScale"], 1.35)
    XCTAssertEqual(props["viewportWidth"], 402)
  }

  // HI2: 0 · 음수 · NaN · infinity인 쪽의 키는 맵에 없고 다른 쪽은 남는다.
  func testHI2InvalidValuesAreOmittedWhileTheOtherKeyStays() {
    for invalid in [CGFloat(0), -1, CGFloat.nan, CGFloat.infinity] {
      let badScale = ViewportMetrics.globalProps(fontScale: invalid, width: 402)
      XCTAssertNil(badScale["fontScale"])
      XCTAssertEqual(badScale["viewportWidth"], 402)
      XCTAssertEqual(badScale.count, 1)

      let badWidth = ViewportMetrics.globalProps(fontScale: 1.35, width: invalid)
      XCTAssertNil(badWidth["viewportWidth"])
      XCTAssertEqual(badWidth["fontScale"], 1.35)
      XCTAssertEqual(badWidth.count, 1)
    }

    XCTAssertTrue(ViewportMetrics.globalProps(fontScale: 0, width: -1).isEmpty)
  }
}
