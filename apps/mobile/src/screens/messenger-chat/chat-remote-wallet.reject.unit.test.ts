import { expect, test, vi } from "vitest";

import { remoteWalletSync } from "./chat-remote-wallet";
import type { ChatRemote } from "./chat-remote.contract";

// `unit` 계층(CP-U12): 지갑 읽기가 거절돼도 처리되지 않은 거절을 남기지 않고, 칩 · 체험 수를 건드리지 않는다.

test("CP-U12 지갑 읽기가 던지면 조용히 넘어가고 알림을 보내지 않는다", async () => {
  const unhandled = vi.fn();
  process.on("unhandledRejection", unhandled);
  const onBalance = vi.fn();
  const onTrialRemaining = vi.fn();
  const remote = {
    wallet: () => Promise.reject(new Error("network")),
  } as unknown as ChatRemote;
  remoteWalletSync(remote, { onBalance, onTrialRemaining });
  for (let i = 0; i < 5; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
  process.off("unhandledRejection", unhandled);
  expect(unhandled).not.toHaveBeenCalled();
  expect(onBalance).not.toHaveBeenCalled();
  expect(onTrialRemaining).not.toHaveBeenCalled();
});
