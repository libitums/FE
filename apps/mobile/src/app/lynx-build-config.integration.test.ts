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
