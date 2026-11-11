package com.libitum.host;

import android.content.Context;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.JavaOnlyArray;
import com.lynx.react.bridge.ReadableMap;
import com.lynx.react.bridge.ReadableMapKeySetIterator;
import com.lynx.react.bridge.ReadableType;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;

/**
 * 자유 대화 답을 SSE 블록 단위로 받는 호스트 모듈이다. 결과는 콜백이 아니라 전역 이벤트 셋({@code chatStreamOpen} ·
 * {@code chatStreamEvent} · {@code chatStreamEnd})으로만 오고, 출구는 {@link MainActivity}가 잇는다.
 */
public final class ChatStreamModule extends LynxModule {
  /** 모듈이 JS로 올리는 전역 이벤트의 출구. MainActivity가 메인 스레드에서 sendGlobalEvent로 잇는다. */
  public interface Sink {
    void send(String name, JavaOnlyArray args);
  }

  private static volatile Sink sink;

  public static void setSink(Sink next) {
    sink = next;
  }

  private static final MediaType JSON = MediaType.get("application/json; charset=utf-8");
  private static final OkHttpClient CLIENT =
      new OkHttpClient.Builder()
          .connectTimeout(ChatStreamLimits.CONNECT_TIMEOUT_MS, TimeUnit.MILLISECONDS)
          .readTimeout(ChatStreamLimits.IDLE_TIMEOUT_MS, TimeUnit.MILLISECONDS)
          .writeTimeout(ChatStreamLimits.CONNECT_TIMEOUT_MS, TimeUnit.MILLISECONDS)
          .build();
  private static final Map<String, Stream> STREAMS = new ConcurrentHashMap<>();
  /** 머리 대기 10초를 잰다. OkHttp connectTimeout은 TCP · TLS까지만 재고, 머리 대기는 readTimeout(30초)이 정한다. */
  private static final ScheduledThreadPoolExecutor TIMERS = new ScheduledThreadPoolExecutor(1);

  static {
    // 머리가 오거나 끝나 취소한 타이머는 10초를 기다리지 않고 큐에서 바로 빠진다.
    TIMERS.setRemoveOnCancelPolicy(true);
  }

  /**
   * 스트림 하나. 「끝났는가 확인 → 보내기」는 이 객체를 잠근 채 한 번에 한다 — 취소(JS 스레드)와 읽기(OkHttp 스레드)가
   * 겹쳐도 end 뒤에 open · event가 나가지 않는다(보내기는 mainHandler에 순서대로 쌓인다).
   */
  private static final class Stream {
    final String id;
    final Call call;
    final AtomicBoolean ended = new AtomicBoolean(false);
    final AtomicBoolean opened = new AtomicBoolean(false);
    /** 머리 대기 타이머. 머리가 오거나 스트림이 끝나면 취소한다(이 객체를 잠근 채). */
    ScheduledFuture<?> connectTimer;

    Stream(String id, Call call) {
      this.id = id;
      this.call = call;
    }
  }

  public ChatStreamModule(Context context) {
    super(context);
  }

  public ChatStreamModule(Context context, Object param) {
    super(context, param);
  }

  @LynxMethod public void open(String streamId, String url, ReadableMap headers, String body) {
    // id가 없으면 결과를 돌려줄 곳이 없다 — JS 어댑터는 늘 id를 만들어 넘긴다.
    if (streamId == null || streamId.isEmpty()) return;
    Request request;
    try {
      Request.Builder builder =
          new Request.Builder().url(url).post(RequestBody.create(body == null ? "" : body, JSON));
      if (headers != null) {
        ReadableMapKeySetIterator keys = headers.keySetIterator();
        while (keys.hasNextKey()) {
          String name = keys.nextKey();
          if (headers.getType(name) == ReadableType.String) builder.header(name, headers.getString(name));
        }
      }
      // 두 플랫폼이 같은 요청을 보내도록 본문 형식과 받을 형식은 JS 값 위에 고정한다(iOS와 같다).
      builder.header("Content-Type", "application/json; charset=utf-8");
      builder.header("Accept", "text/event-stream");
      request = builder.build();
    } catch (RuntimeException invalid) {
      end(streamId, "network", "invalid-request");
      return;
    }
    if (STREAMS.containsKey(streamId)) {
      end(streamId, "network", "invalid-request");
      return;
    }
    Stream stream = new Stream(streamId, CLIENT.newCall(request));
    STREAMS.put(streamId, stream);
    ScheduledFuture<?> timer = TIMERS.schedule(
        () -> {
          if (stream.opened.get()) return;
          finish(stream, "timeout-connect", null);
          stream.call.cancel();
        },
        ChatStreamLimits.CONNECT_TIMEOUT_MS,
        TimeUnit.MILLISECONDS);
    synchronized (stream) {
      if (stream.ended.get()) timer.cancel(false);
      else stream.connectTimer = timer;
    }
    stream.call.enqueue(
        new Callback() {
          @Override public void onFailure(Call call, IOException error) {
            // 머리가 오기 전의 실패. 연결 · 머리 대기 시간 초과는 timeout-connect다.
            finish(stream, error instanceof SocketTimeoutException ? "timeout-connect" : "network", null);
          }

          @Override public void onResponse(Call call, Response response) {
            read(stream, response);
          }
        });
  }

  @LynxMethod public void cancel(String streamId) {
    if (streamId == null) return;
    Stream stream = STREAMS.get(streamId);
    if (stream == null) return;
    finish(stream, "cancelled", null);
    stream.call.cancel();
  }

  private static void read(Stream stream, Response response) {
    int status = response.code();
    synchronized (stream) {
      stream.opened.set(true);
      cancelConnectTimer(stream);
      if (stream.ended.get()) {
        response.close();
        return;
      }
      send("chatStreamOpen", args(stream.id, status));
    }
    ResponseBody body = response.body();
    if (body == null) {
      finish(stream, response.isSuccessful() ? "complete" : "http-error", response.isSuccessful() ? null : "");
      response.close();
      return;
    }
    byte[] chunk = new byte[8192];
    try (InputStream in = body.byteStream()) {
      if (!response.isSuccessful()) {
        ByteArrayOutputStream errorBody = new ByteArrayOutputStream();
        int n;
        while ((n = in.read(chunk)) != -1) {
          SseEventSplitter.appendCapped(errorBody, chunk, n, ChatStreamLimits.ERROR_BODY_BYTES);
          if (errorBody.size() >= ChatStreamLimits.ERROR_BODY_BYTES) break;
        }
        finish(stream, "http-error", new String(errorBody.toByteArray(), StandardCharsets.UTF_8));
        return;
      }
      SseEventSplitter splitter = new SseEventSplitter();
      int seq = 0;
      int n;
      while ((n = in.read(chunk)) != -1) {
        if (stream.ended.get()) return;
        seq = emit(stream, splitter.push(chunk, n), seq);
      }
      emit(stream, splitter.finish(), seq);
      finish(stream, "complete", null);
    } catch (SocketTimeoutException idle) {
      finish(stream, "timeout-idle", null);
    } catch (IOException broken) {
      finish(stream, "network", null);
    } catch (RuntimeException unexpected) {
      // 예상 못 한 실패도 스트림을 남기지 않고 end 한 번으로 정리한다.
      finish(stream, "network", null);
    } finally {
      response.close();
    }
  }

  private static int emit(Stream stream, List<String> blocks, int seq) {
    for (String block : blocks) {
      JavaOnlyArray event = new JavaOnlyArray();
      event.pushString(stream.id);
      event.pushInt(seq);
      event.pushString(block);
      synchronized (stream) {
        if (stream.ended.get()) return seq;
        send("chatStreamEvent", event);
      }
      seq++;
    }
    return seq;
  }

  /** 스트림마다 정확히 한 번 chatStreamEnd를 보낸다. */
  private static void finish(Stream stream, String reason, String detail) {
    synchronized (stream) {
      if (!stream.ended.compareAndSet(false, true)) return;
      cancelConnectTimer(stream);
      STREAMS.remove(stream.id, stream);
      end(stream.id, reason, detail);
    }
  }

  /** 잠근 채 부른다. */
  private static void cancelConnectTimer(Stream stream) {
    if (stream.connectTimer == null) return;
    stream.connectTimer.cancel(false);
    stream.connectTimer = null;
  }

  private static void end(String streamId, String reason, String detail) {
    JavaOnlyArray event = new JavaOnlyArray();
    event.pushString(streamId);
    event.pushString(reason);
    if (detail == null) event.pushNull();
    else event.pushString(detail);
    send("chatStreamEnd", event);
  }

  private static JavaOnlyArray args(String streamId, int status) {
    JavaOnlyArray event = new JavaOnlyArray();
    event.pushString(streamId);
    event.pushInt(status);
    return event;
  }

  private static void send(String name, JavaOnlyArray args) {
    Sink current = sink;
    if (current != null) current.send(name, args);
  }
}
