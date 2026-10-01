package com.libitum.host;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.JavaOnlyArray;
import com.lynx.react.bridge.JavaOnlyMap;
import com.lynx.react.bridge.ReadableArray;
import com.lynx.react.bridge.ReadableMap;
import com.lynx.tasm.behavior.LynxContext;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import okio.ByteString;

/** The @lynx-js/websocket bridge needed by Rspeedy's development bundle. */
public final class DevWebSocketModule extends LynxModule {
  private final Handler mainHandler = new Handler(Looper.getMainLooper());
  private final OkHttpClient client = new OkHttpClient.Builder()
      .pingInterval(30, TimeUnit.SECONDS).build();
  private final ConcurrentHashMap<Integer, WebSocket> sockets = new ConcurrentHashMap<>();
  private volatile boolean destroyed;

  public DevWebSocketModule(Context context) {
    super(context);
  }

  @LynxMethod public void connect(String url, ReadableArray protocols, ReadableMap options, int id) {
    try {
      Request.Builder request = new Request.Builder().url(url);
      if (protocols != null && protocols.size() > 0) {
        StringBuilder values = new StringBuilder();
        for (int index = 0; index < protocols.size(); index++) {
          if (index > 0) values.append(", ");
          values.append(protocols.getString(index));
        }
        request.header("Sec-WebSocket-Protocol", values.toString());
      }
      if (options != null && options.hasKey("headers") && !options.isNull("headers")) {
        ReadableMap headers = options.getMap("headers");
        for (String name : headers.toHashMap().keySet()) {
          request.header(name, headers.getString(name));
        }
      }
      WebSocket socket = client.newWebSocket(request.build(), new WebSocketListener() {
        @Override public void onOpen(WebSocket webSocket, Response response) {
          JavaOnlyMap event = payload(id);
          event.putString("protocol", response.header("Sec-WebSocket-Protocol", ""));
          emit("websocketOpen", event);
        }

        @Override public void onMessage(WebSocket webSocket, String message) {
          JavaOnlyMap event = payload(id);
          event.putString("type", "text");
          event.putString("data", message);
          emit("websocketMessage", event);
        }

        @Override public void onMessage(WebSocket webSocket, ByteString bytes) {
          // The current @lynx-js/websocket client handles text frames only.
        }

        @Override public void onClosed(WebSocket webSocket, int code, String reason) {
          sockets.remove(id, webSocket);
          JavaOnlyMap event = payload(id);
          event.putInt("code", code);
          event.putString("reason", reason);
          event.putBoolean("wasClean", true);
          emit("websocketClosed", event);
        }

        @Override public void onFailure(WebSocket webSocket, Throwable error, Response response) {
          sockets.remove(id, webSocket);
          JavaOnlyMap event = payload(id);
          event.putString("message", error.getMessage() == null ? error.toString() : error.getMessage());
          emit("websocketFailed", event);
        }
      });
      WebSocket old = sockets.put(id, socket);
      if (old != null) old.cancel();
    } catch (RuntimeException error) {
      JavaOnlyMap event = payload(id);
      event.putString("message", error.getMessage() == null ? error.toString() : error.getMessage());
      emit("websocketFailed", event);
    }
  }

  @LynxMethod public void send(String message, int id) {
    WebSocket socket = sockets.get(id);
    if (socket != null) socket.send(message);
  }

  @LynxMethod public void ping(int id) {
    // OkHttp sends protocol ping frames at the interval configured above.
  }

  @LynxMethod public void close(int code, String reason, int id) {
    WebSocket socket = sockets.get(id);
    if (socket != null) socket.close(code, reason);
  }

  @Override public void destroy() {
    destroyed = true;
    for (WebSocket socket : sockets.values()) socket.cancel();
    sockets.clear();
    client.dispatcher().executorService().shutdown();
    client.connectionPool().evictAll();
    super.destroy();
  }

  private static JavaOnlyMap payload(int id) {
    JavaOnlyMap event = new JavaOnlyMap();
    event.putInt("id", id);
    return event;
  }

  private void emit(String name, JavaOnlyMap event) {
    mainHandler.post(() -> {
      if (!destroyed && mContext instanceof LynxContext) {
        ((LynxContext) mContext).sendGlobalEvent(name, JavaOnlyArray.of(event));
      }
    });
  }
}
