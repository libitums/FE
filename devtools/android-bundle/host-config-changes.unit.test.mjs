import assert from "node:assert/strict";
import test from "node:test";

import {
  handledConfigChanges,
  mainActivityConfigIssues,
  mainActivityOrientation,
  recreatedConfigChanges,
} from "./host-config-changes.mjs";

const HANDLED = [
  "orientation",
  "screenSize",
  "smallestScreenSize",
  "screenLayout",
  "uiMode",
  "locale",
  "layoutDirection",
  "keyboard",
  "keyboardHidden",
  "navigation",
  "assetsPaths",
];

/** MainActivity tag per contract 5.1; each part can be overridden or dropped. */
function mainActivityTag({
  name = ".MainActivity",
  orientation = "portrait",
  configChanges = HANDLED.join("|"),
  extra = "",
} = {}) {
  const attrs = [
    `android:name="${name}"`,
    'android:exported="true"',
    'android:launchMode="singleTask"',
  ];
  if (orientation !== null) attrs.push(`android:screenOrientation="${orientation}"`);
  if (configChanges !== null) attrs.push(`android:configChanges="${configChanges}"`);
  if (extra) attrs.push(extra);
  return `<activity ${attrs.join(" ")}>
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
      </intent-filter>
    </activity>`;
}

function manifest({ activities = mainActivityTag(), applicationAttrs = "", extra = "" } = {}) {
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.libitum.host">
  <application android:label="Duru" ${applicationAttrs}>
    ${activities}
    <activity android:name=".PushNotificationTapActivity" android:exported="false" />
    ${extra}
  </application>
</manifest>`;
}

const todaysTwelve = () => [
  { rule: "orientation", detail: "(absent)" },
  ...HANDLED.map((detail) => ({ rule: "config-missing", detail })),
];

test("HC1: a compliant manifest, and one with shuffled order and odd whitespace in configChanges, report nothing", () => {
  assert.deepEqual(mainActivityConfigIssues(manifest()), []);

  const shuffled = [...HANDLED].reverse();
  const messy = `\n        ${shuffled.slice(0, 3).join(" | ")}\n      |${shuffled.slice(3, 7).join("|  ")} |\n  ${shuffled.slice(7).join("\n|\n")}  `;
  assert.deepEqual(
    mainActivityConfigIssues(manifest({ activities: mainActivityTag({ configChanges: messy }) })),
    [],
  );
});

test("HC2: a manifest shaped like today's (neither attribute) yields orientation (absent) plus 11 config-missing in handled order (12 issues)", () => {
  const today = manifest({
    activities: mainActivityTag({ orientation: null, configChanges: null }),
  });
  assert.deepEqual(mainActivityConfigIssues(today), todaysTwelve());
});

test("HC3: screenOrientation other than portrait yields one orientation issue carrying that value", () => {
  for (const value of ["userPortrait", "sensorPortrait", "unspecified", "landscape"]) {
    assert.deepEqual(
      mainActivityConfigIssues(manifest({ activities: mainActivityTag({ orientation: value }) })),
      [{ rule: "orientation", detail: value }],
      value,
    );
  }
});

test("HC4: dropping any one of the 11 handled values (including assetsPaths) yields exactly one config-missing for it", () => {
  for (const dropped of HANDLED) {
    const configChanges = HANDLED.filter((v) => v !== dropped).join("|");
    assert.deepEqual(
      mainActivityConfigIssues(manifest({ activities: mainActivityTag({ configChanges }) })),
      [{ rule: "config-missing", detail: dropped }],
      dropped,
    );
  }
});

test("HC5: declaring density or fontScale yields one config-forbidden for it", () => {
  for (const value of ["density", "fontScale"]) {
    const configChanges = `${HANDLED.join("|")}|${value}`;
    assert.deepEqual(
      mainActivityConfigIssues(manifest({ activities: mainActivityTag({ configChanges }) })),
      [{ rule: "config-forbidden", detail: value }],
      value,
    );
  }
});

test("HC6: declaring a value in neither list (mcc, fontWeightAdjustment, resourcesUnused) yields one config-unlisted for it", () => {
  for (const value of ["mcc", "fontWeightAdjustment", "resourcesUnused"]) {
    const configChanges = `${HANDLED.join("|")}|${value}`;
    assert.deepEqual(
      mainActivityConfigIssues(manifest({ activities: mainActivityTag({ configChanges }) })),
      [{ rule: "config-unlisted", detail: value }],
      value,
    );
  }
});

test("HC7: attributes only on PushNotificationTapActivity give the HC2 twelve; no or duplicate MainActivity and non-strings give a single activity-missing without throwing", () => {
  const onOtherActivity = manifest({
    activities: `${mainActivityTag({ orientation: null, configChanges: null })}
    <activity android:name=".PushNotificationTapActivity" android:screenOrientation="portrait" android:configChanges="${HANDLED.join("|")}" />`,
  });
  assert.deepEqual(mainActivityConfigIssues(onOtherActivity), todaysTwelve());

  assert.deepEqual(mainActivityConfigIssues(manifest({ activities: "" })), [
    { rule: "activity-missing", detail: "MainActivity declarations: 0" },
  ]);

  const twice = manifest({
    activities: `${mainActivityTag()}${mainActivityTag({ name: "com.libitum.host.MainActivity" })}`,
  });
  assert.deepEqual(mainActivityConfigIssues(twice), [
    { rule: "activity-missing", detail: "MainActivity declarations: 2" },
  ]);

  for (const bad of [undefined, null, 42]) {
    let issues;
    assert.doesNotThrow(() => {
      issues = mainActivityConfigIssues(bad);
    }, String(bad));
    assert.equal(issues.length, 1, String(bad));
    assert.equal(issues[0].rule, "activity-missing", String(bad));
  }
});

test("HC8: resizeableActivity on the activity or application, and the restricted-resizability property, are each reported", () => {
  assert.deepEqual(
    mainActivityConfigIssues(
      manifest({ activities: mainActivityTag({ extra: 'android:resizeableActivity="false"' }) }),
    ),
    [{ rule: "resizeable", detail: "activity=false" }],
  );
  assert.deepEqual(
    mainActivityConfigIssues(manifest({ applicationAttrs: 'android:resizeableActivity="true"' })),
    [{ rule: "resizeable", detail: "application=true" }],
  );
  assert.deepEqual(
    mainActivityConfigIssues(
      manifest({
        extra:
          '<property android:name="android.window.PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY" android:value="true" />',
      }),
    ),
    [{ rule: "restricted-resizability-opt-out", detail: "property declared" }],
  );
});

test("HC9: attributes inside an XML comment are not declarations; a fully qualified MainActivity name is accepted", () => {
  const commented = manifest({
    activities: `<activity android:name=".MainActivity" android:exported="true" android:launchMode="singleTask">
      <!-- android:screenOrientation="portrait" android:configChanges="${HANDLED.join("|")}" -->
    </activity>`,
  });
  assert.deepEqual(mainActivityConfigIssues(commented), todaysTwelve());

  assert.deepEqual(
    mainActivityConfigIssues(
      manifest({ activities: mainActivityTag({ name: "com.libitum.host.MainActivity" }) }),
    ),
    [],
  );
});

test("HC10: constants are the contract's 11 handled values in order (assetsPaths last), the 2 recreated values, disjoint, and portrait", () => {
  assert.deepEqual([...handledConfigChanges], HANDLED);
  assert.equal(handledConfigChanges.length, 11);
  assert.equal(handledConfigChanges.at(-1), "assetsPaths");
  assert.ok(!handledConfigChanges.includes("resourcesUnused"));
  assert.ok(!recreatedConfigChanges.includes("resourcesUnused"));
  assert.deepEqual([...recreatedConfigChanges], ["density", "fontScale"]);
  assert.equal(handledConfigChanges.filter((v) => recreatedConfigChanges.includes(v)).length, 0);
  assert.equal(mainActivityOrientation, "portrait");
});
