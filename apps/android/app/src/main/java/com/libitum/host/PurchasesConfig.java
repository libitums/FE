package com.libitum.host;

import java.util.regex.Pattern;

/** RevenueCat 공개 SDK 키의 순수 판정(ADR-0144 2단계). 공백 없는 한 덩어리일 때만 선다. */
public final class PurchasesConfig {
  private static final Pattern KEY = Pattern.compile("^\\S+$");

  private final String apiKey;

  private PurchasesConfig(String apiKey) {
    this.apiKey = apiKey;
  }

  /** 키가 유효할 때만 설정을 돌려주고, 아니면 null이다. */
  public static PurchasesConfig from(String apiKey) {
    if (apiKey == null) return null;
    String key = apiKey.trim();
    if (!KEY.matcher(key).matches()) return null;
    return new PurchasesConfig(key);
  }

  public String apiKey() {
    return apiKey;
  }
}
