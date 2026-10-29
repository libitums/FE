package com.libitum.host;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
    Path source =
        Paths.get("src/main/java/com/libitum/host/AirbridgeEventsModule.java");
    String text = new String(Files.readAllBytes(source), "UTF-8");
    assertTrue(text.matches("(?s).*@LynxMethod public void setUserID\\(String userId\\).*"));
    assertTrue(text.matches("(?s).*@LynxMethod public void clearUser\\(\\).*"));
  }
}
