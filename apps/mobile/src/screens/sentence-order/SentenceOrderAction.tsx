import type { ReactNode } from "@lynx-js/react";

import { Button } from "@libitums/ui-lynx/button";

export type SentenceOrderActionProps = {
  readonly label: string;
  /** Check 자리면 `sentence-order-check`, 그 밖(Next · See results)은 `sentence-order-action`입니다. */
  readonly check: boolean;
  readonly disabled: boolean;
  readonly onTap: () => void;
};

// 아래 버튼 하나입니다 — Check · Next · See results 모두 같은 자리의 같은 ui-lynx `Button`이라 Check를 누른 뒤에도 요소가
// 유지됩니다(스크린리더 초점이 남고 새 이름이 읽힙니다).
export function SentenceOrderAction({
  label,
  check,
  disabled,
  onTap,
}: SentenceOrderActionProps): ReactNode {
  return (
    <view
      className="sentence-order-check"
      data-testid={check ? "sentence-order-check" : "sentence-order-action"}
    >
      <Button
        label={label}
        variant="brand"
        size="xl"
        width="fill"
        disabled={disabled}
        bindtap={onTap}
      />
    </view>
  );
}
