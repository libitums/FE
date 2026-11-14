// 티켓 다 씀 대화상자의 자리(시안 E6m) — 요금제 결선(ADR-0144)이 있으면 무제한 티켓 카드를 붙입니다. 카드를 누르면
// 대화상자를 닫고(`onClose`) 요금제 화면으로 갑니다.

import type { PlanOfferWiring } from "../screens/plans/plans.contract";
import { OutOfTicketsDialog } from "../screens/tickets/OutOfTicketsDialog";
import type { OutOfTicketsDialogProps } from "../screens/tickets/OutOfTicketsDialog";

type DialogProps = Omit<OutOfTicketsDialogProps, "offer">;

export function OutOfTicketsLayer({
  dialog,
  offerFor,
}: {
  readonly dialog: DialogProps | null;
  readonly offerFor: ((close: () => void) => PlanOfferWiring | undefined) | undefined;
}) {
  if (dialog === null) return null;
  return <OutOfTicketsDialog {...dialog} offer={offerFor?.(dialog.onClose)} />;
}
