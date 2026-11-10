import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup } from "@lynx-js/react/testing-library";

import * as accessibility from "../../lib/accessibility";
import { CHAT_PLACEHOLDERS } from "./chat-placeholders";
import {
  advance,
  CANNED,
  clearBackHandlers,
  KEYS_AN,
  mountChatOpen,
  tapId,
  tapKeys,
} from "./chat-ui.test-support";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(접근성 M1, a11y-findings): 상대 답장 · 사진 · 음성 도착을 낭독한다(4.1.3 Status Messages). 내가 보낸 줄 ·
// 처음 서는 대화 · 입력 중 시작은 낭독하지 않는다. 문장은 말풍선 낭독과 같다.

vi.mock("../../lib/accessibility", async (importOriginal) => ({
  ...(await importOriginal<typeof accessibility>()),
  announce: vi.fn<(content: string) => "announced">(() => "announced"),
}));

const timing = CHAT_PLACEHOLDERS.timing;
const announce = (): ReturnType<typeof vi.fn> => vi.mocked(accessibility.announce);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 9, 12, 0, 0));
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

test("M1. 방이 처음 설 때는 이미 있던 줄을 낭독하지 않는다", () => {
  mountChatOpen();
  advance(100);

  expect(announce()).not.toHaveBeenCalled();
});

test("M1. 내가 보낸 줄은 낭독하지 않고, 상대 답장이 오면 「이름: 한국어, 영어」를 한 번 낭독한다", () => {
  mountChatOpen();
  tapKeys(...KEYS_AN);
  tapId(ids.send);
  expect(announce()).not.toHaveBeenCalled();

  advance(timing.typingDelayMs);
  expect(announce()).not.toHaveBeenCalled();
  advance(timing.replyDelayMs);

  expect(announce()).toHaveBeenCalledTimes(1);
  expect(announce()).toHaveBeenCalledWith(`미나: ${CANNED.ko}, ${CANNED.en}`);
});

test("M1. 사진이 도착하면 「Photo from 미나」를 한 번 낭독한다(요청 중 스켈레톤은 낭독하지 않는다)", () => {
  mountChatOpen({ gemBalance: 100 });
  tapId(ids.snapshot);
  tapId(ids.askConfirm);
  expect(announce()).not.toHaveBeenCalled();

  advance(timing.photoArrivalMs);

  expect(announce()).toHaveBeenCalledTimes(1);
  expect(announce()).toHaveBeenCalledWith("Photo from 미나");
});
