import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { AskMediaDialog } from "./AskMediaDialog";
import { ChatSettingsScreen } from "./ChatSettingsScreen";
import { ChatSettingsSidebar } from "./ChatSettingsSidebar";
import { chatAlbumTestIds as ids, type ChatSnapshotSelf } from "./chat-album.contract";
import { clearBackHandlers, makeSource, systemBack, tapId, textOf } from "./chat-ui.test-support";
import { messengerChatTestIds as room } from "./messenger-chat.contract";

// `ui` 계층(AL-UI10 ~ UI12): 사진 속 내 모습 설정(M4) · 첫 Snapshot에서 묻기(M5) · 사이드바 Album 줄(M1), ADR-0150.

beforeEach(clearBackHandlers);
afterEach(() => {
  cleanup();
  clearBackHandlers();
});

const labelOf = (testId: string) => screen.getByTestId(testId).getAttribute("accessibility-label");

test("AL-UI10 Chats 설정 About you의 「You in snapshots」 → 시트에서 고르고 Save하면 바뀐다(고른 적 없으면 Woman)", () => {
  const source = makeSource();
  render(<ChatSettingsScreen source={source} onOpenSharedMemories={vi.fn()} onBack={vi.fn()} />);
  expect(labelOf(ids.selfRow)).toBe("You in snapshots, Woman");
  tapId(ids.selfRow);
  expect(textOf(ids.selfSheet)).toContain("We never draw your face.");
  expect(screen.getByTestId(ids.selfOption("female")).getAttribute("data-selected")).toBe("true");
  tapId(ids.selfOption("hidden"));
  expect(screen.getByTestId(ids.selfOption("hidden")).getAttribute("data-selected")).toBe("true");
  tapId(ids.selfSave);
  expect(source.snapshot().preferences.snapshotSelf).toBe("hidden");
  expect(screen.queryByTestId(ids.selfSheet)).toBeNull();
  expect(labelOf(ids.selfRow)).toBe("You in snapshots, Just hands");

  tapId(ids.selfRow);
  systemBack();
  expect(screen.queryByTestId(ids.selfSheet)).toBeNull();
});

test("AL-UI11 사이드바의 Album 줄은 이야기 시점 다음(5번째)이고 누르면 onAlbum", () => {
  const thread = makeSource().thread("mina");
  if (thread === null) throw new Error("fixture thread missing");
  const onAlbum = vi.fn<() => void>();
  render(
    <ChatSettingsSidebar
      thread={thread}
      learnerName="Hana"
      coinBalance={120}
      birthYear={{ kind: "set", year: 2001 }}
      memories={{ memories: [], count: 0, cap: 50, full: false }}
      feedbackMode="separate"
      onGetCoins={vi.fn()}
      onStoryPoint={vi.fn()}
      onBirthYear={vi.fn()}
      onMemories={vi.fn()}
      onFeedbackMode={vi.fn()}
      onAlbum={onAlbum}
      onDelete={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  const row = screen.getByTestId(ids.sidebarRow);
  expect(row.getAttribute("data-order")).toBe("5");
  expect(labelOf(ids.sidebarRow)).toBe("Album, Pictures and voice messages");
  tapId(ids.sidebarRow);
  expect(onAlbum).toHaveBeenCalledTimes(1);
});

function mountAsk(selfAsk: boolean) {
  const onConfirm = vi.fn<(self: ChatSnapshotSelf | null) => void>();
  render(
    <AskMediaDialog
      media="photo"
      name="미나"
      balance={120}
      price={35}
      selfAsk={selfAsk}
      onConfirm={onConfirm}
      onGetCoins={vi.fn()}
      onCancel={vi.fn()}
    />,
  );
  return onConfirm;
}

test("AL-UI12 첫 Snapshot 요청은 「How should you appear?」 셋 중 고르게 하고(기본 Woman) 고른 값과 함께 확정한다", () => {
  const onConfirm = mountAsk(true);
  expect(textOf(ids.selfAsk)).toContain("How should you appear?");
  expect(textOf(ids.selfAsk)).toContain("never your face");
  expect(screen.getByTestId(ids.selfOption("female")).getAttribute("data-selected")).toBe("true");
  tapId(ids.selfOption("male"));
  tapId(room.askConfirm);
  expect(onConfirm).toHaveBeenCalledWith("male");
});

test("AL-UI12b 이미 골랐으면 묻지 않고 null로 확정한다", () => {
  const onConfirm = mountAsk(false);
  expect(screen.queryByTestId(ids.selfAsk)).toBeNull();
  tapId(room.askConfirm);
  expect(onConfirm).toHaveBeenCalledWith(null);
});
