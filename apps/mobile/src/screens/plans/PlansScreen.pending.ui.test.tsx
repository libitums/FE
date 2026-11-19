import { afterEach, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@lynx-js/react/testing-library";

import { backHandlers } from "../../lib/back-handler";
import type { PurchaseWait } from "../../lib/purchase-wait";
import { PlansScreen } from "./PlansScreen";
import { catalogV1 } from "./plans.test-support";

// `ui` 계층(PS-P1, ADR-0163 D3): 설정 → Plans(밝은 판)의 구매 뒤 확인 대기 — 위 줄 가운데 알약 · 「Your plan」 스켈레톤.

afterEach(() => {
  cleanup();
  while (backHandlers.runTop()) {
    /* 남은 핸들러를 비웁니다 */
  }
});

const mount = (wait: PurchaseWait | undefined) =>
  render(
    <PlansScreen
      catalog={catalogV1}
      offers={null}
      focus={null}
      onSelect={vi.fn(async () => ({ kind: "unavailable" as const }))}
      onRestore={vi.fn(async () => ({ kind: "unavailable" as const }))}
      onBack={vi.fn()}
      {...(wait === undefined ? {} : { wait })}
    />,
  );

test("PS-P1 구독 대기면 밝은 알약 · Your plan 스켈레톤, 없으면 지금 그대로", () => {
  mount({ phase: "waiting", target: "plan", productId: "duru.premium.monthly.v1" });
  const pill = screen.getByTestId("purchase-pill");
  expect(pill).toHaveTextContent("Confirming your purchase…");
  expect(pill.getAttribute("data-theme")).toBe("light");
  expect(screen.queryByTestId("plans-your-plan-updating")).not.toBeNull();
  cleanup();
  mount(undefined);
  expect(screen.queryByTestId("purchase-pill")).toBeNull();
  expect(screen.getByTestId("plans-your-plan")).toHaveTextContent("Free");
});
