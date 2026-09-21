import { readFileSync } from "node:fs";
import path from "node:path";

import { defineConfig, type Config } from "@lynx-js/rspeedy";
import { pluginQRCode } from "@lynx-js/qrcode-rsbuild-plugin";
import { pluginReactLynx } from "@lynx-js/react-rsbuild-plugin";

const uiLynxRoot = path.resolve(import.meta.dirname, "../../packages/ui-lynx");

// ui-lynx의 공개 export(`./dist/...`)를 같은 자리의 src로 1:1 대응시킨 정확 일치 alias.
// 디렉터리 통째 alias는 `text-field/styles.css` 같은 CSS subpath가 src의 실제 파일명과
// 달라 깨진다 — exports 표를 그대로 읽어 subpath 이름을 지킨다.
function uiLynxSourceAliases(): Record<string, string> {
  const manifest = JSON.parse(readFileSync(path.join(uiLynxRoot, "package.json"), "utf8")) as {
    exports: Record<string, string | { import?: unknown; default?: unknown } | null>;
  };
  const aliases: Record<string, string> = {};
  for (const [subpath, target] of Object.entries(manifest.exports)) {
    // exports는 중첩 조건 객체나 null도 허용한다 — 문자열로 풀리는 것만 다룬다.
    const file = typeof target === "string" ? target : (target?.import ?? target?.default);
    if (typeof file !== "string" || !file.startsWith("./dist/")) continue;
    const source = file.replace("./dist/", "./src/").replace(/\.js$/, ".ts");
    aliases[`@libitums/ui-lynx${subpath.slice(1)}$`] = path.join(uiLynxRoot, source);
  }
  return aliases;
}

// `@rsbuild/plugin-type-check`을 넣지 않는 것이 결정의 일부다 (ADR-0006 D1).
// build가 타입 검사를 겸하면 실패 원인이 타입인지 번들링인지 읽히지 않는다.
// 타입 검사는 `pnpm typecheck`(tsc --noEmit)이 단독으로 맡는다.
export default defineConfig(({ command }): Config => {
  const dev = command === "dev";
  return {
    source: {
      // 진입점은 src/app/ 이 소유한다 (ADR-0003 D5).
      // playground는 dev에서만 붙는 ui-lynx 디자인 확인용 번들이다 — build 산출물에 없다.
      entry: dev
        ? { main: "./src/app/index.tsx", playground: "./src/playground/index.tsx" }
        : "./src/app/index.tsx",
    },
    resolve: {
      // dev에서만 ui-lynx를 dist가 아니라 src로 읽어 컴포넌트 수정이 HMR로 바로 반영되게 한다.
      // build는 공개 export(dist)를 그대로 소비한다 (ADR-0025 D1).
      alias: dev ? uiLynxSourceAliases() : {},
    },
    plugins: [
      // dev 서버가 Explorer가 붙을 URL/QR을 낸다 (ADR-0006 D1)
      pluginQRCode(),
      pluginReactLynx(),
    ],
  };
});
