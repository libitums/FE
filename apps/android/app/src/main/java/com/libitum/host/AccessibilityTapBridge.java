package com.libitum.host;

import android.os.Bundle;
import android.view.View;
import android.view.accessibility.AccessibilityNodeInfo;
import androidx.core.view.AccessibilityDelegateCompat;
import androidx.core.view.ViewCompat;
import androidx.core.view.accessibility.AccessibilityNodeInfoCompat;
import com.lynx.tasm.LynxView;
import com.lynx.tasm.behavior.ui.LynxBaseUI;
import com.lynx.tasm.behavior.ui.LynxUI;
import com.lynx.tasm.event.LynxTouchEvent;
import java.util.Map;

/** Exposes Lynx tap handlers to Android's View-based accessibility tree. */
final class AccessibilityTapBridge {
  private AccessibilityTapBridge() {}

  static void sync(LynxView lynxView) {
    LynxBaseUI root = lynxView.getLynxUIRoot();
    if (root != null) sync(root);
  }

  private static void sync(LynxBaseUI ui) {
    if (ui instanceof LynxUI) {
      View view = ((LynxUI<?>) ui).getView();
      if (view != null && ui.getAccessibilityEnableTap()) {
        AccessibilityDelegateCompat current = ViewCompat.getAccessibilityDelegate(view);
        if (current instanceof TapDelegate) {
          ((TapDelegate) current).ui = ui;
        } else {
          ViewCompat.setAccessibilityDelegate(view, new TapDelegate(ui, current));
        }
      }
    }
    for (LynxBaseUI child : ui.getChildren()) sync(child);
  }

  private static final class TapDelegate extends AccessibilityDelegateCompat {
    private LynxBaseUI ui;
    private final AccessibilityDelegateCompat previous;

    TapDelegate(LynxBaseUI ui, AccessibilityDelegateCompat previous) {
      this.ui = ui;
      this.previous = previous;
    }

    private boolean canTap() {
      Map<String, ?> events = ui.getEvents();
      return ui.getAccessibilityEnableTap() && events != null
          && events.containsKey(LynxTouchEvent.EVENT_TAP);
    }

    @Override public void onInitializeAccessibilityNodeInfo(View host, AccessibilityNodeInfoCompat info) {
      if (previous != null) previous.onInitializeAccessibilityNodeInfo(host, info);
      else super.onInitializeAccessibilityNodeInfo(host, info);
      if (canTap()) {
        info.setClickable(true);
        info.addAction(AccessibilityNodeInfoCompat.AccessibilityActionCompat.ACTION_CLICK);
      }
    }

    @Override public boolean performAccessibilityAction(View host, int action, Bundle args) {
      if (action == AccessibilityNodeInfo.ACTION_CLICK && canTap()) {
        int[] location = new int[2];
        host.getLocationOnScreen(location);
        float x = host.getWidth() / 2f;
        float y = host.getHeight() / 2f;
        LynxTouchEvent.Point local = new LynxTouchEvent.Point(x, y);
        LynxTouchEvent.Point global = new LynxTouchEvent.Point(location[0] + x, location[1] + y);
        ui.getLynxContext().getEventEmitter().sendTouchEvent(
            new LynxTouchEvent(ui.getSign(), LynxTouchEvent.EVENT_TAP, local, local, global));
        return true;
      }
      return previous != null ? previous.performAccessibilityAction(host, action, args)
          : super.performAccessibilityAction(host, action, args);
    }
  }
}
