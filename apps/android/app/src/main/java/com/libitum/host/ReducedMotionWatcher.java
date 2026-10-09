package com.libitum.host;

import android.content.ContentResolver;
import android.database.ContentObserver;
import android.net.Uri;
import android.os.Handler;
import android.provider.Settings;

/**
 * 시스템 「동작 줄이기」 상태를 읽고 바뀌면 알립니다. 판정 규칙은 {@link ReducedMotion}이 지고,
 * 여기는 설정 읽기와 관찰자 등록만 합니다(Android 의존이라 JUnit 대상이 아니며 e2e가 확인합니다).
 *
 * <p>접근성 「애니메이션 삭제」는 배율 셋을 0으로 쓰므로 같은 길로 옵니다.
 */
final class ReducedMotionWatcher {
  interface Listener {
    void onReducedMotionChanged(boolean enabled);
  }

  private ContentResolver resolver;
  private ContentObserver observer;

  /** 현재 값. 설정이 없으면 배율 1(꺼짐)로 읽습니다. */
  boolean read(ContentResolver contentResolver) {
    float animator =
        Settings.Global.getFloat(contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f);
    float transition =
        Settings.Global.getFloat(contentResolver, Settings.Global.TRANSITION_ANIMATION_SCALE, 1f);
    return ReducedMotion.fromScales(animator, transition);
  }

  /** 두 배율의 변경을 듣습니다. 이미 시작했으면 먼저 멈춥니다. */
  void start(ContentResolver contentResolver, Handler handler, Listener listener) {
    stop();
    resolver = contentResolver;
    observer = new ContentObserver(handler) {
      @Override public void onChange(boolean selfChange) {
        listener.onReducedMotionChanged(read(contentResolver));
      }

      @Override public void onChange(boolean selfChange, Uri uri) {
        onChange(selfChange);
      }
    };
    contentResolver.registerContentObserver(
        Settings.Global.getUriFor(Settings.Global.ANIMATOR_DURATION_SCALE), false, observer);
    contentResolver.registerContentObserver(
        Settings.Global.getUriFor(Settings.Global.TRANSITION_ANIMATION_SCALE), false, observer);
  }

  void stop() {
    if (resolver != null && observer != null) resolver.unregisterContentObserver(observer);
    resolver = null;
    observer = null;
  }
}
