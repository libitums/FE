import AuthenticationServices
import XCTest

@testable import Host

/// `AppleSignInModule`의 순수 부분(페이로드 · 인자 판정 · 모듈 모양)을 잰다(AH1~AH6).
/// 이 명령은 엔타이틀먼트 없이 돌므로 권한과 무관한 부분만 다룬다.
/// **여기가 못 지는 것** — 실제 시트 표시 · `already-active`(시트가 떠 있어야 한다) ·
/// 델리게이트가 실제로 1회 오는지 · 권한 있는 빌드의 `identityToken` · 앵커는 e2e A1~A4의 몫이다.
final class AppleSignInModuleTests: XCTestCase {
  private let validNonce = "13d31e961a1ad8ec2f16b10c4c982e0876a878ad6df144566ee1894acb70f9c3"

  // MARK: - AH1 · AH2 · AH3 — AppleSignInPayload(순수)

  // completed면 identityToken이 UTF-8 문자열 그대로 서고, 키가 정확히 둘이어야 한다.
  func testAH1PayloadCompletedCarriesIdentityTokenAndExactlyTwoKeys() {
    let payload = AppleSignInPayload.make(
      identityToken: Data("eyJ.a.b".utf8), authorizationCode: nil, error: nil)

    XCTAssertEqual(payload["status"] as? String, "completed")
    XCTAssertEqual(payload["identityToken"] as? String, "eyJ.a.b")
    XCTAssertEqual(Set(payload.keys), ["status", "identityToken"])
  }

  // AH1b — 토큰과 코드가 함께 오면 authorizationCode가 UTF-8 문자열로 실리고 키가 정확히 셋이다.
  func testAH1bPayloadWithCodeCarriesAuthorizationCodeAndExactlyThreeKeys() {
    let payload = AppleSignInPayload.make(
      identityToken: Data("eyJ.a.b".utf8), authorizationCode: Data("c1".utf8), error: nil)

    XCTAssertEqual(payload["status"] as? String, "completed")
    XCTAssertEqual(payload["identityToken"] as? String, "eyJ.a.b")
    XCTAssertEqual(payload["authorizationCode"] as? String, "c1")
    XCTAssertEqual(Set(payload.keys), ["status", "identityToken", "authorizationCode"])
  }

  // AH1c — 빈 코드 · UTF-8이 아닌 코드는 키를 싣지 않고, 코드가 있어도 토큰 없음 · 오류 판정은 불변이다.
  func testAH1cPayloadIgnoresUnusableCodeAndKeepsErrorPrecedence() {
    for code in [Data(), Data([0xff, 0xfe])] {
      let payload = AppleSignInPayload.make(
        identityToken: Data("eyJ.a.b".utf8), authorizationCode: code, error: nil)
      XCTAssertEqual(payload["status"] as? String, "completed")
      XCTAssertNil(payload["authorizationCode"])
      XCTAssertEqual(Set(payload.keys), ["status", "identityToken"])
    }

    let noToken = AppleSignInPayload.make(
      identityToken: nil, authorizationCode: Data("c1".utf8), error: nil)
    XCTAssertEqual(noToken["status"] as? String, "failed")

    let canceled = AppleSignInPayload.make(
      identityToken: nil, authorizationCode: Data("c1".utf8),
      error: ASAuthorizationError(.canceled))
    XCTAssertEqual(canceled["status"] as? String, "cancelled")

    let failed = AppleSignInPayload.make(
      identityToken: Data("eyJ.a.b".utf8), authorizationCode: Data("c1".utf8),
      error: NSError(domain: "test.host", code: 1))
    XCTAssertEqual(failed["status"] as? String, "failed")
    XCTAssertNil(failed["authorizationCode"])
  }

  // 토큰 없음 · 빈 Data · UTF-8이 아닌 바이트는 failed다.
  func testAH2PayloadWithoutUsableTokenIsFailed() {
    XCTAssertEqual(
      AppleSignInPayload.make(identityToken: nil, authorizationCode: nil, error: nil)["status"] as? String, "failed")
    XCTAssertEqual(
      AppleSignInPayload.make(identityToken: Data(), authorizationCode: nil, error: nil)["status"] as? String, "failed")
    XCTAssertEqual(
      AppleSignInPayload.make(identityToken: Data([0xff, 0xfe]), authorizationCode: nil, error: nil)["status"] as? String,
      "failed")
  }

  // canceled만 cancelled, 나머지 코드 · 임의 NSError는 failed, 토큰과 오류가 둘 다 있으면 오류가 앞선다.
  func testAH3PayloadMapsCanceledAndOtherErrors() {
    let canceled = AppleSignInPayload.make(
      identityToken: nil, authorizationCode: nil, error: ASAuthorizationError(.canceled))
    XCTAssertEqual(canceled["status"] as? String, "cancelled")

    let others: [ASAuthorizationError.Code] = [.failed, .unknown, .invalidResponse, .notHandled]
    for code in others {
      let payload = AppleSignInPayload.make(identityToken: nil, authorizationCode: nil, error: ASAuthorizationError(code))
      XCTAssertEqual(payload["status"] as? String, "failed", "\(code) — failed가 아니다")
    }

    let arbitrary = AppleSignInPayload.make(
      identityToken: nil, authorizationCode: nil, error: NSError(domain: "test.host", code: 1))
    XCTAssertEqual(arbitrary["status"] as? String, "failed")

    let both = AppleSignInPayload.make(
      identityToken: Data("eyJ.a.b".utf8), authorizationCode: nil, error: ASAuthorizationError(.canceled))
    XCTAssertEqual(both["status"] as? String, "cancelled")
  }

  // MARK: - AH4 — AppleSignInArguments.hashedNonce(from:)

  func testAH4HashedNonceAcceptsOnlySixtyFourLowercaseHexChars() {
    XCTAssertEqual(AppleSignInArguments.hashedNonce(from: ["nonce": validNonce]), validNonce)

    let rejected: [(String, [String: Any])] = [
      ("대문자 섞임", ["nonce": validNonce.uppercased()]),
      ("63자", ["nonce": String(validNonce.dropLast())]),
      ("65자", ["nonce": validNonce + "0"]),
      ("비16진", ["nonce": String(validNonce.dropLast()) + "g"]),
      ("숫자", ["nonce": 12345]),
      ("키 없음", [:]),
    ]
    for (description, args) in rejected {
      XCTAssertNil(AppleSignInArguments.hashedNonce(from: args), "\(description) — nil이 아니다")
    }
  }

  // MARK: - AH5 — start의 인자 판정

  // nonce 없음 · 63자 · 대문자는 콜백 정확히 1회 invalid-arguments여야 한다. 시트를 띄우지 않는다.
  func testAH5StartRejectsInvalidArguments() {
    let cases: [(String, [String: Any])] = [
      ("nonce 없음", [:]),
      ("63자", ["nonce": String(validNonce.dropLast())]),
      ("대문자", ["nonce": validNonce.uppercased()]),
    ]

    for (description, args) in cases {
      let payload = waitForPayload(description) {
        AppleSignInModule().start(args, callback: $0)
      }

      XCTAssertEqual(
        payload["status"] as? String,
        "invalid-arguments",
        "\(description) — invalid-arguments가 아니다"
      )
    }
  }

  // MARK: - AH6 — 모듈 모양

  func testAH6MethodLookupHasExactlyStartAndCorrectName() {
    XCTAssertEqual(AppleSignInModule.name, "AppleSignInModule")
    XCTAssertEqual(Set(AppleSignInModule.methodLookup.keys), ["start"])
  }

  // MARK: - 거들기

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
