import XCTest

@testable import Host

/// `NetworkStatusModule`의 순수 부분(분류표 · 이름 · 메서드 표 · 첫 보고 전 값)을 잰다(NM1~NM4). **여기가 못 지는 것** —
/// 실제 Wi-Fi · 셀룰러 · 저데이터 모드에서 `NWPath`가 무엇을 보고하는지는 기기에서 본다(e2e).
final class NetworkStatusModuleTests: XCTestCase {
  private func label(
    satisfied: Bool = true, wifi: Bool = false, cellular: Bool = false, wired: Bool = false,
    expensive: Bool = false, constrained: Bool = false
  ) -> String {
    NetworkStatusLabel.of(
      satisfied: satisfied, wifi: wifi, cellular: cellular, wired: wired, expensive: expensive,
      constrained: constrained)
  }

  // NM1: 분류표가 JS 해석(`lib/network-status.ts`)의 값과 같다.
  func testNM1Labels() {
    XCTAssertEqual(label(satisfied: false, wifi: true), "offline:unknown")
    XCTAssertEqual(label(wifi: true), "wifi:unmetered")
    XCTAssertEqual(label(wifi: true, expensive: true), "wifi:metered")
    XCTAssertEqual(label(cellular: true, expensive: true), "cellular:metered")
    XCTAssertEqual(label(cellular: true, expensive: true, constrained: true), "cellular:constrained")
    XCTAssertEqual(label(wifi: true, constrained: true), "wifi:constrained")
    XCTAssertEqual(label(wired: true), "ethernet:unmetered")
    XCTAssertEqual(label(wifi: true, cellular: true), "wifi:unmetered")
    XCTAssertEqual(label(), "other:unmetered")
  }

  // NM2: 모듈 이름과 메서드 표가 JS 접점과 같다.
  func testNM2ModuleNameAndMethodLookup() {
    XCTAssertEqual(NetworkStatusModule.name, "NetworkStatusModule")
    XCTAssertEqual(Set(NetworkStatusModule.methodLookup.keys), ["current"])
  }

  // NM3: 첫 경로 보고 전에는 unknown이다.
  func testNM3UnknownBeforeFirstReport() {
    XCTAssertEqual(NetworkStatusMonitor().current, NetworkStatusLabel.unknown)
  }

  // NM4: start를 여러 번 불러도 안전하고, 값은 늘 JS가 읽는 꼴이다.
  func testNM4StartIsIdempotentAndValueIsWellFormed() {
    let monitor = NetworkStatusMonitor()
    monitor.start()
    monitor.start()
    XCTAssertEqual(monitor.current.split(separator: ":").count, 2)
  }
}
