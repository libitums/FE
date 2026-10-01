package com.libitum.host;

import com.lynx.tasm.resourceprovider.LynxResourceCallback;
import com.lynx.tasm.resourceprovider.LynxResourceRequest;
import com.lynx.tasm.resourceprovider.LynxResourceResponse;
import com.lynx.tasm.resourceprovider.generic.LynxGenericResourceFetcher;
import java.io.IOException;
import okhttp3.Call;
import okhttp3.Callback;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

/** Loads Rspeedy's external hot-update scripts in Debug builds. */
final class DevResourceFetcher extends LynxGenericResourceFetcher {
  private final OkHttpClient client = new OkHttpClient();

  @Override public void fetchResource(
      LynxResourceRequest request, LynxResourceCallback<byte[]> callback) {
    String url = request.getUrl();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      callback.onResponse(LynxResourceResponse.onFailed(
          new IOException("Unsupported development resource URL: " + url)));
      return;
    }
    Request httpRequest = new Request.Builder().url(url).build();
    client.newCall(httpRequest).enqueue(new Callback() {
      @Override public void onFailure(Call call, IOException error) {
        callback.onResponse(LynxResourceResponse.onFailed(error));
      }

      @Override public void onResponse(Call call, Response response) throws IOException {
        try (Response closeable = response) {
          ResponseBody body = response.body();
          if (!response.isSuccessful() || body == null) {
            callback.onResponse(LynxResourceResponse.onFailed(
                new IOException("Development resource HTTP " + response.code() + ": " + url)));
            return;
          }
          callback.onResponse(LynxResourceResponse.onSuccess(body.bytes()));
        } catch (IOException error) {
          callback.onResponse(LynxResourceResponse.onFailed(error));
        }
      }
    });
  }

  @Override public void fetchResourcePath(
      LynxResourceRequest request, LynxResourceCallback<String> callback) {
    callback.onResponse(LynxResourceResponse.onFailed(
        new IOException("Development resources are loaded as bytes, not local paths")));
  }
}
