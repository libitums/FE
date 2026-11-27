import Foundation
import GoogleMobileAds
import UIKit

/// AdMob 보상형 광고 값 판정(ADR-0209). `Info.plist`의 `GADApplicationIdentifier` · `AdMobRewardedUnitID`(← `Config/AdMob.xcconfig` ←
/// 추적하지 않는 `AdMob.local.xcconfig`)가 둘 다 `ca-app-pub-`으로 시작할 때만 선다. 앱 ID는 늘 샘플 값이라도 차 있고(비면 SDK가 앱을 죽인다),
/// 광고 단위가 비면 SDK를 한 줄도 부르지 않고 모듈도 등록하지 않는다 — JS는 모듈이 없으니 「Out of tickets」에 광고 줄을 세우지 않는다.
struct RewardedAdConfig: Equatable {
  let appId: String
  let unitId: String

  static func from(appId: Any?, unitId: Any?) -> RewardedAdConfig? {
    // Android `RewardedAdConfig`와 같은 모양 — 앱 ID는 `~`, 광고 단위는 `/`(바꿔 넣으면 받지 않는다, 리뷰 #657).
    func value(_ raw: Any?, pattern: String) -> String? {
      guard let text = (raw as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
        text.range(of: pattern, options: .regularExpression) != nil
      else { return nil }
      return text
    }
    guard let app = value(appId, pattern: #"^ca-app-pub-\d+~\d+$"#),
      let unit = value(unitId, pattern: #"^ca-app-pub-\d+/\d+$"#)
    else { return nil }
    return RewardedAdConfig(appId: app, unitId: unit)
  }

  static func fromBundle(_ bundle: Bundle = .main) -> RewardedAdConfig? {
    from(
      appId: bundle.object(forInfoDictionaryKey: "GADApplicationIdentifier"),
      unitId: bundle.object(forInfoDictionaryKey: "AdMobRewardedUnitID"))
  }
}

/// SDK를 시작하는 유일한 자리다. 값이 없으면 이 파일의 어떤 코드도 SDK를 부르지 않는다.
enum RewardedAdSDK {
  static private(set) var config: RewardedAdConfig?

  static func start(_ config: RewardedAdConfig) {
    guard self.config == nil else { return }
    self.config = config
    MobileAds.shared.start(completionHandler: nil)
  }
}

/// 보상형 광고를 불러오고 보여 주는 호스트 모듈이다(ADR-0209 · ADR-0017). **값이 있어 SDK가 시작된 빌드에서만** 등록한다.
/// - `loadRewarded(callback)` → `{status: "loaded" | "no_fill" | "failed"}`. 비개인화(npa=1)로 요청한다 — 새 ATT 요청은 없다.
/// - `showRewarded(userId, customData, callback)` → `{status: "earned" | "dismissed" | "failed"}`. 닫힌 뒤 한 번 답한다.
///   SSV 옵션에 Supabase 사용자 id(`user_id`)와 서버 요청 id(`custom_data`)를 싣는다 — 지급은 서버가 Google 콜백으로 판정한다.
@objc(RewardedAdModule)
final class RewardedAdModule: NSObject, LynxModule, FullScreenContentDelegate {
  @objc static var name: String { "RewardedAdModule" }

  @objc static var methodLookup: [String: String] {
    [
      "loadRewarded": NSStringFromSelector(#selector(loadRewarded(_:))),
      "showRewarded": NSStringFromSelector(#selector(showRewarded(_:customData:callback:))),
    ]
  }

  private var ad: RewardedAd?
  private var showCallback: LynxCallbackBlock?
  private var earned = false

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  @objc func loadRewarded(_ callback: @escaping LynxCallbackBlock) {
    guard let config = RewardedAdSDK.config else {
      callback(["status": "failed"])
      return
    }
    let request = Request()
    let extras = Extras()
    extras.additionalParameters = ["npa": "1"]
    request.register(extras)
    DispatchQueue.main.async {
      RewardedAd.load(with: config.unitId, request: request) { [weak self] ad, error in
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
