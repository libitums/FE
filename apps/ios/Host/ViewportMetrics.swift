import CoreGraphics
import Foundation

/// 글자 배율 · 화면 폭을 globalProps `fontScale` · `viewportWidth`로 옮기는 순수 변환이다.
enum ViewportMetrics {
  static let fontScaleKey = "fontScale"
  static let viewportWidthKey = "viewportWidth"

  /// 유한한 양수인 값의 키만 싣는다.
  static func globalProps(fontScale: CGFloat, width: CGFloat) -> [String: Any] {
    return [:]
  }
}
