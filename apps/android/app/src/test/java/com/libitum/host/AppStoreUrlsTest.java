package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

/** `AppStoreUrls`의 순수 주소 표를 잰다(AS1 · AS2). Play 앱이 실제로 열리는지는 e2e의 몫이다. */
public final class AppStoreUrlsTest {
  // AS1: Play 앱 주소와 웹 주소 둘 다 이 앱의 패키지 이름을 가리킨다.
  @Test public void as1MarketAndWebUrlsPointAtThePackage() {
    assertEquals("market://details?id=libitum.duru.android", AppStoreUrls.market("libitum.duru.android"));
    assertEquals(
        "https://play.google.com/store/apps/details?id=libitum.duru.android",
        AppStoreUrls.web("libitum.duru.android"));
  }

  // AS2: 패키지 이름이 없으면 주소도 없다.
  @Test public void as2EmptyPackageHasNoUrl() {
    assertNull(AppStoreUrls.market(null));
    assertNull(AppStoreUrls.market(""));
    assertNull(AppStoreUrls.web(null));
    assertNull(AppStoreUrls.web(""));
  }
}
