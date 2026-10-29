package com.libitum.host;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import com.lynx.jsbridge.LynxMethod;
import java.lang.reflect.Method;
import org.junit.Test;

/**
 * N-A9: ADR-0090 사용자 식별. 모듈이 `setUserID` · `clearUser`를 `@LynxMethod`로 열고, SDK가 시작되지 않은 빌드에서
 * 두 호출은 아무것도 하지 않는다(실제 SDK 사용자 정보는 보지 않는다).
 */
public final class AirbridgeUserIdentityTest {
  @Test public void n_a9_userIdentityIsNoOpWhenNotStarted() {
    assertFalse(AirbridgeEvents.started());
    AirbridgeEvents.setUserId("user-1");
    AirbridgeEvents.setUserId("");
    AirbridgeEvents.setUserId(null);
    AirbridgeEvents.clearUser();
    assertFalse(AirbridgeEvents.started());
  }

  @Test public void n_a9_moduleExposesBothMethods() throws Exception {
    Method setUserID = AirbridgeEventsModule.class.getMethod("setUserID", String.class);
    assertTrue(setUserID.isAnnotationPresent(LynxMethod.class));
    Method clearUser = AirbridgeEventsModule.class.getMethod("clearUser");
    assertTrue(clearUser.isAnnotationPresent(LynxMethod.class));
  }

}
