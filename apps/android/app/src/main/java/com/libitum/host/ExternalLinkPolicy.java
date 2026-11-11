package com.libitum.host;

import java.util.regex.Pattern;

/**
 * 위기 안내 카드가 여는 주소 규칙이다(ADR-0125). 전화({@code tel:} 번호 — 공백은 걷는다)와 {@code https} 웹 주소만 열고, 그
 * 밖은 null. iOS {@code ExternalLinkPolicy} · JS {@code isOpenableExternalUrl}과 같은 표.
 */
public final class ExternalLinkPolicy {
  private static final Pattern TEL = Pattern.compile("^tel:\\+?[0-9][0-9 -]*$");
  // \\p{Z}를 함께 막아 줄바꿈 없는 공백(U+00A0) 같은 유니코드 공백도 거른다(JS · iOS와 같게). UNICODE_CHARACTER_CLASS
  // 플래그는 쓰지 않는다 — JVM은 받지만 Android 런타임(ICU)은 IllegalArgumentException을 던져 모듈이 죽었다(기기 확인).
  private static final Pattern HTTPS =
      Pattern.compile("^https://[^\\s\\p{Z}/?#]+([/?#][^\\s\\p{Z}]*)?$");

  private ExternalLinkPolicy() {}

  public static String target(String url) {
    if (url == null) return null;
    if (TEL.matcher(url).matches()) return url.replace(" ", "");
    if (HTTPS.matcher(url).matches()) return url;
    return null;
  }

  public static boolean isTel(String target) {
    return target.startsWith("tel:");
  }
}
