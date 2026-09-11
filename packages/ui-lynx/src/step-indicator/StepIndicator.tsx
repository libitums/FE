import type {} from "@lynx-js/react";

import type { StepIndicatorProps } from "./contract";
import { getStepIndicatorContract } from "./logic";

export function StepIndicator(props: StepIndicatorProps) {
  const contract = getStepIndicatorContract(props);

  return (
    <view
      className="ui-lynx-step-indicator"
      data-testid="ui-lynx-step-indicator"
      data-current={props.currentStep}
      data-total={props.totalSteps}
      accessibility-element={true}
      accessibility-label={contract.accessibilityLabel}
    >
      <view
        className="ui-lynx-step-indicator-visual"
        data-testid="ui-lynx-step-indicator-visual"
        accessibility-elements-hidden={true}
      >
        {contract.steps.map((step, index) => (
          <view
            key={step.number}
            className={`ui-lynx-step-indicator-step${index === contract.steps.length - 1 ? " ui-lynx-step-indicator-step-last" : ""}`}
          >
            <view
              className={`ui-lynx-step-indicator-circle ui-lynx-step-indicator-circle-${step.status}`}
              data-testid="ui-lynx-step-indicator-circle"
              data-status={step.status}
            >
              <text className="ui-lynx-step-indicator-number">{step.number}</text>
            </view>
            {index < contract.steps.length - 1 ? (
              <view
                className={`ui-lynx-step-indicator-connector ui-lynx-step-indicator-connector-${step.status}`}
                data-testid="ui-lynx-step-indicator-connector"
                data-status={step.status}
              />
            ) : null}
          </view>
        ))}
      </view>
    </view>
  );
}
