import { vitestTestingLibraryPlugin } from "@lynx-js/react/testing-library/plugins";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vitestTestingLibraryPlugin()],
  test: {
    // 커버리지는 숫자만 남깁니다 — 계층별 테스트 계획이 무엇을 덮을지 정하므로 퍼센트를
    // 게이트로 걸지 않습니다. 대상은 제품 코드뿐이라 테스트·설정 파일을 세지 않습니다.
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/*.d.ts"],
    },
    setupFiles: ["./vitest.setup.ts"],
  },
});
