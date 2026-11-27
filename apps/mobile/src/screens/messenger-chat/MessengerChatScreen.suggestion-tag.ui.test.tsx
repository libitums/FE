import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@lynx-js/react/testing-library";

import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote } from "./chat-remote.contract";
import { KEYS_AN, clearBackHandlers, mountChat, tapId, tapKeys } from "./chat-ui.test-support";
import { companionSeed } from "./companion-roster";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(CS-UI1 · UI2): 보기 판에서 칩을 탭해 보내면 그 칩의 표시가 턴 요청에 실리고, 입력 칸에 써서 보내면 없다(ADR-0210 D1).

const A0 = "00000000-0000-4000-8000-000000000000";
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => vi.useRealTimers());
afterEach(() => {
  cleanup();
  clearBackHandlers();
});

async function openServerRoom() {
  const requests: Parameters<ChatRemote["openTurn"]>[0][] = [];
  const remote: ChatRemote = {
    loadHistory: async () => ({
      messages: [
        { id: `${A0}#0`, at: 1, kind: "text", from: "them", text: { ko: "뭐 해요?", en: "" } },
      ],
      corrections: {},
      ideas: [
        { ko: "공부해요", roman: "", en: "Studying" },
        { ko: "쉬어요", roman: "", en: "Resting" },
      ],
      ideasRef: { messageId: A0, indexes: [0, 1] },
    }),
    greet: async () => null,
    openTurn: (request) => {
      requests.push(request);
      return { cancel: () => undefined };
    },
  };
  const source = createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: 2000 } },
    timers: fakeTimers(),
    remote,
  });
  mountChat({ source, roomId: "duksu" });
  await flush();
  return requests;
}

test("CS-UI1 보기를 탭해 보내면 턴 요청에 그 칩의 메시지 · 자리가 실린다", async () => {
  const requests = await openServerRoom();
  tapId(ids.ideasButton);
  tapId(ids.idea(1));
  expect(requests).toEqual([
    expect.objectContaining({ text: "쉬어요", suggestion: { messageId: A0, index: 1 } }),
  ]);
});

test("CS-UI2 입력 칸에 써서 보내면 표시가 없다", async () => {
  const requests = await openServerRoom();
  act(() => {
    fireEvent.tap(screen.getByTestId(ids.field), {});
  });
  tapKeys(...KEYS_AN);
  tapId(ids.send);
  expect(requests).toHaveLength(1);
  expect(requests[0]).not.toHaveProperty("suggestion");
});
