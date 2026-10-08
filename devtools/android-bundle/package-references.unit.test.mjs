import assert from "node:assert/strict";
import test from "node:test";

import { staleAndroidPackageReferences } from "./package-references.mjs";

test("PR1: a bare application id is a stale reference with its line, column and text", () => {
  assert.deepEqual(staleAndroidPackageReferences("appId: com.libitum.host"), [
    { line: 1, column: 8, text: "appId: com.libitum.host" },
  ]);
});

test("PR2: stale references across lines, including two on one line, are reported with exact positions", () => {
  const lines = [
    "pm clear com.libitum.host",
    "  force-stop com.libitum.host >/dev/null  ",
    "com.libitum.host.test/androidx.test.runner.AndroidJUnitRunner",
    "am start -n com.libitum.host/.MainActivity",
    "x com.libitum.host y com.libitum.host/.Other",
  ];
  const needle = "com.libitum.host";
  const expected = lines.flatMap((raw, i) => {
    const text = raw.trim();
    const found = [];
    let at = raw.indexOf(needle);
    while (at !== -1) {
      found.push({ line: i + 1, column: at + 1, text });
      at = raw.indexOf(needle, at + 1);
    }
    return found;
  });
  assert.equal(expected.length, 6);
  assert.deepEqual(staleAndroidPackageReferences(lines.join("\n")), expected);
});

test("PR3: class names, other-package qualified names, fixture actions and path forms are not stale", () => {
  const allowed = [
    "-e class com.libitum.host.SignedInScreenFixtureTest",
    '"com.libitum.host.SessionResumeTest#$1"',
    "libitum.duru.android/com.libitum.host.MainActivity",
    "-a com.libitum.host.test.STOP_SIGNED_IN_FIXTURE",
    "com.libitum.host.test.POST_PUSH_FIXTURE",
    "src/main/java/com/libitum/host/",
  ].join("\n");
  assert.deepEqual(staleAndroidPackageReferences(allowed), []);
});
