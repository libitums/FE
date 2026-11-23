import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";
import tick from "@libitums/icons/lynx/tick";
import { color } from "@libitums/design-tokens";
import { Button } from "@libitums/ui-lynx/button";

import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { visibleCardsOf } from "./my-stories";
import {
  myStoriesTestIds as ids,
  type MyStoryChoice,
  type MyStoryChoices,
  type MyStoryKind,
} from "./my-stories.contract";
import { MyStoryLayer } from "./MyStoryLayer";

export type MyStoryComposerProps = {
  readonly choices: MyStoryChoices;
  readonly busy: boolean;
  readonly error: "daily_limit" | "failed" | null;
  readonly onShare: (choice: MyStoryChoice) => void;
  readonly onClose: () => void;
  /** 고른 거리가 바뀜(탭 · 거르기 · 줄) — 부르는 쪽이 clientId · 안내를 새로 합니다. */
  readonly onChange?: () => void;
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

function ChoiceRow({
  choice,
  selected,
  onSelect,
}: {
  readonly choice: MyStoryChoice;
  readonly selected: boolean;
  readonly onSelect: () => void;
}): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.composer;
  function handleTap() {
    "background only";
    playSound("button");
    onSelect();
  }
  return (
    <view
      className={selected ? "my-story-choice my-story-choice-on" : "my-story-choice"}
      data-testid={ids.choice(choice.key)}
      accessibility-element={true}
      accessibility-label={copy.choiceLabel(choice.ko, choice.meaning, selected)}
      accessibility-traits="button"
      accessibility-enable-tap={true}
      flatten={false}
      bindtap={handleTap}
    >
      <view className={selected ? "my-story-check my-story-check-on" : "my-story-check"}>
        {selected ? (
          <svg className="my-story-check-icon" content={tick} current-color={color.white} />
        ) : null}
      </view>
      <view className="my-story-choice-body">
        <view className="my-story-choice-head">
          <text className="my-story-choice-ko">{choice.ko}</text>
          {choice.roman === "" ? null : (
            <text className="my-story-choice-roman">{choice.roman}</text>
          )}
        </view>
        <text className="my-story-choice-meaning">{`${choice.meaning} · ${choice.source}`}</text>
        {choice.example === null || choice.kind === "word" ? null : (
          <text className="my-story-choice-example">{choice.example.ko}</text>
        )}
      </view>
    </view>
  );
}

/**
 * 무엇을 올릴까(ADR-0179, 시안 11 · 15번) — 「My words」(단어장) · 「Lesson cards」(레슨 카드, 에피소드 거르기) 두 탭. 사진 탭은 없습니다
 * (1단계). 고른 것은 탭마다 기억하고, 처음에는 맨 위 줄입니다. 아래 단추가 올립니다.
 */
export function MyStoryComposer({
  choices,
  busy,
  error,
  onShare,
  onClose,
  onChange,
}: MyStoryComposerProps): ReactNode {
  const copy = useUiCopy().messengerChat.myStories.composer;
  const [tab, setTab] = useState<MyStoryKind>("word");
  const [filter, setFilter] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<MyStoryKind, string | null>>({
    word: null,
    card: null,
  });
  const list = tab === "word" ? choices.words : visibleCardsOf(choices.cards, filter);
  const selected = list.find((choice) => choice.key === picked[tab]) ?? list[0] ?? null;
  const pick = (key: string) => {
    if (key !== selected?.key) onChange?.();
    setPicked((now) => ({ ...now, [tab]: key }));
  };

  const footer =
    selected === null ? undefined : (
      <view className="my-story-footer-inner">
        {error === null ? null : (
          <text className="my-story-error" data-testid={ids.composerError}>
            {error === "daily_limit" ? copy.dailyLimit : copy.failed}
          </text>
        )}
        <view data-testid={ids.share}>
          <Button
            label={busy ? copy.posting : tab === "word" ? copy.share(selected.ko) : copy.shareCard}
            variant="brand"
            size="xl"
            width="fill"
            bindtap={() => {
              "background only";
              if (!busy) onShare(selected);
            }}
          />
        </view>
      </view>
    );

  return (
    <MyStoryLayer
      testId={ids.composer}
      title={copy.title}
      closeTestId={ids.composerClose}
      closeLabel={copy.close}
      onClose={onClose}
      footer={footer}
    >
      <view className="my-story-tabs" accessibility-label={copy.tabsLabel}>
        {(["word", "card"] as const).map((kind) => (
          <Chip
            key={kind}
            testId={ids.tab(kind)}
            label={copy.tab(kind)}
            on={tab === kind}
            onTap={() => {
              if (kind !== tab) onChange?.();
              setTab(kind);
            }}
          />
        ))}
      </view>
      {tab === "word" ? (
        <view className="my-story-section-head">
          <text className="my-story-section-title" accessibility-traits="header" flatten={false}>
            {copy.wordsTitle}
          </text>
          <text className="my-story-section-meta">{copy.wordCount(choices.words.length)}</text>
        </view>
      ) : choices.cards.length === 0 ? null : (
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
              onTap={() => {
                if (filter !== null) onChange?.();
                setFilter(null);
              }}
            />
            {choices.cards.map((group) => (
              <Chip
                key={group.episodeId}
                testId={ids.filter(group.episodeId)}
                label={group.title}
                on={filter === group.episodeId}
                onTap={() => {
                  if (filter !== group.episodeId) onChange?.();
                  setFilter(group.episodeId);
                }}
              />
            ))}
          </view>
        </scroll-view>
      )}
      {list.length === 0 ? (
        <text className="my-story-empty" data-testid={ids.empty}>
          {tab === "word" ? copy.emptyWords : copy.emptyCards}
        </text>
      ) : (
        <view className="my-story-choices">
          {list.map((choice) => (
            <ChoiceRow
              key={choice.key}
              choice={choice}
              selected={choice.key === selected?.key}
              onSelect={() => pick(choice.key)}
            />
          ))}
        </view>
      )}
    </MyStoryLayer>
  );
}
