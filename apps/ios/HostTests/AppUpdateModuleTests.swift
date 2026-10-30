import XCTest

@testable import Host

/// `AppUpdateModule`의 순수 부분(이름 · 메서드 표 · App Store 주소)을 잰다(AU1~AU3). **여기가 못 지는 것** —
/// App Store 앱이 실제로 열리는지는 사람이 기기에서 본다(e2e).
final class AppUpdateModuleTests: XCTestCase {
  // AU1: 모듈 이름과 메서드 표가 JS 접점(`lib/app-update.ts`)과 같다.
  func testAU1ModuleNameAndMethodLookup() {
    XCTAssertEqual(AppUpdateModule.name, "AppUpdateModule")
    XCTAssertEqual(Set(AppUpdateModule.methodLookup.keys), ["openStore"])
  }

  // AU2: 숫자 ID만 https 주소가 된다 — 빈 값 · nil · 숫자 아닌 값은 주소가 없다.
  func testAU2OnlyNumericAppleIdsMakeAnHttpsUrl() {
    let url = AppStoreURL.url(appleId: "123456789")
    XCTAssertEqual(url?.scheme, "https")
    XCTAssertEqual(url?.absoluteString, "https://apps.apple.com/app/id123456789")
    XCTAssertNil(AppStoreURL.url(appleId: nil))
    XCTAssertNil(AppStoreURL.url(appleId: ""))
    XCTAssertNil(AppStoreURL.url(appleId: "id123"))
    XCTAssertNil(AppStoreURL.url(appleId: "https://apps.apple.com/app/id1"))
  }

  // AU3: 설정된 ID는 nil이거나 숫자뿐이다 — 아무 값이나 박아 두지 못하게 한다.
  func testAU3ConfiguredAppleIdIsNilOrNumeric() {
    if let id = AppStoreURL.appleId {
      XCTAssertFalse(id.isEmpty)
      XCTAssertTrue(id.allSatisfy(\.isNumber))
      XCTAssertNotNil(AppStoreURL.url)
    } else {
      XCTAssertNil(AppStoreURL.url)
    }
  }
}
