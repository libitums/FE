import Airbridge
import Foundation
import RevenueCat

/// RevenueCat 고객에 Airbridge 기기 id를 건다(ADR-0144 「Airbridge 기기 id」). RevenueCat → Airbridge 서버 연동이 구매 이벤트를
/// 보낼 때 이 id로 기기 · 광고 클릭에 잇는다. **구매 이벤트는 앱의 Airbridge SDK가 보내지 않는다** — 서버 연동 하나만 보낸다(이중 집계 없음).
/// 두 SDK가 모두 시작됐고 추적을 멈추지 않은 기기에서만 부른다. 아니면 SDK를 한 줄도 부르지 않는다.
enum PurchasesAttribution {
  /// Airbridge가 준 기기 id. trim한 뒤 공백 없는 한 덩어리일 때만 쓴다. 아니면 `nil`.
  static func deviceID(_ raw: String?) -> String? {
    guard let id = raw?.trimmingCharacters(in: .whitespacesAndNewlines),
      !id.isEmpty, !id.contains(where: { $0.isWhitespace })
    else { return nil }
    return id
  }

  /// 두 SDK가 모두 시작됐고 추적을 멈추지 않았을 때만 건다(시험 계정은 멈춰 둔다 — ADR-0085 D4).
  static func shouldLink(purchasesStarted: Bool, airbridgeStarted: Bool, trackingStopped: Bool) -> Bool {
    purchasesStarted && airbridgeStarted && !trackingStopped
  }

  /// 추적 허용(ATT)을 정한 뒤 기기 식별자를 다시 모을지. 허용했고 `shouldLink`가 참일 때만 — IDFA는 허용한 뒤에만 읽힌다.
  static func shouldCollectAfterTrackingDecision(
    authorized: Bool, purchasesStarted: Bool, airbridgeStarted: Bool, trackingStopped: Bool
  ) -> Bool {
    authorized
      && shouldLink(
        purchasesStarted: purchasesStarted, airbridgeStarted: airbridgeStarted, trackingStopped: trackingStopped)
  }

  /// 앱 시작 뒤 · 로그인(logIn) 뒤에 부른다. Airbridge 기기 id는 비동기로 받는다 — 부르는 스레드를 막지 않는다.
  static func linkAirbridgeDevice(defaults: UserDefaults = .standard) {
    guard isLinkable(defaults) else { return }
    _ = Airbridge.fetchDeviceUUID(
      onSuccess: { raw in
        guard let id = deviceID(raw), isLinkable(defaults) else { return }
        // 이 id를 걸면 SDK가 IDFV · IP(허용한 기기는 IDFA)도 함께 모은다 — 문서대로 한 번 더 부른다. 대화상자는 띄우지 않는다.
        Purchases.shared.attribution.setAirbridgeDeviceID(id)
        Purchases.shared.attribution.collectDeviceIdentifiers()
      },
      onFailure: { _ in })
  }

  /// 추적 허용 대화상자의 답을 받은 뒤 부른다. 대화상자를 띄우지 않는다 — IDFA는 이미 허용됐을 때만 실린다.
  static func collectAfterTrackingDecision(
    _ status: AirbridgeTrackingAuthorization, defaults: UserDefaults = .standard
  ) {
    guard
      shouldCollectAfterTrackingDecision(
        authorized: status == .authorized,
        purchasesStarted: PurchasesSDK.isStarted,
        airbridgeStarted: AirbridgeEvents.isStarted,
        trackingStopped: defaults.bool(forKey: AirbridgeEvents.trackingStoppedKey))
    else { return }
    Purchases.shared.attribution.collectDeviceIdentifiers()
  }

  private static func isLinkable(_ defaults: UserDefaults) -> Bool {
    shouldLink(
      purchasesStarted: PurchasesSDK.isStarted,
      airbridgeStarted: AirbridgeEvents.isStarted,
      trackingStopped: defaults.bool(forKey: AirbridgeEvents.trackingStoppedKey))
  }
}
