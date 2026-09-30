import AuthenticationServices
import XCTest

@testable import Host

/// `WebAuthenticationModule`의 순수 부분(페이로드 · 인자 판정 · 난수 모양)을 잰다(WM1~WM6).
/// **여기가 못 지는 것** — 실제 창 표시 · `already-active`(창이 떠
/// 있어야 한다) · 완료 핸들러가 실제로 1회 오는지 · 전경 창 앵커는 e2e S1~S4의 몫이다.
final class WebAuthenticationModuleTests: XCTestCase {
  // MARK: - WM1 · WM2 — WebAuthenticationPayload(순수)

  // completed면 callbackUrl이 absoluteString 그대로 서고, 키가 정확히 둘이어야 한다.
  func testWM1PayloadCompletedCarriesCallbackUrlAndExactlyTwoKeys() {
    let url = URL(string: "duru://auth-callback?code=abc")!

    let payload = WebAuthenticationPayload.make(callbackURL: url, error: nil)

    XCTAssertEqual(payload["status"] as? String, "completed")
    XCTAssertEqual(payload["callbackUrl"] as? String, url.absoluteString)
    XCTAssertEqual(Set(payload.keys), ["status", "callbackUrl"])
  }

  // canceledLogin은 cancelled, 그 밖 오류(다른 코드 · 임의 NSError)와 둘 다 nil은 failed다.
  func testWM2PayloadMapsCanceledLoginAndOtherErrorsAndBothNil() {
    let canceled = WebAuthenticationPayload.make(
      callbackURL: nil,
      error: ASWebAuthenticationSessionError(.canceledLogin)
    )
    XCTAssertEqual(canceled["status"] as? String, "cancelled")

    let otherAsWebAuthError = WebAuthenticationPayload.make(
      callbackURL: nil,
      error: ASWebAuthenticationSessionError(.presentationContextInvalid)
    )
    XCTAssertEqual(otherAsWebAuthError["status"] as? String, "failed")

    let arbitraryError = WebAuthenticationPayload.make(
      callbackURL: nil,
      error: NSError(domain: "test.host", code: 1)
    )
    XCTAssertEqual(arbitraryError["status"] as? String, "failed")

    let bothNil = WebAuthenticationPayload.make(callbackURL: nil, error: nil)
    XCTAssertEqual(bothNil["status"] as? String, "failed")
  }

  // MARK: - WM3 — start의 인자 판정

  // url 없음 · http:// · callbackScheme 없음 · 모양이 아닌 스킴 넷 모두 콜백 정확히 1회
  // invalid-arguments여야 한다. 창을 띄우면 안 되므로(창 앵커가 없는 상태) 콜백이 늦게
  // 오면(비동기 창 완료를 기다리면) 아래 5초 제한 시간에서 실패한다 — 그 자체가 신호다.
  func testWM3StartRejectsInvalidArguments() {
    let cases: [(String, [String: Any])] = [
      ("url 없음", ["callbackScheme": "duru"]),
      ("http:// URL", ["url": "http://example.com", "callbackScheme": "duru"]),
      ("callbackScheme 없음", ["url": "https://example.com"]),
      (
        "모양이 아닌 callbackScheme",
        ["url": "https://example.com", "callbackScheme": "Duru!"]
      ),
    ]

    for (description, args) in cases {
      let payload = waitForPayload(description) {
        WebAuthenticationModule().start(args, callback: $0)
      }

      XCTAssertEqual(
        payload["status"] as? String,
        "invalid-arguments",
        "\(description) — invalid-arguments가 아니다"
      )
    }
  }

  // MARK: - WM4 · WM5 — randomBytes

  // 32바이트 요청 → 길이 64, [0-9a-f]만, 두 번 부르면 다르다(진짜 난수라면).
  func testWM4RandomBytesReturnsSixtyFourLowercaseHexCharsAndVaries() {
    let module = WebAuthenticationModule()

    let first = module.randomBytes(32)
    let second = module.randomBytes(32)

    XCTAssertEqual(first.count, 64)
    XCTAssertNotNil(first.range(of: "^[0-9a-f]+$", options: .regularExpression))
    XCTAssertNotEqual(first, second)
  }

  // 범위 밖(0 · 65)과 값 없음(JS `null` · `undefined`)은 빈 문자열이다.
  func testWM5RandomBytesOutOfRangeReturnsEmptyString() {
    let module = WebAuthenticationModule()

    XCTAssertEqual(module.randomBytes(0), "")
    XCTAssertEqual(module.randomBytes(65), "")
    XCTAssertEqual(module.randomBytes(nil), "")
  }

  // MARK: - WM6 — 모듈 모양

  func testWM6MethodLookupHasExactlyStartAndRandomBytesAndCorrectName() {
    XCTAssertEqual(WebAuthenticationModule.name, "WebAuthenticationModule")
    XCTAssertEqual(Set(WebAuthenticationModule.methodLookup.keys), ["start", "randomBytes"])
  }

  // MARK: - 거들기

  /// 콜백을 **정확히 한 번** 받고 그 페이로드를 돌려준다(`SpeechRecognitionModuleTests`와
  /// 같은 형태). 두 번 오면 여기서 깨진다.
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
