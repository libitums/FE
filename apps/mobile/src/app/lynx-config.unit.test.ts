import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "vitest";

// vitest 환경은 lynx.config.ts(빌드 설정)를 읽지 않아 `globalPropsMode`를 되돌려도 어떤 테스트도
// 깨지지 않습니다. 이 저장소에 설정을 검사하는 별도 러너가 없어 unit 계층에서 설정 파일 텍스트를 읽어 지킵니다.

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

test('[UG1] lynx.config.ts: pluginReactLynx에 globalPropsMode: "event"가 있다', () => {
  const source = stripComments(readFileSync(resolve(process.cwd(), "lynx.config.ts"), "utf8"));

  const options = /pluginReactLynx\(\s*(?:\{([^}]*)\})?\s*\)/.exec(source)?.[1] ?? "";
  expect(
    options,
    '갱신된 globalProps로 재렌더되지 않는다(N9): globalPropsMode: "event"가 없으면 기본값 reactive에서 useGlobalProps가 호스트 갱신 뒤 다시 그리지 않습니다',
  ).toMatch(/globalPropsMode:\s*["']event["']/);
});
