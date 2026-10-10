import type { ReactNode } from "@lynx-js/react";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import { RoundButton } from "@libitums/ui-lynx/round-button";
import { CallCaller } from "./CallCaller";
import "./call-screen.css";

type CallScreenProps = {
  readonly title: string;
  readonly status: string;
  readonly phase: "incoming" | "active" | "completed";
  readonly callerName: string;
  readonly callerPortrait: string | null;
  readonly clockRunning: boolean;
  readonly callerKey?: number;
  readonly exitLabel: string;
  readonly onBack: () => void;
  readonly testId: string;
  readonly testIdPrefix: string;
  readonly backTestId: string;
  readonly children?: ReactNode;
  readonly actions: ReactNode;
  /** 학습 문항 안내가 위를 덮는 동안 true입니다. 루트를 낭독에서 가립니다(닫히면 false). */
  readonly obscured?: boolean;
};

/** 서사와 학습 통화가 공유하는 수신 · 통화 중 · 종료 화면 배치입니다. */
export function CallScreen({
  title,
  status,
  phase,
  callerName,
  callerPortrait,
  clockRunning,
  callerKey,
  exitLabel,
  onBack,
  testId,
  testIdPrefix,
  backTestId,
  children,
  actions,
  obscured,
}: CallScreenProps) {
  return (
    <view
      className={`phone-call-screen phone-call-screen-${phase}`}
      data-testid={testId}
      accessibility-elements-hidden={obscured}
    >
      <view className="phone-call-screen-header">
        <view
          className="phone-call-screen-exit"
          data-testid={backTestId}
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={exitLabel}
          bindtap={onBack}
        >
          <view accessibility-elements-hidden={true}>
            <RoundButton
              accessibilityLabel={exitLabel}
              icon={arrowLeft03}
              variant="neutral"
              size="xl"
            />
          </view>
        </view>
        <text
          className="phone-call-screen-title"
          data-testid={`${testIdPrefix}-title`}
          accessibility-traits="header"
        >
          {title}
        </text>
      </view>
      <scroll-view
        className="phone-call-screen-scroll"
        scroll-orientation="vertical"
        scroll-bar-enable={false}
      >
        <view className="phone-call-screen-content">
          <view data-testid={`${testIdPrefix}-contact-name`}>
            <CallCaller
              key={callerKey}
              callerName={callerName}
              callerPortrait={callerPortrait}
              showClock={phase !== "incoming"}
              clockRunning={clockRunning}
              testIdPrefix={testIdPrefix}
            />
          </view>
          <text className="phone-call-screen-status" data-testid={`${testIdPrefix}-status`}>
            {status}
          </text>
          {children}
        </view>
      </scroll-view>
      <view className="phone-call-screen-actions">{actions}</view>
    </view>
  );
}
