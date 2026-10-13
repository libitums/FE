package com.libitum.host;

import android.app.Application;
import android.util.Log;
import com.lynx.tasm.LynxError;
import io.sentry.Sentry;
import io.sentry.android.core.SentryAndroid;

/**
 * The only place that touches Android and Sentry for crash reporting. Without a valid DSN no
 * io.sentry code runs and the funnel has no sink. Nothing here may stop the app (docs/adr/0058).
 */
final class CrashReporting {
  private static volatile CrashReporter reporter = new CrashReporter(null, new CrashReportBudget());

  private CrashReporting() {}

  static void start(Application app) {
    CrashReportBudget budget = new CrashReportBudget();
    try {
      String dsn = CrashReportConfig.dsnFrom(BuildConfig.SENTRY_DSN);
      if (dsn == null) {
        reporter = new CrashReporter(null, budget);
        return;
      }
      SentryAndroid.init(app, options -> {
        options.setDsn(dsn);
        options.setEnvironment(BuildConfig.BUILD_TYPE);
        options.setRelease(CrashReportConfig.releaseOf(
            BuildConfig.APPLICATION_ID, BuildConfig.VERSION_NAME, BuildConfig.VERSION_CODE));
        options.setDist(String.valueOf(BuildConfig.VERSION_CODE));
        String uuid = CrashReportConfig.proguardUuidFrom(BuildConfig.SENTRY_PROGUARD_UUID);
        if (uuid != null) options.setProguardUuid(uuid);
        options.setSendDefaultPii(false);
        options.setDistinctId(null);
        options.setBeforeSend((event, hint) -> CrashEventPolicy.beforeSend(event));
        options.setBeforeBreadcrumb((crumb, hint) -> null);
        options.setMaxBreadcrumbs(0);
        options.setEnableActivityLifecycleBreadcrumbs(false);
        options.setEnableAppLifecycleBreadcrumbs(false);
        options.setEnableSystemEventBreadcrumbs(false);
        options.setEnableAppComponentBreadcrumbs(false);
        options.setEnableNetworkEventBreadcrumbs(false);
        options.setEnableUserInteractionBreadcrumbs(false);
        options.setTracesSampleRate(null);
        options.setEnableAutoActivityLifecycleTracing(false);
        options.setEnableUserInteractionTracing(false);
        options.setEnableFramesTracking(false);
        options.setAttachScreenshot(false);
        options.setAttachViewHierarchy(false);
        options.setCollectExternalStorageContext(false);
        options.setEnableRootCheck(false);
        options.setSendModules(false);
        options.setAttachServerName(false);
        options.setEnableAutoSessionTracking(true);
        options.setEnableUncaughtExceptionHandler(true);
        options.setAnrEnabled(true);
        options.setReportHistoricalAnrs(false);
        options.setReportHistoricalTombstones(false);
        options.setAttachRawTombstone(false);
        options.setTombstoneEnabled(true);
        options.setEnableNdk(false);
        options.setEnableScopeSync(false);
      });
      reporter = new CrashReporter(payload -> Sentry.captureEvent(CrashEventPolicy.eventFrom(payload)), budget);
    } catch (RuntimeException | LinkageError error) {
      reporter = new CrashReporter(null, budget);
    }
  }

  static void onLynxError(LynxError error) {
    try {
      if (error == null) return;
      int code = error.getErrorCode();
      String text = error.getSummaryMessage();
      CrashReporter.Outcome outcome = reporter.report(code, error.getLevel(), text);
      if (BuildConfig.DEBUG) {
        String head = text == null ? "" : text.substring(0, Math.min(text.length(), 500));
        Log.d("DuruCrash", outcome + " " + code + " " + head);
      }
    } catch (RuntimeException | StackOverflowError ignored) {
      // Reporting must never throw into the Lynx callback.
    }
  }
}
