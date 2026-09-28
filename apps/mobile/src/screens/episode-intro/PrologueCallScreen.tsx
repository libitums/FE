import { useEffect, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import arrowLeft03 from "@libitums/icons/lynx/arrow-left-03";
import minus from "@libitums/icons/lynx/minus";
import mute from "@libitums/icons/lynx/mute";
import phone from "@libitums/icons/lynx/phone";
import plus from "@libitums/icons/lynx/plus";
import slider from "@libitums/icons/lynx/slider";
import { color } from "@libitums/design-tokens";
import { Fog } from "@libitums/ui-lynx/fog";
import { RoundButton } from "@libitums/ui-lynx/round-button";

import type { PrologueCallScreenProps, PrologueCallVolume } from "./episode-intro.contract";
import {
  initialPrologueCallVolume,
  prologueCallProgress,
  prologueLineSeconds,
  stepPrologueCallVolume,
} from "./prologue-call";

import { PrologueCallClock } from "./PrologueCallClock";

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
 * ⚠ 통화 음성이 아직 없습니다. 음소거와 소리 크기는 상태로만 있고, 음성이 오는 날 그
 * 재생에 걸립니다. 대사는 음성 대신 `prologueLineSeconds`마다 넘어갑니다.
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
  // 지나간 대사 칸 수입니다. 대사가 바뀌는 `prologueLineSeconds`마다만 갑니다 — 1초
  // 시계는 `PrologueCallClock`이 따로 셉니다.
  const [lineTicks, setLineTicks] = useState(0);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState<PrologueCallVolume>(initialPrologueCallVolume);
  const [volumeOpen, setVolumeOpen] = useState(false);
  // 종료 버튼으로 끊었는지입니다. 대사가 다 흘러 끝난 것은 시간에서 나오므로 따로 두지
  // 않습니다.
  const [hungUp, setHungUp] = useState(false);

  const progress = prologueCallProgress(lineTicks * prologueLineSeconds, call.lines.length);
  const ended = hungUp || progress.ended;
  const line = call.lines[progress.lineIndex];

  // 대사 진행입니다. 대사 한 줄이 머무는 시간마다 한 칸 갑니다 — 대사 자리와 끝남이 이
  // 값에서 나옵니다. 끝나면 멈춥니다.
  useEffect(() => {
    if (ended) {
      return undefined;
    }
    const timer = setInterval(() => setLineTicks((ticks) => ticks + 1), prologueLineSeconds * 1000);
    return () => clearInterval(timer);
  }, [ended]);

  const handleHangUp = () => {
    "background only";
    setHungUp(true);
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
                accessibilityLabel="맵으로"
                icon={arrowLeft03}
                variant="neutral"
                size="xl"
                bindtap={onBack}
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

          {/* 통화 상대 묶음 — 낱말 둘(음성 통화 · 이름)을 한 번에 읽습니다. 시계는 이름에
              싣지 않습니다 — 매초 바뀌는 값을 이름에 두면 스크린리더가 이 자리에 머무는
              동안 되풀이해 읽습니다. 얼굴 그림은 장식이라 가립니다. */}
          <view
            className="prologue-call-screen-caller"
            data-testid="prologue-call-screen-caller"
            accessibility-element={true}
            accessibility-label={`음성 통화, ${call.callerName}`}
          >
            <text className="prologue-call-screen-kind">Voice Call</text>
            <view className="prologue-call-screen-portrait-frame">
              <image
                className="prologue-call-screen-portrait"
                src={callerPortrait}
                mode="aspectFill"
              />
            </view>
            <text className="prologue-call-screen-name">{call.callerName}</text>
            <PrologueCallClock running={!ended} />
          </view>

          {line === undefined ? null : (
            <view
              className="prologue-call-screen-line"
              data-testid="prologue-call-screen-line"
              accessibility-element={true}
              accessibility-label={`${line.text}, ${line.translation}`}
            >
              <text
                className="prologue-call-screen-line-text"
                data-testid="prologue-call-screen-line-text"
              >
                {line.text}
              </text>
              <text
                className="prologue-call-screen-line-translation"
                data-testid="prologue-call-screen-line-translation"
              >
                {line.translation}
              </text>
            </view>
          )}

          <view className="prologue-call-screen-spacer" />

          {!ended && volumeOpen ? (
            <view
              className="prologue-call-screen-volume-panel"
              data-testid="prologue-call-screen-volume-panel"
            >
              <view
                className="prologue-call-screen-volume-step"
                data-testid="prologue-call-screen-volume-down"
                accessibility-element={true}
                accessibility-traits={volume === 1 ? "disabled" : "button"}
                accessibility-label="소리 줄이기"
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
                accessibility-label={`소리 크기 ${String(volume)} / 5`}
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
                accessibility-label="소리 키우기"
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
                data-testid="prologue-call-screen-mute"
                data-on={muted ? "true" : "false"}
                accessibility-element={true}
                accessibility-traits="button"
                accessibility-label={muted ? "음소거, 켜짐" : "음소거, 꺼짐"}
                bindtap={() => setMuted((current) => !current)}
              >
                <svg
                  className="prologue-call-screen-side-icon"
                  content={mute}
                  current-color={muted ? color.white : color.gray[800]}
                />
              </view>
              <view
                className="prologue-call-screen-end"
                data-testid="prologue-call-screen-end"
                accessibility-element={true}
                accessibility-traits="button"
                accessibility-label="통화 종료"
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
                data-testid="prologue-call-screen-volume"
                data-on={volumeOpen ? "true" : "false"}
                accessibility-element={true}
                accessibility-traits="button"
                accessibility-label={volumeOpen ? "소리 크기, 펼쳐짐" : "소리 크기"}
                bindtap={() => setVolumeOpen((current) => !current)}
              >
                <svg
                  className="prologue-call-screen-side-icon"
                  content={slider}
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
            accessibility-label="Continue"
            bindtap={handleComplete}
          >
            <text className="prologue-call-screen-complete-label">Continue</text>
          </view>
        </>
      ) : null}
    </view>
  );
}
