import Foundation

/// 영속 저장소. **이 호스트를 만든 유일한 이유다** (ADR-0012).
///
/// Lynx에는 영속 저장소 API가 없다 — `setSessionStorage` 계열이 전부이고 수명이
/// 문서화돼 있지 않다. 공식 문서도 로컬 저장소를 네이티브 모듈 구현 예제로 든다.
///
/// **무엇을 넣는가**: 로그인 토큰뿐이다 (ADR-0007 D1).
/// 화면 상태나 서버 응답을 여기 넣지 않는다 — 무효화가 사람 손으로 넘어온다.
///
/// **암호화하지 않는다.** 토큰이 `UserDefaults`에 평문으로 남는다.
/// 프로토타입 판정 기준(ADR-0001 D4)에 없어서 넣지 않았다. 실제 서비스로 가면 바꾼다.
@objc(StorageModule)
final class StorageModule: NSObject, LynxModule {
  /// 다른 앱 설정과 섞이지 않게 접두사를 붙인다.
  private static let prefix = "libitum."

  @objc static var name: String { "StorageModule" }

  @objc static var methodLookup: [String: String] {
    [
      "get": NSStringFromSelector(#selector(get(_:))),
      "set": NSStringFromSelector(#selector(set(_:value:))),
      "remove": NSStringFromSelector(#selector(remove(_:))),
    ]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  /// 없는 키는 예외가 아니라 `nil`을 돌려준다. JS에서는 `null`이 된다.
  @objc func get(_ key: String) -> String? {
    UserDefaults.standard.string(forKey: Self.prefix + key)
  }

  @objc func set(_ key: String, value: String) {
    UserDefaults.standard.set(value, forKey: Self.prefix + key)
  }

  @objc func remove(_ key: String) {
    UserDefaults.standard.removeObject(forKey: Self.prefix + key)
  }
}
