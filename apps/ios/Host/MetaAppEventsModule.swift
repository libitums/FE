import Foundation

/// Meta 앱 이벤트 한 건을 SDK로 넘기는 호스트 네이티브 모듈이다(ADR-0057). 메서드 하나뿐이다.
///
/// **설정이 있는 빌드에서만 등록된다**(`ViewController`가 `MetaAppEvents.isStarted`를 본다).
/// 이벤트 이름 허용 목록은 호스트에 두지 않는다 — JS의 순수 매핑 하나가 정본이다.
/// 받은 맵에서 문자열 값만 SDK에 넘기고 그 밖의 타입은 버린다. 응답 · 콜백이 없다.
@objc(MetaAppEventsModule)
final class MetaAppEventsModule: NSObject, LynxModule {
  @objc static var name: String { "MetaAppEventsModule" }

  @objc static var methodLookup: [String: String] {
    ["logEvent": NSStringFromSelector(#selector(logEvent(_:parameters:)))]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  /// JS가 `parameters`를 빼거나 `null`로 넘겨도 브리지에서 죽지 않게 옵셔널로 받는다(Android와 같다).
  @objc func logEvent(_ name: String, parameters: [String: Any]?) {
    MetaAppEvents.log(name, parameters: Self.stringParameters(from: parameters ?? [:]))
  }

  /// 문자열 값만 남긴다. 순수.
  static func stringParameters(from parameters: [String: Any]) -> [String: String] {
    parameters.compactMapValues { $0 as? String }
  }
}
