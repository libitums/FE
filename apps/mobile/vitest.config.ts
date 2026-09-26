import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { vitestTestingLibraryPlugin } from "@lynx-js/react/testing-library/plugins";

// 러너는 vitest입니다(ADR-0006 D4). `createVitestConfig`가 deprecated라 플러그인을 씁니다.
export default defineConfig({
  plugins: [vitestTestingLibraryPlugin()],
  resolve: {
    alias: {
      // 테스트가 빌드 산출물(`dist`)에 의존하지 않도록 워크스페이스 소스로 곧장 잇습니다.
      // 이 alias가 없으면 `dist`가 없는 상태에서 vitest가 "Failed to resolve import"로
      // 멈춥니다.
      "@libitums/ui-lynx/option-selector": fileURLToPath(
        new URL("../../packages/ui-lynx/src/option-selector/index.ts", import.meta.url),
      ),
      "@libitums/ui-lynx/compact-numeric-input": fileURLToPath(
        new URL("../../packages/ui-lynx/src/compact-numeric-input/index.ts", import.meta.url),
      ),
      "@libitums/ui-lynx/text-field": fileURLToPath(
        new URL("../../packages/ui-lynx/src/text-field/index.ts", import.meta.url),
      ),
      "@libitums/ui-lynx/button": fileURLToPath(
        new URL("../../packages/ui-lynx/src/button/index.ts", import.meta.url),
      ),
      "@libitums/ui-lynx/card": fileURLToPath(
        new URL("../../packages/ui-lynx/src/card/index.ts", import.meta.url),
      ),
      "@libitums/ui-lynx/page-indicator": fileURLToPath(
        new URL("../../packages/ui-lynx/src/page-indicator/index.ts", import.meta.url),
      ),
      "@libitums/ui-lynx/round-button": fileURLToPath(
        new URL("../../packages/ui-lynx/src/round-button/index.ts", import.meta.url),
      ),
      "@libitums/ui-lynx/chat-bubble": fileURLToPath(
        new URL("../../packages/ui-lynx/src/chat-bubble/index.ts", import.meta.url),
      ),
      "@libitums/ui-lynx/answer-label": fileURLToPath(
        new URL("../../packages/ui-lynx/src/answer-label/index.ts", import.meta.url),
      ),
      "@libitums/ui-lynx/status-indicator": fileURLToPath(
        new URL("../../packages/ui-lynx/src/status-indicator/index.ts", import.meta.url),
      ),
      "@libitums/ui-lynx/bottom-navigator": fileURLToPath(
        new URL("../../packages/ui-lynx/src/bottom-navigator/index.ts", import.meta.url),
      ),
      "@libitums/ui-lynx/bottom-sheet": fileURLToPath(
        new URL("../../packages/ui-lynx/src/bottom-sheet/index.ts", import.meta.url),
      ),
      "@libitums/ui-lynx/learning-unit": fileURLToPath(
        new URL("../../packages/ui-lynx/src/learning-unit/index.ts", import.meta.url),
      ),
      "@libitums/ui-lynx/fog": fileURLToPath(
        new URL("../../packages/ui-lynx/src/fog/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    // 커버리지는 숫자만 남깁니다 — 계층별 테스트 계획이 무엇을 덮을지 정하므로 퍼센트를
    // 게이트로 걸지 않습니다. 대상은 제품 코드뿐이라 테스트·설정 파일을 세지 않습니다.
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.d.ts"],
    },
    // jest-dom 매처 등록. 어느 매처를 쓰고 쓰지 않는지는 setup 파일 주석에 있다.
    setupFiles: ["./vitest.setup.ts"],
  },
});
