import XCTest

@testable import Host

/// `URLSession`을 가로채 네트워크 없이 응답을 정한다.
private final class StubProtocol: URLProtocol {
  enum Reply {
    case ok(Data)
    case status(Int)
    case failure
  }

  nonisolated(unsafe) static var reply: Reply = .failure

  override class func canInit(with request: URLRequest) -> Bool { true }
  override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
  override func stopLoading() {}

  override func startLoading() {
    switch Self.reply {
    case .ok(let data):
      respond(200, data)
    case .status(let code):
      respond(code, Data())
    case .failure:
      client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet))
    }
  }

  private func respond(_ code: Int, _ data: Data) {
    let response = HTTPURLResponse(
      url: request.url!, statusCode: code, httpVersion: nil, headerFields: nil)!
    client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
    client?.urlProtocol(self, didLoad: data)
    client?.urlProtocolDidFinishLoading(self)
  }
}

/// 경로 검사 · 원자적 저장 · 조회 · 삭제를 잰다. 실제 네트워크는 쓰지 않는다.
final class ContentFileStoreTests: XCTestCase {
  private var root: URL!
  private var store: ContentFileStore!
  private let remote = "https://abc.supabase.co/storage/v1/object/public/content/a.png"

  override func setUp() {
    super.setUp()
    root = FileManager.default.temporaryDirectory
      .appendingPathComponent("content-files-tests-\(UUID().uuidString)", isDirectory: true)
    let configuration = URLSessionConfiguration.ephemeral
    configuration.protocolClasses = [StubProtocol.self]
    store = ContentFileStore(root: root, session: URLSession(configuration: configuration))
  }

  override func tearDown() {
    try? FileManager.default.removeItem(at: root)
    super.tearDown()
  }

  private func download(_ url: String? = nil, path: String) -> [String: String] {
    let done = expectation(description: "download")
    done.assertForOverFulfill = true
    var result: [String: String] = [:]
    store.download(url: url ?? remote, path: path) {
      result = $0
      done.fulfill()
    }
    wait(for: [done], timeout: 5)
    return result
  }

  private func tmpLeftovers() -> [String] {
    let tmp = root.appendingPathComponent(".tmp")
    return (try? FileManager.default.contentsOfDirectory(atPath: tmp.path)) ?? []
  }

  // CF1: 경로 규칙.
  func testCF1PathValidation() {
    for ok in ["a.png", "images/items/pen-1.png", "audio/u01_water.m4a", "A.b-c_d/e"] {
      XCTAssertTrue(ContentFileStore.isValid(path: ok), ok)
    }
    let long = String(repeating: "a", count: 257)
    for bad in [
      "", "/a", "a//b", "a/", "a/../b", "..", ".", "a/./b", "a b", "한글.png", "a?b", "a\\b", long,
    ] {
      XCTAssertFalse(ContentFileStore.isValid(path: bad), bad)
    }
    XCTAssertTrue(ContentFileStore.isValid(path: String(repeating: "a", count: 256)))
  }

  // CF2: https가 아닌 주소와 규칙 밖 경로는 받지 않는다.
  func testCF2RejectsNonHttpsAndBadPath() {
    StubProtocol.reply = .ok(Data([1]))
    XCTAssertEqual(download("http://abc.supabase.co/a.png", path: "a.png")["status"], "invalid")
    XCTAssertEqual(download("file:///etc/hosts", path: "a.png")["status"], "invalid")
    XCTAssertEqual(download("https://", path: "a.png")["status"], "invalid")
    XCTAssertEqual(download(path: "../a.png")["status"], "invalid")
    XCTAssertEqual(download(path: "/a.png")["status"], "invalid")
    XCTAssertFalse(FileManager.default.fileExists(atPath: root.appendingPathComponent("a.png").path))
  }

  // CF3: 200이면 대상 경로로 옮기고 바이트 수를 문자열로 돌려준다. 상위 폴더도 만든다.
  func testCF3SavesAndMovesFile() throws {
    let data = Data(repeating: 7, count: 1234)
    StubProtocol.reply = .ok(data)
    let result = download(path: "images/items/a.png")
    XCTAssertEqual(result, ["status": "saved", "bytes": "1234"])
    let saved = try Data(contentsOf: root.appendingPathComponent("images/items/a.png"))
    XCTAssertEqual(saved, data)
    XCTAssertEqual(tmpLeftovers(), [])
    XCTAssertTrue(store.fileUrl(path: "images/items/a.png").hasPrefix("file://"))
  }

  // CF4: 있던 파일은 덮어쓴다.
  func testCF4OverwritesExisting() throws {
    StubProtocol.reply = .ok(Data("old".utf8))
    _ = download(path: "a.txt")
    StubProtocol.reply = .ok(Data("newer".utf8))
    XCTAssertEqual(download(path: "a.txt"), ["status": "saved", "bytes": "5"])
    XCTAssertEqual(try String(contentsOf: root.appendingPathComponent("a.txt")), "newer")
    XCTAssertEqual(tmpLeftovers(), [])
  }

  // CF5: HTTP 404는 대상 파일도 임시 파일도 남기지 않는다.
  func testCF5HttpErrorLeavesNothing() {
    StubProtocol.reply = .status(404)
    XCTAssertEqual(download(path: "a.png"), ["status": "http", "code": "404"])
    XCTAssertEqual(store.fileUrl(path: "a.png"), "")
    XCTAssertEqual(tmpLeftovers(), [])
  }

  // CF6: 연결 실패는 network, 대상도 임시도 없다. 있던 파일은 그대로다.
  func testCF6NetworkErrorLeavesNothingAndKeepsOld() throws {
    StubProtocol.reply = .failure
    XCTAssertEqual(download(path: "a.png"), ["status": "network"])
    XCTAssertEqual(store.fileUrl(path: "a.png"), "")
    XCTAssertEqual(tmpLeftovers(), [])

    StubProtocol.reply = .ok(Data("keep".utf8))
    _ = download(path: "a.png")
    StubProtocol.reply = .failure
    _ = download(path: "a.png")
    XCTAssertEqual(try String(contentsOf: root.appendingPathComponent("a.png")), "keep")
  }

  // CF7: 이동 실패(대상 자리가 폴더)는 io이고 임시 파일을 남기지 않는다.
  func testCF7IoFailureCleansTmp() throws {
    try FileManager.default.createDirectory(
      at: root.appendingPathComponent("a.png/inner"), withIntermediateDirectories: true)
    StubProtocol.reply = .ok(Data([1, 2, 3]))
    XCTAssertEqual(download(path: "a.png")["status"], "io")
    XCTAssertEqual(tmpLeftovers(), [])
  }

  // CF8: fileUrl은 없는 파일 · 폴더 · 규칙 위반이면 빈 문자열.
  func testCF8FileUrlEmptyWhenMissing() throws {
    XCTAssertEqual(store.fileUrl(path: "nope.png"), "")
    XCTAssertEqual(store.fileUrl(path: "../x"), "")
    try FileManager.default.createDirectory(
      at: root.appendingPathComponent("dir"), withIntermediateDirectories: true)
    XCTAssertEqual(store.fileUrl(path: "dir"), "")
  }

  // CF9: remove는 폴더째 지우고, 없어도 removed, 규칙 위반은 invalid.
  func testCF9RemoveFolder() {
    StubProtocol.reply = .ok(Data([1]))
    _ = download(path: "images/x/a.png")
    _ = download(path: "images/x/b.png")
    XCTAssertEqual(store.remove(prefix: "images/x"), ["status": "removed"])
    XCTAssertEqual(store.fileUrl(path: "images/x/a.png"), "")
    XCTAssertEqual(store.remove(prefix: "images/x"), ["status": "removed"])
    XCTAssertEqual(store.remove(prefix: "../images"), ["status": "invalid"])
  }

  // CF10: 루트는 백업에서 빠진다.
  func testCF10RootExcludedFromBackup() throws {
    StubProtocol.reply = .ok(Data([1]))
    _ = download(path: "a.png")
    let values = try root.resourceValues(forKeys: [.isExcludedFromBackupKey])
    XCTAssertEqual(values.isExcludedFromBackup, true)
  }
}
