import assert from "node:assert/strict";
import test from "node:test";

import { statusBarMarkerIssues, statusBarSurfaceRegistry } from "./host-status-bar-icons.mjs";

const MARKER_SOURCE = `export type StatusBarIconMarker = "light-icons";
export const lightStatusBarIcons: StatusBarIconMarker = "light-icons";
`;

const hostSource = ({
  lightIcons = "light-icons",
  key = "statusbar",
} = {}) => `package com.libitum.host;
final class StatusBarIcons {
  static final String DATASET_KEY = "${key}";
  static final String LIGHT_ICONS = "${lightIcons}";
  enum Tone { DARK, LIGHT }
}
`;

/** `StatusBarIconSync.java`의 본문. `body`가 `sync` 안에 들어간다. */
const syncSource = ({ body = "", beforeClass = "" } = {}) => `package com.libitum.host;
${beforeClass}
final class StatusBarIconSync {
  void sync(LynxView lynxView) {
    if (lynxView == null) return;
    ${body}
    WindowCompat.getInsetsController(window, window.getDecorView())
        .setAppearanceLightStatusBars(true);
  }
}
`;

const mainActivity = ({
  firstScreen = "statusBarIcons.sync(lynxView);",
  pageUpdate = "statusBarIcons.sync(lynxView);",
  edgeToEdge = `bars.setAppearanceLightStatusBars(true);
    bars.setAppearanceLightNavigationBars(true);`,
} = {}) => `package com.libitum.host;
public final class MainActivity {
  StatusBarIconSync statusBarIcons;
  private void create() {
    lynxView.addLynxViewClient(new LynxViewClient() {
      @Override public void onFirstScreen() {
        ${firstScreen}
        mainHandler.post(() -> AccessibilityTapBridge.sync(lynxView));
      }

      @Override public void onPageUpdate() {
        ${pageUpdate}
        mainHandler.post(() -> AccessibilityTapBridge.sync(lynxView));
      }
    });
  }

  private void layoutEdgeToEdge() {
    WindowInsetsControllerCompat bars = WindowCompat.getInsetsController(window, decor);
    ${edgeToEdge}
  }
}
`;

const carrierComponent = (
  name,
  className,
  attr = "data-statusbar={lightStatusBarIcons}",
) => `import { lightStatusBarIcons } from "../../lib/status-bar-icons";
export function ${name}() {
  return (
    <view className="${className}" data-testid="${className}" ${attr}>
      <text>${name}</text>
    </view>
  );
}
`;

const plainComponent = (name, className) => `export function ${name}() {
  return (
    <view className="${className}" data-testid="${className}">
      <text>${name}</text>
    </view>
  );
}
`;

const journeyMapScreen = ({
  rootAttr = "",
  scrimAttr = "data-statusbar={lightStatusBarIcons}",
} = {}) => `import { lightStatusBarIcons } from "../../lib/status-bar-icons";
export function JourneyMapScreen() {
  return (
    <view className="journey-map-screen" data-testid="journey-map-screen" ${rootAttr}>
      {guide.visible ? (
        <view className="first-unit-map-scrim" data-testid="first-unit-guide-map" ${scrimAttr}>
          <text>guide</text>
        </view>
      ) : null}
    </view>
  );
}
`;

const CARRIER_PATHS = {
  intro: "screens/episode-intro/EpisodeIntroScreen.tsx",
  narrative: "screens/episode-narrative/EpisodeNarrativeScreen.tsx",
  final: "screens/episode-final/EpisodeFinalScreen.tsx",
  visualNovel: "screens/visual-novel/VisualNovelScreen.tsx",
  entry: "screens/journey-entry/JourneyEntryScreen.tsx",
  statModal: "screens/journey-map/JourneyStatModal.tsx",
  guide: "components/FirstUnitGuide.tsx",
  map: "screens/journey-map/JourneyMapScreen.tsx",
};

const CHAT_PATH = "screens/prologue/PrologueChatScreen.tsx";

const appSession = (
  routes = [
    "episode-intro",
    "episode-prologue",
    "episode-final",
    "visual-novel",
    "roleplay-visual-novel",
    "journey-entry",
  ],
) => `function isFullBleedScreen(screen: Screen): boolean {
  return (
    ${routes.map((route) => `screen.name === "${route}"`).join(" ||\n    ")}
  );
}
`;

const FIXED_CSS = ".layer {\n  position: fixed;\n  inset: 0;\n}\n";
const STAT_MODAL_CSS_PATH = "screens/journey-map/journey-stat-modal.css";
const FIXED_CSS_PATHS = [
  STAT_MODAL_CSS_PATH,
  "screens/gem-purchase/gem-purchase-screen.css",
  "components/first-unit-guide.css",
];

const STAT_MODAL_INSET_STYLE = 'style={slot === "c" ? { top: `${insets.top}px` } : undefined}';

/** 연속 학습 모달 — 운석 셋을 그리고, c의 `top`을 `style` 한 줄이 정한다(spec r03.1). */
const statModalComponent = ({ meteorStyle = STAT_MODAL_INSET_STYLE } = {}) =>
  `import { lightStatusBarIcons } from "../../lib/status-bar-icons";
export function JourneyStatModal() {
  const insets = safeAreaInsetsFrom(useGlobalProps());
  return (
    <view className="journey-stat-modal" data-testid="journey-stat-modal" data-statusbar={lightStatusBarIcons}>
      <view className="journey-stat-modal-decor">
        {(["a", "b", "c"] as const).map((slot) => (
          <svg
            key={slot}
            className={\`journey-stat-modal-meteor journey-stat-modal-meteor-\${slot}\`}
            ${meteorStyle}
          />
        ))}
      </view>
    </view>
  );
}
`;

/** `position: fixed` 층 하나와 운석 셋의 자리. c의 규칙 본문만 바꿔 끼운다. */
const statModalCss = ({ meteorC = "  right: 21px;\n" } = {}) =>
  `${FIXED_CSS}
.journey-stat-modal-meteor-a {
  left: -29px;
  top: 238px;
}

.journey-stat-modal-meteor-b {
  right: 21px;
  top: 379px;
}

.journey-stat-modal-meteor-c {
${meteorC}}
`;

/** A contract-conforming input (spec 4 + r02 + r03); every part can be overridden. */
function healthy(overrides = {}) {
  return {
    markerSource: MARKER_SOURCE,
    hostSource: hostSource(),
    mainActivitySource: mainActivity(),
    syncSource: syncSource(),
    componentSources: {
      [CARRIER_PATHS.intro]: carrierComponent("EpisodeIntroScreen", "episode-intro-screen"),
      [CARRIER_PATHS.narrative]: carrierComponent("EpisodeNarrativeScreen", "episode-narrative"),
      [CARRIER_PATHS.final]: carrierComponent("EpisodeFinalScreen", "episode-final-screen"),
      [CARRIER_PATHS.visualNovel]: carrierComponent("VisualNovelScreen", "visual-novel-screen"),
      [CARRIER_PATHS.entry]: carrierComponent("JourneyEntryScreen", "journey-entry-screen"),
      [CARRIER_PATHS.statModal]: statModalComponent(),
      [CARRIER_PATHS.guide]: carrierComponent("FirstUnitGuide", "first-unit-guide"),
      [CARRIER_PATHS.map]: journeyMapScreen(),
      [CHAT_PATH]: plainComponent("PrologueChatScreen", "prologue-chat-screen"),
      "screens/splash/SplashScreen.tsx": plainComponent("SplashScreen", "splash-screen"),
    },
    cssSources: {
      ...Object.fromEntries(FIXED_CSS_PATHS.map((path) => [path, FIXED_CSS])),
      [STAT_MODAL_CSS_PATH]: statModalCss(),
    },
    appSessionSource: appSession(),
    ...overrides,
  };
}

/** `healthy()` with one component replaced or added. */
function withComponent(path, source) {
  const base = healthy();
  return healthy({ componentSources: { ...base.componentSources, [path]: source } });
}

const rulesOf = (input) => statusBarMarkerIssues(input).map((issue) => issue.rule);

function assertRule(input, rule, messageIncludes) {
  const issues = statusBarMarkerIssues(input);
  const hit = issues.filter((issue) => issue.rule === rule);
  assert.ok(
    hit.length > 0,
    `expected a "${rule}" issue, got: ${JSON.stringify(issues.map((issue) => issue.rule))}`,
  );
  if (messageIncludes !== undefined) {
    assert.ok(
      hit.some((issue) => issue.message.includes(messageIncludes)),
      `expected a "${rule}" message to mention "${messageIncludes}", got: ${JSON.stringify(hit)}`,
    );
  }
}

test("SM1: a contract-conforming fixture has no issues", () => {
  assert.deepEqual(statusBarMarkerIssues(healthy()), []);
});

test('SM2: JS constant "light" vs host "light-icons" is a marker-value issue', () => {
  assertRule(
    healthy({ markerSource: MARKER_SOURCE.replaceAll('"light-icons"', '"light"') }),
    "marker-value",
  );
});

test("SM3: a component attribute that is not the host dataset key is a marker-key issue", () => {
  assertRule(
    withComponent(
      CARRIER_PATHS.intro,
      carrierComponent(
        "EpisodeIntroScreen",
        "episode-intro-screen",
        "data-status-bar={lightStatusBarIcons}",
      ),
    ),
    "marker-key",
  );
});

test("SM4: a registered component that lost its marker is a carrier issue naming the file", () => {
  assertRule(
    withComponent(
      CARRIER_PATHS.final,
      plainComponent("EpisodeFinalScreen", "episode-final-screen"),
    ),
    "carrier",
    CARRIER_PATHS.final,
  );
});

test("SM5: a marker on a file outside the registry is a stray-marker issue", () => {
  assertRule(
    withComponent(CHAT_PATH, carrierComponent("PrologueChatScreen", "prologue-chat-screen")),
    "stray-marker",
    "PrologueChatScreen.tsx",
  );
});

test("SM6: a literal or conditional marker value is a stray-marker issue", () => {
  assertRule(
    withComponent(
      CARRIER_PATHS.intro,
      carrierComponent(
        "EpisodeIntroScreen",
        "episode-intro-screen",
        'data-statusbar="light-icons"',
      ),
    ),
    "stray-marker",
  );
  assertRule(
    withComponent(
      CARRIER_PATHS.intro,
      carrierComponent(
        "EpisodeIntroScreen",
        "episode-intro-screen",
        "data-statusbar={open ? lightStatusBarIcons : undefined}",
      ),
    ),
    "stray-marker",
  );
});

test("SM7: a new full-bleed route without a registry entry is a full-bleed-registry issue", () => {
  assertRule(
    healthy({
      appSessionSource: appSession([
        "episode-intro",
        "episode-prologue",
        "episode-final",
        "visual-novel",
        "roleplay-visual-novel",
        "journey-entry",
        "brand-new-route",
      ]),
    }),
    "full-bleed-registry",
    "brand-new-route",
  );
});

test("SM8: an extra position: fixed CSS is a fixed-layer-registry issue; comments do not count", () => {
  const base = healthy();
  assertRule(
    healthy({ cssSources: { ...base.cssSources, "screens/new/new-layer.css": FIXED_CSS } }),
    "fixed-layer-registry",
    "new-layer.css",
  );
  const commented = healthy({
    cssSources: {
      ...base.cssSources,
      "screens/new/commented.css": "/* position: fixed; */\n.a {\n  color: red;\n}\n",
    },
  });
  assert.ok(
    !rulesOf(commented).includes("fixed-layer-registry"),
    "a position: fixed inside a comment must not be counted",
  );
});

test("SM9: MainActivity must call sync directly in onFirstScreen and onPageUpdate (host-wiring)", () => {
  assertRule(healthy({ mainActivitySource: mainActivity({ pageUpdate: "" }) }), "host-wiring");
  assertRule(healthy({ mainActivitySource: mainActivity({ firstScreen: "" }) }), "host-wiring");
  assertRule(
    healthy({
      mainActivitySource: mainActivity({
        pageUpdate: "mainHandler.post(() -> { statusBarIcons.sync(lynxView); });",
      }),
    }),
    "host-wiring",
  );
});

test("SM15: StatusBarIconSync must not defer the apply — post / postDelayed / Handler / Executor / new Thread (host-wiring)", () => {
  assert.deepEqual(statusBarMarkerIssues(healthy({ syncSource: syncSource() })), []);
  const deferrals = {
    "window.getDecorView().post(": "window.getDecorView().post(() -> apply(next));",
    "postDelayed(": "lynxView.postDelayed(() -> apply(next), 16);",
    Handler: "new Handler(Looper.getMainLooper()).post(() -> apply(next));",
    Executor: "executor.execute(() -> apply(next));",
    "new Thread": "new Thread(() -> apply(next)).start();",
  };
  for (const [name, body] of Object.entries(deferrals)) {
    assertRule(healthy({ syncSource: syncSource({ body }) }), "host-wiring");
    assert.ok(
      statusBarMarkerIssues(healthy({ syncSource: syncSource({ body }) })).some(
        (issue) => issue.rule === "host-wiring" && issue.message.includes("StatusBarIconSync"),
      ),
      `${name}: the message must name StatusBarIconSync`,
    );
  }
  // 필드 · import로 들여와도 미루는 수단이다.
  assertRule(
    healthy({
      syncSource: syncSource({ beforeClass: "import android.os.Handler;" }),
    }),
    "host-wiring",
  );
});

test("SM15: words inside comments or an absent syncSource are not a deferral", () => {
  const commented = syncSource({
    body: `// no Handler, no post( and no new Thread here
    /* postDelayed( and Executor are not used either */`,
  });
  assert.deepEqual(statusBarMarkerIssues(healthy({ syncSource: commented })), []);
  const { syncSource: _omitted, ...withoutSync } = healthy();
  assert.doesNotThrow(() => statusBarMarkerIssues(withoutSync));
  assert.ok(
    !rulesOf(withoutSync).includes("host-wiring"),
    "an input without syncSource must not add a host-wiring issue",
  );
});

test("SM10: the layoutEdgeToEdge defaults must stay and never turn the navigation icons light (host-default)", () => {
  assertRule(
    healthy({
      mainActivitySource: mainActivity({
        edgeToEdge: "bars.setAppearanceLightNavigationBars(true);",
      }),
    }),
    "host-default",
  );
  assertRule(
    healthy({
      mainActivitySource: mainActivity({
        edgeToEdge: `bars.setAppearanceLightStatusBars(true);
    bars.setAppearanceLightNavigationBars(true);
    bars.setAppearanceLightNavigationBars(false);`,
      }),
    }),
    "host-default",
  );
});

test("SM11: statusBarSurfaceRegistry matches the contract (six routes, three CSS layers)", () => {
  const { fullBleedRoutes, fixedLayers } = statusBarSurfaceRegistry;
  assert.deepEqual(Object.keys(fullBleedRoutes).sort(), [
    "episode-final",
    "episode-intro",
    "episode-prologue",
    "journey-entry",
    "roleplay-visual-novel",
    "visual-novel",
  ]);
  const routeText = (route) => JSON.stringify(fullBleedRoutes[route]);
  assert.match(routeText("episode-intro"), /EpisodeIntroScreen/);
  assert.match(routeText("episode-prologue"), /EpisodeNarrativeScreen/);
  assert.match(routeText("episode-final"), /EpisodeNarrativeScreen/);
  assert.match(routeText("episode-final"), /EpisodeFinalScreen/);
  assert.match(routeText("visual-novel"), /VisualNovelScreen/);
  assert.match(routeText("roleplay-visual-novel"), /VisualNovelScreen/);
  assert.match(routeText("journey-entry"), /JourneyEntryScreen/);

  assert.deepEqual(Object.keys(fixedLayers).sort(), [
    "components/first-unit-guide.css",
    "screens/gem-purchase/gem-purchase-screen.css",
    "screens/journey-map/journey-stat-modal.css",
  ]);
  const layerText = (path) => JSON.stringify(fixedLayers[path]);
  assert.match(layerText("screens/journey-map/journey-stat-modal.css"), /light-icons/);
  assert.match(layerText("screens/journey-map/journey-stat-modal.css"), /JourneyStatModal/);
  assert.match(layerText("screens/gem-purchase/gem-purchase-screen.css"), /unreachable/);
  const guide = layerText("components/first-unit-guide.css");
  assert.match(guide, /light-icons/);
  assert.doesNotMatch(guide, /dark-icons/);
  assert.match(guide, /FirstUnitGuide\.tsx/);
  assert.match(guide, /JourneyMapScreen\.tsx/);
  assert.match(guide, /first-unit-map-scrim/);
});

test("SM12: empty strings and empty objects do not throw and are reported as issues", () => {
  const empty = {
    markerSource: "",
    hostSource: "",
    mainActivitySource: "",
    componentSources: {},
    cssSources: {},
    appSessionSource: "",
  };
  assert.doesNotThrow(() => statusBarMarkerIssues(empty));
  assert.ok(statusBarMarkerIssues(empty).length >= 1, "empty input must be reported");
  assert.doesNotThrow(() => statusBarMarkerIssues({}));
  const missingKeys = statusBarMarkerIssues({});
  assert.ok(Array.isArray(missingKeys) && missingKeys.length >= 1);
});

test("SM13: the map marker must sit on the first-unit-map-scrim tag, not the screen root (carrier)", () => {
  assertRule(
    withComponent(
      CARRIER_PATHS.map,
      journeyMapScreen({ rootAttr: "data-statusbar={lightStatusBarIcons}", scrimAttr: "" }),
    ),
    "carrier",
    CARRIER_PATHS.map,
  );
  assertRule(
    withComponent(CARRIER_PATHS.map, journeyMapScreen({ scrimAttr: "" })),
    "carrier",
    CARRIER_PATHS.map,
  );
});

/** `healthy()`에서 연속 학습 모달의 CSS와 TSX만 바꾼다. */
function withStatModal({ css, tsx } = {}) {
  const base = healthy();
  return healthy({
    cssSources: {
      ...base.cssSources,
      ...(css === undefined ? {} : { [STAT_MODAL_CSS_PATH]: css }),
    },
    componentSources: {
      ...base.componentSources,
      ...(tsx === undefined ? {} : { [CARRIER_PATHS.statModal]: tsx }),
    },
  });
}

test("SM14: the streak-modal meteor c must sit below the top inset — no CSS top, the inline top comes from insets.top (band-decor)", () => {
  // (a) CSS에 음수 top이 남아 있다.
  assertRule(
    withStatModal({ css: statModalCss({ meteorC: "  right: 21px;\n  top: -17px;\n" }) }),
    "band-decor",
  );
  // (b) top: 0이라도 CSS에 두면 안 된다 — 값은 인라인이 정한다.
  assertRule(
    withStatModal({ css: statModalCss({ meteorC: "  right: 21px;\n  top: 0;\n" }) }),
    "band-decor",
  );
  // (c) CSS에는 없지만 TSX의 c가 inset에서 오지 않는다 — 상수, 또는 style 자체가 없다.
  assertRule(
    withStatModal({
      tsx: statModalComponent({ meteorStyle: 'style={slot === "c" ? { top: "0px" } : undefined}' }),
    }),
    "band-decor",
  );
  assertRule(
    withStatModal({
      tsx: statModalComponent({
        meteorStyle: 'style={slot === "c" ? { top: "50px" } : undefined}',
      }),
    }),
    "band-decor",
  );
  assertRule(withStatModal({ tsx: statModalComponent({ meteorStyle: "" }) }), "band-decor");
  // (d) CSS에 top이 없고 TSX가 insets.top으로 준다 — 위반 없음. a · b의 CSS top은 세지 않는다.
  assert.ok(
    !rulesOf(withStatModal({})).includes("band-decor"),
    "insets.top으로 c를 내린 모양은 band-decor가 아니다",
  );
  assert.deepEqual(statusBarMarkerIssues(withStatModal({})), []);
  // 주석 안의 top: -17px은 세지 않는다.
  assert.ok(
    !rulesOf(
      withStatModal({
        css: statModalCss({
          meteorC: "  right: 21px;\n  /* top: -17px; 예전 자리 */\n",
        }),
      }),
    ).includes("band-decor"),
    "a top: -17px inside a CSS comment must not be counted",
  );
});
