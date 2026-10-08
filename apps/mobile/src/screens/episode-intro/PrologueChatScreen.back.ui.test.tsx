import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type { PrologueChat } from "./episode-intro.contract";
import { PrologueChatScreen } from "./PrologueChatScreen";

const chat: PrologueChat = {
  partnerName: "Yuna",
  messages: [
    { id: "m1", sender: "other", text: "한국에는 잘 도착했어?", translation: "Did you arrive?" },
  ],
};

// `ui` 계층: 시스템 뒤로가기(`backHandlers.runTop()`)가 보이는 닫기를 누른 것과 같은 결과를
// 내는지 봅니다. 스택은 실물이고, 케이스 사이에 정리 뒤 비어 있어야 합니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function pressBack(): boolean {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
}

test("[US15] 뒤로가기 → onBack 1회 · onComplete 0회", () => {
  const onBack = vi.fn<() => void>();
  const onComplete = vi.fn<() => void>();
  render(
    <PrologueChatScreen
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      episodeLabel="Episode 1."
      chat={chat}
      onComplete={onComplete}
      onBack={onBack}
    />,
  );

  expect(pressBack()).toBe(true);

  expect(onBack).toHaveBeenCalledTimes(1);
  expect(onComplete).not.toHaveBeenCalled();
});
