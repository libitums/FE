package com.libitum.host;

import android.content.Context;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.JavaOnlyMap;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 에피소드 본문 · 자산을 앱 전용 폴더(filesDir/content-files)에 받아 두는 모듈입니다. 받기는 백그라운드
 * 실행기에서 하고 콜백은 정확히 한 번 부릅니다. 규칙 · 이동 · 삭제는 {@link ContentFileStore}가 가집니다.
 */
public final class ContentFileModule extends LynxModule {
  static final String ROOT_NAME = "content-files";
  private static final int TIMEOUT_MS = 60_000;
  private static final ExecutorService WORKER = Executors.newSingleThreadExecutor();
  private final ContentFileStore store;

  public ContentFileModule(Context context) {
    super(context);
    store = new ContentFileStore(new File(context.getFilesDir(), ROOT_NAME),
        ContentFileModule::openHttps);
  }

  @LynxMethod public void download(String url, String path, Callback callback) {
    WORKER.execute(() -> {
      ContentFileStore.Result result;
      try {
        result = store.download(url, path);
      } catch (RuntimeException | OutOfMemoryError error) {
        result = new ContentFileStore.Result("io", null);
      }
      callback.invoke(payload(result));
    });
  }

  @LynxMethod public String fileUrl(String path) {
    try {
      return store.fileUrl(path);
    } catch (RuntimeException error) {
      return "";
    }
  }

  @LynxMethod public void remove(String prefix, Callback callback) {
    WORKER.execute(() -> {
      ContentFileStore.Result result;
      try {
        result = store.remove(prefix);
      } catch (RuntimeException error) {
        result = new ContentFileStore.Result("io", null);
      }
      callback.invoke(payload(result));
    });
  }

  // 값은 모두 문자열이다(계약).
  private static JavaOnlyMap payload(ContentFileStore.Result result) {
    JavaOnlyMap map = new JavaOnlyMap();
    map.putString("status", result.status);
    if (result.detail != null) {
      map.putString(result.status.equals("http") ? "code" : "bytes", result.detail);
    }
    return map;
  }

  private static ContentFileStore.Response openHttps(String url) throws IOException {
    HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
    connection.setConnectTimeout(TIMEOUT_MS);
    connection.setReadTimeout(TIMEOUT_MS);
    connection.setInstanceFollowRedirects(true);
    int code;
    try {
      code = connection.getResponseCode();
    } catch (IOException error) {
      connection.disconnect();
      throw error;
    }
    return new ContentFileStore.Response() {
      @Override public int code() { return code; }

      @Override public InputStream body() throws IOException { return connection.getInputStream(); }

      @Override public void close() { connection.disconnect(); }
    };
  }
}
