import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, screen } from "@lynx-js/react/testing-library";

import * as audio from "../../lib/audio";
import { chatProfileTestIds, type ChatProfilePort } from "./chat-profile";
import { clearBackHandlers, mountChat, tapEl, tapId } from "./chat-ui.test-support";
import { suggestedFriendsTestIds as sheet } from "./suggested-friends.contract";
import { friend } from "./suggested-friends.test-support";

// `integration` 계층(CP-I7): 대화방 시트도 다른 자리와 같은 `sheetViewOf`로 견본 주소 · 로마자를 받는다(ADR-0198, #627) — Hear voice가
// 「Voice sample unavailable」이 아니라 그 주소를 재생한다(로마자 값은 unit CP-U6). 재생 모듈은 대역.

vi.mock("../../lib/audio", async (importOriginal) => ({
  ...(await importOriginal<typeof audio>()),
  playAudio: vi.fn(() => "started" as const),
  stopAudio: vi.fn(),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(audio.playAudio).mockClear();
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
  vi.useRealTimers();
});

const profile: ChatProfilePort = {
  profileOf: (id) =>
    id === "mina"
      ? friend("mina", {
          voiceSamplePath: "content/audio/mina.mp3",
        })
      : null,
  voiceSampleUrl: (path) => `https://cdn/${path}`,
  romanization: () => true,
};

test("CP-I7. 대화방 시트의 Hear voice는 포트가 푼 주소를 재생한다", () => {
  mountChat({ profile });
  tapEl(screen.getAllByTestId(chatProfileTestIds.avatar)[0] as Element);

  tapId(sheet.sheetVoice);

  expect(vi.mocked(audio.playAudio).mock.calls[0]?.[0]).toBe("https://cdn/content/audio/mina.mp3");
  expect(screen.queryByTestId(sheet.sheetVoiceUnavailable) === null).toBe(true);
});
