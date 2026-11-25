import AVFoundation
import PhotosUI
import UIKit
import UniformTypeIdentifiers

/// 내 스토리 「사진」 — 고르기 · 찍기 · 줄이기 · 올리기(ADR-0199). 메서드는 셋(`pick` · `upload` · `discard`) —
/// ADR-0017 D2의 「다섯 초과」에 닿지 않는다.
///
/// - 보관함은 `PHPickerViewController`(이미지 하나) — 앱 밖 프로세스라 사진 권한을 묻지 않는다.
/// - 카메라는 `UIImagePickerController` — 권한이 미결정이면 묻고, 거부 · 제한이면 묻지 않고 `denied`.
/// - 고른 뒤 `StoryPhotoStore`가 방향 적용 · 긴 변 1600 · JPEG 0.8로 새로 써서 위치 등 메타데이터가 남지 않는다.
/// 콜백 값은 모두 문자열이고 정확히 한 번 부른다(ContentFileModule 관례).
@objc(StoryPhotoModule)
final class StoryPhotoModule: NSObject, LynxModule {
  @objc static var name: String { "StoryPhotoModule" }

  @objc static var methodLookup: [String: String] {
    [
      "pick": NSStringFromSelector(#selector(pick(_:callback:))),
      "upload": NSStringFromSelector(#selector(upload(_:url:headers:callback:))),
      "discard": NSStringFromSelector(#selector(discard(_:))),
    ]
  }

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  @objc func pick(_ source: String, callback: @escaping LynxCallbackBlock) {
    guard let kind = StoryPhotoSource(rawValue: source) else {
      callback(["status": "invalid"])
      return
    }
    DispatchQueue.main.async {
      StoryPhotoPicker.start(kind, store: .shared) { payload in callback(payload) }
    }
  }

  @objc func upload(
    _ path: String, url: String, headers: NSDictionary, callback: @escaping LynxCallbackBlock
  ) {
    var pairs: [String: String] = [:]
    for case let (name as String, value as String) in headers { pairs[name] = value }
    StoryPhotoStore.shared.upload(path: path, url: url, headers: pairs) { payload in
      callback(payload)
    }
  }

  @objc func discard(_ path: String) {
    DispatchQueue.global(qos: .utility).async {
      StoryPhotoStore.shared.discard(path: path)
    }
  }
}

/// 고르는 화면 하나의 수명. 한 번에 하나만 — 진행 중이면 `busy`. **main 스레드 전용.**
private final class StoryPhotoPicker: NSObject, PHPickerViewControllerDelegate,
  UIImagePickerControllerDelegate, UINavigationControllerDelegate,
  UIAdaptivePresentationControllerDelegate
{
  /// 진행 중인 것 — 델리게이트가 약한 참조라 여기서 붙잡아 둔다.
  private static var active: StoryPhotoPicker?

  private let store: StoryPhotoStore
  private var completion: (([String: String]) -> Void)?

  private init(store: StoryPhotoStore, completion: @escaping ([String: String]) -> Void) {
    self.store = store
    self.completion = completion
  }

  static func start(
    _ source: StoryPhotoSource, store: StoryPhotoStore,
    completion: @escaping ([String: String]) -> Void
  ) {
    guard active == nil else {
      completion(["status": "busy"])
      return
    }
    let picker = StoryPhotoPicker(store: store, completion: completion)
    active = picker
    DispatchQueue.global(qos: .utility).async { store.purge() }
    switch source {
    case .library: picker.presentLibrary()
    case .camera: picker.presentCamera()
    }
  }

  /// 정확히 한 번 — 두 번째부터는 무시한다.
  private func finish(_ payload: [String: String]) {
    let run = { [self] in
      guard let completion else { return }
      self.completion = nil
      if Self.active === self { Self.active = nil }
      completion(payload)
    }
    if Thread.isMainThread { run() } else { DispatchQueue.main.async(execute: run) }
  }

  private func present(_ controller: UIViewController) {
    guard let presenter = Self.topViewController() else {
      finish(["status": "failed"])
      return
    }
    controller.presentationController?.delegate = self
    presenter.present(controller, animated: true)
  }

  // MARK: - 보관함

  private func presentLibrary() {
    var configuration = PHPickerConfiguration()
    configuration.filter = .images
    configuration.selectionLimit = 1
    configuration.preferredAssetRepresentationMode = .current
    let controller = PHPickerViewController(configuration: configuration)
    controller.delegate = self
    present(controller)
  }

  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    picker.dismiss(animated: true)
    guard let provider = results.first?.itemProvider else {
      finish(["status": "cancelled"])
      return
    }
    guard provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) else {
      finish(["status": "failed"])
      return
    }
    // 임시 파일은 핸들러가 끝나면 사라지므로 핸들러 안에서 줄여 쓴다.
    provider.loadFileRepresentation(forTypeIdentifier: UTType.image.identifier) { [self] url, _ in
      guard let url else {
        finish(["status": "failed"])
        return
      }
      finish(autoreleasepool { store.shrink(imageAt: url) })
    }
  }

  // MARK: - 카메라

  private func presentCamera() {
    guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
      finish(["status": "unavailable"])
      return
    }
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      showCamera()
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { [self] granted in
        DispatchQueue.main.async { [self] in
          if granted { showCamera() } else { finish(["status": "denied"]) }
        }
      }
    default:
      finish(["status": "denied"])
    }
  }

  private func showCamera() {
    let controller = UIImagePickerController()
    controller.sourceType = .camera
    controller.mediaTypes = [UTType.image.identifier]
    controller.allowsEditing = false
    controller.delegate = self
    present(controller)
  }

  func imagePickerController(
    _ picker: UIImagePickerController,
    didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
  ) {
    picker.dismiss(animated: true)
    guard let image = info[.originalImage] as? UIImage else {
      finish(["status": "failed"])
      return
    }
    DispatchQueue.global(qos: .userInitiated).async { [self] in
      finish(autoreleasepool { store.shrink(image: image) })
    }
  }

  func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
    picker.dismiss(animated: true)
    finish(["status": "cancelled"])
  }

  /// 쓸어내려 닫은 경우 — 위 델리게이트가 불리지 않는다.
  func presentationControllerDidDismiss(_: UIPresentationController) {
    finish(["status": "cancelled"])
  }

  // MARK: - 맨 위 화면

  /// 전경 창의 맨 위 화면이다 — 이미 무엇이 떠 있으면 그 위에 띄운다(`LegalDocumentModule`과 같은 방식).
  private static func topViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes
    let windowScene =
      (scenes.first { $0.activationState == .foregroundActive } as? UIWindowScene)
      ?? (scenes.first as? UIWindowScene)
    var top =
      windowScene?.windows.first { $0.isKeyWindow }?.rootViewController
      ?? windowScene?.windows.first?.rootViewController
    while let presented = top?.presentedViewController {
      top = presented
    }
    return top
  }
}
