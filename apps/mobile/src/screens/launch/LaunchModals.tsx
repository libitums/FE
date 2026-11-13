import type { ReactNode } from "@lynx-js/react";
import { useEffect, useState } from "@lynx-js/react";

import lock from "@libitums/icons/lynx/lock";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";
import { useMotion } from "@libitums/ui-lynx/motion";
import { Overlay } from "@libitums/ui-lynx/overlay";

import { coinIcon } from "../../components/coin-icon";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { launchTestIds as ids } from "./launch.contract";
import type { ChatIntroModalProps, LaunchCoinsModalProps } from "./launch.contract";

import "./launch.css";

// 엽전 출시 · 채팅 새 기능 모달(ADR-0140, 시안 DkrufcbGgZFxSERHYTrGmf 5판). 둘 다 지도 위 가운데 상자이고 막은 상자 아래(문서
// 순서 — fixed 안의 fixed는 Lynx에서 위 내용을 덮어 absolute로 내림). 움직임 줄이기면 튀기 · 숫자 오름 · 날아가기 없이 최종 상태.

/** 숫자가 0부터 오릅니다(움직임 줄이기면 곧바로 최종). */
function useCountUp(target: number, delayMs: number, reduced: boolean): number {
  const [value, setValue] = useState(reduced ? target : 0);
  useEffect(() => {
    if (reduced) {
      setValue(target);
      return undefined;
    }
    const steps = 12;
    const handles: unknown[] = [];
    for (let i = 1; i <= steps; i += 1)
      handles.push(setTimeout(() => setValue(Math.round((target * i) / steps)), delayMs + i * 50));
    // Lynx의 clearTimeout은 인자가 꼭 하나라 forEach(clearTimeout)로 넘기지 않습니다.
    return () => handles.forEach((handle) => clearTimeout(handle as number));
  }, [target, delayMs, reduced]);
  return value;
}

function Row(props: {
  readonly label: string;
  readonly amount: number;
  readonly delay: number;
  readonly reduced: boolean;
  readonly index: number;
}) {
  const value = useCountUp(props.amount, props.delay, props.reduced);
  return (
    <view className={`launch-row launch-row-${props.index}`}>
      <text className="launch-row-label">{props.label}</text>
      <text className="launch-row-amount">{`+${value}`}</text>
    </view>
  );
}

const FLYING_COINS = 6;

/** 받은 엽전 — 깬 에피소드 소급 · 출시 보너스 · 잔액. 「Got it」이면 엽전이 오른쪽 위 칩으로 날아간 뒤 닫힙니다. */
export function LaunchCoinsModal({
  learning,
  bonus,
  balance,
  onDone,
}: LaunchCoinsModalProps): ReactNode {
  const copy = useUiCopy().messengerChat.launch;
  const reduced = useMotion() === "reduced";
  const [flying, setFlying] = useState(false);
  const total = useCountUp(balance, learning > 0 ? 700 : 500, reduced);
  useEffect(() => {
    if (!flying) return undefined;
    const handle = setTimeout(() => onDone(), reduced ? 0 : 900);
    return () => clearTimeout(handle);
  }, [flying, reduced, onDone]);
  const done = () => {
    "background only";
    setFlying(true);
  };
  useLayerBack(flying ? null : done);
  const rows = [
    ...(learning > 0 ? [{ label: copy.fromEpisodes, amount: learning }] : []),
    { label: copy.launchBonus, amount: bonus },
  ];
  return (
    <view className="launch" data-testid={ids.coins} event-through={false}>
      <Overlay scope="screen" surface="dialog" dismiss="none" />
      <view
        className={`launch-box${reduced ? " launch-still" : ""}${flying ? " launch-box-out" : ""}`}
        accessibility-role-description="dialog"
      >
        <text className="launch-tag" accessibility-elements-hidden={true}>
          {copy.newTag}
        </text>
        <view className="launch-coin" accessibility-elements-hidden={true}>
          <svg className="launch-coin-icon" content={coinIcon} />
        </view>
        <text className="launch-title" accessibility-traits="header">
          {copy.coinsTitle}
        </text>
        <text className="launch-body">{copy.coinsBody}</text>
        <view
          className="launch-list"
          flatten={false}
          accessibility-element={true}
          accessibility-label={`${rows.map((r) => `${r.label} +${r.amount}`).join(", ")}, ${copy.balance} ${balance}`}
        >
          {rows.map((row, index) => (
            <Row
              key={row.label}
              label={row.label}
              amount={row.amount}
              delay={600 + index * 180}
              reduced={reduced}
              index={index}
            />
          ))}
          <view className={`launch-row launch-total launch-row-${rows.length}`}>
            <text className="launch-total-label">{copy.balance}</text>
            <view className="launch-total-value">
              <svg className="launch-total-icon" content={coinIcon} />
              <text className="launch-total-amount" data-testid={ids.balance}>
                {String(total)}
              </text>
            </view>
          </view>
        </view>
        <text className="launch-note">{copy.perLesson}</text>
        <view className="launch-actions" data-testid={ids.gotIt}>
          <Button label={copy.gotIt} variant="brand" size="xl" width="fill" bindtap={done} />
        </view>
      </view>
      {flying && !reduced ? (
        <view className="launch-flyer" accessibility-elements-hidden={true}>
          {Array.from({ length: FLYING_COINS }, (_, index) => (
            <svg key={index} className={`launch-fly launch-fly-${index}`} content={coinIcon} />
          ))}
        </view>
      ) : null}
    </view>
  );
}

/** 채팅 새 기능 — 에피소드에서 만난 인물이 채팅 친구가 됨, 만난 · 못 만난 인물 줄과 진행 막대. 「Start chatting」 = 메신저 탭. */
export function ChatIntroModal({ cast, onLater, onStart }: ChatIntroModalProps): ReactNode {
  const copy = useUiCopy().messengerChat.launch;
  const reduced = useMotion() === "reduced";
  const later = () => {
    "background only";
    onLater();
  };
  useLayerBack(later);
  const met = cast.filter((person) => person.met).length;
  return (
    <view className="launch" data-testid={ids.chat} event-through={false}>
      <Overlay scope="screen" surface="dialog" dismiss="none" />
      <view
        className={`launch-box${reduced ? " launch-still" : ""}`}
        accessibility-role-description="dialog"
      >
        <text className="launch-tag" accessibility-elements-hidden={true}>
          {copy.newTag}
        </text>
        <text className="launch-title" accessibility-traits="header">
          {copy.chatTitle}
        </text>
        <text className="launch-body">{copy.chatBody}</text>
        <view
          className="launch-cast"
          flatten={false}
          accessibility-element={true}
          accessibility-label={`${copy.metCount(met, cast.length)}: ${cast
            .map(
              (p) =>
                `${p.name}, ${p.met ? copy.met : p.episode === null ? copy.now : copy.episode(p.episode)}`,
            )
            .join("; ")}`}
        >
          {cast.map((person, index) => (
            <view
              key={person.name}
              className={`launch-person launch-person-${index}${person.met ? " launch-person-met" : " launch-person-locked"}`}
              data-testid={ids.person(index)}
              data-met={person.met ? "true" : "false"}
            >
              <view className="launch-face">
                {person.avatarUrl === null ? (
                  <view className="launch-face-image launch-face-blank" />
                ) : (
                  <image className="launch-face-image" src={person.avatarUrl} mode="aspectFill" />
                )}
                {person.met ? null : (
                  <view className="launch-lock">
                    <svg className="launch-lock-icon" content={lock} current-color={color.white} />
                  </view>
                )}
              </view>
              <text className="launch-person-name">{person.name}</text>
              <text className={`launch-person-tag${person.met ? " launch-person-tag-met" : ""}`}>
                {person.met
                  ? copy.met
                  : person.episode === null
                    ? copy.now
                    : copy.episode(person.episode)}
              </text>
            </view>
          ))}
        </view>
        <view className="launch-meter" accessibility-elements-hidden={true}>
          <view
            className="launch-meter-fill"
            style={{ width: `${Math.round((met / Math.max(1, cast.length)) * 100)}%` }}
          />
        </view>
        <text className="launch-meta" accessibility-elements-hidden={true}>
          {copy.metCount(met, cast.length)}
        </text>
        <view className="launch-prices">
          <svg className="launch-total-icon" content={coinIcon} />
          <text className="launch-prices-text">{copy.prices}</text>
        </view>
        <view className="launch-actions launch-actions-pair">
          <view className="launch-action" data-testid={ids.later}>
            <Button label={copy.later} variant="outline" size="xl" width="fill" bindtap={later} />
          </view>
          <view className="launch-action" data-testid={ids.start}>
            <Button label={copy.start} variant="brand" size="xl" width="fill" bindtap={onStart} />
          </view>
        </view>
      </view>
    </view>
  );
}
