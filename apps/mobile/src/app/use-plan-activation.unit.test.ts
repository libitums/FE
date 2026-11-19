import { describe, expect, it, vi } from "vitest";

import { REFRESH_DEADLINE_MS } from "../lib/purchase-refresh";
import { ACTIVATION_WINDOW_MS, armOnPurchased } from "./use-plan-activation";

function activationSpy() {
  const calls: string[] = [];
  return {
    calls,
    arm: vi.fn(() => calls.push("arm")),
    disarm: vi.fn(() => calls.push("disarm")),
  };
}

describe("armOnPurchased", () => {
  it("opens the window only after the store sheet finishes with purchased", async () => {
    const activation = activationSpy();
    let finish: (value: { kind: string }) => void = () => {};
    const purchase = () =>
      new Promise<{ kind: string }>((resolve) => {
        finish = resolve;
      });

    const pending = armOnPurchased(activation, purchase)();
    // 시트가 떠 있는 동안에는 창이 닫혀 있습니다.
    expect(activation.calls).toEqual(["disarm"]);

    finish({ kind: "purchased" });
    await expect(pending).resolves.toEqual({ kind: "purchased" });
    expect(activation.calls).toEqual(["disarm", "arm"]);
  });

  it.each(["cancelled", "failed", "pending", "unavailable"])(
    "keeps the window closed when the purchase ends %s",
    async (kind) => {
      const activation = activationSpy();
      await armOnPurchased(activation, async () => ({ kind }))();
      expect(activation.arm).not.toHaveBeenCalled();
      expect(activation.calls).toEqual(["disarm"]);
    },
  );
});

describe("ACTIVATION_WINDOW_MS (ADR-0163 D1)", () => {
  it("follows the server catch-up deadline — one schedule, not the old 2 s × 5", () => {
    expect(ACTIVATION_WINDOW_MS).toBe(REFRESH_DEADLINE_MS + 2000);
    expect(ACTIVATION_WINDOW_MS).toBeGreaterThanOrEqual(60_000);
  });
});
