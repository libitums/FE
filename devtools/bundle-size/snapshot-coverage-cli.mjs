#!/usr/bin/env node

// 앱 번들의 메인 스레드가 background의 그리기 틀 · worklet을 모두 갖는지 확인합니다(ADR-0149 「줄인 기록」 1).
// 중간 산출물(`dist/.rspeedy/main`)은 `DEBUG=rspeedy` 빌드에만 남으므로 앱만 한 번 더 빌드합니다 — 크기 검사(`size:check`)
// 뒤에 돌립니다. 이 빌드의 `.lynx.bundle`은 디버그 정보가 달라 크기 판정에 쓰지 않습니다.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { snapshotCoverage } from "./snapshot-coverage.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const intermediate = path.join(repoRoot, "apps/mobile/dist/.rspeedy/main");

// DEBUG 빌드는 이미 알려진 CSS 경고마다 스택을 찍어 출력이 깁니다 — 실패할 때만 보여 줍니다.
try {
  execFileSync("pnpm", ["--filter", "@libitums/mobile", "build"], {
    cwd: repoRoot,
    stdio: "pipe",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, DEBUG: "rspeedy" },
  });
} catch (error) {
  process.stderr.write(String(error.stdout ?? ""));
  process.stderr.write(String(error.stderr ?? ""));
  process.exit(1);
}

const backgroundFile = readdirSync(intermediate).find(
  (name) => name.startsWith("background") && name.endsWith(".js"),
);
if (backgroundFile === undefined) {
  console.error(`background 중간 산출물이 없습니다: ${intermediate}`);
  process.exit(1);
}

const result = snapshotCoverage({
  mainThread: readFileSync(path.join(intermediate, "main-thread.js"), "utf8"),
  background: readFileSync(path.join(intermediate, backgroundFile), "utf8"),
});

console.log(
  `그리기 틀 ${result.snapshots}개 · worklet ${result.worklets}개를 메인 스레드와 대조했습니다.`,
);
if (result.missingSnapshots.length > 0 || result.missingWorklets.length > 0) {
  console.error(
    [
      "메인 스레드 번들에 등록이 빠졌습니다 — background가 그 화면을 열면 「Snapshot not found」로 멈춥니다.",
      ...result.missingSnapshots.map((id) => `  틀 ${id}`),
      ...result.missingWorklets.map((id) => `  worklet ${id}`),
      "sideEffects로 빠진 패키지 모듈이면 apps/mobile/lynx.config.ts의 메인 스레드 규칙에 넣습니다.",
    ].join("\n"),
  );
  process.exit(1);
}
