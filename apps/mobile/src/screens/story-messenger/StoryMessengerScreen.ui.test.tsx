import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { StoryMessengerScreen } from "./StoryMessengerScreen";
import { storyMessengerTestIds as ids, type StoryChatView } from "./story-messenger.contract";

// `ui` 계층: 문자 막간 메신저 — 시간 표시 → 메신저 머리 · 메시지가 시간에 따라 쌓임 · 답장 시트 · 분기 · 끝.
// 진행 계산은 unit이 지므로 여기서는 손으로 세운 표시 모델을 넣고, 가짜 타이머로 시간을 흘립니다.

const insets = { top: 0, bottom: 0, left: 0, right: 0 };
const t = (ko: string) => ({ ko, en: `e-${ko}` });

const chat: StoryChatView = {
  ordinal: 4,
  counterpart: "미나",
  counterpartAvatarUrl: "https://cdn/images/profiles/mina-casual.webp",
  backgroundUrl: "https://cdn/images/u04/pre-2.webp",
  caption: { ko: "조금 전", en: "A little earlier" },
  turns: [
    {
      kind: "message",
      self: false,
      speaker: "미나",
      text: t("식당 찾았어요?"),
      imageUrl: null,
      afterOption: null,
    },
    { kind: "reply", options: [t("아니요"), t("어디예요?")] },
    {
      kind: "message",
      self: false,
      speaker: "미나",
      text: t("괜찮아요"),
      imageUrl: null,
      afterOption: 1,
    },
    {
      kind: "message",
      self: false,
      speaker: "미나",
      text: t("맛있어요"),
      imageUrl: "https://cdn/photo.webp",
      afterOption: 2,
    },
  ],
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function mount(view: StoryChatView = chat) {
  const onComplete = vi.fn<() => void>();
  const onExit = vi.fn<() => void>();
  render(
    <StoryMessengerScreen insets={insets} chat={view} onComplete={onComplete} onExit={onExit} />,
  );
  return { onComplete, onExit };
}

const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
// 타이머 하나가 끝나야 다음 타이머가 걸리므로 여러 번 나눠 흘립니다.
const drain = () => {
  for (let i = 0; i < 8; i += 1) wait(5000);
};
const incoming = () => screen.queryAllByTestId(ids.incoming).map((el) => el.textContent ?? "");
const outgoing = () => screen.queryAllByTestId(ids.outgoing).map((el) => el.textContent ?? "");
const tapOption = (index: number) => fireEvent.tap(screen.getByTestId(ids.option(index)), {});
const enterChat = () => fireEvent.tap(screen.getByTestId(ids.intro), {});

test("SMU1. 시간 표시 화면이 먼저 서고(밝은 아이콘 표지), 탭하면 머리에 상대 이름이 선다", () => {
  mount();
  const intro = screen.getByTestId(ids.intro);
  expect(intro.getAttribute("data-statusbar")).toBe(lightStatusBarIcons);
  expect(screen.getByTestId(ids.introCaption).textContent).toContain("조금 전");
  expect(intro.textContent).toContain("STORY · EPISODE 4");
  expect(screen.queryByTestId(ids.header)).toBeNull();
  enterChat();
  expect(screen.queryByTestId(ids.intro)).toBeNull();
  expect(screen.getByTestId(ids.title).textContent).toBe("미나");
  expect(screen.getByTestId(ids.header).getAttribute("data-statusbar")).toBeNull();
});

test("SMU2. 시간 표시 화면은 탭하지 않아도 2.6초 뒤 메신저로 넘어간다", () => {
  mount();
  wait(2599);
  expect(screen.queryByTestId(ids.header)).toBeNull();
  wait(1);
  expect(screen.getByTestId(ids.header)).toBeTruthy();
});

test("SMU3. 읽는 틈 → 입력 중 → 메시지, 그리고 읽을 시간 뒤 답장 시트가 선다", () => {
  mount();
  enterChat();
  expect(incoming()).toEqual([]);
  expect(screen.queryByTestId(ids.typing)).toBeNull();
  wait(1200); // 읽는 틈(첫 메시지 앞)
  expect(screen.getByTestId(ids.typing)).toBeTruthy();
  wait(3000); // 입력 중
  expect(incoming()).toHaveLength(1);
  expect(incoming()[0]).toContain("식당 찾았어요?");
  const avatar = within(screen.getAllByTestId(ids.incoming)[0] as HTMLElement).getByTestId(
    "ui-lynx-avatar-image",
  );
  expect(avatar.getAttribute("src")).toBe("https://cdn/images/profiles/mina-casual.webp");
  expect(screen.queryByTestId(ids.option(0))).toBeNull();
  wait(4000); // 시트 앞 읽을 시간
  expect(screen.getByTestId(ids.option(0)).textContent).toContain("아니요");
  expect(screen.getByTestId(ids.option(1)).textContent).toContain("어디예요?");
});

test("SMU4. 보기를 고르면 내 말풍선과 그 답의 분기 줄만 이어지고, 끝 버튼은 onComplete를 한 번 부른다", () => {
  const { onComplete } = mount();
  enterChat();
  drain();
  tapOption(1);
  expect(screen.queryByTestId(ids.option(0))).toBeNull();
  expect(outgoing()[0]).toContain("어디예요?");
  drain();
  expect(incoming().join("|")).toContain("맛있어요");
  expect(incoming().join("|")).not.toContain("괜찮아요");
  expect(screen.getByTestId(ids.photo)).toBeTruthy();
  const finish = screen.getByTestId(ids.finish);
  fireEvent.tap(within(finish).getByTestId("ui-lynx-button"), {});
  fireEvent.tap(within(finish).getByTestId("ui-lynx-button"), {});
  expect(onComplete).toHaveBeenCalledTimes(1);
});

test("SMU5. 입력창은 늘 같은 모습이고, 답장 시트는 고를 때까지 닫히지 않는다 · 머리 뒤로 가기는 onExit", () => {
  const { onExit } = mount();
  enterChat();
  expect(screen.getByTestId(ids.composerField).textContent).toBe("Message");
  drain();
  expect(screen.getByTestId(ids.option(0))).toBeTruthy();
  expect(screen.queryByTestId("ui-lynx-bottom-sheet-close")).toBeNull();
  fireEvent.tap(screen.getByTestId("ui-lynx-bottom-sheet-scrim"), {});
  expect(screen.getByTestId(ids.option(0))).toBeTruthy();
  expect(screen.getByTestId(ids.composerField).textContent).toBe("Message");
  fireEvent.tap(within(screen.getByTestId(ids.back)).getByTestId("ui-lynx-round-button"), {});
  expect(onExit).toHaveBeenCalledTimes(1);
});

test("SMU6. 자막이 없으면 시간 표시 화면 없이 바로 메신저다", () => {
  mount({ ...chat, caption: null });
  expect(screen.queryByTestId(ids.intro)).toBeNull();
  expect(screen.getByTestId(ids.title).textContent).toBe("미나");
});
