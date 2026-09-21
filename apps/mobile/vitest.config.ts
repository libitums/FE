import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { vitestTestingLibraryPlugin } from "@lynx-js/react/testing-library/plugins";

// ADR-0006 D4: 러너는 vitest. `createVitestConfig`는 deprecated이므로 플러그인을 쓴다.
export default defineConfig({
  plugins: [vitestTestingLibraryPlugin()],
  resolve: {
    alias: {
      // LIB-261 계약 §10.1: 테스트가 빌드 산출물(`dist`)에 의존하지 않게 워크스페이스
      // 소스로 곧장 잇는다. 실측(logic-scaffold) — dist가 없는 상태에서 이 alias
      // 없이는 vitest가 "Failed to resolve import"로 멈춘다(§10.1의 "실측하지
      // 않았다" 표시를 이 단계가 닫는다).
      "@libitums/ui-lynx/text-field": fileURLToPath(
        new URL("../../packages/ui-lynx/src/text-field/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    // jest-dom 매처 등록. 어느 매처를 쓰고 쓰지 않는지는 setup 파일 주석에 있다.
    setupFiles: ["./vitest.setup.ts"],
  },
});
