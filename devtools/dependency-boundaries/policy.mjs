// 모노레포 의존 방향 규칙(ADR-0004 D1 · D4 · ADR-0147)의 순수 판정입니다. 파일 시스템을 읽지 않습니다 —
// 워크스페이스 목록 · package.json · 파일 글자를 받아 위반 목록을 돌려줍니다. 실행은 check.mjs가 합니다.

/** 층입니다. core는 웹 · 앱 · 서버가 함께 읽는 순수 패키지, ui는 Lynx UI 패키지, app은 산출물을 내는 잎입니다. */
export const LAYERS = /** @type {const} */ ({
  "packages/episode-core": "core",
  "packages/companion-contract": "core",
  "packages/ui-lynx": "ui",
});

/** 목록에 없는 workspace의 층 — `apps/*`는 app, 그 밖 `packages/*`는 ui(보수적으로 core 규칙을 걸지 않음). */
export function layerOf(workspaceDir) {
  if (workspaceDir in LAYERS) return LAYERS[workspaceDir];
  return workspaceDir.startsWith("apps/") ? "app" : "ui";
}

/** core가 import하면 안 되는 모듈 — UI · 어댑터(Lynx · 웹 프레임워크 · 서버 SDK) · node 내장. */
export function forbiddenCoreImport(name) {
  return (
    name.startsWith("@lynx-js/") ||
    name === "@libitums/ui-lynx" ||
    name.startsWith("@libitums/ui-lynx/") ||
    name === "@libitums/icons" ||
    name.startsWith("@libitums/icons/") ||
    name === "@libitums/design-tokens" ||
    name.startsWith("@libitums/design-tokens/") ||
    name === "react" ||
    name.startsWith("react/") ||
    name === "react-dom" ||
    name === "astro" ||
    name.startsWith("astro/") ||
    name.startsWith("@supabase/") ||
    name.startsWith("node:")
  );
}

/** core가 쓰면 안 되는 전역 — 브라우저 · Lynx 호스트 · 네트워크. 필요하면 어댑터(앱 · 랜딩)가 주입합니다. */
export const FORBIDDEN_CORE_GLOBALS = new Set([
  "window",
  "document",
  "navigator",
  "localStorage",
  "sessionStorage",
  "location",
  "history",
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "indexedDB",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "lynx",
  "NativeModules",
  "SystemInfo",
]);

/**
 * package.json 의존 선언 판정(D1). `deps`는 dependencies · peerDependencies · optionalDependencies의 이름 목록입니다
 * (devDependencies는 테스트 도구라 보지 않음). `workspaces`는 이름 → 디렉터리.
 */
export function manifestViolations(workspaceDir, deps, workspaces) {
  const layer = layerOf(workspaceDir);
  const out = [];
  for (const name of deps) {
    const target = workspaces.get(name);
    if (target !== undefined) {
      const targetLayer = layerOf(target);
      if (targetLayer === "app")
        out.push({
          rule: "D1",
          message: `${name}(앱)에 의존합니다 — 앱은 잎이라 무엇도 의존하지 않습니다`,
        });
      else if (layer === "core" && targetLayer !== "core")
        out.push({ rule: "D1", message: `core가 ${name}(${targetLayer})에 의존합니다` });
    } else if (layer === "core" && forbiddenCoreImport(name)) {
      out.push({ rule: "D1", message: `core가 UI · 어댑터 패키지 ${name}에 의존합니다` });
    }
  }
  return out;
}

/**
 * 한 파일의 import 판정(D2 · D3). `imports`는 `{ name, line }`, `resolveRelative(name)`은 상대 경로가 가리키는
 * workspace 디렉터리(또는 null — 같은 workspace · workspace 밖).
 */
export function importViolations({ workspaceDir, isTest, imports, workspaces, resolveRelative }) {
  const layer = layerOf(workspaceDir);
  const out = [];
  for (const { name, line } of imports) {
    if (name.startsWith(".")) {
      const target = resolveRelative(name);
      if (target !== null && target !== workspaceDir)
        out.push({
          rule: "D2",
          line,
          message: `다른 workspace(${target})를 상대 경로로 import합니다 — 패키지 이름으로`,
        });
      continue;
    }
    const scoped = name
      .split("/")
      .slice(0, name.startsWith("@") ? 2 : 1)
      .join("/");
    const target = workspaces.get(scoped);
    if (target !== undefined && target !== workspaceDir && layerOf(target) === "app")
      out.push({ rule: "D2", line, message: `앱 ${scoped}을 import합니다 — 앱은 잎입니다` });
    if (layer === "core" && !isTest && forbiddenCoreImport(name))
      out.push({
        rule: "D3",
        line,
        message: `core가 ${name}을 import합니다(UI · 어댑터 · node 금지)`,
      });
  }
  return out;
}

/** core의 전역 판정(D4). `globals`는 `{ name, line }` — 지역 선언이 아닌 식별자 참조만. */
export function globalViolations({ workspaceDir, isTest, globals }) {
  if (layerOf(workspaceDir) !== "core" || isTest) return [];
  return globals
    .filter(({ name }) => FORBIDDEN_CORE_GLOBALS.has(name))
    .map(({ name, line }) => ({
      rule: "D4",
      line,
      message: `core가 전역 ${name}을 씁니다 — 브라우저 · 호스트 전역은 어댑터가 주입합니다`,
    }));
}

/** 테스트 · 테스트 지원 파일 — core 금지(D3 · D4)는 걸지 않고 방향(D2)만 봅니다. */
export function isTestPath(file) {
  return (
    /\.(test|test-support)\.(ts|tsx|mts|mjs|js)$/.test(file) || /(^|\/)test-helpers\//.test(file)
  );
}
