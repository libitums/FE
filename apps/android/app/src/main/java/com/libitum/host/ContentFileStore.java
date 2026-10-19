package com.libitum.host;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * 앱 전용 폴더(루트)에 콘텐츠 파일을 받아 두는 저장소입니다. 루트와 HTTP 호출을 주입받아 네트워크 없이
 * JVM에서 시험합니다. 경로 규칙은 iOS 호스트와 같습니다(길이 1~256, 조각마다 [A-Za-z0-9._-]+, `.` · `..` 금지).
 */
final class ContentFileStore {
  /** 받기 한 번의 결과입니다. {@code detail}은 saved의 바이트 수 · http의 상태 코드입니다. */
  static final class Result {
    final String status;
    final String detail;

    Result(String status, String detail) {
      this.status = status;
      this.detail = detail;
    }
  }

  /** 열린 HTTP 응답입니다. */
  interface Response extends AutoCloseable {
    int code();

    InputStream body() throws IOException;

    @Override void close();
  }

  /** 연결 실패는 {@link IOException}으로 던집니다(network로 답합니다). */
  interface Fetcher {
    Response open(String url) throws IOException;
  }

  private static final Pattern PIECE = Pattern.compile("[A-Za-z0-9._-]+");
  private static final String TMP = ".tmp";
  private final File root;
  private final Fetcher fetcher;

  ContentFileStore(File root, Fetcher fetcher) {
    this.root = root;
    this.fetcher = fetcher;
  }

  static boolean validPath(String path) {
    if (path == null || path.isEmpty() || path.length() > 256) return false;
    for (String piece : path.split("/", -1)) {
      if (piece.equals(".") || piece.equals("..") || !PIECE.matcher(piece).matches()) return false;
    }
    return true;
  }

  static boolean validUrl(String url) {
    if (url == null || url.isEmpty()) return false;
    try {
      URI uri = new URI(url);
      String host = uri.getHost();
      return "https".equalsIgnoreCase(uri.getScheme()) && host != null && !host.isEmpty();
    } catch (URISyntaxException error) {
      return false;
    }
  }

  Result download(String url, String path) {
    // 임시 폴더 안쪽을 가리키는 경로는 받는 도중의 파일과 부딪히니 막는다.
    if (!validUrl(url) || !validPath(path) || path.equals(TMP) || path.startsWith(TMP + "/")) {
      return new Result("invalid", null);
    }
    File tmpDir = new File(root, TMP);
    File tmp = new File(tmpDir, UUID.randomUUID().toString());
    Response response = open(url);
    if (response == null) return new Result("network", null);
    try {
      if (response.code() != 200) return new Result("http", String.valueOf(response.code()));
      if (!mkdirs(tmpDir)) return new Result("io", null);
      long bytes = copy(response, tmp);
      if (bytes < 0) return new Result("network", null);
      File target = new File(root, path);
      File parent = target.getParentFile();
      if (parent != null && !mkdirs(parent)) return new Result("io", null);
      move(tmp, target);
      return new Result("saved", String.valueOf(bytes));
    } catch (IOException | RuntimeException error) {
      return new Result("io", null);
    } finally {
      response.close();
      // 성공하면 이미 옮겨져 없다. 실패 · 중단이면 임시 파일을 남기지 않는다.
      //noinspection ResultOfMethodCallIgnored
      tmp.delete();
    }
  }

  private Response open(String url) {
    try {
      return fetcher.open(url);
    } catch (IOException | RuntimeException error) {
      return null;
    }
  }

  private static boolean mkdirs(File dir) {
    return dir.isDirectory() || dir.mkdirs() || dir.isDirectory();
  }

  /** 본문을 임시 파일에 씁니다. 읽기(연결) 실패는 -1, 쓰기 실패는 IOException입니다. */
  private static long copy(Response response, File tmp) throws IOException {
    InputStream in;
    try {
      in = response.body();
    } catch (IOException error) {
      return -1;
    }
    long total = 0;
    byte[] buffer = new byte[16 * 1024];
    try (InputStream source = in; OutputStream out = Files.newOutputStream(tmp.toPath())) {
      while (true) {
        int read;
        try {
          read = source.read(buffer);
        } catch (IOException error) {
          return -1;
        }
        if (read < 0) return total;
        out.write(buffer, 0, read);
        total += read;
      }
    }
  }

  private static void move(File from, File to) throws IOException {
    try {
      Files.move(from.toPath(), to.toPath(), StandardCopyOption.ATOMIC_MOVE,
          StandardCopyOption.REPLACE_EXISTING);
    } catch (AtomicMoveNotSupportedException error) {
      if (to.exists() && !to.delete()) throw error;
      if (!from.renameTo(to)) throw error;
    }
  }

  /** 있으면 {@code file://} 절대 URL, 없거나 규칙 위반이면 빈 문자열입니다. */
  String fileUrl(String path) {
    if (!validPath(path)) return "";
    File file = new File(root, path);
    return file.isFile() ? "file://" + file.getAbsolutePath() : "";
  }

  /** 루트/prefix(파일 또는 폴더)를 지웁니다. 없었어도 removed입니다. */
  Result remove(String prefix) {
    if (!validPath(prefix)) return new Result("invalid", null);
    return deleteTree(new File(root, prefix)) ? new Result("removed", null) : new Result("io", null);
  }

  private static boolean deleteTree(File file) {
    if (!file.exists()) return true;
    File[] children = file.isDirectory() ? file.listFiles() : null;
    boolean ok = true;
    if (children != null) {
      for (File child : children) ok &= deleteTree(child);
    }
    return file.delete() && ok;
  }
}
