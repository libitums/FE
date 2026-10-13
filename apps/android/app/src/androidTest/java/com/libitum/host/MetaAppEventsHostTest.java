package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;

import android.content.Context;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.ProviderInfo;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.facebook.FacebookSdk;
import org.junit.Test;
import org.junit.runner.RunWith;

/**
 * N-A4: 앱이 뜬 뒤 Meta SDK 시작 여부가 빌드의 값 유무와 일치한다. SDK 자동 진입로(FacebookInitProvider)는 늘 닫혀 있다.
 *
 * <p>값 없는 빌드(meta.properties 없음)에서 돌려 셋 다 「꺼짐」인 것을 증거로 남긴다.
 */
@RunWith(AndroidJUnit4.class)
public final class MetaAppEventsHostTest {
  private Context target() {
    return InstrumentationRegistry.getInstrumentation().getTargetContext();
  }

  private boolean hasConfig() {
    return MetaAppEventsConfig.from(BuildConfig.META_APP_ID, BuildConfig.META_CLIENT_TOKEN) != null;
  }

  @Test public void n_a4_startedMatchesTheBuildValues() {
    assertEquals(hasConfig(), MetaAppEvents.started());
  }

  @Test public void n_a4_sdkInitializedMatchesTheBuildValues() {
    assertEquals(hasConfig(), FacebookSdk.isInitialized());
  }

  @Test public void n_a4_facebookInitProviderIsNotInstalled() throws Exception {
    PackageInfo info = target().getPackageManager()
        .getPackageInfo(target().getPackageName(), PackageManager.GET_PROVIDERS);
    if (info.providers == null) return;
    for (ProviderInfo provider : info.providers) {
      assertFalse(provider.name, provider.name.endsWith("FacebookInitProvider"));
    }
  }
}
