import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { AppBottomSheet } from "../../components/app-bottom-sheet/AppBottomSheet";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { useLayerBack } from "../../lib/use-back-handler";
import { visibleCardsOf } from "./my-stories";
import {
  myStoriesTestIds as ids,
  type MyStoryChoice,
  type MyStoryChoices,
  type MyStoryKind,
} from "./my-stories.contract";

import "./my-stories.css";

export type MyStoryAddSheetProps = {
  readonly choices: MyStoryChoices;
  /** 처음 열 탭 — 편집의 「Words」 · 「Cards」 도구. */
  readonly tab: MyStoryKind;
  /** 스티커를 여럿 얹을 수 있는가(글 서버) — 안내 글만 바뀝니다. */
  readonly many: boolean;
  readonly onPick: (choice: MyStoryChoice) => void;
  readonly onClose: () => void;
};

function Chip({
  testId,
  label,
  on,
  onTap,
}: {
  readonly testId: string;
  readonly label: string;
  readonly on: boolean;
  readonly onTap: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.composer;
  return (
    <view
      className={on ? "my-story-chip my-story-chip-on" : "my-story-chip"}
      data-testid={testId}
      accessibility-element={true}
      accessibility-label={copy.chipLabel(label, on)}
      accessibility-traits="button"
      accessibility-enable-tap={true}
      flatten={false}
      bindtap={() => {
        "background only";
        onTap();
      }}
    >
      <text className="my-story-chip-text" accessibility-elements-hidden={true}>
        {label}
      </text>
    </view>
  );
}

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
 * 「단어 · 카드」 넣기 시트(시안 28번 — 옛 만들기 화면 11 · 15번이 이 안으로) — 「My words」(단어장) · 「Lesson cards」(레슨 카드, 에피소드
 * 거르기) 두 탭과 칸 격자. 칸을 누르면 바탕 위에 스티커로 놓고 시트가 닫힙니다(부르는 쪽).
 */
export function MyStoryAddSheet({
  choices,
  tab: firstTab,
  many,
  onPick,
  onClose,
}: MyStoryAddSheetProps): ReactNode {
  const all = useUiCopy().messengerChat.myStories;
  const copy = all.composer;
  const [tab, setTab] = useState<MyStoryKind>(firstTab);
  const [filter, setFilter] = useState<string | null>(null);
  useLayerBack(onClose);
  const list = tab === "word" ? choices.words : visibleCardsOf(choices.cards, filter);
  return (
    <view data-testid={ids.composer}>
      <AppBottomSheet
        title={all.add.title}
        closeAccessibilityLabel={copy.close}
        ondismiss={onClose}
      >
        <view className="my-story-tabs" accessibility-label={copy.tabsLabel}>
          {(["word", "card"] as const).map((kind) => (
            <Chip
              key={kind}
              testId={ids.tab(kind)}
              label={copy.tab(kind)}
              on={tab === kind}
              onTap={() => setTab(kind)}
            />
          ))}
        </view>
        {tab === "card" && choices.cards.length > 0 ? (
          <scroll-view
            className="my-story-filters"
            scroll-orientation="horizontal"
            scroll-bar-enable={false}
          >
            <view className="my-story-filter-track">
              <Chip
                testId={ids.filterAll}
                label={copy.all}
                on={filter === null}
                onTap={() => setFilter(null)}
              />
              {choices.cards.map((group) => (
                <Chip
                  key={group.episodeId}
                  testId={ids.filter(group.episodeId)}
                  label={group.title}
                  on={filter === group.episodeId}
                  onTap={() => setFilter(group.episodeId)}
                />
              ))}
            </view>
          </scroll-view>
        ) : null}
        {list.length === 0 ? (
          <text className="my-story-empty" data-testid={ids.empty}>
            {tab === "word" ? copy.emptyWords : copy.emptyCards}
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
