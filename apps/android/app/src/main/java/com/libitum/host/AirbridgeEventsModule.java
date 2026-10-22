package com.libitum.host;

import android.content.Context;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.JavaOnlyMap;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.ReadableMap;

/** 광고 측정용 이벤트를 Airbridge SDK로 넘긴다. 카테고리는 JS가 정하고, 호스트는 문자열 속성만 통과시킨다. */
public final class AirbridgeEventsModule extends LynxModule {
  public AirbridgeEventsModule(Context context) {
    super(context);
  }

  @LynxMethod public void trackEvent(String category, ReadableMap semanticAttributes) {
    AirbridgeEvents.track(category, AirbridgeEventAttributes.strings(semanticAttributes));
  }

  /** ADR-0080: 받아 둔 딥링크를 한 번 꺼낸다. 없으면 url: null. 해석은 JS가 한다. */
  @LynxMethod public void takeOpenedDeeplink(Callback callback) {
    JavaOnlyMap payload = new JavaOnlyMap();
    String url = AirbridgeEvents.takeDeeplink();
    if (url == null) payload.putNull("url");
    else payload.putString("url", url);
    callback.invoke(payload);
  }
}
