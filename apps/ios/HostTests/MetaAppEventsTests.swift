import FBSDKCoreKit
import XCTest

@testable import Host

/// Meta 앱 이벤트 호스트 계약(N-I1 ~ N-I6). 실제 SDK 수신은 보지 않는다 — 판정 · 이름 · 번들 선언까지다.
final class MetaAppEventsTests: XCTestCase {
  // N-I1: 앱 ID는 숫자뿐, 토큰은 공백 없는 한 덩어리일 때만 설정이 선다(앞뒤 공백은 trim).
  func testNI1ValidValuesBuildAConfig() {
    let config = MetaAppEventsConfig.from(appID: "123", clientToken: "abc")
    XCTAssertEqual(config?.appID, "123")
    XCTAssertEqual(config?.clientToken, "abc")
  }

  func testNI1SurroundingWhitespaceIsTrimmed() {
    let config = MetaAppEventsConfig.from(appID: "  123\n", clientToken: "\tabc  ")
    XCTAssertEqual(config?.appID, "123")
    XCTAssertEqual(config?.clientToken, "abc")
  }

  func testNI1MissingBlankOrOneSidedValuesYieldNil() {
    let cases: [(Any?, Any?)] = [
      (nil, nil), ("", ""), ("   ", "   "),
      (nil, "abc"), ("123", nil),
      ("123", ""), ("", "abc"), ("123", "   "), ("   ", "abc"),
    ]
    for (appID, clientToken) in cases {
      XCTAssertNil(MetaAppEventsConfig.from(appID: appID, clientToken: clientToken))
    }
  }

  func testNI1NonNumericAppIdOrSpacedTokenYieldNil() {
    XCTAssertNil(MetaAppEventsConfig.from(appID: "12a", clientToken: "abc"))
    XCTAssertNil(MetaAppEventsConfig.from(appID: "12 3", clientToken: "abc"))
    XCTAssertNil(MetaAppEventsConfig.from(appID: "-123", clientToken: "abc"))
    XCTAssertNil(MetaAppEventsConfig.from(appID: "123", clientToken: "ab c"))
  }

  func testNI1NonStringInputsYieldNil() {
    XCTAssertNil(MetaAppEventsConfig.from(appID: 123, clientToken: "abc"))
    XCTAssertNil(MetaAppEventsConfig.from(appID: "123", clientToken: 456))
    XCTAssertNil(MetaAppEventsConfig.from(appID: ["123"], clientToken: true))
  }

  // N-I2: 모듈 이름과 메서드 표.
  func testNI2ModuleNameAndMethodLookup() {
    XCTAssertEqual(MetaAppEventsModule.name, "MetaAppEventsModule")
    XCTAssertEqual(Set(MetaAppEventsModule.methodLookup.keys), ["logEvent"])
  }

  // N-I3: 문자열 값만 남긴다.
  func testNI3StringParametersKeepOnlyStrings() {
    let parameters: [String: Any] = [
      "fb_level": "appointment-confirmation",
      "fb_content_type": "messenger",
      "count": 3,
      "ratio": 0.5,
      "flag": true,
      "nested": ["inner": "x"],
    ]

    XCTAssertEqual(
      MetaAppEventsModule.stringParameters(from: parameters),
      ["fb_level": "appointment-confirmation", "fb_content_type": "messenger"]
    )
  }

  func testNI3EmptyParametersYieldAnEmptyDictionary() {
    XCTAssertEqual(MetaAppEventsModule.stringParameters(from: [:]), [:])
  }

  // N-I4: JS 계약의 와이어 이름 넷이 SDK 상수와 같다. 다르면 계약을 정정한다(spec §14 C7).
  func testNI4WireNamesMatchSdkConstants() {
    XCTAssertEqual(AppEvents.Name.completedRegistration.rawValue, "fb_mobile_complete_registration")
    XCTAssertEqual(AppEvents.Name.achievedLevel.rawValue, "fb_mobile_level_achieved")
    XCTAssertEqual(AppEvents.ParameterName.level.rawValue, "fb_level")
    XCTAssertEqual(AppEvents.ParameterName.contentType.rawValue, "fb_content_type")
  }

  // N-I5: 테스트 호스트 앱의 시작 여부가 번들 값 유무와 같다. 값 없는 빌드에서는 false여야 한다.
  func testNI5StartedMatchesTheBundleValues() {
    XCTAssertEqual(MetaAppEvents.isStarted, MetaAppEventsConfig.fromBundle() != nil)
  }

  func testNI5LogEventWhenNotStartedDoesNothing() throws {
    try XCTSkipIf(MetaAppEvents.isStarted, "값이 있는 빌드에서는 실제 이벤트가 나가므로 부르지 않는다")
    let module = MetaAppEventsModule()

    module.logEvent("fb_mobile_complete_registration", parameters: [:])
    module.logEvent("", parameters: ["fb_level": "u"])

    XCTAssertFalse(MetaAppEvents.isStarted)
  }

  // N-I6: 추적 허용 문구 없음, SKAdNetwork 식별자 둘.
  func testNI6InfoDictionaryDeclaresNoTrackingPromptAndTwoSkAdNetworkIds() {
    let info = Bundle.main.infoDictionary ?? [:]

    XCTAssertNil(info["NSUserTrackingUsageDescription"])
    let items = info["SKAdNetworkItems"] as? [[String: Any]] ?? []
    let identifiers = Set(items.compactMap { $0["SKAdNetworkIdentifier"] as? String })
    XCTAssertTrue(identifiers.isSuperset(of: ["v9wttpbfk9.skadnetwork", "n38lu8286q.skadnetwork"]))
  }
}
