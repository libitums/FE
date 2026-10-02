package com.libitum.host;

import android.content.Context;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;
import com.lynx.react.bridge.Callback;
import com.lynx.react.bridge.JavaOnlyMap;
import com.lynx.react.bridge.ReadableArray;
import com.lynx.react.bridge.ReadableMap;
import com.lynx.react.bridge.ReadableType;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Android bridge for the existing handwriting guide and trace comparison contract. */
public final class HandwritingTraceModule extends LynxModule {
  private static final ExecutorService WORKER = Executors.newSingleThreadExecutor();

  public HandwritingTraceModule(Context context) { super(context); }

  @LynxMethod public void guide(ReadableMap args, Callback callback) {
    dispatch(args, callback, true);
  }

  @LynxMethod public void compare(ReadableMap args, Callback callback) {
    dispatch(args, callback, false);
  }

  private static void dispatch(ReadableMap args, Callback callback, boolean guide) {
    HandwritingTraceEngine.Request request;
    try {
      request = parse(args);
    } catch (RuntimeException error) {
      callback.invoke(HandwritingTraceEngine.status("invalid-arguments"));
      return;
    }
    if (request == null) {
      callback.invoke(HandwritingTraceEngine.status("invalid-arguments"));
      return;
    }
    WORKER.execute(() -> {
      JavaOnlyMap result;
      try {
        result = guide ? HandwritingTraceEngine.guide(request)
            : HandwritingTraceEngine.compare(request);
      } catch (RuntimeException | OutOfMemoryError error) {
        result = HandwritingTraceEngine.status("failed");
      }
      callback.invoke(result);
    });
  }

  private static HandwritingTraceEngine.Request parse(ReadableMap args) {
    if (args == null || !number(args, "width") || !number(args, "height")
        || !number(args, "strokeWidth") || !number(args, "fontSize")
        || !number(args, "tolerance") || !string(args, "glyph")
        || !string(args, "fontName") || !string(args, "guideColor")
        || !args.hasKey("strokes") || args.getType("strokes") != ReadableType.Array) {
      return null;
    }
    double width = args.getDouble("width"), height = args.getDouble("height");
    double strokeWidth = args.getDouble("strokeWidth"), fontSize = args.getDouble("fontSize");
    double tolerance = args.getDouble("tolerance");
    String glyph = args.getString("glyph"), fontName = args.getString("fontName");
    String guideColor = args.getString("guideColor");
    // Two bounded masks, two dilation buffers and PNG pixels fit comfortably below 1 MP.
    if (!Double.isFinite(width) || !Double.isFinite(height) || width < 1 || height < 1
        || width > 1024 || height > 1024 || width * height > 1_000_000
        || !Double.isFinite(strokeWidth) || strokeWidth <= 0 || strokeWidth > 1024
        || !Double.isFinite(fontSize) || fontSize <= 0 || fontSize > 1024
        || !Double.isFinite(tolerance) || tolerance < 0 || tolerance > 1_000_000
        || glyph == null || glyph.length() > 16 || fontName == null || fontName.length() > 128
        || guideColor == null || guideColor.length() > 32) return null;
    ReadableArray rawStrokes = args.getArray("strokes");
    if (rawStrokes == null || rawStrokes.size() > 100) return null;
    List<List<HandwritingTraceEngine.Point>> strokes = new ArrayList<>();
    int pointCount = 0;
    for (int i = 0; i < rawStrokes.size(); i++) {
      if (rawStrokes.getType(i) != ReadableType.Array) return null;
      ReadableArray rawStroke = rawStrokes.getArray(i);
      if (rawStroke == null || pointCount + rawStroke.size() > 10_000) return null;
      pointCount += rawStroke.size();
      List<HandwritingTraceEngine.Point> points = new ArrayList<>();
      for (int j = 0; j < rawStroke.size(); j++) {
        if (rawStroke.getType(j) != ReadableType.Map) return null;
        ReadableMap rawPoint = rawStroke.getMap(j);
        if (!number(rawPoint, "x") || !number(rawPoint, "y")) return null;
        double x = rawPoint.getDouble("x"), y = rawPoint.getDouble("y");
        if (!Double.isFinite(x) || !Double.isFinite(y)
            || Math.abs(x) > 10_000 || Math.abs(y) > 10_000) return null;
        points.add(new HandwritingTraceEngine.Point((float) x, (float) y));
      }
      strokes.add(points);
    }
    return new HandwritingTraceEngine.Request((int) Math.round(width), (int) Math.round(height),
        (float) strokeWidth, (float) fontSize, (int) Math.min(Math.round(tolerance), 1024),
        glyph, fontName, guideColor, strokes);
  }

  private static boolean number(ReadableMap args, String key) {
    if (args == null || !args.hasKey(key)) return false;
    ReadableType type = args.getType(key);
    return type == ReadableType.Number || type == ReadableType.Int || type == ReadableType.Long;
  }

  private static boolean string(ReadableMap args, String key) {
    return args.hasKey(key) && args.getType(key) == ReadableType.String;
  }
}
