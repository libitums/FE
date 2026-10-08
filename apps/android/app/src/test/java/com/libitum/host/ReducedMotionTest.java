package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.Map;
import org.junit.Test;

/** `ReducedMotion`의 순수 판정 · 페이로드를 잰다(AR1~AR4). 설정 관찰 · 알림은 e2e의 몫이다. */
public final class ReducedMotionTest {
  // AR1: 두 배율 중 하나라도 0이면 true.
  @Test public void ar1AnyZeroScaleMeansReducedMotion() {
    assertTrue(ReducedMotion.fromScales(0f, 1f));
    assertTrue(ReducedMotion.fromScales(1f, 0f));
    assertTrue(ReducedMotion.fromScales(0f, 0f));
  }

  // AR2: 0이 아니면 false(느리게 · 빠르게 한 것은 줄이기가 아니다).
  @Test public void ar2NonZeroScalesAreNotReducedMotion() {
    assertFalse(ReducedMotion.fromScales(1f, 1f));
    assertFalse(ReducedMotion.fromScales(0.5f, 1.5f));
  }

  // AR3: 한 키짜리 맵, 값은 Boolean(Integer 아님).
  @Test public void ar3GlobalPropsCarryABooleanUnderASingleKey() {
    assertEquals("reducedMotion", ReducedMotion.GLOBAL_PROPS_KEY);

    Map<String, Object> on = ReducedMotion.globalProps(true);
    assertEquals(1, on.size());
    assertEquals(Boolean.TRUE, on.get("reducedMotion"));

    Map<String, Object> off = ReducedMotion.globalProps(false);
    assertEquals(1, off.size());
    assertEquals(Boolean.FALSE, off.get("reducedMotion"));
  }

  // AR4: 음수 · NaN은 0이 아니므로 false.
  @Test public void ar4NegativeAndNaNScalesAreNotReducedMotion() {
    assertFalse(ReducedMotion.fromScales(-1f, 1f));
    assertFalse(ReducedMotion.fromScales(Float.NaN, 1f));
  }
}
