package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.util.Base64;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.lynx.react.bridge.JavaOnlyArray;
import com.lynx.react.bridge.JavaOnlyMap;
import com.lynx.react.bridge.ReadableType;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public final class HandwritingTraceModuleTest {
  private static JavaOnlyMap request() {
    JavaOnlyMap args = new JavaOnlyMap();
    args.putInt("width", 120);
    args.putInt("height", 120);
    args.putInt("strokeWidth", 12);
    args.putInt("fontSize", 80);
    args.putInt("tolerance", 4);
    args.putString("glyph", "가");
    args.putString("fontName", "AppleSDGothicNeo-Regular");
    args.putString("guideColor", "#94A3B8");
    args.putArray("strokes", JavaOnlyArray.of());
    return args;
  }

  private static JavaOnlyMap result(HandwritingTraceModule module, JavaOnlyMap args,
      boolean guide) throws InterruptedException {
    CountDownLatch latch = new CountDownLatch(1);
    AtomicReference<JavaOnlyMap> answer = new AtomicReference<>();
    com.lynx.react.bridge.Callback callback = values -> {
      answer.set((JavaOnlyMap) values[0]);
      latch.countDown();
    };
    if (guide) module.guide(args, callback);
    else module.compare(args, callback);
    assertTrue("native callback timed out", latch.await(3, TimeUnit.SECONDS));
    return answer.get();
  }

  @Test public void guideRendersKoreanGlyphAndEmptyStrokeIsDistinct() throws Exception {
    Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
    HandwritingTraceModule module = new HandwritingTraceModule(context);
    assertEquals(ReadableType.Int, request().getType("width"));
    assertEquals(ReadableType.Array, request().getType("strokes"));
    JavaOnlyMap guide = result(module, request(), true);
    assertEquals("rendered", guide.getString("status"));
    assertTrue(guide.getString("image").length() > 100);
    assertTrue(guide.getString("box").split(",").length == 4);
    assertEquals("empty-strokes", result(module, request(), false).getString("status"));
  }

  @Test public void visibleGuideAndComparisonShareOneMask() throws Exception {
    Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
    HandwritingTraceModule module = new HandwritingTraceModule(context);
    JavaOnlyMap args = request();
    JavaOnlyMap guide = result(module, args, true);
    assertEquals("rendered", guide.getString("status"));
    byte[] png = Base64.decode(guide.getString("image"), Base64.DEFAULT);
    Bitmap bitmap = BitmapFactory.decodeByteArray(png, 0, png.length);
    assertEquals(120, bitmap.getWidth());
    assertEquals(120, bitmap.getHeight());
    assertEquals(Color.TRANSPARENT, bitmap.getPixel(0, 0));
    int guideArea = 0;
    int inkX = -1, inkY = -1;
    for (int y = 0; y < 120; y++) {
      for (int x = 0; x < 120; x++) {
        if (Color.alpha(bitmap.getPixel(x, y)) != 0) {
          guideArea++;
          inkX = x;
          inkY = y;
        }
      }
    }
    JavaOnlyMap point = new JavaOnlyMap();
    point.putInt("x", inkX);
    point.putInt("y", inkY);
    args.putArray("strokes", JavaOnlyArray.of(JavaOnlyArray.of(point)));
    JavaOnlyMap compared = result(module, args, false);
    assertEquals("compared", compared.getString("status"));
    assertEquals(guide.getString("box"), compared.getString("guideBox"));
    assertEquals(guide.getString("font"), compared.getString("font"));
    assertEquals(guideArea, Integer.parseInt(compared.getString("guideArea")));
    assertTrue(Integer.parseInt(compared.getString("drawnArea")) > 0);
    assertTrue(Double.parseDouble(compared.getString("coverage")) > 0);
    assertTrue(Double.parseDouble(compared.getString("coverage")) <= 1);
    assertTrue(Double.parseDouble(compared.getString("stay")) > 0);
    assertTrue(Double.parseDouble(compared.getString("stay")) <= 1);
  }

  @Test public void invalidRequestsSettleOnce() throws Exception {
    Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
    HandwritingTraceModule module = new HandwritingTraceModule(context);
    JavaOnlyMap malformed = request();
    malformed.putString("width", "120");
    assertEquals("invalid-arguments", result(module, malformed, true).getString("status"));
    JavaOnlyMap tooLarge = request();
    tooLarge.putInt("width", 5000);
    assertEquals("invalid-arguments", result(module, tooLarge, false).getString("status"));
    JavaOnlyMap empty = request();
    empty.putString("glyph", "");
    assertEquals("empty-glyph", result(module, empty, true).getString("status"));
  }
}
