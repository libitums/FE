import UserNotifications
import XCTest

@testable import Host

/// `PushNotificationModule`의 순수 부분을 잰다(PN1~PN5).
/// **여기가 못 지는 것** — 권한 다이얼로그 · 실제 토큰 발급 · 알림 누름은 e2e의 몫이다.
final class PushNotificationModuleTests: XCTestCase {
  // 권한 상태가 JS 낱말 넷으로 닫힌다.
  func testPN1PermissionNames() {
    XCTAssertEqual(PushPermission.name(for: .notDetermined), "not-determined")
    XCTAssertEqual(PushPermission.name(for: .denied), "denied")
    XCTAssertEqual(PushPermission.name(for: .authorized), "authorized")
    XCTAssertEqual(PushPermission.name(for: .provisional), "provisional")
    XCTAssertEqual(PushPermission.name(for: .ephemeral), "authorized")
  }

  // 개발 서명 프로파일이면 sandbox, 그 밖은 production이다.
  func testPN2EnvironmentFromProvisioningProfile() {
    let development = "<dict><key>aps-environment</key>\n\t\t<string>development</string></dict>"
    let production = "<dict><key>aps-environment</key><string>production</string></dict>"
    XCTAssertEqual(PushEnvironment.environment(fromProvisioningProfile: development), "sandbox")
    XCTAssertEqual(PushEnvironment.environment(fromProvisioningProfile: production), "production")
    XCTAssertEqual(PushEnvironment.environment(fromProvisioningProfile: "<dict></dict>"), "production")
    XCTAssertEqual(
      PushEnvironment.environment(fromProvisioningProfile: "<key>aps-environment</key>"),
      "production"
    )
  }

  // 기기 토큰은 소문자 16진수다.
  func testPN3TokenHex() {
    XCTAssertEqual(PushNotificationHub.hex(Data([0x00, 0xab, 0x10, 0xff])), "00ab10ff")
    XCTAssertEqual(PushNotificationHub.hex(Data()), "")
  }

  // 토큰이 있을 때만 token · environment가 실린다.
  func testPN4PayloadCarriesTokenOnlyWhenPresent() {
    let without = PushNotificationModule.payload(permission: "authorized", token: nil)
    XCTAssertEqual(without["permission"] as? String, "authorized")
    XCTAssertNil(without["token"])
    XCTAssertNil(without["environment"])

    let with = PushNotificationModule.payload(permission: "authorized", token: "abcd")
    XCTAssertEqual(with["token"] as? String, "abcd")
    XCTAssertNotNil(with["environment"] as? String)
  }

  // 모듈 이름과 메서드 표가 JS 접점(`lib/push-notifications.ts`)과 같다.
  func testPN5ModuleNameAndMethodLookup() {
    XCTAssertEqual(PushNotificationModule.name, "PushNotificationModule")
    XCTAssertEqual(
      Set(PushNotificationModule.methodLookup.keys),
      ["getStatus", "register", "takeOpened", "openSettings"]
    )
  }
}
