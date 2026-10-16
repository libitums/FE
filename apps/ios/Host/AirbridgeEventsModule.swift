import Foundation

/// Airbridge 이벤트 한 건을 SDK로 넘기는 호스트 네이티브 모듈이다(ADR-0063). 메서드 하나뿐이다.
///
/// **설정이 있는 빌드에서만 등록된다**(`ViewController`가 `AirbridgeEvents.isStarted`를 본다).
/// 카테고리 허용 목록은 호스트에 두지 않는다 — JS의 순수 매핑 하나가 정본이다.
/// 받은 맵에서 문자열 값만 SDK에 넘기고 그 밖의 타입은 버린다. 응답 · 콜백이 없다.
@objc(AirbridgeEventsModule)
final class AirbridgeEventsModule: NSObject, LynxModule {
  @objc static var name: String { "AirbridgeEventsModule" }

  @objc static var methodLookup: [String: String] {
    ["trackEvent": NSStringFromSelector(#selector(trackEvent(_:semanticAttributes:)))]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  /// JS가 `semanticAttributes`를 빼거나 `null`로 넘겨도 브리지에서 죽지 않게 옵셔널로 받는다(Android와 같다).
  @objc func trackEvent(_ category: String, semanticAttributes: [String: Any]?) {
    AirbridgeEvents.track(
      category, semanticAttributes: Self.stringAttributes(from: semanticAttributes ?? [:]))
  }

  /// 문자열 값만 남긴다. 순수.
  static func stringAttributes(from attributes: [String: Any]) -> [String: String] {
    attributes.compactMapValues { $0 as? String }
  }
}
