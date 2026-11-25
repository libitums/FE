package com.libitum.host;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.media.ExifInterface;
import android.net.Uri;
import android.provider.MediaStore;
import androidx.activity.result.PickVisualMediaRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * 내 스토리 사진 고르기 · 찍기 · 줄이기(ADR-0199). MainActivity가 하나 가지고 {@code onActivityResult}를 넘긴다
 * (MainActivity는 plain Activity라 registerForActivityResult가 없다). 고르기는 Photo Picker(이미지만, 권한 없음),
 * 찍기는 {@code ACTION_IMAGE_CAPTURE} + FileProvider 출력 — CAMERA 권한은 선언하지 않는다. 한 번에 하나만 고르고
 * 콜백은 정확히 한 번 부른다. 줄이기는 방향 적용 → 긴 변 1600 → JPEG 80으로 새로 인코딩해 원본 EXIF(위치)가 남지 않는다.
 */
final class StoryPhotoPicker {
  interface Result {
    void deliver(Map<String, String> payload);
  }

  static final int REQUEST_LIBRARY = 7301;
  static final int REQUEST_CAMERA = 7302;
  private static final String AUTHORITY_SUFFIX = ".storyphotos";
  private static final ExecutorService WORKER = Executors.newSingleThreadExecutor();

  private final Activity activity;
  /** 메인 스레드에서만 읽고 쓴다. */
  private Result pending;
  private File captureFile;

  StoryPhotoPicker(Activity activity) {
    this.activity = activity;
  }

  static File root(Activity activity) {
    return new File(activity.getCacheDir(), StoryPhotoPaths.ROOT_NAME);
  }

  /** 메인 스레드에서 부른다. */
  void pick(String source, Result result) {
    if (StoryPhotoPaths.source(source) == null) {
      result.deliver(StoryPhotoPaths.status("invalid"));
      return;
    }
    if (pending != null) {
      result.deliver(StoryPhotoPaths.status("busy"));
      return;
    }
    if (activity.isFinishing() || activity.isDestroyed()) {
      result.deliver(StoryPhotoPaths.status("failed"));
      return;
    }
    File root = root(activity);
    WORKER.execute(() -> sweep(root));
    if (source.equals("library")) {
      startLibrary(result);
    } else {
      startCamera(root, result);
    }
  }

  private void startLibrary(Result result) {
    PickVisualMediaRequest request = new PickVisualMediaRequest.Builder()
        .setMediaType(ActivityResultContracts.PickVisualMedia.ImageOnly.INSTANCE)
        .build();
    Intent intent;
    try {
      intent = new ActivityResultContracts.PickVisualMedia().createIntent(activity, request);
    } catch (RuntimeException error) {
      result.deliver(StoryPhotoPaths.status("failed"));
      return;
    }
    launch(intent, REQUEST_LIBRARY, result, "failed");
  }

  private void startCamera(File root, Result result) {
    Intent intent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
    if (intent.resolveActivity(activity.getPackageManager()) == null) {
      result.deliver(StoryPhotoPaths.status("unavailable"));
      return;
    }
    File capture = new File(new File(root, StoryPhotoPaths.CAPTURE_NAME), StoryPhotoPaths.newFileName());
    Uri output;
    try {
      File folder = capture.getParentFile();
      if (folder == null || (!folder.isDirectory() && !folder.mkdirs())) throw new IOException("mkdirs");
      output = FileProvider.getUriForFile(
          activity, activity.getPackageName() + AUTHORITY_SUFFIX, capture);
    } catch (IOException | RuntimeException error) {
      result.deliver(StoryPhotoPaths.status("failed"));
      return;
    }
    intent.putExtra(MediaStore.EXTRA_OUTPUT, output);
    intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION | Intent.FLAG_GRANT_READ_URI_PERMISSION);
    captureFile = capture;
    launch(intent, REQUEST_CAMERA, result, "unavailable");
  }

  private void launch(Intent intent, int requestCode, Result result, String notFound) {
    pending = result;
    try {
      activity.startActivityForResult(intent, requestCode);
    } catch (ActivityNotFoundException error) {
      finish(StoryPhotoPaths.status(notFound));
    } catch (SecurityException error) {
      // CAMERA를 선언한 다른 라이브러리가 섞여 권한이 필요해진 경우다. 묻지 않는다.
      finish(StoryPhotoPaths.status("denied"));
    } catch (RuntimeException error) {
      finish(StoryPhotoPaths.status("failed"));
    }
  }

  /** MainActivity.onActivityResult에서 메인 스레드로 온다. 우리 요청이면 true. */
  boolean onActivityResult(int requestCode, int resultCode, Intent data) {
    if (requestCode != REQUEST_LIBRARY && requestCode != REQUEST_CAMERA) return false;
    if (pending == null) return true;
    File root = root(activity);
    ContentResolver resolver = activity.getContentResolver();
    if (requestCode == REQUEST_LIBRARY) {
      Uri uri = null;
      try {
        uri = new ActivityResultContracts.PickVisualMedia().parseResult(resultCode, data);
      } catch (RuntimeException ignored) {
        // 아래에서 cancelled로 간다.
      }
      if (uri == null) {
        finish(StoryPhotoPaths.status("cancelled"));
        return true;
      }
      Uri source = uri;
      WORKER.execute(() -> finishFromWorker(shrink(() -> resolver.openInputStream(source), root)));
      return true;
    }
    File capture = captureFile;
    captureFile = null;
    if (resultCode != Activity.RESULT_OK || capture == null || !capture.isFile() || capture.length() == 0) {
      if (capture != null) capture.delete();
      finish(StoryPhotoPaths.status("cancelled"));
      return true;
    }
    WORKER.execute(() -> {
      Map<String, String> payload = shrink(() -> new java.io.FileInputStream(capture), root);
      capture.delete();
      finishFromWorker(payload);
    });
    return true;
  }

  /** 액티비티가 사라질 때 기다리는 콜백을 닫는다. */
  void destroy() {
    if (captureFile != null) captureFile.delete();
    captureFile = null;
    finish(StoryPhotoPaths.status("cancelled"));
  }

  private void finishFromWorker(Map<String, String> payload) {
    activity.runOnUiThread(() -> finish(payload));
  }

  private void finish(Map<String, String> payload) {
    Result result = pending;
    pending = null;
    if (result != null) result.deliver(payload);
  }

  private interface Opener {
    InputStream open() throws IOException;
  }

  /** 백그라운드에서 읽어 줄이고 새 JPEG로 쓴다. 실패는 모두 failed. */
  private static Map<String, String> shrink(Opener opener, File root) {
    File out = null;
    Bitmap sampled = null;
    Bitmap oriented = null;
    Bitmap scaled = null;
    try {
      BitmapFactory.Options bounds = new BitmapFactory.Options();
      bounds.inJustDecodeBounds = true;
      try (InputStream in = opener.open()) {
        if (in == null) return StoryPhotoPaths.status("failed");
        BitmapFactory.decodeStream(in, null, bounds);
      }
      if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return StoryPhotoPaths.status("failed");
      int orientation = ExifInterface.ORIENTATION_NORMAL;
      try (InputStream in = opener.open()) {
        if (in != null) {
          orientation = new ExifInterface(in)
              .getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
        }
      } catch (IOException | RuntimeException ignored) {
        // 방향을 못 읽으면 그대로 둔다.
      }
      boolean swap = StoryPhotoSize.swapsAxes(orientation);
      int[] target = swap
          ? StoryPhotoSize.target(bounds.outHeight, bounds.outWidth)
          : StoryPhotoSize.target(bounds.outWidth, bounds.outHeight);
      if (target == null) return StoryPhotoPaths.status("failed");
      BitmapFactory.Options options = new BitmapFactory.Options();
      options.inSampleSize = StoryPhotoSize.sampleSize(bounds.outWidth, bounds.outHeight);
      try (InputStream in = opener.open()) {
        if (in == null) return StoryPhotoPaths.status("failed");
        sampled = BitmapFactory.decodeStream(in, null, options);
      }
      if (sampled == null) return StoryPhotoPaths.status("failed");
      Matrix matrix = orientationMatrix(orientation);
      oriented = matrix.isIdentity()
          ? sampled
          : Bitmap.createBitmap(sampled, 0, 0, sampled.getWidth(), sampled.getHeight(), matrix, true);
      scaled = oriented.getWidth() == target[0] && oriented.getHeight() == target[1]
          ? oriented
          : Bitmap.createScaledBitmap(oriented, target[0], target[1], true);
      File folder = root;
      if (!folder.isDirectory() && !folder.mkdirs()) return StoryPhotoPaths.status("failed");
      out = new File(folder, StoryPhotoPaths.newFileName());
      // Bitmap.compress는 픽셀만 인코딩한다 — 원본 EXIF(GPS 포함)를 싣지 않는다.
      try (OutputStream stream = new FileOutputStream(out)) {
        if (!scaled.compress(Bitmap.CompressFormat.JPEG, StoryPhotoSize.JPEG_QUALITY, stream)) {
          throw new IOException("compress");
        }
      }
      return StoryPhotoPaths.picked(out, scaled.getWidth(), scaled.getHeight(), out.length());
    } catch (IOException | RuntimeException | OutOfMemoryError error) {
      if (out != null) out.delete();
      return StoryPhotoPaths.status("failed");
    } finally {
      if (scaled != null) scaled.recycle();
      if (oriented != null && oriented != scaled) oriented.recycle();
      if (sampled != null && sampled != oriented && sampled != scaled) sampled.recycle();
    }
  }

  private static Matrix orientationMatrix(int orientation) {
    Matrix matrix = new Matrix();
    switch (orientation) {
      case ExifInterface.ORIENTATION_FLIP_HORIZONTAL:
        matrix.setScale(-1, 1);
        break;
      case ExifInterface.ORIENTATION_ROTATE_180:
        matrix.setRotate(180);
        break;
      case ExifInterface.ORIENTATION_FLIP_VERTICAL:
        matrix.setScale(1, -1);
        break;
      case ExifInterface.ORIENTATION_TRANSPOSE:
        matrix.setRotate(90);
        matrix.postScale(-1, 1);
        break;
      case ExifInterface.ORIENTATION_ROTATE_90:
        matrix.setRotate(90);
        break;
      case ExifInterface.ORIENTATION_TRANSVERSE:
        matrix.setRotate(-90);
        matrix.postScale(-1, 1);
        break;
      case ExifInterface.ORIENTATION_ROTATE_270:
        matrix.setRotate(-90);
        break;
      default:
        break;
    }
    return matrix;
  }

  /** 폴더(와 capture 하위 폴더)에서 24시간 넘은 파일을 지운다. 실패는 조용히. */
  private static void sweep(File root) {
    try {
      long now = System.currentTimeMillis();
      for (File folder : new File[] {root, new File(root, StoryPhotoPaths.CAPTURE_NAME)}) {
        File[] files = folder.listFiles();
        if (files == null) continue;
        for (File file : files) {
          if (file.isFile() && StoryPhotoPaths.expired(file.lastModified(), now)) file.delete();
        }
      }
    } catch (RuntimeException ignored) {
      // 다음 pick에서 다시 지운다.
    }
  }
}
