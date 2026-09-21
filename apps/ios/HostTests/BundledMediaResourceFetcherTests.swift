import XCTest

@testable import Host

final class BundledMediaResourceFetcherTests: XCTestCase {
  private let root = URL(fileURLWithPath: "/App.app/Resource", isDirectory: true)

  // Release 번들의 `/static/…`은 앱 번들 안 Resource/static의 file URL이 된다.
  func testRedirectsBundledStaticPathToResourceFile() {
    let redirected = BundledMediaResourceFetcher.redirect(
      "/static/image/logo-handwriting.31d15f7dc3.webp",
      resourceRoot: root
    )

    XCTAssertEqual(
      redirected,
      "file:///App.app/Resource/static/image/logo-handwriting.31d15f7dc3.webp"
    )
  }

  // dev 서버·원격 이미지는 손대지 않는다.
  func testLeavesHttpUrlsUntouched() {
    let url = "http://localhost:3000/static/image/logo-handwriting.31d15f7dc3.webp"

    XCTAssertEqual(BundledMediaResourceFetcher.redirect(url, resourceRoot: root), url)
  }

  // `/static/`이 아닌 경로와 리소스 폴더를 모를 때도 그대로 돌려준다.
  func testLeavesOtherPathsAndMissingRootUntouched() {
    XCTAssertEqual(
      BundledMediaResourceFetcher.redirect("/other/a.png", resourceRoot: root),
      "/other/a.png"
    )
    XCTAssertEqual(
      BundledMediaResourceFetcher.redirect("/static/image/a.png", resourceRoot: nil),
      "/static/image/a.png"
    )
  }
}
