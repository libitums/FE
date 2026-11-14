// 요금제 화면(ADR-0144) — 결선이 없으면(플래그 꺼짐 · 로그아웃 뒤 남은 스택) 실패 안내만 보이고 뒤로 나갑니다.

import { PlansScreen } from "../screens/plans/PlansScreen";
import type { PlanId } from "../lib/plans-api";
import type { PlanPlacement } from "../screens/plans/plans-model";
import type { ScreenWiring } from "./screen-wiring";

export function renderPlans(
  screen: { readonly placement: PlanPlacement; readonly focus: PlanId | null },
  wiring: ScreenWiring,
) {
  const plans = wiring.plans;
  return (
    <PlansScreen
      catalog={plans?.catalog ?? null}
      offers={plans?.offers ?? null}
      focus={screen.focus}
      onSelect={(plan, period, productId) =>
        plans === undefined
          ? Promise.resolve({ kind: "unavailable" })
          : plans.onSelect(screen.placement, plan, period, productId)
      }
      onRestore={() =>
        plans === undefined ? Promise.resolve({ kind: "unavailable" }) : plans.onRestore()
      }
      onBack={plans?.onBack ?? wiring.onExitSettingsStack}
    />
  );
}
