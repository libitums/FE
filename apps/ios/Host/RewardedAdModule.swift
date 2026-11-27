import Foundation
import GoogleMobileAds
import UIKit

/// AdMob 앱 ID 판정(ADR-0209 D10). `Info.plist`의 `GADApplicationIdentifier`(← `Config/AdMob.xcconfig` ← 추적하지 않는 `AdMob.local.xcconfig`).
/// 광고 단위 ID는 앱이 들지 않는다 — 서버가 상태 응답으로 내리고 JS가 `loadRewarded(unitId)`로 넘긴다.
/// 앱 ID는 비면 SDK가 앱을 죽여 늘 차 있다(기본값은 Google 샘플 앱 ID). **샘플 앱 ID는 Debug 빌드에서만** 받는다 — 스토어(Release) 빌드는
/// 진짜 앱 ID가 있어야 모듈을 등록한다. 등록만 하고 SDK는 서버가 단위 ID를 준 첫 불러오기 때 시작한다.
struct RewardedAdConfig: Equatable {
  static let sampleAppId = "ca-app-pub-3940256099942544~1458002511"
  static let unitPattern = #"^ca-app-pub-\d+/\d+$"#

  let appId: String

  static func from(appId: Any?, allowSample: Bool) -> RewardedAdConfig? {
    guard let text = (appId as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
      text.range(of: #"^ca-app-pub-\d+~\d+$"#, options: .regularExpression) != nil,
      allowSample || !text.hasPrefix("ca-app-pub-3940256099942544~")
    else { return nil }
    return RewardedAdConfig(appId: text)
  }

  static func fromBundle(_ bundle: Bundle = .main) -> RewardedAdConfig? {
    #if DEBUG
      let allowSample = true
    #else
      let allowSample = false
    #endif
    return from(appId: bundle.object(forInfoDictionaryKey: "GADApplicationIdentifier"), allowSample: allowSample)
  }

  static func isUnitId(_ value: String) -> Bool {
    value.range(of: unitPattern, options: .regularExpression) != nil
  }
}

/// SDK를 시작하는 유일한 자리다. 앱 ID가 없으면 모듈이 없고, 있어도 서버가 단위 ID를 줘 불러오기 전에는 SDK를 부르지 않는다.
enum RewardedAdSDK {
  static private(set) var config: RewardedAdConfig?
  static private var started = false

  static func configure(_ config: RewardedAdConfig) {
    self.config = config
  }

  static func startIfNeeded() {
    guard config != nil, !started else { return }
    started = true
    MobileAds.shared.start(completionHandler: nil)
  }
}

/// 보상형 광고를 불러오고 보여 주는 호스트 모듈이다(ADR-0209 · ADR-0017). **앱 ID가 있는 빌드에서만** 등록한다.
/// - `loadRewarded(unitId, callback)` → `{status: "loaded" | "no_fill" | "failed"}`. 단위 ID는 서버가 내린 값(꼴 검사), 처음이면 여기서 SDK를 시작한다.
///   비개인화(npa=1)로 요청한다 — 새 ATT 요청은 없다.
/// - `showRewarded(userId, customData, callback)` → `{status: "earned" | "dismissed" | "failed"}`. 닫힌 뒤 한 번 답한다.
///   SSV 옵션에 Supabase 사용자 id(`user_id`)와 서버 요청 id(`custom_data`)를 싣는다 — 지급은 서버가 Google 콜백으로 판정한다.
@objc(RewardedAdModule)
final class RewardedAdModule: NSObject, LynxModule, FullScreenContentDelegate {
  @objc static var name: String { "RewardedAdModule" }

  @objc static var methodLookup: [String: String] {
    [
      "loadRewarded": NSStringFromSelector(#selector(loadRewarded(_:callback:))),
      "showRewarded": NSStringFromSelector(#selector(showRewarded(_:customData:callback:))),
    ]
  }

  private var ad: RewardedAd?
  private var showCallback: LynxCallbackBlock?
  private var earned = false

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  @objc func loadRewarded(_ unitId: String, callback: @escaping LynxCallbackBlock) {
    guard RewardedAdSDK.config != nil, RewardedAdConfig.isUnitId(unitId) else {
      callback(["status": "failed"])
      return
    }
    let request = Request()
    let extras = Extras()
    extras.additionalParameters = ["npa": "1"]
    request.register(extras)
    DispatchQueue.main.async {
      RewardedAdSDK.startIfNeeded()
      RewardedAd.load(with: unitId, request: request) { [weak self] ad, error in
        self?.ad = ad
        if let error = error as NSError? {
          // 광고 없음(no fill)과 그 밖의 실패를 나눠 알린다 — JS는 둘 다 A5로 보인다.
          let noFill = error.code == RequestError.noFill.rawValue
          callback(["status": noFill ? "no_fill" : "failed"])
          return
        }
        callback(["status": ad == nil ? "failed" : "loaded"])
      }
    }
  }

  @objc func showRewarded(_ userId: String, customData: String, callback: @escaping LynxCallbackBlock) {
    DispatchQueue.main.async { [self] in
      guard let ad, let presenter = Self.topViewController() else {
        callback(["status": "failed"])
        return
      }
      let options = ServerSideVerificationOptions()
      options.userIdentifier = userId
      options.customRewardText = customData
      ad.serverSideVerificationOptions = options
      ad.fullScreenContentDelegate = self
      earned = false
      showCallback = callback
      ad.present(from: presenter) { [weak self] in
        self?.earned = true
      }
    }
  }

  func adDidDismissFullScreenContent(_ presented: FullScreenPresentingAd) {
    finish(earned ? "earned" : "dismissed")
  }

  func ad(_ presented: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) {
    finish("failed")
  }

  private func finish(_ status: String) {
    ad = nil
    // 광고가 오디오 세션을 바꿨을 수 있다 — 학습 음원 재생 정책을 되돌린다(#200).
    PlaybackAudioSession.shared.configureDefault()
    let callback = showCallback
    showCallback = nil
    callback?(["status": status])
  }

  /// 전경 창의 맨 위 화면이다(`StoryPhotoModule`과 같은 방식).
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
