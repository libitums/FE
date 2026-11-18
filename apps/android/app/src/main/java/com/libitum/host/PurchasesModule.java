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
import com.revenuecat.purchases.CustomerInfo;
import com.revenuecat.purchases.PurchaseParams;
import com.revenuecat.purchases.Purchases;
import com.revenuecat.purchases.PurchasesError;
import com.revenuecat.purchases.interfaces.GetStoreProductsCallback;
import com.revenuecat.purchases.interfaces.GetStorefrontCallback;
import com.revenuecat.purchases.interfaces.LogInCallback;
import com.revenuecat.purchases.interfaces.PurchaseCallback;
import com.revenuecat.purchases.interfaces.ReceiveCustomerInfoCallback;
import com.revenuecat.purchases.models.Price;
import com.revenuecat.purchases.models.StoreProduct;
import com.revenuecat.purchases.models.StoreTransaction;
import java.lang.ref.WeakReference;
import java.util.Arrays;
import java.util.List;

/**
 * 스토어 상품 · 스토어 나라 · 구매 · 복원을 JS에 여는 호스트 모듈이다(ADR-0144 D7 2단계). **SDK가 시작된 빌드에서만** 등록한다
 * (`PurchasesSdk.configure`). 모든 동작은 콜백 하나로 답한다(`{ status, … }`) — iOS `PurchasesModule.swift`와 같은 모양.
 * Play 구독 상품 id는 `구독id:기본요금제id`로 나가고, JS가 앞부분만 쓴다. 구매 · 복원을 열지는 JS의 결제 플래그가 정한다.
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

  public PurchasesModule(Context context, Object param) {
    super(context);
    activityRef = new WeakReference<>(param instanceof Activity ? (Activity) param : null);
  }

  @LynxMethod public void configure(String userId, Callback callback) {
    if (!PurchasesSdk.started() || userId == null || userId.isEmpty()) {
      callback.invoke(status("failed"));
      return;
    }
    Purchases.getSharedInstance().logIn(userId, new LogInCallback() {
      @Override public void onReceived(CustomerInfo info, boolean created) {
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
        // 결제 시트는 화면 위의 활동이 연다 — 메인 스레드에서, 활동이 살아 있을 때만.
        mainHandler.post(() -> launch(product, callback));
      }

      @Override public void onError(PurchasesError error) {
        callback.invoke(status("failed"));
      }
    });
  }

  private void launch(StoreProduct product, Callback callback) {
    Activity activity = activityRef.get();
    if (product == null || activity == null || activity.isFinishing() || activity.isDestroyed()) {
      callback.invoke(status("failed"));
      return;
    }
    Purchases.getSharedInstance().purchase(
        new PurchaseParams.Builder(activity, product).build(),
        new PurchaseCallback() {
          @Override public void onCompleted(StoreTransaction transaction, CustomerInfo info) {
            JavaOnlyMap payload = status("purchased");
            payload.putString("productId", product.getId());
            callback.invoke(payload);
          }

          @Override public void onError(PurchasesError error, boolean userCancelled) {
            callback.invoke(status(userCancelled ? "cancelled" : "failed"));
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
