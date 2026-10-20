package com.libitum.host;

import java.io.File;
import java.io.IOException;
import java.net.URI;
import java.net.URISyntaxException;

/** `ContentFileModule` 폴더 안의 `file://` 주소만 재생 파일로 받습니다. 그 밖의 file 주소는 거부합니다. */
final class AudioContentFile {
  private AudioContentFile() {}

  /** 정규 경로가 {@code root} 아래인 기존 파일이면 그 파일, 아니면 {@code null}. */
  static File forSource(String source, File root) {
    if (source == null || root == null || !source.regionMatches(true, 0, "file://", 0, 7)) {
      return null;
    }
    try {
      URI uri = new URI(source);
      String path = uri.getPath();
      if (!"file".equalsIgnoreCase(uri.getScheme()) || path == null || path.isEmpty()) return null;
      String rootPath = root.getCanonicalPath() + File.separator;
      File file = new File(path);
      String canonical = file.getCanonicalPath();
      return canonical.startsWith(rootPath) && file.isFile() ? new File(canonical) : null;
    } catch (URISyntaxException | IOException error) {
      return null;
    }
  }
}
