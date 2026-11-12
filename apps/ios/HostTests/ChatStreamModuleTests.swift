import XCTest

@testable import Host

/// `ChatStreamModule`의 순수 부분 — 바이트를 빈 줄 경계에서 잘라 UTF-8 블록으로 푸는 규칙 · 제한 값.
/// 네트워크는 수동 e2e(CS-E1)가 본다.
final class ChatStreamModuleTests: XCTestCase {
  private func bytes(_ text: String) -> Data { Data(text.utf8) }

  // CSN1: 한 번에 온 블록 둘을 각각 내고, 구분 빈 줄은 싣지 않는다.
  func testCSN1SplitsBlocksOnBlankLine() {
    var splitter = SseEventSplitter()
    XCTAssertEqual(
      splitter.push(bytes("event: delta\ndata: a\n\nevent: done\ndata: {}\n\n")),
      ["event: delta\ndata: a", "event: done\ndata: {}"])
    XCTAssertEqual(splitter.finish(), [])
  }

  // CSN2: 블록이 조각 사이에서 갈리면 경계가 올 때까지 모았다가 낸다.
  func testCSN2BuffersAcrossChunks() {
    var splitter = SseEventSplitter()
    XCTAssertEqual(splitter.push(bytes("event: delta\nda")), [])
    XCTAssertEqual(splitter.push(bytes("ta: a\n")), [])
    XCTAssertEqual(splitter.push(bytes("\nevent: x")), ["event: delta\ndata: a"])
  }

  // CSN3: 한글 한 글자(3바이트)가 조각 사이에서 갈려도 깨지지 않는다.
  func testCSN3KoreanSplitMidCharacter() {
    var splitter = SseEventSplitter()
    let whole = Array("data: 안녕\n\n".utf8)
    let cut = 7  // "data: " 6바이트 + 「안」의 첫 바이트
    XCTAssertEqual(splitter.push(Data(whole[..<cut])), [])
    XCTAssertEqual(splitter.push(Data(whole[cut...])), ["data: 안녕"])
  }

  // CSN4: CRLF 빈 줄(\r\n\r\n) · CR 빈 줄(\r\r)도 경계다. 내용 줄 끝의 \r이 조각 끝이면 \n을 기다리고,
  // 빈 줄 자리의 \r은 그것만으로 경계다(뒤에 오는 \n은 블록 앞 빈 줄로 걸러진다).
  func testCSN4CrlfAndCrBoundaries() {
    var splitter = SseEventSplitter()
    XCTAssertEqual(splitter.push(bytes("data: a\r\n\r\ndata: b\r\r")), ["data: a", "data: b"])
    XCTAssertEqual(splitter.push(bytes("data: c\r")), [])
    XCTAssertEqual(splitter.push(bytes("\n\r")), ["data: c"])
    XCTAssertEqual(splitter.push(bytes("\ndata: d\n\n")), ["data: d"])
  }

  // CSN5: 끝에서 남은 공백 아닌 블록은 finish가 낸다. 빈 것 · 줄바꿈뿐이면 내지 않는다.
  func testCSN5FinishFlushesTrailingBlock() {
    var splitter = SseEventSplitter()
    XCTAssertEqual(splitter.push(bytes("data: tail")), [])
    XCTAssertEqual(splitter.finish(), ["data: tail"])
    var empty = SseEventSplitter()
    XCTAssertEqual(empty.push(bytes("\n")), [])
    XCTAssertEqual(empty.finish(), [])
  }

  // CSN6: 주석 블록(ping)도 블록으로 낸다 — 거르는 것은 JS다.
  func testCSN6CommentBlocksPassThrough() {
    var splitter = SseEventSplitter()
    XCTAssertEqual(splitter.push(bytes(": ping\n\n")), [": ping"])
  }

  // CSN7: 제한 값 — 연결 10초 · 무응답 30초 · 오류 본문 64KB.
  func testCSN7Limits() {
    XCTAssertEqual(ChatStreamLimits.connectTimeout, 10)
    XCTAssertEqual(ChatStreamLimits.idleTimeout, 30)
    XCTAssertEqual(ChatStreamLimits.errorBodyBytes, 65_536)
  }
}
