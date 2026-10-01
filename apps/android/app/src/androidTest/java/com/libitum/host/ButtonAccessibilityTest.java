package com.libitum.host;

import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertTrue;

import android.app.Instrumentation;
import android.app.UiAutomation;
import android.content.Intent;
import android.os.SystemClock;
import android.view.accessibility.AccessibilityNodeInfo;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.lynx.tasm.LynxView;
import com.lynx.tasm.behavior.ui.LynxBaseUI;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public final class ButtonAccessibilityTest {
  private static AccessibilityNodeInfo find(AccessibilityNodeInfo node, String label) {
    if (node == null) return null;
    CharSequence description = node.getContentDescription();
    if (description != null && label.contentEquals(description)) return node;
    for (int index = 0; index < node.getChildCount(); index++) {
      AccessibilityNodeInfo result = find(node.getChild(index), label);
      if (result != null) return result;
    }
    return null;
  }

  private static AccessibilityNodeInfo await(UiAutomation automation, String label) {
    long deadline = SystemClock.uptimeMillis() + 10000;
    while (SystemClock.uptimeMillis() < deadline) {
      AccessibilityNodeInfo result = find(automation.getRootInActiveWindow(), label);
      if (result != null) return result;
      SystemClock.sleep(200);
    }
    return null;
  }

  private static void activate(UiAutomation automation, String label) {
    AccessibilityNodeInfo node = await(automation, label);
    assertNotNull(label + " accessibility node missing", node);
    assertTrue(label + " is not clickable", node.isClickable());
    assertTrue(label + " has no ACTION_CLICK: " + node.getActionList(),
        node.getActionList().contains(AccessibilityNodeInfo.AccessibilityAction.ACTION_CLICK));
    assertTrue(label + " ACTION_CLICK failed", node.performAction(AccessibilityNodeInfo.ACTION_CLICK));
  }

  private static void awaitMissing(UiAutomation automation, String label) {
    long deadline = SystemClock.uptimeMillis() + 10000;
    while (SystemClock.uptimeMillis() < deadline) {
      if (find(automation.getRootInActiveWindow(), label) == null) return;
      SystemClock.sleep(200);
    }
    assertTrue(label + " should have disappeared", false);
  }

  private static LynxBaseUI findLynxUI(LynxBaseUI node, String label) {
    if (node == null) return null;
    CharSequence description = node.getAccessibilityLabel();
    if (description != null && label.contentEquals(description)) return node;
    for (LynxBaseUI child : node.getChildren()) {
      LynxBaseUI result = findLynxUI(child, label);
      if (result != null) return result;
    }
    return null;
  }

  @Test public void onboardingButtonCanBeActivatedByAccessibility() {
    Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    Intent launch = new Intent(Intent.ACTION_MAIN);
    launch.setClass(instrumentation.getTargetContext(), MainActivity.class);
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    String bundleUrl = InstrumentationRegistry.getArguments().getString("bundleUrl");
    if (bundleUrl != null) launch.putExtra("bundle-url", bundleUrl);
    MainActivity activity = (MainActivity) instrumentation.startActivitySync(launch);

    UiAutomation automation = instrumentation.getUiAutomation();
    LynxView lynxView = (LynxView) ((android.view.ViewGroup) activity.findViewById(android.R.id.content)).getChildAt(0);
    assertNotNull("Next accessibility node missing", await(automation, "Next"));
    LynxBaseUI nextUI = findLynxUI(lynxView.getLynxUIRoot(), "Next");
    assertNotNull("Next Lynx UI missing", nextUI);
    assertTrue("Next Lynx UI has no accessibility tap", nextUI.getAccessibilityEnableTap());
    assertTrue("Next Lynx UI has no bound tap: " + nextUI.getEvents(), nextUI.getEvents() != null && nextUI.getEvents().containsKey("tap"));
    activate(automation, "Next");
    assertNotNull("Next ACTION_CLICK did not advance onboarding", await(automation, "Back"));
    activate(automation, "Back");
    awaitMissing(automation, "Back");
    activate(automation, "Next");
    activate(automation, "Next");
    activate(automation, "Get started");
    for (String label : new String[] {"Sign in with Apple", "Connect with Google", "Connect with Facebook"}) {
      AccessibilityNodeInfo button = await(automation, label);
      assertNotNull(label + " accessibility node missing", button);
      assertTrue(label + " is not clickable", button.isClickable());
      assertTrue(label + " has no ACTION_CLICK", button.getActionList().contains(AccessibilityNodeInfo.AccessibilityAction.ACTION_CLICK));
    }
    instrumentation.runOnMainSync(activity::finish);
  }
}
