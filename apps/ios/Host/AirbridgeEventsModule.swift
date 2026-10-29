import Foundation

/// Airbridge 이벤트 한 건을 SDK로 넘기는 호스트 네이티브 모듈이다(ADR-0063). ⟨ADR-0079⟩ 추적 허용을 묻는
/// 메서드가 하나 더 있다 — iOS에만 있고 Android 모듈에는 없다.
///
/// **설정이 있는 빌드에서만 등록된다**(`ViewController`가 `AirbridgeEvents.isStarted`를 본다).
/// 카테고리 허용 목록은 호스트에 두지 않는다 — JS의 순수 매핑 하나가 정본이다.
/// 받은 맵에서 문자열 값만 SDK에 넘기고 그 밖의 타입은 버린다. 응답 · 콜백이 없다.
@objc(AirbridgeEventsModule)
final class AirbridgeEventsModule: NSObject, LynxModule {
  @objc static var name: String { "AirbridgeEventsModule" }

  @objc static var methodLookup: [String: String] {
    [
      "trackEvent": NSStringFromSelector(#selector(trackEvent(_:semanticAttributes:))),
      "requestTrackingAuthorization": NSStringFromSelector(#selector(requestTrackingAuthorization)),
      "takeOpenedDeeplink": NSStringFromSelector(#selector(takeOpenedDeeplink(_:))),
      "setTrackingEnabled": NSStringFromSelector(#selector(setTrackingEnabled(_:))),
      "setUserID": NSStringFromSelector(#selector(setUserID(_:))),
      "clearUser": NSStringFromSelector(#selector(clearUser)),
    ]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  /// JS가 `semanticAttributes`를 빼거나 `null`로 넘겨도 브리지에서 죽지 않게 옵셔널로 받는다(Android와 같다).
  @objc func trackEvent(_ category: String, semanticAttributes: [String: Any]?) {
    AirbridgeEvents.track(
      category, semanticAttributes: Self.stringAttributes(from: semanticAttributes ?? [:]))
  }

  /// 여정 맵에 들어설 때 JS가 부른다(ADR-0079 D2). 아직 정하지 않은 때만 시스템 대화상자가 뜬다. 응답이 없다.
  @objc func requestTrackingAuthorization() {
    AirbridgeEvents.requestTrackingAuthorizationIfUndetermined()
  }

  /// ⟨ADR-0080⟩ 받아 둔 딥링크를 **한 번** 꺼낸다. 없으면 `url: null`. 해석은 JS가 한다.
  @objc func takeOpenedDeeplink(_ callback: @escaping LynxCallbackBlock) {
    callback(["url": (AirbridgeDeeplinks.take() as Any?) ?? NSNull()])
  }

  /// ⟨ADR-0085 D4⟩ 시험 계정 표시가 바뀌면 JS가 부른다. 응답이 없다.
  @objc func setTrackingEnabled(_ enabled: Bool) {
    AirbridgeEvents.setTrackingEnabled(enabled)
  }

  /// ⟨ADR-0090⟩ 저장된 세션의 사용자가 바뀌면 JS가 부른다. 값은 PostHog identify와 같은 Supabase user id. 응답이 없다.
  @objc func setUserID(_ userId: String) {
    AirbridgeEvents.setUserID(userId)
  }

  /// ⟨ADR-0090⟩ 세션이 사라지거나 시험 계정이면 JS가 부른다. 응답이 없다.
  @objc func clearUser() {
    AirbridgeEvents.clearUser()
  }

  /// 문자열 값만 남긴다. 순수.
  static func stringAttributes(from attributes: [String: Any]) -> [String: String] {
    attributes.compactMapValues { $0 as? String }
  }
}
