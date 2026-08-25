import { defineConfig } from "@lynx-js/rspeedy";
import { pluginQRCode } from "@lynx-js/qrcode-rsbuild-plugin";
import { pluginReactLynx } from "@lynx-js/react-rsbuild-plugin";

// `@rsbuild/plugin-type-check`을 넣지 않는 것이 결정의 일부다 (ADR-0006 D1).
// build가 타입 검사를 겸하면 실패 원인이 타입인지 번들링인지 읽히지 않는다.
// 타입 검사는 `pnpm typecheck`(tsc --noEmit)이 단독으로 맡는다.
export default defineConfig({
  source: {
    // 진입점은 src/app/ 이 소유한다 (ADR-0003 D5)
    entry: "./src/app/index.tsx",
  },
  plugins: [
    // dev 서버가 Explorer가 붙을 URL/QR을 낸다 (ADR-0006 D1)
    pluginQRCode(),
    pluginReactLynx(),
  ],
});
