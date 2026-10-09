package com.libitum.host;

import android.content.Context;
import com.lynx.tasm.behavior.ImageInterceptor;
import javax.xml.transform.Transformer;

/** Rewrites bundle-relative image URLs on the caller's thread, before any image request exists. */
final class HostImageInterceptor implements ImageInterceptor {
  private final boolean bundled;
  private final String templateUrl;

  HostImageInterceptor(boolean bundled, String templateUrl) {
    this.bundled = bundled;
    this.templateUrl = templateUrl;
  }

  /** Returns {@code HostPaths.media(url, bundled, templateUrl)}. Never blocks, never posts. */
  @Override public String shouldRedirectImageUrl(String url) {
    return HostPaths.media(url, bundled, templateUrl);
  }

  /** Not used by Lynx 4.0.1. Reports "not handled" exactly like the no-interceptor branch. */
  @Override public void loadImage(Context context, String cacheKey, String src, float width,
      float height, Transformer transformer, CompletionHandler handler) {
    if (handler != null) handler.imageLoadCompletion(null, null);
  }
}
