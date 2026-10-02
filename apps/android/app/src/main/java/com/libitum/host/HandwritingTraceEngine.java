package com.libitum.host;

import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Typeface;
import android.util.Base64;
import com.lynx.react.bridge.JavaOnlyMap;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.Locale;

/** Renders the visible guide and measured glyph from one centered binary mask. */
final class HandwritingTraceEngine {
  // The product currently sends an Apple-only font name. Both paths select this Android family.
  private static final String FONT_FAMILY = "sans-serif";
  private static final Typeface FONT = Typeface.SANS_SERIF;
  record Point(float x, float y) {}
  record Request(int width, int height, float strokeWidth, float fontSize, int tolerance,
      String glyph, String fontName, String guideColor, List<List<Point>> strokes) {}

  private HandwritingTraceEngine() {}

  static JavaOnlyMap guide(Request request) {
    if (request.glyph().isEmpty()) return status("empty-glyph");
    byte[] mask = glyphMask(request);
    int[] box = HandwritingTraceMath.bounds(mask, request.width(), request.height());
    if (box == null) return status("empty-glyph");
    Bitmap bitmap = Bitmap.createBitmap(request.width(), request.height(), Bitmap.Config.ARGB_8888);
    try {
      int[] pixels = new int[mask.length];
      int color = guideColor(request.guideColor());
      for (int i = 0; i < mask.length; i++) {
        if (mask[i] != 0) pixels[i] = color;
      }
      bitmap.setPixels(pixels, 0, request.width(), 0, 0, request.width(), request.height());
      ByteArrayOutputStream output = new ByteArrayOutputStream();
      if (!bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)) return status("failed");
      JavaOnlyMap result = status("rendered");
      result.putString("image", Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP));
      result.putString("box", boxString(box));
      result.putString("font", FONT_FAMILY);
      return result;
    } finally {
      bitmap.recycle();
    }
  }

  static JavaOnlyMap compare(Request request) {
    byte[] drawn = strokeMask(request);
    int drawnArea = HandwritingTraceMath.area(drawn);
    if (drawnArea == 0) return status("empty-strokes");
    byte[] guide = glyphMask(request);
    int guideArea = HandwritingTraceMath.area(guide);
    if (guideArea == 0) return status("empty-glyph");
    int radius = Math.min(request.tolerance(), Math.max(request.width(), request.height()));
    byte[] grownDrawn = HandwritingTraceMath.dilate(drawn, request.width(), request.height(), radius);
    byte[] grownGuide = HandwritingTraceMath.dilate(guide, request.width(), request.height(), radius);
    JavaOnlyMap result = status("compared");
    result.putString("coverage", String.format(Locale.US, "%.4f",
        (double) HandwritingTraceMath.intersection(guide, grownDrawn) / guideArea));
    result.putString("stay", String.format(Locale.US, "%.4f",
        (double) HandwritingTraceMath.intersection(drawn, grownGuide) / drawnArea));
    result.putString("drawnArea", Integer.toString(drawnArea));
    result.putString("guideArea", Integer.toString(guideArea));
    result.putString("font", FONT_FAMILY);
    result.putString("guideBox", boxString(
        HandwritingTraceMath.bounds(guide, request.width(), request.height())));
    return result;
  }

  static JavaOnlyMap status(String value) {
    JavaOnlyMap result = new JavaOnlyMap();
    result.putString("status", value);
    return result;
  }

  private static byte[] glyphMask(Request request) {
    Bitmap bitmap = Bitmap.createBitmap(request.width(), request.height(), Bitmap.Config.ARGB_8888);
    try {
      Canvas canvas = new Canvas(bitmap);
      canvas.drawColor(Color.BLACK);
      Paint paint = whitePaint();
      paint.setTypeface(FONT);
      paint.setTextSize(request.fontSize());
      float x = (request.width() - paint.measureText(request.glyph())) / 2;
      float y = (request.height() - paint.ascent() - paint.descent()) / 2;
      canvas.drawText(request.glyph(), x, y, paint);
      return HandwritingTraceMath.center(binaryMask(bitmap), request.width(), request.height());
    } finally {
      bitmap.recycle();
    }
  }

  private static byte[] strokeMask(Request request) {
    Bitmap bitmap = Bitmap.createBitmap(request.width(), request.height(), Bitmap.Config.ARGB_8888);
    try {
      Canvas canvas = new Canvas(bitmap);
      canvas.drawColor(Color.BLACK);
      Paint paint = whitePaint();
      paint.setStyle(Paint.Style.STROKE);
      paint.setStrokeWidth(request.strokeWidth());
      paint.setStrokeCap(Paint.Cap.ROUND);
      paint.setStrokeJoin(Paint.Join.ROUND);
      Path path = new Path();
      for (List<Point> stroke : request.strokes()) {
        if (stroke.isEmpty()) continue;
        if (stroke.size() == 1) {
          paint.setStyle(Paint.Style.FILL);
          canvas.drawCircle(stroke.get(0).x(), stroke.get(0).y(),
              request.strokeWidth() / 2, paint);
          paint.setStyle(Paint.Style.STROKE);
          continue;
        }
        path.reset();
        path.moveTo(stroke.get(0).x(), stroke.get(0).y());
        for (int i = 1; i < stroke.size(); i++) path.lineTo(stroke.get(i).x(), stroke.get(i).y());
        canvas.drawPath(path, paint);
      }
      return binaryMask(bitmap);
    } finally {
      bitmap.recycle();
    }
  }

  private static Paint whitePaint() {
    Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    paint.setColor(Color.WHITE);
    return paint;
  }

  private static byte[] binaryMask(Bitmap bitmap) {
    int width = bitmap.getWidth(), height = bitmap.getHeight();
    int[] pixels = new int[width * height];
    bitmap.getPixels(pixels, 0, width, 0, 0, width, height);
    byte[] mask = new byte[pixels.length];
    for (int i = 0; i < pixels.length; i++) {
      mask[i] = (byte) (Color.red(pixels[i]) > 127 ? 1 : 0);
    }
    return mask;
  }

  private static String boxString(int[] box) {
    return box[0] + "," + box[1] + "," + box[2] + "," + box[3];
  }

  private static int guideColor(String text) {
    try {
      if (text.matches("#[0-9a-fA-F]{6}")) return Color.parseColor(text);
    } catch (IllegalArgumentException ignored) {
      // Invalid token color falls back to black, matching the iOS bridge.
    }
    return Color.BLACK;
  }
}
