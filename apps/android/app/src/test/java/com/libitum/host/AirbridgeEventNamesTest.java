package com.libitum.host;

import static org.junit.Assert.assertEquals;

import co.ab180.airbridge.common.AirbridgeAttribute;
import co.ab180.airbridge.common.AirbridgeCategory;
import org.junit.Test;

/** N-A3: JS 계약의 와이어 값 넷이 SDK 상수와 같다. 다르면 계약을 정정한다(docs/adr/0063-airbridge-events.md). */
public final class AirbridgeEventNamesTest {
  @Test public void n_a3_wireNamesMatchSdkConstants() {
    assertEquals("airbridge.user.signup", AirbridgeCategory.SIGN_UP);
    assertEquals("airbridge.achieveLevel", AirbridgeCategory.ACHIEVE_LEVEL);
    assertEquals("level", AirbridgeAttribute.LEVEL);
    assertEquals("label", AirbridgeAttribute.LABEL);
  }
}
