import type {} from "@lynx-js/react";

import { getSpecialUnitContract, type SpecialUnitProps } from "./special-unit.contract";

export function SpecialUnit(props: SpecialUnitProps) {
  const contract = getSpecialUnitContract(props);

  return <view data-testid={contract.testId} data-status={contract.status} />;
}
