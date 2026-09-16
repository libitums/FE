import type { OverlayProps } from "./overlay.contract";
import { getOverlayContract } from "./overlay.contract";

type OverlayLayerProps = {
  readonly bindanimationend?: () => void;
  readonly bindtap?: () => void;
  readonly className: string;
  readonly scope: "screen" | "area";
};

function OverlayLayer(props: OverlayLayerProps & { readonly blur: "off" | "on" }) {
  const sharedProps = {
    className: props.className,
    "data-scope": props.scope,
    "data-testid": "ui-lynx-overlay",
    "accessibility-element": false,
    "accessibility-elements-hidden": true,
    focusable: false,
    "event-through": false,
    bindtap: props.bindtap,
    bindanimationend: props.bindanimationend,
  } as const;

  if (props.blur === "on") {
    return <blur-view {...sharedProps} blur-radius="4px" />;
  }
  return <view {...sharedProps} />;
}

export function Overlay(props: OverlayProps) {
  const contract = getOverlayContract(props);
  const handleDismiss = () => {
    "background only";
    if (contract.interactive) props.binddismiss?.();
  };
  const handleMotionEnd = () => {
    "background only";
    props.bindmotionend?.();
  };

  return (
    <OverlayLayer
      blur={contract.blur}
      className={contract.className}
      scope={contract.scope}
      bindtap={contract.interactive ? handleDismiss : undefined}
      bindanimationend={contract.phase === "visible" ? undefined : handleMotionEnd}
    />
  );
}
