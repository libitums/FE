import { afterEach, expect, test, vi } from "vitest";
import { cleanup, fireEvent, screen, within } from "@lynx-js/react/testing-library";

import { App } from "./App";
import { legacyPassedSeed } from "./test-helpers/progress-seed";
import { renderSignedInApp, signedInBootSession } from "./test-helpers/signed-in-app";
import { authSessionStorageKey, serializeAuthSession } from "../lib/auth-session";
import { MANIFEST_CHECKED_AT_KEY } from "../lib/manifest-check";

// `integration` 계층: 맵 맨 끝 카드의 목록 확인 상태와 「새 이야기 확인」 시트(ADR-0095 D9). 이 하네스는 목록 요청을
// 거부해(오프라인과 같음) 확인 시각은 넣어 둔 값 그대로입니다.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function boot(checkedAt: number | null) {
  const store = new Map<string, string>([
    [authSessionStorageKey, serializeAuthSession(signedInBootSession)],
    ...(checkedAt === null
      ? []
      : [[MANIFEST_CHECKED_AT_KEY, String(checkedAt)] as [string, string]]),
  ]);
  const module = {
    get: (key: string) => store.get(key) ?? null,
    set: (key: string, value: string) => void store.set(key, value),
    remove: (key: string) => void store.delete(key),
  };
  await renderSignedInApp(<App progressSeed={legacyPassedSeed} />, { storageModule: module });
}

test("[ACI1] 한 번도 목록을 확인 못 했으면 끝 카드가 새 이야기 안내 · 확인 버튼이고, 누르면 시트가 선다 · 나중에는 닫는다", async () => {
  await boot(null);
  expect(screen.getByTestId("catalog-coming-soon-title")).toHaveTextContent(
    "New stories may be waiting",
  );
  fireEvent.tap(
    within(screen.getByTestId("catalog-coming-soon-check")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(screen.getByTestId("all-cleared-sheet")).toBeInTheDocument();
  expect(screen.getByTestId("all-cleared-sheet-status")).toHaveTextContent("Not checked yet");
  fireEvent.tap(
    within(screen.getByTestId("ui-lynx-bottom-sheet-action-later")).getByTestId("ui-lynx-button"),
    {},
  );
  expect(screen.queryByTestId("all-cleared-sheet")).not.toBeInTheDocument();
});

test("[ACI2] 최근에 확인했으면 끝 카드는 지금 문구에 오늘 확인함이 붙고 버튼이 없다", async () => {
  await boot(Date.now() - 60 * 60 * 1000);
  expect(screen.getByTestId("catalog-coming-soon-title")).toHaveTextContent("Coming soon");
  expect(screen.getByTestId("catalog-coming-soon-checked")).toHaveTextContent("Checked today");
  expect(screen.queryByTestId("catalog-coming-soon-check")).not.toBeInTheDocument();
});

test("[ACI3] 오래전에 확인했으면 끝 카드가 새 이야기 안내다", async () => {
  await boot(Date.now() - 5 * 24 * 60 * 60 * 1000);
  expect(screen.getByTestId("catalog-coming-soon-title")).toHaveTextContent(
    "New stories may be waiting",
  );
});
