package com.libitum.host;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNotNull;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;

import io.sentry.SentryEvent;
import io.sentry.protocol.SentryException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.junit.Test;

/**
 * I2: the real payload, scrub, budget and event policy wired behind a fake sink. The sink does
 * what the production sink does (eventFrom, then beforeSend) and collects what would be sent.
 */
public final class CrashReporterFlowTest {
  private static final String JWT =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
  private static final String KOREAN = "안녕하세요";
  private static final int JS_ERRORS = 25;
  private static final int NATIVE_ERRORS = 3;

  private static final class Harness {
    final List<SentryEvent> sent = new ArrayList<>();
    final List<CrashReportPayload> payloads = new ArrayList<>();
    final CrashReporter reporter =
        new CrashReporter(
            payload -> {
              payloads.add(payload);
              SentryEvent cleaned = CrashEventPolicy.beforeSend(CrashEventPolicy.eventFrom(payload));
              assertNotNull("beforeSend must not drop a JS event", cleaned);
              sent.add(cleaned);
            },
            new CrashReportBudget());
  }

  /** A raw error text carrying every kind of personal data in message and stack. */
  private static String jsError(int i, boolean asJson) {
    String message =
        "TypeError: failed for user" + i + "@example.com tel 010-1234-" + String.format("%04d", i)
            + " ref 01012345678 token " + JWT + " opaque " + "k".repeat(40) + " says " + KOREAN
            + (i % 5 == 0 ? " " + "ab ".repeat(150) : "");
    String stack =
        "    at render (file:///data/app/main.lynx.bundle:1:" + (1000 + i) + ")\n"
            + "    at open (https://x.supabase.co/v1/verify?access_token=abc" + i + "&who=a@b.co)\n"
            + "    at " + KOREAN + " (f:3:4)";
    if (!asJson) return message + "\n" + stack;
    String json =
        "{\"rawError\":{\"message\":" + quote(message) + ",\"stack\":" + quote(stack)
            + "},\"other\":\"leak" + i + "@example.org\"}";
    return json;
  }

  private static String quote(String s) {
    return org.json.JSONObject.quote(s);
  }

  /** Feeds 3 rejected + 25 JS errors, rejected ones early and in the middle. */
  private static List<CrashReporter.Outcome> feed(Harness h) {
    List<CrashReporter.Outcome> outcomes = new ArrayList<>();
    outcomes.add(h.reporter.report(301, "error", "Image load failed https://cdn/x.png?sig=abc"));
    for (int i = 0; i < JS_ERRORS; i++) {
      if (i == 5) outcomes.add(h.reporter.report(301, "error", "Resource failed a@b.co"));
      if (i == 12) outcomes.add(h.reporter.report(1099, "error", "Layout failed 010-1234-5678"));
      int code = i % 2 == 0 ? 201 : 1101;
      outcomes.add(h.reporter.report(code, "error", jsError(i, i % 3 == 0)));
    }
    return outcomes;
  }

  @Test public void i2_exactlyTwentyEventsLeaveAndTheRestAreStopped() {
    Harness h = new Harness();
    List<CrashReporter.Outcome> outcomes = feed(h);

    assertEquals(JS_ERRORS + NATIVE_ERRORS, outcomes.size());
    assertEquals(20, h.sent.size());
    assertEquals(20, h.payloads.size());
    assertEquals(NATIVE_ERRORS, count(outcomes, CrashReporter.Outcome.REJECTED));
    assertEquals(20, count(outcomes, CrashReporter.Outcome.SENT));
    assertEquals(5, count(outcomes, CrashReporter.Outcome.OVER_BUDGET));
    // Rejected errors spend no budget: the first 20 JS errors, not 17, are the ones that went out.
    for (int i = 0; i < 20; i++) {
      assertTrue(
          "event " + i + " should come from JS error " + i,
          h.payloads.get(i).stackLines.get(0).contains(":1:" + (1000 + i) + ")"));
    }
  }

  @Test public void i2_noPersonalDataSurvivesInAnyFieldOfAnyEvent() {
    Harness h = new Harness();
    feed(h);
    assertEquals(20, h.sent.size());

    Pattern nineDigits = Pattern.compile("\\d{9}");
    int scannedFields = 0;
    for (SentryEvent event : h.sent) {
      StringBuilder all = new StringBuilder();
      List<SentryException> exceptions = event.getExceptions();
      assertNotNull(exceptions);
      for (SentryException ex : exceptions) all.append(ex.getValue()).append('\n');
      Object lynx = event.getContexts().get("lynx");
      assertTrue(lynx instanceof Map);
      all.append(((Map<?, ?>) lynx).get("stack")).append('\n');
      all.append(String.join("\n", event.getFingerprints()));
      String text = all.toString();
      scannedFields += 3;

      assertFalse("email leaked: " + text, text.contains("@"));
      assertFalse("jwt leaked: " + text, text.contains("eyJ"));
      assertFalse("long number leaked: " + text, nineDigits.matcher(text).find());
      assertFalse("opaque value leaked: " + text, text.contains("kkkkkkkk"));
      for (int c = 0; c < text.length(); c++) {
        assertTrue("non-ascii leaked: " + text, text.charAt(c) <= 0x7F);
      }
      assertFalse("url query leaked: " + text, text.contains("access_token") || text.contains("who="));
      assertTrue("url query not redacted: " + text, text.contains("verify?[redacted]"));
      assertNull(event.getUser());
      assertNotNull(event.getTag("lynx.source"));
    }
    assertEquals(60, scannedFields);
  }

  @Test public void i2_theFunnelItselfHandsOverCleanPayloadsBeforeAnyEventPolicy() {
    Harness h = new Harness();
    feed(h);
    assertEquals(20, h.payloads.size());
    int capped = 0;
    for (CrashReportPayload p : h.payloads) {
      String text = p.name + "\n" + p.message + "\n" + String.join("\n", p.stackLines);
      assertFalse(text, text.contains("@"));
      assertFalse(text, text.contains("eyJ"));
      assertFalse(text, Pattern.compile("\\d{9}").matcher(text).find());
      assertFalse(text, text.contains("access_token"));
      for (int c = 0; c < text.length(); c++) assertTrue(text, text.charAt(c) <= 0x7F);
      assertTrue(p.message.length() <= CrashReportPayload.MESSAGE_MAX);
      if (p.message.length() == CrashReportPayload.MESSAGE_MAX) capped++;
    }
    // Errors 0, 5, 10, 15 carry a long tail: the cap must have cut them, not just stayed under.
    assertEquals(4, capped);
  }

  @Test public void i2_scrubbingActuallyRanAndTheClosedShapeHolds() {
    Harness h = new Harness();
    feed(h);

    // The scan above would also pass on empty strings; pin what the cleaned fields look like.
    SentryEvent first = h.sent.get(0);
    SentryException ex = first.getExceptions().get(0);
    assertEquals("TypeError", ex.getType());
    String value = ex.getValue();
    assertTrue(value, value.contains("[email]"));
    assertTrue(value, value.contains("[number]"));
    assertTrue(value, value.contains("[token]"));
    assertTrue(value, value.contains("[text]"));
    assertTrue(value.length() <= CrashReportPayload.MESSAGE_MAX);

    // The JSON form carries a value outside rawError that must not travel at all.
    for (SentryEvent event : h.sent) {
      assertFalse(String.valueOf(event.getExceptions().get(0).getValue()).contains("leak"));
      assertFalse(String.valueOf(event.getContexts().get("lynx")).contains("leak"));
    }

    // Both threads are present and each tag matches the code that produced the event.
    int background = 0;
    int main = 0;
    for (int i = 0; i < h.sent.size(); i++) {
      String tag = h.sent.get(i).getTag("lynx.source");
      assertEquals(h.payloads.get(i).source.tag, tag);
      if ("js-background".equals(tag)) background++;
      if ("js-main-thread".equals(tag)) main++;
      assertEquals(4, h.sent.get(i).getFingerprints().size());
    }
    assertEquals(10, background);
    assertEquals(10, main);
  }

  @Test public void i2_aDisabledFunnelSendsNothingAndKeepsTheBudgetForALaterSink() {
    CrashReportBudget budget = new CrashReportBudget();
    CrashReporter disabled = new CrashReporter(null, budget);
    for (int i = 0; i < 30; i++) {
      assertEquals(CrashReporter.Outcome.DISABLED, disabled.report(201, "error", jsError(i, false)));
    }
    List<CrashReportPayload> got = new ArrayList<>();
    CrashReporter live = new CrashReporter(got::add, budget);
    for (int i = 0; i < 20; i++) {
      assertEquals(CrashReporter.Outcome.SENT, live.report(201, "error", jsError(i, false)));
    }
    assertEquals(20, got.size());
    assertEquals(CrashReporter.Outcome.OVER_BUDGET, live.report(201, "error", jsError(0, false)));
  }

  private static int count(List<CrashReporter.Outcome> all, CrashReporter.Outcome wanted) {
    int n = 0;
    for (CrashReporter.Outcome o : all) if (o == wanted) n++;
    return n;
  }
}
