import type {} from "@lynx-js/react";

import { Button } from "../button/Button";
import { Overlay } from "../overlay/Overlay";
import type { DialogActionContract, DialogProps } from "./dialog.contract";
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
        size="m"
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
  const contract = getDialogContract(props);

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
      data-cancelactionid={contract.cancelActionId}
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
