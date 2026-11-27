// `integration` 계층: CI의 Android build 잡이 Gradle 출력을 판정에 넘기고, 판정이 실패를 종료 코드로 돌려준다.
//
// 판정(kotlin-metadata.mjs)이 맞아도 잡이 출력을 넘기지 않거나 파이프가 종료 코드를 삼키면 `e:` 줄은 다시
// 초록 빌드 뒤에 숨는다. 실행 파일과 워크플로 연결을 함께 본다.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const cli = join(root, "devtools/android-build/check-gradle-log.mjs");
const MISMATCH =
  "e: file:///x/play-services-ads-25.5.0/jars/classes.jar!/META-INF/x.kotlin_module Module was compiled with an incompatible version of Kotlin. The binary version of its metadata is 2.3.0, expected version is 2.1.0.";

function runCli(content) {
  const dir = mkdtempSync(join(tmpdir(), "gradle-log-"));
  const log = join(dir, "gradle.log");
  writeFileSync(log, content);
  return spawnSync(process.execPath, [cli, log], { encoding: "utf8" });
}

test("KG1. 불일치 줄이 있는 출력은 0이 아닌 코드로 끝나고 그 줄을 보여 준다", () => {
  const result = runCli(`> Task :app:lintVitalAnalyzeBundled\n${MISMATCH}\nBUILD SUCCESSFUL\n`);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /incompatible version of Kotlin/);
});

test("KG2. 불일치 줄이 없는 출력은 0으로 끝난다", () => {
  const result = runCli("> Task :app:lintVitalAnalyzeBundled\nBUILD SUCCESSFUL\n");
  assert.equal(result.status, 0, result.stderr);
});

test("KG3. Android build 잡이 Gradle 출력을 파이프 실패와 함께 남기고 판정에 넘긴다", () => {
  const yml = readFileSync(join(root, ".github/workflows/verify.yml"), "utf8");
  const start = yml.indexOf("\n  android:\n");
  assert.notEqual(start, -1, "android 잡을 찾을 수 없습니다");
  const rest = yml.slice(start + 1);
  const end = rest.slice(1).search(/\n {2}[\w-]+:\n/);
  const job = end === -1 ? rest : rest.slice(0, end + 1);

  const assemble = job.slice(job.indexOf("- name: Assemble bundled APK"));
  // shell: bash는 GitHub에서 `-eo pipefail`이다. 없으면 tee가 gradlew의 실패를 삼킨다.
  assert.match(assemble, /shell: bash\n/);
  assert.match(assemble, /\.\/gradlew --no-daemon :app:assembleBundled 2>&1 \| tee (\S+)/);
  const logPath = assemble.match(/\| tee (\S+)/)[1];
  assert.match(
    job,
    new RegExp(
      `node \\S*devtools/android-build/check-gradle-log\\.mjs \\S*${logPath.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}`,
    ),
  );
});
