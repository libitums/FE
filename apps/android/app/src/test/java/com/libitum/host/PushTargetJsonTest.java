package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import com.lynx.react.bridge.JavaOnlyMap;
import org.junit.Test;

// 누른 알림 목적지를 JS로 넘기는 사전입니다(ADR-0034 · ADR-0127). 검증은 JS(`push-target.ts`)가 하고, 여기서는 아는 칸의
// 문자열만 옮긴다.
public class PushTargetJsonTest {
  @Test public void carriesCompanionCharacterAndVariant() {
    JavaOnlyMap target = PushNotificationController.targetFromJson(
        "{\"kind\":\"companion-chat\",\"characterId\":\"mina\",\"variant\":\"b\"}");
    assertEquals("companion-chat", target.getString("kind"));
    assertEquals("mina", target.getString("characterId"));
    assertEquals("b", target.getString("variant"));
  }

  @Test public void keepsUnitTargetsAndDropsUnknownOrNonStringFields() {
    JavaOnlyMap target = PushNotificationController.targetFromJson(
        "{\"kind\":\"messenger\",\"unitId\":\"u1\",\"characterId\":7,\"url\":\"https://x\"}");
    assertEquals("u1", target.getString("unitId"));
    assertFalse(target.hasKey("characterId"));
    assertFalse(target.hasKey("url"));
  }

  // 보상 캠페인 알림의 캠페인 id(ADR-0175). 형식 검증은 JS가 한다.
  @Test public void carriesRewardCampaignId() {
    JavaOnlyMap target = PushNotificationController.targetFromJson(
        "{\"kind\":\"journey-map\",\"campaignId\":\"202611211930-story-next-ab12\"}");
    assertEquals("journey-map", target.getString("kind"));
    assertEquals("202611211930-story-next-ab12", target.getString("campaignId"));
  }

  // 친구 스토리 알림(ADR-0177 D7) — `story`는 불리언 true일 때만 옮긴다(그 밖의 값은 버림).
  @Test public void carriesStoryFlagOnlyWhenTrue() {
    JavaOnlyMap story = PushNotificationController.targetFromJson(
        "{\"kind\":\"companion-chat\",\"characterId\":\"mina\",\"story\":true}");
    assertTrue(story.getBoolean("story"));
    JavaOnlyMap notStory = PushNotificationController.targetFromJson(
        "{\"kind\":\"companion-chat\",\"characterId\":\"mina\",\"story\":\"yes\"}");
    assertFalse(notStory.hasKey("story"));
  }

  @Test public void rejectsBadShapes() {
    assertNull(PushNotificationController.targetFromJson("{\"characterId\":\"mina\"}"));
    assertNull(PushNotificationController.targetFromJson("not json"));
    assertNull(PushNotificationController.targetFromJson(null));
  }
}
