import { resolve } from "node:path";

import { createRspeedy } from "@lynx-js/rspeedy";
import { beforeAll, expect, test } from "vitest";

import lynxConfig from "../../lynx.config";

// 빌드 설정 경계: 우리 lynx.config.ts + rspeedy + ReactLynx 플러그인이 합쳐 만든 **최종** rspack 설정을 봅니다.
// 번들은 만들지 않습니다(initConfigs만). ADR-0169 D8 개정.

type RspackRule = {
  test?: unknown;
  issuerLayer?: unknown;
  sideEffects?: unknown;
  generator?: { JSONParse?: unknown };
};
type RspackPlugin = { constructor?: { name?: string }; options?: { extractStr?: unknown } };
type RspackConfig = { plugins: RspackPlugin[]; module: { rules: RspackRule[] } };

let bundlerConfig: RspackConfig;

beforeAll(async () => {
  const rspeedyConfig =
    typeof lynxConfig === "function"
      ? await lynxConfig({ command: "build", env: "production" })
      : lynxConfig;
  const rspeedy = await createRspeedy({
    cwd: resolve(import.meta.dirname, "../.."),
    rspeedyConfig,
    loadEnv: false,
  });
  [bundlerConfig] = (await rspeedy.initConfigs()) as unknown as RspackConfig[];
}, 60_000);

test("[XS-I1] 최종 설정: ReactWebpackPlugin의 extractStr가 꺼져 있다(__EXTRACT_STR__ false)", () => {
  const reactPlugin = bundlerConfig.plugins.find(
    (plugin) => plugin?.constructor?.name === "ReactWebpackPlugin",
  );
  expect(reactPlugin, "ReactWebpackPlugin이 최종 설정에 없습니다").toBeDefined();
  expect(
    Boolean(reactPlugin?.options?.extractStr),
    "extractStr가 켜지면 런타임이 정의되지 않은 __EXTRACT_STR_IDENT_FLAG__를 읽습니다",
  ).toBe(false);
});

test("[XS-I2] 최종 설정: .json을 객체 리터럴로 내는 규칙이 두 스레드 모두에 걸린다", () => {
  // rsbuild 기본 `.json` 규칙과 별개로 ReactLynx 플러그인의 `react:json-parse` 규칙(JSONParse 지정)이 있다.
  const jsonParseRules = bundlerConfig.module.rules.filter(
    (rule) =>
      rule?.test instanceof RegExp &&
      rule.test.source === "\\.json$" &&
      rule.generator?.JSONParse !== undefined,
  );
  expect(jsonParseRules).toHaveLength(1);
  expect(jsonParseRules[0]?.generator?.JSONParse).toBe(false);
  expect(
    jsonParseRules[0]?.issuerLayer,
    "issuerLayer가 있으면 background는 JSON.parse 문자열로 남아 번들이 약 103 kB 커집니다",
  ).toBeUndefined();
});

test("[DP-I1] 최종 설정: render-dev-probe.tsx를 부수 효과 없는 모듈로 표시하는 규칙이 있다(ADR-0171)", () => {
  // 이 규칙이 빠지면 release에서 `__DEV__` 호출은 죽어도 탐침 화면 · CSS 모듈이 번들에 남습니다(약 27 kB).
  // lynx.config.ts에 `tools` 키가 둘 생기면 뒤의 것이 앞을 덮어 이 규칙이 조용히 사라집니다 — 소스 글자가
  // 아니라 최종 설정을 보는 까닭입니다.
  const probeModule = resolve(import.meta.dirname, "render-dev-probe.tsx");
  const sideEffectFreeRules = bundlerConfig.module.rules.filter(
    (rule) =>
      rule?.sideEffects === false && rule.test instanceof RegExp && rule.test.test(probeModule),
  );
  expect(sideEffectFreeRules).toHaveLength(1);
});

test("[MD-I1] 최종 설정: roleplay-mission-dev-fakes.ts를 부수 효과 없는 모듈로 표시하는 규칙이 있다(ADR-0177)", () => {
  // 이 규칙이 빠지면 release에서 `__DEV__` 호출은 죽어도 미션 가짜 출처 · 가짜 기기 · fixture가 번들에 남습니다.
  const fakesModule = resolve(import.meta.dirname, "roleplay-mission-dev-fakes.ts");
  const sideEffectFreeRules = bundlerConfig.module.rules.filter(
    (rule) =>
      rule?.sideEffects === false && rule.test instanceof RegExp && rule.test.test(fakesModule),
  );
  expect(sideEffectFreeRules).toHaveLength(1);
});

test("[ME-I1] 최종 설정: roleplay-mission-entry.ts를 부수 효과 없는 모듈로 표시하는 규칙이 있다(ADR-0177)", () => {
  // 이 규칙이 빠지면 스위치가 꺼진 release에서도 미션 화면 · 문구 · CSS가 번들에 남습니다(약 150 kB).
  const entryModule = resolve(import.meta.dirname, "roleplay-mission-entry.ts");
  const sideEffectFreeRules = bundlerConfig.module.rules.filter(
    (rule) =>
      rule?.sideEffects === false && rule.test instanceof RegExp && rule.test.test(entryModule),
  );
  expect(sideEffectFreeRules).toHaveLength(1);
});

test("[FS-I1] 최종 설정: 메인 스레드에서는 ui-lynx 모듈을 부수 효과 있음으로 둔다(ADR-0149 「줄인 기록」 1)", () => {
  // 메인 스레드는 스플래시 밖 화면을 그리지 않아(render-app-content.tsx) 그 화면만 쓰는 ui-lynx 컴포넌트의 import가
  // 쓰이지 않게 됩니다. ui-lynx는 `sideEffects`에 CSS만 적어 두어, 이 규칙이 없으면 번들러가 그 모듈을 통째로 버리고
  // 모듈 최상위의 그리기 틀(snapshot) 등록도 함께 사라집니다 — background가 그 화면을 열면 메인 스레드가
  // 「Snapshot not found」로 멈춥니다. 같은 규칙이 background에 걸리면 쓰지 않는 컴포넌트까지 실려 커집니다.
  const uiLynxDist = resolve(import.meta.dirname, "../../../../packages/ui-lynx/dist");
  const uiLynxModules = [
    resolve(uiLynxDist, "settings-cell/SettingsCell.jsx"),
    resolve(uiLynxDist, "settings-cell/index.js"),
  ];
  const keepRules = bundlerConfig.module.rules.filter(
    (rule) =>
      rule?.sideEffects === true &&
      rule.test instanceof RegExp &&
      uiLynxModules.every((file) => (rule.test as RegExp).test(file)),
  );
  expect(keepRules).toHaveLength(1);
  expect(keepRules[0]?.issuerLayer).toBe("react:main-thread");
});

type EncodeTap = (args: unknown) => unknown;
type TemplateHooksSource = { getLynxTemplatePluginHooks(compilation: unknown): unknown };

test("[MT-I1] 최종 설정: 인코딩 직전 page config에 여러 손가락 터치를 켠다(ADR-0112 개정 ⟨여러 손가락⟩)", () => {
  // 꺼져 있으면 호스트가 한 손가락이 닿은 동안 둘째 손가락의 touchstart를 JS에 보내지 않아, 두 엄지로 빠르게 친 자판 키가
  // 사라집니다. 템플릿 플러그인은 이 키를 옵션으로 열지 않아 인코딩 훅으로 넣습니다 — 플러그인이 빠지거나 훅이 달라지면 여기서 걸립니다.
  const plugin = bundlerConfig.plugins.find(
    (candidate) => candidate?.constructor?.name === "PageConfigPlugin",
  ) as unknown as
    | { apply(compiler: unknown): void; exposed: { LynxTemplatePlugin: TemplateHooksSource } }
    | undefined;
  expect(plugin, "PageConfigPlugin이 최종 설정에 없습니다").toBeDefined();
  if (plugin === undefined) return;

  const compilation = {};
  const taps: EncodeTap[] = [];
  const fakeCompiler = {
    hooks: { thisCompilation: { tap: (_: string, fn: (c: unknown) => void) => fn(compilation) } },
  };
  // 플러그인이 ReactLynx가 내보인 템플릿 훅을 이 compilation에 대해 부르는지 봅니다.
  const real = plugin.exposed.LynxTemplatePlugin;
  plugin.exposed.LynxTemplatePlugin = {
    getLynxTemplatePluginHooks: (target) => {
      expect(target).toBe(compilation);
      return { beforeEncode: { tap: (_: string, fn: EncodeTap) => taps.push(fn) } };
    },
  };
  try {
    plugin.apply(fakeCompiler);
  } finally {
    plugin.exposed.LynxTemplatePlugin = real;
  }
  expect(taps).toHaveLength(1);
  const config: Record<string, unknown> = { lepusStrict: true };
  const args = { encodeData: { sourceContent: { config } } };
  expect(taps[0]?.(args)).toBe(args);
  expect(config).toEqual({
    lepusStrict: true,
    enableMultiTouch: true,
    enableMultiTouchParamsCompatible: true,
  });
});
