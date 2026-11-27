package com.libitum.host;

import java.util.regex.Pattern;

/**
 * AdMob 앱 ID · 광고 단위 ID의 순수 판정(ADR-0209 D10). 앱은 앱 ID만 든다 — 광고 단위 ID는 서버가 상태 응답으로 내리고 JS가
 * {@code loadRewarded(unitId)}로 넘긴다. 매니페스트 앱 ID는 값이 없을 때 Google 샘플 앱 ID로 채워진다(비면 SDK가 앱을 죽인다) —
 * **샘플 앱 ID는 release 빌드에서 받지 않는다**(스토어 빌드는 진짜 앱 ID가 있어야 광고 모듈을 연다).
 */
public final class RewardedAdConfig {
  private static final Pattern APP_ID = Pattern.compile("^ca-app-pub-\\d+~\\d+$");
  private static final Pattern UNIT_ID = Pattern.compile("^ca-app-pub-\\d+/\\d+$");
  private static final String SAMPLE_PUBLISHER = "ca-app-pub-3940256099942544~";

  private final String appId;

  private RewardedAdConfig(String appId) {
    this.appId = appId;
  }

  /** 앱 ID가 유효하고(샘플이면 {@code allowSample}일 때만) 설정을 돌려주고, 아니면 null이다. */
  public static RewardedAdConfig from(String appId, boolean allowSample) {
    if (appId == null) return null;
    String app = appId.trim();
    if (!APP_ID.matcher(app).matches()) return null;
    if (!allowSample && app.startsWith(SAMPLE_PUBLISHER)) return null;
    return new RewardedAdConfig(app);
  }

  /** 서버가 내린 광고 단위 ID가 보상형 단위 꼴({@code ca-app-pub-숫자/숫자})인가. */
  public static boolean isUnitId(String unitId) {
    return unitId != null && UNIT_ID.matcher(unitId).matches();
  }

  public String appId() {
    return appId;
  }
}
