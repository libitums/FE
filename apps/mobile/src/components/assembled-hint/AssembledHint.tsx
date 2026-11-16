import { useEffect, useRef, useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import light from "@libitums/icons/lynx/light";
import { BottomSheet } from "@libitums/ui-lynx/bottom-sheet";

import { announce } from "../../lib/accessibility";
import { playAudio, stopAudio } from "../../lib/audio";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { strongerHint } from "./assembled-hint.contract";
import type { AssembledHint, HintUse } from "./assembled-hint.contract";

import "./assembled-hint.css";

// 조립 문항의 힌트입니다(ADR-0153, 팀 요청 ①③). 창고 위 오른쪽 「Hint」 버튼 → 시트(정답 듣기 · 정답 보기). 버튼은
// 작업 영역 안에, 시트는 활동 맨 바깥(셸 형제)에 섭니다 — 스크롤 안에 두면 시트가 잘립니다. 채점은 바꾸지 않고
// 쓴 힌트만 기록합니다(정답 보기 > 정답 듣기).

export type AssembledHintState = {
  /** 이 문항에서 쓴 가장 센 힌트입니다. */
  readonly used: HintUse | null;
  readonly open: boolean;
  readonly openSheet: () => void;
  readonly closeSheet: () => void;
  readonly use: (kind: HintUse) => void;
  /** 정답 소리를 한 번 냅니다 — 재생을 시작했을 때만 `listen`을 기록합니다. 문항이 바뀌거나 활동을 떠나면 멈춥니다. */
  readonly listen: (source: string) => void;
};

/**
 * 문항이 바뀌면 처음 상태로 돌아갑니다 — 기록을 문항 열쇠와 함께 두어, 열쇠가 다르면 그 렌더부터 곧바로 빈 상태입니다
 * (효과로 비우면 새 문항의 첫 렌더에 앞 문항의 힌트가 한 번 남습니다).
 */
export function useAssembledHint(questionKey: string): AssembledHintState {
  const [record, setRecord] = useState<{
    readonly key: string;
    readonly used: HintUse | null;
    readonly open: boolean;
  }>({ key: questionKey, used: null, open: false });
  const current =
    record.key === questionKey ? record : { key: questionKey, used: null, open: false };
  // 힌트로 튼 소리만 멈춥니다 — 다른 재생(정답 뒤 재생 등)을 건드리지 않습니다.
  const playing = useRef(false);
  useEffect(
    () => () => {
      if (playing.current) stopAudio();
      playing.current = false;
    },
    [questionKey],
  );
  const update = (next: Partial<{ used: HintUse | null; open: boolean }>) =>
    setRecord((previous) => {
      const base =
        previous.key === questionKey ? previous : { key: questionKey, used: null, open: false };
      return { ...base, ...next };
    });
  return {
    used: current.used,
    open: current.open,
    openSheet: () => update({ open: true }),
    closeSheet: () => update({ open: false }),
    use: (kind) => update({ used: strongerHint(current.used, kind) }),
    listen: (source) => {
      const outcome = playAudio(source, () => {
        playing.current = false;
      });
      if (outcome === "unavailable") return;
      playing.current = true;
      update({ used: strongerHint(current.used, "listen") });
    },
  };
}

export type AssembledHintButtonProps = { readonly onOpen: () => void };

/** 창고 위 오른쪽 줄의 「Hint」 버튼입니다. testid `assembled-hint-button`. */
export function AssembledHintButton({ onOpen }: AssembledHintButtonProps): ReactNode {
  const copy = useUiCopy().assembledHint;
  return (
    <view className="assembled-hint-row" data-testid="assembled-hint-row">
      <view
        className="assembled-hint-button"
        data-testid="assembled-hint-button"
        accessibility-element={true}
        accessibility-traits="button"
        accessibility-label={copy.button}
        bindtap={() => {
          "background only";
          playSound("button");
          onOpen();
        }}
      >
        <svg className="assembled-hint-icon" content={light} current-color={color.fg.brand} />
        <text className="assembled-hint-label">{copy.button}</text>
      </view>
    </view>
  );
}

export type AssembledHintSheetProps = {
  readonly hint: AssembledHint;
  readonly state: AssembledHintState;
};

/** 힌트 시트입니다 — 정답 소리가 없으면 「정답 듣기」 줄이 없습니다. testid `assembled-hint-sheet`. */
export function AssembledHintSheet({ hint, state }: AssembledHintSheetProps): ReactNode {
  const copy = useUiCopy().assembledHint;
  if (!state.open) return null;
  const listenSource = hint.listenSource;
  const actions = [
    ...(listenSource === undefined
      ? []
      : [
          {
            id: "listen",
            label: copy.listen,
            bindtap: () => {
              state.listen(listenSource);
              state.closeSheet();
            },
          },
        ]),
    {
      id: "show",
      label: copy.show,
      bindtap: () => {
        state.use("show");
        state.closeSheet();
        // 흐린 정답은 화면에만 깔리므로 고른 순간 정답을 한 번 읽어 줍니다.
        announce(copy.shown(hint.ghost.join("")));
      },
    },
  ];
  return (
    <view className="assembled-hint-sheet" data-testid="assembled-hint-sheet">
      <BottomSheet
        title={copy.title}
        closeAccessibilityLabel={copy.close}
        actions={actions}
        ondismiss={state.closeSheet}
      />
    </view>
  );
}
