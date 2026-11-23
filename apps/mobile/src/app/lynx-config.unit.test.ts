import { readFileSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";

import { expect, test } from "vitest";

// vitest 환경은 lynx.config.ts(빌드 설정)를 읽지 않아 `globalPropsMode`를 되돌려도 어떤 테스트도
// 깨지지 않습니다. 이 저장소에 설정을 검사하는 별도 러너가 없어 unit 계층에서 설정 파일 텍스트를 읽어 지킵니다.

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function lynxConfigSource(): string {
  return stripComments(readFileSync(resolve(process.cwd(), "lynx.config.ts"), "utf8"));
}

function pluginReactLynxOptions(): string {
  return /pluginReactLynx\(\s*(?:\{([^}]*)\})?\s*\)/.exec(lynxConfigSource())?.[1] ?? "";
}

test('[UG1] lynx.config.ts: pluginReactLynx에 globalPropsMode: "event"가 있다', () => {
  expect(
    pluginReactLynxOptions(),
    '갱신된 globalProps로 재렌더되지 않는다(N9): globalPropsMode: "event"가 없으면 기본값 reactive에서 useGlobalProps가 호스트 갱신 뒤 다시 그리지 않습니다',
  ).toMatch(/globalPropsMode:\s*["']event["']/);
});

test("[XS-U1] lynx.config.ts: pluginReactLynx에서 extractStr를 켜지 않는다", () => {
  expect(
    pluginReactLynxOptions(),
    "extractStr를 켜면 main-thread processData가 정의되지 않은 __EXTRACT_STR_IDENT_FLAG__를 읽어 실행마다 ReferenceError를 냅니다(ADR-0169 D8 개정)",
  ).not.toMatch(/\bextractStr\b(?!\s*:\s*false\b)/);
});

test('[XS-U2] lynx.config.ts: "react:json-parse" 규칙을 두 스레드 모두에 건다(issuerLayer 삭제)', () => {
  expect(
    lynxConfigSource(),
    "JSON을 JSON.parse 문자열 대신 객체 리터럴로 내는 규칙이 main-thread에만 걸리면 번들이 약 103 kB 커집니다(ADR-0169 D8 개정)",
  ).toMatch(/rule\(\s*["']react:json-parse["']\s*\)\s*\.delete\(\s*["']issuerLayer["']\s*\)/);
});

// 설치된 패키지 계약을 고정합니다. 이 테스트가 깨지면(업스트림이 식별자를 정의하거나 런타임이 읽지 않게 되면)
// extractStr를 다시 켤 수 있는지 기기에서 확인합니다.
test("[XS-U3] 설치된 ReactLynx: 런타임은 __EXTRACT_STR_IDENT_FLAG__를 읽고, 빌드 플러그인은 정의하지 않는다", () => {
  const reactRoot = realpathSync(resolve(process.cwd(), "node_modules/@lynx-js/react"));
  const runtime = readFileSync(
    resolve(reactRoot, "runtime/lib/core/lynx-data-processors.js"),
    "utf8",
  );
  expect(runtime).toMatch(/if \(__EXTRACT_STR__\) \{[\s\S]*?=\s*__EXTRACT_STR_IDENT_FLAG__;/);

  const rsbuildPluginRoot = realpathSync(
    resolve(process.cwd(), "node_modules/@lynx-js/react-rsbuild-plugin"),
  );
  const rsbuildPlugin = readFileSync(resolve(rsbuildPluginRoot, "dist/index.js"), "utf8");
  // rsbuild 플러그인 자리에서 해석해 node-linker 배치(pnpm 형제 경로)에 기대지 않습니다.
  const webpackPluginRoot = dirname(
    createRequire(resolve(rsbuildPluginRoot, "package.json")).resolve(
      "@lynx-js/react-webpack-plugin/package.json",
    ),
  );
  const webpackPlugin = readFileSync(
    resolve(webpackPluginRoot, "lib/ReactWebpackPlugin.js"),
    "utf8",
  );
  expect(webpackPlugin).toMatch(
    /__EXTRACT_STR__:\s*JSON\.stringify\(Boolean\(options\.extractStr\)\)/,
  );
  expect(webpackPlugin).not.toContain("__EXTRACT_STR_IDENT_FLAG__");
  expect(rsbuildPlugin).not.toContain("__EXTRACT_STR_IDENT_FLAG__");
});
