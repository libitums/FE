package com.libitum.host;

import com.lynx.tasm.resourceprovider.LynxResourceRequest;
import com.lynx.tasm.resourceprovider.media.LynxMediaResourceFetcher;
import com.lynx.tasm.resourceprovider.media.OptionalBool;

final class BundledMediaFetcher extends LynxMediaResourceFetcher {
  private final boolean bundled;
  private final String templateUrl;

  BundledMediaFetcher(boolean bundled, String templateUrl) {
    this.bundled = bundled;
    this.templateUrl = templateUrl;
  }

  @Override public OptionalBool isLocalResource(String url) {
    return url != null && url.startsWith("/static/")
        ? OptionalBool.TRUE : OptionalBool.FALSE;
  }

  @Override public String shouldRedirectUrl(LynxResourceRequest request) {
    return HostPaths.media(request.getUrl(), bundled, templateUrl);
  }
}
