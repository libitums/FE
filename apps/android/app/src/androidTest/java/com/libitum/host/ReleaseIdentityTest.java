package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.content.pm.PackageInfo;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * android-release-config (IN1): the installed app is the Play Console app, built for the current
 * target SDK. Run with libitum.duru.android.test/androidx.test.runner.AndroidJUnitRunner.
 */
@RunWith(AndroidJUnit4.class)
public final class ReleaseIdentityTest {
  private static final String PLAY_PACKAGE = "libitum.duru.android";
  private static final int PLAY_UPLOADED_VERSION_CODE = 1;

  private Context target() {
    return InstrumentationRegistry.getInstrumentation().getTargetContext();
  }

  @Test public void installedPackageIsThePlayConsoleApp() {
    assertEquals(PLAY_PACKAGE, target().getPackageName());
    assertEquals(PLAY_PACKAGE + ".test",
        InstrumentationRegistry.getInstrumentation().getContext().getPackageName());
  }

  @Test public void javaNamespaceStaysTheHostPackage() throws Exception {
    // Class names follow the namespace, not the applicationId (guard).
    Class.forName("com.libitum.host.MainActivity");
  }

  @Test public void versionCodeIsAboveTheOneUploadedToPlay() throws Exception {
    PackageInfo info = target().getPackageManager().getPackageInfo(target().getPackageName(), 0);
    assertTrue("versionCode " + info.getLongVersionCode(),
        info.getLongVersionCode() > PLAY_UPLOADED_VERSION_CODE);
  }

  @Test public void targetSdkIs36() {
    assertEquals(36, target().getApplicationInfo().targetSdkVersion);
  }
}
