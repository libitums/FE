package com.libitum.host;

import android.content.Context;
import android.util.Log;
import com.lynx.jsbridge.LynxMethod;
import com.lynx.jsbridge.LynxModule;

/**
 * 측정 빌드의 성능 기록을 logcat(`DuruPerf`)에 남기는 호스트 모듈입니다(ADR-0105 D2). JS는 빌드 때
 * `PUBLIC_PERF_PROBE=1`일 때만 부르므로 출시 빌드에서는 불리지 않습니다. 어떤 실패도 던지지 않습니다.
 */
public final class PerfLogModule extends LynxModule {
  static final String TAG = "DuruPerf";
  static final int MAX_LENGTH = 500;

  public PerfLogModule(Context context) {
    super(context);
  }

  @LynxMethod public void log(String line) {
    try {
      if (line == null) return;
      Log.i(TAG, line.length() > MAX_LENGTH ? line.substring(0, MAX_LENGTH) : line);
    } catch (RuntimeException ignored) {
      // 기록 실패는 삼킨다.
    }
  }
}
