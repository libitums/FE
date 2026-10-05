import { getViteConfig } from "astro/config";
import type { ViteUserConfig } from "vitest/config";

// 환경은 node입니다. jsdom 환경에서는 .astro가 서버 컴포넌트로 변환되지 않습니다.
// 시간 제한은 integration의 빌드 셋을 덮을 만큼 넉넉하게 둡니다.
const test: NonNullable<ViteUserConfig["test"]> = {
  testTimeout: 120_000,
  hookTimeout: 120_000,
};

// Astro는 Vite 8, vitest는 Vite 7 타입을 쓰므로 `test` 키를 변수로 넘겨 리터럴 검사를 피합니다.
const config = { plugins: [], test };

export default getViteConfig(config);
