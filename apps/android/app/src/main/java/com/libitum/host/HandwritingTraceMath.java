package com.libitum.host;

final class HandwritingTraceMath {
  private HandwritingTraceMath() {}

  static int[] bounds(byte[] mask, int width, int height) {
    int minX = width, minY = height, maxX = -1, maxY = -1;
    for (int y = 0; y < height; y++) {
      for (int x = 0; x < width; x++) {
        if (mask[y * width + x] == 0) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    return maxX < 0 ? null : new int[] {minX, minY, maxX - minX + 1, maxY - minY + 1};
  }

  static byte[] center(byte[] mask, int width, int height) {
    int[] box = bounds(mask, width, height);
    if (box == null) return mask;
    int shiftX = (width - box[2]) / 2 - box[0];
    int shiftY = (height - box[3]) / 2 - box[1];
    if (shiftX == 0 && shiftY == 0) return mask;
    byte[] moved = new byte[mask.length];
    for (int y = 0; y < height; y++) {
      int targetY = y + shiftY;
      if (targetY < 0 || targetY >= height) continue;
      for (int x = 0; x < width; x++) {
        int targetX = x + shiftX;
        if (mask[y * width + x] != 0 && targetX >= 0 && targetX < width) {
          moved[targetY * width + targetX] = 1;
        }
      }
    }
    return moved;
  }

  static byte[] dilate(byte[] mask, int width, int height, int radius) {
    if (radius <= 0) return mask;
    int r = Math.min(radius, Math.max(width, height));
    byte[] horizontal = new byte[mask.length];
    int[] prefix = new int[Math.max(width, height) + 1];
    for (int y = 0; y < height; y++) {
      prefix[0] = 0;
      for (int x = 0; x < width; x++) {
        prefix[x + 1] = prefix[x] + mask[y * width + x];
      }
      for (int x = 0; x < width; x++) {
        horizontal[y * width + x] = (byte) (prefix[Math.min(width, x + r + 1)]
            > prefix[Math.max(0, x - r)] ? 1 : 0);
      }
    }
    byte[] result = new byte[mask.length];
    for (int x = 0; x < width; x++) {
      prefix[0] = 0;
      for (int y = 0; y < height; y++) {
        prefix[y + 1] = prefix[y] + horizontal[y * width + x];
      }
      for (int y = 0; y < height; y++) {
        result[y * width + x] = (byte) (prefix[Math.min(height, y + r + 1)]
            > prefix[Math.max(0, y - r)] ? 1 : 0);
      }
    }
    return result;
  }

  static int area(byte[] mask) {
    int count = 0;
    for (byte pixel : mask) count += pixel;
    return count;
  }

  static int intersection(byte[] left, byte[] right) {
    int count = 0;
    for (int i = 0; i < left.length; i++) {
      if (left[i] != 0 && right[i] != 0) count++;
    }
    return count;
  }
}
