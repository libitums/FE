import XCTest

@testable import Host

/// 말하기 탐침이 기대는 **계약의 모양**을 잰다. 인식 품질은 여기서 재지 않는다 —
/// 시뮬레이터에는 사람 목소리가 들어오지 않고, 그 판정은 `docs/e2e/`의 몫이다.
final class SpeechRecognitionModuleTests: XCTestCase {
  // 상태 조회는 권한 둘을 **각각 다른 필드로** 답해야 한다.
  // 하나로 뭉치면 화면이 「마이크만 거부」와 「인식만 거부」를 가를 수 없다.
  func testStatusReportsTwoPermissionsSeparately() {
    let payload = waitForPayload("상태 조회") { SpeechRecognitionModule().getStatus($0) }

    let microphone = payload["microphone"] as? String
    let speech = payload["speechRecognition"] as? String
    XCTAssertNotNil(microphone)
    XCTAssertNotNil(speech)
    XCTAssertTrue(Self.permissionStates.contains(microphone ?? ""))
    XCTAssertTrue(Self.permissionStates.contains(speech ?? ""))
  }

  // 상태 조회는 소리 유입을 화면이 그릴 수 있는 값으로 답해야 한다.
  func testStatusReportsCaptureObservables() {
    let payload = waitForPayload("상태 조회") { SpeechRecognitionModule().getStatus($0) }

    XCTAssertNotNil(payload["listening"] as? Bool)
    XCTAssertNotNil(payload["recognizerAvailable"] as? Bool)
    XCTAssertNotNil(payload["supportsOnDevice"] as? Bool)
    XCTAssertEqual(payload["locale"] as? String, "ko-KR")
    // 녹음 중이 아니므로 버퍼가 0건이다 — 값이 없는 것이 아니라 0이어야 한다.
    XCTAssertEqual(payload["bufferCount"] as? Int, 0)
    XCTAssertNotNil(payload["level"] as? Double)
    XCTAssertNotNil(payload["peakLevel"] as? Double)
  }

  // 시작하지 못한 경로도 **같은 키 집합**으로 올라와야 한다. 받는 쪽이 모양을 하나만
  // 알면 되게 하는 것이 이 모듈의 콜백 규약이다.
  func testStartReportsFailureAsFieldsWithTheFullShape() {
    let payload = waitForPayload("잘못된 인자") {
      SpeechRecognitionModule().start(["requireOnDevice": "네"], callback: $0)
    }

    XCTAssertEqual(payload["status"] as? String, "invalid-arguments")
    XCTAssertEqual(Set(payload.keys), Self.resultKeys)
  }

  // 읽은 글자가 없을 때 `text`는 **빈 문자열**이다. 키를 빼거나 null로 바꾸지 않는다 —
  // 빈 문자열은 유효한 인식 결과이기도 해서, 없애면 두 경우를 가를 수 없다.
  func testStartKeepsEmptyTextAsAValue() {
    let payload = waitForPayload("잘못된 인자") {
      SpeechRecognitionModule().start(["requireOnDevice": "네"], callback: $0)
    }

    XCTAssertEqual(payload["text"] as? String, "")
    XCTAssertEqual(payload["isFinal"] as? Bool, false)
  }

  // 온디바이스 여부는 네 필드가 함께 올라가야 관찰이 된다 — 요청한 값, 기기가 할 수
  // 있는가, 우리가 실제로 켠 값, 그리고 그 결론.
  func testStartReportsOnDeviceObservables() {
    let payload = waitForPayload("잘못된 인자") {
      SpeechRecognitionModule().start(["requireOnDevice": "네"], callback: $0)
    }

    XCTAssertNotNil(payload["requestedOnDevice"] as? Bool)
    XCTAssertNotNil(payload["supportsOnDevice"] as? Bool)
    XCTAssertNotNil(payload["requiresOnDevice"] as? Bool)
    XCTAssertTrue(["guaranteed", "not-guaranteed"].contains(payload["onDevice"] as? String ?? ""))
  }

  // 레벨은 **실수**로, 개수는 **정수**로 건너가야 한다. `[String: Any]` 리터럴 안에서
  // `?? 0`을 쓰면 맥락 타입을 타고 정수로 굳는 자리가 실재해서 여기서 못박는다 —
  // 한 번 정수로 굳으면 미터가 0과 1 사이에서 계단을 그린다.
  func testNumericFieldsKeepTheirTypes() {
    let status = waitForPayload("상태 조회") { SpeechRecognitionModule().getStatus($0) }
    XCTAssertNotNil(status["level"] as? Double)
    XCTAssertNotNil(status["peakLevel"] as? Double)
    XCTAssertNotNil(status["bufferCount"] as? Int)

    let result = waitForPayload("잘못된 인자") {
      SpeechRecognitionModule().start(["requireOnDevice": "네"], callback: $0)
    }
    XCTAssertNotNil(result["peakLevel"] as? Double)
    XCTAssertNotNil(result["averageLevel"] as? Double)
    XCTAssertNotNil(result["bufferCount"] as? Int)
    XCTAssertNotNil(result["durationMs"] as? Int)
    XCTAssertNotNil(result["errorCode"] as? Int)
  }

  // 돌고 있지 않을 때 멈추는 것은 아무 일도 아니어야 한다. 던지지 않고 조용히 끝난다.
  func testStopWithoutSessionDoesNothing() {
    SpeechRecognitionModule().stop()

    let payload = waitForPayload("상태 조회") { SpeechRecognitionModule().getStatus($0) }
    XCTAssertEqual(payload["listening"] as? Bool, false)
  }

  // MARK: - 거들기

  private static let permissionStates: Set<String> = [
    "not-determined", "granted", "denied", "restricted", "unknown",
  ]

  private static let resultKeys: Set<String> = [
    "status", "text", "isFinal", "microphone", "speechRecognition",
    "requestedOnDevice", "supportsOnDevice", "requiresOnDevice", "onDevice",
    "bufferCount", "peakLevel", "averageLevel", "durationMs",
    "errorDomain", "errorCode", "errorMessage",
  ]

  /// 콜백을 **정확히 한 번** 받고 그 페이로드를 돌려준다. 두 번 오면 여기서 깨진다.
  private func waitForPayload(
    _ description: String,
    _ invoke: (@escaping (Any) -> Void) -> Void
  ) -> [String: Any] {
    let received = expectation(description: description)
    received.assertForOverFulfill = true
    var payload: [String: Any] = [:]

    invoke { result in
      payload = result as? [String: Any] ?? [:]
      received.fulfill()
    }

    wait(for: [received], timeout: 5)
    return payload
  }
}
