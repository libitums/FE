import ImageIO
import UIKit
import UniformTypeIdentifiers
import XCTest

@testable import Host

/// 올리기를 가로채 네트워크 없이 응답을 정하고, 나간 요청을 붙잡아 둔다.
private final class StoryPhotoStubProtocol: URLProtocol {
  enum Reply {
    case status(Int, Data)
    case failure
  }

  nonisolated(unsafe) static var reply: Reply = .failure
  nonisolated(unsafe) static var lastRequest: URLRequest?

  override class func canInit(with request: URLRequest) -> Bool { true }
  override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
  override func stopLoading() {}

  override func startLoading() {
    Self.lastRequest = request
    switch Self.reply {
    case .status(let code, let data):
      let response = HTTPURLResponse(
        url: request.url!, statusCode: code, httpVersion: nil, headerFields: nil)!
      client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
      client?.urlProtocol(self, didLoad: data)
      client?.urlProtocolDidFinishLoading(self)
    case .failure:
      client?.urlProtocol(self, didFailWithError: URLError(.timedOut))
    }
  }
}

/// 내 스토리 사진(ADR-0199) — 줄일 크기 · 경로 판정 · https만 · 페이로드 모양 · 실제 줄이기와 위치 정보 제거 · 올리기 결과.
/// 고르기 · 찍기 화면은 수동 e2e가 본다.
final class StoryPhotoModuleTests: XCTestCase {
  private var root: URL!
  private var store: StoryPhotoStore!

  override func setUp() {
    super.setUp()
    root = FileManager.default.temporaryDirectory
      .appendingPathComponent("story-photos-tests-\(UUID().uuidString)", isDirectory: true)
      .appendingPathComponent("story-photos", isDirectory: true)
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [StoryPhotoStubProtocol.self]
    store = StoryPhotoStore(root: root, session: URLSession(configuration: configuration))
    StoryPhotoStubProtocol.lastRequest = nil
  }

  override func tearDown() {
    try? FileManager.default.removeItem(at: root.deletingLastPathComponent())
    super.tearDown()
  }

  // SP1: 긴 변 최대 1600 — 큰 것은 비율대로 줄이고 작은 것은 그대로(키우지 않는다).
  func testSP1TargetSize() {
    XCTAssertTrue(StoryPhotoFiles.targetSize(width: 4000, height: 3000) == (1600, 1200))
    XCTAssertTrue(StoryPhotoFiles.targetSize(width: 800, height: 600) == (800, 600))
    XCTAssertTrue(StoryPhotoFiles.targetSize(width: 3000, height: 4000) == (1200, 1600))
    XCTAssertTrue(StoryPhotoFiles.targetSize(width: 1600, height: 1600) == (1600, 1600))
    XCTAssertTrue(StoryPhotoFiles.targetSize(width: 5000, height: 10) == (1600, 3))
    XCTAssertTrue(StoryPhotoFiles.targetSize(width: 10, height: 5000) == (3, 1600))
  }

  // SP2: 폴더 안 `.jpg`만 받는다 — `..` · 밖 · 다른 확장자 · 하위 폴더 · 상대 경로는 거부.
  func testSP2ResolvesOnlyJpegInsideFolder() {
    let inside = root.appendingPathComponent("abc.jpg").path
    XCTAssertEqual(store.resolve(path: inside)?.lastPathComponent, "abc.jpg")
    XCTAssertEqual(store.resolve(path: "file://" + inside)?.lastPathComponent, "abc.jpg")
    for path in [
      root.appendingPathComponent("../abc.jpg").path,
      root.path + "/../story-photos/abc.jpg",
      root.appendingPathComponent("abc.png").path,
      root.appendingPathComponent("abc.jpg.txt").path,
      root.appendingPathComponent("sub/abc.jpg").path,
      root.path,
      root.path + "/",
      root.path + "/.jpg",
      root.deletingLastPathComponent().appendingPathComponent("abc.jpg").path,
      root.path + "-evil/abc.jpg",
      "abc.jpg",
      "",
      "/etc/passwd",
    ] {
      XCTAssertNil(store.resolve(path: path), path)
    }
  }

  // SP3: 올릴 주소는 호스트 있는 https만.
  func testSP3HttpsOnly() {
    XCTAssertNotNil(StoryPhotoFiles.httpsURL("https://abc.supabase.co/storage/v1/object/story-photos/u/a.jpg"))
    XCTAssertNotNil(StoryPhotoFiles.httpsURL("HTTPS://abc.supabase.co/x"))
    for url in ["http://abc.supabase.co/x", "file:///etc/passwd", "https://", "ftp://a/b", "", "abc"] {
      XCTAssertNil(StoryPhotoFiles.httpsURL(url), url)
    }
  }

  // SP4: 고르기 결과 페이로드 — 값은 모두 문자열.
  func testSP4PickedPayloadShape() {
    let file = root.appendingPathComponent("0f0e.jpg")
    XCTAssertEqual(
      StoryPhotoFiles.pickedPayload(file: file, width: 1600, height: 1200, bytes: 12345),
      [
        "status": "picked", "url": file.absoluteString, "path": file.path,
        "width": "1600", "height": "1200", "bytes": "12345",
      ])
    XCTAssertTrue(file.absoluteString.hasPrefix("file:///"))
  }

  // SP5: source는 camera · library만, 그 밖은 invalid — 콜백 한 번.
  func testSP5InvalidSource() {
    XCTAssertEqual(StoryPhotoSource(rawValue: "camera"), .camera)
    XCTAssertEqual(StoryPhotoSource(rawValue: "library"), .library)
    for source in ["", "video", "Camera", "gallery"] {
      let done = expectation(description: source)
      done.assertForOverFulfill = true
      StoryPhotoModule().pick(source) { payload in
        XCTAssertEqual(payload as? [String: String], ["status": "invalid"])
        done.fulfill()
      }
      wait(for: [done], timeout: 2)
    }
  }

  // SP6: 실제 이미지 — 방향을 픽셀에 적용하고 1600으로 줄여 새 JPEG에 쓴다. GPS · EXIF 방향은 남지 않는다.
  func testSP6ShrinksRotatesAndStripsLocation() throws {
    // 가로 3200×2400 픽셀, EXIF 방향 6(90° 돌려 보기) + GPS.
    let source = try makeJpeg(width: 3200, height: 2400, orientation: 6, withGPS: true)
    let original = try XCTUnwrap(CGImageSourceCreateWithURL(source as CFURL, nil))
    let originalProps = CGImageSourceCopyPropertiesAtIndex(original, 0, nil) as? [CFString: Any]
    XCTAssertNotNil(originalProps?[kCGImagePropertyGPSDictionary], "원본에는 GPS가 있어야 시험이 뜻이 있다")

    let payload = store.shrink(imageAt: source)
    XCTAssertEqual(payload["status"], "picked")
    // 방향 6이 적용돼 세로가 된다.
    XCTAssertEqual(payload["width"], "1200")
    XCTAssertEqual(payload["height"], "1600")
    let path = try XCTUnwrap(payload["path"])
    let output = URL(fileURLWithPath: path)
    XCTAssertEqual(output.deletingLastPathComponent().standardizedFileURL.path, root.standardizedFileURL.path)
    XCTAssertEqual(output.pathExtension, "jpg")
    let name = output.deletingPathExtension().lastPathComponent
    XCTAssertEqual(name, name.lowercased())
    XCTAssertNotNil(UUID(uuidString: name))
    XCTAssertEqual(payload["url"], output.absoluteString)
    let size = try FileManager.default.attributesOfItem(atPath: path)[.size] as? NSNumber
    XCTAssertEqual(payload["bytes"], size.map { String($0.intValue) })

    let written = try XCTUnwrap(CGImageSourceCreateWithURL(output as CFURL, nil))
    XCTAssertEqual(CGImageSourceGetType(written) as String?, UTType.jpeg.identifier)
    let props = try XCTUnwrap(CGImageSourceCopyPropertiesAtIndex(written, 0, nil) as? [CFString: Any])
    XCTAssertNil(props[kCGImagePropertyGPSDictionary])
    XCTAssertEqual(props[kCGImagePropertyPixelWidth] as? Int, 1200)
    XCTAssertEqual(props[kCGImagePropertyPixelHeight] as? Int, 1600)
    let orientation = props[kCGImagePropertyOrientation] as? Int
    XCTAssertTrue(orientation == nil || orientation == 1)
    // 그림 한가운데 위쪽 띠(원본 왼쪽 → 돌린 뒤 위)가 빨강인지로 방향을 확인한다.
    let image = try XCTUnwrap(UIImage(contentsOfFile: path)?.cgImage)
    let top = try pixel(image, x: 600, y: 40)
    XCTAssertGreaterThan(top.r, 200)
    XCTAssertLessThan(top.b, 60)
  }

  // SP7: 작은 사진은 키우지 않는다.
  func testSP7SmallImageKeepsSize() throws {
    let source = try makeJpeg(width: 400, height: 300, orientation: 1, withGPS: true)
    let payload = store.shrink(imageAt: source)
    XCTAssertEqual(payload["status"], "picked")
    XCTAssertEqual(payload["width"], "400")
    XCTAssertEqual(payload["height"], "300")
  }

  // SP8: 그림이 아니면 failed.
  func testSP8NonImageFails() throws {
    let bogus = root.deletingLastPathComponent().appendingPathComponent("bogus.jpg")
    try FileManager.default.createDirectory(
      at: bogus.deletingLastPathComponent(), withIntermediateDirectories: true)
    try Data("not an image".utf8).write(to: bogus)
    XCTAssertEqual(store.shrink(imageAt: bogus), ["status": "failed"])
  }

  // SP9: 찍은 UIImage(방향 정보가 객체에 있음)도 같은 규칙으로 줄인다.
  func testSP9ShrinksCapturedImage() throws {
    let image = UIGraphicsImageRenderer(
      size: CGSize(width: 4000, height: 3000),
      format: { let f = UIGraphicsImageRendererFormat(); f.scale = 1; return f }()
    ).image { ctx in
      UIColor.blue.setFill()
      ctx.fill(CGRect(x: 0, y: 0, width: 4000, height: 3000))
    }
    let rotated = UIImage(cgImage: image.cgImage!, scale: 1, orientation: .right)
    let payload = store.shrink(image: rotated)
    XCTAssertEqual(payload["status"], "picked")
    XCTAssertEqual(payload["width"], "1200")
    XCTAssertEqual(payload["height"], "1600")
  }

  // SP10: 24시간 넘은 파일만 지운다.
  func testSP10PurgesOldFiles() throws {
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    let old = root.appendingPathComponent("old.jpg")
    let fresh = root.appendingPathComponent("fresh.jpg")
    try Data([1]).write(to: old)
    try Data([1]).write(to: fresh)
    let now = Date()
    try FileManager.default.setAttributes(
      [.modificationDate: now.addingTimeInterval(-25 * 3600)], ofItemAtPath: old.path)
    store.purge(now: now)
    XCTAssertFalse(FileManager.default.fileExists(atPath: old.path))
    XCTAssertTrue(FileManager.default.fileExists(atPath: fresh.path))
  }

  // SP11: discard는 폴더 안 파일만 지우고 그 밖은 조용히 무시한다.
  func testSP11DiscardOnlyInsideFolder() throws {
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    let inside = root.appendingPathComponent("a.jpg")
    let outside = root.deletingLastPathComponent().appendingPathComponent("a.jpg")
    try Data([1]).write(to: inside)
    try Data([1]).write(to: outside)
    store.discard(path: outside.path)
    store.discard(path: root.path + "/../a.jpg")
    store.discard(path: inside.path)
    store.discard(path: root.appendingPathComponent("missing.jpg").path)
    XCTAssertFalse(FileManager.default.fileExists(atPath: inside.path))
    XCTAssertTrue(FileManager.default.fileExists(atPath: outside.path))
  }

  // SP12: 올리기 — 잘못된 경로 · 주소는 invalid, 없는 파일은 missing.
  func testSP12UploadRejects() throws {
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    let file = root.appendingPathComponent("a.jpg")
    try Data([0xFF, 0xD8]).write(to: file)
    XCTAssertEqual(upload(path: "/etc/passwd"), ["status": "invalid"])
    XCTAssertEqual(upload(path: file.path, url: "http://abc.supabase.co/x"), ["status": "invalid"])
    XCTAssertEqual(upload(path: root.appendingPathComponent("none.jpg").path), ["status": "missing"])
    XCTAssertNil(StoryPhotoStubProtocol.lastRequest)
  }

  // SP13: 올리기 — POST, Content-Type은 image/jpeg로 고정, 나머지 헤더는 그대로. 2xx 아니어도 http + 본문.
  func testSP13UploadSendsAndReportsHttp() throws {
    try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
    let file = root.appendingPathComponent("a.jpg")
    try Data([0xFF, 0xD8, 0xFF]).write(to: file)

    StoryPhotoStubProtocol.reply = .status(200, Data(#"{"Key":"story-photos/u/a.jpg"}"#.utf8))
    XCTAssertEqual(
      upload(path: file.path, headers: ["Authorization": "Bearer t", "x-upsert": "true", "Content-Type": "text/plain"]),
      ["status": "http", "code": "200", "body": #"{"Key":"story-photos/u/a.jpg"}"#])
    let request = try XCTUnwrap(StoryPhotoStubProtocol.lastRequest)
    XCTAssertEqual(request.httpMethod, "POST")
    XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "image/jpeg")
    XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer t")
    XCTAssertEqual(request.value(forHTTPHeaderField: "x-upsert"), "true")

    StoryPhotoStubProtocol.reply = .status(413, Data("too big".utf8))
    XCTAssertEqual(upload(path: file.path), ["status": "http", "code": "413", "body": "too big"])

    StoryPhotoStubProtocol.reply = .status(200, Data(repeating: 0x61, count: 70_000))
    XCTAssertEqual(upload(path: file.path)["body"]?.utf8.count, 65_536)

    StoryPhotoStubProtocol.reply = .failure
    XCTAssertEqual(upload(path: file.path), ["status": "network"])
  }

  // MARK: - 도움

  private func upload(
    path: String, url: String = "https://abc.supabase.co/storage/v1/object/story-photos/u/a.jpg",
    headers: [String: String] = [:]
  ) -> [String: String] {
    let done = expectation(description: "upload")
    done.assertForOverFulfill = true
    var result: [String: String] = [:]
    store.upload(path: path, url: url, headers: headers) {
      result = $0
      done.fulfill()
    }
    wait(for: [done], timeout: 5)
    return result
  }

  /// 왼쪽 1/4은 빨강, 나머지는 파랑인 JPEG. EXIF 방향과 GPS를 붙일 수 있다.
  private func makeJpeg(width: Int, height: Int, orientation: Int, withGPS: Bool) throws -> URL {
    let space = CGColorSpaceCreateDeviceRGB()
    let context = try XCTUnwrap(
      CGContext(
        data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0, space: space,
        bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue))
    context.setFillColor(UIColor.blue.cgColor)
    context.fill(CGRect(x: 0, y: 0, width: width, height: height))
    context.setFillColor(UIColor.red.cgColor)
    context.fill(CGRect(x: 0, y: 0, width: width / 4, height: height))
    let image = try XCTUnwrap(context.makeImage())

    let dir = root.deletingLastPathComponent().appendingPathComponent("src", isDirectory: true)
    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    let url = dir.appendingPathComponent("\(UUID().uuidString).jpg")
    let destination = try XCTUnwrap(
      CGImageDestinationCreateWithURL(url as CFURL, UTType.jpeg.identifier as CFString, 1, nil))
    var props: [CFString: Any] = [kCGImagePropertyOrientation: orientation]
    if withGPS {
      props[kCGImagePropertyGPSDictionary] = [
        kCGImagePropertyGPSLatitude: 37.5665, kCGImagePropertyGPSLatitudeRef: "N",
        kCGImagePropertyGPSLongitude: 126.978, kCGImagePropertyGPSLongitudeRef: "E",
      ]
    }
    CGImageDestinationAddImage(destination, image, props as CFDictionary)
    XCTAssertTrue(CGImageDestinationFinalize(destination))
    return url
  }

  private func pixel(_ image: CGImage, x: Int, y: Int) throws -> (r: Int, g: Int, b: Int) {
    var data = [UInt8](repeating: 0, count: 4)
    let context = try XCTUnwrap(
      CGContext(
        data: &data, width: 1, height: 1, bitsPerComponent: 8, bytesPerRow: 4,
        space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue))
    context.draw(image, in: CGRect(x: -x, y: -(image.height - 1 - y), width: image.width, height: image.height))
    return (Int(data[0]), Int(data[1]), Int(data[2]))
  }
}
