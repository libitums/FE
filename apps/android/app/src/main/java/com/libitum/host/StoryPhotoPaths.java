package com.libitum.host;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

/**
 * 내 스토리 사진(ADR-0199)의 순수 판정: 파일 이름 · 폴더 안 경로 · 올릴 주소 · 헤더 · 콜백 페이로드(값은 모두 문자열).
 * 안드로이드 클래스를 쓰지 않아 JVM 단위 테스트로 본다.
 */
final class StoryPhotoPaths {
  static final String ROOT_NAME = "story-photos";
  static final String CAPTURE_NAME = "capture";
  static final int BODY_LIMIT = 64 * 1024;
  static final long MAX_AGE_MS = 24L * 60 * 60 * 1000;

  private StoryPhotoPaths() {}

  /** {@code "camera"} · {@code "library"}면 그대로, 그 밖은 null(→ invalid). */
  static String source(String source) {
    return "camera".equals(source) || "library".equals(source) ? source : null;
  }

  static String newFileName() {
    return UUID.randomUUID().toString().toLowerCase(Locale.ROOT) + ".jpg";
  }

  /**
   * {@code path}가 {@code root} 바로 안의 {@code .jpg}면 정규화한 파일, 아니면 null. 절대 경로만, {@code ..} 조각 ·
   * NUL은 거부한다. 파일이 있는지는 보지 않는다(호출 쪽이 missing으로 가른다). capture 하위 폴더도 받지 않는다.
   */
  static File inside(File root, String path) {
    if (root == null || path == null || path.isEmpty() || !path.startsWith("/")) return null;
    if (path.indexOf('\0') >= 0 || !path.endsWith(".jpg")) return null;
    for (String segment : path.split("/")) {
      if (segment.equals("..")) return null;
    }
    try {
      File file = new File(path).getCanonicalFile();
      File parent = file.getParentFile();
      if (parent == null || !parent.equals(root.getCanonicalFile())) return null;
      return file.getName().length() > ".jpg".length() ? file : null;
    } catch (IOException | SecurityException error) {
      return null;
    }
  }

  /** {@code https://host…}만. 공백 등 URI로 읽히지 않는 값은 거부한다. */
  static boolean isHttps(String url) {
    if (url == null) return false;
    try {
      URI uri = new URI(url);
      return "https".equals(uri.getScheme()) && uri.getHost() != null && !uri.getHost().isEmpty();
    } catch (URISyntaxException error) {
      return false;
    }
  }

  /** 마지막으로 고친 때로부터 24시간이 넘었는가. */
  static boolean expired(long lastModifiedMs, long nowMs) {
    return nowMs - lastModifiedMs > MAX_AGE_MS;
  }

  /** JS 헤더 중 그대로 실을 것. Content-Type은 image/jpeg로 고정이라 싣지 않는다. */
  static boolean forwardsHeader(String name) {
    return name != null && !name.isEmpty() && !name.equalsIgnoreCase("Content-Type");
  }

  static Map<String, String> status(String status) {
    Map<String, String> map = new HashMap<>();
    map.put("status", status);
    return map;
  }

  static Map<String, String> picked(File file, int width, int height, long bytes) {
    Map<String, String> map = status("picked");
    map.put("url", "file://" + file.getAbsolutePath());
    map.put("path", file.getAbsolutePath());
    map.put("width", Integer.toString(width));
    map.put("height", Integer.toString(height));
    map.put("bytes", Long.toString(bytes));
    return map;
  }

  /** 응답 본문은 앞 {@link #BODY_LIMIT}바이트만 UTF-8로 읽는다. 2xx가 아니어도 http다. */
  static Map<String, String> http(int code, byte[] body, int length) {
    Map<String, String> map = status("http");
    map.put("code", Integer.toString(code));
    int size = body == null ? 0 : Math.max(0, Math.min(Math.min(length, body.length), BODY_LIMIT));
    map.put("body", size == 0 ? "" : new String(body, 0, size, StandardCharsets.UTF_8));
    return map;
  }
}
