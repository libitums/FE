import type { PhoneCallMapItemProps } from "../phone-call/phone-call.contract";

import { SpecialUnitMapItem } from "./SpecialUnitMapItem";

// `MessengerMapItem`과 같은 어댑터입니다. 잠김도 같습니다: 그 구획의 표지를 끝내기 전에는
// `locked`가 와서 잠긴 표식으로 서고 눌러도 무동작입니다.
export function PhoneCallMapItem({ id, title, status, onSelect }: PhoneCallMapItemProps) {
  return (
    <SpecialUnitMapItem
      unitId={id}
      title={title}
      accessibilityName={title}
      status={status}
      onSelect={() => {
        "background only";
        onSelect(id);
      }}
    />
  );
}
