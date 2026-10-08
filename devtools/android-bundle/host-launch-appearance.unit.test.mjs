import assert from "node:assert/strict";
import test from "node:test";

import {
  launchAppearanceIssues,
  resolvedColor,
  resolvedThemeItems,
} from "./host-launch-appearance.mjs";

const PLATFORM_PARENT = "@android:style/Theme.Material.Light.NoActionBar";
const TRANSPARENT = "@android:color/transparent";
const ANDROID_NS = 'xmlns:android="http://schemas.android.com/apk/res/android"';
const DENSITIES = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];

const item = (name, value) => (value === null ? "" : `<item name="${name}">${value}</item>`);
const resources = (body) => `<?xml version="1.0" encoding="utf-8"?>
<resources>
  ${body}
</resources>`;

/** Contract 6.4 manifest; each part can be overridden or dropped. */
function manifest({
  icon = "@mipmap/ic_launcher",
  theme = "@style/Theme.Duru",
  applicationExtra = "",
  mainActivityExtra = "",
  comment = "",
} = {}) {
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest ${ANDROID_NS} package="com.libitum.host">
  ${comment}
  <application android:label="Duru" android:icon="${icon}" android:theme="${theme}" ${applicationExtra}>
    <activity android:name=".MainActivity" android:exported="true" android:launchMode="singleTask" ${mainActivityExtra}>
      <intent-filter>
        <action android:name="android.intent.action.MAIN" />
      </intent-filter>
    </activity>
    <activity android:name=".PushNotificationTapActivity" android:exported="false" />
  </application>
</manifest>`;
}

function colors({
  brand = "#F46B18",
  launchBackground = "@color/libitum_color_brand_primary",
  icBackground = "@color/libitum_color_brand_primary",
} = {}) {
  return resources(
    [
      brand === null ? "" : `<color name="libitum_color_brand_primary">${brand}</color>`,
      launchBackground === null
        ? ""
        : `<color name="launch_background">${launchBackground}</color>`,
      icBackground === null ? "" : `<color name="ic_launcher_background">${icBackground}</color>`,
    ].join("\n  "),
  );
}

/** values/themes.xml: a common base style plus Theme.Duru (API 26 resolves to it). */
function baseThemes({
  parent = PLATFORM_PARENT,
  background = "@color/launch_background",
  status = TRANSPARENT,
  nav = TRANSPARENT,
  lightStatus = "true",
  baseExtra = "",
  themeExtra = "",
} = {}) {
  return resources(`<style name="Base.Theme.Duru" parent="${parent}">
    ${item("android:windowBackground", background)}
    ${item("android:statusBarColor", status)}
    ${item("android:navigationBarColor", nav)}
    ${item("android:windowLightStatusBar", lightStatus)}
    ${baseExtra}
  </style>
  <style name="Theme.Duru" parent="Base.Theme.Duru">
    ${themeExtra}
  </style>`);
}

function v27Themes({ lightNav = "true" } = {}) {
  return resources(`<style name="Theme.Duru" parent="Base.Theme.Duru">
    ${item("android:windowLightNavigationBar", lightNav)}
  </style>`);
}

function v31Themes({
  lightNav = "true",
  splashBackground = "@color/launch_background",
  splashIcon = "@drawable/splash_icon_none",
  extra = "",
} = {}) {
  return resources(`<style name="Theme.Duru" parent="Base.Theme.Duru">
    ${item("android:windowLightNavigationBar", lightNav)}
    ${item("android:windowSplashScreenBackground", splashBackground)}
    ${item("android:windowSplashScreenAnimatedIcon", splashIcon)}
    ${extra}
  </style>`);
}

function adaptiveIcon({
  root = "adaptive-icon",
  background = "@color/ic_launcher_background",
  foreground = "@mipmap/ic_launcher_foreground",
  extra = "",
} = {}) {
  return `<?xml version="1.0" encoding="utf-8"?>
<${root} ${ANDROID_NS}>
  <background android:drawable="${background}" />
  <foreground android:drawable="${foreground}" />
  ${extra}
</${root}>`;
}

const SPLASH_NONE_XML = `<?xml version="1.0" encoding="utf-8"?>
<shape ${ANDROID_NS} android:shape="rectangle">
  <solid android:color="@android:color/transparent" />
</shape>`;

const INTACT_PATHS = [
  "values/colors.xml",
  "values/themes.xml",
  "values-v27/themes.xml",
  "values-v31/themes.xml",
  "mipmap-anydpi-v26/ic_launcher.xml",
  "drawable/splash_icon_none.xml",
  ...DENSITIES.map((d) => `mipmap-${d}/ic_launcher_foreground.png`),
];

/** The intact fixture of the test plan; `files` / `paths` / `manifest` are replaceable. */
function intact(overrides = {}) {
  const files = {
    "values/colors.xml": colors(),
    "values/themes.xml": baseThemes(),
    "values-v27/themes.xml": v27Themes(),
    "values-v31/themes.xml": v31Themes(),
    "mipmap-anydpi-v26/ic_launcher.xml": adaptiveIcon(),
    "drawable/splash_icon_none.xml": SPLASH_NONE_XML,
    ...overrides.files,
  };
  for (const [key, value] of Object.entries(files)) {
    if (value === null) delete files[key];
  }
  return {
    manifest: manifest(),
    files,
    paths: [...INTACT_PATHS],
    expectedLaunchColor: "#F46B18",
    ...overrides.input,
  };
}

const without = (paths, ...removed) => paths.filter((p) => !removed.includes(p));
const rulesOf = (issues) => issues.map((issue) => issue.rule);
const distinctRules = (issues) => [...new Set(rulesOf(issues))];

test("LA1 an intact fixture has no issues", () => {
  assert.deepEqual(launchAppearanceIssues(intact()), []);
});

test("LA2 the application theme must be Theme.Duru and no activity may set its own", () => {
  const platform = launchAppearanceIssues(
    intact({ input: { manifest: manifest({ theme: PLATFORM_PARENT }) } }),
  );
  assert.deepEqual(rulesOf(platform), ["theme"]);

  const perActivity = launchAppearanceIssues(
    intact({
      input: { manifest: manifest({ mainActivityExtra: 'android:theme="@style/Theme.Duru"' }) },
    }),
  );
  assert.deepEqual(rulesOf(perActivity), ["theme"]);
});

test("LA3 windowBackground must resolve to launch_background and the parent chain must end at Material.Light", () => {
  const missing = launchAppearanceIssues(
    intact({ files: { "values/themes.xml": baseThemes({ background: null }) } }),
  );
  assert.deepEqual(distinctRules(missing), ["window-background"]);

  const wrongColor = launchAppearanceIssues(
    intact({ files: { "values/themes.xml": baseThemes({ background: "#FAFAFA" }) } }),
  );
  assert.deepEqual(distinctRules(wrongColor), ["window-background"]);

  const darkParent = launchAppearanceIssues(
    intact({
      files: {
        "values/themes.xml": baseThemes({ parent: "@android:style/Theme.Material.NoActionBar" }),
      },
    }),
  );
  assert.deepEqual(distinctRules(darkParent), ["theme-parent"]);
});

test("LA4 system bars: opaque status bar, missing navigation bar color and a dark status icon each fail", () => {
  const opaqueStatus = launchAppearanceIssues(
    intact({ files: { "values/themes.xml": baseThemes({ status: "#FF000000" }) } }),
  );
  assert.deepEqual(distinctRules(opaqueStatus), ["system-bars"]);

  const noNav = launchAppearanceIssues(
    intact({ files: { "values/themes.xml": baseThemes({ nav: null }) } }),
  );
  assert.deepEqual(distinctRules(noNav), ["system-bars"]);

  const darkIcons = launchAppearanceIssues(
    intact({ files: { "values/themes.xml": baseThemes({ lightStatus: "false" }) } }),
  );
  assert.deepEqual(distinctRules(darkIcons), ["system-bars"]);
});

test("LA5 windowSplashScreenBackground is an API 31 attribute and qualifiers do not merge", () => {
  const dropped = launchAppearanceIssues(
    intact({ files: { "values-v31/themes.xml": v31Themes({ splashBackground: null }) } }),
  );
  assert.deepEqual(distinctRules(dropped), ["splash-background"]);

  // Moved to the common parent in values/: it still resolves at API 31 through the chain.
  const inCommonParent = launchAppearanceIssues(
    intact({
      files: {
        "values/themes.xml": baseThemes({
          baseExtra: item("android:windowSplashScreenBackground", "@color/launch_background"),
        }),
        "values-v31/themes.xml": v31Themes({ splashBackground: null }),
      },
    }),
  );
  assert.deepEqual(distinctRules(inCommonParent), ["api-level"]);

  // Theme.Duru of values/ only: the values-v31 Theme.Duru replaces it, so API 31 loses the value.
  const onlyInBaseQualifier = launchAppearanceIssues(
    intact({
      files: {
        "values/themes.xml": baseThemes({
          themeExtra: item("android:windowSplashScreenBackground", "@color/launch_background"),
        }),
        "values-v31/themes.xml": v31Themes({ splashBackground: null }),
      },
    }),
  );
  assert.deepEqual(distinctRules(onlyInBaseQualifier).sort(), ["api-level", "splash-background"]);
});

test("LA6 splash icon: missing, wrong reference, missing drawable and forbidden attributes fail", () => {
  const missing = launchAppearanceIssues(
    intact({ files: { "values-v31/themes.xml": v31Themes({ splashIcon: null }) } }),
  );
  assert.deepEqual(distinctRules(missing), ["splash-icon"]);

  const launcherIcon = launchAppearanceIssues(
    intact({
      files: { "values-v31/themes.xml": v31Themes({ splashIcon: "@mipmap/ic_launcher" }) },
    }),
  );
  assert.deepEqual(distinctRules(launcherIcon), ["splash-icon"]);

  const noDrawableFile = launchAppearanceIssues(
    intact({ input: { paths: without(INTACT_PATHS, "drawable/splash_icon_none.xml") } }),
  );
  assert.deepEqual(distinctRules(noDrawableFile), ["splash-icon"]);

  const forbidden = launchAppearanceIssues(
    intact({
      files: {
        "values-v31/themes.xml": v31Themes({
          extra: item("android:windowSplashScreenIconBackgroundColor", "@color/launch_background"),
        }),
      },
    }),
  );
  assert.deepEqual(distinctRules(forbidden), ["splash-icon"]);
});

test("LA7 windowLightNavigationBar is an API 27 attribute", () => {
  const inCommonValues = launchAppearanceIssues(
    intact({
      files: {
        "values/themes.xml": baseThemes({
          baseExtra: item("android:windowLightNavigationBar", "true"),
        }),
      },
    }),
  );
  assert.deepEqual(distinctRules(inCommonValues), ["api-level"]);

  const missingInV27 = launchAppearanceIssues(
    intact({ files: { "values-v27/themes.xml": v27Themes({ lightNav: null }) } }),
  );
  assert.deepEqual(distinctRules(missingInV27), ["system-bars"]);

  const missingInV31 = launchAppearanceIssues(
    intact({ files: { "values-v31/themes.xml": v31Themes({ lightNav: null }) } }),
  );
  assert.deepEqual(distinctRules(missingInV31), ["system-bars"]);
});

test("LA8 launch color must resolve to the token value", () => {
  const driftedToken = launchAppearanceIssues(
    intact({ files: { "values/colors.xml": colors({ brand: "#F46B19" }) } }),
  );
  assert.deepEqual(distinctRules(driftedToken), ["launch-color"]);

  for (const [label, launchBackground] of [
    ["cycle", "@color/launch_background"],
    ["undefined", null],
    ["translucent", "#80F46B18"],
  ]) {
    const issues = launchAppearanceIssues(
      intact({ files: { "values/colors.xml": colors({ launchBackground }) } }),
    );
    assert.deepEqual(distinctRules(issues), ["launch-color"], label);
  }

  const iconBackgroundOnly = launchAppearanceIssues(
    intact({ files: { "values/colors.xml": colors({ icBackground: "#FF0000" }) } }),
  );
  assert.deepEqual(distinctRules(iconBackgroundOnly), ["launch-color"]);
});

test("LA9 night variants must not define the theme or the launch colors", () => {
  const nightColor = launchAppearanceIssues(
    intact({
      files: {
        "values-night/colors.xml": resources('<color name="launch_background">#000000</color>'),
      },
    }),
  );
  assert.deepEqual(distinctRules(nightColor), ["night-variant"]);

  const nightTheme = launchAppearanceIssues(
    intact({
      files: {
        "values-night-v31/themes.xml": resources(
          `<style name="Theme.Duru" parent="${PLATFORM_PARENT}" />`,
        ),
      },
    }),
  );
  assert.deepEqual(distinctRules(nightTheme), ["night-variant"]);

  const unrelated = launchAppearanceIssues(
    intact({
      files: {
        "values-night/colors.xml": resources('<color name="unrelated_accent">#112233</color>'),
      },
    }),
  );
  assert.deepEqual(unrelated, []);
});

test("LA10 the application icon must be @mipmap/ic_launcher and no round icon", () => {
  const oldIcon = launchAppearanceIssues(
    intact({ input: { manifest: manifest({ icon: "@drawable/app_icon" }) } }),
  );
  assert.deepEqual(rulesOf(oldIcon), ["icon", "legacy-icon"]);

  const round = launchAppearanceIssues(
    intact({
      input: {
        manifest: manifest({ applicationExtra: 'android:roundIcon="@mipmap/ic_launcher_round"' }),
      },
    }),
  );
  assert.deepEqual(distinctRules(round), ["icon"]);
});

test("LA11 adaptive icon: file, root, layers, monochrome and the five foreground densities", () => {
  const noFile = launchAppearanceIssues(
    intact({
      files: { "mipmap-anydpi-v26/ic_launcher.xml": null },
      input: { paths: without(INTACT_PATHS, "mipmap-anydpi-v26/ic_launcher.xml") },
    }),
  );
  assert.deepEqual(distinctRules(noFile), ["adaptive-icon"]);

  const wrongRoot = launchAppearanceIssues(
    intact({
      files: { "mipmap-anydpi-v26/ic_launcher.xml": adaptiveIcon({ root: "layer-list" }) },
    }),
  );
  assert.deepEqual(distinctRules(wrongRoot), ["adaptive-icon"]);

  const wrongBackground = launchAppearanceIssues(
    intact({
      files: {
        "mipmap-anydpi-v26/ic_launcher.xml": adaptiveIcon({
          background: "@color/launch_background",
        }),
      },
    }),
  );
  assert.deepEqual(distinctRules(wrongBackground), ["adaptive-icon"]);

  const monochrome = launchAppearanceIssues(
    intact({
      files: {
        "mipmap-anydpi-v26/ic_launcher.xml": adaptiveIcon({
          extra: '<monochrome android:drawable="@mipmap/ic_launcher_foreground" />',
        }),
      },
    }),
  );
  assert.deepEqual(distinctRules(monochrome), ["adaptive-icon"]);

  const missingDensity = launchAppearanceIssues(
    intact({
      input: { paths: without(INTACT_PATHS, "mipmap-xhdpi/ic_launcher_foreground.png") },
    }),
  );
  assert.deepEqual(distinctRules(missingDensity), ["adaptive-icon"]);
});

test("LA12 a leftover drawable/app_icon.png is a legacy icon; comments are not read", () => {
  const leftover = launchAppearanceIssues(
    intact({ input: { paths: [...INTACT_PATHS, "drawable/app_icon.png"] } }),
  );
  assert.deepEqual(rulesOf(leftover), ["legacy-icon"]);

  const commented = launchAppearanceIssues(
    intact({
      input: { manifest: manifest({ comment: '<!-- was android:icon="@drawable/app_icon" -->' }) },
    }),
  );
  assert.deepEqual(commented, []);
});

test("LA13 resolvedThemeItems picks the highest qualifier at or below the API level and merges parents", () => {
  const files = intact().files;

  const api26 = resolvedThemeItems(files, "Theme.Duru", 26);
  assert.equal(api26.get("android:windowBackground"), "@color/launch_background");
  assert.equal(api26.get("android:statusBarColor"), TRANSPARENT);
  assert.equal(api26.has("android:windowLightNavigationBar"), false);
  assert.equal(api26.has("android:windowSplashScreenBackground"), false);

  const api30 = resolvedThemeItems(files, "Theme.Duru", 30);
  assert.equal(api30.get("android:windowLightNavigationBar"), "true");
  assert.equal(api30.get("android:windowBackground"), "@color/launch_background");
  assert.equal(api30.has("android:windowSplashScreenBackground"), false);

  for (const api of [31, 36]) {
    const items = resolvedThemeItems(files, "Theme.Duru", api);
    assert.equal(
      items.get("android:windowSplashScreenBackground"),
      "@color/launch_background",
      `api ${api}`,
    );
    assert.equal(
      items.get("android:windowSplashScreenAnimatedIcon"),
      "@drawable/splash_icon_none",
      `api ${api}`,
    );
    assert.equal(items.get("android:windowLightNavigationBar"), "true", `api ${api}`);
    assert.equal(items.get("android:statusBarColor"), TRANSPARENT, `api ${api}`);
  }

  const small = {
    "values/styles.xml": resources(`<style name="Foo">
      ${item("a", "1")}
      ${item("b", "1")}
    </style>
    <style name="Foo.Bar">
      ${item("b", "2")}
    </style>
    <style name="Baz" parent="Foo">
      ${item("a", "3")}
    </style>`),
  };
  // Implicit parent from the dotted name; the child overrides the parent's same attribute.
  const implicit = resolvedThemeItems(small, "Foo.Bar", 26);
  assert.equal(implicit.get("a"), "1");
  assert.equal(implicit.get("b"), "2");
  // Explicit parent attribute.
  const explicit = resolvedThemeItems(small, "Baz", 26);
  assert.equal(explicit.get("a"), "3");
  assert.equal(explicit.get("b"), "1");

  const unknown = resolvedThemeItems(files, "Theme.Missing", 31);
  assert.equal(unknown.size, 0);
});

test("LA14 resolvedColor follows aliases to an upper-case #RRGGBB and gives null otherwise", () => {
  const files = {
    "values/colors.xml": resources(`<color name="brand">#F46B18</color>
    <color name="step_one">@color/brand</color>
    <color name="step_two">@color/step_one</color>
    <color name="lower">#f46b18</color>
    <color name="opaque_argb">#fff46b18</color>
    <color name="loop_a">@color/loop_b</color>
    <color name="loop_b">@color/loop_a</color>
    <color name="translucent">#80F46B18</color>`),
  };

  assert.equal(resolvedColor(files, "step_two"), "#F46B18");
  assert.equal(resolvedColor(files, "lower"), "#F46B18");
  assert.equal(resolvedColor(files, "opaque_argb"), "#F46B18");
  assert.equal(resolvedColor(files, "does_not_exist"), null);
  assert.equal(resolvedColor(files, "loop_a"), null);
  assert.equal(resolvedColor(files, "translucent"), null);
});
