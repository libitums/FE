package com.libitum.host;

import android.content.Context;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;

/**
 * 지금 기본 네트워크의 종류를 동기로 돌려주는 호스트 모듈입니다(ADR-0096 D1). 분석 이벤트가 날 때마다 JS가
 * 부릅니다. 권한은 이미 있는 `ACCESS_NETWORK_STATE` 하나이고, 어떤 실패도 던지지 않고 `unknown:unknown`입니다.
 */
public final class NetworkStatusModule extends LynxModule {
  private final ConnectivityManager connectivity;

  public NetworkStatusModule(Context context) {
    super(context);
    connectivity = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
  }

  @LynxMethod public String current() {
    try {
      if (connectivity == null) return NetworkStatusLabel.UNKNOWN;
      Network network = connectivity.getActiveNetwork();
      if (network == null) return NetworkStatusLabel.offline();
      NetworkCapabilities capabilities = connectivity.getNetworkCapabilities(network);
      if (capabilities == null) return NetworkStatusLabel.UNKNOWN;
      return NetworkStatusLabel.of(
          capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI),
          capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR),
          capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET),
          capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED),
          connectivity.getRestrictBackgroundStatus()
              == ConnectivityManager.RESTRICT_BACKGROUND_STATUS_ENABLED);
    } catch (RuntimeException error) {
      return NetworkStatusLabel.UNKNOWN;
    }
  }
}
