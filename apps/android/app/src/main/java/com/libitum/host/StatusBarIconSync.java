package com.libitum.host;

import android.view.Window;
import androidx.core.view.WindowCompat;
import com.lynx.react.bridge.ReadableMap;
import com.lynx.react.bridge.ReadableType;
import com.lynx.tasm.LynxView;
import com.lynx.tasm.behavior.ui.LynxBaseUI;
import java.util.ArrayList;
import java.util.List;

/** Reads the status bar icon markers from the Lynx tree and applies the tone to the window. */
final class StatusBarIconSync {
  private final Window window;
  // Reused by every sync so the walk, which runs inside a main thread callback, allocates nothing.
  private final List<String> markers = new ArrayList<>();
  // The launch default: layoutEdgeToEdge already asked for dark icons.
  private StatusBarIcons.Tone applied = StatusBarIcons.Tone.DARK;
  private int applyCount;

  StatusBarIconSync(Window window) {
    this.window = window;
  }

  /** Main thread only. Reads the markers and touches the window only when the tone changed. */
  void sync(LynxView lynxView) {
    if (lynxView == null) return;
    markers.clear();
    try {
      LynxBaseUI root = lynxView.getLynxUIRoot();
      if (root == null) return;
      collect(root);
    } catch (RuntimeException e) {
      // A tree that is mid-teardown must not stop the page update; keep the tone that is showing.
      return;
    }
    StatusBarIcons.Tone next = StatusBarIcons.toneFor(markers);
    markers.clear();
    if (!StatusBarIcons.needsApply(applied, next)) return;
    WindowCompat.getInsetsController(window, window.getDecorView())
        .setAppearanceLightStatusBars(StatusBarIcons.lightStatusBarsFlag(next));
    applied = next;
    applyCount += 1;
  }

  /** Number of times the tone was applied to the window. */
  int applyCount() {
    return applyCount;
  }

  // Depth first; stops at the first light marker because one is enough to decide the tone.
  private boolean collect(LynxBaseUI ui) {
    ReadableMap dataset = ui.getDataset();
    // A marker whose value is not a string is not a marker.
    if (dataset != null && dataset.hasKey(StatusBarIcons.DATASET_KEY)
        && dataset.getType(StatusBarIcons.DATASET_KEY) == ReadableType.String) {
      String value = dataset.getString(StatusBarIcons.DATASET_KEY);
      markers.add(value);
      if (StatusBarIcons.LIGHT_ICONS.equals(value)) return true;
    }
    List<LynxBaseUI> children = ui.getChildren();
    if (children == null) return false;
    for (int index = 0, size = children.size(); index < size; index += 1) {
      if (collect(children.get(index))) return true;
    }
    return false;
  }
}
