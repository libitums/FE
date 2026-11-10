import { afterEach, expect, test } from "vitest";
import { act, cleanup, render, screen } from "@lynx-js/react/testing-library";

import type { ChatSnapshot, ChatSource } from "./chat-source.contract";
import { useChatSnapshot } from "./use-chat-source";

// `ui` 계층(기기 결함 D3 후속): 출처가 알림 없이 스냅숏 참조를 바꿔도(그림 해석기 교체) 다시 그리면 최신을 본다.
// 목록은 렌더마다 `source.snapshot()`을 읽는다(방 hook `useChatThread`와 같은 방식).

afterEach(cleanup);

const snapshotOf = (name: string): ChatSnapshot =>
  ({ rooms: [{ counterpart: { name } }] }) as unknown as ChatSnapshot;

function Probe({ source }: { readonly source: ChatSource }) {
  const snapshot = useChatSnapshot(source);
  return <text data-testid="name">{snapshot.rooms[0]?.counterpart.name}</text>;
}

test("D3. 알림 없이 snapshot()이 바뀌어도 다시 그리면 새 값을 읽는다", () => {
  let current = snapshotOf("before");
  const source = {
    snapshot: () => current,
    subscribe: () => () => undefined,
  } as unknown as ChatSource;
  const { rerender } = render(<Probe source={source} />);
  expect(screen.getByTestId("name").textContent).toBe("before");

  current = snapshotOf("after");
  rerender(<Probe source={source} />);

  expect(screen.getByTestId("name").textContent).toBe("after");
});

test("D3. 알림이 오면 다시 그린다", () => {
  let current = snapshotOf("a");
  const listeners = new Set<() => void>();
  const source = {
    snapshot: () => current,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  } as unknown as ChatSource;
  render(<Probe source={source} />);

  current = snapshotOf("b");
  act(() => {
    for (const listener of listeners) listener();
  });

  expect(screen.getByTestId("name").textContent).toBe("b");
});
