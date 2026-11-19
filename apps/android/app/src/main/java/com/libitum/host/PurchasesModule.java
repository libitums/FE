package com.libitum.host;

import android.app.Activity;
import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.JavaOnlyArray;
import com.lynx.react.bridge.JavaOnlyMap;
import com.revenuecat.purchases.CacheFetchPolicy;
import com.revenuecat.purchases.CustomerInfo;
import com.revenuecat.purchases.PurchaseParams;
import com.revenuecat.purchases.Purchases;
import com.revenuecat.purchases.PurchasesError;
import com.revenuecat.purchases.PurchasesErrorCode;
import com.revenuecat.purchases.Store;
import com.revenuecat.purchases.SubscriptionInfo;
import com.revenuecat.purchases.interfaces.GetStoreProductsCallback;
import com.revenuecat.purchases.interfaces.GetStorefrontCallback;
import com.revenuecat.purchases.interfaces.LogInCallback;
import com.revenuecat.purchases.interfaces.PurchaseCallback;
import com.revenuecat.purchases.interfaces.ReceiveCustomerInfoCallback;
import com.revenuecat.purchases.models.StoreReplacementMode;
import com.revenuecat.purchases.models.Price;
import com.revenuecat.purchases.models.StoreProduct;
import com.revenuecat.purchases.models.StoreTransaction;
import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

/**
 * 스토어 상품 · 스토어 나라 · 구매 · 복원을 JS에 여는 호스트 모듈이다(ADR-0144 D7 2단계). **SDK가 시작된 빌드에서만** 등록한다
 * (`PurchasesSdk.configure`). 모든 동작은 콜백 하나로 답한다(`{ status, … }`) — iOS `PurchasesModule.swift`와 같은 모양.
 * Play 구독 상품 id는 `구독id:기본요금제id`로 나가고, JS가 앞부분만 쓴다. 구매 · 복원을 열지는 JS의 결제 플래그가 정한다.
 * iOS와 다른 점(ADR-0144 「Android 결제 준비」): 구독은 지금 Play 구독을 바꿈으로 산다(`PurchasesPlanChange`), 보류 결제는 `pending`.
 */
public final class PurchasesModule extends LynxModule {
  /** 앱이 파는 상품 id(ADR-0144 D4). 스토어 목록은 이 id로만 읽는다. */
  static final List<String> PRODUCT_IDS = Arrays.asList(
      "duru.tickets.monthly.v1", "duru.tickets.yearly.v1",
      "duru.chatplus.monthly.v1", "duru.chatplus.yearly.v1",
      "duru.premium.monthly.v1", "duru.premium.yearly.v1",
      "duru.coins.500.v1", "duru.coins.1200.v1", "duru.coins.3000.v1");

  private final Handler mainHandler = new Handler(Looper.getMainLooper());
  private final WeakReference<Activity> activityRef;
  private final Context appContext;

  public PurchasesModule(Context context, Object param) {
    super(context);
    appContext = context == null ? null : context.getApplicationContext();
    activityRef = new WeakReference<>(param instanceof Activity ? (Activity) param : null);
  }

  @LynxMethod public void configure(String userId, Callback callback) {
    if (!PurchasesSdk.started() || userId == null || userId.isEmpty()) {
      callback.invoke(status("failed"));
      return;
    }
    Purchases.getSharedInstance().logIn(userId, new LogInCallback() {
      @Override public void onReceived(CustomerInfo info, boolean created) {
        // 로그인한 고객에도 Airbridge 기기 id를 건다 — 기존 계정으로 들어오면 익명 때 건 값이 따라오지 않는다.
        PurchasesAttribution.linkAirbridgeDevice(appContext);
        callback.invoke(status("ok"));
      }

      @Override public void onError(PurchasesError error) {
        callback.invoke(status("failed"));
      }
    });
  }

  @LynxMethod public void signOut(Callback callback) {
    if (!PurchasesSdk.started() || Purchases.getSharedInstance().isAnonymous()) {
      callback.invoke(status("ok"));
      return;
    }
    Purchases.getSharedInstance().logOut(new ReceiveCustomerInfoCallback() {
      @Override public void onReceived(CustomerInfo info) {
        callback.invoke(status("ok"));
      }

      @Override public void onError(PurchasesError error) {
        callback.invoke(status("ok"));
      }
    });
  }

  @LynxMethod public void offerings(Callback callback) {
    if (!PurchasesSdk.started()) {
      callback.invoke(status("failed"));
      return;
    }
    Purchases.getSharedInstance().getProducts(PRODUCT_IDS, new GetStoreProductsCallback() {
      @Override public void onReceived(List<StoreProduct> products) {
        JavaOnlyArray rows = new JavaOnlyArray();
        for (StoreProduct product : products) {
          Price price = product.getPrice();
          JavaOnlyMap row = new JavaOnlyMap();
          row.putString("productId", product.getId());
          row.putString("price", price.getFormatted());
          row.putDouble("amount", price.getAmountMicros() / 1_000_000.0);
          row.putString("currency", price.getCurrencyCode());
          rows.pushMap(row);
        }
        JavaOnlyMap payload = status("ok");
        payload.putArray("products", rows);
        callback.invoke(payload);
      }

      @Override public void onError(PurchasesError error) {
        callback.invoke(status("failed"));
      }
    });
  }

  /** Play 계정의 나라(ISO 3166-1 alpha-2). */
  @LynxMethod public void storefront(Callback callback) {
    if (!PurchasesSdk.started()) {
      callback.invoke(status("failed"));
      return;
    }
    Purchases.getSharedInstance().getStorefrontCountryCode(new GetStorefrontCallback() {
      @Override public void onReceived(String countryCode) {
        if (countryCode == null || countryCode.isEmpty()) {
          callback.invoke(status("failed"));
          return;
        }
        JavaOnlyMap payload = status("ok");
        payload.putString("country", countryCode);
        callback.invoke(payload);
      }

      @Override public void onError(PurchasesError error) {
        callback.invoke(status("failed"));
      }
    });
  }

  @LynxMethod public void purchase(String productId, Callback callback) {
    if (!PurchasesSdk.started() || productId == null || productId.isEmpty()) {
      callback.invoke(status("failed"));
      return;
    }
    Purchases.getSharedInstance().getProducts(Arrays.asList(productId), new GetStoreProductsCallback() {
      @Override public void onReceived(List<StoreProduct> products) {
        StoreProduct product = products.isEmpty() ? null : products.get(0);
        if (!PurchasesPlanChange.isSubscription(productId)) {
          // 결제 시트는 화면 위의 활동이 연다 — 메인 스레드에서, 활동이 살아 있을 때만.
          mainHandler.post(() -> launch(product, null, callback));
          return;
        }
        // Play에는 구독 그룹이 없다 — 지금 Play 구독이 있으면 바꿈으로 산다(겹쳐 둘이 되지 않게). 모르면 사지 않는다.
        // 캐시가 아니라 지금 값 — 몇 분 전 다른 기기에서 산 Play 구독도 바꿀 대상으로 잡는다(겹침 방지가 네트워크 한 번보다 무겁다).
        Purchases.getSharedInstance().getCustomerInfo(CacheFetchPolicy.FETCH_CURRENT, new ReceiveCustomerInfoCallback() {
          @Override public void onReceived(CustomerInfo info) {
            String old = PurchasesPlanChange.replacedProductId(productId, activePlaySubscriptions(info));
            mainHandler.post(() -> launch(product, old, callback));
          }

          @Override public void onError(PurchasesError error) {
            callback.invoke(status("failed"));
          }
        });
      }

      @Override public void onError(PurchasesError error) {
        callback.invoke(status("failed"));
      }
    });
  }

  /** 이 고객의 활성 Play 구독 상품 id(App Store 등 다른 스토어 구독은 Play가 바꿀 수 없어 뺀다). */
  private static List<String> activePlaySubscriptions(CustomerInfo info) {
    List<String> ids = new ArrayList<>();
    for (Map.Entry<String, SubscriptionInfo> entry : info.getSubscriptionsByProductIdentifier().entrySet()) {
      SubscriptionInfo subscription = entry.getValue();
      if (subscription.isActive() && subscription.getStore() == Store.PLAY_STORE) ids.add(entry.getKey());
    }
    return ids;
  }

  private void launch(StoreProduct product, String oldProductId, Callback callback) {
    Activity activity = activityRef.get();
    if (product == null || activity == null || activity.isFinishing() || activity.isDestroyed()) {
      callback.invoke(status("failed"));
      return;
    }
    PurchaseParams.Builder params = new PurchaseParams.Builder(activity, product);
    if (oldProductId != null) {
      // 올림 · 같은 기간 같은 수준은 곧바로(새 가격을 지금 받고 남은 기간은 Play가 시간으로 얹음), 내림 · 기간 바꿈은 다음 갱신.
      boolean now = PurchasesPlanChange.timingOf(oldProductId, product.getId()) == PurchasesPlanChange.Timing.IMMEDIATE;
      params.oldProductId(oldProductId)
          .replacementMode(now ? StoreReplacementMode.CHARGE_FULL_PRICE : StoreReplacementMode.DEFERRED);
    }
    Purchases.getSharedInstance().purchase(
        params.build(),
        new PurchaseCallback() {
          @Override public void onCompleted(StoreTransaction transaction, CustomerInfo info) {
            JavaOnlyMap payload = status("purchased");
            payload.putString("productId", product.getId());
            // 거래 id — JS가 Airbridge Order Complete의 transactionID로 실어 중복을 막는다(ADR-0063 2026-11-19).
            String transactionId = transaction.getOrderId();
            if (transactionId == null || transactionId.isEmpty()) transactionId = transaction.getPurchaseToken();
            if (transactionId != null && !transactionId.isEmpty()) {
              payload.putString("transactionId", transactionId);
            }
            callback.invoke(payload);
          }

          @Override public void onError(PurchasesError error, boolean userCancelled) {
            boolean pending = error != null && error.getCode() == PurchasesErrorCode.PaymentPendingError;
            callback.invoke(status(PurchasesStatus.ofError(userCancelled, pending)));
          }
        });
  }

  @LynxMethod public void restore(Callback callback) {
    if (!PurchasesSdk.started()) {
      callback.invoke(status("failed"));
      return;
    }
    Purchases.getSharedInstance().restorePurchases(new ReceiveCustomerInfoCallback() {
      @Override public void onReceived(CustomerInfo info) {
        JavaOnlyMap payload = status("restored");
        payload.putInt("active", info.getEntitlements().getActive().size());
        callback.invoke(payload);
      }

      @Override public void onError(PurchasesError error) {
        callback.invoke(status("failed"));
      }
    });
  }

  private static JavaOnlyMap status(String value) {
    JavaOnlyMap payload = new JavaOnlyMap();
    payload.putString("status", value);
    return payload;
  }
}
