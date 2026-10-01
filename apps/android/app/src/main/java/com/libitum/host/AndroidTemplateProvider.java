package com.libitum.host;

import android.content.Context;
import com.lynx.tasm.provider.AbsTemplateProvider;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

final class AndroidTemplateProvider extends AbsTemplateProvider {
  private final Context context;

  AndroidTemplateProvider(Context context) {
    this.context = context.getApplicationContext();
  }

  @Override public void loadTemplate(String uri, Callback callback) {
    new Thread(() -> {
      try {
        if (uri.startsWith("http://") || uri.startsWith("https://")) {
          HttpURLConnection connection = (HttpURLConnection) new URL(uri).openConnection();
          connection.setUseCaches(false);
          connection.setConnectTimeout(5000);
          connection.setReadTimeout(10000);
          try {
            int status = connection.getResponseCode();
            if (status < 200 || status >= 300) {
              callback.onFailed("Bundle HTTP " + status + ": " + uri);
              return;
            }
            try (InputStream stream = connection.getInputStream()) {
              callback.onSuccess(readFully(stream));
            }
          } finally {
            connection.disconnect();
          }
        } else if ("main.lynx.bundle".equals(uri)) {
          try (InputStream stream = context.getAssets().open(uri)) {
            callback.onSuccess(readFully(stream));
          }
        } else {
          callback.onFailed("Unsupported bundle URL: " + uri);
        }
      } catch (IOException error) {
        callback.onFailed(error.toString());
      }
    }, "lynx-template-loader").start();
  }

  private static byte[] readFully(InputStream stream) throws IOException {
    ByteArrayOutputStream output = new ByteArrayOutputStream();
    byte[] buffer = new byte[8192];
    int count;
    while ((count = stream.read(buffer)) != -1) {
      output.write(buffer, 0, count);
    }
    return output.toByteArray();
  }
}
