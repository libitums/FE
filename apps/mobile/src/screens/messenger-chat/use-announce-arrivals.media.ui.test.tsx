import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render } from "@lynx-js/react/testing-library";

import * as accessibility from "../../lib/accessibility";
import { uiCopyEn } from "../../lib/ui-copy-en";
import { mediaLineId } from "./chat-media-rules";
import type { ChatMessage } from "./chat-source.contract";
import { useAnnounceArrivals } from "./use-announce-arrivals";

// `ui` 계층(CM-UI9): 답을 기다리는 동안 선 사진 · 음성 결과는 선 순간 한 번만 낭독한다 — 턴이 끝날 때 다시 읽지 않는다(리뷰 #442).

vi.mock("../../lib/accessibility", async (importOriginal) => ({
  ...(await importOriginal<typeof accessibility>()),
  announce: vi.fn<(content: string) => "announced">(() => "announced"),
}));
const announced = () => vi.mocked(accessibility.announce).mock.calls.map((call) => call[0]);

const A1 = "22222222-2222-4222-8222-222222222222";
const reply: ChatMessage = {
  id: `${A1}#0`,
  at: 1,
  kind: "text",
  from: "them",
  text: { ko: "반가워요", en: "Nice to meet you" },
};
const photo = {
  id: mediaLineId(A1, "photo", "m1"),
  at: 2,
  kind: "photo",
  imageUrl: "https://signed/a.png",
} as unknown as ChatMessage;

function Probe({
  messages,
  busy,
}: {
  readonly messages: readonly ChatMessage[];
  readonly busy: boolean;
}) {
  useAnnounceArrivals(messages, "덕수쌤", uiCopyEn.messengerChat.room, false, { busy });
  return <view />;
}

afterEach(() => {
  cleanup();
  vi.mocked(accessibility.announce).mockClear();
});

test("CM-UI9 답을 기다리는 동안 선 사진 결과는 한 번만 낭독한다", () => {
  const view = render(<Probe messages={[reply]} busy={false} />);
  view.rerender(<Probe messages={[reply]} busy={true} />); // 다음 턴이 돌기 시작
  view.rerender(<Probe messages={[reply, photo]} busy={true} />); // 그 사이 사진이 섬 → 바로 낭독
  view.rerender(<Probe messages={[reply, photo]} busy={false} />); // 턴이 끝남 → 사진을 다시 읽지 않음
  const photoLines = announced().filter((line) => /photo/i.test(line));
  expect(photoLines).toHaveLength(1);
});
