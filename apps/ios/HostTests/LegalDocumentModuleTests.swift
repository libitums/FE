import XCTest

@testable import Host

/// `LegalDocumentModule`의 순수 부분(문서 이름 → 주소 표)을 잰다(LD1~LD3).
/// **여기가 못 지는 것** — 실제 브라우저 표시 · 닫기 뒤 앱 복귀는 e2e의 몫이다.
final class LegalDocumentModuleTests: XCTestCase {
  // 두 이름만 주소가 되고, 둘 다 https다.
  func testLD1KnownDocumentsMapToHttpsUrls() {
    let privacy = LegalDocumentURL.url(for: "privacy-policy")
    let terms = LegalDocumentURL.url(for: "terms-of-use")

    XCTAssertEqual(privacy?.scheme, "https")
    XCTAssertEqual(terms?.scheme, "https")
    XCTAssertNotEqual(privacy, terms)
    XCTAssertEqual(Set(LegalDocumentURL.table.keys), ["privacy-policy", "terms-of-use"])
  }

  // 표에 없는 이름 · 문자열이 아닌 값 · nil은 주소가 없다 — JS가 주소를 넘겨도 열지 않는다.
  func testLD2UnknownOrNonStringDocumentsHaveNoUrl() {
    XCTAssertNil(LegalDocumentURL.url(for: "https://example.com"))
    XCTAssertNil(LegalDocumentURL.url(for: "terms"))
    XCTAssertNil(LegalDocumentURL.url(for: ""))
    XCTAssertNil(LegalDocumentURL.url(for: 1))
    XCTAssertNil(LegalDocumentURL.url(for: nil))
  }

  // 모듈 이름과 메서드 표가 JS 접점(`lib/legal-document.ts`)과 같다.
  func testLD3ModuleNameAndMethodLookup() {
    XCTAssertEqual(LegalDocumentModule.name, "LegalDocumentModule")
    XCTAssertEqual(Set(LegalDocumentModule.methodLookup.keys), ["open"])
  }
}
