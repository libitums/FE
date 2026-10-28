import Foundation

/// 앱 버전을 globalProps `appVersion`으로 옮기는 순수 변환이다(ADR-0086). 설정의 「Version 1.0 (11)」 줄과
/// 스플래시의 강제 업데이트 판정이 읽는다(mobile `lib/app-version.ts`).
///
/// `CFBundleShortVersionString`(`MARKETING_VERSION`)이 이름, `CFBundleVersion`(`CURRENT_PROJECT_VERSION`)이 빌드
/// 번호다. 빌드 번호는 **정수로 읽혀야** 싣는다 — 정책 파일의 `min_build.ios`와 수로 비교하기 때문이다.
enum AppVersion {
  static let key = "appVersion"
  static let platform = "ios"

  /// 이름이 비어 있지 않고 빌드가 0 이상의 정수로 읽힐 때만 키 하나를 싣는다. 아니면 빈 맵(보내지 않음).
  static func globalProps(name: String?, build: String?) -> [String: Any] {
    guard let name, !name.isEmpty, let build, let number = Int(build), number >= 0 else {
      return [:]
    }
    return [key: ["platform": platform, "name": name, "build": number]]
  }

  /// 번들의 Info.plist에서 읽는다.
  static func current(bundle: Bundle = .main) -> [String: Any] {
    let info = bundle.infoDictionary
    return globalProps(
      name: info?["CFBundleShortVersionString"] as? String,
      build: info?["CFBundleVersion"] as? String
    )
  }
}
