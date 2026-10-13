package com.libitum.host;

import java.util.regex.Pattern;

/** Meta SDK 설정의 순수 판정. 앱 ID는 숫자뿐, 클라이언트 토큰은 공백 없는 한 덩어리일 때만 선다. */
public final class MetaAppEventsConfig {
  private static final Pattern APP_ID = Pattern.compile("^[0-9]+$");
  private static final Pattern TOKEN = Pattern.compile("^\\S+$");

  private final String appId;
  private final String clientToken;

  private MetaAppEventsConfig(String appId, String clientToken) {
    this.appId = appId;
    this.clientToken = clientToken;
  }

  /** 둘 다 유효할 때만 설정을 돌려주고, 아니면 null이다. */
  public static MetaAppEventsConfig from(String appId, String clientToken) {
    if (appId == null || clientToken == null) return null;
    String id = appId.trim();
    String token = clientToken.trim();
    if (!APP_ID.matcher(id).matches() || !TOKEN.matcher(token).matches()) return null;
    return new MetaAppEventsConfig(id, token);
  }

  public String appId() {
    return appId;
  }

  public String clientToken() {
    return clientToken;
  }
}
