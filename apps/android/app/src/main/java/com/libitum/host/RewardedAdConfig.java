package com.libitum.host;

import java.util.regex.Pattern;

/**
 * AdMob 보상형 광고 값의 순수 판정(ADR-0208). 앱 ID(`ca-app-pub-…~…`)와 보상형 광고 단위 ID(`ca-app-pub-…/…`)가 둘 다 모양에 맞을 때만
 * 선다. 아니면 SDK를 시작하지 않고 광고 모듈도 등록하지 않는다 — JS는 모듈이 없으니 「Out of tickets」에 광고 줄을 세우지 않는다.
 * 매니페스트의 앱 ID는 값이 없을 때 Google 샘플 앱 ID로 채워진다(비면 SDK가 앱을 죽인다) — 그래서 광고 단위가 실제 스위치다.
 */
public final class RewardedAdConfig {
  private static final Pattern APP_ID = Pattern.compile("^ca-app-pub-\\d+~\\d+$");
  private static final Pattern UNIT_ID = Pattern.compile("^ca-app-pub-\\d+/\\d+$");

  private final String appId;
  private final String unitId;

  private RewardedAdConfig(String appId, String unitId) {
    this.appId = appId;
    this.unitId = unitId;
  }

  /** 둘 다 유효할 때만 설정을 돌려주고, 아니면 null이다. */
  public static RewardedAdConfig from(String appId, String unitId) {
    if (appId == null || unitId == null) return null;
    String app = appId.trim();
    String unit = unitId.trim();
    if (!APP_ID.matcher(app).matches() || !UNIT_ID.matcher(unit).matches()) return null;
    return new RewardedAdConfig(app, unit);
  }

  public String appId() {
    return appId;
  }

  public String unitId() {
    return unitId;
  }
}
