import { expect, test } from "vitest";

import { accountMemory } from "./story-row-memory";

// `unit` 계층(SRM-U1 ~ U3): 스토리 줄의 마지막 모습 — 계정마다 하나, 처음은 없음, 마지막에 둔 값.

test("SRM-U1 둔 적이 없으면 null", () => {
  expect(accountMemory<string[]>(() => "a").read()).toBeNull();
});

test("SRM-U2 같은 계정이면 마지막에 둔 값을 돌려줍니다", () => {
  const memory = accountMemory<string[]>(() => "a");
  memory.keep(["one"]);
  memory.keep(["two"]);
  expect(memory.read()).toEqual(["two"]);
});

test("SRM-U3 계정을 바꾸면 앞 계정의 값이 없고, 돌아오면 다시 있습니다", () => {
  let account = "a";
  const memory = accountMemory<string[]>(() => account);
  memory.keep(["mine-a"]);
  account = "b";
  expect(memory.read()).toBeNull();
  memory.keep(["mine-b"]);
  account = "a";
  expect(memory.read()).toEqual(["mine-a"]);
});
