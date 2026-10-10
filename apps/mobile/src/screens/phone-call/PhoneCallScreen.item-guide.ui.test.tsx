import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import { guideRoots, stubGuideStorage } from "../../lib/learning-item-guide.storage.test-support";
import type { PhoneCallConversation } from "./phone-call.contract";
import { PhoneCallScreen } from "./PhoneCallScreen";

// `ui` 계층: 전화 화면의 학습 문항 안내. 전화는 늘 대상이다 — 떠 있는 동안 벨이 울리지 않고
// `Accept` · 답장이 상태를 바꾸지 않으며 음원이 시작되지 않는다. 나가기는 막지 않는다.

const audio = vi.hoisted(() => ({ playAudio: vi.fn(), stopAudio: vi.fn() }));
vi.mock("../../lib/audio", () => audio);

const conversation: PhoneCallConversation = {
  unitId: "appointment-confirmation-phone-call",
  title: "A Call from Minseo",
  turns: [
    {
      id: "confirm-time",
      speakerId: "jimin",
      speakerName: "Minseo",
      transcript: "토요일 오후 2시에 역 앞 카페에서 만나는 거 맞죠?",
      audioSource: "phone-call-confirm-01",
      reply: { id: "confirm-time-reply", text: "네, 토요일 오후 2시에 만나요." },
    },
    {
      id: "confirm-place",
      speakerId: "jimin",
      speakerName: "Minseo",
      transcript: "카페는 2번 출구 오른쪽에 있는 곳 맞죠?",
      audioSource: "phone-call-confirm-02",
      reply: { id: "confirm-place-reply", text: "네, 2번 출구 오른쪽 카페예요." },
    },
    {
      id: "goodbye",
      speakerId: "jimin",
      speakerName: "Minseo",
      transcript: "좋아요. 그럼 토요일에 봐요!",
      audioSource: "phone-call-confirm-03",
      reply: { id: "goodbye-reply", text: "네, 토요일에 봐요!" },
    },
  ],
};

let sounds: string[] = [];

beforeEach(() => {
  audio.playAudio.mockReset();
  audio.stopAudio.mockReset();
  audio.playAudio.mockReturnValue("started");
  sounds = [];
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  if (backHandlers.runTop()) {
    throw new Error("뒤로가기 핸들러가 정리되지 않았습니다");
  }
});

function stubStorage(options: Parameters<typeof stubGuideStorage>[0] = {}) {
  return stubGuideStorage({
    ...options,
    modules: {
      SoundEffectsModule: { play: (id: string) => sounds.push(id), stopRing: () => {} },
    },
  });
}

function renderScreen() {
  const props = { onComplete: vi.fn<() => void>(), onExit: vi.fn() };
  render(
    <PhoneCallScreen
      unitId={conversation.unitId}
      conversation={conversation}
      completionStatus="available"
      {...props}
    />,
  );
  return props;
}

const guide = () => screen.queryByTestId("learning-item-guide-phone-call");
const screenRoot = () => screen.getByTestId("phone-call-screen");
const rings = () => sounds.filter((id) => id === "ring_bell");
const tapGuide = () =>
  fireEvent.tap(screen.getByTestId("learning-item-guide-phone-call"), {
    eventType: "catchEvent",
  });
const pressBack = (): boolean => {
  let handled = false;
  act(() => {
    handled = backHandlers.runTop();
  });
  return handled;
};

test("[SC1·PC] 안 본 저장소에서 전화를 열면 안내가 하나 서고, 화면 루트가 가려지며, 안내는 루트의 자손이 아니다", () => {
  stubStorage();
  renderScreen();

  expect(guideRoots()).toHaveLength(1);
  expect(screenRoot()).toHaveAttribute("accessibility-elements-hidden", "true");
  expect(screenRoot().contains(guide())).toBe(false);
});

test("[SC2·PC] 안내를 탭하면 사라지고, 루트의 가림은 false로 남으며, 그 종류가 저장된다", () => {
  const double = stubStorage();
  renderScreen();

  tapGuide();

  expect(guide()).toBeNull();
  expect(screenRoot()).toHaveAttribute("accessibility-elements-hidden", "false");
  expect(double.savedKinds()).toEqual(["phone-call"]);
});

test("[SC3·PC] 뒤로가기 한 번은 안내만 닫고, 한 번 더는 화면의 닫기(onExit)다", () => {
  stubStorage();
  const props = renderScreen();

  expect(pressBack()).toBe(true);
  expect(guide()).toBeNull();
  expect(props.onExit).not.toHaveBeenCalled();
  expect(screen.getByTestId("phone-call-screen")).toBeInTheDocument();

  expect(pressBack()).toBe(true);
  expect(props.onExit).toHaveBeenCalledTimes(1);
  expect(props.onExit).toHaveBeenCalledWith("incomplete");
});

test("[SC4·PC] 그 종류를 이미 봤으면 안내가 없고 루트가 가려지지 않는다", () => {
  stubStorage({ seen: ["phone-call"] });
  renderScreen();

  expect(guideRoots()).toHaveLength(0);
  expect(screenRoot().getAttribute("accessibility-elements-hidden")).not.toBe("true");
});

test("[SC5·PC] 저장소가 없으면 안내가 없다", () => {
  renderScreen();

  expect(guideRoots()).toHaveLength(0);
});

test("[PC6] 떠 있는 동안 벨 · 음원 0회이고 Accept가 통화를 시작하지 않으며, 닫으면 벨이 1회 울리고 Accept가 통화를 시작한다", () => {
  stubStorage();
  renderScreen();
  expect(guide()).not.toBeNull();

  expect(rings()).toHaveLength(0);
  fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
  expect(screen.getByTestId("phone-call-status")).toHaveTextContent("Incoming call…");
  expect(audio.playAudio).not.toHaveBeenCalled();
  expect(sounds).not.toContain("accept_call");
  expect(rings()).toHaveLength(0);

  tapGuide();
  expect(rings()).toHaveLength(1);
  fireEvent.tap(screen.getByTestId("phone-call-audio-button"), {});
  expect(screen.getByTestId("phone-call-status")).toHaveTextContent("Speaking…");
  expect(audio.playAudio).toHaveBeenCalledWith("phone-call-confirm-01", expect.any(Function));
});

test("[PC7] 안내가 뜰 조건에서도 나가기 버튼은 막히지 않는다", () => {
  stubStorage();
  const props = renderScreen();

  fireEvent.tap(screen.getByTestId("phone-call-exit-button"), {});

  expect(props.onExit).toHaveBeenCalledTimes(1);
  expect(props.onExit).toHaveBeenCalledWith("incomplete");
});
