import { describe, expect, it, vi } from "vitest";

import { createBackHandlerStack } from "./back-handler";
import type { BackHandlerEntry } from "./back-handler";

// React 없이 스택만 봅니다. 등록 한 건은 `{ current }` 객체이고 스택은 부를 때 `current`를 읽습니다.

function entryOf(fn: () => void = vi.fn<() => void>()): BackHandlerEntry {
  return { current: fn };
}

describe("createBackHandlerStack", () => {
  it("BH1. 빈 스택의 runTop은 false다", () => {
    expect(createBackHandlerStack().runTop()).toBe(false);
  });

  it("BH2. screen 한 건이면 그것을 한 번 부르고 true다", () => {
    const stack = createBackHandlerStack();
    const screen = vi.fn<() => void>();
    stack.add("screen", entryOf(screen));
    expect(stack.runTop()).toBe(true);
    expect(screen).toHaveBeenCalledTimes(1);
  });

  it("BH3. screen 뒤에 layer를 등록하면 layer만 불린다", () => {
    const stack = createBackHandlerStack();
    const screen = vi.fn<() => void>();
    const layer = vi.fn<() => void>();
    stack.add("screen", entryOf(screen));
    stack.add("layer", entryOf(layer));
    expect(stack.runTop()).toBe(true);
    expect(layer).toHaveBeenCalledTimes(1);
    expect(screen).not.toHaveBeenCalled();
  });

  it("BH4. layer 뒤에 screen을 등록해도(순서 반대) layer만 불린다", () => {
    const stack = createBackHandlerStack();
    const screen = vi.fn<() => void>();
    const layer = vi.fn<() => void>();
    stack.add("layer", entryOf(layer));
    stack.add("screen", entryOf(screen));
    expect(stack.runTop()).toBe(true);
    expect(layer).toHaveBeenCalledTimes(1);
    expect(screen).not.toHaveBeenCalled();
  });

  it("BH5. layer 둘이면 나중 것만 불리고, 그것을 해제하면 앞의 것이 불린다", () => {
    const stack = createBackHandlerStack();
    const first = vi.fn<() => void>();
    const second = vi.fn<() => void>();
    stack.add("layer", entryOf(first));
    const removeSecond = stack.add("layer", entryOf(second));
    expect(stack.runTop()).toBe(true);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();

    removeSecond();
    expect(stack.runTop()).toBe(true);
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("BH6. screen 둘이면 나중 것만 불린다", () => {
    const stack = createBackHandlerStack();
    const first = vi.fn<() => void>();
    const second = vi.fn<() => void>();
    stack.add("screen", entryOf(first));
    stack.add("screen", entryOf(second));
    expect(stack.runTop()).toBe(true);
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });

  it("BH7. 등록 뒤 entry.current를 바꾸면 바뀐 함수가 불리고 자리는 그대로다", () => {
    const stack = createBackHandlerStack();
    const earlier = entryOf(vi.fn<() => void>());
    const later = vi.fn<() => void>();
    stack.add("screen", earlier);
    stack.add("screen", entryOf(later));
    const replaced = vi.fn<() => void>();
    earlier.current = replaced;
    // 나중 등록이 여전히 이긴다 — 바꾼 쪽이 앞지르지 않는다.
    expect(stack.runTop()).toBe(true);
    expect(later).toHaveBeenCalledTimes(1);
    expect(replaced).not.toHaveBeenCalled();

    // 뒤의 것이 없으면 바뀐 함수가 불린다.
    const solo = createBackHandlerStack();
    const before = vi.fn<() => void>();
    const after = vi.fn<() => void>();
    const entry = entryOf(before);
    solo.add("screen", entry);
    entry.current = after;
    expect(solo.runTop()).toBe(true);
    expect(after).toHaveBeenCalledTimes(1);
    expect(before).not.toHaveBeenCalled();
  });

  it("BH8. 해제를 두 번 불러도 다른 등록이 사라지지 않고, 전부 해제하면 false다", () => {
    const stack = createBackHandlerStack();
    const kept = vi.fn<() => void>();
    const removed = vi.fn<() => void>();
    const removeKept = stack.add("layer", entryOf(kept));
    const remove = stack.add("layer", entryOf(removed));
    remove();
    remove();
    expect(stack.runTop()).toBe(true);
    expect(kept).toHaveBeenCalledTimes(1);
    expect(removed).not.toHaveBeenCalled();

    removeKept();
    expect(stack.runTop()).toBe(false);
  });
});
