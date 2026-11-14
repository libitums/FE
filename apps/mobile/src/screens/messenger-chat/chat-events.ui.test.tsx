import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { EpisodeIntroEvent } from "../episode-intro/episode-intro.contract";
import { ChatEventsContext } from "./chat-events";
import { createFixtureChatSource } from "./chat-fixture-source";
import { fakeTimers } from "./chat-fixture-timers.test-support";
import type { ChatRemote } from "./chat-remote.contract";
import { clearBackHandlers, mountChat } from "./chat-ui.test-support";
import { createCoinWallet } from "./coin-wallet";
import { companionSeed } from "./companion-roster";
import { messengerChatTestIds as ids } from "./messenger-chat.contract";
import type { GuidePart, GuideStore } from "./messenger-guide";
import { MessengerListScreen } from "./MessengerListScreen";

// `ui` 계층(EV-UI1 · UI2): 첫 입장 안내를 끝내면 messenger_guide_finished가 결선이 내린 이벤트 자리로 납니다(ADR-0029 「D3 목적 구분」).

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function memoryStore(): GuideStore {
  const parts = new Set<GuidePart>();
  return { unseen: (part) => !parts.has(part), markSeen: (part) => void parts.add(part) };
}

function serverSource() {
  const remote: ChatRemote = {
    loadHistory: async () => ({
      messages: [
        { id: "g#0", at: 1, kind: "text", from: "them", text: { ko: "안녕하세요!", en: "Hi!" } },
      ],
      corrections: {},
      ideas: null,
    }),
    greet: () => new Promise(() => undefined),
    openTurn: () => ({ cancel: () => undefined }),
  };
  return createFixtureChatSource({
    imageUrlOf: () => null,
    seed: { ...companionSeed(), birthYear: { kind: "set", year: 2000 } },
    timers: fakeTimers(),
    remote,
  });
}

let events: EpisodeIntroEvent[];
const finished = () => events.filter((event) => event.name === "messenger_guide_finished");

beforeEach(() => {
  vi.useRealTimers();
  events = [];
});
afterEach(() => {
  cleanup();
  clearBackHandlers();
});

describe("목록 안내", () => {
  function mountList() {
    render(
      <ChatEventsContext.Provider value={{ sink: (event) => events.push(event), roomId: null }}>
        <MessengerListScreen
          source={serverSource()}
          wallet={createCoinWallet({ earned: 0 })}
          guideStore={memoryStore()}
          onOpenRoom={() => undefined}
          onGoToJourney={() => undefined}
          onLayerChange={() => undefined}
          notice={null}
          onNoticeShown={() => undefined}
          access="open"
          onSignIn={() => undefined}
        />
      </ChatEventsContext.Provider>,
    );
  }

  test("EV-UI1 「Chat with 덕수쌤」은 done, Skip은 skipped — 영역은 채팅", () => {
    mountList();
    fireEvent.tap(screen.getByTestId(ids.guideListOpen), { eventType: "catchEvent" });
    cleanup();
    mountList();
    fireEvent.tap(screen.getByTestId(ids.guideListSkip), { eventType: "catchEvent" });
    expect(finished()).toEqual([
      {
        name: "messenger_guide_finished",
        surface: "chat",
        daysSinceFirstOpen: "0",
        part: "list",
        outcome: "done",
      },
      {
        name: "messenger_guide_finished",
        surface: "chat",
        daysSinceFirstOpen: "0",
        part: "list",
        outcome: "skipped",
      },
    ]);
  });
});

describe("방 코치마크", () => {
  test("EV-UI2 끝까지 넘기면 done 한 번, Skip이면 skipped 한 번", async () => {
    const sink = (event: EpisodeIntroEvent) => events.push(event);
    mountChat({
      source: serverSource(),
      roomId: "duksu",
      guideStore: memoryStore(),
      eventSink: sink,
    });
    await flush();
    fireEvent.tap(screen.getByTestId(ids.guideCoachNext), { eventType: "catchEvent" });
    fireEvent.tap(screen.getByTestId(ids.guideCoachNext), { eventType: "catchEvent" });
    cleanup();
    mountChat({
      source: serverSource(),
      roomId: "duksu",
      guideStore: memoryStore(),
      eventSink: sink,
    });
    await flush();
    fireEvent.tap(screen.getByTestId(ids.guideCoachSkip), { eventType: "catchEvent" });
    expect(
      finished().map((event) => [
        event.name,
        (event as { part: string }).part,
        (event as { outcome: string }).outcome,
      ]),
    ).toEqual([
      ["messenger_guide_finished", "room", "done"],
      ["messenger_guide_finished", "room", "skipped"],
    ]);
  });
});
