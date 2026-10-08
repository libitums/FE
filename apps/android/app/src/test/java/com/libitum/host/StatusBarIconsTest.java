package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.Test;

public final class StatusBarIconsTest {
  private static final StatusBarIcons.Tone DARK = StatusBarIcons.Tone.DARK;
  private static final StatusBarIcons.Tone LIGHT = StatusBarIcons.Tone.LIGHT;

  @Test public void sb1_emptyListIsDark() {
    assertEquals(DARK, StatusBarIcons.toneFor(Collections.<String>emptyList()));
  }

  @Test public void sb2_lightIconsMarkerIsLight() {
    assertEquals(LIGHT, StatusBarIcons.toneFor(Arrays.asList("light-icons")));
  }

  @Test public void sb3_oneLightMarkerAmongNullAndUnknownValuesIsLight() {
    List<String> values = new ArrayList<>();
    values.add(null);
    values.add("other");
    values.add("light-icons");
    assertEquals(LIGHT, StatusBarIcons.toneFor(values));
  }

  @Test public void sb4_onlyTheExactValueCountsEverythingElseIsDark() {
    assertEquals(DARK,
        StatusBarIcons.toneFor(Arrays.asList("dark-icons", "LIGHT-ICONS", " light-icons", "")));
  }

  @Test public void sb5_nullListIsDarkAndDoesNotThrow() {
    assertEquals(DARK, StatusBarIcons.toneFor((Iterable<String>) null));
  }

  @Test public void sb6_flagIsInvertedFromTheIconColor() {
    // The LIGHT case fails against the scaffold; the DARK case passes there.
    assertFalse(StatusBarIcons.lightStatusBarsFlag(LIGHT));
    assertTrue(StatusBarIcons.lightStatusBarsFlag(DARK));
  }

  @Test public void sb7_needsApplyOnlyWhenTheToneChangesOrNothingWasApplied() {
    // The true cases fail against the scaffold; the false cases pass there.
    assertTrue(StatusBarIcons.needsApply(null, DARK));
    assertTrue(StatusBarIcons.needsApply(DARK, LIGHT));
    assertTrue(StatusBarIcons.needsApply(LIGHT, DARK));
    assertFalse(StatusBarIcons.needsApply(DARK, DARK));
    assertFalse(StatusBarIcons.needsApply(LIGHT, LIGHT));
  }

  @Test public void sb8_constantsMatchTheContract() {
    assertEquals("statusbar", StatusBarIcons.DATASET_KEY);
    assertEquals("light-icons", StatusBarIcons.LIGHT_ICONS);
  }

  @Test public void sb9_twoMarkersAreStillLightAndDoNotRetrigger() {
    assertEquals(LIGHT, StatusBarIcons.toneFor(Arrays.asList("light-icons", "light-icons")));
    assertFalse(StatusBarIcons.needsApply(LIGHT, LIGHT));
  }
}
