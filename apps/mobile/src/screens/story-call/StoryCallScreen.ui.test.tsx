import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, within } from "@lynx-js/react/testing-library";

import { lightStatusBarIcons } from "../../lib/status-bar-icons";
import { StoryCallScreen } from "./StoryCallScreen";
import { storyCallTestIds as ids, type StoryCallView } from "./story-call.contract";

// `ui` 계층: 전화 막간 — 수신 → Answer → 가운데 대사 한 줄이 바뀜(상대 · 나 · 배경 소리) → 끊김 → Finish story.
// 표시 모델 · 시간 계산은 unit이 지므로 손으로 세운 모델을 넣고 가짜 타이머로 흘립니다.

const call: StoryCallView = {
  counterpart: "사장님",
  counterpartAvatarUrl: null,
  backgroundUrl: "https://cdn/u09/pre-2.webp",
  lines: [
    {
      kind: "caller",
      label: "사장님",
      text: { ko: "어디예요?", en: "Where are you?" },
      audioSource: null,
      holdMs: 3000,
    },
    {
      kind: "self",
      label: "",
      text: { ko: "역이에요.", en: "At the station." },
      audioSource: null,
      holdMs: 2800,
    },
    {
      kind: "background",
      label: "안내 방송",
      text: { ko: "열차가 들어옵니다.", en: "Train arriving." },
      audioSource: null,
      holdMs: 3000,
    },
  ],
  end: { ko: "뚝.", en: "Click." },
};

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function mount() {
  const onComplete = vi.fn<() => void>();
  const onExit = vi.fn<() => void>();
  render(
    <StoryCallScreen
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      call={call}
      onComplete={onComplete}
      onExit={onExit}
    />,
  );
  return { onComplete, onExit };
}
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const answer = () => fireEvent.tap(screen.getByTestId(ids.answer), {});
const line = () => screen.getByTestId(ids.line);

test("SCU1. 수신 화면 — 상대 이름 · Answer, 짙은 면이라 밝은 아이콘 표지, 시계는 아직 없다", () => {
  mount();
  const incoming = screen.getByTestId(ids.incoming);
  expect(incoming.textContent).toContain("사장님");
  expect(incoming.textContent).toContain("Incoming call");
  expect(screen.getByTestId(ids.screen).getAttribute("data-statusbar")).toBe(lightStatusBarIcons);
  expect(screen.queryByTestId(ids.clock)).toBeNull();
});

test("SCU5. 프로필 그림이 있으면 큰 원형 그림(수신 hero · 통화 large)으로 그린다", () => {
  render(
    <StoryCallScreen
      insets={{ top: 0, bottom: 0, left: 0, right: 0 }}
      call={{ ...call, counterpartAvatarUrl: "https://cdn/profiles/yoonkyung.webp" }}
      onComplete={vi.fn<() => void>()}
      onExit={vi.fn<() => void>()}
    />,
  );
  const photo = () => screen.getByTestId(ids.photo);
  expect(photo().getAttribute("src")).toBe("https://cdn/profiles/yoonkyung.webp");
  expect(photo()).toHaveClass("story-call-photo-hero");
  answer();
  expect(photo()).toHaveClass("story-call-photo-large");
});

test("SCU2. Answer → Connecting… → 첫 대사(상대 이름 · 글), 시계가 간다", () => {
  mount();
  answer();
  expect(screen.getByTestId(ids.active).textContent).toContain("Connecting");
  wait(1200);
  expect(screen.getByTestId(ids.lineLabel).textContent).toBe("사장님");
  expect(screen.getByTestId(ids.lineText).textContent).toBe("어디예요?");
  expect(line().getAttribute("data-kind")).toBe("caller");
  wait(1000);
  expect(screen.getByTestId(ids.clock).textContent).toBe("00:02");
});

test("SCU3. 대사는 가운데 한 줄만 바뀐다 — 나는 Me · self, 배경 소리는 이름 · background", () => {
  mount();
  answer();
  for (let i = 0; i < 2; i += 1) wait(1200);
  wait(4000);
  expect(screen.getAllByTestId(ids.line)).toHaveLength(1);
  expect(line().getAttribute("data-kind")).toBe("self");
  expect(screen.getByTestId(ids.lineLabel).textContent).toBe("Me");
  wait(4000);
  expect(line().getAttribute("data-kind")).toBe("background");
  expect(screen.getByTestId(ids.lineLabel).textContent).toBe("안내 방송");
});

test("SCU4. 마지막 대사 뒤 끊김 — 지문 · Finish story는 onComplete 한 번, 머리 뒤로는 onExit", () => {
  const { onComplete, onExit } = mount();
  answer();
  for (let i = 0; i < 8; i += 1) wait(4000);
  expect(screen.getByTestId(ids.endText).textContent).toBe("뚝.");
  expect(screen.getByTestId(ids.ended).textContent).toContain("Call ended");
  const finish = within(screen.getByTestId(ids.finish)).getByTestId("ui-lynx-button");
  fireEvent.tap(finish, {});
  fireEvent.tap(finish, {});
  expect(onComplete).toHaveBeenCalledTimes(1);
  fireEvent.tap(within(screen.getByTestId(ids.back)).getByTestId("ui-lynx-round-button"), {});
  expect(onExit).toHaveBeenCalledTimes(1);
});
