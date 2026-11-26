package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.List;
import org.junit.Test;

// 앱이 앞에 있을 때 받은 푸시(ADR-0200 개정) — 인물 방 목적지(선톡 · 스토리 반응)만 JS로 넘기고 알림을 만들지 않는다.
// 친구 스토리 · 캠페인 · 목적지 없음은 지금처럼 알림. 앞(Activity resumed)에 리스너가 없으면 넘기지 않고 알림.
public final class ForegroundPushTest {
  @Test public void fp1_companionChatTargetCarriesCharacter() {
    assertEquals("mina", ForegroundPush.chatCharacterId(
        "{\"kind\":\"companion-chat\",\"characterId\":\"mina\",\"variant\":\"a\"}"));
    assertEquals("mina", ForegroundPush.chatCharacterId(
        "{\"kind\":\"companion-chat\",\"characterId\":\"mina\",\"story\":false}"));
  }

  @Test public void fp2_storyCampaignAndBrokenTargetsStayBanners() {
    assertNull(ForegroundPush.chatCharacterId(
        "{\"kind\":\"companion-chat\",\"characterId\":\"mina\",\"story\":true}"));
    assertNull(ForegroundPush.chatCharacterId("{\"kind\":\"journey-map\",\"campaignId\":\"c1\"}"));
    assertNull(ForegroundPush.chatCharacterId("{\"kind\":\"companion-chat\"}"));
    assertNull(ForegroundPush.chatCharacterId("{\"kind\":\"companion-chat\",\"characterId\":\"\"}"));
    assertNull(ForegroundPush.chatCharacterId("{\"kind\":\"companion-chat\",\"characterId\":7}"));
    StringBuilder longId = new StringBuilder();
    for (int i = 0; i < 65; i++) longId.append('a');
    assertNull(ForegroundPush.chatCharacterId(
        "{\"kind\":\"companion-chat\",\"characterId\":\"" + longId + "\"}"));
    assertNull(ForegroundPush.chatCharacterId(null));
    assertNull(ForegroundPush.chatCharacterId("not json"));
  }

  @Test public void fp3_relayDeliversOnlyWhileAListenerIsAttached() {
    ForegroundPush.Relay relay = new ForegroundPush.Relay();
    assertFalse(relay.deliver("mina"));
    List<String> got = new ArrayList<>();
    ForegroundPush.Listener listener = got::add;
    relay.attach(listener);
    assertTrue(relay.deliver("mina"));
    assertEquals(1, got.size());
    assertEquals("mina", got.get(0));
    relay.detach(listener);
    assertFalse(relay.deliver("mina"));
  }

  @Test public void fp4_staleDetachKeepsTheReplacementAndThrowingListenerIsSwallowed() {
    ForegroundPush.Relay relay = new ForegroundPush.Relay();
    ForegroundPush.Listener old = id -> { };
    ForegroundPush.Listener replacement = id -> {
      throw new IllegalStateException("boom");
    };
    relay.attach(old);
    relay.attach(replacement);
    relay.detach(old);
    assertTrue(relay.deliver("mina"));
  }
}
