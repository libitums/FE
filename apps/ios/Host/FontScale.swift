import UIKit

/// 시스템 글자 크기 설정을 Lynx가 아는 배율 하나로 옮긴다 (ADR-0020).
///
/// **왜 호스트가 이 값을 만드나.** Lynx 코어는 배율을 *받아서* 쓴다
/// (`shell_->SetFontScale()` → `lynx_env_config.font_scale_`). 그 값을 시스템에서
/// 읽어 오는 코드는 프레임워크에 없다 — 기본값이 `1.0`이고
/// (`LynxBaseConfigurator.mm:26`) 아무도 바꾸지 않으면 그대로 `1.0`이다.
/// **끄는 코드가 있어서 꺼진 것이 아니라, 켜는 코드가 없어서 꺼져 있었다.**
///
/// **왜 Lynx가 가진 표를 안 쓰나.** `LynxTextStyle.m:100`에
/// `fontScaleWithSizeCategory:`가 있지만 그것은 **iOS 11 미만 폴백 경로 전용**이고
/// (같은 파일 `applyFontScaling:`), 그나마 그 경로는 요소별 `enable-font-scaling`이
/// 켜져야 돈다. 우리는 (A) 코어 배율로 가기로 했으므로 그 표에 닿지 않는다.
///
/// **왜 표를 손으로 안 적나.** `UIFontMetrics`가 Apple의 정본이고 OS가 매핑을
/// 바꾸면 따라간다. 손으로 적은 표는 그날 낡는다.
enum FontScale {
  /// `.body` 기준 배율. 기본 설정(`.large`)에서 `1.0`이다.
  ///
  /// `100`을 기준수로 두는 것은 반올림 오차를 줄이려는 것뿐이다 — `scaledValue`가
  /// 정수 pt를 받아 정수 pt를 내는 자리가 있어서 작은 수로 나누면 배율이 계단이 된다.
  static func current(compatibleWith traits: UITraitCollection?) -> CGFloat {
    let base: CGFloat = 100
    let metrics = UIFontMetrics(forTextStyle: .body)
    let scaled =
      traits.map { metrics.scaledValue(for: base, compatibleWith: $0) }
      ?? metrics.scaledValue(for: base)
    return scaled / base
  }
}
