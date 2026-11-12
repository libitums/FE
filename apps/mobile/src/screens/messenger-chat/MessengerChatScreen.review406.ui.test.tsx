import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import * as inputFocus from "./chat-input-focus";
import {
  advance,
  clearBackHandlers,
  KEYS_AN,
  mountChatOpen,
  nativeInput,
  presenceProbe,
  slotContent,
  systemBack,
  tapId,
  tapLog,
  tapKeys,
} from "./chat-ui.test-support";
import { chatFeedbackTestIds } from "./chat-feedback.contract";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";

// `ui` 계층(PR #406 코드 리뷰 #2 · #3 · #6 · #8): 초점은 입력 칸이 켜진 모습이 그려진 뒤에 가고, 다시 마운트한 칸에 가며,
// 학습 키마다 입력 칸을 다시 만들지 않고, 겹침 하나에 뒤로가기 등록은 하나다.

vi.mock("./chat-input-focus", () => ({
  focusPhoneInput: vi.fn<() => void>(),
  blurPhoneInput: vi.fn<() => void>(),
  clearPhoneInput: vi.fn<(onFail?: () => void) => void>(),
  restoreAccessibilityFocus: vi.fn<(testId: string) => void>(),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

const interactive = (): string | null =>
  screen.getByTestId(ids.input).getAttribute("user-interaction-enabled");

test("#2. 학습 → 휴대폰: 초점을 부르는 순간 입력 칸은 이미 켜져 있고(user-interaction-enabled) 자리는 아직 학습 키보드다", () => {
  const seen: { interactive: string | null; slot: string | null }[] = [];
  vi.mocked(inputFocus.focusPhoneInput).mockImplementation(() => {
    seen.push({ interactive: interactive(), slot: slotContent() });
  });
  mountChatOpen({ probe: presenceProbe("absent") });

  tapId(ids.toggle("phone"));
  advance(16);

  expect(seen).toEqual([{ interactive: "true", slot: "learning-keyboard" }]);
});

test("#2. 보기 패널 → Type myself(휴대폰): 초점을 부르는 순간 보기 패널은 이미 접혀 있고 입력 칸이 켜져 있다", () => {
  const seen: { interactive: string | null; slot: string | null }[] = [];
  mountChatOpen({ probe: presenceProbe("present") });
  advance(16);
  tapId(ids.ideasButton);
  vi.mocked(inputFocus.focusPhoneInput).mockImplementation(() => {
    seen.push({ interactive: interactive(), slot: slotContent() });
  });

  tapId(ids.ideasTypeMyself);
  advance(16);

  expect(seen).toEqual([{ interactive: "true", slot: "phone-spacer" }]);
});

test("#3. 보낸 뒤 비우기에 실패해 입력 칸을 다시 마운트하면 초점은 새 칸이 그려진 뒤 새 칸에 간다", () => {
  mountChatOpen({ probe: presenceProbe("present") });
  advance(16);
  nativeInput("focus", "");
  nativeInput("input", "안녕");
  vi.mocked(inputFocus.clearPhoneInput).mockImplementation((onFail) => onFail?.());
  const before = screen.getByTestId(ids.input);
  const seen: Element[] = [];
  vi.mocked(inputFocus.focusPhoneInput).mockImplementation(() => {
    seen.push(screen.getByTestId(ids.input));
  });

  tapId(ids.send);
  advance(16);

  expect(seen).toHaveLength(1);
  expect(seen[0]).not.toBe(before);
  expect(seen[0]?.isConnected).toBe(true);
});

test("#6. 학습 키를 눌러도 숨은 입력 칸을 다시 만들지 않는다", () => {
  mountChatOpen({ probe: presenceProbe("absent") });
  const before = screen.getByTestId(ids.input);

  tapKeys(...KEYS_AN);
  tapKeys("ㅇ");
  tapKeys("backspace");

  expect(screen.getByTestId(ids.input)).toBe(before);
});

test("#6. 학습에서 쓴 글은 휴대폰으로 바꿀 때 default-value로 들어간다", () => {
  mountChatOpen({ probe: presenceProbe("absent") });
  tapKeys(...KEYS_AN);

  tapId(ids.toggle("phone"));

  expect(screen.getByTestId(ids.input).getAttribute("default-value")).toBe("안");
});

function trackLayerRegistrations(): () => number {
  const live = new Set<object>();
  const add = backHandlers.add.bind(backHandlers);
  vi.spyOn(backHandlers, "add").mockImplementation((level, entry) => {
    const record = { level };
    if (level === "layer") live.add(record);
    const off = add(level, entry);
    return () => {
      live.delete(record);
      off();
    };
  });
  return () => live.size;
}

test.each([
  ["사이드바", () => tapId(ids.settings)],
  [
    "채팅 지우기 확인",
    () => {
      tapId(ids.settings);
      tapId(ids.sidebarDelete);
    },
  ],
  [
    "엽전 상점(사이드바에서)",
    () => {
      tapId(ids.settings);
      tapId(ids.sidebarGetCoins);
    },
  ],
  ["사진 요청", () => tapId(ids.snapshot)],
  [
    "👎 이유 시트",
    () => {
      tapId(chatFeedbackTestIds.ratingBad);
    },
  ],
  [
    "다시 만들기 확인",
    () => {
      tapId(ids.more);
      tapId(ids.moreItem("ideas"));
    },
  ],
])("#8. %s이(가) 열려 있는 동안 층 뒤로가기 등록은 하나뿐이다", (_name, open) => {
  const count = trackLayerRegistrations();
  mountChatOpen({ probe: presenceProbe("absent") });
  tapLog();
  expect(count()).toBe(0);

  open();

  expect(count()).toBe(1);
});

test("#8. 엽전 상점에서 뒤로가기는 사이드바로, 한 번 더는 사이드바를 닫는다", () => {
  mountChatOpen({ probe: presenceProbe("absent") });
  tapLog();
  tapId(ids.settings);
  tapId(ids.sidebarGetCoins);

  systemBack();
  expect(screen.getByTestId(ids.sidebar)).toBeTruthy();

  systemBack();
  expect(screen.queryByTestId(ids.sidebar)).toBeNull();
});
