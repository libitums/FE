import type { ReactNode } from "@lynx-js/react";

import { AppBottomSheet } from "../../components/app-bottom-sheet/AppBottomSheet";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import {
  myStoriesTestIds as ids,
  type MyStoryChoice,
  type MyStoryChoices,
} from "./my-stories.contract";

import "./my-stories.css";

export type MyStoryAddSheetProps = {
  readonly choices: MyStoryChoices;
  /** 스티커를 여럿 얹을 수 있는가(글 서버) — 안내 글만 바뀝니다. */
  readonly many: boolean;
  readonly onPick: (choice: MyStoryChoice) => void;
  readonly onClose: () => void;
};

function ChoiceTile({
  choice,
  onPick,
}: {
  readonly choice: MyStoryChoice;
  readonly onPick: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.composer;
  function handleTap() {
    "background only";
    playSound("button");
    onPick();
  }
  return (
    <view
      className="my-story-tile-choice"
      data-testid={ids.choice(choice.key)}
      accessibility-element={true}
      accessibility-label={copy.choiceLabel(choice.ko, choice.meaning, false)}
      accessibility-traits="button"
      accessibility-enable-tap={true}
      flatten={false}
      bindtap={handleTap}
    >
      <text className="my-story-tile-choice-ko" accessibility-elements-hidden={true}>
        {choice.ko}
      </text>
      <text className="my-story-tile-choice-meaning" accessibility-elements-hidden={true}>
        {choice.meaning}
      </text>
    </view>
  );
}

/**
 * 단어 넣기 시트(시안 28번 「Add a word」) — 단어장 단어 칸 격자. 칸을 누르면 바탕 위에 스티커로 놓고 시트가 닫힙니다(부르는 쪽). 레슨 카드 탭 ·
 * 에피소드 거르기는 없앴습니다(사용자 결정 2026-11-25).
 */
export function MyStoryAddSheet({
  choices,
  many,
  onPick,
  onClose,
}: MyStoryAddSheetProps): ReactNode {
  const all = useUiCopy().messengerChat.myStories;
  const copy = all.composer;
  useLayerBack(onClose);
  const list = choices.words;
  return (
    <view data-testid={ids.composer}>
      <AppBottomSheet
        title={all.add.title}
        closeAccessibilityLabel={copy.close}
        ondismiss={onClose}
      >
        {list.length === 0 ? (
          <text className="my-story-empty" data-testid={ids.empty}>
            {copy.emptyWords}
          </text>
        ) : (
          <scroll-view
            className="my-story-add-scroll"
            scroll-orientation="vertical"
            scroll-bar-enable={false}
          >
            <view className="my-story-tile-grid">
              {list.map((choice) => (
                <ChoiceTile key={choice.key} choice={choice} onPick={() => onPick(choice)} />
              ))}
            </view>
          </scroll-view>
        )}
        <text className="my-story-note center">{many ? all.add.hint : all.add.hintOne}</text>
      </AppBottomSheet>
    </view>
  );
}
