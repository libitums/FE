package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;
import static org.junit.Assume.assumeFalse;

import android.Manifest;
import android.app.Instrumentation;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.speech.SpeechRecognizer;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.lynx.react.bridge.JavaOnlyMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
public final class SpeechRecognitionModuleTest {
  private static MainActivity launch(Instrumentation instrumentation) {
    Context context = instrumentation.getTargetContext();
    Intent intent = new Intent(Intent.ACTION_MAIN);
    intent.setClass(context, MainActivity.class);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
    return (MainActivity) instrumentation.startActivitySync(intent);
  }

  @Test public void statusAndInvalidRequestKeepTheBridgeShape() throws InterruptedException {
    Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    MainActivity activity = launch(instrumentation);
    try {
      SpeechRecognitionModule module = new SpeechRecognitionModule(activity,
          new SpeechRecognitionController(activity));
      CountDownLatch statusDone = new CountDownLatch(1);
      AtomicReference<JavaOnlyMap> status = new AtomicReference<>();
      module.getStatus(values -> {
        status.set((JavaOnlyMap) values[0]);
        statusDone.countDown();
      });
      assertTrue(statusDone.await(3, TimeUnit.SECONDS));
      assertEquals("ko-KR", status.get().getString("locale"));
      assertEquals("granted", status.get().getString("speechRecognition"));
      assertFalse(status.get().getBoolean("listening"));

      JavaOnlyMap args = new JavaOnlyMap();
      args.putString("requireOnDevice", "yes");
      CountDownLatch resultDone = new CountDownLatch(1);
      AtomicInteger calls = new AtomicInteger();
      AtomicReference<JavaOnlyMap> result = new AtomicReference<>();
      module.start(args, values -> {
        calls.incrementAndGet();
        result.set((JavaOnlyMap) values[0]);
        resultDone.countDown();
      });
      assertTrue(resultDone.await(3, TimeUnit.SECONDS));
      assertEquals(1, calls.get());
      assertEquals("invalid-arguments", result.get().getString("status"));
      assertEquals("not-guaranteed", result.get().getString("onDevice"));
      assertEquals("", result.get().getString("text"));
    } finally {
      instrumentation.runOnMainSync(activity::finish);
    }
  }

  @Test public void missingRecognizerSettlesWithoutOpeningMicrophone() throws InterruptedException {
    Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    MainActivity activity = launch(instrumentation);
    try {
      assumeFalse("AOSP no-service path", SpeechRecognizer.isRecognitionAvailable(activity)
          || (Build.VERSION.SDK_INT >= 31
              && SpeechRecognizer.isOnDeviceRecognitionAvailable(activity)));
      instrumentation.getUiAutomation().grantRuntimePermission(
          activity.getPackageName(), Manifest.permission.RECORD_AUDIO);
      SpeechRecognitionModule module = new SpeechRecognitionModule(activity,
          new SpeechRecognitionController(activity));
      CountDownLatch permissionDone = new CountDownLatch(1);
      AtomicReference<JavaOnlyMap> permission = new AtomicReference<>();
      module.requestPermissions(values -> {
        permission.set((JavaOnlyMap) values[0]);
        permissionDone.countDown();
      });
      assertTrue(permissionDone.await(3, TimeUnit.SECONDS));
      assertEquals("granted", permission.get().getString("microphone"));

      CountDownLatch resultDone = new CountDownLatch(1);
      AtomicReference<JavaOnlyMap> result = new AtomicReference<>();
      module.start(new JavaOnlyMap(), values -> {
        result.set((JavaOnlyMap) values[0]);
        resultDone.countDown();
      });
      assertTrue(resultDone.await(3, TimeUnit.SECONDS));
      assertEquals("recognizer-unavailable", result.get().getString("status"));
      assertFalse(result.get().getBoolean("requiresOnDevice"));
      module.stop();
    } finally {
      instrumentation.runOnMainSync(activity::finish);
    }
  }
}
