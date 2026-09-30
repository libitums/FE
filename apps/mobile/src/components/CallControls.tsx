import phone from "@libitums/icons/lynx/phone";
import refresh from "@libitums/icons/lynx/refresh";
import { color } from "@libitums/design-tokens";
import { useUiCopy } from "../lib/ui-copy";

type CallControlsProps = {
  readonly incoming: boolean;
  readonly ended?: boolean;
  readonly playTestId?: string;
  readonly hangUpTestId?: string;
  readonly playLabel: string | null;
  readonly onPlay: () => void;
  readonly onHangUp: () => void;
};

export function CallControls({
  incoming,
  ended = false,
  playTestId = "phone-call-audio-button",
  hangUpTestId = "phone-call-hang-up",
  playLabel,
  onPlay,
  onHangUp,
}: CallControlsProps) {
  const copy = useUiCopy();
  if (ended) return null;
  return (
    <view className="phone-call-controls">
      {playLabel ? (
        <view
          className={incoming ? "phone-call-answer-button" : "phone-call-control"}
          data-testid={playTestId}
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={playLabel}
          bindtap={onPlay}
        >
          <view accessibility-elements-hidden={true}>
            {incoming ? (
              <view className="phone-call-answer-content">
                <view className="phone-call-answer-circle">
                  <svg
                    className="phone-call-answer-icon"
                    content={phone}
                    current-color={color.white}
                  />
                </view>
                <text className="phone-call-answer-label">{playLabel}</text>
              </view>
            ) : (
              <view className="phone-call-control-content">
                <view className="phone-call-control-circle">
                  <svg
                    className="phone-call-control-icon"
                    content={refresh}
                    current-color={color.gray[800]}
                  />
                </view>
                <text className="phone-call-control-label">{playLabel}</text>
              </view>
            )}
          </view>
        </view>
      ) : null}
      {!incoming && !playLabel ? (
        <view className="phone-call-control" accessibility-elements-hidden={true} />
      ) : null}
      {!incoming ? (
        <view
          className="phone-call-control"
          data-testid={hangUpTestId}
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={copy.episodeIntro.call.endCall}
          bindtap={onHangUp}
        >
          <view className="phone-call-control-content" accessibility-elements-hidden={true}>
            <view className="phone-call-control-circle phone-call-hang-up-circle">
              <svg
                className="phone-call-control-icon phone-call-hang-up-icon"
                content={phone}
                current-color={color.white}
              />
            </view>
            <text className="phone-call-control-label">{copy.episodeIntro.call.endCall}</text>
          </view>
        </view>
      ) : null}
      {!incoming ? (
        <view className="phone-call-control" accessibility-elements-hidden={true} />
      ) : null}
    </view>
  );
}
