import Sentry
import XCTest

@testable import Host

/// Sentry 연결의 순수 부분을 잰다(ADR-0207 — CR1 ~ CR9). **여기가 못 지는 것** — SDK가 실제로 보내는 envelope와
/// 대시보드에 보이는 모양은 e2e(기기 확인)의 몫이다.
final class CrashReportingTests: XCTestCase {
  private let id = "3f2a9c1e-7b4d-4e8a-9c0f-1a2b3c4d5e6f"
  private let dsn = "https://abc123@o1.ingest.us.sentry.io/42"

  override func tearDown() {
    CrashUser.clear()
    super.tearDown()
  }

  // CR1: DSN이 없거나 꼴이 틀리면 설정이 없다 — SDK를 시작하지 않는다.
  func testCR1WithoutAValidDsnThereIsNoConfig() {
    for raw: Any? in [nil, "", "   ", "$(SENTRY_DSN)", "http://abc@o1.ingest.sentry.io/1",
      "https://key:secret@o1.ingest.sentry.io/1", "https://abc@o1.ingest.sentry.io/1/extra", 42]
    {
      XCTAssertNil(
        CrashReportConfig.from(dsn: raw, environment: "release", version: "1.4.0", build: "31"),
        "\(String(describing: raw))")
    }
  }

  // CR2: release는 `libitum.duru.ios@<version>+<build>`, dist는 빌드 번호, environment는 값 그대로(비면 release).
  func testCR2ReleaseDistAndEnvironmentFollowTheAndroidRule() {
    let config = CrashReportConfig.from(dsn: " \(dsn) ", environment: "development", version: "1.4.0", build: "31")
    XCTAssertEqual(config?.dsn, dsn)
    XCTAssertEqual(config?.release, "libitum.duru.ios@1.4.0+31")
    XCTAssertEqual(config?.dist, "31")
    XCTAssertEqual(config?.environment, "development")
    XCTAssertEqual(
      CrashReportConfig.from(dsn: dsn, environment: "", version: "1.4.0", build: "31")?.environment, "release")
    XCTAssertEqual(
      CrashReportConfig.from(dsn: dsn, environment: nil, version: "1.4.0", build: "31")?.environment, "release")
    XCTAssertNil(CrashReportConfig.from(dsn: dsn, environment: "release", version: nil, build: "31"))
    XCTAssertNil(CrashReportConfig.from(dsn: dsn, environment: "release", version: "1.4.0", build: ""))
  }

  // CR3: 설정이 없으면 시작하지 않는다(디버그 · CI · 값 파일 없는 빌드).
  func testCR3StartWithoutConfigDoesNothing() {
    CrashReporting.start(nil)
    XCTAssertFalse(CrashReporting.isStarted)
    XCTAssertFalse(SentrySDK.isEnabled)
  }

  // CR4: 사용자 id는 UUID 꼴만 소문자로 받는다.
  func testCR4OnlyTheUuidShapeIsAnId() {
    XCTAssertEqual(CrashUser.idFrom(id), id)
    XCTAssertEqual(CrashUser.idFrom(" \(id.uppercased()) "), id)
    for raw: String? in [nil, "", "u1", "kim@example.com", id + "x"] {
      XCTAssertNil(CrashUser.idFrom(raw), "\(String(describing: raw))")
    }
  }

  // CR5: set은 맞는 id를 잡고, clear는 잊는다. 틀린 id는 앞 id를 지운다(남는 사용자가 없게).
  func testCR5SetClearAndInvalidIdClears() {
    XCTAssertTrue(CrashUser.set(id))
    XCTAssertEqual(CrashUser.current, id)
    CrashUser.clear()
    XCTAssertNil(CrashUser.current)
    XCTAssertTrue(CrashUser.set(id))
    XCTAssertFalse(CrashUser.set("kim@example.com"))
    XCTAssertNil(CrashUser.current)
  }

  // CR6: beforeSend는 사용자를 내부 id 하나로 다시 세운다 — 이메일 · 이름 · IP · 설치 id가 남지 않는다.
  func testCR6BeforeSendKeepsOnlyTheInternalId() {
    let event = Event(level: .error)
    let incoming = User(userId: "installation-id")
    incoming.email = "kim@example.com"
    incoming.username = "kim"
    incoming.ipAddress = "{{auto}}"
    incoming.name = "Kim"
    incoming.data = ["k": "v"]
    event.user = incoming
    event.context = [
      "device": ["model": "iPhone17,1", "boot_time": "2026-11-27T00:00:00Z", "id": "d", "name": "Kim's iPhone"],
      "app": ["app_version": "1.4.0", "device_app_hash": "abc"],
    ]

    let out = CrashEventPolicy.beforeSend(event, userId: id)

    XCTAssertEqual(out?.user?.userId, id)
    XCTAssertNil(out?.user?.email)
    XCTAssertNil(out?.user?.username)
    XCTAssertNil(out?.user?.ipAddress)
    XCTAssertNil(out?.user?.name)
    XCTAssertNil(out?.user?.data)
    let device = out?.context?["device"]
    XCTAssertEqual(device?["model"] as? String, "iPhone17,1")
    XCTAssertNil(device?["boot_time"])
    XCTAssertNil(device?["id"])
    XCTAssertNil(device?["name"])
    XCTAssertNil(out?.context?["app"]?["device_app_hash"])
    XCTAssertEqual(out?.context?["app"]?["app_version"] as? String, "1.4.0")
  }

  // CR7: id가 없거나 꼴이 틀리면 사용자 자체가 없다 — SDK가 넣은 설치 id도 지운다.
  func testCR7WithoutAnIdTheEventHasNoUser() {
    let event = Event(level: .fatal)
    event.user = User(userId: "installation-id")
    XCTAssertNil(CrashEventPolicy.beforeSend(event, userId: nil)?.user)
    event.user = User(userId: "installation-id")
    XCTAssertNil(CrashEventPolicy.beforeSend(event, userId: "kim@example.com")?.user)
  }

  // CR8: beforeSend는 breadcrumb · 서버 이름 · 요청을 지우고, 예외 값 · 메시지를 지우기 규칙에 통과시키고, 설치 경로를 지운다.
  func testCR8BeforeSendScrubsTextAndInstallPath() {
    let event = Event(level: .fatal)
    event.breadcrumbs = [Breadcrumb(level: .info, category: "ui")]
    event.serverName = "host"
    event.request = SentryRequest()
    let exception = Exception(value: "failed for kim@example.com", type: "NSInvalidArgumentException")
    let frame = Frame()
    frame.package = "/private/var/containers/Bundle/Application/0A1B2C3D-4E5F-6071-8293-A4B5C6D7E8F9/Host.app/Host"
    let stacktrace = SentryStacktrace(frames: [frame], registers: [:])
    exception.stacktrace = stacktrace
    event.exceptions = [exception]
    let image = DebugMeta()
    image.codeFile = "/private/var/containers/Bundle/Application/0A1B2C3D-4E5F-6071-8293-A4B5C6D7E8F9/Host.app/Host"
    event.debugMeta = [image]
    event.message = SentryMessage(formatted: "call +82 10 1234 5678")

    let out = CrashEventPolicy.beforeSend(event, userId: nil)

    XCTAssertNil(out?.breadcrumbs)
    XCTAssertNil(out?.serverName)
    XCTAssertNil(out?.request)
    XCTAssertEqual(out?.exceptions?.first?.value, "failed for [email]")
    XCTAssertEqual(
      out?.exceptions?.first?.stacktrace?.frames.first?.package,
      "/private/var/containers/Bundle/Application/[install]/Host.app/Host")
    XCTAssertEqual(out?.debugMeta?.first?.codeFile, "/private/var/containers/Bundle/Application/[install]/Host.app/Host")
    XCTAssertEqual(out?.message?.formatted, "call [number]")
  }

  // CR9: JS 예외 이벤트는 Android와 같은 꼴이다 — mechanism lynx(handled) · 태그 lynx.source · 지문 넷 · contexts.lynx.stack.
  func testCR9LynxEventHasTheAndroidShape() {
    let payload = CrashReportPayload.from(
      code: 201, level: "error", text: "TypeError: x is undefined\n    at a (f:1:2)\n    at b (f:3:4)")
    XCTAssertNotNil(payload)
    guard let payload else { return }
    XCTAssertEqual(payload.source, .jsBackground)
    XCTAssertEqual(payload.name, "TypeError")
    XCTAssertEqual(payload.message, "x is undefined")
    XCTAssertEqual(payload.stackLines, ["    at a (f:1:2)", "    at b (f:3:4)"])

    let event = CrashEventPolicy.eventFrom(payload)
    XCTAssertEqual(event.level, .error)
    XCTAssertEqual(event.exceptions?.count, 1)
    XCTAssertEqual(event.exceptions?.first?.type, "TypeError")
    XCTAssertEqual(event.exceptions?.first?.value, "x is undefined")
    XCTAssertEqual(event.exceptions?.first?.mechanism?.type, "lynx")
    XCTAssertEqual(event.exceptions?.first?.mechanism?.handled?.boolValue, true)
    XCTAssertEqual(event.tags?["lynx.source"], "js-background")
    XCTAssertEqual(event.fingerprint, ["lynx", "js-background", "TypeError", "    at a (f:1:2)"])
    XCTAssertEqual(event.context?["lynx"]?["stack"] as? String, "    at a (f:1:2)\n    at b (f:3:4)")
  }
}

/// JS 예외의 받기 · 지우기 규칙 — Android JUnit(`CrashReportPayloadTest` · `CrashScrubTest`)과 같은 벡터의 일부(CP1 ~ CP5).
final class CrashReportPayloadTests: XCTestCase {
  // CP1: 받는 코드는 200번대(배경) · 1100번대(메인 스레드)뿐이고 warn은 받지 않는다.
  func testCP1OnlyJsCodesAndNotWarn() {
    XCTAssertEqual(CrashReportPayload.from(code: 1101, level: "error", text: "Error: m")?.source, .jsMainThread)
    XCTAssertNil(CrashReportPayload.from(code: 301, level: "error", text: "Error: m"))
    XCTAssertNil(CrashReportPayload.from(code: 201, level: "warn", text: "Error: m"))
    XCTAssertNil(CrashReportPayload.from(code: 201, level: "error", text: "  "))
  }

  // CP2: JSON 본문이면 rawError의 message · stack을 읽고, 메인 스레드 접두와 backtrace 줄을 뗀다.
  func testCP2ReadsRawErrorAndStripsMainThreadNoise() {
    let text = #"{"rawError":{"message":"main-thread.js exception: TypeError: probe ","stack":"backtrace:\nat f (a.js:1:2)"}}"#
    let payload = CrashReportPayload.from(code: 1101, level: "error", text: text)
    XCTAssertEqual(payload?.name, "TypeError")
    XCTAssertEqual(payload?.message, "probe")
    XCTAssertEqual(payload?.stackLines, ["at f (a.js:1:2)"])
  }

  // CP3: 알려진 이름이 아니면 이름은 Error이고 원문 전체가 메시지로 지우기를 지난다.
  func testCP3UnknownNameFallsBackToError() {
    let payload = CrashReportPayload.from(code: 201, level: "error", text: "kimsehyun: 김세현 kim@example.com")
    XCTAssertEqual(payload?.name, "Error")
    XCTAssertEqual(payload?.message, "kimsehyun: [text] [email]")
  }

  // CP4: 스크롤 위치 보정(code 4)은 받지 않는다.
  func testCP4ScrollClampIsRejected() {
    let text = #"Error: UI method invoke: {"code":4,"data":"Target scroll position = -2244.0 is beyond threshold. Clamped to position = 0.0"}"#
    XCTAssertNil(CrashReportPayload.from(code: 201, level: "error", text: text))
  }

  // CP5: 지우기 규칙 — URL 쿼리 · 인증 머리 · JWT · 긴 불투명 값 · 전화번호 · 객체 해시는 두기.
  func testCP5ScrubRules() {
    XCTAssertEqual(CrashScrub.scrub("GET https://a.b/c?token=x#f"), "GET https://a.b/c?[redacted]")
    XCTAssertEqual(CrashScrub.scrub("Authorization: Bearer abc.def"), "Authorization: Bearer [token]")
    XCTAssertEqual(
      CrashScrub.scrub("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"), "[token]")
    XCTAssertEqual(CrashScrub.scrub("id 3f2a9c1e7b4d4e8a9c0f1a2b3c4d5e6f00"), "id [token]")
    XCTAssertEqual(CrashScrub.scrub("kim@localhost"), "[email]")
    XCTAssertEqual(CrashScrub.scrub("android.os.BinderProxy@4a5b6c7"), "android.os.BinderProxy@4a5b6c7")
    XCTAssertEqual(CrashScrub.scrub("the basic idea"), "the basic idea")
    XCTAssertEqual(CrashScrub.scrub(nil), "")
  }
}
