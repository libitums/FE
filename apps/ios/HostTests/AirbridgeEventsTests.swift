import Airbridge
import XCTest

@testable import Host

/// Airbridge 이벤트 호스트 계약(N-I1 ~ N-I7, docs/adr/0063-airbridge-events.md). 실제 SDK 수신은 보지 않는다 —
/// 판정 · 이름 · 번들 선언 · 조건부 등록까지다.
final class AirbridgeEventsTests: XCTestCase {
  // N-I1: 앱 이름은 영문 · 숫자 · 밑줄 · 하이픈만, 토큰은 공백 없는 한 덩어리일 때만 설정이 선다(앞뒤 공백은 trim).
  func testNI1ValidValuesBuildAConfig() {
    let config = AirbridgeEventsConfig.from(appName: "duru", sdkToken: "0a1b2c")
    XCTAssertEqual(config?.appName, "duru")
    XCTAssertEqual(config?.sdkToken, "0a1b2c")
  }

  func testNI1SurroundingWhitespaceIsTrimmed() {
    let config = AirbridgeEventsConfig.from(appName: "  duru\n", sdkToken: "\t0a1b2c  ")
    XCTAssertEqual(config?.appName, "duru")
    XCTAssertEqual(config?.sdkToken, "0a1b2c")
  }

  func testNI1UnderscoreAndHyphenInTheNameAreAllowed() {
    let config = AirbridgeEventsConfig.from(appName: "du_ru-1", sdkToken: "0a1b2c")
    XCTAssertEqual(config?.appName, "du_ru-1")
  }

  func testNI1MissingBlankOrOneSidedValuesYieldNil() {
    let cases: [(Any?, Any?)] = [
      (nil, nil), ("", ""), ("   ", "   "),
      (nil, "0a1b2c"), ("duru", nil),
      ("duru", ""), ("", "0a1b2c"), ("duru", "   "), ("   ", "0a1b2c"),
    ]
    for (appName, sdkToken) in cases {
      XCTAssertNil(AirbridgeEventsConfig.from(appName: appName, sdkToken: sdkToken))
    }
  }

  func testNI1NameWithSpaceDotOrNonAsciiYieldsNil() {
    XCTAssertNil(AirbridgeEventsConfig.from(appName: "du ru", sdkToken: "0a1b2c"))
    XCTAssertNil(AirbridgeEventsConfig.from(appName: "du.ru", sdkToken: "0a1b2c"))
    XCTAssertNil(AirbridgeEventsConfig.from(appName: "두루", sdkToken: "0a1b2c"))
  }

  func testNI1TokenWithInnerWhitespaceYieldsNil() {
    XCTAssertNil(AirbridgeEventsConfig.from(appName: "duru", sdkToken: "ab c"))
  }

  func testNI1NonStringInputsYieldNil() {
    XCTAssertNil(AirbridgeEventsConfig.from(appName: 123, sdkToken: "0a1b2c"))
    XCTAssertNil(AirbridgeEventsConfig.from(appName: "duru", sdkToken: ["x"]))
    XCTAssertNil(AirbridgeEventsConfig.from(appName: true, sdkToken: "0a1b2c"))
  }

  // N-I2: 모듈 이름과 메서드 표.
  func testNI2ModuleNameAndMethodLookup() {
    XCTAssertEqual(AirbridgeEventsModule.name, "AirbridgeEventsModule")
    XCTAssertEqual(
      Set(AirbridgeEventsModule.methodLookup.keys),
      ["trackEvent", "requestTrackingAuthorization", "takeOpenedDeeplink"])
    XCTAssertEqual(AirbridgeEventsModule.methodLookup["takeOpenedDeeplink"], "takeOpenedDeeplink:")
    XCTAssertEqual(
      AirbridgeEventsModule.methodLookup["trackEvent"], "trackEvent:semanticAttributes:")
    XCTAssertEqual(
      AirbridgeEventsModule.methodLookup["requestTrackingAuthorization"],
      "requestTrackingAuthorization")
  }

  // N-I10(ADR-0080): 우리 scheme만 딥링크로 받고, 로그인 콜백 · 다른 scheme은 받지 않는다.
  func testNI10OwnDeeplinkIsDuruSchemeExceptAuthCallback() {
    XCTAssertTrue(AirbridgeDeeplinks.isOwnDeeplink(URL(string: "duru://roleplay")!))
    XCTAssertTrue(AirbridgeDeeplinks.isOwnDeeplink(URL(string: "DURU://settings?x=1")!))
    XCTAssertFalse(AirbridgeDeeplinks.isOwnDeeplink(URL(string: "duru://auth-callback?code=1")!))
    XCTAssertFalse(AirbridgeDeeplinks.isOwnDeeplink(URL(string: "https://duru.airbridge.io/a")!))
  }

  // N-I11(ADR-0080): 앱 scheme과 universal link 도메인 둘이 번들 · 서명 설정에 있다.
  func testNI11UrlSchemeIsRegistered() {
    let types = Bundle.main.object(forInfoDictionaryKey: "CFBundleURLTypes") as? [[String: Any]] ?? []
    let schemes = types.flatMap { $0["CFBundleURLSchemes"] as? [String] ?? [] }
    XCTAssertEqual(schemes, ["duru"])
  }

  // N-I8(ADR-0079): 설치 이벤트가 추적 허용 결정을 SDK 기본 30초보다 오래 기다린다.
  func testNI8TrackingAuthorizationTimeoutOutlastsTheDefault() {
    XCTAssertEqual(AirbridgeEvents.trackingAuthorizationTimeoutSeconds, 600)
  }

  // N-I9(ADR-0079): 추적 허용 문구가 번들에 있다(없으면 요청 순간 앱이 죽는다).
  func testNI9TrackingUsageDescriptionIsInTheBundle() {
    let text = Bundle.main.object(forInfoDictionaryKey: "NSUserTrackingUsageDescription") as? String
    XCTAssertEqual(
      text,
      "Allow tracking so we can measure which ads helped you find Duru. We never sell your data.")
  }

  // N-I3: 문자열 값만 남긴다.
  func testNI3StringAttributesKeepOnlyStrings() {
    let attributes: [String: Any] = [
      "level": "appointment-confirmation",
      "label": "messenger",
      "count": 3,
      "ratio": 0.5,
      "flag": true,
      "nested": ["inner": "x"],
    ]

    XCTAssertEqual(
      AirbridgeEventsModule.stringAttributes(from: attributes),
      ["level": "appointment-confirmation", "label": "messenger"]
    )
  }

  func testNI3EmptyAttributesYieldAnEmptyDictionary() {
    XCTAssertEqual(AirbridgeEventsModule.stringAttributes(from: [:]), [:])
  }

  // N-I4: JS 계약의 와이어 값 넷이 SDK 상수와 같다. 다르면 계약을 정정한다.
  func testNI4WireNamesMatchSdkConstants() {
    XCTAssertEqual(AirbridgeCategory.SIGN_UP, "airbridge.user.signup")
    XCTAssertEqual(AirbridgeCategory.ACHIEVE_LEVEL, "airbridge.achieveLevel")
    XCTAssertEqual(AirbridgeAttribute.LEVEL, "level")
    XCTAssertEqual(AirbridgeAttribute.LABEL, "label")
  }

  // N-I5: 테스트 호스트 앱의 시작 여부가 번들 값 유무와 같다. 값 없는 빌드에서는 false여야 한다.
  func testNI5StartedMatchesTheBundleValues() {
    XCTAssertEqual(AirbridgeEvents.isStarted, AirbridgeEventsConfig.fromBundle() != nil)
  }

  func testNI5TrackEventWhenNotStartedDoesNothing() throws {
    try XCTSkipIf(AirbridgeEvents.isStarted, "값이 있는 빌드에서는 실제 이벤트가 나가므로 부르지 않는다")
    let module = AirbridgeEventsModule()

    module.trackEvent("airbridge.user.signup", semanticAttributes: [:])
    module.trackEvent("", semanticAttributes: ["level": "u"])
    module.trackEvent("airbridge.achieveLevel", semanticAttributes: nil)

    XCTAssertFalse(AirbridgeEvents.isStarted)
  }

  // N-I6: SKAdNetworkItems 없음, 앱 이름 키 있음, Facebook 접두 키 없음. ⟨ADR-0079⟩ 추적 허용 문구는 이제 있다(N-I9).
  func testNI6InfoDictionaryDeclaresNoSkanItemsAndNoFacebookKeys() {
    let info = Bundle.main.infoDictionary ?? [:]

    XCTAssertNil(info["SKAdNetworkItems"])
    XCTAssertNotNil(info["AirbridgeAppName"])
    XCTAssertTrue(info.keys.filter { $0.hasPrefix("Facebook") }.isEmpty)
  }

  // N-I7: 모듈 등록은 SDK 시작 여부와 같다 — 값 없는 빌드에서는 등록되지 않는다.
  func testNI7ModuleIsRegisteredOnlyWhenStarted() throws {
    let viewController = ViewController()
    viewController.loadViewIfNeeded()
    let lynxView = try XCTUnwrap(
      viewController.view.subviews.compactMap { $0 as? LynxView }.first,
      "ViewController가 LynxView를 만들지 않았습니다"
    )
    let templateRender = try XCTUnwrap(
      lynxView.value(forKey: "templateRender") as? LynxTemplateRender,
      "LynxView의 templateRender seam을 찾지 못했습니다"
    )

    XCTAssertEqual(templateRender.isModuleExist("AirbridgeEventsModule"), AirbridgeEvents.isStarted)
  }
}
