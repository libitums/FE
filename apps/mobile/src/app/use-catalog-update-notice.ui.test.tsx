import { afterEach, expect, test, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@lynx-js/react/testing-library";

import type { CatalogEntry } from "../lib/episode-catalog";
import { catalogUpdateNoticeStorageKey } from "../lib/catalog-update-notice";
import { useCatalogUpdateNotice } from "./use-catalog-update-notice";

// `ui` 계층 — 버그 재현: 받기 중 바뀐 에피소드가 지도 루트에서 한 편씩 바꿔 끼워질 때마다(ADR-0078 D4) 그 편의 버전이
// 기록과 달라져 「Psst」 안내가 다시 떴다. 한 실행에서는 한 번만 띄우고, 그 뒤 바뀌는 버전은 조용히 기록에 맞춘다.
// 「새 유닛이 있는 에피소드」 판정만 대역입니다(지도 구획 계산은 이 훅의 밖). 기록 · 저장소는 실물입니다.

vi.mock("../screens/journey-map/catalog-update", () => ({
  catalogFreshEpisodeIdsOf: () => ["u01-water", "u02-checkin"],
}));

const store = new Map<string, string>();
const stubStorage = () =>
  vi.stubGlobal("NativeModules", {
    StorageModule: {
      get: (key: string) => store.get(key) ?? null,
      set: (key: string, value: string) => void store.set(key, value),
      remove: (key: string) => void store.delete(key),
    },
  });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  store.clear();
});

const entry = (id: string, version: string) =>
  ({ status: "ready", id, version, order: 1, title: id }) as unknown as CatalogEntry;
const catalogOf = (u01: string, u02: string): readonly CatalogEntry[] => [
  entry("u01-water", u01),
  entry("u02-checkin", u02),
];

function Harness({ catalog }: { readonly catalog: readonly CatalogEntry[] }) {
  const notice = useCatalogUpdateNotice({ catalog, sections: [], progress: {}, ready: true });
  return (
    <view>
      {notice.open ? <text data-testid="notice-open">open</text> : null}
      <view data-testid="notice-close" bindtap={() => notice.onClose(false)} />
    </view>
  );
}

const isOpen = () => screen.queryByTestId("notice-open") !== null;
const saved = () =>
  JSON.parse(store.get(catalogUpdateNoticeStorageKey) ?? "{}") as {
    versions: Record<string, string> | null;
  };

test("UNO1. 한 번 띄우고 닫은 뒤 같은 실행에서 다른 편이 바꿔 끼워져 버전이 바뀌어도 다시 뜨지 않고, 기록은 새 버전에 맞춘다", async () => {
  stubStorage();
  const view = render(<Harness catalog={catalogOf("v1", "v1")} />);
  expect(isOpen()).toBe(true);
  await act(async () => {
    fireEvent.tap(screen.getByTestId("notice-close"));
  });
  expect(isOpen()).toBe(false);

  // 받기가 끝난 u01이 지도 루트에서 바꿔 끼워집니다 — 그다음 u02.
  await act(async () => {
    view.rerender(<Harness catalog={catalogOf("v2", "v1")} />);
  });
  expect(isOpen()).toBe(false);
  await act(async () => {
    view.rerender(<Harness catalog={catalogOf("v2", "v2")} />);
  });
  expect(isOpen()).toBe(false);
  expect(saved().versions).toEqual({ "u01-water": "v2", "u02-checkin": "v2" });
});

test("UNO2. 다음 실행에서 같은 버전이면 뜨지 않고, 그 뒤 실제 새 업데이트(버전 올라감)에는 다시 한 번 뜬다", async () => {
  stubStorage();
  store.set(
    catalogUpdateNoticeStorageKey,
    JSON.stringify({ versions: { "u01-water": "v2", "u02-checkin": "v2" }, muted: false }),
  );
  render(<Harness catalog={catalogOf("v2", "v2")} />);
  expect(isOpen()).toBe(false);
  cleanup();

  render(<Harness catalog={catalogOf("v3", "v2")} />);
  expect(isOpen()).toBe(true);
});
