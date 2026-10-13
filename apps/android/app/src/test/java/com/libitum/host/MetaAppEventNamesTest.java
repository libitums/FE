package com.libitum.host;

import static org.junit.Assert.assertEquals;

import com.facebook.appevents.AppEventsConstants;
import org.junit.Test;

/** N-A3: JS 계약의 와이어 이름 넷이 SDK 상수와 같다. 다르면 계약을 정정한다(spec §14 C7). */
public final class MetaAppEventNamesTest {
  @Test public void n_a3_wireNamesMatchSdkConstants() {
    assertEquals("fb_mobile_complete_registration",
        AppEventsConstants.EVENT_NAME_COMPLETED_REGISTRATION);
    assertEquals("fb_mobile_level_achieved", AppEventsConstants.EVENT_NAME_ACHIEVED_LEVEL);
    assertEquals("fb_level", AppEventsConstants.EVENT_PARAM_LEVEL);
    assertEquals("fb_content_type", AppEventsConstants.EVENT_PARAM_CONTENT_TYPE);
  }
}
