package com.libitum.host;

import android.content.Context;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.ReadableMap;

/** 광고 측정용 이벤트를 Meta SDK로 넘긴다. 이름은 JS가 정하고, 호스트는 문자열 파라미터만 통과시킨다. */
public final class MetaAppEventsModule extends LynxModule {
  public MetaAppEventsModule(Context context) {
    super(context);
  }

  @LynxMethod public void logEvent(String name, ReadableMap parameters) {
    MetaAppEvents.log(name, MetaAppEventParameters.strings(parameters));
  }
}
