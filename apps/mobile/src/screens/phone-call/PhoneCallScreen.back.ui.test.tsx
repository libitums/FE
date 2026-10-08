import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, render } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type { PhoneCallConversation } from "./phone-call.contract";
import { PhoneCallScreen } from "./PhoneCallScreen";

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

test("[US11] 뒤로가기 → onExit('incomplete') 1회 · stopRing · stopAudio 호출(통화 종료와 같다)", () => {
  const stopRingCalls: string[] = [];
  vi.stubGlobal("NativeModules", {
    SoundEffectsModule: { play: () => {}, stopRing: () => stopRingCalls.push("stopRing") },
  });
  audio.playAudio.mockReturnValue("started");
  const onExit = vi.fn();
  render(
    <PhoneCallScreen
      unitId={conversation.unitId}
      conversation={conversation}
      completionStatus="available"
      onComplete={vi.fn<() => void>()}
      onExit={onExit}
    />,
  );
  stopRingCalls.length = 0;
  audio.stopAudio.mockClear();

  expect(pressBack()).toBe(true);

  expect(onExit).toHaveBeenCalledTimes(1);
  expect(onExit).toHaveBeenCalledWith("incomplete");
  expect(stopRingCalls.length).toBeGreaterThanOrEqual(1);
  expect(audio.stopAudio).toHaveBeenCalled();
});
