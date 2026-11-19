package com.libitum.host;

import android.content.Context;
import co.ab180.airbridge.Airbridge;
import com.revenuecat.purchases.Purchases;
import java.util.regex.Pattern;

/**
 * RevenueCat 고객에 Airbridge 기기 id를 건다(ADR-0144 「Airbridge 기기 id」). RevenueCat → Airbridge 서버 연동이 구매 이벤트를
 * 보낼 때 이 id로 기기 · 광고 클릭에 잇는다. 구매 이벤트는 앱의 Airbridge SDK가 보내지 않는다 — 서버 연동 하나만 보낸다(이중 집계 없음).
 * 두 SDK가 모두 시작됐고 추적을 멈추지 않은 기기에서만 부른다. 아니면 SDK를 한 줄도 부르지 않는다.
 */
final class PurchasesAttribution {
  private static final Pattern NO_SPACE = Pattern.compile("^\\S+$");

  private PurchasesAttribution() {}

  /** Airbridge가 준 기기 id. trim한 뒤 공백 없는 한 덩어리일 때만 쓴다. 아니면 null. 순수. */
  static String deviceId(String raw) {
    if (raw == null) return null;
    String id = raw.trim();
    if (id.isEmpty() || !NO_SPACE.matcher(id).matches()) return null;
    return id;
  }

  /** 두 SDK가 모두 시작됐고 추적을 멈추지 않았을 때만 건다(시험 계정은 멈춰 둔다 — ADR-0085 D4). 순수. */
  static boolean shouldLink(boolean purchasesStarted, boolean airbridgeStarted, boolean trackingStopped) {
    return purchasesStarted && airbridgeStarted && !trackingStopped;
  }

  /** 앱 시작 뒤 · 로그인(logIn) 뒤에 부른다. Airbridge 기기 id는 비동기로 받는다 — 부르는 스레드를 막지 않는다. 던지지 않는다. */
  static void linkAirbridgeDevice(Context context) {
    if (!isLinkable(context)) return;
    try {
      Airbridge.fetchDeviceUUID(
          raw -> {
            String id = deviceId(raw);
            if (id == null || !isLinkable(context)) return;
            try {
              // 이 id를 걸면 SDK가 광고 ID · IP도 함께 모은다 — 문서대로 한 번 더 부른다.
              Purchases.getSharedInstance().setAirbridgeDeviceID(id);
              Purchases.getSharedInstance().collectDeviceIdentifiers();
            } catch (RuntimeException | LinkageError ignored) {
              // 귀속 실패가 구매 · 화면을 막지 않는다.
            }
          },
          error -> {});
    } catch (RuntimeException | LinkageError ignored) {
      // 귀속 실패가 앱 시작 · 로그인을 막지 않는다.
    }
  }

  private static boolean isLinkable(Context context) {
    if (!PurchasesSdk.started() || !AirbridgeEvents.started() || context == null) return false;
    return shouldLink(true, true, AirbridgeEvents.trackingStopped(context));
  }
}
