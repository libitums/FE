import type { ReactNode } from "@lynx-js/react";
import arrowUp from "@libitums/icons/lynx/arrow-up";
import cross from "@libitums/icons/lynx/cross";
import { color } from "@libitums/design-tokens";

import { useUiCopy } from "../../lib/ui-copy";
import { hangulKeyRows, shiftedKeys } from "./hangul-keyboard";
import type { MessengerKeyboardProps } from "./messenger.contract";

import "./messenger-keyboard.css";

// 디자인(Figma 80-7082)의 두벌식 자판입니다. 키는 조합하지 않고 누른 자모만 올립니다 —
// 조합은 입력창 상태(`messenger-composer.ts`)가 집니다.
//
// 디자인의 `x` 셋과 `tab`은 자리만 그려진 키라 이렇게 채웠습니다: 셋째 줄 왼쪽 빈 자리는
// 윗글쇠(겹자음 · ㅒ · ㅖ), 오른쪽 `x`는 지우기, 넷째 줄은 `,` · `.` · 띄어쓰기 · `?`입니다.
export function MessengerKeyboard({
  shifted,
  onPress,
  onBackspace,
  onShift,
}: MessengerKeyboardProps): ReactNode {
  const copy = useUiCopy();
  const jamoKey = (key: string) => {
    const label = shifted ? (shiftedKeys[key] ?? key) : key;
    return (
      <view
        key={key}
        className="messenger-keyboard-key"
        data-testid={`messenger-key-${key}`}
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label={label}
        bindtap={() => onPress(key)}
      >
        <text className="messenger-keyboard-key-label">{label}</text>
      </view>
    );
  };

  const [top, middle, bottom] = hangulKeyRows;

  return (
    <view className="messenger-keyboard" data-testid="messenger-keyboard">
      <view className="messenger-keyboard-row">{top.map(jamoKey)}</view>
      <view className="messenger-keyboard-row">{middle.map(jamoKey)}</view>
      <view className="messenger-keyboard-row messenger-keyboard-row-spread">
        <view
          className={
            shifted ? "messenger-keyboard-key messenger-keyboard-key-on" : "messenger-keyboard-key"
          }
          data-testid="messenger-key-shift"
          data-shifted={shifted ? "true" : "false"}
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={
            shifted ? copy.messenger.keyboard.shiftOn : copy.messenger.keyboard.shift
          }
          bindtap={onShift}
        >
          <svg
            className="messenger-keyboard-key-icon"
            content={arrowUp}
            current-color={color.gray[900]}
          />
        </view>
        <view className="messenger-keyboard-cluster">{bottom.map(jamoKey)}</view>
        <view
          className="messenger-keyboard-key messenger-keyboard-key-wide"
          data-testid="messenger-key-backspace"
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={copy.messenger.keyboard.backspace}
          bindtap={onBackspace}
        >
          <svg
            className="messenger-keyboard-key-icon"
            content={cross}
            current-color={color.gray[900]}
          />
        </view>
      </view>
      <view className="messenger-keyboard-row messenger-keyboard-row-spread">
        {punctuationKey(",", copy.messenger.keyboard.comma, onPress)}
        {punctuationKey(".", copy.messenger.keyboard.period, onPress)}
        <view
          className="messenger-keyboard-key messenger-keyboard-key-space"
          data-testid="messenger-key-space"
          accessibility-element={true}
          accessibility-traits="button"
          accessibility-label={copy.messenger.keyboard.space}
          bindtap={() => onPress(" ")}
        >
          <text className="messenger-keyboard-key-label messenger-keyboard-key-label-muted">
            space
          </text>
        </view>
        {punctuationKey(
          "?",
          copy.messenger.keyboard.questionMark,
          onPress,
          "messenger-keyboard-key-trailing",
        )}
      </view>
    </view>
  );
}

function punctuationKey(
  key: string,
  label: string,
  onPress: (key: string) => void,
  extraClass?: string,
): ReactNode {
  return (
    <view
      className={
        extraClass === undefined ? "messenger-keyboard-key" : `messenger-keyboard-key ${extraClass}`
      }
      data-testid={`messenger-key-${key}`}
      accessibility-element={true}
      accessibility-traits="button"
      accessibility-label={label}
      bindtap={() => onPress(key)}
    >
      <text className="messenger-keyboard-key-label">{key}</text>
    </view>
  );
}
