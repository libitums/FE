package com.libitum.host;

/**
 * 내 스토리 사진(ADR-0199)을 기기에서 줄일 크기다. 긴 변 최대 {@link #MAX_LONG_SIDE}px(작으면 그대로, 키우지 않음), JPEG
 * 품질 {@link #JPEG_QUALITY}. 안드로이드 클래스를 쓰지 않아 JVM 단위 테스트로 본다. iOS {@code StoryPhotoModule}과 같은 표다.
 */
final class StoryPhotoSize {
  static final int MAX_LONG_SIDE = 1600;
  static final int JPEG_QUALITY = 80;

  private StoryPhotoSize() {}

  /** 방향을 적용한 뒤의 너비 · 높이로 최종 {@code {width, height}}. 크기가 0 이하면 null. 짧은 변은 반올림, 최소 1. */
  static int[] target(int width, int height) {
    if (width <= 0 || height <= 0) return null;
    int longSide = Math.max(width, height);
    if (longSide <= MAX_LONG_SIDE) return new int[] {width, height};
    double scale = (double) MAX_LONG_SIDE / longSide;
    int w = width >= height ? MAX_LONG_SIDE : Math.max(1, (int) Math.round(width * scale));
    int h = height > width ? MAX_LONG_SIDE : Math.max(1, (int) Math.round(height * scale));
    return new int[] {w, h};
  }

  /** {@code BitmapFactory.Options.inSampleSize}: 줄여 읽은 긴 변이 {@link #MAX_LONG_SIDE} 아래로 내려가지 않는 가장 큰 2의 거듭제곱. */
  static int sampleSize(int width, int height) {
    int longSide = Math.max(width, height);
    int sample = 1;
    while (longSide / (sample * 2) >= MAX_LONG_SIDE) sample *= 2;
    return sample;
  }

  /** EXIF orientation 5~8(TRANSPOSE · ROTATE_90 · TRANSVERSE · ROTATE_270)은 가로 · 세로가 바뀐다. */
  static boolean swapsAxes(int exifOrientation) {
    return exifOrientation >= 5 && exifOrientation <= 8;
  }
}
