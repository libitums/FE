import Foundation

/// 콘텐츠 파일 저장. 에피소드의 그림 · 소리를 앱 전용 폴더에 받아 두어 오프라인에서도 온전히 진행되게 한다.
///
/// **입장 조건(ADR-0017 D1) 셋**
/// 1. 화면 목록이 요구한다: 받아 둔 에피소드가 비행기 모드에서도 그림 · 소리와 함께 열려야 한다.
/// 2. 스택 안에 대체 경로가 0개다: Lynx에는 파일 쓰기 API가 없고 `StorageModule`은 문자열 키-값이라
///    바이너리를 담지 못한다. 이미지 서비스의 디스크 캐시는 앱이 통제하지 못한다.
/// 3. `docs/e2e/`에 사람이 판정할 항목이 있다: 새 에피소드를 받은 뒤 비행기 모드에서 열기.
///
/// **메서드는 셋이다** — `download` · `fileUrl` · `remove`. 목록 · 진행률 · 취소 · 용량 조회는 하지 않는다.
/// 검사와 저장은 `ContentFileStore`에 있고 이 클래스는 Lynx 규약만 맡는다.
@objc(ContentFileModule)
final class ContentFileModule: NSObject, LynxModule {
  @objc static var name: String { "ContentFileModule" }

  @objc static var methodLookup: [String: String] {
    [
      "download": NSStringFromSelector(#selector(download(_:path:callback:))),
      "fileUrl": NSStringFromSelector(#selector(fileUrl(_:))),
      "remove": NSStringFromSelector(#selector(remove(_:callback:))),
    ]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  /// 받기는 비동기다. 콜백은 정확히 한 번 — 값은 모두 문자열(`bytes` · `code`도).
  @objc func download(_ url: String, path: String, callback: @escaping LynxCallbackBlock) {
    ContentFileStore.shared.download(url: url, path: path) { payload in callback(payload) }
  }

  /// **동기.** 파일이 있으면 `file://` 주소, 없으면 `""`.
  @objc func fileUrl(_ path: String) -> String {
    ContentFileStore.shared.fileUrl(path: path)
  }

  @objc func remove(_ prefix: String, callback: @escaping LynxCallbackBlock) {
    DispatchQueue.global(qos: .utility).async {
      callback(ContentFileStore.shared.remove(prefix: prefix))
    }
  }
}
