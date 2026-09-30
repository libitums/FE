import { defineConfig } from "vitest/config";

// 러너는 vitest입니다(ADR-0006 D4). 함수 로직은 런타임 중립이라 기본 node 환경으로 돕니다.
export default defineConfig({
  test: {
    environment: "node",
  },
});
