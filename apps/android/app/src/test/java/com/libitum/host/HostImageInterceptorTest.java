package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;

/**
 * android-splash-wordmark unit UI1~UI6 (계약 spec.md §5, 계획 test-plan.md unit).
 *
 * <p>호스트의 이미지 URL 재작성은 Lynx가 UI 스레드에서 들어온 {@code src}를 처리하는 그 자리에서 값으로
 * 돌아와야 한다 — 값은 {@link HostPaths#media(String, boolean, String)}의 것이다. 이 테스트는 값과 호출의
 * 성질(스레드를 만들지 않고 바로 돌아온다)만 본다. 인터셉터가 Lynx에 제때 걸리는지는
 * {@code host-image-redirect.integration.test.mjs}(정적 결선)와 {@code SplashWordmarkHostTest}(계측)의 몫이다.
 *
 * <p>UI3 · UI5 · UI6은 가드다(원본을 돌려주는 스텁도 통과한다). red의 근거는 UI1 · UI2 · UI4다.
 */
public final class HostImageInterceptorTest {
  private static final String BUNDLED_TEMPLATE = "main.lynx.bundle";
  private static final String DEV_TEMPLATE = "http://10.0.2.2:18790/main.lynx.bundle";

  private static final String[] INPUTS = {
    "/static/image/logo-handwriting.31d15f7dc3.webp",
    "/static/image/a.png",
    "/static/",
    "https://example.com/a.png",
    "data:image/png;base64,AA==",
    "asset:///static/x.png",
    "",
    null,
  };

  private static HostImageInterceptor bundled() {
    return new HostImageInterceptor(true, BUNDLED_TEMPLATE);
  }

  private static HostImageInterceptor dev() {
    return new HostImageInterceptor(false, DEV_TEMPLATE);
  }

  /** UI1: 내장 번들은 {@code /static/…}를 {@code asset://} + 경로로 바꾼다. */
  @Test public void ui1_bundledStaticImageBecomesAnAssetUrl() {
    assertEquals(
        "asset:///static/image/logo-handwriting.31d15f7dc3.webp",
        bundled().shouldRedirectImageUrl("/static/image/logo-handwriting.31d15f7dc3.webp"));
  }

  /** UI2: dev는 번들을 내려준 서버의 {@code scheme://authority}를 쓴다(기본 3000이 아니라 템플릿의 것). */
  @Test public void ui2_devStaticImageFollowsTheTemplateServer() {
    assertEquals(
        "http://10.0.2.2:18790/static/image/a.png",
        dev().shouldRedirectImageUrl("/static/image/a.png"));
  }

  /** UI3: {@code /static/}로 시작하지 않는 값은 그대로(null은 null). 가드. */
  @Test public void ui3_nonStaticValuesPassThroughUnchanged() {
    for (HostImageInterceptor interceptor : new HostImageInterceptor[] {bundled(), dev()}) {
      assertEquals("https://example.com/a.png",
          interceptor.shouldRedirectImageUrl("https://example.com/a.png"));
      assertEquals("data:image/png;base64,AA==",
          interceptor.shouldRedirectImageUrl("data:image/png;base64,AA=="));
      assertEquals("asset:///static/x.png",
          interceptor.shouldRedirectImageUrl("asset:///static/x.png"));
      assertEquals("", interceptor.shouldRedirectImageUrl(""));
      assertNull(interceptor.shouldRedirectImageUrl(null));
    }
  }

  /** UI4: 어떤 입력에서도 {@code HostPaths.media}와 같은 값이다 — 인터셉터가 자체 규칙을 갖지 않는다. */
  @Test public void ui4_matchesHostPathsMediaForEveryInputAndConfiguration() {
    for (String input : INPUTS) {
      assertEquals("bundled, input " + input,
          HostPaths.media(input, true, BUNDLED_TEMPLATE),
          bundled().shouldRedirectImageUrl(input));
      assertEquals("dev, input " + input,
          HostPaths.media(input, false, DEV_TEMPLATE),
          dev().shouldRedirectImageUrl(input));
    }
  }

  /**
   * UI5: 부른 스레드에서 바로 돌려준다 — 다른 스레드를 만들지 않고, 기다리지 않는다. 가드(원본을 돌려주는
   * 스텁도 통과한다. 값의 정확성은 UI1 · UI2 · UI4가 본다).
   */
  @Test(timeout = 10000) public void ui5_returnsOnTheCallersThreadWithoutHandoff() throws Exception {
    final HostImageInterceptor interceptor = bundled();
    final AtomicReference<String> result = new AtomicReference<>();
    final AtomicInteger threadsBefore = new AtomicInteger();
    final AtomicInteger threadsAfter = new AtomicInteger();
    final AtomicReference<Long> elapsedMs = new AtomicReference<>();
    final AtomicReference<Boolean> aliveOnReturn = new AtomicReference<>();
    final CountDownLatch done = new CountDownLatch(1);
    Thread caller = new Thread(() -> {
      threadsBefore.set(Thread.activeCount());
      long start = System.nanoTime();
      result.set(interceptor.shouldRedirectImageUrl("/static/image/a.png"));
      elapsedMs.set((System.nanoTime() - start) / 1_000_000L);
      threadsAfter.set(Thread.activeCount());
      aliveOnReturn.set(Thread.currentThread().isAlive());
      done.countDown();
    }, "wordmark-caller");
    caller.start();
    assertTrue("the call never returned", done.await(5, TimeUnit.SECONDS));
    caller.join(5000);

    assertEquals("the call must return on the caller's thread while it is still running",
        Boolean.TRUE, aliveOnReturn.get());
    assertEquals("the interceptor must not create threads", threadsBefore.get(), threadsAfter.get());
    assertTrue("the call must return within 50 ms (was " + elapsedMs.get() + " ms)",
        elapsedMs.get() < 50);
    // 값 자체는 UI1 · UI2 · UI4의 몫이다 — 여기서는 호출이 값을 내놓았다는 것만 본다.
    assertTrue("the call returned no value", result.get() != null);
  }

  /** UI6: {@code loadImage}는 「처리하지 않음」을 정확히 1회 알린다. handler가 null이어도 던지지 않는다. 가드. */
  @Test public void ui6_loadImageReportsNotHandledExactlyOnce() {
    final AtomicInteger calls = new AtomicInteger();
    final AtomicReference<Object> drawable = new AtomicReference<>("unset");
    final AtomicReference<Throwable> failure = new AtomicReference<>();
    bundled().loadImage(null, "k", "/static/a.png", 1f, 1f, null, (image, error) -> {
      calls.incrementAndGet();
      drawable.set(image);
      failure.set(error);
    });
    assertEquals("imageLoadCompletion must be called exactly once", 1, calls.get());
    assertNull("no drawable is produced", drawable.get());
    assertNull("no error is reported", failure.get());

    bundled().loadImage(null, "k", "/static/a.png", 1f, 1f, null, null);
  }
}
