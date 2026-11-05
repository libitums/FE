package com.libitum.host;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * 받은 콘텐츠 원문의 SHA-256(소문자 16진수)과 UTF-8 바이트 수를 `"<sha>:<bytes>"`로 돌려줍니다(ADR-0105 D4). JS 순수
 * 구현은 JIT 없는 기기 엔진에서 본문 한 편(약 200 kB)에 수백 ms가 걸려 탭 처리와 같은 스레드를 막았습니다. 실패면 `""` —
 * JS가 순수 구현으로 되돌아갑니다.
 */
final class ContentDigest {
  private static final char[] HEX = "0123456789abcdef".toCharArray();

  private ContentDigest() {}

  static String of(String text) {
    if (text == null) return "";
    try {
      byte[] bytes = text.getBytes(StandardCharsets.UTF_8);
      byte[] digest = MessageDigest.getInstance("SHA-256").digest(bytes);
      char[] hex = new char[digest.length * 2];
      for (int i = 0; i < digest.length; i += 1) {
        hex[i * 2] = HEX[(digest[i] >> 4) & 0xF];
        hex[i * 2 + 1] = HEX[digest[i] & 0xF];
      }
      return new String(hex) + ":" + bytes.length;
    } catch (NoSuchAlgorithmException | RuntimeException | OutOfMemoryError error) {
      // 빈 문자열이면 JS가 순수 구현으로 계산합니다 — 큰 본문의 할당 실패로 앱이 내려가지 않게 합니다.
      return "";
    }
  }
}
