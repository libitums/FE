import type { ReactNode } from "@lynx-js/react";

import { VisualNovelDialog } from "@libitums/ui-lynx/visual-novel-dialog";

import type { ChoiceRomanization } from "../../lib/session-options";
import { useUiCopy } from "../../lib/ui-copy";
import type { CatalogRoleplayTurn } from "../catalog-final/catalog-final.contract";
import { roleplayDialogLinesOf } from "./roleplay-panel";
import type { RoleplayProgressSegment } from "./roleplay-panel";

export type RoleplayReplyDialogueProps = {
  /** 내가 말한 쪽에 가장 가까운 정답 문장. */
  readonly line: string;
  readonly translation: string | null;
  readonly counterpartName: string;
  /** 상대가 곧장 이어 하는 대본 다음 줄 — 마지막 턴이면 없습니다. */
  readonly reaction: CatalogRoleplayTurn | undefined;
  /** 로마자 스위치(ADR-0188) — 켜면 두 상자에 로마자 줄이 섭니다. */
  readonly romanization: ChoiceRomanization;
  readonly reducedMotion: boolean;
};

// 맞힌 뒤 대사 자리입니다(시안 R3) — 내 말풍선(「Me」 독백 꼴)과, 그 뒤로 곧장 반응하는 상대의 다음 줄.
export function RoleplayReplyDialogue({
  line,
  translation,
  counterpartName,
  reaction,
  romanization,
  reducedMotion,
}: RoleplayReplyDialogueProps): ReactNode {
  const copy = useUiCopy();
  return (
    <view data-testid="roleplay-talk-reply" data-verdict="correct">
      <VisualNovelDialog
        variant="thought"
        speakerName={copy.roleplayStory.me}
        line={line}
        {...roleplayDialogLinesOf({ ko: line, roman: null, en: translation }, romanization)}
        reveal="instant"
        continueIndicator="off"
        surface="opaque"
        contentLanguage="learning"
        languageTag="ko"
        reducedMotion={reducedMotion}
      />
      {reaction === undefined ? null : (
        <view className="roleplay-story-reaction" data-testid="roleplay-talk-reaction">
          <VisualNovelDialog
            speakerName={counterpartName}
            line={reaction.line.ko}
            {...roleplayDialogLinesOf(reaction.line, romanization)}
            reveal="instant"
            continueIndicator="off"
            surface="opaque"
            contentLanguage="learning"
            languageTag="ko"
            reducedMotion={reducedMotion}
          />
        </view>
      )}
    </view>
  );
}

/** 「Line 1 / 2」 대신 칸 막대(시안 R1) — 낭독은 한 이름(`label`)으로 진행을 말합니다. */
export function RoleplayProgressBar({
  segments,
  label,
}: {
  readonly segments: readonly RoleplayProgressSegment[];
  readonly label: string;
}): ReactNode {
  return (
    <view
      className="roleplay-story-segments"
      data-testid="roleplay-talk-progress"
      accessibility-element={true}
      flatten={false}
      accessibility-label={label}
    >
      {segments.map((segment, index) => (
        <view
          key={String(index)}
          className={`roleplay-story-segment roleplay-story-segment-${segment}`}
        />
      ))}
    </view>
  );
}
