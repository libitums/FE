import { useState } from "@lynx-js/react";
import type { ReactNode } from "@lynx-js/react";

import { color } from "@libitums/design-tokens";
import arrowRight from "@libitums/icons/lynx/arrow-right";
import volume from "@libitums/icons/lynx/volume";

import type { WordbookEntry } from "../../app/wordbook-entries";
import { WordStarButton } from "../../components/WordStarButton";
import { playSound } from "../../lib/sound-effects";
import { useUiCopy } from "../../lib/ui-copy";
import { entriesForFilter, wordbookFilters } from "./wordbook-filter";
import {
  wordbookTestIds as ids,
  type WordbookFilter,
  type WordbookScreenProps,
} from "./wordbook.contract";

import "./wordbook-screen.css";

// My words 목록입니다(ADR-0169, 시안 WordbookList). 더보기 메뉴의 more 스택 루트라 뒤로 단추 없이 바텀 메뉴가 섭니다. 위에서부터
// 제목(단어 수) · 「Review N words」 CTA(오늘 복습할 단어가 없으면 눌리지 않는 안내) · 걸러보기 칩(가로 스크롤) · 줄(재생 · 한국어 ·
// 로마자 · 뜻 · 에피소드 · 상태 칩 · 별). 줄을 누르면 자세히, 재생 단추는 소리만, 별은 즐겨찾기만 바꿉니다(즐겨찾기 개정).
export function WordbookScreen({
  entries,
  dueCount,
  sound,
  onOpenWord,
  onReview,
  onToggleStar,
  onFilterChange,
}: WordbookScreenProps): ReactNode {
  const uiCopy = useUiCopy();
  const copy = uiCopy.more.wordbook;
  const selected = uiCopy.common.selected;
  const [filter, setFilter] = useState<WordbookFilter>("all");
  // Starred에서 방금 별을 뗀 줄 — 칩을 바꿀 때까지 꺼진 별로 남깁니다(낭독 초점 유지, 접근성 점검 M1).
  const [kept, setKept] = useState<readonly string[]>([]);
  const shown = entriesForFilter(entries, filter, kept);
  const toggleStar = (entry: WordbookEntry, starred: boolean) => {
    "background only";
    if (filter === "starred" && !starred) setKept([...kept, entry.key]);
    onToggleStar(entry, starred);
  };

  const handleReview = () => {
    "background only";
    if (dueCount === 0) return;
    playSound("button");
    onReview();
  };

  return (
    <view className="wordbook-screen" data-testid={ids.screen}>
      <view className="wordbook-head">
        <text
          className="wordbook-title"
          data-testid="wordbook-title"
          accessibility-traits="header"
          accessibility-label={`${copy.title}, ${entries.length}`}
        >
          {copy.title}
        </text>
        <text className="wordbook-count" accessibility-element={false}>
          {String(entries.length)}
        </text>
      </view>
      <view
        className={dueCount === 0 ? "wordbook-cta wordbook-cta-idle" : "wordbook-cta"}
        data-testid={ids.reviewCta}
        accessibility-element={true}
        accessibility-label={
          dueCount === 0 ? copy.nothingToReview : `${copy.review(dueCount)}, ${copy.reviewTime}`
        }
        accessibility-traits={dueCount === 0 ? "none" : "button"}
        flatten={false}
        bindtap={handleReview}
      >
        <view className="wordbook-cta-text">
          <text className="wordbook-cta-title">
            {dueCount === 0 ? copy.nothingToReview : copy.review(dueCount)}
          </text>
          {dueCount === 0 ? null : <text className="wordbook-cta-sub">{copy.reviewTime}</text>}
        </view>
        {dueCount === 0 ? null : (
          <svg className="wordbook-cta-arrow" content={arrowRight} current-color={color.white} />
        )}
      </view>
      <scroll-view
        className="wordbook-filters-scroll"
        scroll-orientation="horizontal"
        scroll-bar-enable={false}
      >
        <view className="wordbook-filters">
          {wordbookFilters.map((id) => (
            <view
              key={id}
              className={filter === id ? "wordbook-filter wordbook-filter-on" : "wordbook-filter"}
              data-testid={ids.filter(id)}
              data-selected={filter === id ? "true" : "false"}
              accessibility-element={true}
              accessibility-label={filter === id ? selected(copy.filters[id]) : copy.filters[id]}
              accessibility-traits="button"
              flatten={false}
              bindtap={() => {
                "background only";
                if (id === filter) return;
                setFilter(id);
                setKept([]);
                onFilterChange(id);
              }}
            >
              <text className="wordbook-filter-label">{copy.filters[id]}</text>
            </view>
          ))}
        </view>
      </scroll-view>
      {entries.length === 0 ? (
        <view className="wordbook-empty" data-testid={ids.empty}>
          <text className="wordbook-empty-title">{copy.empty}</text>
          <text className="wordbook-empty-body">{copy.emptyBody}</text>
        </view>
      ) : filter === "starred" && shown.length === 0 ? (
        <view className="wordbook-empty" data-testid={ids.emptyStarred}>
          <text className="wordbook-empty-title" accessibility-traits="header">
            {copy.emptyStarred}
          </text>
          <text className="wordbook-empty-body">{copy.emptyStarredBody}</text>
        </view>
      ) : (
        <scroll-view
          className="wordbook-scroll"
          scroll-orientation="vertical"
          scroll-bar-enable={false}
        >
          <view className="wordbook-list">
            {shown.map((entry) => (
              <WordbookRow
                key={entry.key}
                index={entries.indexOf(entry)}
                entry={entry}
                sound={sound}
                onOpen={onOpenWord}
                onToggleStar={toggleStar}
              />
            ))}
          </view>
        </scroll-view>
      )}
    </view>
  );
}

function WordbookRow({
  index,
  entry,
  sound,
  onOpen,
  onToggleStar,
}: {
  readonly index: number;
  readonly entry: WordbookEntry;
  readonly sound: WordbookScreenProps["sound"];
  readonly onOpen: (entry: WordbookEntry) => void;
  readonly onToggleStar: WordbookScreenProps["onToggleStar"];
}): ReactNode {
  const copy = useUiCopy().more.wordbook;
  const source = sound.sourceOf(entry);
  const episode = copy.episodeShort(entry.episodeOrder);
  // 재생 단추는 줄 단추 밖 형제입니다 — 단추 안 단추는 iOS에서 묶이고 Android에서 닿지 않습니다(접근성 감사 C2).
  return (
    <view className="wordbook-row">
      <view
        className={source === null ? "wordbook-play wordbook-play-off" : "wordbook-play"}
        data-testid={ids.rowPlay(index)}
        accessibility-element={true}
        accessibility-label={`${copy.play}, ${entry.ko}`}
        accessibility-traits={source === null ? "disabled" : "button"}
        flatten={false}
        bindtap={() => {
          "background only";
          if (source !== null) sound.play(source, false);
        }}
      >
        <svg
          className="wordbook-play-icon"
          content={volume}
          current-color={source === null ? color.fg.disabled : color.brand.strong}
        />
      </view>
      <view
        className="wordbook-row-body"
        data-testid={ids.row(index)}
        accessibility-element={true}
        accessibility-label={`${entry.ko}, ${entry.roman}, ${entry.meaning}, ${episode}, ${copy.status[entry.status]}`}
        accessibility-traits="button"
        flatten={false}
        bindtap={() => {
          "background only";
          onOpen(entry);
        }}
      >
        <view className="wordbook-row-text">
          <view className="wordbook-row-top">
            <text className="wordbook-row-ko">{entry.ko}</text>
            <text className="wordbook-row-roman">{entry.roman}</text>
          </view>
          <text className="wordbook-row-meaning">{`${entry.meaning} · ${episode}`}</text>
        </view>
        <view className={`wordbook-chip wordbook-chip-${entry.status}`}>
          <text className="wordbook-chip-label">{copy.status[entry.status]}</text>
        </view>
      </view>
      {/* 별은 재생 단추처럼 줄 단추 밖 형제입니다(접근성 감사 C2). 누르는 자리 44의 안쪽 여백만큼 줄 여백 · 간격에 겹칩니다. */}
      <view className="wordbook-row-star">
        <WordStarButton
          word={entry.ko}
          starred={entry.record.starred === true}
          onToggle={(starred) => onToggleStar(entry, starred)}
          testId={ids.rowStar(index)}
        />
      </view>
    </view>
  );
}
