import Foundation

/// 시스템 「동작 줄이기」 상태를 globalProps `reducedMotion`으로 옮기는 순수 변환이다.
enum ReducedMotion {
  static let globalPropsKey = "reducedMotion"

  /// `["reducedMotion": enabled]` — Bool 그대로. 다른 키는 싣지 않는다.
  static func globalProps(enabled: Bool) -> [String: Any] {
    return [:]
  }
}
