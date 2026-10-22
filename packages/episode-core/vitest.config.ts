import { defineConfig } from "vitest/config";

// 순수 규칙만 있어 환경은 node입니다(DOM · Lynx 없음).
export default defineConfig({
  test: {
    environment: "node",
  },
});
