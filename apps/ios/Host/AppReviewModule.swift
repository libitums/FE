import StoreKit
import UIKit

/// iOS 기본 평점 창을 요청하는 호스트 네이티브 모듈이다(ADR-0036). 호스트의 **열한째** 모듈이다.
///
/// **요청일 뿐이다.** 실제로 뜰지는 iOS가 정한다 — 한 앱에 1년 3번 상한, 사용자가 설정에서 끌 수 있다. 개발 서명
/// 빌드는 늘 뜨고 TestFlight는 뜨지 않는다. 결과를 알려 주는 API가 없어 콜백이 없다. 언제 청할지(별점 4 이상의
/// 에피소드 설문 뒤, 설치당 한 번)는 JS가 정한다(`lib/feedback-api.ts`).
@objc(AppReviewModule)
final class AppReviewModule: NSObject, LynxModule {
  @objc static var name: String { "AppReviewModule" }

  @objc static var methodLookup: [String: String] {
    ["requestReview": NSStringFromSelector(#selector(requestReview))]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  @objc func requestReview() {
    DispatchQueue.main.async {
      guard let scene = AppReviewModule.activeScene() else { return }
      if #available(iOS 16.0, *) {
        AppStore.requestReview(in: scene)
      } else {
        SKStoreReviewController.requestReview(in: scene)
      }
    }
  }

  /// 전경 scene이다. 전환 중이라 없으면 첫 번째 것으로 물러선다(`LegalDocumentModule`과 같은 규칙).
  static func activeScene() -> UIWindowScene? {
    let scenes = UIApplication.shared.connectedScenes
    return (scenes.first { $0.activationState == .foregroundActive } as? UIWindowScene)
      ?? (scenes.first as? UIWindowScene)
  }
}
