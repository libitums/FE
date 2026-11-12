import XCTest

@testable import Host

/// `ExternalLinkModule`이 여는 주소 규칙(ADR-0125) — JS `isOpenableExternalUrl`과 같은 표. 실제로 여는 것은 수동 e2e가 본다.
final class ExternalLinkModuleTests: XCTestCase {
  // EL1: 전화 번호는 공백을 걷어 tel: 주소로, https는 그대로 연다.
  func testEL1AllowsTelAndHttps() {
    XCTAssertEqual(ExternalLinkPolicy.target("tel:988")?.absoluteString, "tel:988")
    XCTAssertEqual(ExternalLinkPolicy.target("tel:+63 2 8804 4673")?.absoluteString, "tel:+63288044673")
    XCTAssertEqual(ExternalLinkPolicy.target("tel:1-800-273-8255")?.absoluteString, "tel:1-800-273-8255")
    XCTAssertEqual(
      ExternalLinkPolicy.target("https://findahelpline.com/ph")?.absoluteString,
      "https://findahelpline.com/ph")
  }

  // EL1b: 인코딩되지 않은 유니코드 경로도 퍼센트 인코딩해 연다 — `#` 조각은 그대로(PR #412 리뷰).
  func testEL1bEncodesUnicodePath() {
    XCTAssertEqual(
      ExternalLinkPolicy.target("https://help.example/상담?q=도움#top")?.absoluteString,
      "https://help.example/%EC%83%81%EB%8B%B4?q=%EB%8F%84%EC%9B%80#top")
  }

  // EL2: 그 밖은 열지 않는다.
  func testEL2RejectsOthers() {
    for url in [
      "http://example.org", "javascript:alert(1)", "tel:", "tel:abc", "https://", "sms:988", "",
      "file:///etc/passwd", "https://a b.example", "https://x.example\n", "tel:988\n",
      "https://a\u{00A0}b.example",
    ] {
      XCTAssertNil(ExternalLinkPolicy.target(url), url)
    }
  }
}
