package com.libitum.host;

/**
 * Pure decisions for the status bar icon tone (no Android or Lynx dependencies).
 *
 * <p>Names follow the icon color, not the platform flag: {@code setAppearanceLightStatusBars(true)}
 * means a light bar, which draws dark icons.
 */
final class StatusBarIcons {
  /** Dataset key; pairs with the JS attribute {@code data-statusbar}. */
  static final String DATASET_KEY = "statusbar";
  /** Marker value that asks for light icons; the same string as JS {@code lightStatusBarIcons}. */
  static final String LIGHT_ICONS = "light-icons";

  /** The color of the icons themselves. */
  enum Tone { DARK, LIGHT }

  private StatusBarIcons() {}

  /**
   * Marker values to tone: LIGHT when any value equals {@link #LIGHT_ICONS}, otherwise DARK
   * (empty, null list, null elements and unknown values included). Never throws.
   */
  static Tone toneFor(Iterable<String> markerValues) {
    if (markerValues == null) return Tone.DARK;
    for (String value : markerValues) {
      if (LIGHT_ICONS.equals(value)) return Tone.LIGHT;
    }
    return Tone.DARK;
  }

  /** The argument for {@code setAppearanceLightStatusBars}: dark icons are true, light icons false. */
  static boolean lightStatusBarsFlag(Tone tone) {
    return tone == Tone.DARK;
  }

  /** Whether the window must be touched: nothing applied yet, or the tone changed. */
  static boolean needsApply(Tone applied, Tone next) {
    return applied != next;
  }
}
