import type { ReactNode } from "@lynx-js/react";
import { useEffect, useRef, useState } from "@lynx-js/react";
import arrowUp from "@libitums/icons/lynx/arrow-up";
import { color } from "@libitums/design-tokens";

import { keyboardRowsInsetStyle } from "../../lib/keyboard-dock";
import {
  emptyKeyPressGate,
  gateTap,
  gateTouchEnd,
  gateTouchStart,
  hasOpenPress,
} from "../../lib/key-press-gate";
import { KEY_REPEAT, createKeyRepeater } from "../../lib/key-repeat";
import { createKeyHaptic } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { backspaceIcon } from "./backspace-icon";
import { keyboardLayout, keyHint, keyLabel } from "./keyboard-layout";
import type { KeyboardCell } from "./keyboard-layout";
import type { MessengerKeyboardProps } from "./messenger.contract";

import "./messenger-keyboard.css";

// 두벌식 자판입니다(ADR-0112). 키는 조합하지 않고 누른 자모만 올립니다 — 조합은 입력창 상태가 집니다.
//
// 칸(터치 대상)끼리 맞닿아 틈이 없고, 보이는 키는 칸 안에 그립니다. 손가락이 닿는 순간(touchstart)
// 입력하고, 같은 누름 끝의 tap은 게이트가 버립니다. touchstart 없이 오는 tap(스크린리더 활성화 ·
// 이벤트 유실)은 그대로 입력합니다.

// 실기에서 멀티터치가 다른 칸으로 배달되는 등 touchstart 입력에 문제가 보이면 이 한 줄을 false로 둡니다 —
// 그러면 touchstart는 눌림 표시만 하고 입력은 지금처럼 tap이 합니다(ADR-0112 D3).
const INPUT_ON_TOUCH_START = true;

// 끝 이벤트가 오지 않아도 눌림 표시가 풀리는 시간입니다. 지우기는 반복이 끝날 때까지 기다립니다.
const PRESS_SAFETY_MS = 1_500;
const BACKSPACE_SAFETY_MS =
  KEY_REPEAT.delayMs + KEY_REPEAT.intervalMs * KEY_REPEAT.maxRepeats + PRESS_SAFETY_MS;

const cellClassByFlex: Readonly<Record<number, string>> = {
  1: "messenger-keyboard-cell",
  1.5: "messenger-keyboard-cell messenger-keyboard-cell-wide",
  7: "messenger-keyboard-cell messenger-keyboard-cell-space",
};

const labelClassByKind: Readonly<Record<KeyboardCell["kind"], string>> = {
  jamo: "messenger-keyboard-key-label messenger-keyboard-key-label-jamo",
  symbol: "messenger-keyboard-key-label",
  space: "messenger-keyboard-key-label messenger-keyboard-key-label-muted",
  shift: "messenger-keyboard-key-label",
  backspace: "messenger-keyboard-key-label",
};

type PreviewEdge = "left" | "right" | null;

// 첫 줄 양 끝(ㅂ · ㅔ)의 말풍선은 가운데 정렬이면 좁은 화면에서 화면 밖으로 나가 가장자리에 맞춥니다.
function previewEdgeOf(row: number, at: number, length: number): PreviewEdge {
  if (row !== 0) return null;
  if (at === 0) return "left";
  if (at === length - 1) return "right";
  return null;
}

export function MessengerKeyboard({
  shifted,
  onPress,
  onBackspace,
  onShift,
  edges,
}: MessengerKeyboardProps): ReactNode {
  const copy = useUiCopy();
  const [pressed, setPressed] = useState<Readonly<Record<string, true>>>({});
  // 말풍선은 누른 순간의 글자를 들고 있습니다 — 윗글쇠는 한 번 쓰이면 꺼지므로 다시 그릴 때 계산하면 ㅃ이 ㅂ으로 바뀝니다.
  const [latest, setLatest] = useState<{ readonly id: string; readonly label: string } | null>(
    null,
  );
  const gate = useRef(emptyKeyPressGate);
  const safetyTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const haptic = useRef<(() => void) | null>(null);
  const backspaceRef = useRef(onBackspace);
  backspaceRef.current = onBackspace;
  // 반복마다 지우기 누름이 아직 열려 있는지 봅니다 — 손을 뗐는데 멈춤이 빠진 경우를 끊습니다. 끝 이벤트 자체가
  // 빠지면 다른 키 누름(아래)과 상한(50, 약 4초)이 끝냅니다(a11y M5 · review W3).
  const repeater = useRef(
    createKeyRepeater(() => {
      if (!hasOpenPress(gate.current, "backspace", Date.now())) {
        repeater.current.stop();
        release("backspace");
        return;
      }
      backspaceRef.current();
    }),
  );

  useEffect(() => {
    const timers = safetyTimers.current;
    const repeat = repeater.current;
    return () => {
      repeat.stop();
      for (const handle of timers.values()) clearTimeout(handle);
      timers.clear();
    };
  }, []);

  const vibrate = () => {
    // 진동 설정 · 모듈은 처음 누를 때 한 번만 읽습니다(이벤트는 background에서 돕니다).
    haptic.current ??= createKeyHaptic();
    haptic.current();
  };

  const release = (id: string) => {
    const handle = safetyTimers.current.get(id);
    if (handle !== undefined) clearTimeout(handle);
    safetyTimers.current.delete(id);
    if (id === "backspace") repeater.current.stop();
    setPressed((current) => {
      if (current[id] === undefined) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const press = (id: string, label: string) => {
    const previous = safetyTimers.current.get(id);
    if (previous !== undefined) clearTimeout(previous);
    const wait = id === "backspace" ? BACKSPACE_SAFETY_MS : PRESS_SAFETY_MS;
    safetyTimers.current.set(
      id,
      setTimeout(() => release(id), wait),
    );
    setPressed((current) => (current[id] === true ? current : { ...current, [id]: true }));
    setLatest({ id, label });
  };

  const activate = (cell: KeyboardCell) => {
    vibrate();
    switch (cell.kind) {
      case "shift":
        onShift();
        return;
      case "backspace":
        onBackspace();
        return;
      case "space":
        onPress(" ");
        return;
      default:
        onPress(keyLabel(cell, shifted));
    }
  };

  const handleTouchStart = (cell: KeyboardCell) => {
    // 지우기 반복 중 다른 키가 눌리면 반복을 멈춥니다 — 끝 이벤트가 빠졌어도 다음 입력이 끊습니다(a11y M5).
    if (cell.kind !== "backspace" && repeater.current.active) release("backspace");
    press(cell.id, keyLabel(cell, shifted));
    if (!INPUT_ON_TOUCH_START) return;
    gate.current = gateTouchStart(gate.current, cell.id, Date.now()).gate;
    activate(cell);
    if (cell.kind === "backspace") repeater.current.start();
  };

  const handleTouchEnd = (cell: KeyboardCell) => {
    if (INPUT_ON_TOUCH_START) gate.current = gateTouchEnd(gate.current, cell.id, Date.now());
    release(cell.id);
  };

  const handleTap = (cell: KeyboardCell) => {
    const next = gateTap(gate.current, cell.id, Date.now());
    gate.current = next.gate;
    if (next.emit) activate(cell);
  };

  const labelOf = (cell: KeyboardCell): string => {
    switch (cell.kind) {
      case "shift":
        return shifted ? copy.messenger.keyboard.shiftOn : copy.messenger.keyboard.shift;
      case "backspace":
        return copy.messenger.keyboard.backspace;
      case "space":
        return copy.messenger.keyboard.space;
      case "symbol":
        return cell.id === "."
          ? copy.messenger.keyboard.period
          : copy.messenger.keyboard.questionMark;
      default:
        return keyLabel(cell, shifted);
    }
  };

  const renderCell = (cell: KeyboardCell, edge: PreviewEdge) => {
    const isPressed = pressed[cell.id] === true;
    const previewClass =
      edge === null
        ? "messenger-keyboard-preview"
        : `messenger-keyboard-preview messenger-keyboard-preview-${edge}`;
    const hint = keyHint(cell, shifted);
    const keyClass = [
      "messenger-keyboard-key",
      cell.kind === "shift" || cell.kind === "backspace" ? "messenger-keyboard-key-function" : "",
      cell.keyWidthRatio < 1 ? "messenger-keyboard-key-edge" : "",
      cell.kind === "shift" && shifted ? "messenger-keyboard-key-on" : "",
      isPressed ? "messenger-keyboard-key-pressed" : "",
    ]
      .filter((name) => name !== "")
      .join(" ");

    return (
      <view
        key={cell.id}
        className={`${cellClassByFlex[cell.flex] ?? "messenger-keyboard-cell"} messenger-keyboard-cell-${cell.align}`}
        data-testid={`messenger-key-${cell.id}`}
        data-pressed={isPressed ? "true" : "false"}
        data-shifted={cell.kind === "shift" ? (shifted ? "true" : "false") : undefined}
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label={labelOf(cell)}
        bindtouchstart={() => handleTouchStart(cell)}
        bindtouchend={() => handleTouchEnd(cell)}
        bindtouchcancel={() => handleTouchEnd(cell)}
        bindtap={() => handleTap(cell)}
      >
        <view className={keyClass}>
          {cell.preview && isPressed && latest?.id === cell.id ? (
            <view className={previewClass} data-testid="messenger-key-preview">
              <text className="messenger-keyboard-preview-label" accessibility-element={false}>
                {latest.label}
              </text>
            </view>
          ) : null}
          <view className="messenger-keyboard-key-face">
            {cell.kind === "shift" ? (
              <svg
                className="messenger-keyboard-key-icon"
                content={arrowUp}
                current-color={shifted && !isPressed ? color.white : color.gray[900]}
              />
            ) : cell.kind === "backspace" ? (
              <svg
                className="messenger-keyboard-key-icon"
                content={backspaceIcon}
                current-color={color.gray[900]}
              />
            ) : (
              <text className={labelClassByKind[cell.kind]}>{keyLabel(cell, shifted)}</text>
            )}
            {hint === null ? null : (
              <text
                className="messenger-keyboard-key-hint"
                data-testid={`messenger-key-hint-${cell.id}`}
                accessibility-element={false}
              >
                {hint}
              </text>
            )}
          </view>
        </view>
      </view>
    );
  };

  return (
    <view className="messenger-keyboard" data-testid="messenger-keyboard">
      <view
        className="messenger-keyboard-rows"
        data-testid="messenger-keyboard-rows"
        style={keyboardRowsInsetStyle(edges)}
      >
        {keyboardLayout.map((row, index) => (
          <view key={`row-${index}`} className="messenger-keyboard-row">
            {row.map((cell, at) => renderCell(cell, previewEdgeOf(index, at, row.length)))}
          </view>
        ))}
      </view>
    </view>
  );
}
