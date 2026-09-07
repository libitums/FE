import assert from "node:assert/strict";
import test from "node:test";

import { mergeChangeSets, parsePorcelain, resolveGateMode } from "./gate-inputs.mjs";

const ALL_ZERO_SHA = "0000000000000000000000000000000000000000";
const BASE_SHA = "1111111111111111111111111111111111111111";
const HEAD_SHA = "2222222222222222222222222222222222222222";

test("resolveGateMode: base와 head가 둘 다 있으면 ci 모드와 그 값을 돌려준다", () => {
  const result = resolveGateMode({ POLICY_BASE: BASE_SHA, POLICY_HEAD: HEAD_SHA });

  assert.deepEqual(result, { mode: "ci", base: BASE_SHA, head: HEAD_SHA });
});

test("resolveGateMode: base만 있으면 local 모드다", () => {
  const result = resolveGateMode({ POLICY_BASE: BASE_SHA, POLICY_HEAD: undefined });

  assert.deepEqual(result, { mode: "local" });
});

test("resolveGateMode: head만 있으면 local 모드다", () => {
  const result = resolveGateMode({ POLICY_BASE: undefined, POLICY_HEAD: HEAD_SHA });

  assert.deepEqual(result, { mode: "local" });
});

test("resolveGateMode: 둘 다 빈 문자열이면 local 모드다", () => {
  const result = resolveGateMode({ POLICY_BASE: "", POLICY_HEAD: "" });

  assert.deepEqual(result, { mode: "local" });
});

test("resolveGateMode: 둘 다 없으면 local 모드다", () => {
  const result = resolveGateMode({});

  assert.deepEqual(result, { mode: "local" });
});

test("resolveGateMode: all-zero SHA는 값이 없는 것으로 본다 (새 브랜치 push의 before)", () => {
  const result = resolveGateMode({ POLICY_BASE: ALL_ZERO_SHA, POLICY_HEAD: HEAD_SHA });

  assert.deepEqual(result, { mode: "local" });
});

test("resolveGateMode: base·head 둘 다 all-zero면 local 모드다", () => {
  const result = resolveGateMode({ POLICY_BASE: ALL_ZERO_SHA, POLICY_HEAD: ALL_ZERO_SHA });

  assert.deepEqual(result, { mode: "local" });
});

test("parsePorcelain: 빈 문자열은 빈 배열이다", () => {
  assert.deepEqual(parsePorcelain(""), []);
});

test("parsePorcelain: 추적되지 않은 파일(??)이 잡힌다", () => {
  const text = "?? apps/mobile/src/new-file.tsx\0";

  assert.deepEqual(parsePorcelain(text), [{ status: "??", path: "apps/mobile/src/new-file.tsx" }]);
});

test("parsePorcelain: 수정·삭제가 상태와 함께 잡힌다", () => {
  const text = " M apps/mobile/src/App.tsx\0 D apps/mobile/src/Old.tsx\0";

  const result = parsePorcelain(text);

  assert.deepEqual(result, [
    { status: " M", path: "apps/mobile/src/App.tsx" },
    { status: " D", path: "apps/mobile/src/Old.tsx" },
  ]);
});

test("parsePorcelain: rename이 oldPath와 path 둘 다로 잡힌다 (NUL 필드 둘 소비)", () => {
  const text = "R  apps/mobile/src/Old.tsx\0apps/mobile/src/New.tsx\0";

  const result = parsePorcelain(text);

  assert.deepEqual(result, [
    {
      status: "R ",
      oldPath: "apps/mobile/src/Old.tsx",
      path: "apps/mobile/src/New.tsx",
    },
  ]);
});

test("parsePorcelain: 경로에 공백·한글이 있어도 깨지지 않는다", () => {
  const text = "?? apps/mobile/src/한글 파일 이름.tsx\0";

  assert.deepEqual(parsePorcelain(text), [
    { status: "??", path: "apps/mobile/src/한글 파일 이름.tsx" },
  ]);
});

test("mergeChangeSets: 커밋 diff와 작업 트리에 같은 경로가 있으면 한 번만 나온다", () => {
  const result = mergeChangeSets({
    committed: [{ status: "M", path: "apps/mobile/src/App.tsx" }],
    working: [{ status: " M", path: "apps/mobile/src/App.tsx" }],
  });

  assert.deepEqual(result.changedFiles, ["apps/mobile/src/App.tsx"]);
  assert.deepEqual(result.changedHeadFiles, ["apps/mobile/src/App.tsx"]);
});

test("mergeChangeSets: 삭제는 changedFiles에는 있고 changedHeadFiles에는 없다", () => {
  const result = mergeChangeSets({
    committed: [],
    working: [{ status: " D", path: "apps/mobile/src/Removed.tsx" }],
  });

  assert.deepEqual(result.changedFiles, ["apps/mobile/src/Removed.tsx"]);
  assert.deepEqual(result.changedHeadFiles, []);
  assert.deepEqual(result.deleted, ["apps/mobile/src/Removed.tsx"]);
});

test("mergeChangeSets: rename은 양쪽 경로가 changedFiles에 들어간다", () => {
  const result = mergeChangeSets({
    committed: [],
    working: [
      {
        status: "R ",
        oldPath: "apps/mobile/src/Old.tsx",
        path: "apps/mobile/src/New.tsx",
      },
    ],
  });

  assert.ok(result.changedFiles.includes("apps/mobile/src/Old.tsx"));
  assert.ok(result.changedFiles.includes("apps/mobile/src/New.tsx"));
});

test("mergeChangeSets: 한쪽이 비어도 다른 쪽 결과가 온전하다", () => {
  const result = mergeChangeSets({
    committed: [{ status: "M", path: "apps/mobile/src/App.tsx" }],
    working: [],
  });

  assert.deepEqual(result.changedFiles, ["apps/mobile/src/App.tsx"]);
  assert.deepEqual(result.changedHeadFiles, ["apps/mobile/src/App.tsx"]);
});
