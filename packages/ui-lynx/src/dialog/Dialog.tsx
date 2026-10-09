import type {} from "@lynx-js/react";

import { Button } from "../button/Button";
import { Overlay } from "../overlay/Overlay";
import type { DialogActionContract, DialogProps } from "./dialog.contract";
import { useMotion } from "../motion/MotionProvider";
import { getDialogContract } from "./dialog.contract";

type DialogActionButtonProps = {
  readonly action: DialogActionContract;
  readonly bindaction: (id: string) => void;
};

function DialogActionButton({ action, bindaction }: DialogActionButtonProps) {
  function handleTap() {
    "background only";
    bindaction(action.id);
  }

  return (
    <view
      className="ui-lynx-dialog-action"
      data-testid={`ui-lynx-dialog-action-${action.id}`}
      data-variant={action.variant}
    >
      <Button
        label={action.label}
        variant={action.variant}
        // ⟨2026-09-28⟩ `m` → `xl`입니다. 확인 모달의 액션은 그 순간 화면에서 가장 중요한
        // 조작인데 `m`은 앱의 다른 주 버튼(전부 `xl`)보다 눈에 띄게 작았고, 되돌릴 수
        // 없는 선택을 작은 과녁으로 묻게 됩니다.
        size="xl"
        width="fill"
        disabled={action.disabled}
        loading={action.loading}
        icon={action.icon}
        iconPosition={action.iconPosition}
        bindtap={handleTap}
      />
    </view>
  );
}

export function Dialog(props: DialogProps) {
  const contract = getDialogContract(props, useMotion());

  function handleMotionEnd() {
    "background only";
    props.bindmotionend?.();
  }

  return (
    <view
      className={contract.className}
      data-testid="ui-lynx-dialog"
      data-motion={contract.motion}
      data-phase={contract.phase}
      data-cancelactionid={contract.cancelActionId ?? undefined}
    >
      <Overlay
        scope="screen"
        surface="dialog"
        dismiss="none"
        motion={contract.motion}
        phase={contract.phase}
      />
      <view
        className="ui-lynx-dialog-container"
        data-testid="ui-lynx-dialog-container"
        accessibility-role-description="dialog"
        bindanimationend={contract.phase === "visible" ? undefined : handleMotionEnd}
      >
        <text
          className="ui-lynx-dialog-title"
          data-testid="ui-lynx-dialog-title"
          accessibility-traits="header"
        >
          {contract.title}
        </text>
        {contract.description === undefined ? null : (
          <text className="ui-lynx-dialog-description" data-testid="ui-lynx-dialog-description">
            {contract.description}
          </text>
        )}
        <view className="ui-lynx-dialog-actions" data-testid="ui-lynx-dialog-actions">
          {contract.actions.map((action) => (
            <DialogActionButton key={action.id} action={action} bindaction={props.bindaction} />
          ))}
        </view>
      </view>
    </view>
  );
}
