package com.libitum.host;

import java.util.regex.Pattern;

/**
 * Airbridge SDK 설정의 순수 판정(docs/adr/0063-airbridge-events.md D4). 앱 이름은 영문 · 숫자 · 밑줄 ·
 * 하이픈뿐, 토큰은 공백 없는 한 덩어리일 때만 선다.
 */
public final class AirbridgeEventsConfig {
  private static final Pattern APP_NAME = Pattern.compile("^[A-Za-z0-9_-]+$");
  private static final Pattern TOKEN = Pattern.compile("^\\S+$");

  private final String appName;
  private final String sdkToken;

  private AirbridgeEventsConfig(String appName, String sdkToken) {
    this.appName = appName;
    this.sdkToken = sdkToken;
  }

  /** 둘 다 유효할 때만 설정을 돌려주고, 아니면 null이다. */
  public static AirbridgeEventsConfig from(String appName, String sdkToken) {
    if (appName == null || sdkToken == null) return null;
    String name = appName.trim();
    String token = sdkToken.trim();
    if (!APP_NAME.matcher(name).matches() || !TOKEN.matcher(token).matches()) return null;
    return new AirbridgeEventsConfig(name, token);
  }

  public String appName() {
    return appName;
  }

  public String sdkToken() {
    return sdkToken;
  }
}
