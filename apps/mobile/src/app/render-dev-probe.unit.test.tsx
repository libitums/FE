import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

import { HandwritingProbeScreen } from "../screens/handwriting-probe/HandwritingProbeScreen";
import { SpeechProbeScreen } from "../screens/speech-probe/SpeechProbeScreen";
import { renderScreen } from "./render-screen";
import type { ScreenWiring } from "./screen-wiring";

// 개발용 탐침 화면 둘을 release 번들에서 빼는 약속(DP)입니다. 번들러가 `__DEV__`를 상수로
// 바꿔 넣고, 쓰이지 않는 import를 통째로 버리게 하는 것이 수단입니다. 실제로 빠졌는지는
// `apps/mobile/dist/main.lynx.bundle`을 grep해서 봅니다(성능 보고서). 여기서는 그 수단이
// 코드 모양으로 서 있는지와, `__DEV__`에 따라 화면이 갈리는지를 지킵니다.

const appDir = __dirname;
const srcDir = join(appDir, "..");
const mobileDir = join(srcDir, "..");

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

// 탐침 화면은 props도 콜백도 받지 않습니다 — 결선 값을 읽지 않으므로 빈 결선으로 부릅니다.
const noWiring = {} as ScreenWiring;

describe("DP-U 탐침 route는 __DEV__에서만 화면을 그린다", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("DP-U1. dev 빌드(__DEV__ = true)에서는 두 탐침 route가 각자의 탐침 화면을 그린다", () => {
    vi.stubGlobal("__DEV__", true);

    expect(renderScreen({ name: "handwriting-probe" }, noWiring)).toMatchObject({
      type: HandwritingProbeScreen,
    });
    expect(renderScreen({ name: "speech-probe" }, noWiring)).toMatchObject({
      type: SpeechProbeScreen,
    });
  });

  test("DP-U2. release 빌드(__DEV__ = false)에서는 두 탐침 route가 아무것도 그리지 않는다", () => {
    vi.stubGlobal("__DEV__", false);

    expect(renderScreen({ name: "handwriting-probe" }, noWiring)).toBeNull();
    expect(renderScreen({ name: "speech-probe" }, noWiring)).toBeNull();
  });
});

// `src` 기준 상대 경로를 `/`로 맞춰 돌려줍니다 — Windows의 `\` 구분자에서도 아래 경로 정규식과
// 기대값이 같은 글자로 맞습니다.
function productionSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
    .filter((entry) => !/\.test\.tsx?$/.test(entry.name) && !/test-support/.test(entry.name))
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join("/"));
}

const probeScreenImport = /from\s+["'][^"']*screens\/(handwriting|speech)-probe\//;

describe("DP-S 탐침 import는 dev 전용 모듈 하나에만 있다", () => {
  test("DP-S1. 탐침 폴더 밖에서 탐침 화면을 import하는 제품 파일은 render-dev-probe.tsx 하나다", () => {
    const importers = productionSources(srcDir)
      .filter((file) => !/^screens\/(handwriting|speech)-probe\//.test(file))
      .filter((file) =>
        probeScreenImport.test(withoutComments(readFileSync(join(srcDir, file), "utf8"))),
      );

    expect(importers).toEqual(["app/render-dev-probe.tsx"]);
  });

  test("DP-S2. render-screen.tsx는 renderDevProbe를 __DEV__ 삼항 안에서만 부른다", () => {
    const source = withoutComments(readFileSync(join(appDir, "render-screen.tsx"), "utf8"));
    const calls = [...source.matchAll(/renderDevProbe\(/g)].length;
    const guarded = [...source.matchAll(/__DEV__\s*\?\s*renderDevProbe\(/g)].length;

    expect(calls).toBeGreaterThan(0);
    expect(guarded).toBe(calls);
  });

  test("DP-S3. lynx.config.ts가 render-dev-probe.tsx를 부수 효과 없는 모듈로 표시한다", () => {
    const config = withoutComments(readFileSync(join(mobileDir, "lynx.config.ts"), "utf8"));

    expect(config).toMatch(/test:\s*\/[^/\n]*render-dev-probe[^/\n]*\/,\s*sideEffects:\s*false/);
  });
});
