package com.libitum.host;

import android.content.Context;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;

/**
 * 앱 글꼴 파일을 Lynx가 읽는 자리에 둔다(ADR-0092). Lynx Android는 번들 자산(`assets/fonts/`)을 글꼴 이름으로 찾지
 * 않고 `@font-face`의 `local(file://절대 경로)`만 읽는다(런타임 `lynx.addFont`는 불러와도 글자에 반영되지 않았다).
 * 그래서 첫 화면을 그리기 전에 자산을 `files/fonts/`로 복사하고, `app.css`의 `@font-face`가 그 경로를 가리킨다 —
 * 경로 · 파일 이름은 `devtools/android-bundle/host-app-fonts.integration.test.mjs`가 이 표와 맞춰 본다.
 */
final class AppFonts {
  /** 복사할 파일. `app.css`의 `@font-face`가 같은 이름을 가리킨다. 이 판에 없는 파일은 건너뛴다. */
  static final String[] FILES = {
    "Jost.ttf", "LeagueSpartan.ttf", "DuruSans.ttf", "DuruRoman.ttf"
  };
  private static final String DIRECTORY = "fonts";

  private AppFonts() {}

  /** 크기가 같은 파일이 이미 있으면 다시 쓰지 않는다. */
  static boolean needsCopy(boolean exists, long existingLength, long sourceLength) {
    return !exists || existingLength != sourceLength;
  }

  /** `MainActivity`가 템플릿을 그리기 전에 한 번 부른다. 실패한 파일은 그 글꼴만 대체 글꼴로 떨어진다. */
  static void install(Context context) {
    File filesDir = context.getFilesDir();
    if (filesDir == null) return;
    File directory = new File(filesDir, DIRECTORY);
    if (!directory.isDirectory() && !directory.mkdirs()) return;
    for (String name : FILES) {
      File target = new File(directory, name);
      try (InputStream in = context.getAssets().open(DIRECTORY + "/" + name)) {
        if (needsCopy(target.isFile(), target.length(), in.available())) copy(in, target);
      } catch (IOException missing) {
        // 이 판에 없는 글꼴 — 등록하지 않는다.
      }
    }
  }

  private static void copy(InputStream in, File target) throws IOException {
    File partial = new File(target.getPath() + ".part");
    try {
      try (OutputStream out = new FileOutputStream(partial)) {
        byte[] buffer = new byte[16 * 1024];
        for (int read; (read = in.read(buffer)) != -1; ) out.write(buffer, 0, read);
      }
      if (!partial.renameTo(target)) throw new IOException("rename failed: " + target);
    } catch (IOException error) {
      // 쓰다 만 파일을 남기지 않는다 — 다음 시작에 다시 복사한다.
      partial.delete();
      throw error;
    }
  }
}
