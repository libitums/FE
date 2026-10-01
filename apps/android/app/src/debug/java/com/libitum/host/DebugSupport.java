package com.libitum.host;

import com.lynx.tasm.LynxViewBuilder;

final class DebugSupport {
  static void configure(LynxViewBuilder builder) {
    builder.registerModule("LynxWebSocketModule", DevWebSocketModule.class);
    builder.setGenericResourceFetcher(new DevResourceFetcher());
  }
}
