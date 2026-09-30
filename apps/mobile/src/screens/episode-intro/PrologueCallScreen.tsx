import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import minus from "@libitums/icons/lynx/minus";
import mute from "@libitums/icons/lynx/mute";
import pause from "@libitums/icons/lynx/pause";
import play from "@libitums/icons/lynx/play";
import refresh from "@libitums/icons/lynx/refresh";
import phone from "@libitums/icons/lynx/phone";
import plus from "@libitums/icons/lynx/plus";
import slider from "@libitums/icons/lynx/slider";
import { color } from "@libitums/design-tokens";
import { Fog } from "@libitums/ui-lynx/fog";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import type { PrologueCallScreenProps, PrologueCallVolume } from "./episode-intro.contract";
import { initialPrologueCallVolume, stepPrologueCallVolume } from "./prologue-call";

import { CallCaller, CallLineBubble } from "../../components/CallCaller";
import { useUiCopy } from "../../lib/ui-copy";

import { usePrologueCallPlayback } from "./usePrologueCallPlayback";

import "./prologue-call-screen.css";

const volumeLevels: readonly PrologueCallVolume[] = [1, 2, 3, 4, 5];

/**
 * 서사 통화 화면입니다(Figma 80-7797). 표지의 `Next` 뒤에 섭니다. **학습이 아닙니다** —
 * 고를 답이 없고, 대사가 저절로 흐른 뒤 통화가 끝납니다.
 *
 * 통화가 끝나면(마지막 대사가 흐르거나 종료 버튼) 통화 버튼 줄이 걷히고 하단 fog 위에
 * `Continue`가 섭니다. 다음 화면으로 가는 것은 그 버튼뿐입니다 — 저절로 넘어가지
 * 않습니다.
 *
 * 음원이 있는 대사는 재생 완료로 이어지고, 없는 대사는 기존 읽기 시간으로 이어집니다.
 * 음원 대사의 양옆 버튼은 일시정지·재개와 다시 듣기입니다.
 *
 * 디자인의 배경 그림과 오른쪽 위 설정 버튼은 그리지 않습니다 — 그림이 없고, 설정이 갈
 * 곳이 정해지지 않았습니다.
 */
export function PrologueCallScreen({
  insets,
  episodeLabel,
  call,
  callerPortrait,
  onComplete,
  onBack,
}: PrologueCallScreenProps): ReactNode {
  const copy = useUiCopy();
  const { ended, line, paused, audioSource, togglePlayback, replay, hangUp, stop } =
    usePrologueCallPlayback(call);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState<PrologueCallVolume>(initialPrologueCallVolume);
  const [volumeOpen, setVolumeOpen] = useState(false);
  const handleBack = () => {
    "background only";
    stop();
    onBack();
  };

  const handleHangUp = () => {
    "background only";
    hangUp();
    setVolumeOpen(false);
  };

  const handleComplete = () => {
    "background only";
    onComplete();
  };

  return (
    <view className="prologue-call-screen" data-testid="prologue-call-screen">
      <view
        className="prologue-call-screen-safe"
        style={{
          paddingTop: `${insets.top}px`,
          paddingBottom: `${insets.bottom}px`,
          paddingLeft: `${insets.left}px`,
          paddingRight: `${insets.right}px`,
        }}
      >
        <view className="prologue-call-screen-body">
          <view className="prologue-call-screen-header">
            <view className="prologue-call-screen-back" data-testid="prologue-call-screen-back">
              <RoundButton
                accessibilityLabel={copy.common.exitTo.journey}
                icon={arrowLeft03}
                variant="neutral"
                size="xl"
                bindtap={handleBack}
              />
            </view>
            <text
              className="prologue-call-screen-title"
              data-testid="prologue-call-screen-title"
              accessibility-traits="header"
            >
              {episodeLabel}
            </text>
          </view>

          <CallCaller
            callerName={call.callerName}
            callerPortrait={callerPortrait}
            clockRunning={!ended}
            testIdPrefix="prologue-call-screen"
          />

          {line === undefined ? null : (
            <CallLineBubble
              text={line.text}
              translation={line.translation}
              testIdPrefix="prologue-call-screen"
            />
          )}

          <view className="prologue-call-screen-spacer" />

          {!ended && audioSource === undefined && volumeOpen ? (
            <view
              className="prologue-call-screen-volume-panel"
              data-testid="prologue-call-screen-volume-panel"
            >
              <view
                className="prologue-call-screen-volume-step"
                data-testid="prologue-call-screen-volume-down"
                accessibility-element={true}
                accessibility-traits={volume === 1 ? "disabled" : "button"}
                accessibility-label={copy.episodeIntro.call.volumeDown}
                bindtap={() => setVolume((current) => stepPrologueCallVolume(current, "down"))}
              >
                <svg
                  className="prologue-call-screen-volume-step-icon"
                  content={minus}
                  current-color={color.gray[800]}
                />
              </view>
              {/* 단계 막대 — 다섯 칸 가운데 지금 크기까지 칠합니다. 값은 이름이 읽습니다. */}
              <view
                className="prologue-call-screen-volume-bar"
                accessibility-element={true}
                accessibility-label={copy.episodeIntro.call.volumeLevel(
                  volume,
                  volumeLevels.length,
                )}
              >
                {volumeLevels.map((level) => (
                  <view
                    key={level}
                    className={
                      level <= volume
                        ? "prologue-call-screen-volume-level prologue-call-screen-volume-level-on"
                        : "prologue-call-screen-volume-level"
                    }
                  />
                ))}
              </view>
              <view
                className="prologue-call-screen-volume-step"
                data-testid="prologue-call-screen-volume-up"
                accessibility-element={true}
                accessibility-traits={volume === 5 ? "disabled" : "button"}
                accessibility-label={copy.episodeIntro.call.volumeUp}
                bindtap={() => setVolume((current) => stepPrologueCallVolume(current, "up"))}
              >
                <svg
                  className="prologue-call-screen-volume-step-icon"
                  content={plus}
                  current-color={color.gray[800]}
                />
              </view>
            </view>
          ) : null}

          {ended ? null : (
            <view className="prologue-call-screen-controls">
              <view
                className={
                  muted
                    ? "prologue-call-screen-side prologue-call-screen-side-on"
                    : "prologue-call-screen-side"
                }
                data-testid={
                  audioSource === undefined
                    ? "prologue-call-screen-mute"
                    : "prologue-call-screen-playback"
                }
                data-on={muted ? "true" : "false"}
                accessibility-element={true}
                accessibility-traits="button"
                accessibility-label={
                  audioSource === undefined
                    ? copy.episodeIntro.call.mute(muted)
                    : copy.listening.playback[paused ? "resume" : "pause"]
                }
                bindtap={
                  audioSource === undefined ? () => setMuted((current) => !current) : togglePlayback
                }
              >
                <svg
                  className="prologue-call-screen-side-icon"
                  content={audioSource === undefined ? mute : paused ? play : pause}
                  current-color={muted ? color.white : color.gray[800]}
                />
              </view>
              <view
                className="prologue-call-screen-end"
                data-testid="prologue-call-screen-end"
                accessibility-element={true}
                accessibility-traits="button"
                accessibility-label={copy.episodeIntro.call.endCall}
                bindtap={handleHangUp}
              >
                <svg
                  className="prologue-call-screen-end-icon"
                  content={phone}
                  current-color={color.white}
                />
              </view>
              <view
                className={
                  volumeOpen
                    ? "prologue-call-screen-side prologue-call-screen-side-on"
                    : "prologue-call-screen-side"
                }
                data-testid={
                  audioSource === undefined
                    ? "prologue-call-screen-volume"
                    : "prologue-call-screen-replay"
                }
                data-on={volumeOpen ? "true" : "false"}
                accessibility-element={true}
                accessibility-traits="button"
                accessibility-label={
                  audioSource === undefined
                    ? volumeOpen
                      ? copy.episodeIntro.call.volumeExpanded
                      : copy.episodeIntro.call.volume
                    : copy.phoneCall.play["listen-again"]
                }
                bindtap={
                  audioSource === undefined ? () => setVolumeOpen((current) => !current) : replay
                }
              >
                <svg
                  className="prologue-call-screen-side-icon"
                  content={audioSource === undefined ? slider : refresh}
                  current-color={volumeOpen ? color.white : color.gray[800]}
                />
              </view>
            </view>
          )}
        </view>
      </view>
      {/* 끝난 통화의 하단 — fog 위에 `Continue`가 섭니다. 화면 루트에 절대 배치로 얹어
          가장자리 여백(홈 인디케이터) 위에 버튼이 서게 합니다. */}
      {ended ? (
        <>
          <view className="prologue-call-screen-fog" accessibility-elements-hidden={true}>
            <Fog direction="bottom" size="full" color="surface-default" />
          </view>
          <view
            className="prologue-call-screen-complete"
            data-testid="prologue-call-screen-complete"
            style={{ bottom: `${insets.bottom}px` }}
            accessibility-element={true}
            accessibility-traits="button"
            accessibility-label={copy.common.continue}
            bindtap={handleComplete}
          >
            <text className="prologue-call-screen-complete-label">{copy.common.continue}</text>
          </view>
        </>
      ) : null}
    </view>
  );
}
