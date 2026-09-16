import type { FogProps } from "./fog.contract";
import { getFogContract } from "./fog.contract";

export function Fog(props: FogProps) {
  const contract = getFogContract(props);

  return (
    <view
      className={contract.className}
      data-testid="ui-lynx-fog"
      data-direction={contract.direction}
      data-visibility={contract.visibility}
      data-layoutdirection={contract.layoutDirection}
      accessibility-element={false}
      accessibility-elements-hidden={true}
      focusable={false}
      event-through={true}
      flatten={false}
    />
  );
}
