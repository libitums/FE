import assert from "node:assert/strict";
import test from "node:test";

import { snapshotCoverage } from "./snapshot-coverage.mjs";

const mainThread = [
  'var a="__snapshot_4e28c_7918a_2";e4[a]=e=>ty(e,function(){},null);',
  'var b="__snapshot_a5429_7c781_1";e4[b]=e=>ty(e,function(){},null);',
  'registerWorkletInternal("main-thread","5da8:93f36:1",function(e){});',
].join("");

// SC1 — background가 쓰는 틀 · worklet이 메인 스레드에 모두 있으면 빠진 것이 없습니다.
test("SC1. background의 틀과 worklet이 메인 스레드에 모두 있으면 빠진 것이 없다", () => {
  const result = snapshotCoverage({
    mainThread,
    background:
      'var x="__snapshot_4e28c_7918a_2";var y="__snapshot_a5429_7c781_1";f({_wkltId:"5da8:93f36:1"});',
  });
  assert.deepEqual(result, {
    snapshots: 2,
    worklets: 1,
    missingSnapshots: [],
    missingWorklets: [],
  });
});

// SC2 — 메인 스레드에서 모듈이 통째로 빠진 경우(ui-lynx `sideEffects`)를 잡습니다.
test("SC2. 메인 스레드에 등록이 없는 틀 id를 돌려준다", () => {
  const result = snapshotCoverage({
    mainThread,
    background:
      'var x="__snapshot_4e28c_7918a_2";var z="__snapshot_b657a_9d03d_5";var w="__snapshot_b657a_9d03d_7";',
  });
  assert.deepEqual(result.missingSnapshots, [
    "__snapshot_b657a_9d03d_5",
    "__snapshot_b657a_9d03d_7",
  ]);
});

// SC3 — main-thread 함수도 등록이 빠지면 잡습니다.
test("SC3. 메인 스레드에 등록이 없는 worklet id를 돌려준다", () => {
  const result = snapshotCoverage({
    mainThread,
    background: 'f({_wkltId:"5da8:93f36:1"});g({_wkltId:"bf2f:8accd:2"});',
  });
  assert.deepEqual(result.missingWorklets, ["bf2f:8accd:2"]);
});

// SC4 — 메인 스레드에만 있는 틀(첫 화면 전용)은 문제가 아닙니다.
test("SC4. 메인 스레드에만 있는 틀은 빠진 것으로 세지 않는다", () => {
  const result = snapshotCoverage({ mainThread, background: "" });
  assert.deepEqual(result, {
    snapshots: 0,
    worklets: 0,
    missingSnapshots: [],
    missingWorklets: [],
  });
});
