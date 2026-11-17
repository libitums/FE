import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { AlbumPhotoViewer } from "./AlbumPhotoViewer";
import { chatAlbumTestIds as ids, type ChatAlbumItem } from "./chat-album.contract";

// `ui` 계층(AV-SA1 · AV-SA2): 사진 보기는 화면 전체(`position: fixed`)를 덮으므로 셸의 안전 영역 여백을 받지 못합니다. 위 닫기 단추가
// 상태 표시줄 · 노치 아래(iOS가 터치를 가져가는 자리)에 서지 않게 화면이 안전 영역만큼 스스로 비웁니다(2026-11-17 기기 iPhone 13 mini).

afterEach(() => {
  cleanup();
  (lynx as unknown as { __globalProps: unknown }).__globalProps = undefined;
});

const item: ChatAlbumItem = {
  id: "m1",
  messageId: "msg1",
  kind: "photo",
  url: "https://example.com/a.png",
  aspect: "3:2",
  line: { ko: "안녕", en: "Hi" },
  createdAt: 1,
  fromPastChat: false,
};

function mount(): void {
  render(
    <AlbumPhotoViewer
      tile={{ item, versions: [item], remaking: false }}
      name="미나"
      dayLabel="Today"
      onClose={vi.fn<() => void>()}
      onRedraw={vi.fn<() => void>()}
    />,
  );
}

function setInsets(insets: { top: number; bottom: number; left: number; right: number }): void {
  (lynx as unknown as { __globalProps: unknown }).__globalProps = { safeAreaInsets: insets };
}

test("AV-SA1 위 · 아래 · 옆 안전 영역만큼 사진 보기가 안쪽을 비운다(닫기 단추가 상태 표시줄 아래로 가지 않음)", () => {
  setInsets({ top: 50, bottom: 34, left: 0, right: 0 });
  mount();
  const { style } = screen.getByTestId(ids.viewer) as HTMLElement;
  expect(style.paddingTop).toBe("50px");
  expect(style.paddingBottom).toBe("34px");
});

test("AV-SA2 안전 영역 값이 없으면(테스트 · Explorer) 0으로 둔다", () => {
  mount();
  const { style } = screen.getByTestId(ids.viewer) as HTMLElement;
  expect(style.paddingTop).toBe("0px");
});
