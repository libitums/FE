package com.libitum.host;

import android.content.Context;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.JavaOnlyMap;
import com.lynx.react.bridge.ReadableMap;
import com.lynx.react.bridge.ReadableMapKeySetIterator;
import com.lynx.react.bridge.ReadableType;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import okhttp3.Call;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

/**
 * 내 스토리 사진(ADR-0199): {@code pick(source, cb)} 고르기 · 찍기 · 줄이기, {@code upload(path, url, headers, cb)}
 * 비공개 버킷에 POST, {@code discard(path)} 지우기. 콜백 값은 모두 문자열이다(ContentFileModule 관례). 고르기 상태는
 * MainActivity의 {@link StoryPhotoPicker}가 가진다.
 */
public final class StoryPhotoModule extends LynxModule {
  private static final MediaType JPEG = MediaType.get("image/jpeg");
  private static final OkHttpClient CLIENT =
      new OkHttpClient.Builder()
          .connectTimeout(15, TimeUnit.SECONDS)
          .callTimeout(60, TimeUnit.SECONDS)
          .readTimeout(60, TimeUnit.SECONDS)
          .writeTimeout(60, TimeUnit.SECONDS)
          .build();
  private final MainActivity activity;

  public StoryPhotoModule(Context context, Object param) {
    super(context, param);
    activity = param instanceof MainActivity ? (MainActivity) param : null;
  }

  @LynxMethod public void pick(String source, Callback callback) {
    if (activity == null) {
      reply(callback, StoryPhotoPaths.status(StoryPhotoPaths.source(source) == null ? "invalid" : "failed"));
      return;
    }
    activity.runOnUiThread(() -> {
      StoryPhotoPicker picker = activity.storyPhotos;
      if (picker == null) {
        reply(callback, StoryPhotoPaths.status("failed"));
        return;
      }
      picker.pick(source, payload -> reply(callback, payload));
    });
  }

  @LynxMethod public void upload(String path, String url, ReadableMap headers, Callback callback) {
    File file = activity == null ? null : StoryPhotoPaths.inside(StoryPhotoPicker.root(activity), path);
    if (file == null || !StoryPhotoPaths.isHttps(url)) {
      reply(callback, StoryPhotoPaths.status("invalid"));
      return;
    }
    if (!file.isFile()) {
      reply(callback, StoryPhotoPaths.status("missing"));
      return;
    }
    Request request;
    try {
      Request.Builder builder = new Request.Builder().url(url).post(RequestBody.create(file, JPEG));
      if (headers != null) {
        ReadableMapKeySetIterator keys = headers.keySetIterator();
        while (keys.hasNextKey()) {
          String name = keys.nextKey();
          if (StoryPhotoPaths.forwardsHeader(name) && headers.getType(name) == ReadableType.String) {
            builder.header(name, headers.getString(name));
          }
        }
      }
      builder.header("Content-Type", "image/jpeg");
      request = builder.build();
    } catch (RuntimeException invalid) {
      reply(callback, StoryPhotoPaths.status("invalid"));
      return;
    }
    CLIENT.newCall(request).enqueue(new okhttp3.Callback() {
      @Override public void onFailure(Call call, IOException error) {
        reply(callback, StoryPhotoPaths.status("network"));
      }

      @Override public void onResponse(Call call, Response response) {
        Map<String, String> payload;
        try (Response closing = response) {
          payload = StoryPhotoPaths.http(closing.code(), new byte[0], 0);
          ResponseBody body = closing.body();
          if (body != null) {
            byte[] buffer = new byte[StoryPhotoPaths.BODY_LIMIT];
            int length = readUpTo(body.byteStream(), buffer);
            payload = StoryPhotoPaths.http(closing.code(), buffer, length);
          }
        } catch (IOException | RuntimeException error) {
          // 상태 코드는 왔으니 본문을 못 읽어도 http로 돌려준다 — 머리도 못 받았으면 onFailure로 간다.
          payload = StoryPhotoPaths.http(response.code(), new byte[0], 0);
        }
        reply(callback, payload);
      }
    });
  }

  @LynxMethod public void discard(String path) {
    if (activity == null) return;
    try {
      File file = StoryPhotoPaths.inside(StoryPhotoPicker.root(activity), path);
      if (file != null && file.isFile()) file.delete();
    } catch (RuntimeException ignored) {
      // 조용히 무시한다(계약).
    }
  }

  private static int readUpTo(InputStream in, byte[] buffer) throws IOException {
    int total = 0;
    while (total < buffer.length) {
      int read = in.read(buffer, total, buffer.length - total);
      if (read < 0) break;
      total += read;
    }
    return total;
  }

  private static void reply(Callback callback, Map<String, String> payload) {
    if (callback == null) return;
    JavaOnlyMap map = new JavaOnlyMap();
    for (Map.Entry<String, String> entry : payload.entrySet()) map.putString(entry.getKey(), entry.getValue());
    callback.invoke(map);
  }
}
