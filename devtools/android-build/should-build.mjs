// CI의 Android build 잡이 부르는 얇은 실행 파일입니다. 판정은 paths.mjs가 하고, 여기서는 변경 목록을 읽어
// `build=true|false`를 `$GITHUB_OUTPUT`에 씁니다. 로컬에서는 결과를 찍기만 합니다.

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

import { androidBuildDecision } from "./paths.mjs";

const ZERO = /^0+$/;
const base = process.env.ANDROID_BUILD_BASE ?? "";
const head = process.env.ANDROID_BUILD_HEAD ?? "";
const event = process.env.GITHUB_EVENT_NAME ?? "pull_request";

let changedPaths = null;
if (base && head && !ZERO.test(base) && !ZERO.test(head)) {
  try {
    changedPaths = execFileSync("git", ["diff", "--name-only", `${base}...${head}`], {
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean);
  } catch {
    changedPaths = null;
  }
}

const decision = androidBuildDecision({ event, changedPaths });
console.log(`Android build: ${decision.build ? "실행" : "건너뜀"} (${decision.reason})`);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `build=${decision.build}\n`);
}
