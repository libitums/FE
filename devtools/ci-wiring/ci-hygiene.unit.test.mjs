// verify-coverage가 「검사가 CI에서 빠지지 않는다」를 지킨다면, 여기는 「CI가 같은 일을
// 두 번 하지 않고, 돌아야 할 실행을 스스로 끊지 않는다」를 지킵니다.

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");

const scripts = JSON.parse(read("package.json")).scripts;
const verifyYml = read(".github/workflows/verify.yml");
const smokeYml = read(".github/workflows/performance-smoke.yml");
// 없으면 빈 문자열입니다 — 파일이 없는 것도 CW8의 실패로 읽혀야 합니다(모듈 오류가 아니라).
const setupAction = existsSync(join(root, ".github/actions/setup/action.yml"))
  ? read(".github/actions/setup/action.yml")
  : "";

/** 주석 줄을 뺀 본문입니다. 주석에 적힌 이름은 「돈다」가 아닙니다. */
const code = (text) =>
  text
    .split("\n")
    .filter((line) => !/^\s*#/.test(line))
    .join("\n");

/** `jobs:` 아래 잡 하나의 블록입니다. 다음 잡 키(두 칸 들여쓰기)에서 끝납니다. */
function jobBlock(text, id) {
  const start = text.indexOf(`\n  ${id}:\n`);
  assert.notEqual(start, -1, `잡 ${id}를 찾을 수 없습니다`);
  const rest = text.slice(start + 1);
  const end = rest.slice(1).search(/\n {2}[\w-]+:\n/);
  return end === -1 ? rest : rest.slice(0, end + 1);
}

function jobIds(text) {
  const jobs = text.slice(text.indexOf("\njobs:\n"));
  return [...jobs.matchAll(/\n {2}([\w-]+):\n/g)].map((match) => match[1]);
}

/** `pnpm --filter <pkg> <script>` 잎을 `pkg script`로 읽습니다. */
function filterLeaves(command) {
  return command
    .split("&&")
    .map((part) => part.trim())
    .map((part) => part.match(/^pnpm --filter (\S+) (\S+)$/))
    .filter(Boolean)
    .map(([, pkg, script]) => `${pkg} ${script}`);
}

const VITEST_PACKAGES = ["@libitums/ui-lynx", "@libitums/mobile"];
const LAYERS = ["test:unit", "test:ui", "test:integration"];

// CW6 — main push는 같은 그룹이라 다음 병합이 앞 커밋의 검증을 끊습니다. 실제로 한 커밋이
// main에서 판정 없이 지나갔습니다. 취소는 「이 PR의 앞 push」에만 뜻이 있습니다.
test("CW6. Verify는 PR에서만 앞 실행을 취소한다", () => {
  const concurrency = code(verifyYml).match(/\nconcurrency:\n((?: {2}.*\n)+)/);
  assert.ok(concurrency, "concurrency 블록이 없습니다");
  assert.match(
    concurrency[1],
    /cancel-in-progress:\s*\$\{\{\s*github\.event_name\s*==\s*'pull_request'\s*\}\}/,
  );
});

// CW7 — 커버리지는 테스트를 한 번 더 돌려서 얻을 숫자가 아닙니다. mobile은 샤드 잡들이
// 커버리지를 켠 채 나눠 돌고, 「Tests」 잡이 그 blob을 합칩니다. 「Tests」는 필수 검사이므로
// 앞 잡 하나라도 실패 · 취소되면 실패해야 합니다 — 그러지 않으면 샤드 실패가 초록으로 샙니다.
test("CW7. 커버리지는 샤드 실행에서 얻고, Tests 잡이 합치며 앞 잡 실패를 넘긴다", () => {
  for (const [name, text] of [
    ["verify.yml", verifyYml],
    ["performance-smoke.yml", smokeYml],
  ]) {
    assert.doesNotMatch(code(text), /pnpm\s+test:coverage/, `${name}가 테스트를 따로 다시 돕니다`);
  }

  const shard = code(jobBlock(verifyYml, "test-mobile"));
  assert.match(shard, /matrix:\s*\n\s*shard:\s*\[/);
  assert.match(
    shard,
    /pnpm --filter @libitums\/mobile test:all --shard=\$\{\{ matrix\.shard \}\}\/\$\{\{ strategy\.job-total \}\}/,
  );
  assert.match(shard, /--reporter=blob/);
  assert.match(shard, /VITEST_COVERAGE:\s*"1"/);
  assert.match(shard, /actions\/upload-artifact@/);

  const rest = code(jobBlock(verifyYml, "test-rest"));
  assert.match(rest, /pnpm test:rest\b/);
  assert.match(rest, /VITEST_COVERAGE:\s*"1"/);

  const gate = code(jobBlock(verifyYml, "test"));
  assert.match(gate, /name:\s*Tests\n/);
  assert.match(gate, /needs:\s*\[test-mobile, test-rest\]/);
  assert.match(gate, /if:\s*\$\{\{ !cancelled\(\) \}\}/);
  assert.match(gate, /actions\/download-artifact@/);
  assert.match(gate, /pnpm --filter @libitums\/mobile test:merge/);
  assert.match(gate, /needs\.test-mobile\.result/);
  assert.match(gate, /needs\.test-rest\.result/);
  assert.match(gate, /GITHUB_STEP_SUMMARY/);

  for (const id of jobIds(verifyYml)) {
    const block = code(jobBlock(verifyYml, id));
    if (/\|\s*tee\b/.test(block)) {
      assert.match(
        block,
        /shell:\s*bash\b/,
        `${id}: 파이프를 쓰면 shell: bash(pipefail)가 필요합니다`,
      );
    }
  }

  for (const pkg of ["apps/mobile", "packages/ui-lynx"]) {
    assert.match(
      read(`${pkg}/vitest.config.ts`),
      /enabled:\s*process\.env\.VITEST_COVERAGE\s*===\s*"1"/,
      `${pkg} vitest 설정이 VITEST_COVERAGE로 커버리지를 켜지 않습니다`,
    );
  }
  assert.match(
    JSON.parse(read("apps/mobile/package.json")).scripts["test:merge"] ?? "",
    /^vitest run --merge-reports=\S+$/,
  );
});

// CW8 — 설치 방식(레지스트리 · 토큰 · pnpm 버전)은 한 곳에서 바꿉니다. smoke만 pnpm 버전을
// 따로 적어 `packageManager`와 어긋날 수 있었습니다.
test("CW8. 모든 잡이 공용 setup 액션으로 설치한다", () => {
  for (const [name, text] of [
    ["verify.yml", verifyYml],
    ["performance-smoke.yml", smokeYml],
  ]) {
    const body = code(text);
    assert.doesNotMatch(body, /pnpm install/, `${name}가 직접 설치합니다`);
    assert.doesNotMatch(body, /pnpm\/action-setup|actions\/setup-node|corepack/, name);

    for (const id of jobIds(text)) {
      assert.match(
        code(jobBlock(text, id)),
        /uses:\s*\.\/\.github\/actions\/setup\b/,
        `${name} ${id}`,
      );
    }
  }

  const action = code(setupAction);
  assert.match(action, /using:\s*composite/);
  assert.match(action, /pnpm install --frozen-lockfile/);
  assert.match(action, /node-version-file:\s*\.nvmrc/);
  assert.doesNotMatch(action, /version:\s*\d/, "pnpm 버전은 packageManager가 정합니다");
});

// CW9 — 루트 `test`는 vitest 패키지를 계층별 세 번이 아니라 한 번 돕니다. CI가 mobile을
// 샤드로 떼어 가므로 `test` = mobile `test:all` + `test:rest`입니다. 펼친 멤버가 계층 사슬과
// 어긋나면 안 됩니다 — `test:all`은 그 패키지의 세 계층을 대신합니다.
test("CW9. 루트 test가 계층 사슬의 멤버를 빠짐없이, vitest 패키지는 한 번만 돈다", () => {
  assert.equal(scripts.test, "pnpm --filter @libitums/mobile test:all && pnpm test:rest");

  const parts = (command) =>
    command
      .split("&&")
      .map((part) => part.trim())
      .flatMap((part) => {
        const ref = part.match(/^pnpm (test:rest)$/);
        return ref ? parts(scripts[ref[1]]) : [part];
      });
  const testParts = parts(scripts.test);
  const testLeaves = filterLeaves(testParts.join(" && "));
  const layerLeaves = LAYERS.flatMap((layer) => filterLeaves(scripts[layer]));

  for (const pkg of VITEST_PACKAGES) {
    assert.deepEqual(
      testLeaves.filter((leaf) => leaf.startsWith(`${pkg} `)),
      [`${pkg} test:all`],
      `${pkg}는 루트 test에서 test:all 한 번이어야 합니다`,
    );
  }
  const expanded = testLeaves.flatMap((leaf) => {
    const [pkg, script] = leaf.split(" ");
    return script === "test:all" ? LAYERS.map((layer) => `${pkg} ${layer}`) : [leaf];
  });
  assert.deepEqual(new Set(expanded), new Set(layerLeaves));

  const layerTail = LAYERS.flatMap((layer) =>
    scripts[layer]
      .split("&&")
      .map((part) => part.trim())
      .filter((part) => !part.startsWith("pnpm --filter")),
  );
  for (const part of layerTail) {
    assert.ok(testParts.includes(part), `루트 test에 ${part}가 없습니다`);
  }
});

// CW10 — `test:all`은 필터 없는 `vitest run`이라 계층 패턴 밖 파일까지 돕니다. 그런 파일이
// 있으면 루트 `test`와 계층 사슬이 다른 집합을 돌게 되므로 0개여야 합니다.
test("CW10. vitest 패키지의 test:all은 필터가 없고, 계층 밖 테스트 파일이 없다", () => {
  const dirs = { "@libitums/mobile": "apps/mobile", "@libitums/ui-lynx": "packages/ui-lynx" };

  for (const [pkg, dir] of Object.entries(dirs)) {
    const all = JSON.parse(read(`${dir}/package.json`)).scripts["test:all"];
    assert.match(all ?? "", /(?:^|&& )vitest run$/, `${pkg} test:all`);

    const outside = walk(join(root, dir))
      .filter((path) => /\.test\.[cm]?[jt]sx?$/.test(path))
      .filter((path) => !/\.(unit|ui|integration)\.test\./.test(path));
    assert.deepEqual(outside, [], `${pkg}에 계층 밖 테스트 파일이 있습니다`);
  }
});

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) return [];
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [relative(root, path)];
  });
}

// CW11 — 액션 지원 종료(Node 20 같은)를 사람이 경고 주석에서 알아채지 않도록 Dependabot이 월마다
// PR로 알립니다. 워크플로만 보면 공용 setup 액션 안의 `uses:`가 빠지므로 그 디렉터리도 넣습니다.
test("CW11. Dependabot이 워크플로와 공용 액션의 액션 버전을 함께 본다", () => {
  const path = ".github/dependabot.yml";
  assert.ok(existsSync(join(root, path)), `${path}가 없습니다`);
  const config = code(read(path));

  const entry = config.slice(config.indexOf('package-ecosystem: "github-actions"'));
  assert.notEqual(config.indexOf('package-ecosystem: "github-actions"'), -1);
  assert.match(entry, /directories:\s*\n\s*- "\/"\s*\n\s*- "\/\.github\/actions\/\*"/);
  assert.match(entry, /interval:\s*"monthly"/);
});
