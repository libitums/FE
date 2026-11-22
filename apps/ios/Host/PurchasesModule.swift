import Foundation
import RevenueCat
import StoreKit

/// RevenueCat 공개 SDK 키 판정(ADR-0144 2단계, 2026-11-17). `Info.plist`의 `RevenueCatAPIKey`(← `Config/RevenueCat.xcconfig` ←
/// 추적하지 않는 `RevenueCat.local.xcconfig`)가 공백 없는 한 덩어리일 때만 선다. 비면 SDK를 한 줄도 부르지 않고 모듈도 등록하지 않는다 —
/// JS는 모듈이 없으니 임시 추천 가격으로 물러선다.
struct PurchasesConfig: Equatable {
  let apiKey: String

  static func from(apiKey: Any?) -> PurchasesConfig? {
    guard let key = (apiKey as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
      !key.isEmpty, !key.contains(where: { $0.isWhitespace })
    else { return nil }
    return PurchasesConfig(apiKey: key)
  }

  static func fromBundle(_ bundle: Bundle = .main) -> PurchasesConfig? {
    from(apiKey: bundle.object(forInfoDictionaryKey: "RevenueCatAPIKey"))
  }
}

/// SDK를 시작하는 유일한 자리다. 키가 없으면 이 파일의 어떤 코드도 SDK를 부르지 않는다.
enum PurchasesSDK {
  static private(set) var isStarted = false

  static func start(_ config: PurchasesConfig) {
    guard !isStarted else { return }
    // 앱 사용자 id는 로그인 뒤 JS가 `configure`(logIn)로 맞춘다 — 그 전에는 익명이다.
    Purchases.configure(withAPIKey: config.apiKey)
    isStarted = true
  }
}

/// 스토어 상품 · 스토어 나라 · 구매 · 복원을 JS에 여는 호스트 모듈이다(ADR-0144 D7 2단계). **SDK가 시작된 빌드에서만** 등록한다.
/// 모든 동작은 콜백 하나로 답한다(`{ status, … }`). 구매 · 복원을 열지는 JS의 결제 플래그가 정한다.
@objc(PurchasesModule)
final class PurchasesModule: NSObject, LynxModule {
  @objc static var name: String { "PurchasesModule" }

  @objc static var methodLookup: [String: String] {
    [
      "configure": NSStringFromSelector(#selector(configure(_:callback:))),
      "signOut": NSStringFromSelector(#selector(signOut(_:))),
      "offerings": NSStringFromSelector(#selector(offerings(_:))),
      "storefront": NSStringFromSelector(#selector(storefront(_:))),
      "purchase": NSStringFromSelector(#selector(purchase(_:callback:))),
      "restore": NSStringFromSelector(#selector(restore(_:))),
    ]
  }

  /// 앱이 파는 상품 id(ADR-0144 D4). 스토어 목록은 이 id로만 읽는다.
  static let productIds = [
    "duru.tickets.monthly.v1", "duru.tickets.yearly.v1",
    "duru.chatplus.monthly.v1", "duru.chatplus.yearly.v1",
    "duru.premium.monthly.v1", "duru.premium.yearly.v1",
    "duru.coins.500.v1", "duru.coins.1200.v1", "duru.coins.3000.v1",
  ]

  @objc override init() { super.init() }
  @objc init(param _: Any) { super.init() }

  @objc func configure(_ userId: String, callback: @escaping LynxCallbackBlock) {
    guard PurchasesSDK.isStarted, !userId.isEmpty else {
      callback(["status": "failed"])
      return
    }
    Purchases.shared.logIn(userId) { _, _, error in
      // 로그인한 고객에도 Airbridge 기기 id를 건다 — 기존 계정으로 들어오면 익명 때 건 값이 따라오지 않는다.
      if error == nil { PurchasesAttribution.linkAirbridgeDevice() }
      callback(["status": error == nil ? "ok" : "failed"])
    }
  }

  @objc func signOut(_ callback: @escaping LynxCallbackBlock) {
    guard PurchasesSDK.isStarted, !Purchases.shared.isAnonymous else {
      callback(["status": "ok"])
      return
    }
    Purchases.shared.logOut { _, _ in callback(["status": "ok"]) }
  }

  @objc func offerings(_ callback: @escaping LynxCallbackBlock) {
    guard PurchasesSDK.isStarted else {
      callback(["status": "failed"])
      return
    }
    Purchases.shared.getProducts(Self.productIds) { products in
      let rows: [[String: Any]] = products.map { product in
        var row: [String: Any] = [
          "productId": product.productIdentifier,
          "price": product.localizedPriceString,
          "amount": NSDecimalNumber(decimal: product.price).doubleValue,
        ]
        if let currency = product.currencyCode { row["currency"] = currency }
        return row
      }
      callback(["status": "ok", "products": rows])
    }
  }

  /// App Store 계정의 나라(StoreKit 2, ISO 3166-1 alpha-3). JS가 가격 지역에 쓰는 두 글자로 맞춘다.
  @objc func storefront(_ callback: @escaping LynxCallbackBlock) {
    Task {
      if let code = await StoreKit.Storefront.current?.countryCode, !code.isEmpty {
        callback(["status": "ok", "country": code])
      } else {
        callback(["status": "failed"])
      }
    }
  }

  @objc func purchase(_ productId: String, callback: @escaping LynxCallbackBlock) {
    guard PurchasesSDK.isStarted else {
      callback(["status": "failed"])
      return
    }
    Purchases.shared.getProducts([productId]) { products in
      guard let product = products.first else {
        callback(["status": "failed"])
        return
      }
      Purchases.shared.purchase(product: product) { transaction, _, error, cancelled in
        if cancelled {
          callback(["status": "cancelled"])
        } else if error == nil, let transaction {
          // 거래 id — JS가 Airbridge Order Complete의 transactionID로 실어 중복을 막는다(ADR-0063 2026-11-19).
          callback([
            "status": "purchased", "productId": product.productIdentifier,
            "transactionId": transaction.transactionIdentifier,
          ])
        } else {
          callback(["status": "failed"])
        }
      }
    }
  }

  @objc func restore(_ callback: @escaping LynxCallbackBlock) {
    guard PurchasesSDK.isStarted else {
      callback(["status": "failed"])
      return
    }
    Purchases.shared.restorePurchases { info, error in
      guard error == nil, let info else {
        callback(["status": "failed"])
        return
      }
      callback(["status": "restored", "active": info.entitlements.active.count])
    }
  }
}
