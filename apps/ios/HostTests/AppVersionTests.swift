import XCTest

@testable import Host

/// `AppVersion`의 순수 부분(globalProps 페이로드)을 잰다(HV1~HV3). **여기가 못 지는 것** — 실제 전송 시점과
/// 설정 화면에 보이는 문구는 e2e의 몫이다.
final class AppVersionTests: XCTestCase {
  // HV1: 키 하나 `appVersion` 아래 platform · name · build 셋이고 build는 정수다.
  func testHV1GlobalPropsCarryPlatformNameAndIntegerBuild() {
    XCTAssertEqual(AppVersion.key, "appVersion")
    let props = AppVersion.globalProps(name: "1.0", build: "11")
    XCTAssertEqual(props.count, 1)
    let version = props["appVersion"] as? [String: Any]
    XCTAssertEqual(version?["platform"] as? String, "ios")
    XCTAssertEqual(version?["name"] as? String, "1.0")
    XCTAssertEqual(version?["build"] as? Int, 11)
    XCTAssertEqual(AppVersion.globalProps(name: "1.0", build: "0")["appVersion"] != nil, true)
  }

  // HV2: 이름이 없거나 비었거나, 빌드가 없거나 정수가 아니거나 음수면 아무것도 싣지 않는다.
  func testHV2InvalidValuesSendNothing() {
    XCTAssertTrue(AppVersion.globalProps(name: nil, build: "11").isEmpty)
    XCTAssertTrue(AppVersion.globalProps(name: "", build: "11").isEmpty)
    XCTAssertTrue(AppVersion.globalProps(name: "1.0", build: nil).isEmpty)
    XCTAssertTrue(AppVersion.globalProps(name: "1.0", build: "1.0.11").isEmpty)
    XCTAssertTrue(AppVersion.globalProps(name: "1.0", build: "-1").isEmpty)
    XCTAssertTrue(AppVersion.globalProps(name: "1.0", build: "").isEmpty)
  }

  // HV3: 번들의 Info.plist 두 키를 읽는다 — 테스트 번들에는 둘 다 있다.
  func testHV3CurrentReadsTheBundleInfoDictionary() {
    let bundle = Bundle(for: AppVersionTests.self)
    let expected = AppVersion.globalProps(
      name: bundle.infoDictionary?["CFBundleShortVersionString"] as? String,
      build: bundle.infoDictionary?["CFBundleVersion"] as? String
    )
    XCTAssertEqual(AppVersion.current(bundle: bundle).keys.sorted(), expected.keys.sorted())
  }
}
