import type { ReactNode } from "@lynx-js/react";

import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import { motionClassName, useMotion } from "@libitums/ui-lynx/motion";

import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { pairTileAccessibilityLabel } from "./pair-match";
import type { PairMatchTileProps } from "./pair-match.contract";

import "./pair-match-tile.css";

// 짝 맞추기 타일 하나입니다 — 받은 표식(고름 · 맺힘 · 번호 · 정오)을 그리고 눌림을 올립니다. 상태도 판정
// 계산도 없습니다: 어느 짝이 어느 번호인지, 맞았는지는 활동이 순수 함수로 구해 내려줍니다.
//
// 번호 자리는 맺히지 않았어도 자리를 지킵니다 — 글자 폭이 변하지 않아 줄바꿈이 흔들리지 않습니다.
// 낱말 열은 타일 끝쪽, 뜻 열은 앞쪽에 서서 번호가 가운데 틈을 사이에 두고 마주 봅니다. 색만으로 짝을
// 말하지 않도록 양쪽이 같은 번호를 달고, 맞은 짝은 번호 대신 tick이 서며, 틀린 짝은 번호가 남습니다.
// 이름은 감싼 상자가 지므로(상태는 이름 접미사) 번호 자리는 낭독에서 가립니다.
export function PairMatchTile({
  side,
  index,
  text,
  mark,
  pairOrdinal,
  partnerText,
  result,
  interaction,
  onTap,
}: PairMatchTileProps): ReactNode {
  const copy = useUiCopy();
  const motion = useMotion();
  const handleTap = () => {
    "background only";
    playSound("button");
    onTap(side, index);
  };
  const locked = interaction === "locked";
  // 상태 클래스는 한 요소에 하나입니다(ADR-0003 D7) — 판정이 서면 판정이, 아니면 고름/맺힘이 섭니다.
  // 확인 뒤에는 모든 타일이 판정을 가지므로 잠김(눌림 모양 없음)은 판정 클래스가 함께 집니다.
  const stateName = result ?? (mark === "idle" ? null : mark);
  const classes = [
    "pair-match-tile",
    stateName === null ? undefined : `pair-match-tile-${stateName}`,
    motionClassName("pair-match-tile", motion),
  ]
    .filter(Boolean)
    .join(" ");

  const ordinal = (
    <view className="pair-match-tile-ordinal" accessibility-elements-hidden={true}>
      {result === "correct" ? (
        <svg
          className="pair-match-tile-tick"
          content={tick}
          current-color={color.fg["neutral-inverted"]}
        />
      ) : pairOrdinal === null ? null : (
        <text className="pair-match-tile-ordinal-text">{pairOrdinal}</text>
      )}
    </view>
  );
  const label = (
    <text className={side === "word" ? "pair-match-tile-word" : "pair-match-tile-meaning"}>
      {text}
    </text>
  );

  return (
    <view
      className={classes}
      data-testid={side === "word" ? `pair-match-word-${index}` : `pair-match-meaning-${index}`}
      data-mark={mark}
      data-pair={pairOrdinal ?? "none"}
      data-result={result ?? "none"}
      accessibility-element={true}
      accessibility-label={pairTileAccessibilityLabel(
        text,
        mark,
        partnerText,
        pairOrdinal,
        result,
        copy,
      )}
      accessibility-traits={locked ? "disabled" : "button"}
      bindtap={locked ? undefined : handleTap}
    >
      {side === "word" ? (
        <>
          {label}
          {ordinal}
        </>
      ) : (
        <>
          {ordinal}
          {label}
        </>
      )}
    </view>
  );
}
