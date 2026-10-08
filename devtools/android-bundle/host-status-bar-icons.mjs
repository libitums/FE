// 정본은 android-status-bar-appearance 계약 4절과 r02.5. 순수 함수 — 파일을 읽지 않는다.
// 소스를 훑는 도구는 host-status-bar-icons.source.mjs에 있다.

import {
  jsxOpeningTagAt,
  methodBody,
  openingTagsWithClass,
  stripComments,
  text,
  withoutPostCalls,
} from "./host-status-bar-icons.source.mjs";

/**
 * @typedef {{ rule: string, message: string }} StatusBarMarkerIssue
 * @typedef {{
 *   markerSource: string,
 *   hostSource: string,
 *   mainActivitySource: string,
 *   componentSources: Record<string, string>,
 *   cssSources: Record<string, string>,
 *   appSessionSource: string,
 *   syncSource?: string,
 * }} StatusBarMarkerInput
 */

const MARKER = "data-statusbar={lightStatusBarIcons}";
const MARKER_ATTRIBUTE = "data-statusbar";
const MAP_SCRIM = "first-unit-map-scrim";

/** 띠를 스스로 칠하는 면의 분류. 이 표가 단일 출처다. */
export const statusBarSurfaceRegistry = {
  /** route → 그 route에서 띠를 어둡게 칠하는 컴포넌트(채팅 · 통화 구간은 밝아 표지가 없다). */
  fullBleedRoutes: {
    "episode-intro": ["EpisodeIntroScreen"],
    "episode-prologue": ["EpisodeNarrativeScreen"],
    "episode-final": ["EpisodeNarrativeScreen", "EpisodeFinalScreen"],
    "visual-novel": ["VisualNovelScreen"],
    "roleplay-visual-novel": ["VisualNovelScreen"],
    "journey-entry": ["JourneyEntryScreen"],
  },
  /** 표지를 다는 컴포넌트 이름 → 파일(`apps/mobile/src` 기준). */
  componentFiles: {
    EpisodeIntroScreen: "screens/episode-intro/EpisodeIntroScreen.tsx",
    EpisodeNarrativeScreen: "screens/episode-narrative/EpisodeNarrativeScreen.tsx",
    EpisodeFinalScreen: "screens/episode-final/EpisodeFinalScreen.tsx",
    VisualNovelScreen: "screens/visual-novel/VisualNovelScreen.tsx",
    JourneyEntryScreen: "screens/journey-entry/JourneyEntryScreen.tsx",
  },
  /** `position: fixed` CSS → 분류와 표지를 다는 요소. `className`이 있으면 그 요소의 여는 태그에만 단다. */
  fixedLayers: {
    "screens/journey-map/journey-stat-modal.css": {
      classification: "light-icons",
      carriers: [
        { component: "JourneyStatModal", file: "screens/journey-map/JourneyStatModal.tsx" },
      ],
    },
    "screens/gem-purchase/gem-purchase-screen.css": {
      classification: "unreachable",
      carriers: [],
    },
    "components/first-unit-guide.css": {
      classification: "light-icons",
      carriers: [
        { component: "FirstUnitGuide", file: "components/FirstUnitGuide.tsx" },
        {
          component: "JourneyMapScreen",
          file: "screens/journey-map/JourneyMapScreen.tsx",
          className: MAP_SCRIM,
        },
      ],
    },
  },
};

/** 등록부가 표지를 요구하는 파일 → 기준 클래스(없으면 null). */
function carrierTargets() {
  const targets = new Map();
  const { fullBleedRoutes, componentFiles, fixedLayers } = statusBarSurfaceRegistry;
  for (const names of Object.values(fullBleedRoutes)) {
    for (const name of names) targets.set(componentFiles[name], null);
  }
  for (const layer of Object.values(fixedLayers)) {
    if (layer.classification !== "light-icons") continue;
    for (const carrier of layer.carriers) targets.set(carrier.file, carrier.className ?? null);
  }
  return targets;
}

/** 테스트 파일은 선택자로 속성 이름을 적을 뿐이라 표지의 자리가 아니다. */
const isTestFile = (path) => /\.test\.[cm]?[jt]sx?$/.test(path);

function constantValue(source, pattern) {
  const match = pattern.exec(stripComments(source));
  return match === null ? null : match[1];
}

function markerIssues(input) {
  const issues = [];
  const jsValue = constantValue(input.markerSource, /\blightStatusBarIcons\b[^=\n]*=\s*"([^"]*)"/);
  const hostValue = constantValue(input.hostSource, /\bLIGHT_ICONS\s*=\s*"([^"]*)"/);
  if (jsValue === null || hostValue === null || jsValue !== hostValue) {
    issues.push({
      rule: "marker-value",
      message: `JS 상수(${jsValue ?? "없음"})와 StatusBarIcons.LIGHT_ICONS(${hostValue ?? "없음"})가 다르거나 찾지 못했습니다.`,
    });
  }
  const hostKey = constantValue(input.hostSource, /\bDATASET_KEY\s*=\s*"([^"]*)"/);
  const used = new Map();
  for (const [path, source] of Object.entries(input.componentSources)) {
    if (isTestFile(path)) continue;
    for (const match of text(source).matchAll(
      /\bdata-([\w-]+)\s*=\s*\{\s*lightStatusBarIcons\s*\}/g,
    )) {
      used.set(match[1], path);
    }
  }
  for (const [key, path] of used) {
    if (key !== hostKey) {
      issues.push({
        rule: "marker-key",
        message: `${path}의 속성 data-${key}가 StatusBarIcons.DATASET_KEY(${hostKey ?? "없음"})와 다릅니다.`,
      });
    }
  }
  return issues;
}

function carrierIssues(input) {
  const issues = [];
  const targets = carrierTargets();
  for (const [path, className] of targets) {
    const source = stripComments(input.componentSources[path]);
    const hasMarker =
      className === null
        ? source.includes(MARKER)
        : openingTagsWithClass(source, className).some((tag) => tag.includes(MARKER));
    if (!hasMarker) {
      const where = className === null ? "" : `(className ${className}인 요소에)`;
      issues.push({ rule: "carrier", message: `${path}에 ${MARKER}${where}가 없습니다.` });
    }
  }
  for (const [path, raw] of Object.entries(input.componentSources)) {
    if (isTestFile(path)) continue;
    const source = stripComments(raw);
    const total = source.split(MARKER_ATTRIBUTE).length - 1;
    if (total === 0) continue;
    if (!targets.has(path)) {
      issues.push({
        rule: "stray-marker",
        message: `등록부 밖의 ${path}에 ${MARKER_ATTRIBUTE}가 있습니다.`,
      });
    } else if (source.split(MARKER).length - 1 !== total) {
      issues.push({
        rule: "stray-marker",
        message: `${path}의 ${MARKER_ATTRIBUTE} 값이 상수 lightStatusBarIcons가 아닌 리터럴 · 조건식입니다.`,
      });
    }
  }
  return issues;
}

const STAT_MODAL_CSS = "screens/journey-map/journey-stat-modal.css";
const STAT_MODAL_TSX = "screens/journey-map/JourneyStatModal.tsx";

/** 연속 학습 모달의 운석 c — CSS에는 `top`이 없고, TSX의 인라인 `top`이 `insets.top`에서 온다. */
function bandDecorIssues(input) {
  const issues = [];
  const css = stripComments(input.cssSources[STAT_MODAL_CSS]);
  const rule = /\.journey-stat-modal-meteor-c\s*\{([^}]*)\}/.exec(css);
  if (rule !== null && /(?:^|[\s;])top\s*:/.test(rule[1])) {
    issues.push({
      rule: "band-decor",
      message: `${STAT_MODAL_CSS}의 .journey-stat-modal-meteor-c에 top 선언이 있습니다 — 값은 인라인이 정합니다.`,
    });
  }
  const tsx = stripComments(input.componentSources[STAT_MODAL_TSX]);
  const tags = [...tsx.matchAll(/journey-stat-modal-meteor-/g)]
    .map((match) => tsx.lastIndexOf("<", match.index))
    .filter((start) => start !== -1)
    .map((start) => jsxOpeningTagAt(tsx, start));
  const fromInset = /\btop\s*:\s*`\$\{\s*insets\.top\s*\}px`/;
  if (!tags.some((tag) => fromInset.test(tag))) {
    issues.push({
      rule: "band-decor",
      message: `${STAT_MODAL_TSX}의 운석 c의 top이 insets.top에서 오지 않습니다.`,
    });
  }
  return issues;
}

function difference(actual, expected) {
  return {
    extra: [...actual].filter((name) => !expected.has(name)),
    missing: [...expected].filter((name) => !actual.has(name)),
  };
}

function registryIssues(input) {
  const issues = [];
  const body = methodBody(stripComments(input.appSessionSource), "isFullBleedScreen");
  if (body === null) {
    issues.push({ rule: "full-bleed-registry", message: "isFullBleedScreen을 찾지 못했습니다." });
  } else {
    const routes = new Set([...body.matchAll(/screen\.name\s*===\s*"([^"]+)"/g)].map((m) => m[1]));
    const diff = difference(routes, new Set(Object.keys(statusBarSurfaceRegistry.fullBleedRoutes)));
    for (const route of diff.extra) {
      issues.push({
        rule: "full-bleed-registry",
        message: `route ${route}가 등록부 fullBleedRoutes에 없습니다.`,
      });
    }
    for (const route of diff.missing) {
      issues.push({
        rule: "full-bleed-registry",
        message: `등록부의 route ${route}가 isFullBleedScreen에 없습니다.`,
      });
    }
  }
  const fixed = new Set(
    Object.entries(input.cssSources)
      .filter(([, css]) =>
        /position\s*:\s*fixed\b/.test(text(css).replace(/\/\*[\s\S]*?\*\//g, "")),
      )
      .map(([path]) => path),
  );
  const layers = difference(fixed, new Set(Object.keys(statusBarSurfaceRegistry.fixedLayers)));
  for (const path of layers.extra) {
    issues.push({
      rule: "fixed-layer-registry",
      message: `position: fixed인 ${path}가 등록부 fixedLayers에 없습니다.`,
    });
  }
  for (const path of layers.missing) {
    issues.push({
      rule: "fixed-layer-registry",
      message: `등록부의 ${path}에 position: fixed가 없습니다.`,
    });
  }
  return issues;
}

/** `StatusBarIconSync`가 적용을 다른 콜로 미루는 수단. */
const DEFERRAL_PATTERNS = [
  /\bpost\s*\(/,
  /\bpostDelayed\s*\(/,
  /Handler/,
  /executor/i,
  /\bnew\s+Thread\b/,
];

function hostIssues(input) {
  const issues = [];
  const activity = stripComments(input.mainActivitySource);
  for (const callback of ["onFirstScreen", "onPageUpdate"]) {
    const body = methodBody(activity, callback);
    const direct =
      body !== null && /\bstatusBarIcons\s*\.\s*sync\s*\(/.test(withoutPostCalls(body));
    if (!direct) {
      issues.push({
        rule: "host-wiring",
        message: `MainActivity.${callback}가 post 밖에서 statusBarIcons.sync를 직접 부르지 않습니다.`,
      });
    }
  }
  const sync = stripComments(input.syncSource);
  const deferral = DEFERRAL_PATTERNS.find((pattern) => pattern.test(sync));
  if (deferral !== undefined) {
    issues.push({
      rule: "host-wiring",
      message: `StatusBarIconSync가 적용을 미루는 수단(${deferral.source})을 씁니다 — 같은 메인 스레드 콜 안에서 적용해야 합니다.`,
    });
  }
  const edge = (methodBody(activity, "layoutEdgeToEdge") ?? "").replace(/\s+/g, "");
  for (const call of [
    "setAppearanceLightStatusBars(true)",
    "setAppearanceLightNavigationBars(true)",
  ]) {
    if (!edge.includes(call)) {
      issues.push({ rule: "host-default", message: `layoutEdgeToEdge에 ${call}가 없습니다.` });
    }
  }
  const lightNavOff = /setAppearanceLightNavigationBars\s*\(\s*false\s*\)/;
  if (lightNavOff.test(activity) || lightNavOff.test(stripComments(input.hostSource))) {
    issues.push({
      rule: "host-default",
      message: "setAppearanceLightNavigationBars(false)를 부르면 안 됩니다.",
    });
  }
  return issues;
}

/**
 * @param {StatusBarMarkerInput} input
 * @returns {StatusBarMarkerIssue[]} 위반이 없으면 빈 배열입니다.
 */
export function statusBarMarkerIssues(input) {
  const source = input ?? {};
  const normalized = {
    markerSource: text(source.markerSource),
    hostSource: text(source.hostSource),
    mainActivitySource: text(source.mainActivitySource),
    componentSources: { ...source.componentSources },
    cssSources: { ...source.cssSources },
    appSessionSource: text(source.appSessionSource),
    syncSource: text(source.syncSource),
  };
  return [
    ...markerIssues(normalized),
    ...carrierIssues(normalized),
    ...registryIssues(normalized),
    ...hostIssues(normalized),
    ...bandDecorIssues(normalized),
  ];
}
